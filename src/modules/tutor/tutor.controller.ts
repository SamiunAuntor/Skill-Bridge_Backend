import { NextFunction, Request, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../utils/http-error";
import {
    getMyTutorProfile,
    getTutorById,
    getTutorSubjectOptions,
    getTutors,
    tutorDefaults,
    updateMyTutorProfile,
} from "./tutor.services";
import {
    TutorProfileUpdateInput,
    TutorListQuery,
    TutorSortOption,
    tutorSortOptions,
} from "./tutor.types";

function parseOptionalNumber(value: unknown, fieldName: string): number | undefined {
    if (value == null || value === "") {
        return undefined;
    }

    const parsedValue = Number(value);

    if (Number.isNaN(parsedValue)) {
        throw new HttpError(400, `${fieldName} must be a valid number.`);
    }

    return parsedValue;
}

function parsePositiveInteger(
    value: unknown,
    fieldName: string,
    defaultValue: number
): number {
    if (value == null || value === "") {
        return defaultValue;
    }

    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        throw new HttpError(400, `${fieldName} must be a positive integer.`);
    }

    return parsedValue;
}

function parseAvailability(value: unknown): boolean | undefined {
    if (value == null || value === "") {
        return undefined;
    }

    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    throw new HttpError(400, "availability must be either true or false.");
}

function parseSortBy(value: unknown): TutorSortOption {
    if (value == null || value === "") {
        return "recommended";
    }

    if (
        typeof value === "string" &&
        tutorSortOptions.includes(value as TutorSortOption)
    ) {
        return value as TutorSortOption;
    }

    throw new HttpError(
        400,
        `sortBy must be one of: ${tutorSortOptions.join(", ")}.`
    );
}

function buildTutorListQuery(query: Request["query"]): TutorListQuery {
    const page = parsePositiveInteger(query.page, "page", tutorDefaults.page);
    const limit = parsePositiveInteger(query.limit, "limit", tutorDefaults.limit);
    const minPrice = parseOptionalNumber(query.minPrice, "minPrice");
    const maxPrice = parseOptionalNumber(query.maxPrice, "maxPrice");
    const minRating = parseOptionalNumber(query.minRating, "minRating");
    const availability = parseAvailability(query.availability);

    if (
        typeof minPrice === "number" &&
        typeof maxPrice === "number" &&
        minPrice > maxPrice
    ) {
        throw new HttpError(400, "minPrice cannot be greater than maxPrice.");
    }

    if (typeof minRating === "number" && (minRating < 0 || minRating > 5)) {
        throw new HttpError(400, "minRating must be between 0 and 5.");
    }

    const subject =
        typeof query.subject === "string" && query.subject.trim().length > 0
            ? query.subject.trim().toLowerCase()
            : undefined;

    return {
        ...(subject ? { subject } : {}),
        ...(typeof minPrice === "number" ? { minPrice } : {}),
        ...(typeof maxPrice === "number" ? { maxPrice } : {}),
        ...(typeof minRating === "number" ? { minRating } : {}),
        ...(typeof availability === "boolean" ? { availability } : {}),
        sortBy: parseSortBy(query.sortBy),
        page,
        limit,
    };
}

function parseRequiredString(value: unknown, fieldName: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new HttpError(400, `${fieldName} is required.`);
    }

    return value.trim();
}

function parseOptionalNullableString(value: unknown): string | null | undefined {
    if (value == null) {
        return undefined;
    }

    if (typeof value !== "string") {
        throw new HttpError(400, "Invalid text field value.");
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}

function parseOptionalHttpsUrl(value: unknown, fieldName: string): string | null | undefined {
    if (value == null) {
        return undefined;
    }

    if (typeof value !== "string") {
        throw new HttpError(400, `${fieldName} must be a valid URL.`);
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
        return null;
    }

    try {
        const url = new URL(normalizedValue);
        if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error("invalid protocol");
        }
        return normalizedValue;
    } catch {
        throw new HttpError(400, `${fieldName} must be a valid URL.`);
    }
}

function parseNonNegativeNumber(value: unknown, fieldName: string): number {
    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        throw new HttpError(400, `${fieldName} must be a non-negative number.`);
    }

    return parsedValue;
}

function parseYear(value: unknown, fieldName: string): number {
    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue < 1900 || parsedValue > 3000) {
        throw new HttpError(400, `${fieldName} must be a valid year.`);
    }

    return parsedValue;
}

function buildTutorProfileUpdateInput(body: unknown): TutorProfileUpdateInput {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new HttpError(400, "Invalid tutor profile payload.");
    }

    const input = body as Record<string, unknown>;
    const profileImageUrl = parseOptionalHttpsUrl(
        input.profileImageUrl,
        "profileImageUrl"
    );
    const professionalTitle =
        typeof input.professionalTitle === "string"
            ? input.professionalTitle.trim()
            : "";
    const bio = typeof input.bio === "string" ? input.bio.trim() : "";
    const hourlyRate = parseNonNegativeNumber(input.hourlyRate, "hourlyRate");
    const experienceYears = parseNonNegativeNumber(
        input.experienceYears,
        "experienceYears"
    );

    if (bio.length > 0 && bio.length < 20) {
        throw new HttpError(400, "bio must be at least 20 characters long.");
    }

    if (!Array.isArray(input.categoryIds)) {
        throw new HttpError(400, "categoryIds must be an array.");
    }

    const categoryIds = input.categoryIds.map((value, index) => {
        if (typeof value !== "string" || value.trim().length === 0) {
            throw new HttpError(
                400,
                `categoryIds[${index}] must be a valid category id.`
            );
        }

        return value.trim();
    });

    if (!Array.isArray(input.expertise)) {
        throw new HttpError(400, "expertise must be an array.");
    }

    const expertise = input.expertise.map((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
            throw new HttpError(400, `expertise[${index}] must be an object.`);
        }

        const expertiseInput = item as Record<string, unknown>;

        return {
            ...(typeof expertiseInput.id === "string" &&
            expertiseInput.id.trim().length > 0
                ? { id: expertiseInput.id.trim() }
                : {}),
            name: parseRequiredString(expertiseInput.name, `expertise[${index}].name`),
        };
    });

    if (expertise.length === 0) {
        throw new HttpError(400, "At least one subject is required.");
    }

    if (!Array.isArray(input.education)) {
        throw new HttpError(400, "education must be an array.");
    }

    const education = input.education.map((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
            throw new HttpError(400, `education[${index}] must be an object.`);
        }

        const educationInput = item as Record<string, unknown>;
        const startYear = parseYear(
            educationInput.startYear,
            `education[${index}].startYear`
        );
        const endYear =
            educationInput.endYear == null || educationInput.endYear === ""
                ? null
                : parseYear(educationInput.endYear, `education[${index}].endYear`);

        if (endYear !== null && startYear > endYear) {
            throw new HttpError(
                400,
                `education[${index}].startYear cannot be greater than endYear.`
            );
        }

        return {
            ...(typeof educationInput.id === "string" &&
            educationInput.id.trim().length > 0
                ? { id: educationInput.id.trim() }
                : {}),
            degree: parseRequiredString(educationInput.degree, `education[${index}].degree`),
            institution: parseRequiredString(
                educationInput.institution,
                `education[${index}].institution`
            ),
            fieldOfStudy:
                typeof educationInput.fieldOfStudy === "string"
                    ? educationInput.fieldOfStudy.trim()
                    : "",
            startYear,
            ...(endYear !== null ? { endYear } : {}),
            ...(parseOptionalNullableString(educationInput.description) !== undefined
                ? {
                      description: parseOptionalNullableString(
                          educationInput.description
                      ),
                  }
                : {}),
        };
    });

    return {
        ...(profileImageUrl !== undefined ? { profileImageUrl } : {}),
        professionalTitle,
        bio,
        hourlyRate,
        experienceYears,
        categoryIds,
        expertise,
        education,
    };
}

export async function listTutors(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const filters = buildTutorListQuery(req.query);
        const result = await getTutors(filters);

        res.status(200).json({
            success: true,
            message: "Tutors fetched successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function getTutorDetails(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const tutorIdParam = req.params.id;
        const tutorId =
            typeof tutorIdParam === "string" ? tutorIdParam.trim() : "";

        if (!tutorId) {
            throw new HttpError(400, "Tutor id is required.");
        }

        const result = await getTutorById(tutorId);

        res.status(200).json({
            success: true,
            message: "Tutor details fetched successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function listTutorSubjectOptions(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const result = await getTutorSubjectOptions();

        res.status(200).json({
            success: true,
            message: "Tutor subject options fetched successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function getMyTutorProfileController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }

        const result = await getMyTutorProfile(req.authUser.id);

        res.status(200).json({
            success: true,
            message: "Tutor profile fetched successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateMyTutorProfileController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }

        const payload = buildTutorProfileUpdateInput(req.body);
        const result = await updateMyTutorProfile(req.authUser.id, payload);

        res.status(200).json({
            success: true,
            message: "Tutor profile updated successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

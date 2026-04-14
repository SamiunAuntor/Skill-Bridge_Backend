import { NextFunction, Request, Response } from "express";
import { HttpError } from "../../utils/http-error";
import { getTutorById, getTutors, tutorDefaults } from "./tutor.services";
import {
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

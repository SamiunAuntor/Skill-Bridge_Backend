import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/controller/async-handler";
import { requireAuthUser, sendSuccess } from "../../shared/controller/controller.utils";
import { validateRequest } from "../../shared/validation/validate-request";
import {
    getMyTutorProfile,
    getTutorById,
    getTutorSubjectOptions,
    getTutors,
    updateMyTutorProfile,
} from "./tutor.services";
import {
    tutorIdParamsSchema,
    tutorListQuerySchema,
    tutorProfileUpdateSchema,
} from "./tutor.validation";

export const listTutorsController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const query = validateRequest(tutorListQuerySchema, req.query);
    const filters = {
        ...(query.subject ? { subject: query.subject } : {}),
        ...(typeof query.minPrice === "number" ? { minPrice: query.minPrice } : {}),
        ...(typeof query.maxPrice === "number" ? { maxPrice: query.maxPrice } : {}),
        ...(typeof query.minRating === "number" ? { minRating: query.minRating } : {}),
        ...(typeof query.availability === "boolean"
            ? { availability: query.availability }
            : {}),
        sortBy: query.sortBy,
        page: query.page,
        limit: query.limit,
    };
    const result = await getTutors(filters);
    sendSuccess(res, "Tutors fetched successfully.", result);
});

export const getTutorDetailsController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const { id: tutorId } = validateRequest(tutorIdParamsSchema, req.params);
    const result = await getTutorById(tutorId);
    sendSuccess(res, "Tutor details fetched successfully.", result);
});

export const listTutorSubjectOptionsController = asyncHandler(async (
    _req: Request,
    res: Response
): Promise<void> => {
    const result = await getTutorSubjectOptions();
    sendSuccess(res, "Tutor subject options fetched successfully.", result);
});

export const getMyTutorProfileController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const result = await getMyTutorProfile(authUser.id);
    sendSuccess(res, "Tutor profile fetched successfully.", result);
});

export const updateMyTutorProfileController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const parsed = validateRequest(tutorProfileUpdateSchema, req.body);
    const payload = {
        ...(parsed.profileImageUrl !== undefined
            ? { profileImageUrl: parsed.profileImageUrl }
            : {}),
        professionalTitle: parsed.professionalTitle,
        bio: parsed.bio,
        hourlyRate: parsed.hourlyRate,
        experienceYears: parsed.experienceYears,
        categoryIds: parsed.categoryIds,
        subjectIds: parsed.subjectIds,
        education: parsed.education.map((item) => ({
            ...(item.id ? { id: item.id } : {}),
            categoryId: item.categoryId,
            degreeId: item.degreeId,
            institution: item.institution,
            startYear: item.startYear,
            ...(item.endYear !== null ? { endYear: item.endYear } : {}),
            ...(item.description !== null ? { description: item.description } : {}),
        })),
    };
    const result = await updateMyTutorProfile(authUser.id, payload);
    sendSuccess(res, "Tutor profile updated successfully.", result);
});

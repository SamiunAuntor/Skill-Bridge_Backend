import { Request, Response } from "express";
import { requireAuthUser, sendSuccess } from "../../shared/controller/controller.utils";
import { asyncHandler } from "../../shared/controller/async-handler";
import { validateRequest } from "../../shared/validation/validate-request";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import {
    createAdminCategory,
    createAdminDegree,
    createAdminSubject,
    deleteAdminCategory,
    deleteAdminDegree,
    deleteAdminSubject,
    getAdminBookings,
    getAdminCategories,
    getAdminDashboardData,
    getAdminDegrees,
    getAdminSubjects,
    getAdminUsers,
    updateAdminCategory,
    updateAdminDegree,
    updateAdminSubject,
    updateAdminUserStatus,
} from "./admin.service";
import {
    adminBookingsQuerySchema,
    adminCategoriesQuerySchema,
    adminCategoryCreateSchema,
    adminCategoryUpdateSchema,
    adminDegreesQuerySchema,
    adminDegreeCreateSchema,
    adminDegreeUpdateSchema,
    adminEntityIdParamsSchema,
    adminSubjectsQuerySchema,
    adminSubjectCreateSchema,
    adminSubjectUpdateSchema,
    adminUserIdParamsSchema,
    adminUsersQuerySchema,
    adminUserStatusUpdateSchema,
} from "./admin.validation";

export const getAdminDashboardController = asyncHandler(async (
    _req: Request,
    res: Response
): Promise<void> => {
    const result = await getAdminDashboardData();
    sendSuccess(res, "Admin dashboard data fetched successfully.", result);
});

export const getAdminUsersController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const parsedQuery = validateRequest(adminUsersQuerySchema, req.query);
    const query = {
        ...(parsedQuery.q ? { q: parsedQuery.q } : {}),
        ...(parsedQuery.role ? { role: parsedQuery.role } : {}),
        ...(typeof parsedQuery.banned === "boolean"
            ? { banned: parsedQuery.banned }
            : {}),
        ...(typeof parsedQuery.verified === "boolean"
            ? { verified: parsedQuery.verified }
            : {}),
        sortBy: parsedQuery.sortBy,
        page: parsedQuery.page,
        limit: parsedQuery.limit,
    };
    const result = await getAdminUsers(query);
    sendSuccess(res, "Users fetched successfully.", result);
});

export const updateAdminUserStatusController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const { id } = validateRequest(adminUserIdParamsSchema, req.params);
    const payload = validateRequest(adminUserStatusUpdateSchema, req.body);
    const result = await updateAdminUserStatus(authUser.id, id, payload);
    sendSuccess(res, "User status updated successfully.", result);
});

export const getAdminBookingsController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const parsedQuery = validateRequest(adminBookingsQuerySchema, req.query);
    const query = {
        ...(parsedQuery.q ? { q: parsedQuery.q } : {}),
        ...(parsedQuery.status ? { status: parsedQuery.status } : {}),
        ...(parsedQuery.paymentStatus
            ? { paymentStatus: parsedQuery.paymentStatus }
            : {}),
        sortBy: parsedQuery.sortBy,
        page: parsedQuery.page,
        limit: parsedQuery.limit,
    };
    const result = await getAdminBookings(query);
    sendSuccess(res, "Bookings fetched successfully.", result);
});

export const getAdminCategoriesController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const parsedQuery = validateRequest(adminCategoriesQuerySchema, req.query);
    const query = {
        ...(parsedQuery.q ? { q: parsedQuery.q } : {}),
        ...(typeof parsedQuery.isActive === "boolean"
            ? { isActive: parsedQuery.isActive }
            : {}),
        sortBy: parsedQuery.sortBy,
        page: parsedQuery.page,
        limit: parsedQuery.limit,
    };
    const result = await getAdminCategories(query);
    sendSuccess(res, "Categories fetched successfully.", result);
});

export const createAdminCategoryController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const parsedPayload = validateRequest(adminCategoryCreateSchema, req.body);
    const payload = {
        name: parsedPayload.name,
        description: parsedPayload.description,
        ...(typeof parsedPayload.isActive === "boolean"
            ? { isActive: parsedPayload.isActive }
            : {}),
    };
    const result = await createAdminCategory(payload);
    sendSuccess(res, "Category created successfully.", result, 201);
});

export const updateAdminCategoryController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const { id } = validateRequest(adminEntityIdParamsSchema, req.params);
    const parsedPayload = validateRequest(adminCategoryUpdateSchema, req.body);
    const payload = {
        name: parsedPayload.name,
        description: parsedPayload.description,
        ...(typeof parsedPayload.isActive === "boolean"
            ? { isActive: parsedPayload.isActive }
            : {}),
    };
    const result = await updateAdminCategory(id, payload);
    sendSuccess(res, "Category updated successfully.", result);
});

export const deleteAdminCategoryController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const { id } = validateRequest(adminEntityIdParamsSchema, req.params);
    await deleteAdminCategory(id);
    sendSuccess(res, "Category deleted successfully.", null);
});

export const getAdminSubjectsController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const parsedQuery = validateRequest(adminSubjectsQuerySchema, req.query);
    const query = {
        ...(parsedQuery.q ? { q: parsedQuery.q } : {}),
        ...(parsedQuery.categoryId ? { categoryId: parsedQuery.categoryId } : {}),
        ...(typeof parsedQuery.isActive === "boolean"
            ? { isActive: parsedQuery.isActive }
            : {}),
        sortBy: parsedQuery.sortBy,
        page: parsedQuery.page,
        limit: parsedQuery.limit,
    };
    const result = await getAdminSubjects(query);
    sendSuccess(res, "Subjects fetched successfully.", result);
});

export const createAdminSubjectController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const parsedPayload = validateRequest(adminSubjectCreateSchema, req.body);
    const payload = {
        categoryId: parsedPayload.categoryId,
        name: parsedPayload.name,
        description: parsedPayload.description,
        ...(parsedPayload.iconUrl !== undefined
            ? { iconUrl: parsedPayload.iconUrl }
            : {}),
        ...(parsedPayload.iconPublicId !== undefined
            ? { iconPublicId: parsedPayload.iconPublicId }
            : {}),
        ...(typeof parsedPayload.isActive === "boolean"
            ? { isActive: parsedPayload.isActive }
            : {}),
    };
    const result = await createAdminSubject(payload);
    sendSuccess(res, "Subject created successfully.", result, 201);
});

export const updateAdminSubjectController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const { id } = validateRequest(adminEntityIdParamsSchema, req.params);
    const parsedPayload = validateRequest(adminSubjectUpdateSchema, req.body);
    const payload = {
        categoryId: parsedPayload.categoryId,
        name: parsedPayload.name,
        description: parsedPayload.description,
        ...(parsedPayload.iconUrl !== undefined
            ? { iconUrl: parsedPayload.iconUrl }
            : {}),
        ...(parsedPayload.iconPublicId !== undefined
            ? { iconPublicId: parsedPayload.iconPublicId }
            : {}),
        ...(typeof parsedPayload.isActive === "boolean"
            ? { isActive: parsedPayload.isActive }
            : {}),
    };
    const result = await updateAdminSubject(id, payload);
    sendSuccess(res, "Subject updated successfully.", result);
});

export const deleteAdminSubjectController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const { id } = validateRequest(adminEntityIdParamsSchema, req.params);
    await deleteAdminSubject(id);
    sendSuccess(res, "Subject deleted successfully.", null);
});

export const getAdminDegreesController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const parsedQuery = validateRequest(adminDegreesQuerySchema, req.query);
    const query = {
        ...(parsedQuery.q ? { q: parsedQuery.q } : {}),
        ...(parsedQuery.categoryId ? { categoryId: parsedQuery.categoryId } : {}),
        ...(typeof parsedQuery.isActive === "boolean"
            ? { isActive: parsedQuery.isActive }
            : {}),
        sortBy: parsedQuery.sortBy,
        page: parsedQuery.page,
        limit: parsedQuery.limit,
    };
    const result = await getAdminDegrees(query);
    sendSuccess(res, "Degrees fetched successfully.", result);
});

export const createAdminDegreeController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const parsedPayload = validateRequest(adminDegreeCreateSchema, req.body);
    const payload = {
        categoryId: parsedPayload.categoryId,
        name: parsedPayload.name,
        level: parsedPayload.level,
        ...(typeof parsedPayload.isActive === "boolean"
            ? { isActive: parsedPayload.isActive }
            : {}),
    };
    const result = await createAdminDegree(payload);
    sendSuccess(res, "Degree created successfully.", result, 201);
});

export const updateAdminDegreeController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const { id } = validateRequest(adminEntityIdParamsSchema, req.params);
    const parsedPayload = validateRequest(adminDegreeUpdateSchema, req.body);
    const payload = {
        categoryId: parsedPayload.categoryId,
        name: parsedPayload.name,
        level: parsedPayload.level,
        ...(typeof parsedPayload.isActive === "boolean"
            ? { isActive: parsedPayload.isActive }
            : {}),
    };
    const result = await updateAdminDegree(id, payload);
    sendSuccess(res, "Degree updated successfully.", result);
});

export const deleteAdminDegreeController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const { id } = validateRequest(adminEntityIdParamsSchema, req.params);
    await deleteAdminDegree(id);
    sendSuccess(res, "Degree deleted successfully.", null);
});

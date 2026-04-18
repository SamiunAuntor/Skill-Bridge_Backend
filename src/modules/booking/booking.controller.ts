import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/controller/async-handler";
import { requireAuthUser, sendSuccess } from "../../shared/controller/controller.utils";
import { validateRequest } from "../../shared/validation/validate-request";
import {
    cancelBooking,
    createBooking,
    getMySessions,
    getTutorDashboardSummary,
    joinSession,
} from "./booking.services";
import {
    bookingIdParamsSchema,
    createBookingSchema,
    sessionListQuerySchema,
} from "./booking.validation";

export const createBookingController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const { tutorId, slotId } = validateRequest(createBookingSchema, req.body);
    const result = await createBooking(authUser.id, { tutorId, slotId });
    sendSuccess(res, "Booking created successfully.", result, 201);
});

export const getMySessionsController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const query = validateRequest(sessionListQuerySchema, req.query);
    const filters = {
        ...(query.q ? { search: query.q } : {}),
        sortBy: query.sortBy,
    };
    const result = await getMySessions(authUser.id, authUser.role, filters);
    sendSuccess(res, "Sessions fetched successfully.", result);
});

export const getTutorDashboardSummaryController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const result = await getTutorDashboardSummary(authUser.id, authUser.role);
    sendSuccess(res, "Tutor dashboard summary fetched successfully.", result);
});

export const cancelBookingController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const { bookingId } = validateRequest(bookingIdParamsSchema, req.params);
    const result = await cancelBooking(authUser.id, authUser.role, bookingId);
    sendSuccess(res, "Booking cancelled successfully.", result);
});

export const joinSessionController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const { bookingId } = validateRequest(bookingIdParamsSchema, req.params);
    const result = await joinSession(authUser.id, authUser.role, bookingId);
    sendSuccess(res, "Session join prepared successfully.", result);
});

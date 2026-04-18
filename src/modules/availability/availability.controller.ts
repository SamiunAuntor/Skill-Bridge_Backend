import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/controller/async-handler";
import { requireAuthUser, sendSuccess } from "../../shared/controller/controller.utils";
import { validateRequest } from "../../shared/validation/validate-request";
import {
    createAvailabilitySlot,
    deleteAvailabilitySlot,
    getMyAvailability,
    getPublicTutorAvailability,
    updateAvailabilitySlot,
} from "./availability.services";
import {
    availabilitySlotSchema,
    slotIdParamsSchema,
    tutorAvailabilityParamsSchema,
} from "./availability.validation";

export const getMyAvailabilityController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const result = await getMyAvailability(authUser.id);
    sendSuccess(res, "Availability fetched successfully.", result);
});

export const createAvailabilitySlotController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const body = validateRequest(availabilitySlotSchema, req.body);
    const result = await createAvailabilitySlot(authUser.id, {
        startAt: body.startAt,
        endAt: body.endAt,
    });
    sendSuccess(res, "Availability slot created successfully.", result, 201);
});

export const deleteAvailabilitySlotController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const { slotId } = validateRequest(slotIdParamsSchema, req.params);
    await deleteAvailabilitySlot(authUser.id, slotId);
    sendSuccess(res, "Availability slot deleted successfully.", null);
});

export const updateAvailabilitySlotController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const { slotId } = validateRequest(slotIdParamsSchema, req.params);
    const body = validateRequest(availabilitySlotSchema, req.body);
    const result = await updateAvailabilitySlot(authUser.id, slotId, {
        startAt: body.startAt,
        endAt: body.endAt,
    });
    sendSuccess(res, "Availability slot updated successfully.", result);
});

export const getPublicTutorAvailabilityController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const { tutorId } = validateRequest(tutorAvailabilityParamsSchema, req.params);
    const result = await getPublicTutorAvailability(tutorId);
    sendSuccess(res, "Tutor availability fetched successfully.", result);
});

import { NextFunction, Request, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../utils/http-error";
import {
    createAvailabilitySlot,
    deleteAvailabilitySlot,
    getMyAvailability,
    getPublicTutorAvailability,
} from "./availability.services";

function parseIsoDateTime(value: unknown, fieldName: string): Date {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new HttpError(400, `${fieldName} is required.`);
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        throw new HttpError(400, `${fieldName} must be a valid ISO date-time.`);
    }

    return parsed;
}

export async function getMyAvailabilityController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }

        const result = await getMyAvailability(req.authUser.id);

        res.status(200).json({
            success: true,
            message: "Availability fetched successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function createAvailabilitySlotController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }

        if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
            throw new HttpError(400, "Invalid availability payload.");
        }

        const body = req.body as Record<string, unknown>;
        const result = await createAvailabilitySlot(req.authUser.id, {
            startAt: parseIsoDateTime(body.startAt, "startAt"),
            endAt: parseIsoDateTime(body.endAt, "endAt"),
        });

        res.status(201).json({
            success: true,
            message: "Availability slot created successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteAvailabilitySlotController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }

        const slotId =
            typeof req.params.slotId === "string" ? req.params.slotId.trim() : "";

        if (!slotId) {
            throw new HttpError(400, "slotId is required.");
        }

        await deleteAvailabilitySlot(req.authUser.id, slotId);

        res.status(200).json({
            success: true,
            message: "Availability slot deleted successfully.",
            data: null,
        });
    } catch (error) {
        next(error);
    }
}

export async function getPublicTutorAvailabilityController(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const tutorId =
            typeof req.params.tutorId === "string" ? req.params.tutorId.trim() : "";

        if (!tutorId) {
            throw new HttpError(400, "Tutor id is required.");
        }

        const result = await getPublicTutorAvailability(tutorId);

        res.status(200).json({
            success: true,
            message: "Tutor availability fetched successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

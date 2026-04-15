import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../utils/http-error";
import { createBooking } from "./booking.services";

export async function createBookingController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }

        if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
            throw new HttpError(400, "Invalid booking payload.");
        }

        const body = req.body as Record<string, unknown>;
        const tutorId = typeof body.tutorId === "string" ? body.tutorId.trim() : "";
        const slotId = typeof body.slotId === "string" ? body.slotId.trim() : "";

        if (!tutorId) {
            throw new HttpError(400, "tutorId is required.");
        }

        if (!slotId) {
            throw new HttpError(400, "slotId is required.");
        }

        const result = await createBooking(req.authUser.id, {
            tutorId,
            slotId,
        });

        res.status(201).json({
            success: true,
            message: "Booking created successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

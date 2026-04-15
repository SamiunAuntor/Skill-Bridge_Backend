import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../utils/http-error";
import { cancelBooking, createBooking, getMySessions } from "./booking.services";

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

export async function getMySessionsController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }

        const result = await getMySessions(req.authUser.id, req.authUser.role);

        res.status(200).json({
            success: true,
            message: "Sessions fetched successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function cancelBookingController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }

        const bookingId =
            typeof req.params.bookingId === "string" ? req.params.bookingId.trim() : "";

        if (!bookingId) {
            throw new HttpError(400, "bookingId is required.");
        }

        const result = await cancelBooking(
            req.authUser.id,
            req.authUser.role,
            bookingId
        );

        res.status(200).json({
            success: true,
            message: "Booking cancelled successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

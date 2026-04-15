import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../utils/http-error";
import { createReview } from "./review.services";

export async function createReviewController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }

        if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
            throw new HttpError(400, "Invalid review payload.");
        }

        const body = req.body as Record<string, unknown>;
        const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
        const rating = typeof body.rating === "number" ? body.rating : Number(body.rating);
        const comment = typeof body.comment === "string" ? body.comment : undefined;

        if (!bookingId) {
            throw new HttpError(400, "bookingId is required.");
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            throw new HttpError(400, "Rating must be a whole number between 1 and 5.");
        }

        const result = await createReview(req.authUser.id, req.authUser.role, {
            bookingId,
            rating,
            ...(comment !== undefined ? { comment } : {}),
        });

        res.status(201).json({
            success: true,
            message: "Review submitted successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

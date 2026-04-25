import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/controller/async-handler";
import { requireAuthUser, sendSuccess } from "../../shared/controller/controller.utils";
import { validateRequest } from "../../shared/validation/validate-request";
import { HttpError } from "../../utils/http-error";
import {
    createReview,
    getMyTutorReviews,
    getReviewById,
    updateReview,
} from "./review.services";
import { createReviewSchema, updateReviewSchema } from "./review.validation";

export const createReviewController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const body = validateRequest(createReviewSchema, req.body);

    const result = await createReview(authUser.id, authUser.role, {
        bookingId: body.bookingId,
        rating: body.rating,
        comment: body.comment,
    });

    sendSuccess(res, "Review submitted successfully.", result, 201);
});

export const updateReviewController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const body = validateRequest(updateReviewSchema, req.body);
    const reviewId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!reviewId) {
        throw new HttpError(400, "Review id is required.");
    }

    const result = await updateReview(authUser.id, authUser.role, reviewId, {
        rating: body.rating,
        comment: body.comment,
    });

    sendSuccess(res, "Review updated successfully.", result);
});

export const getReviewByIdController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const reviewId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!reviewId) {
        throw new HttpError(400, "Review id is required.");
    }

    const result = await getReviewById(authUser.id, authUser.role, reviewId);
    sendSuccess(res, "Review fetched successfully.", result);
});

export const getMyTutorReviewsController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const result = await getMyTutorReviews(authUser.id, authUser.role);
    sendSuccess(res, "Tutor reviews fetched successfully.", result);
});

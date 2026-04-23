import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/controller/async-handler";
import { requireAuthUser, sendSuccess } from "../../shared/controller/controller.utils";
import { validateRequest } from "../../shared/validation/validate-request";
import {
    getVisiblePlatformReviews,
    submitPlatformReview,
} from "./platform-review.service";
import { platformReviewSubmitSchema } from "./platform-review.validation";

export const getVisiblePlatformReviewsController = asyncHandler(async (
    _req: Request,
    res: Response
): Promise<void> => {
    const result = await getVisiblePlatformReviews();
    sendSuccess(res, "Platform reviews fetched successfully.", result);
});

export const submitPlatformReviewController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const parsedPayload = validateRequest(platformReviewSubmitSchema, req.body);
    const payload = {
        rating: parsedPayload.rating,
        message: parsedPayload.message,
        ...(parsedPayload.title ? { title: parsedPayload.title } : {}),
    };
    const result = await submitPlatformReview(authUser.id, payload);
    sendSuccess(res, "Thanks for sharing your feedback.", result, 201);
});

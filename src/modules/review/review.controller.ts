import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/controller/async-handler";
import { requireAuthUser, sendSuccess } from "../../shared/controller/controller.utils";
import { validateRequest } from "../../shared/validation/validate-request";
import { createReview } from "./review.services";
import { createReviewSchema } from "./review.validation";

export const createReviewController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const body = validateRequest(createReviewSchema, req.body);

    const result = await createReview(authUser.id, authUser.role, {
        bookingId: body.bookingId,
        rating: body.rating,
        ...(body.comment !== undefined ? { comment: body.comment } : {}),
    });

    sendSuccess(res, "Review submitted successfully.", result, 201);
});

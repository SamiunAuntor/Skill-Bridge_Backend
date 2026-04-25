import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/controller/async-handler";
import { requireAuthUser, sendSuccess } from "../../shared/controller/controller.utils";
import { validateRequest } from "../../shared/validation/validate-request";
import {
    createPaymentIntentForBooking,
    getPaymentStatusForStudent,
    handleStripeWebhookEvent,
} from "./payment.service";
import {
    createPaymentIntentSchema,
    paymentIntentParamsSchema,
} from "./payment.validation";

export const createPaymentIntentController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const { tutorId, subjectId, slotId } = validateRequest(createPaymentIntentSchema, req.body);
    const result = await createPaymentIntentForBooking(authUser.id, {
        tutorId,
        subjectId,
        slotId,
    });
    sendSuccess(res, "Payment intent created successfully.", result, 201);
});

export const getPaymentStatusController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const { paymentIntentId } = validateRequest(paymentIntentParamsSchema, req.params);
    const result = await getPaymentStatusForStudent(
        authUser.id,
        authUser.role,
        paymentIntentId
    );
    sendSuccess(res, "Payment status fetched successfully.", result);
});

export const stripeWebhookController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const signature = req.headers["stripe-signature"];
    const rawBody = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from([]);

    await handleStripeWebhookEvent(signature, rawBody);

    res.status(200).json({ received: true });
});

import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import {
    createPaymentIntentController,
    getPaymentStatusController,
    stripeWebhookController,
} from "./payment.controller";

const paymentRouter = Router();
const paymentWebhookRouter = Router();

paymentWebhookRouter.post("/", stripeWebhookController);

paymentRouter.post(
    "/create-intent",
    requireAuth,
    requireRole("student"),
    createPaymentIntentController
);
paymentRouter.get(
    "/:paymentIntentId/status",
    requireAuth,
    requireRole("student", "admin"),
    getPaymentStatusController
);

export { paymentWebhookRouter };
export default paymentRouter;

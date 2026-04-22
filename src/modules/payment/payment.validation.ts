import { z } from "zod";

export const createPaymentIntentSchema = z.object({
    tutorId: z.string().trim().min(1, "tutorId is required."),
    slotId: z.string().trim().min(1, "slotId is required."),
});

export const paymentIntentParamsSchema = z.object({
    paymentIntentId: z.string().trim().min(1, "paymentIntentId is required."),
});


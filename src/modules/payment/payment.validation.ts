import { z } from "zod";

export const createPaymentIntentSchema = z.object({
    tutorId: z.string().trim().min(1, "Tutor is required."),
    slotId: z.string().trim().min(1, "Please choose an available time slot."),
});

export const paymentIntentParamsSchema = z.object({
    paymentIntentId: z.string().trim().min(1, "Payment reference is required."),
});

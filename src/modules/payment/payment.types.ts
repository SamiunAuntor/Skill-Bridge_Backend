import type { PaymentIntentStatus } from "../../generated/prisma/client";

export interface CreatePaymentIntentInput {
    tutorId: string;
    subjectId: string;
    slotId: string;
}

export interface CreatePaymentIntentResponse {
    bookingId: string;
    paymentId: string;
    paymentIntentId: string;
    clientSecret: string;
    amountInCents: number;
    currency: string;
    status: PaymentIntentStatus;
    holdExpiresAt: string;
}

export interface PaymentStatusResponse {
    bookingId: string;
    paymentId: string;
    paymentIntentId: string;
    amountInCents: number;
    currency: string;
    status: PaymentIntentStatus;
    paymentStatus: "pending" | "paid" | "failed";
    bookingStatus: "pending_payment" | "confirmed" | "completed" | "cancelled" | "no_show";
    paymentMethod: string | null;
    last4Digits: string | null;
    cardBrand: string | null;
    confirmedAt: string | null;
    failedAt: string | null;
    holdExpiresAt: string | null;
}

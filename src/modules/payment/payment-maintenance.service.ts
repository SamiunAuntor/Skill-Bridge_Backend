import {
    BookingStatus,
    NotificationStatus,
    PaymentIntentStatus,
    PaymentStatus,
    SessionStatus,
} from "../../generated/prisma/client";
import { prisma } from "../../config/prisma.config";
import { getStripeClient } from "../../lib/stripe";
import { deleteZoomMeeting } from "../../services/zoom/zoom.service";

export async function expirePendingBookingHoldById(
    bookingId: string,
    now = new Date()
): Promise<boolean> {
    const existing = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
            id: true,
            slotId: true,
            status: true,
            holdExpiresAt: true,
            payment: {
                select: {
                    stripePaymentIntentId: true,
                    status: true,
                },
            },
        },
    });

    if (
        !existing ||
        existing.status !== BookingStatus.pending_payment ||
        !existing.holdExpiresAt ||
        existing.holdExpiresAt > now
    ) {
        return false;
    }

    await prisma.$transaction(async (tx) => {
        if (existing.payment) {
            await tx.payment.update({
                where: { bookingId: existing.id },
                data: {
                    status: PaymentIntentStatus.cancelled,
                    failedAt: now,
                },
            });
        }

        await tx.booking.update({
            where: { id: existing.id },
            data: {
                status: BookingStatus.cancelled,
                paymentStatus: PaymentStatus.failed,
                holdExpiresAt: null,
                cancellationReason: "Payment hold expired.",
                cancelledAt: now,
            },
        });

        await tx.availabilitySlot.update({
            where: { id: existing.slotId },
            data: {
                isBooked: false,
            },
        });
    });

    if (
        existing.payment &&
        existing.payment.status !== PaymentIntentStatus.succeeded
    ) {
        await getStripeClient()
            .paymentIntents.cancel(existing.payment.stripePaymentIntentId)
            .catch(() => null);
    }

    return true;
}

export async function expireExpiredPaymentHolds(now = new Date()): Promise<number> {
    const expiredBookings = await prisma.booking.findMany({
        where: {
            status: BookingStatus.pending_payment,
            holdExpiresAt: {
                lt: now,
            },
            paymentStatus: {
                not: PaymentStatus.paid,
            },
        },
        select: {
            id: true,
        },
        take: 100,
    });

    let expiredCount = 0;

    for (const booking of expiredBookings) {
        const expired = await expirePendingBookingHoldById(booking.id, now);

        if (expired) {
            expiredCount += 1;
        }
    }

    return expiredCount;
}

export async function cleanupInvalidUnpaidPaymentSessions(): Promise<number> {
    const invalidBookings = await prisma.booking.findMany({
        where: {
            deletedAt: null,
            session: {
                isNot: null,
            },
            OR: [
                {
                    status: BookingStatus.pending_payment,
                },
                {
                    paymentStatus: {
                        not: PaymentStatus.paid,
                    },
                },
            ],
        },
        select: {
            id: true,
            slotId: true,
            session: {
                select: {
                    meetingId: true,
                },
            },
        },
        take: 100,
    });

    for (const booking of invalidBookings) {
        await prisma.$transaction(async (tx) => {
            await tx.notification.updateMany({
                where: {
                    bookingId: booking.id,
                    status: NotificationStatus.pending,
                },
                data: {
                    status: NotificationStatus.failed,
                },
            });

            await tx.session.updateMany({
                where: {
                    bookingId: booking.id,
                },
                data: {
                    status: SessionStatus.cancelled,
                },
            });

            await tx.booking.update({
                where: { id: booking.id },
                data: {
                    status: BookingStatus.cancelled,
                    paymentStatus: PaymentStatus.failed,
                    holdExpiresAt: null,
                    cancellationReason: "Unpaid payment session was reconciled.",
                    cancelledAt: new Date(),
                },
            });

            await tx.availabilitySlot.update({
                where: { id: booking.slotId },
                data: {
                    isBooked: false,
                },
            });
        });

        await deleteZoomMeeting(booking.session?.meetingId).catch(() => null);
    }

    return invalidBookings.length;
}

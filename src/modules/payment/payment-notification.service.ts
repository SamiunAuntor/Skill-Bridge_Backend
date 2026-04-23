import {
    NotificationChannel,
    NotificationStatus,
    NotificationType,
} from "../../generated/prisma/client";
import { prisma } from "../../config/prisma.config";
import { formatDateTime, toDisplayName } from "../../shared/utils";

export async function createPaymentBookingNotifications(
    bookingId: string,
    student: {
        id: string;
        email: string;
        name: string;
        firstName: string | null;
        lastName: string | null;
    },
    tutorUser: {
        id: string;
        email: string;
        name: string;
        firstName: string | null;
        lastName: string | null;
    },
    startTime: Date,
    endTime: Date,
    amountLabel: string
): Promise<void> {
    const now = new Date();
    const studentDisplayName = toDisplayName(student);
    const tutorDisplayName = toDisplayName(tutorUser);
    const sessionLabel = `${formatDateTime(startTime)} - ${formatDateTime(endTime)}`;
    const reminderAt =
        startTime.getTime() - now.getTime() <= 15 * 60 * 1000
            ? now
            : new Date(startTime.getTime() - 15 * 60 * 1000);

    await prisma.notification.createMany({
        data: [
            {
                userId: student.id,
                bookingId,
                type: NotificationType.booking_confirmed,
                channel: NotificationChannel.in_app,
                title: "Booking confirmed",
                message: `Your session with ${tutorDisplayName} is confirmed for ${sessionLabel}.`,
                status: NotificationStatus.pending,
                scheduledFor: now,
            },
            {
                userId: tutorUser.id,
                bookingId,
                type: NotificationType.booking_confirmed,
                channel: NotificationChannel.in_app,
                title: "New booking received",
                message: `${studentDisplayName} booked a session for ${sessionLabel}.`,
                status: NotificationStatus.pending,
                scheduledFor: now,
            },
            {
                userId: student.id,
                bookingId,
                type: NotificationType.booking_confirmed,
                channel: NotificationChannel.email,
                title: "Booking confirmed",
                message: `Your session with ${tutorDisplayName} is confirmed for ${sessionLabel}. Amount: ${amountLabel}.`,
                status: NotificationStatus.pending,
                scheduledFor: now,
            },
            {
                userId: tutorUser.id,
                bookingId,
                type: NotificationType.booking_confirmed,
                channel: NotificationChannel.email,
                title: "New booking received",
                message: `${studentDisplayName} booked a session for ${sessionLabel}. Amount: ${amountLabel}.`,
                status: NotificationStatus.pending,
                scheduledFor: now,
            },
            {
                userId: student.id,
                bookingId,
                type: NotificationType.session_reminder,
                channel: NotificationChannel.in_app,
                title: "15 minutes left for your session",
                message: `Your session with ${tutorDisplayName} starts in 15 minutes.`,
                status: NotificationStatus.pending,
                scheduledFor: reminderAt,
            },
            {
                userId: tutorUser.id,
                bookingId,
                type: NotificationType.session_reminder,
                channel: NotificationChannel.in_app,
                title: "15 minutes left for your session",
                message: `Your session with ${studentDisplayName} starts in 15 minutes.`,
                status: NotificationStatus.pending,
                scheduledFor: reminderAt,
            },
            {
                userId: student.id,
                bookingId,
                type: NotificationType.session_reminder,
                channel: NotificationChannel.email,
                title: "15 minutes left for your session",
                message: `Your session with ${tutorDisplayName} starts in 15 minutes.`,
                status: NotificationStatus.pending,
                scheduledFor: reminderAt,
            },
            {
                userId: tutorUser.id,
                bookingId,
                type: NotificationType.session_reminder,
                channel: NotificationChannel.email,
                title: "15 minutes left for your session",
                message: `Your session with ${studentDisplayName} starts in 15 minutes.`,
                status: NotificationStatus.pending,
                scheduledFor: reminderAt,
            },
        ],
    });
}

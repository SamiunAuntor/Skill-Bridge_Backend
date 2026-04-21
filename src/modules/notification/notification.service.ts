import {
    BookingStatus,
    NotificationChannel,
    NotificationStatus,
    NotificationType,
    SessionStatus,
} from "../../generated/prisma/client";
import { prisma } from "../../config/prisma.config";
import { sendMail } from "../../services/email";
import { formatDateTime, formatMoney, toDisplayName } from "../../shared/utils";
import { syncTutorProfileStats } from "../tutor/tutor.services";
import {
    escapeHtml,
    renderEmailDetailRows,
    renderEmailLayout,
} from "../../services/email/email-template";

function normalizeDisplayName(input: {
    name: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
}): string {
    return toDisplayName(input);
}

function calculateDurationHours(startTime: Date, endTime: Date): number {
    return Math.max(
        0,
        Number(
            ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
        )
    );
}

function buildEmailTemplate(params: {
    preheader: string;
    title: string;
    intro: string;
    detailRows: Array<{ label: string; value: string }>;
    ctaLabel?: string;
    ctaUrl?: string | null;
    note?: string;
}) {
    const detailsText = params.detailRows
        .map((row) => `${row.label}: ${row.value}`)
        .join("\n");

    const text = [
        "SkillBridge",
        "",
        params.title,
        "",
        params.intro,
        "",
        detailsText,
        params.note ? `\n${params.note}` : "",
        params.ctaUrl ? `\nOpen: ${params.ctaUrl}` : "",
        "",
        "SkillBridge",
    ]
        .filter(Boolean)
        .join("\n");

    const html = renderEmailLayout({
        preheader: params.preheader,
        title: params.title,
        intro: escapeHtml(params.intro),
        detailRowsHtml: renderEmailDetailRows(params.detailRows),
        ...(params.ctaLabel && params.ctaUrl
            ? {
                  ctaLabel: params.ctaLabel,
                  ctaUrl: params.ctaUrl,
              }
            : {}),
        ...(params.note ? { footerNote: escapeHtml(params.note) } : {}),
    });

    return { text, html };
}

function buildNotificationEmail(notification: {
    title: string;
    type: NotificationType;
    message: string;
    booking: {
        startTime: Date;
        endTime: Date;
        priceAtBooking: number;
        student: {
            id: string;
            name: string;
            firstName: string | null;
            lastName: string | null;
            email: string;
        };
        tutor: {
            id: string;
            user: {
                id: string;
                name: string;
                firstName: string | null;
                lastName: string | null;
                email: string;
            };
        };
        session: {
            meetingJoinUrl: string | null;
            meetingProvider: string | null;
            meetingId: string | null;
            meetingPassword: string | null;
        } | null;
    } | null;
    user: {
        id: string;
        email: string;
        name: string;
        firstName: string | null;
        lastName: string | null;
    };
}) {
    const booking = notification.booking;
    const recipientName = normalizeDisplayName(notification.user);

    if (!booking) {
        return buildEmailTemplate({
            preheader: "SkillBridge Notification",
            title: notification.title,
            intro: `Hello ${recipientName}, ${notification.message}`,
            detailRows: [],
        });
    }

    const studentName = normalizeDisplayName(booking.student);
    const tutorName = normalizeDisplayName(booking.tutor.user);
    const isStudentRecipient = booking.student.id === notification.user.id;
    const counterpart = isStudentRecipient ? tutorName : studentName;
    const sessionLabel = `${formatDateTime(booking.startTime)} - ${formatDateTime(
        booking.endTime
    )}`;
    const commonRows = [
        { label: "Session Time", value: sessionLabel },
        { label: "Counterpart", value: counterpart },
        { label: "Amount", value: formatMoney(booking.priceAtBooking) },
    ];

    switch (notification.type) {
        case NotificationType.booking_confirmed:
            return buildEmailTemplate({
                preheader: "Booking Confirmed",
                title: notification.title,
                intro: `Hello ${recipientName}, your session has been confirmed successfully.`,
                detailRows: commonRows,
                note: "Payment gateway support will be implemented later. For now, this booking is treated as confirmed and paid inside SkillBridge.",
            });
        case NotificationType.session_reminder:
            const reminderCtaUrl = booking.session?.meetingJoinUrl ?? null;
            return buildEmailTemplate({
                preheader: "Session Reminder",
                title: notification.title,
                intro: `Hello ${recipientName}, your session starts in 15 minutes. Please be ready to join on time.`,
                detailRows: [
                    ...commonRows,
                    {
                        label: "Meeting Provider",
                        value: booking.session?.meetingProvider ?? "Zoom",
                    },
                    ...(booking.session?.meetingId
                        ? [{ label: "Meeting ID", value: booking.session.meetingId }]
                        : []),
                    ...(booking.session?.meetingPassword
                        ? [{ label: "Passcode", value: booking.session.meetingPassword }]
                        : []),
                ],
                ...(reminderCtaUrl
                    ? {
                          ctaLabel: "Join Session",
                          ctaUrl: reminderCtaUrl,
                      }
                    : {}),
            });
        case NotificationType.booking_cancelled:
            return buildEmailTemplate({
                preheader: "Session Cancelled",
                title: notification.title,
                intro: `Hello ${recipientName}, ${notification.message}`,
                detailRows: commonRows,
                note: "If the slot was still in the future, it has been returned to the tutor's availability.",
            });
        default:
            return buildEmailTemplate({
                preheader: "SkillBridge Notification",
                title: notification.title,
                intro: `Hello ${recipientName}, ${notification.message}`,
                detailRows: commonRows,
            });
    }
}

export async function processPendingNotifications(): Promise<number> {
    const now = new Date();

    const notifications = await prisma.notification.findMany({
        where: {
            status: NotificationStatus.pending,
            scheduledFor: {
                lte: now,
            },
        },
        orderBy: {
            scheduledFor: "asc",
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    firstName: true,
                    lastName: true,
                },
            },
            booking: {
                select: {
                    startTime: true,
                    endTime: true,
                    priceAtBooking: true,
                    student: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    tutor: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    name: true,
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                    session: {
                        select: {
                            meetingProvider: true,
                            meetingId: true,
                            meetingJoinUrl: true,
                            meetingPassword: true,
                        },
                    },
                },
            },
        },
    });

    let processedCount = 0;

    for (const notification of notifications) {
        try {
            if (notification.channel === NotificationChannel.in_app) {
                await prisma.notification.update({
                    where: { id: notification.id },
                    data: {
                        status: NotificationStatus.sent,
                        sentAt: new Date(),
                    },
                });
            } else {
                const email = buildNotificationEmail(notification);

                await sendMail({
                    to: notification.user.email,
                    subject: notification.title,
                    text: email.text,
                    html: email.html,
                    context: `notifications:${notification.type}`,
                });

                await prisma.notification.update({
                    where: { id: notification.id },
                    data: {
                        status: NotificationStatus.sent,
                        sentAt: new Date(),
                    },
                });
            }

            processedCount += 1;
        } catch (error) {
            await prisma.notification.update({
                where: { id: notification.id },
                data: {
                    status: NotificationStatus.failed,
                },
            });

            console.error("[notification] failed to process notification:", error);
        }
    }

    return processedCount;
}

export async function completeExpiredSessions(): Promise<number> {
    const now = new Date();

    const expiredBookings = await prisma.booking.findMany({
        where: {
            deletedAt: null,
            status: BookingStatus.confirmed,
            endTime: {
                lte: now,
            },
            session: {
                is: {
                    status: {
                        in: [SessionStatus.scheduled, SessionStatus.ongoing],
                    },
                },
            },
        },
        select: {
            id: true,
            tutorId: true,
            startTime: true,
            endTime: true,
            session: {
                select: {
                    actualStartTime: true,
                },
            },
        },
    });

    if (expiredBookings.length === 0) {
        return 0;
    }

    await prisma.$transaction(
        async (tx) => {
            for (const booking of expiredBookings) {
                await tx.session.update({
                    where: { bookingId: booking.id },
                    data: {
                        status: SessionStatus.completed,
                        actualStartTime: booking.session?.actualStartTime ?? booking.startTime,
                        actualEndTime: booking.endTime,
                        durationHours: calculateDurationHours(booking.startTime, booking.endTime),
                    },
                });

                await tx.booking.update({
                    where: { id: booking.id },
                    data: {
                        status: BookingStatus.completed,
                        completedAt: now,
                    },
                });

                await tx.notification.updateMany({
                    where: {
                        bookingId: booking.id,
                        status: NotificationStatus.pending,
                        type: NotificationType.session_reminder,
                    },
                    data: {
                        status: NotificationStatus.failed,
                    },
                });
            }
        },
        {
            maxWait: 10000,
            timeout: 20000,
        }
    );

    await Promise.all(
        [...new Set(expiredBookings.map((booking) => booking.tutorId))].map((tutorId) =>
            syncTutorProfileStats(tutorId)
        )
    );

    return expiredBookings.length;
}

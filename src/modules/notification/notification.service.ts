import {
    BookingStatus,
    NotificationChannel,
    NotificationStatus,
    NotificationType,
    SessionStatus,
} from "../../generated/prisma/client";
import { prisma } from "../../config/prisma.config";
import { sendMail } from "../../services/email";

function formatDateTime(value: Date): string {
    return new Intl.DateTimeFormat("en-BD", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(value);
}

function formatMoney(amount: number): string {
    return `$${amount.toFixed(2)}`;
}

function normalizeDisplayName(input: {
    name: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
}): string {
    const name = input.name?.trim();
    if (name) {
        return name;
    }

    const fullName = [input.firstName?.trim(), input.lastName?.trim()]
        .filter(Boolean)
        .join(" ")
        .trim();

    if (fullName) {
        return fullName;
    }

    return input.email;
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

    const detailRowsHtml = params.detailRows
        .map(
            (row) => `
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;">${row.label}</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;text-align:right;">${row.value}</td>
              </tr>
            `
        )
        .join("");

    const ctaHtml =
        params.ctaLabel && params.ctaUrl
            ? `
                <div style="margin-top:28px;">
                  <a href="${params.ctaUrl}" style="display:inline-block;background:#1d3b66;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px;">
                    ${params.ctaLabel}
                  </a>
                </div>
              `
            : "";

    const noteHtml = params.note
        ? `<p style="margin:24px 0 0;color:#475569;font-size:13px;line-height:1.6;">${params.note}</p>`
        : "";

    const html = `
      <div style="margin:0;padding:24px;background:#eef4fb;font-family:Inter,Arial,sans-serif;color:#0f172a;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid rgba(29,59,102,0.08);box-shadow:0 18px 40px rgba(15,23,42,0.08);">
          <div style="padding:24px 28px;background:#1d3b66;color:#ffffff;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;opacity:0.75;">${params.preheader}</div>
            <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;font-weight:800;">${params.title}</h1>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 22px;color:#334155;font-size:15px;line-height:1.7;">${params.intro}</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f8fafc;border:1px solid rgba(148,163,184,0.25);border-radius:18px;padding:16px;">
              <tbody>${detailRowsHtml}</tbody>
            </table>
            ${ctaHtml}
            ${noteHtml}
          </div>
        </div>
      </div>
    `;

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

    return expiredBookings.length;
}

import {
    BookingStatus,
    NotificationChannel,
    NotificationStatus,
    NotificationType,
    PaymentStatus,
    Role,
    SessionStatus,
} from "../../generated/prisma/client";
import { prisma } from "../../config/prisma.config";
import { sendMail } from "../../services/email";
import { HttpError } from "../../utils/http-error";
import {
    BookingConfirmationResponse,
    CancelBookingResponse,
    CreateBookingInput,
    SessionListItem,
    SessionListResponse,
} from "./booking.types";

function calculatePrice(hourlyRate: number, startAt: Date, endAt: Date): number {
    const durationHours = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
    return Number((hourlyRate * Math.max(durationHours, 0)).toFixed(2));
}

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

function mapSessionListItem(input: {
    bookingId: string;
    sessionId: string;
    bookingStatus: BookingStatus;
    sessionStatus: SessionStatus;
    sessionDate: Date;
    startTime: Date;
    endTime: Date;
    priceAtBooking: number;
    student: {
        id: string;
        name: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        image: string | null;
        avatarUrl: string | null;
    };
    tutor: {
        id: string;
        user: {
            name: string;
            firstName: string | null;
            lastName: string | null;
            email: string;
            image: string | null;
            avatarUrl: string | null;
        };
    };
}): SessionListItem {
    const now = new Date();

    return {
        bookingId: input.bookingId,
        sessionId: input.sessionId,
        bookingStatus: input.bookingStatus,
        sessionStatus: input.sessionStatus,
        sessionDate: input.sessionDate.toISOString(),
        startTime: input.startTime.toISOString(),
        endTime: input.endTime.toISOString(),
        priceAtBooking: input.priceAtBooking,
        canCancel:
            input.bookingStatus === BookingStatus.confirmed &&
            input.sessionStatus === SessionStatus.scheduled &&
            input.startTime > now,
        student: {
            id: input.student.id,
            name: normalizeDisplayName(input.student),
            avatarUrl: input.student.image || input.student.avatarUrl,
        },
        tutor: {
            id: input.tutor.id,
            name: normalizeDisplayName(input.tutor.user),
            avatarUrl: input.tutor.user.image || input.tutor.user.avatarUrl,
        },
    };
}

async function sendNotificationEmail(params: {
    notificationId: string;
    to: string;
    subject: string;
    text: string;
}): Promise<void> {
    try {
        await sendMail({
            to: params.to,
            subject: params.subject,
            text: params.text,
            context: "notifications:booking",
        });

        await prisma.notification.update({
            where: { id: params.notificationId },
            data: {
                status: NotificationStatus.sent,
                sentAt: new Date(),
            },
        });
    } catch (error) {
        await prisma.notification.update({
            where: { id: params.notificationId },
            data: {
                status: NotificationStatus.failed,
            },
        });

        console.error("[booking] failed to send booking email:", error);
    }
}

export async function createBooking(
    studentId: string,
    input: CreateBookingInput
): Promise<BookingConfirmationResponse> {
    const now = new Date();

    const [student, tutor] = await Promise.all([
        prisma.user.findUnique({
            where: { id: studentId },
            select: {
                id: true,
                role: true,
                deletedAt: true,
                isBanned: true,
                email: true,
                name: true,
                firstName: true,
                lastName: true,
            },
        }),
        prisma.tutorProfile.findFirst({
            where: {
                id: input.tutorId,
                deletedAt: null,
                user: {
                    deletedAt: null,
                    isBanned: false,
                    role: "tutor",
                },
            },
            select: {
                id: true,
                hourlyRate: true,
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
        }),
    ]);

    if (!student || student.deletedAt || student.isBanned) {
        throw new HttpError(403, "Student account is not allowed to book sessions.");
    }

    if (student.role !== Role.student) {
        throw new HttpError(403, "Only students can book tutor sessions.");
    }

    if (!tutor) {
        throw new HttpError(404, "Tutor not found.");
    }

    const bookingResult = await prisma.$transaction(
        async (tx) => {
            const slot = await tx.availabilitySlot.findFirst({
                where: {
                    id: input.slotId,
                    tutorId: tutor.id,
                    deletedAt: null,
                },
                select: {
                    id: true,
                    tutorId: true,
                    startAt: true,
                    endAt: true,
                    isBooked: true,
                },
            });

            if (!slot) {
                throw new HttpError(404, "Availability slot not found.");
            }

            if (slot.startAt <= now) {
                throw new HttpError(400, "This slot is no longer available for booking.");
            }

            const lockResult = await tx.availabilitySlot.updateMany({
                where: {
                    id: slot.id,
                    tutorId: tutor.id,
                    deletedAt: null,
                    isBooked: false,
                },
                data: {
                    isBooked: true,
                },
            });

            if (lockResult.count === 0) {
                throw new HttpError(409, "This slot has already been booked.");
            }

            const priceAtBooking = calculatePrice(
                tutor.hourlyRate,
                slot.startAt,
                slot.endAt
            );

            const booking = await tx.booking.create({
                data: {
                    studentId,
                    tutorId: tutor.id,
                    slotId: slot.id,
                    status: BookingStatus.confirmed,
                    sessionDate: slot.startAt,
                    startTime: slot.startAt,
                    endTime: slot.endAt,
                    priceAtBooking,
                    paymentStatus: PaymentStatus.paid,
                    paidAt: new Date(),
                    paymentMethod: "direct_booking",
                    paymentReference: "payment_pending_gateway",
                },
                select: {
                    id: true,
                    tutorId: true,
                    slotId: true,
                    sessionDate: true,
                    startTime: true,
                    endTime: true,
                    priceAtBooking: true,
                    status: true,
                    paymentStatus: true,
                },
            });

            const session = await tx.session.create({
                data: {
                    bookingId: booking.id,
                    status: SessionStatus.scheduled,
                },
                select: {
                    id: true,
                    status: true,
                },
            });

            const studentDisplayName = normalizeDisplayName(student);
            const tutorDisplayName = normalizeDisplayName(tutor.user);
            const sessionLabel = `${formatDateTime(slot.startAt)} - ${formatDateTime(slot.endAt)}`;
            const amountLabel = formatMoney(priceAtBooking);

            const [studentInApp, tutorInApp, studentEmail, tutorEmail] =
                await Promise.all([
                    tx.notification.create({
                        data: {
                            userId: student.id,
                            bookingId: booking.id,
                            type: NotificationType.booking_confirmed,
                            channel: NotificationChannel.in_app,
                            title: "Booking confirmed",
                            message: `Your session with ${tutorDisplayName} is confirmed for ${sessionLabel}.`,
                            status: NotificationStatus.sent,
                            sentAt: new Date(),
                        },
                        select: { id: true },
                    }),
                    tx.notification.create({
                        data: {
                            userId: tutor.user.id,
                            bookingId: booking.id,
                            type: NotificationType.booking_confirmed,
                            channel: NotificationChannel.in_app,
                            title: "New booking received",
                            message: `${studentDisplayName} booked a session for ${sessionLabel}.`,
                            status: NotificationStatus.sent,
                            sentAt: new Date(),
                        },
                        select: { id: true },
                    }),
                    tx.notification.create({
                        data: {
                            userId: student.id,
                            bookingId: booking.id,
                            type: NotificationType.booking_confirmed,
                            channel: NotificationChannel.email,
                            title: "Booking confirmed",
                            message: `Your session with ${tutorDisplayName} is confirmed for ${sessionLabel}. Amount: ${amountLabel}.`,
                            status: NotificationStatus.pending,
                            scheduledFor: new Date(),
                        },
                        select: { id: true },
                    }),
                    tx.notification.create({
                        data: {
                            userId: tutor.user.id,
                            bookingId: booking.id,
                            type: NotificationType.booking_confirmed,
                            channel: NotificationChannel.email,
                            title: "New booking received",
                            message: `${studentDisplayName} booked a session for ${sessionLabel}. Amount: ${amountLabel}.`,
                            status: NotificationStatus.pending,
                            scheduledFor: new Date(),
                        },
                        select: { id: true },
                    }),
                ]);

            return {
                booking,
                session,
                emails: {
                    student: {
                        notificationId: studentEmail.id,
                        to: student.email,
                        subject: "SkillBridge booking confirmed",
                        text: `Hello ${studentDisplayName},\n\nYour session with ${tutorDisplayName} is confirmed.\nWhen: ${sessionLabel}\nAmount: ${amountLabel}\n\nPayment gateway support will be added later. For now, the booking is marked as paid.\n\nSkillBridge`,
                    },
                    tutor: {
                        notificationId: tutorEmail.id,
                        to: tutor.user.email,
                        subject: "New SkillBridge booking received",
                        text: `Hello ${tutorDisplayName},\n\n${studentDisplayName} booked a session with you.\nWhen: ${sessionLabel}\nAmount: ${amountLabel}\n\nPlease check your dashboard sessions page for details.\n\nSkillBridge`,
                    },
                },
            };
        },
        {
            maxWait: 10000,
            timeout: 20000,
        }
    );

    await Promise.allSettled([
        sendNotificationEmail(bookingResult.emails.student),
        sendNotificationEmail(bookingResult.emails.tutor),
    ]);

    return {
        booking: {
            id: bookingResult.booking.id,
            sessionId: bookingResult.session.id,
            tutorId: bookingResult.booking.tutorId,
            slotId: bookingResult.booking.slotId,
            sessionDate: bookingResult.booking.sessionDate.toISOString(),
            startTime: bookingResult.booking.startTime.toISOString(),
            endTime: bookingResult.booking.endTime.toISOString(),
            priceAtBooking: bookingResult.booking.priceAtBooking,
            status: "confirmed",
            paymentStatus: "paid",
            sessionStatus: "scheduled",
        },
    };
}

export async function getMySessions(
    userId: string,
    role: "student" | "tutor" | "admin"
): Promise<SessionListResponse> {
    if (role !== Role.student && role !== Role.tutor) {
        throw new HttpError(403, "Sessions are only available for tutors and students.");
    }

    const sessions = await prisma.booking.findMany({
        where:
            role === Role.student
                ? {
                      studentId: userId,
                      deletedAt: null,
                      session: {
                          isNot: null,
                      },
                  }
                : {
                      deletedAt: null,
                      tutor: {
                          userId,
                          deletedAt: null,
                      },
                      session: {
                          isNot: null,
                      },
                  },
        orderBy: [
            { startTime: "asc" },
            { createdAt: "desc" },
        ],
        select: {
            id: true,
            status: true,
            sessionDate: true,
            startTime: true,
            endTime: true,
            priceAtBooking: true,
            student: {
                select: {
                    id: true,
                    name: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    image: true,
                    avatarUrl: true,
                },
            },
            tutor: {
                select: {
                    id: true,
                    user: {
                        select: {
                            name: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            image: true,
                            avatarUrl: true,
                        },
                    },
                },
            },
            session: {
                select: {
                    id: true,
                    status: true,
                },
            },
        },
    });

    return {
        sessions: sessions
            .filter((item): item is typeof item & { session: NonNullable<typeof item.session> } => Boolean(item.session))
            .map((item) =>
                mapSessionListItem({
                    bookingId: item.id,
                    sessionId: item.session.id,
                    bookingStatus: item.status,
                    sessionStatus: item.session.status,
                    sessionDate: item.sessionDate,
                    startTime: item.startTime,
                    endTime: item.endTime,
                    priceAtBooking: item.priceAtBooking,
                    student: item.student,
                    tutor: item.tutor,
                })
            ),
    };
}

export async function cancelBooking(
    userId: string,
    role: "student" | "tutor" | "admin",
    bookingId: string
): Promise<CancelBookingResponse> {
    if (role !== Role.student && role !== Role.tutor) {
        throw new HttpError(403, "Only tutors or students can cancel sessions.");
    }

    const booking = await prisma.booking.findFirst({
        where:
            role === Role.student
                ? {
                      id: bookingId,
                      studentId: userId,
                      deletedAt: null,
                  }
                : {
                      id: bookingId,
                      deletedAt: null,
                      tutor: {
                          userId,
                          deletedAt: null,
                      },
                  },
        select: {
            id: true,
            status: true,
            startTime: true,
            endTime: true,
            studentId: true,
            slotId: true,
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
                    id: true,
                    status: true,
                },
            },
        },
    });

    if (!booking) {
        throw new HttpError(404, "Booking not found.");
    }

    if (booking.startTime <= new Date()) {
        throw new HttpError(400, "This session can no longer be cancelled.");
    }

    if (booking.status === BookingStatus.cancelled || booking.status === BookingStatus.completed) {
        throw new HttpError(409, "This session cannot be cancelled anymore.");
    }

    const studentDisplayName = normalizeDisplayName(booking.student);
    const tutorDisplayName = normalizeDisplayName(booking.tutor.user);
    const cancelledByName = role === Role.student ? studentDisplayName : tutorDisplayName;
    const sessionLabel = `${formatDateTime(booking.startTime)} - ${formatDateTime(booking.endTime)}`;

    const result = await prisma.$transaction(
        async (tx) => {
            await tx.booking.update({
                where: { id: booking.id },
                data: {
                    status: BookingStatus.cancelled,
                    cancelledAt: new Date(),
                    cancelledByUserId: userId,
                    cancellationReason: "Cancelled from dashboard.",
                },
            });

            if (booking.session) {
                await tx.session.update({
                    where: { bookingId: booking.id },
                    data: {
                        status: SessionStatus.cancelled,
                    },
                });
            }

            const releasedSlot = await tx.availabilitySlot.updateMany({
                where: {
                    id: booking.slotId,
                    deletedAt: null,
                    startAt: {
                        gt: new Date(),
                    },
                },
                data: {
                    isBooked: false,
                },
            });

            const [studentEmail, tutorEmail] = await Promise.all([
                tx.notification.create({
                    data: {
                        userId: booking.student.id,
                        bookingId: booking.id,
                        type: NotificationType.booking_cancelled,
                        channel: NotificationChannel.email,
                        title: "Session cancelled",
                        message: `${cancelledByName} cancelled the session scheduled for ${sessionLabel}.`,
                        status: NotificationStatus.pending,
                        scheduledFor: new Date(),
                    },
                    select: { id: true },
                }),
                tx.notification.create({
                    data: {
                        userId: booking.tutor.user.id,
                        bookingId: booking.id,
                        type: NotificationType.booking_cancelled,
                        channel: NotificationChannel.email,
                        title: "Session cancelled",
                        message: `${cancelledByName} cancelled the session scheduled for ${sessionLabel}.`,
                        status: NotificationStatus.pending,
                        scheduledFor: new Date(),
                    },
                    select: { id: true },
                }),
            ]);

            await tx.notification.createMany({
                data: [
                    {
                        userId: booking.student.id,
                        bookingId: booking.id,
                        type: NotificationType.booking_cancelled,
                        channel: NotificationChannel.in_app,
                        title: "Session cancelled",
                        message: `${cancelledByName} cancelled the session scheduled for ${sessionLabel}.`,
                        status: NotificationStatus.sent,
                        sentAt: new Date(),
                    },
                    {
                        userId: booking.tutor.user.id,
                        bookingId: booking.id,
                        type: NotificationType.booking_cancelled,
                        channel: NotificationChannel.in_app,
                        title: "Session cancelled",
                        message: `${cancelledByName} cancelled the session scheduled for ${sessionLabel}.`,
                        status: NotificationStatus.sent,
                        sentAt: new Date(),
                    },
                ],
            });

            return {
                slotReleased: releasedSlot.count > 0,
                studentEmailNotificationId: studentEmail.id,
                tutorEmailNotificationId: tutorEmail.id,
            };
        },
        {
            maxWait: 10000,
            timeout: 20000,
        }
    );

    await Promise.allSettled([
        sendNotificationEmail({
            notificationId: result.studentEmailNotificationId,
            to: booking.student.email,
            subject: "SkillBridge session cancelled",
            text: `Hello ${studentDisplayName},\n\n${cancelledByName} cancelled the session scheduled for ${sessionLabel}.\n\nIf the time slot is still in the future, it has been released back to availability.\n\nSkillBridge`,
        }),
        sendNotificationEmail({
            notificationId: result.tutorEmailNotificationId,
            to: booking.tutor.user.email,
            subject: "SkillBridge session cancelled",
            text: `Hello ${tutorDisplayName},\n\n${cancelledByName} cancelled the session scheduled for ${sessionLabel}.\n\nIf the time slot is still in the future, it has been released back to availability.\n\nSkillBridge`,
        }),
    ]);

    return {
        bookingId: booking.id,
        sessionId: booking.session?.id ?? null,
        status: "cancelled",
        sessionStatus: booking.session ? "cancelled" : null,
        slotReleased: result.slotReleased,
    };
}

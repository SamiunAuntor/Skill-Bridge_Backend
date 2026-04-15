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
import { createZoomMeeting, deleteZoomMeeting } from "../../services/zoom/zoom.service";
import { HttpError } from "../../utils/http-error";
import {
    BookingConfirmationResponse,
    CancelBookingResponse,
    CreateBookingInput,
    JoinSessionResponse,
    SessionListItem,
    SessionListQuery,
    SessionListResponse,
    SessionListSortOption,
    TutorDashboardSummaryResponse,
} from "./booking.types";
import { Prisma } from "../../generated/prisma/client";

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
    meetingProvider: string | null;
    meetingId: string | null;
    meetingJoinUrl: string | null;
    meetingPassword: string | null;
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
    const joinOpensAt = new Date(input.startTime.getTime() - 10 * 60 * 1000);

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
        canJoin:
            Boolean(input.meetingJoinUrl) &&
            (input.sessionStatus === SessionStatus.scheduled ||
                input.sessionStatus === SessionStatus.ongoing) &&
            input.endTime > now &&
            joinOpensAt <= now,
        meetingProvider: input.meetingProvider,
        meetingId: input.meetingId,
        meetingJoinUrl: input.meetingJoinUrl,
        meetingPassword: input.meetingPassword,
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
                    meetingProvider: true,
                    meetingId: true,
                    meetingJoinUrl: true,
                    meetingPassword: true,
                },
            });

            const studentDisplayName = normalizeDisplayName(student);
            const tutorDisplayName = normalizeDisplayName(tutor.user);
            const sessionLabel = `${formatDateTime(slot.startAt)} - ${formatDateTime(slot.endAt)}`;
            const amountLabel = formatMoney(priceAtBooking);

            const reminderAt =
                slot.startAt.getTime() - now.getTime() <= 15 * 60 * 1000
                    ? now
                    : new Date(slot.startAt.getTime() - 15 * 60 * 1000);

            await Promise.all([
                tx.notification.create({
                    data: {
                        userId: student.id,
                        bookingId: booking.id,
                        type: NotificationType.booking_confirmed,
                        channel: NotificationChannel.in_app,
                        title: "Booking confirmed",
                        message: `Your session with ${tutorDisplayName} is confirmed for ${sessionLabel}.`,
                        status: NotificationStatus.pending,
                        scheduledFor: now,
                    },
                }),
                tx.notification.create({
                    data: {
                        userId: tutor.user.id,
                        bookingId: booking.id,
                        type: NotificationType.booking_confirmed,
                        channel: NotificationChannel.in_app,
                        title: "New booking received",
                        message: `${studentDisplayName} booked a session for ${sessionLabel}.`,
                        status: NotificationStatus.pending,
                        scheduledFor: now,
                    },
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
                        scheduledFor: now,
                    },
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
                        scheduledFor: now,
                    },
                }),
                tx.notification.create({
                    data: {
                        userId: student.id,
                        bookingId: booking.id,
                        type: NotificationType.session_reminder,
                        channel: NotificationChannel.in_app,
                        title: "15 minutes left for your session",
                        message: `Your session with ${tutorDisplayName} starts in 15 minutes.`,
                        status: NotificationStatus.pending,
                        scheduledFor: reminderAt,
                    },
                }),
                tx.notification.create({
                    data: {
                        userId: tutor.user.id,
                        bookingId: booking.id,
                        type: NotificationType.session_reminder,
                        channel: NotificationChannel.in_app,
                        title: "15 minutes left for your session",
                        message: `Your session with ${studentDisplayName} starts in 15 minutes.`,
                        status: NotificationStatus.pending,
                        scheduledFor: reminderAt,
                    },
                }),
                tx.notification.create({
                    data: {
                        userId: student.id,
                        bookingId: booking.id,
                        type: NotificationType.session_reminder,
                        channel: NotificationChannel.email,
                        title: "15 minutes left for your session",
                        message: `Your session with ${tutorDisplayName} starts in 15 minutes.`,
                        status: NotificationStatus.pending,
                        scheduledFor: reminderAt,
                    },
                }),
                tx.notification.create({
                    data: {
                        userId: tutor.user.id,
                        bookingId: booking.id,
                        type: NotificationType.session_reminder,
                        channel: NotificationChannel.email,
                        title: "15 minutes left for your session",
                        message: `Your session with ${studentDisplayName} starts in 15 minutes.`,
                        status: NotificationStatus.pending,
                        scheduledFor: reminderAt,
                    },
                }),
            ]);

            return {
                booking,
                session,
            };
        },
        {
            maxWait: 10000,
            timeout: 20000,
        }
    );

    const studentDisplayName = normalizeDisplayName(student);
    const tutorDisplayName = normalizeDisplayName(tutor.user);
    let zoomMeeting: Awaited<ReturnType<typeof createZoomMeeting>> = null;

    try {
        zoomMeeting = await createZoomMeeting({
            topic: `SkillBridge Session: ${studentDisplayName} with ${tutorDisplayName}`,
            startAt: bookingResult.booking.startTime,
            endAt: bookingResult.booking.endTime,
        });
    } catch (error) {
        await prisma.$transaction(
            async (tx) => {
                await tx.notification.deleteMany({
                    where: {
                        bookingId: bookingResult.booking.id,
                    },
                });

                await tx.session.deleteMany({
                    where: {
                        bookingId: bookingResult.booking.id,
                    },
                });

                await tx.booking.delete({
                    where: {
                        id: bookingResult.booking.id,
                    },
                });

                await tx.availabilitySlot.update({
                    where: {
                        id: bookingResult.booking.slotId,
                    },
                    data: {
                        isBooked: false,
                    },
                });
            },
            {
                maxWait: 10000,
                timeout: 20000,
            }
        );

        throw error;
    }

    if (zoomMeeting) {
        await prisma.session.update({
            where: { bookingId: bookingResult.booking.id },
            data: {
                meetingProvider: zoomMeeting.meetingProvider,
                meetingId: zoomMeeting.meetingId,
                meetingJoinUrl: zoomMeeting.meetingJoinUrl,
                meetingHostUrl: zoomMeeting.meetingHostUrl,
                meetingPassword: zoomMeeting.meetingPassword,
            },
        });
    }

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
            meetingProvider:
                zoomMeeting?.meetingProvider ?? bookingResult.session.meetingProvider,
            meetingId: zoomMeeting?.meetingId ?? bookingResult.session.meetingId,
            meetingJoinUrl:
                zoomMeeting?.meetingJoinUrl ?? bookingResult.session.meetingJoinUrl,
            meetingPassword:
                zoomMeeting?.meetingPassword ?? bookingResult.session.meetingPassword,
        },
    };
}

export async function getMySessions(
    userId: string,
    role: "student" | "tutor" | "admin",
    filters: SessionListQuery
): Promise<SessionListResponse> {
    if (role !== Role.student && role !== Role.tutor) {
        throw new HttpError(403, "Sessions are only available for tutors and students.");
    }

    const search = filters.search?.trim();
    const normalizedSearch = search?.toLowerCase();
    const numericSearch =
        normalizedSearch && !Number.isNaN(Number(normalizedSearch))
            ? Number(normalizedSearch)
            : null;

    const baseWhere: Prisma.BookingWhereInput =
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
              };

    const filteredWhere: Prisma.BookingWhereInput = {
        ...baseWhere,
    };

    if (search) {
        const searchConditions: Prisma.BookingWhereInput[] =
            role === Role.student
                ? [
                      {
                          tutor: {
                              user: {
                                  name: {
                                      contains: search,
                                      mode: "insensitive",
                                  },
                              },
                          },
                      },
                      {
                          tutor: {
                              user: {
                                  firstName: {
                                      contains: search,
                                      mode: "insensitive",
                                  },
                              },
                          },
                      },
                      {
                          tutor: {
                              user: {
                                  lastName: {
                                      contains: search,
                                      mode: "insensitive",
                                  },
                              },
                          },
                      },
                      {
                          tutor: {
                              user: {
                                  email: {
                                      contains: search,
                                      mode: "insensitive",
                                  },
                              },
                          },
                      },
                  ]
                : [
                      {
                          student: {
                              name: {
                                  contains: search,
                                  mode: "insensitive",
                              },
                          },
                      },
                      {
                          student: {
                              firstName: {
                                  contains: search,
                                  mode: "insensitive",
                              },
                          },
                      },
                      {
                          student: {
                              lastName: {
                                  contains: search,
                                  mode: "insensitive",
                              },
                          },
                      },
                      {
                          student: {
                              email: {
                                  contains: search,
                                  mode: "insensitive",
                              },
                          },
                      },
                  ];

        if (numericSearch !== null) {
            searchConditions.push({
                priceAtBooking: numericSearch,
            });
        }

        filteredWhere.AND = [
            ...(Array.isArray(filteredWhere.AND) ? filteredWhere.AND : []),
            {
                OR: searchConditions,
            },
        ];
    }

    if (filters.sortBy === "upcoming_only") {
        filteredWhere.session = {
            is: {
                status: {
                    in: [SessionStatus.scheduled, SessionStatus.ongoing],
                },
            },
        };
    } else if (filters.sortBy === "completed_only") {
        filteredWhere.session = {
            is: {
                status: SessionStatus.completed,
            },
        };
    } else if (filters.sortBy === "cancelled_only") {
        filteredWhere.session = {
            is: {
                status: SessionStatus.cancelled,
            },
        };
    }

    const orderBy: Prisma.BookingOrderByWithRelationInput[] =
        filters.sortBy === "amount_high"
            ? [{ priceAtBooking: "desc" }, { startTime: "asc" }]
            : filters.sortBy === "amount_low"
            ? [{ priceAtBooking: "asc" }, { startTime: "asc" }]
            : filters.sortBy === "time_desc"
            ? [{ startTime: "desc" }, { createdAt: "desc" }]
            : [{ startTime: "asc" }, { createdAt: "desc" }];

    const sessions = await prisma.booking.findMany({
        where: filteredWhere,
        orderBy,
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
                    meetingProvider: true,
                    meetingId: true,
                    meetingJoinUrl: true,
                    meetingPassword: true,
                },
            },
        },
    });

    const statsRows = await prisma.booking.findMany({
        where: baseWhere,
        select: {
            session: {
                select: {
                    status: true,
                },
            },
        },
    });

    const stats = statsRows.reduce(
        (accumulator, item) => {
            if (item.session?.status === SessionStatus.completed) {
                accumulator.completed += 1;
            } else if (item.session?.status === SessionStatus.cancelled) {
                accumulator.cancelled += 1;
            } else if (
                item.session?.status === SessionStatus.scheduled ||
                item.session?.status === SessionStatus.ongoing
            ) {
                accumulator.upcoming += 1;
            }

            return accumulator;
        },
        {
            upcoming: 0,
            completed: 0,
            cancelled: 0,
        }
    );

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
                    meetingProvider: item.session.meetingProvider,
                    meetingId: item.session.meetingId,
                    meetingJoinUrl: item.session.meetingJoinUrl,
                    meetingPassword: item.session.meetingPassword,
                    student: item.student,
                    tutor: item.tutor,
                })
            ),
        stats,
        filters: {
            search: filters.search ?? "",
            sortBy: filters.sortBy,
        },
    };
}

export async function getTutorDashboardSummary(
    userId: string,
    role: "student" | "tutor" | "admin"
): Promise<TutorDashboardSummaryResponse> {
    if (role !== Role.tutor) {
        throw new HttpError(403, "Tutor dashboard summary is only available for tutors.");
    }

    const [completedRows, upcomingRows] = await Promise.all([
        prisma.booking.findMany({
            where: {
                deletedAt: null,
                tutor: {
                    userId,
                    deletedAt: null,
                },
                session: {
                    is: {
                        status: SessionStatus.completed,
                    },
                },
            },
            select: {
                priceAtBooking: true,
                session: {
                    select: {
                        durationHours: true,
                    },
                },
            },
        }),
        prisma.booking.findMany({
            where: {
                deletedAt: null,
                tutor: {
                    userId,
                    deletedAt: null,
                },
                session: {
                    is: {
                        status: {
                            in: [SessionStatus.scheduled, SessionStatus.ongoing],
                        },
                    },
                },
            },
            orderBy: [{ startTime: "asc" }, { createdAt: "desc" }],
            take: 4,
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
                        meetingProvider: true,
                        meetingId: true,
                        meetingJoinUrl: true,
                        meetingPassword: true,
                    },
                },
            },
        }),
    ]);

    const stats = completedRows.reduce(
        (accumulator, row) => {
            accumulator.totalEarnings += row.priceAtBooking;
            accumulator.totalHours += row.session?.durationHours ?? 0;
            return accumulator;
        },
        {
            totalEarnings: 0,
            totalHours: 0,
        }
    );

    return {
        stats: {
            totalEarnings: Number(stats.totalEarnings.toFixed(2)),
            totalHours: Number(stats.totalHours.toFixed(2)),
            averageRating: null,
        },
        upcomingSessions: upcomingRows
            .filter((item): item is typeof item & { session: NonNullable<typeof item.session> } =>
                Boolean(item.session)
            )
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
                    meetingProvider: item.session.meetingProvider,
                    meetingId: item.session.meetingId,
                    meetingJoinUrl: item.session.meetingJoinUrl,
                    meetingPassword: item.session.meetingPassword,
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
                    meetingId: true,
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
            await tx.notification.updateMany({
                where: {
                    bookingId: booking.id,
                    status: NotificationStatus.pending,
                    type: {
                        in: [NotificationType.booking_confirmed, NotificationType.session_reminder],
                    },
                },
                data: {
                    status: NotificationStatus.failed,
                },
            });

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

            await Promise.all([
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
            };
        },
        {
            maxWait: 10000,
            timeout: 20000,
        }
    );

    await Promise.allSettled([deleteZoomMeeting(booking.session?.meetingId)]);

    return {
        bookingId: booking.id,
        sessionId: booking.session?.id ?? null,
        status: "cancelled",
        sessionStatus: booking.session ? "cancelled" : null,
        slotReleased: result.slotReleased,
    };
}

export async function joinSession(
    userId: string,
    role: "student" | "tutor" | "admin",
    bookingId: string
): Promise<JoinSessionResponse> {
    if (role !== Role.student && role !== Role.tutor) {
        throw new HttpError(403, "Only tutors or students can join sessions.");
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
            startTime: true,
            endTime: true,
            status: true,
            session: {
                select: {
                    id: true,
                    status: true,
                    meetingJoinUrl: true,
                },
            },
        },
    });

    if (!booking || !booking.session) {
        throw new HttpError(404, "Session not found.");
    }

    if (!booking.session.meetingJoinUrl) {
        throw new HttpError(409, "Meeting link is not available yet.");
    }

    if (booking.status === BookingStatus.cancelled || booking.session.status === SessionStatus.cancelled) {
        throw new HttpError(409, "Cancelled sessions cannot be joined.");
    }

    const now = new Date();
    const joinOpensAt = new Date(booking.startTime.getTime() - 10 * 60 * 1000);

    if (now < joinOpensAt) {
        throw new HttpError(400, "Join will be available 10 minutes before the session starts.");
    }

    let nextStatus: SessionStatus = booking.session.status;

    if (booking.session.status === SessionStatus.scheduled) {
        const updated = await prisma.session.update({
            where: { bookingId: booking.id },
            data: {
                status: SessionStatus.ongoing,
                actualStartTime: booking.startTime <= now ? now : booking.startTime,
            },
            select: {
                status: true,
            },
        });

        nextStatus = updated.status;
    }

    if (booking.endTime <= now && nextStatus !== SessionStatus.completed) {
        const durationHours = Math.max(
            0,
            Number(
                ((booking.endTime.getTime() - booking.startTime.getTime()) /
                    (1000 * 60 * 60)).toFixed(2)
            )
        );

        const completed = await prisma.$transaction(async (tx) => {
            await tx.session.update({
                where: { bookingId: booking.id },
                data: {
                    status: SessionStatus.completed,
                    actualStartTime: booking.startTime,
                    actualEndTime: booking.endTime,
                    durationHours,
                },
            });

            await tx.booking.update({
                where: { id: booking.id },
                data: {
                    status: BookingStatus.completed,
                    completedAt: new Date(),
                },
            });

            return SessionStatus.completed;
        });

        nextStatus = completed;
    }

    const sessionStatus: "ongoing" | "completed" =
        nextStatus === SessionStatus.completed ? "completed" : "ongoing";

    return {
        bookingId: booking.id,
        sessionId: booking.session.id,
        sessionStatus,
        meetingJoinUrl: booking.session.meetingJoinUrl,
    };
}

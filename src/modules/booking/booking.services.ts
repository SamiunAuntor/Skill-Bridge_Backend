import {
    BookingStatus,
    NotificationChannel,
    NotificationStatus,
    NotificationType,
    Role,
    SessionStatus,
} from "../../generated/prisma/client";
import { prisma } from "../../config/prisma.config";
import { deleteZoomMeeting } from "../../services/zoom/zoom.service";
import { formatDateTime, toDisplayName } from "../../shared/utils";
import { HttpError } from "../../utils/http-error";
import { syncTutorProfileStats } from "../tutor/tutor.services";
import {
    buildSessionListPrismaQuery,
    buildSessionStatsBaseWhere,
} from "./booking.query";
import {
    CancelBookingResponse,
    JoinSessionResponse,
    SessionListItem,
    SessionListQuery,
    SessionListResponse,
    SessionListSortOption,
    TutorDashboardSummaryResponse,
} from "./booking.types";

function normalizeDisplayName(input: {
    name: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
}): string {
    return toDisplayName(input);
}

function mapSessionListItem(input: {
    bookingId: string;
    sessionId: string;
    reviewId: string | null;
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
    };
    tutor: {
        id: string;
        user: {
            name: string;
            firstName: string | null;
            lastName: string | null;
            email: string;
            image: string | null;
        };
    };
}): SessionListItem {
    const now = new Date();
    const joinOpensAt = new Date(input.startTime.getTime() - 10 * 60 * 1000);

    return {
        bookingId: input.bookingId,
        sessionId: input.sessionId,
        reviewId: input.reviewId,
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
        canLeaveReview: input.sessionStatus === SessionStatus.completed && !input.reviewId,
        student: {
            id: input.student.id,
            name: normalizeDisplayName(input.student),
            avatarUrl: input.student.image ?? null,
        },
        tutor: {
            id: input.tutor.id,
            name: normalizeDisplayName(input.tutor.user),
            avatarUrl: input.tutor.user.image ?? null,
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

    const roleForQueryBuilder = role === Role.student ? "student" : "tutor";
    const baseWhere = buildSessionStatsBaseWhere(userId, roleForQueryBuilder);
    const queryBuilder = buildSessionListPrismaQuery(
        userId,
        roleForQueryBuilder,
        filters
    );

    const sessions = await prisma.booking.findMany({
        where: queryBuilder.where,
        orderBy: queryBuilder.orderBy,
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
            review: {
                select: {
                    id: true,
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
                    reviewId: item.review?.id ?? null,
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

    const tutorProfile = await prisma.tutorProfile.findFirst({
        where: {
            userId,
            deletedAt: null,
            user: {
                deletedAt: null,
                isBanned: false,
                role: Role.tutor,
            },
        },
        select: {
            id: true,
            averageRating: true,
            totalReviews: true,
            reviews: {
                where: {
                    deletedAt: null,
                    isVisible: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 3,
                select: {
                    id: true,
                    rating: true,
                    comment: true,
                    createdAt: true,
                    student: {
                        select: {
                            id: true,
                            name: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            image: true,
                        },
                    },
                },
            },
        },
    });

    if (!tutorProfile) {
        throw new HttpError(404, "Tutor profile not found.");
    }

    const [completedRows, upcomingRows] = await Promise.all([
        prisma.booking.findMany({
            where: {
                deletedAt: null,
                tutor: {
                    id: tutorProfile.id,
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
                    id: tutorProfile.id,
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
                review: {
                    select: {
                        id: true,
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
            averageRating:
                tutorProfile.totalReviews > 0 ? tutorProfile.averageRating : null,
            totalReviews: tutorProfile.totalReviews,
        },
        upcomingSessions: upcomingRows
            .filter((item): item is typeof item & { session: NonNullable<typeof item.session> } =>
                Boolean(item.session)
            )
            .map((item) =>
                mapSessionListItem({
                    bookingId: item.id,
                    sessionId: item.session.id,
                    reviewId: item.review?.id ?? null,
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
        recentFeedback: tutorProfile.reviews.map((review) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt.toISOString(),
            student: {
                id: review.student.id,
                name: normalizeDisplayName(review.student),
                avatarUrl: review.student.image ?? null,
            },
        })),
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
            tutorId: true,
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
        await syncTutorProfileStats(booking.tutorId);
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

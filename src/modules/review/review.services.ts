import { prisma } from "../../config/prisma.config";
import {
    BookingStatus,
    NotificationChannel,
    NotificationStatus,
    NotificationType,
    Role,
    SessionStatus,
} from "../../generated/prisma/client";
import { normalizeText, toDisplayName } from "../../shared/utils";
import { HttpError } from "../../utils/http-error";
import { syncTutorProfileStats } from "../tutor/tutor.services";
import {
    CreateReviewInput,
    CreateReviewResponse,
    GetReviewResponse,
    ReviewPayload,
    TutorReviewListResponse,
    UpdateReviewInput,
    UpdateReviewResponse,
} from "./review.types";

function mapReview(input: {
    id: string;
    bookingId: string;
    studentId: string;
    tutorId: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
    student: {
        id: string;
        name: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        image: string | null;
    };
}): ReviewPayload {
    return {
        id: input.id,
        bookingId: input.bookingId,
        studentId: input.studentId,
        tutorId: input.tutorId,
        rating: input.rating,
        comment: input.comment ?? "",
        createdAt: input.createdAt.toISOString(),
        updatedAt: input.updatedAt.toISOString(),
        student: {
            id: input.student.id,
            name: toDisplayName(input.student),
            avatarUrl: input.student.image ?? null,
        },
    };
}

export async function createReview(
    studentId: string,
    role: "student" | "tutor" | "admin",
    input: CreateReviewInput
): Promise<CreateReviewResponse> {
    if (role !== Role.student) {
        throw new HttpError(403, "Only students can leave reviews.");
    }

    const booking = await prisma.booking.findFirst({
        where: {
            id: input.bookingId,
            studentId,
            deletedAt: null,
        },
        select: {
            id: true,
            studentId: true,
            tutorId: true,
            status: true,
            session: {
                select: {
                    status: true,
                },
            },
            review: {
                select: {
                    id: true,
                },
            },
        },
    });

    if (!booking) {
        throw new HttpError(404, "Booking not found.");
    }

    if (booking.review?.id) {
        throw new HttpError(409, "You have already submitted a review for this session.");
    }

    if (
        booking.status !== BookingStatus.completed ||
        booking.session?.status !== SessionStatus.completed
    ) {
        throw new HttpError(400, "You can leave a review only after the session is completed.");
    }

    const comment = normalizeText(input.comment);

    const review = await prisma.review.create({
        data: {
            bookingId: booking.id,
            studentId: booking.studentId,
            tutorId: booking.tutorId,
            rating: input.rating,
            comment,
        },
        select: {
            id: true,
            bookingId: true,
            studentId: true,
            tutorId: true,
            rating: true,
            comment: true,
            createdAt: true,
            updatedAt: true,
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
    });

    await syncTutorProfileStats(booking.tutorId);

    await prisma.notification.create({
        data: {
            userId: booking.studentId,
            bookingId: booking.id,
            type: NotificationType.payment_confirmed,
            channel: NotificationChannel.in_app,
            title: "Review submitted",
            message: "Thanks for sharing your feedback. Your review is now part of the tutor profile.",
            status: NotificationStatus.sent,
            sentAt: new Date(),
        },
    });

    return {
        review: mapReview(review),
    };
}

export async function updateReview(
    studentId: string,
    role: "student" | "tutor" | "admin",
    reviewId: string,
    input: UpdateReviewInput
): Promise<UpdateReviewResponse> {
    if (role !== Role.student) {
        throw new HttpError(403, "Only students can edit reviews.");
    }

    const existingReview = await prisma.review.findFirst({
        where: {
            id: reviewId,
            studentId,
            deletedAt: null,
        },
        select: {
            id: true,
            tutorId: true,
        },
    });

    if (!existingReview) {
        throw new HttpError(404, "Review not found.");
    }

    const review = await prisma.review.update({
        where: {
            id: existingReview.id,
        },
        data: {
            rating: input.rating,
            comment: normalizeText(input.comment),
        },
        select: {
            id: true,
            bookingId: true,
            studentId: true,
            tutorId: true,
            rating: true,
            comment: true,
            createdAt: true,
            updatedAt: true,
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
    });

    await syncTutorProfileStats(existingReview.tutorId);

    return {
        review: mapReview(review),
    };
}

export async function getReviewById(
    userId: string,
    role: "student" | "tutor" | "admin",
    reviewId: string
): Promise<GetReviewResponse> {
    const review = await prisma.review.findFirst({
        where: {
            id: reviewId,
            deletedAt: null,
        },
        select: {
            id: true,
            bookingId: true,
            studentId: true,
            tutorId: true,
            rating: true,
            comment: true,
            createdAt: true,
            updatedAt: true,
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
                    userId: true,
                },
            },
        },
    });

    if (!review) {
        throw new HttpError(404, "Review not found.");
    }

    const canAccess =
        role === Role.admin ||
        (role === Role.student && review.studentId === userId) ||
        (role === Role.tutor && review.tutor.userId === userId);

    if (!canAccess) {
        throw new HttpError(403, "You do not have access to this review.");
    }

    return {
        review: mapReview(review),
    };
}

export async function getMyTutorReviews(
    userId: string,
    role: "student" | "tutor" | "admin"
): Promise<TutorReviewListResponse> {
    if (role !== Role.tutor) {
        throw new HttpError(403, "Only tutors can access tutor reviews.");
    }

    const tutorProfile = await prisma.tutorProfile.findFirst({
        where: {
            userId,
            deletedAt: null,
        },
        select: {
            id: true,
        },
    });

    if (!tutorProfile) {
        throw new HttpError(404, "Tutor profile not found.");
    }

    const reviews = await prisma.review.findMany({
        where: {
            tutorId: tutorProfile.id,
            deletedAt: null,
            isVisible: true,
        },
        orderBy: {
            createdAt: "desc",
        },
        include: {
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
    });

    return {
        reviews: reviews.map(mapReview),
    };
}

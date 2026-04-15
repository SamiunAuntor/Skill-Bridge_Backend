import { prisma } from "../../config/prisma.config";
import { BookingStatus, NotificationChannel, NotificationStatus, NotificationType, Role, SessionStatus } from "../../generated/prisma/client";
import { syncTutorProfileStats } from "../tutor/tutor.services";
import { HttpError } from "../../utils/http-error";
import { CreateReviewInput, CreateReviewResponse } from "./review.types";

function normalizeText(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
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

    if (booking.status !== BookingStatus.completed || booking.session?.status !== SessionStatus.completed) {
        throw new HttpError(400, "You can leave a review only after the session is completed.");
    }

    const comment = normalizeText(input.comment);

    const review = await prisma.review.create({
        data: {
            bookingId: booking.id,
            studentId: booking.studentId,
            tutorId: booking.tutorId,
            rating: input.rating,
            comment: comment || null,
        },
        select: {
            id: true,
            bookingId: true,
            studentId: true,
            tutorId: true,
            rating: true,
            comment: true,
            createdAt: true,
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
        review: {
            id: review.id,
            bookingId: review.bookingId,
            studentId: review.studentId,
            tutorId: review.tutorId,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt.toISOString(),
        },
    };
}

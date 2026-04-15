import { BookingStatus, PaymentStatus } from "../../generated/prisma/client";
import { prisma } from "../../config/prisma.config";
import { HttpError } from "../../utils/http-error";
import {
    BookingConfirmationResponse,
    CreateBookingInput,
} from "./booking.types";

function calculatePrice(hourlyRate: number, startAt: Date, endAt: Date): number {
    const durationHours = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
    return Number((hourlyRate * Math.max(durationHours, 0)).toFixed(2));
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
            },
        }),
    ]);

    if (!student || student.deletedAt || student.isBanned) {
        throw new HttpError(403, "Student account is not allowed to book sessions.");
    }

    if (student.role !== "student") {
        throw new HttpError(403, "Only students can book tutor sessions.");
    }

    if (!tutor) {
        throw new HttpError(404, "Tutor not found.");
    }

    const booking = await prisma.$transaction(async (tx) => {
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

        return tx.booking.create({
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
    });

    return {
        booking: {
            id: booking.id,
            tutorId: booking.tutorId,
            slotId: booking.slotId,
            sessionDate: booking.sessionDate.toISOString(),
            startTime: booking.startTime.toISOString(),
            endTime: booking.endTime.toISOString(),
            priceAtBooking: booking.priceAtBooking,
            status: "confirmed",
            paymentStatus: "paid",
        },
    };
}

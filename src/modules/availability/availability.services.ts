import { prisma } from "../../config/prisma.config";
import { HttpError } from "../../utils/http-error";
import {
    AvailabilityListResponse,
    AvailabilitySlotDto,
    CreateAvailabilityInput,
    UpdateAvailabilityInput,
} from "./availability.types";

const MIN_SLOT_DURATION_MINUTES = 5;
const MAX_SLOT_DURATION_MINUTES = 180;

function toSlotDto(input: {
    id: string;
    tutorId: string;
    startAt: Date;
    endAt: Date;
    isBooked: boolean;
}): AvailabilitySlotDto {
    return {
        id: input.id,
        tutorId: input.tutorId,
        startAt: input.startAt.toISOString(),
        endAt: input.endAt.toISOString(),
        isBooked: input.isBooked,
    };
}

async function getTutorProfileIdByUserId(userId: string): Promise<string> {
    const tutor = await prisma.tutorProfile.findUnique({
        where: { userId },
        select: { id: true, deletedAt: true },
    });

    if (!tutor || tutor.deletedAt) {
        throw new HttpError(404, "Tutor profile not found.");
    }

    return tutor.id;
}

async function assertNoOverlappingAvailability(
    tutorId: string,
    startAt: Date,
    endAt: Date,
    excludeSlotId?: string
): Promise<void> {
    const overlappingSlot = await prisma.availabilitySlot.findFirst({
        where: {
            tutorId,
            deletedAt: null,
            ...(excludeSlotId
                ? {
                      id: {
                          not: excludeSlotId,
                      },
                  }
                : {}),
            startAt: {
                lt: endAt,
            },
            endAt: {
                gt: startAt,
            },
        },
        select: { id: true },
    });

    if (overlappingSlot) {
        throw new HttpError(
            409,
            "This time overlaps with an existing availability slot."
        );
    }
}

function assertValidSlotDuration(startAt: Date, endAt: Date): void {
    const durationMinutes = (endAt.getTime() - startAt.getTime()) / (1000 * 60);

    if (durationMinutes < MIN_SLOT_DURATION_MINUTES) {
        throw new HttpError(
            400,
            `Availability must be at least ${MIN_SLOT_DURATION_MINUTES} minutes long.`
        );
    }

    if (durationMinutes > MAX_SLOT_DURATION_MINUTES) {
        throw new HttpError(400, "Availability cannot be longer than 3 hours.");
    }
}

export async function getMyAvailability(userId: string): Promise<AvailabilityListResponse> {
    const tutorId = await getTutorProfileIdByUserId(userId);
    const now = new Date();

    const slots = await prisma.availabilitySlot.findMany({
        where: {
            tutorId,
            deletedAt: null,
            startAt: {
                gte: now,
            },
        },
        orderBy: {
            startAt: "asc",
        },
    });

    return {
        slots: slots.map(toSlotDto),
    };
}

export async function createAvailabilitySlot(
    userId: string,
    input: CreateAvailabilityInput
): Promise<AvailabilitySlotDto> {
    const tutorId = await getTutorProfileIdByUserId(userId);
    const now = new Date();

    if (input.startAt <= now || input.endAt <= now) {
        throw new HttpError(400, "Availability slots must be in the future.");
    }

    if (input.startAt >= input.endAt) {
        throw new HttpError(400, "startAt must be earlier than endAt.");
    }

    assertValidSlotDuration(input.startAt, input.endAt);

    await assertNoOverlappingAvailability(tutorId, input.startAt, input.endAt);

    const slot = await prisma.availabilitySlot.create({
        data: {
            tutorId,
            startAt: input.startAt,
            endAt: input.endAt,
        },
    });

    return toSlotDto(slot);
}

export async function updateAvailabilitySlot(
    userId: string,
    slotId: string,
    input: UpdateAvailabilityInput
): Promise<AvailabilitySlotDto> {
    const tutorId = await getTutorProfileIdByUserId(userId);
    const now = new Date();

    if (input.startAt <= now || input.endAt <= now) {
        throw new HttpError(400, "Availability slots must be in the future.");
    }

    if (input.startAt >= input.endAt) {
        throw new HttpError(400, "startAt must be earlier than endAt.");
    }

    assertValidSlotDuration(input.startAt, input.endAt);

    const slot = await prisma.availabilitySlot.findFirst({
        where: {
            id: slotId,
            tutorId,
            deletedAt: null,
        },
        select: {
            id: true,
            isBooked: true,
            startAt: true,
        },
    });

    if (!slot) {
        throw new HttpError(404, "Availability slot not found.");
    }

    if (slot.isBooked) {
        throw new HttpError(409, "Booked slots cannot be updated.");
    }

    if (slot.startAt <= now) {
        throw new HttpError(400, "Past or active slots cannot be updated.");
    }

    await assertNoOverlappingAvailability(
        tutorId,
        input.startAt,
        input.endAt,
        slot.id
    );

    const updatedSlot = await prisma.availabilitySlot.update({
        where: { id: slot.id },
        data: {
            startAt: input.startAt,
            endAt: input.endAt,
        },
    });

    return toSlotDto(updatedSlot);
}

export async function deleteAvailabilitySlot(
    userId: string,
    slotId: string
): Promise<void> {
    const tutorId = await getTutorProfileIdByUserId(userId);
    const now = new Date();

    const slot = await prisma.availabilitySlot.findFirst({
        where: {
            id: slotId,
            tutorId,
            deletedAt: null,
        },
        select: {
            id: true,
            isBooked: true,
            startAt: true,
        },
    });

    if (!slot) {
        throw new HttpError(404, "Availability slot not found.");
    }

    if (slot.isBooked) {
        throw new HttpError(409, "Booked slots cannot be deleted.");
    }

    if (slot.startAt <= now) {
        throw new HttpError(400, "Past or active slots cannot be deleted.");
    }

    await prisma.availabilitySlot.update({
        where: { id: slot.id },
        data: {
            deletedAt: new Date(),
        },
    });
}

export async function getPublicTutorAvailability(
    tutorId: string
): Promise<AvailabilityListResponse> {
    const now = new Date();

    const tutor = await prisma.tutorProfile.findFirst({
        where: {
            id: tutorId,
            deletedAt: null,
            user: {
                deletedAt: null,
                isBanned: false,
                role: "tutor",
            },
        },
        select: { id: true },
    });

    if (!tutor) {
        throw new HttpError(404, "Tutor not found.");
    }

    const slots = await prisma.availabilitySlot.findMany({
        where: {
            tutorId,
            deletedAt: null,
            isBooked: false,
            startAt: {
                gte: now,
            },
        },
        orderBy: {
            startAt: "asc",
        },
        take: 90,
    });

    return {
        slots: slots.map(toSlotDto),
    };
}

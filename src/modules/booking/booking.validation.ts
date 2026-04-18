import { z } from "zod";
import { sessionSortOptions } from "./booking.types";

export const createBookingSchema = z.object({
    tutorId: z.string().trim().min(1, "tutorId is required."),
    slotId: z.string().trim().min(1, "slotId is required."),
});

export const bookingIdParamsSchema = z.object({
    bookingId: z.string().trim().min(1, "bookingId is required."),
});

export const sessionListQuerySchema = z.object({
    q: z.string().trim().min(1).optional(),
    sortBy: z.enum(sessionSortOptions).optional().default("time_asc"),
});

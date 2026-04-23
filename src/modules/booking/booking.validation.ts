import { z } from "zod";
import { sessionSortOptions } from "./booking.types";

export const bookingIdParamsSchema = z.object({
    bookingId: z.string().trim().min(1, "Booking is required."),
});

export const sessionListQuerySchema = z.object({
    q: z.string().trim().min(1).optional(),
    sortBy: z.enum(sessionSortOptions).optional().default("time_asc"),
});

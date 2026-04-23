import { z } from "zod";

export const createReviewSchema = z.object({
    bookingId: z.string().trim().min(1, "bookingId is required."),
    rating: z.coerce
        .number({
            error: "Rating must be a whole number between 1 and 5.",
        })
        .int("Rating must be a whole number between 1 and 5.")
        .min(1, "Rating must be a whole number between 1 and 5.")
        .max(5, "Rating must be a whole number between 1 and 5."),
    comment: z
        .string()
        .trim()
        .min(1, "Review comment is required.")
        .max(1000, "Review comment must be 1000 characters or fewer.")
        .optional(),
});

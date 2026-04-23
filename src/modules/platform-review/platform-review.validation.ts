import { z } from "zod";

export const platformReviewSubmitSchema = z.object({
    rating: z.coerce
        .number()
        .int("Rating must be a whole number.")
        .min(1, "Rating must be at least 1.")
        .max(5, "Rating cannot be more than 5."),
    title: z
        .string()
        .trim()
        .max(90, "Title must be 90 characters or fewer.")
        .optional()
        .nullable()
        .transform((value) => value || undefined),
    message: z
        .string()
        .trim()
        .min(20, "Review message must be at least 20 characters.")
        .max(600, "Review message must be 600 characters or fewer."),
});

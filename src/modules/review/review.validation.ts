import { z } from "zod";

function countWords(value: string): number {
    return value
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
}

const commentSchema = z
    .string()
    .trim()
    .min(1, "Review comment is required.")
    .max(1000, "Review comment must be 1000 characters or fewer.")
    .refine(
        (value) => countWords(value) >= 10,
        "Review comment must be at least 10 words."
    );

const ratingSchema = z.coerce
    .number({
        error: "Rating must be a whole number between 1 and 5.",
    })
    .int("Rating must be a whole number between 1 and 5.")
    .min(1, "Rating must be a whole number between 1 and 5.")
    .max(5, "Rating must be a whole number between 1 and 5.");

export const createReviewSchema = z.object({
    bookingId: z.string().trim().min(1, "bookingId is required."),
    rating: ratingSchema,
    comment: commentSchema,
});

export const updateReviewSchema = z.object({
    rating: ratingSchema,
    comment: commentSchema,
});

import { z } from "zod";

export const publicSubjectSortOptions = ["most_tutors", "alphabetical"] as const;

export const publicSubjectsQuerySchema = z.object({
    q: z
        .string()
        .trim()
        .min(1)
        .optional()
        .transform((value) => value?.trim() || undefined),
    sortBy: z.enum(publicSubjectSortOptions).optional().default("most_tutors"),
});

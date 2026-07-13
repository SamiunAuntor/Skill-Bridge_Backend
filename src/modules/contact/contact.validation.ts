import { z } from "zod";
import { ContactSubmissionStatus } from "../../generated/prisma/client";

const positiveInteger = (fallback: number) =>
    z.union([z.string(), z.number()]).optional().transform((value, context) => {
        if (value == null || value === "") return fallback;
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            context.addIssue({ code: "custom", message: "Must be a positive integer." });
            return z.NEVER;
        }
        return parsed;
    });

export const contactSubmissionSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
    email: z.string().trim().email("Enter a valid email address.").max(254)
        .transform((value) => value.toLowerCase()),
    subject: z.string().trim().min(3, "Subject must be at least 3 characters.").max(120),
    message: z.string().trim().min(20, "Message must be at least 20 characters.").max(2000),
    website: z.string().max(200).optional().default(""),
});

export const contactAdminQuerySchema = z.object({
    q: z.string().trim().optional().transform((value) => value || undefined),
    status: z.nativeEnum(ContactSubmissionStatus).optional(),
    sortBy: z.enum(["newest", "oldest"]).optional().default("newest"),
    page: positiveInteger(1),
    limit: positiveInteger(10),
});

export const contactIdParamsSchema = z.object({
    id: z.string().trim().min(1, "Submission id is required."),
});

export const contactStatusSchema = z.object({
    status: z.nativeEnum(ContactSubmissionStatus),
});

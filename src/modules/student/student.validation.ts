import { z } from "zod";

const optionalNullableHttpsUrl = z
    .union([z.string(), z.null()])
    .optional()
    .transform((value, ctx) => {
        if (value === undefined) {
            return undefined;
        }

        if (value === null) {
            return null;
        }

        const normalized = value.trim();

        if (!normalized) {
            return null;
        }

        try {
            const url = new URL(normalized);
            if (!["http:", "https:"].includes(url.protocol)) {
                throw new Error("invalid protocol");
            }

            return normalized;
        } catch {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Profile image must be a valid image URL.",
            });
            return z.NEVER;
        }
    });

export const updateStudentProfileSchema = z.object({
    fullName: z.string().trim().min(1, "Full name is required."),
    profileImageUrl: optionalNullableHttpsUrl,
});

import { z } from "zod";
import { tutorSortOptions } from "./tutor.types";
import { tutorQueryDefaults } from "./tutor.query";

const optionalNumberFromQuery = (fieldName: string) =>
    z
        .union([z.string(), z.number()])
        .optional()
        .transform((value, ctx) => {
            if (value == null || value === "") {
                return undefined;
            }

            const parsed = Number(value);

            if (Number.isNaN(parsed)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `${fieldName} must be a valid number.`,
                });
                return z.NEVER;
            }

            return parsed;
        });

const positiveIntegerFromQuery = (fieldName: string, defaultValue: number) =>
    z
        .union([z.string(), z.number()])
        .optional()
        .transform((value, ctx) => {
            if (value == null || value === "") {
                return defaultValue;
            }

            const parsed = Number(value);

            if (!Number.isInteger(parsed) || parsed <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `${fieldName} must be a positive integer.`,
                });
                return z.NEVER;
            }

            return parsed;
        });

const optionalBooleanFromQuery = (fieldName: string) =>
    z
        .union([z.literal("true"), z.literal("false")])
        .optional()
        .transform((value, ctx) => {
            if (value == null) {
                return undefined;
            }

            if (value === "true") {
                return true;
            }

            if (value === "false") {
                return false;
            }

            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${fieldName} must be either true or false.`,
            });

            return z.NEVER;
        });

const requiredYear = (fieldName: string) =>
    z.coerce
        .number({
            error: `${fieldName} must be a valid year.`,
        })
        .int(`${fieldName} must be a valid year.`)
        .min(1900, `${fieldName} must be a valid year.`)
        .max(3000, `${fieldName} must be a valid year.`);

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

export const tutorListQuerySchema = z
    .object({
        q: z
            .string()
            .trim()
            .min(1)
            .optional()
            .transform((value) => value?.trim() || undefined),
        category: z
            .string()
            .trim()
            .min(1)
            .optional()
            .transform((value) => value?.toLowerCase()),
        subject: z
            .string()
            .trim()
            .min(1)
            .optional()
            .transform((value) => value?.toLowerCase()),
        minPrice: optionalNumberFromQuery("minPrice"),
        maxPrice: optionalNumberFromQuery("maxPrice"),
        minRating: optionalNumberFromQuery("minRating"),
        availability: optionalBooleanFromQuery("availability"),
        sortBy: z.enum(tutorSortOptions).optional().default("recommended"),
        page: positiveIntegerFromQuery("page", tutorQueryDefaults.page),
        limit: positiveIntegerFromQuery("limit", tutorQueryDefaults.limit),
    })
    .superRefine((value, ctx) => {
        if (
            typeof value.minPrice === "number" &&
            typeof value.maxPrice === "number" &&
            value.minPrice > value.maxPrice
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "minPrice cannot be greater than maxPrice.",
                path: ["minPrice"],
            });
        }

        if (
            typeof value.minRating === "number" &&
            (value.minRating < 0 || value.minRating > 5)
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "minRating must be between 0 and 5.",
                path: ["minRating"],
            });
        }
    });

export const tutorIdParamsSchema = z.object({
    id: z.string().trim().min(1, "Tutor id is required."),
});

export const tutorProfileUpdateSchema = z.object({
    profileImageUrl: optionalNullableHttpsUrl,
    professionalTitle: z.string().trim().min(1, "Professional title is required."),
    bio: z
        .string()
        .trim()
        .refine((value) => value.length === 0 || value.length >= 20, {
            message: "Bio must be at least 20 characters long.",
        }),
    hourlyRate: z.coerce
        .number({
            error: "Hourly rate must be a valid number.",
        })
        .refine((value) => Number.isFinite(value) && value > 0, {
            message: "Hourly rate must be greater than 0.",
        }),
    experienceYears: z.coerce
        .number({
            error: "Experience years must be a valid number.",
        })
        .refine((value) => Number.isFinite(value) && value >= 0, {
            message: "Experience years cannot be negative.",
        }),
    categoryIds: z
        .array(z.string().trim().min(1, "Each selected category must be valid."))
        .min(1, "At least one category is required."),
    subjectIds: z
        .array(z.string().trim().min(1, "Each selected subject must be valid."))
        .min(1, "At least one subject is required."),
    education: z.array(
        z
            .object({
                id: z.string().trim().min(1).optional(),
                categoryId: z
                    .string()
                    .trim()
                    .min(1, "Each education entry needs an education category."),
                degreeId: z.string().trim().min(1, "Each education entry needs a degree."),
                institution: z
                    .string()
                    .trim()
                    .min(1, "Each education entry needs an institution name."),
                startYear: requiredYear("startYear"),
                endYear: z
                    .union([z.coerce.number(), z.null()])
                    .optional()
                    .transform((value, ctx) => {
                        if (value == null) {
                            return null;
                        }

                        if (
                            !Number.isInteger(value) ||
                            value < 1900 ||
                            value > 3000
                        ) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: "endYear must be a valid year.",
                            });
                            return z.NEVER;
                        }

                        return value;
                    }),
                description: z.string().trim().nullish().transform((value) => value || null),
            })
            .superRefine((value, ctx) => {
                if (value.endYear !== null && value.startYear > value.endYear) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "startYear cannot be greater than endYear.",
                        path: ["startYear"],
                    });
                }
            })
    ),
});

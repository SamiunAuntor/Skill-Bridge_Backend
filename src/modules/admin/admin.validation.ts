import { z } from "zod";
import { BookingStatus, PaymentStatus } from "../../generated/prisma/client";
import {
    adminBookingSortOptions,
    adminMasterSortOptions,
    adminUserSortOptions,
} from "./admin.types";
import { adminQueryDefaults } from "./admin.query";

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

const optionalTrimmedString = z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined);

const optionalNullableHttpsUrl = (fieldName: string) =>
    z
        .union([z.string(), z.null()])
        .optional()
        .transform((value, ctx) => {
            if (value == null) {
                return value;
            }

            const normalized = value.trim();

            if (!normalized) {
                return null;
            }

            try {
                const url = new URL(normalized);
                if (!["http:", "https:"].includes(url.protocol)) {
                    throw new Error("Invalid protocol.");
                }
                return normalized;
            } catch {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `${fieldName} must be a valid URL.`,
                });
                return z.NEVER;
            }
        });

export const adminDashboardQuerySchema = z.object({});

export const adminUsersQuerySchema = z.object({
    q: optionalTrimmedString,
    role: z.enum(["student", "tutor"]).optional(),
    banned: optionalBooleanFromQuery("banned"),
    verified: optionalBooleanFromQuery("verified"),
    sortBy: z.enum(adminUserSortOptions).optional().default("newest"),
    page: positiveIntegerFromQuery("page", adminQueryDefaults.page),
    limit: positiveIntegerFromQuery("limit", adminQueryDefaults.limit),
});

export const adminUserIdParamsSchema = z.object({
    id: z.string().trim().min(1, "User id is required."),
});

export const adminUserStatusUpdateSchema = z.object({
    isBanned: z.boolean(),
});

export const adminBookingsQuerySchema = z.object({
    q: optionalTrimmedString,
    status: z.nativeEnum(BookingStatus).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    sortBy: z.enum(adminBookingSortOptions).optional().default("session_desc"),
    page: positiveIntegerFromQuery("page", adminQueryDefaults.page),
    limit: positiveIntegerFromQuery("limit", adminQueryDefaults.limit),
});

export const adminCategoriesQuerySchema = z.object({
    q: optionalTrimmedString,
    isActive: optionalBooleanFromQuery("isActive"),
    sortBy: z.enum(adminMasterSortOptions).optional().default("name_asc"),
    page: positiveIntegerFromQuery("page", adminQueryDefaults.page),
    limit: positiveIntegerFromQuery("limit", adminQueryDefaults.limit),
});

export const adminSubjectsQuerySchema = adminCategoriesQuerySchema.extend({
    categoryId: optionalTrimmedString,
});

export const adminDegreesQuerySchema = adminCategoriesQuerySchema.extend({
    categoryId: optionalTrimmedString,
});

export const adminCategoryCreateSchema = z.object({
    name: z.string().trim().min(1, "Category name is required."),
    description: z.string().trim().nullish().transform((value) => value || null),
    isActive: z.boolean().optional(),
});

export const adminCategoryUpdateSchema = adminCategoryCreateSchema;

export const adminSubjectCreateSchema = z.object({
    categoryId: z.string().trim().min(1, "Category is required."),
    name: z.string().trim().min(1, "Subject name is required."),
    description: z
        .string()
        .trim()
        .nullish()
        .transform((value) => value || null),
    iconUrl: optionalNullableHttpsUrl("iconUrl"),
    iconPublicId: z.string().trim().nullish().transform((value) => value || null),
    isActive: z.boolean().optional(),
});

export const adminSubjectUpdateSchema = adminSubjectCreateSchema;

export const adminDegreeCreateSchema = z.object({
    categoryId: z.string().trim().min(1, "Category is required."),
    name: z.string().trim().min(1, "Degree name is required."),
    level: z.string().trim().nullish().transform((value) => value || null),
    isActive: z.boolean().optional(),
});

export const adminDegreeUpdateSchema = adminDegreeCreateSchema;

export const adminEntityIdParamsSchema = z.object({
    id: z.string().trim().min(1, "Identifier is required."),
});

import { z } from "zod";
import { USER_ROLES } from "./auth.constants";

export const loginSchema = z.object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: z.string().min(1, "Password is required."),
});

export const registerSchema = z.object({
    firstName: z.string().trim().min(1, "First name is required."),
    lastName: z.string().trim().min(1, "Last name is required."),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters long.")
        .max(128, "Password is too long."),
    role: z.enum(USER_ROLES),
    callbackURL: z.string().trim().url().optional(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters long.")
        .max(128, "Password is too long."),
});

export const resetPasswordSchema = z.object({
    token: z.string().trim().min(1, "Reset token is required."),
    newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters long.")
        .max(128, "Password is too long."),
});

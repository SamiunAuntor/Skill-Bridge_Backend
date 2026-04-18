import type { AppUserRole } from "./auth.constants";

export type AuthUser = {
    id: string;
    role: AppUserRole;
    email: string;
    name: string;
    emailVerified: boolean;
    image: string | null;
};

export type AuthSessionResponse = {
    user: AuthUser;
};

export type LoginInput = {
    email: string;
    password: string;
};

export type RegisterInput = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: AppUserRole;
    callbackURL?: string | undefined;
};

export type ChangePasswordInput = {
    currentPassword: string;
    newPassword: string;
};

export type ResetPasswordInput = {
    token: string;
    newPassword: string;
};

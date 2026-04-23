import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/controller/async-handler";
import { requireAuthUser, sendSuccess } from "../../shared/controller/controller.utils";
import { validateRequest } from "../../shared/validation/validate-request";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../utils/http-error";
import {
    changePassword,
    getCurrentSession,
    login,
    logout,
    logoutAll,
    refreshAuth,
    register,
    resetPassword,
} from "./auth.service";
import {
    changePasswordSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
} from "./auth.validation";

export const registerController = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const payload = validateRequest(registerSchema, req.body);
        const result = await register(payload, req);
        sendSuccess(
            res,
            "Account created successfully. Please verify your email before signing in.",
            result,
            201
        );
    }
);

export const loginController = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const payload = validateRequest(loginSchema, req.body);
        const result = await login(payload, req, res);
        sendSuccess(res, "Signed in successfully.", result);
    }
);

export const getCurrentSessionController = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const result = await getCurrentSession(req, res);

        if (!result) {
            throw new HttpError(401, "Please sign in to continue.");
        }

        sendSuccess(res, "Auth session fetched successfully.", result);
    }
);

export const refreshController = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const result = await refreshAuth(req, res);
        sendSuccess(res, "Auth session refreshed successfully.", result);
    }
);

export const logoutController = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        await logout(req, res);
        sendSuccess(res, "Signed out successfully.", null);
    }
);

export const logoutAllController = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const authUser = requireAuthUser(req);
        await logoutAll(authUser.id, req, res);
        sendSuccess(res, "Signed out from all devices successfully.", null);
    }
);

export const changePasswordController = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const authUser = requireAuthUser(req);
        const payload = validateRequest(changePasswordSchema, req.body);
        await changePassword(authUser.id, payload, req, res);
        sendSuccess(
            res,
            "Password updated successfully. Please sign in again.",
            null
        );
    }
);

export const resetPasswordController = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const payload = validateRequest(resetPasswordSchema, req.body);
        await resetPassword(payload, res);
        sendSuccess(
            res,
            "Password updated successfully. Please sign in again.",
            null
        );
    }
);

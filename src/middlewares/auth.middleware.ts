import type { NextFunction, Request, Response } from "express";
import type { AppUserRole } from "../modules/auth/auth.constants";
import { authenticateRequest } from "../modules/auth/auth.service";
import { HttpError } from "../utils/http-error";

export interface AuthenticatedRequest extends Request {
    authUser?: {
        id: string;
        role: AppUserRole;
        email: string;
        name: string;
        emailVerified: boolean;
        image: string | null;
    };
}

export async function requireAuth(
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authUser = await authenticateRequest(req, _res);

        if (!authUser) {
            throw new HttpError(401, "Unauthorized");
        }

        req.authUser = authUser;
        next();
    } catch (error) {
        next(error);
    }
}

export function requireRole(...allowedRoles: AppUserRole[]) {
    return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        if (!req.authUser) {
            next(new HttpError(401, "Unauthorized"));
            return;
        }

        if (!allowedRoles.includes(req.authUser.role)) {
            next(new HttpError(403, "Forbidden"));
            return;
        }

        next();
    };
}

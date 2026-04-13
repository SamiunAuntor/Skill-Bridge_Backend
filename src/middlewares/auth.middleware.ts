import { Request, Response, NextFunction } from "express";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "../config/prisma.config";
import type { AppUserRole } from "../auth/auth.constants";

export interface AuthenticatedRequest extends Request {
    authUser?: {
        id: string;
        role: AppUserRole;
        email: string;
        name: string;
        emailVerified: boolean;
    };
}

export async function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    const sessionToken = getSessionCookie(
        {
            headers: {
                get(name: string) {
                    return name.toLowerCase() === "cookie"
                        ? req.headers.cookie ?? null
                        : null;
                },
            },
        } as any
    );

    if (!sessionToken) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const authSession = await prisma.authSession.findUnique({
        where: { token: sessionToken },
        include: { user: true },
    });

    if (
        !authSession ||
        !authSession.user ||
        authSession.expiresAt <= new Date()
    ) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    if (authSession.user.isBanned) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }

    req.authUser = {
        id: authSession.user.id,
        role: authSession.user.role,
        email: authSession.user.email,
        name: authSession.user.name,
        emailVerified: authSession.user.emailVerified,
    };

    next();
}

export function requireRole(...allowedRoles: AppUserRole[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.authUser) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!allowedRoles.includes(req.authUser.role)) {
            res.status(403).json({ message: "Forbidden" });
            return;
        }

        next();
    };
}

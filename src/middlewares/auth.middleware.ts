import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth/auth";
import type { AppUserRole } from "../auth/auth.constants";
import { prisma } from "../config/prisma.config";

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
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const user = await prisma.user.findUnique({
        where: {
            id: session.user.id,
        },
        select: {
            isBanned: true,
        },
    });

    if (!user || user.isBanned) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }

    req.authUser = {
        id: session.user.id,
        role: session.user.role as AppUserRole,
        email: session.user.email,
        name: session.user.name,
        emailVerified: session.user.emailVerified,
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

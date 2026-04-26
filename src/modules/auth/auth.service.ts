import type { Request, Response as ExpressResponse } from "express";
import { APIError } from "@better-auth/core/error";
import { prisma } from "../../config/prisma.config";
import { env } from "../../config/env";
import { auth } from "./auth.core";
import { HttpError } from "../../utils/http-error";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import {
    appendSetCookieHeader,
    clearAuthCookies,
    parseCookies,
    setAccessTokenCookie,
    setRefreshTokenCookie,
} from "./auth.cookies";
import {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
} from "./auth.jwt";
import type {
    AuthSessionResponse,
    AuthUser,
    ChangePasswordInput,
    LoginInput,
    RegisterInput,
    ResetPasswordInput,
} from "./auth.types";

function getBetterAuthHeaders(req: Request): HeadersInit {
    return req.headers as unknown as HeadersInit;
}

function toAuthUser(input: {
    id: string;
    role: AuthUser["role"];
    email: string;
    name: string;
    emailVerified: boolean;
    image: string | null;
}): AuthUser {
    return {
        id: input.id,
        role: input.role,
        email: input.email,
        name: input.name,
        emailVerified: input.emailVerified,
        image: input.image,
    };
}

async function getActiveUserByEmail(email: string) {
    return prisma.user.findFirst({
        where: {
            email,
            deletedAt: null,
        },
        select: {
            id: true,
            role: true,
            email: true,
            name: true,
            emailVerified: true,
            image: true,
            isBanned: true,
        },
    });
}

async function getValidSessionByToken(sessionToken: string) {
    const session = await prisma.authSession.findUnique({
        where: {
            token: sessionToken,
        },
        include: {
            user: {
                select: {
                    id: true,
                    role: true,
                    email: true,
                    name: true,
                    emailVerified: true,
                    image: true,
                    isBanned: true,
                    deletedAt: true,
                },
            },
        },
    });

    if (!session || session.expiresAt <= new Date()) {
        return null;
    }

    if (!session.user || session.user.deletedAt || session.user.isBanned) {
        throw new HttpError(
            403,
            "This account has been restricted. Please contact the platform authority."
        );
    }

    return session;
}

function ensureAllowedToAuthenticate(
    user: Awaited<ReturnType<typeof getActiveUserByEmail>>
) {
    if (!user) {
        throw new HttpError(401, "Invalid email or password.");
    }

    if (user.isBanned) {
        throw new HttpError(
            403,
            "This account has been restricted. Please contact the platform authority."
        );
    }

    return user;
}

async function issueAuthCookies(
    res: ExpressResponse,
    user: NonNullable<Awaited<ReturnType<typeof getActiveUserByEmail>>>,
    sessionToken: string
): Promise<void> {
    const accessToken = await signAccessToken({
        userId: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        image: user.image ?? null,
        sessionToken,
    });

    const refreshToken = await signRefreshToken({
        userId: user.id,
        sessionToken,
    });

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);
}

async function deleteAllUserSessions(userId: string): Promise<void> {
    await prisma.authSession.deleteMany({
        where: {
            userId,
        },
    });
}

async function rotateFromRefreshToken(
    req: Request,
    res: ExpressResponse,
    refreshTokenValue: string
) {
    let payload;

    try {
        payload = await verifyRefreshToken(refreshTokenValue);
    } catch {
        throw new HttpError(401, "Your session has expired. Please sign in again.");
    }

    const session = await getValidSessionByToken(payload.sessionToken);

    if (!session || session.userId !== payload.sub) {
        throw new HttpError(401, "Your session has expired. Please sign in again.");
    }

    const user = ensureAllowedToAuthenticate(await getActiveUserByEmail(session.user.email));
    await issueAuthCookies(res, user, session.token);

    return user;
}

async function signOutBetterAuthSession(
    req: Request,
    res: ExpressResponse
): Promise<void> {
    try {
        const signOutResponse = await auth.api.signOut({
            headers: getBetterAuthHeaders(req),
            asResponse: true,
        });

        appendSetCookieHeader(res, signOutResponse.headers.get("set-cookie"));
    } catch {
        // Ignore when Better Auth has no active cookie/session to clear.
    }
}

async function resolveSessionTokenFromRequest(req: Request): Promise<string | null> {
    const cookies = parseCookies(req);
    const accessToken = cookies[env.ACCESS_TOKEN_COOKIE_NAME];
    const refreshToken = cookies[env.REFRESH_TOKEN_COOKIE_NAME];

    if (accessToken) {
        try {
            const payload = await verifyAccessToken(accessToken);
            return payload.sessionToken;
        } catch {
            // Ignore invalid access token during logout-like flows.
        }
    }

    if (refreshToken) {
        try {
            const payload = await verifyRefreshToken(refreshToken);
            return payload.sessionToken;
        } catch {
            // Ignore invalid refresh token during logout-like flows.
        }
    }

    return null;
}

export async function register(
    input: RegisterInput,
    req: Request
): Promise<{ email: string }> {
    const existingUser = await prisma.user.findUnique({
        where: {
            email: input.email,
        },
        select: {
            id: true,
            deletedAt: true,
        },
    });

    if (existingUser) {
        throw new HttpError(
            409,
            existingUser.deletedAt
                ? "An account with this email already exists and cannot be registered again."
                : "An account with this email already exists."
        );
    }

    try {
        await auth.api.signUpEmail({
            body: {
                name: `${input.firstName} ${input.lastName}`.trim(),
                email: input.email,
                password: input.password,
                role: input.role,
                ...(input.callbackURL ? { callbackURL: input.callbackURL } : {}),
            },
            headers: getBetterAuthHeaders(req),
        });
    } catch (error) {
        if (error instanceof APIError) {
            throw new HttpError(error.statusCode ?? 400, error.message);
        }

        throw error;
    }

    return {
        email: input.email,
    };
}

export async function login(
    input: LoginInput,
    req: Request,
    res: ExpressResponse
): Promise<AuthSessionResponse> {
    ensureAllowedToAuthenticate(await getActiveUserByEmail(input.email));

    let response: globalThis.Response;

    try {
        response = await auth.api.signInEmail({
            body: {
                email: input.email,
                password: input.password,
                rememberMe: false,
            },
            headers: getBetterAuthHeaders(req),
            asResponse: true,
        });
    } catch (error) {
        if (error instanceof APIError) {
            throw new HttpError(error.statusCode ?? 400, error.message);
        }

        throw error;
    }

    const responsePayload = (await response
        .json()
        .catch(() => ({ message: "Invalid email or password." }))) as {
        message?: string;
        token?: string | null;
    };

    if (!response.ok || !responsePayload.token) {
        throw new HttpError(
            response.status,
            responsePayload.message || "Invalid email or password."
        );
    }

    appendSetCookieHeader(res, response.headers.get("set-cookie"));

    const session = await getValidSessionByToken(responsePayload.token);

    if (!session) {
        throw new HttpError(401, "Unable to create a valid session right now.");
    }

    const user = ensureAllowedToAuthenticate(await getActiveUserByEmail(session.user.email));
    await issueAuthCookies(res, user, session.token);

    return {
        user: toAuthUser({
            id: user.id,
            role: user.role,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
            image: user.image ?? null,
        }),
    };
}

export async function authenticateRequest(
    req: AuthenticatedRequest,
    res: ExpressResponse
): Promise<AuthUser | null> {
    const cookies = parseCookies(req);
    const bearerHeader = req.headers.authorization;
    const bearerToken =
        typeof bearerHeader === "string" && bearerHeader.startsWith("Bearer ")
            ? bearerHeader.slice(7)
            : null;
    const accessToken =
        bearerToken || cookies[env.ACCESS_TOKEN_COOKIE_NAME] || null;

    if (accessToken) {
        try {
            const payload = await verifyAccessToken(accessToken);
            const session = await getValidSessionByToken(payload.sessionToken);

            if (session && session.userId === payload.sub) {
                return toAuthUser({
                    id: session.user.id,
                    role: session.user.role,
                    email: session.user.email,
                    name: session.user.name,
                    emailVerified: session.user.emailVerified,
                    image: session.user.image ?? null,
                });
            }
        } catch (error) {
            if (error instanceof HttpError && error.statusCode === 403) {
                throw error;
            }
        }
    }

    const refreshToken = cookies[env.REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken) {
        return null;
    }

    const user = await rotateFromRefreshToken(req, res, refreshToken);

    return {
        user: toAuthUser({
            id: user.id,
            role: user.role,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
            image: user.image ?? null,
        }),
    }.user;
}

export async function getCurrentSession(
    req: AuthenticatedRequest,
    res: ExpressResponse
): Promise<AuthSessionResponse | null> {
    const user = await authenticateRequest(req, res);

    if (!user) {
        return null;
    }

    return { user };
}

export async function refreshAuth(
    req: Request,
    res: ExpressResponse
): Promise<AuthSessionResponse> {
    const cookies = parseCookies(req);
    const refreshToken = cookies[env.REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken) {
        throw new HttpError(401, "Your session has expired. Please sign in again.");
    }

    const user = await rotateFromRefreshToken(req, res, refreshToken);

    return {
        user: toAuthUser({
            id: user.id,
            role: user.role,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
            image: user.image ?? null,
        }),
    };
}

export async function logout(req: Request, res: ExpressResponse): Promise<void> {
    const sessionToken = await resolveSessionTokenFromRequest(req);

    if (sessionToken) {
        await prisma.authSession.deleteMany({
            where: {
                token: sessionToken,
            },
        });
    }

    clearAuthCookies(res);
    await signOutBetterAuthSession(req, res);
}

export async function logoutAll(
    userId: string,
    req: Request,
    res: ExpressResponse
): Promise<void> {
    await deleteAllUserSessions(userId);
    clearAuthCookies(res);
    await signOutBetterAuthSession(req, res);
}

export async function changePassword(
    userId: string,
    input: ChangePasswordInput,
    req: Request,
    res: ExpressResponse
): Promise<void> {
    try {
        const response = await auth.api.changePassword({
            body: {
                currentPassword: input.currentPassword,
                newPassword: input.newPassword,
                revokeOtherSessions: true,
            },
            headers: getBetterAuthHeaders(req),
            asResponse: true,
        });

        if (!response.ok) {
            const payload = (await response
                .json()
                .catch(() => ({ message: "Unable to change password." }))) as {
                message?: string;
            };
            throw new HttpError(
                response.status,
                payload.message || "Unable to change password."
            );
        }
    } catch (error) {
        if (error instanceof APIError) {
            throw new HttpError(error.statusCode ?? 400, error.message);
        }

        throw error;
    }

    await deleteAllUserSessions(userId);
    clearAuthCookies(res);
}

export async function resetPassword(
    input: ResetPasswordInput,
    res: ExpressResponse
): Promise<void> {
    const verification = await prisma.verification.findFirst({
        where: {
            value: input.token,
        },
        select: {
            identifier: true,
        },
    });

    try {
        await auth.api.resetPassword({
            body: {
                token: input.token,
                newPassword: input.newPassword,
            },
        });
    } catch (error) {
        if (error instanceof APIError) {
            throw new HttpError(error.statusCode ?? 400, error.message);
        }

        throw error;
    }

    if (verification?.identifier) {
        const user = await prisma.user.findFirst({
            where: {
                email: verification.identifier,
            },
            select: {
                id: true,
            },
        });

        if (user) {
            await deleteAllUserSessions(user.id);
        }
    }

    clearAuthCookies(res);
}

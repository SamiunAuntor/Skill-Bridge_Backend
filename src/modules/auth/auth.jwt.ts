import { jwtVerify, SignJWT } from "jose";
import { env } from "../../config/env";
import type { AppUserRole } from "./auth.constants";

type AccessTokenPayload = {
    sub: string;
    role: AppUserRole;
    email: string;
    name: string;
    emailVerified: boolean;
    image: string | null;
    sessionToken: string;
    typ: "access";
};

type RefreshTokenPayload = {
    sub: string;
    sessionToken: string;
    typ: "refresh";
};

const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);

export async function signAccessToken(input: {
    userId: string;
    role: AppUserRole;
    email: string;
    name: string;
    emailVerified: boolean;
    image: string | null;
    sessionToken: string;
}): Promise<string> {
    return new SignJWT({
        role: input.role,
        email: input.email,
        name: input.name,
        emailVerified: input.emailVerified,
        image: input.image,
        sessionToken: input.sessionToken,
        typ: "access",
    } satisfies Omit<AccessTokenPayload, "sub">)
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(input.userId)
        .setIssuedAt()
        .setExpirationTime("1d")
        .sign(jwtSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const result = await jwtVerify(token, jwtSecret);
    const payload = result.payload;

    if (
        typeof payload.sub !== "string" ||
        typeof payload.role !== "string" ||
        typeof payload.email !== "string" ||
        typeof payload.name !== "string" ||
        typeof payload.emailVerified !== "boolean" ||
        typeof payload.sessionToken !== "string" ||
        payload.typ !== "access"
    ) {
        throw new Error("Invalid access token payload.");
    }

    return {
        sub: payload.sub,
        role: payload.role as AppUserRole,
        email: payload.email,
        name: payload.name,
        emailVerified: payload.emailVerified,
        image: typeof payload.image === "string" ? payload.image : null,
        sessionToken: payload.sessionToken,
        typ: "access",
    };
}

export async function signRefreshToken(input: {
    userId: string;
    sessionToken: string;
}): Promise<string> {
    return new SignJWT({
        sessionToken: input.sessionToken,
        typ: "refresh",
    } satisfies Omit<RefreshTokenPayload, "sub">)
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(input.userId)
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(jwtSecret);
}

export async function verifyRefreshToken(
    token: string
): Promise<RefreshTokenPayload> {
    const result = await jwtVerify(token, jwtSecret);
    const payload = result.payload;

    if (
        typeof payload.sub !== "string" ||
        typeof payload.sessionToken !== "string" ||
        payload.typ !== "refresh"
    ) {
        throw new Error("Invalid refresh token payload.");
    }

    return {
        sub: payload.sub,
        sessionToken: payload.sessionToken,
        typ: "refresh",
    };
}

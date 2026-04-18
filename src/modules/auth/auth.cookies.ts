import type { Request, Response } from "express";
import { env } from "../../config/env";

const isSecureCookie = process.env.NODE_ENV === "production";
const accessTokenMaxAge = 1000 * 60 * 60 * 24;
const refreshTokenMaxAge = 1000 * 60 * 60 * 24 * 7;

export function parseCookies(req: Request): Record<string, string> {
    const rawCookieHeader = req.headers.cookie;

    if (!rawCookieHeader) {
        return {};
    }

    return rawCookieHeader.split(";").reduce<Record<string, string>>(
        (accumulator, part) => {
            const separatorIndex = part.indexOf("=");
            if (separatorIndex < 0) {
                return accumulator;
            }

            const key = part.slice(0, separatorIndex).trim();
            const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());

            if (key) {
                accumulator[key] = value;
            }

            return accumulator;
        },
        {}
    );
}

export function setAccessTokenCookie(res: Response, token: string): void {
    res.cookie(env.ACCESS_TOKEN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: isSecureCookie,
        sameSite: "lax",
        path: "/",
        maxAge: accessTokenMaxAge,
    });
}

export function setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie(env.REFRESH_TOKEN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: isSecureCookie,
        sameSite: "lax",
        path: "/",
        maxAge: refreshTokenMaxAge,
    });
}

export function clearAuthCookies(res: Response): void {
    res.clearCookie(env.ACCESS_TOKEN_COOKIE_NAME, {
        httpOnly: true,
        secure: isSecureCookie,
        sameSite: "lax",
        path: "/",
    });

    res.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, {
        httpOnly: true,
        secure: isSecureCookie,
        sameSite: "lax",
        path: "/",
    });
}

export function appendSetCookieHeader(
    res: Response,
    setCookieHeader: string | null
): void {
    if (!setCookieHeader) {
        return;
    }

    res.append("set-cookie", setCookieHeader);
}

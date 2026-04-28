import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || "5000";
const defaultBackendUrl =
    process.env.NODE_ENV === "production"
        ? undefined
        : process.env.BACKEND_URL || `http://localhost:${port}`;
const defaultFrontendUrl =
    process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000";

function normalizeBetterAuthUrl(value: string): string {
    return value.replace(/\/$/, "").endsWith("/api/auth/core")
        ? value.replace(/\/$/, "")
        : `${value.replace(/\/$/, "")}/api/auth/core`;
}

function normalizeOrigin(value: string): string {
    return value.replace(/\/$/, "");
}

function requireEnv(name: string, fallback?: string): string {
    const value = process.env[name]?.trim() || fallback;

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

function normalizeMailService(value: string | undefined): "smtp" | "resend" {
    const normalized = value?.trim().toLowerCase();

    if (normalized === "resend") {
        return "resend";
    }

    if (normalized === "nodemailer" || normalized === "smtp" || !normalized) {
        return "smtp";
    }

    return "smtp";
}

/**
 * Nodemailer / SMTP — set these in `.env` to send verification & password-reset mail.
 * See `.env.example` for common providers (Gmail, SendGrid, Mailtrap).
 */
export const smtp = {
    /** e.g. `Gmail` — if set, Nodemailer uses built-in host/port for that provider */
    service: process.env.SMTP_SERVICE?.trim() || undefined,
    host: process.env.SMTP_HOST?.trim() || undefined,
    port: Number(process.env.SMTP_PORT || "587") || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER?.trim() || undefined,
    pass: process.env.SMTP_PASS || undefined,
    /** From address; defaults to SMTP_USER if omitted */
    from:
        process.env.SMTP_FROM?.trim() ||
        process.env.EMAIL_FROM?.trim() ||
        undefined,
    /** Set to `false` only for local/dev SMTP with self-signed certs (e.g. Mailpit) */
    tlsRejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false",
};

export function isSmtpConfigured(): boolean {
    const hasAuth = Boolean(smtp.user && smtp.pass);
    if (!hasAuth) return false;
    if (smtp.service) return true;
    return Boolean(smtp.host);
}

export const mail = {
    service: normalizeMailService(process.env.MAIL_SERVICE),
    resendApiKey: process.env.RESEND_API_KEY?.trim() || undefined,
    resendFrom:
        process.env.RESEND_FROM?.trim() ||
        process.env.EMAIL_FROM?.trim() ||
        undefined,
    resendReplyTo:
        process.env.RESEND_REPLY_TO?.trim() ||
        process.env.EMAIL_REPLY_TO?.trim() ||
        undefined,
};

export function isResendConfigured(): boolean {
    return Boolean(mail.resendApiKey && mail.resendFrom);
}

export function isMailConfigured(): boolean {
    if (mail.service === "resend") {
        return isResendConfigured();
    }

    return isSmtpConfigured();
}

export const env = {
    PORT: Number(port) || 5000,
    AUTH_SECRET: process.env.AUTH_SECRET,
    BACKEND_URL: normalizeOrigin(requireEnv("BACKEND_URL", defaultBackendUrl)),
    FRONTEND_URL: normalizeOrigin(
        requireEnv("FRONTEND_URL", defaultFrontendUrl)
    ),
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: requireEnv(
        "BETTER_AUTH_SECRET",
        process.env.NODE_ENV === "production"
            ? undefined
            : "dev-only-better-auth-secret-min-32-chars!"
    ),
    BETTER_AUTH_URL: normalizeBetterAuthUrl(
        requireEnv("BETTER_AUTH_URL", defaultBackendUrl)
    ),
    JWT_SECRET: requireEnv(
        "JWT_SECRET",
        process.env.NODE_ENV === "production"
            ? undefined
            : "dev-only-jwt-secret-min-32-chars!"
    ),
    ACCESS_TOKEN_COOKIE_NAME:
        process.env.ACCESS_TOKEN_COOKIE_NAME || "skillbridge_access_token",
    REFRESH_TOKEN_COOKIE_NAME:
        process.env.REFRESH_TOKEN_COOKIE_NAME || "skillbridge_refresh_token",
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    ZOOM_ACCOUNT_ID: process.env.ZOOM_ACCOUNT_ID,
    ZOOM_CLIENT_ID: process.env.ZOOM_CLIENT_ID,
    ZOOM_CLIENT_SECRET: process.env.ZOOM_CLIENT_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY?.trim() || undefined,
    STRIPE_WEBHOOK_SECRET:
        process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined,
    STRIPE_PUBLISHABLE_KEY:
        process.env.STRIPE_PUBLISHABLE_KEY?.trim() || undefined,
    PAYMENT_CURRENCY:
        process.env.PAYMENT_CURRENCY?.trim().toLowerCase() || "usd",
    MAIL_SERVICE: mail.service,
    RESEND_API_KEY: mail.resendApiKey,
    RESEND_FROM: mail.resendFrom,
    RESEND_REPLY_TO: mail.resendReplyTo,
};

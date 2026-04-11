import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || "5000";

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

export const env = {
    PORT: Number(port) || 5000,
    AUTH_SECRET: process.env.AUTH_SECRET,
    BACKEND_URL: process.env.BACKEND_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ??
        (process.env.NODE_ENV === "production"
            ? undefined
            : "dev-only-better-auth-secret-min-32-chars!"),
    BETTER_AUTH_URL:
        process.env.BETTER_AUTH_URL ||
        process.env.BACKEND_URL ||
        `http://localhost:${port}`,
};
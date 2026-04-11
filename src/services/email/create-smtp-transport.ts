import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { isSmtpConfigured, smtp } from "../../config/env";

/**
 * Builds a Nodemailer transport from `env.smtp`. Returns `null` if SMTP is not configured.
 */
export function createSmtpTransport(): nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null {
    if (!isSmtpConfigured()) return null;
    if (!smtp.user || !smtp.pass) return null;

    if (smtp.service) {
        return nodemailer.createTransport({
            service: smtp.service,
            auth: {
                user: smtp.user,
                pass: smtp.pass,
            },
        });
    }

    if (!smtp.host) return null;

    return nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
            user: smtp.user,
            pass: smtp.pass,
        },
        tls: {
            rejectUnauthorized: smtp.tlsRejectUnauthorized,
        },
    });
}

export function getDefaultFromAddress(): string | undefined {
    return smtp.from?.trim() || smtp.user?.trim();
}

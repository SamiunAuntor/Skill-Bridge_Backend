import { isMailConfigured, mail } from "../../config/env";
import { createSmtpTransport, getDefaultFromAddress } from "./create-smtp-transport";
import { sendViaResend } from "./send-via-resend";
import type { SendEmailPayload } from "./types";

function formatDevLog(payload: SendEmailPayload): string {
    const ctx = payload.context ? ` [${payload.context}]` : "";
    const to = Array.isArray(payload.to) ? payload.to.join(", ") : payload.to;
    return `\n======== SkillBridge mail${ctx} [not sent — SMTP not configured] ========\nTo: ${to}\nSubject: ${payload.subject}\n\n${payload.text}\n${payload.html ? `\n--- HTML ---\n${payload.html}\n` : ""}========================================\n`;
}

/**
 * Sends one email via SMTP when configured; otherwise logs content in development
 * or warns in production. Use for any feature (auth, notifications, reports).
 */
export async function sendMail(payload: SendEmailPayload): Promise<void> {
    if (mail.service === "resend") {
        await sendViaResend(payload);
        return;
    }

    const transport = createSmtpTransport();
    const from = payload.from?.trim() || getDefaultFromAddress();

    if (transport && from) {
        await transport.sendMail({
            from,
            to: payload.to,
            cc: payload.cc,
            bcc: payload.bcc,
            replyTo: payload.replyTo,
            subject: payload.subject,
            text: payload.text,
            html: payload.html,
        });
        return;
    }

    if (process.env.NODE_ENV !== "production") {
        console.info(formatDevLog(payload));
        console.info(
            "Set SMTP_USER, SMTP_PASS, and SMTP_SERVICE or SMTP_HOST (see .env.example)."
        );
        return;
    }

    const to = Array.isArray(payload.to) ? payload.to.join(", ") : payload.to;
    console.warn(
        `[mail] SMTP not configured; message not sent. context=${payload.context ?? "none"} to=${to} subject=${payload.subject}`
    );
}

/**
 * Fire-and-forget send (matches Better Auth guidance to avoid awaiting in auth hooks).
 * Errors are logged; they do not propagate.
 */
export function sendMailQueued(payload: SendEmailPayload): void {
    void sendMail(payload).catch((err) => {
        console.error(
            `[mail] Send failed${payload.context ? ` (${payload.context})` : ""}:`,
            err
        );
    });
}

/** True when env has enough SMTP settings to attempt real delivery. */
export { isMailConfigured } from "../../config/env";

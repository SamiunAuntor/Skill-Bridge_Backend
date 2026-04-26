import { Resend } from "resend";
import type { CreateEmailOptions } from "resend";
import { isResendConfigured, mail } from "../../config/env";
import type { SendEmailPayload } from "./types";

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
    if (!isResendConfigured() || !mail.resendApiKey) {
        return null;
    }

    if (!resendClient) {
        resendClient = new Resend(mail.resendApiKey);
    }

    return resendClient;
}

export async function sendViaResend(payload: SendEmailPayload): Promise<void> {
    const client = getResendClient();
    const from = payload.from?.trim() || mail.resendFrom;

    if (!client || !from) {
        throw new Error("Resend is not configured.");
    }

    const emailPayload: CreateEmailOptions = {
        from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
    };

    if (payload.cc) {
        emailPayload.cc = payload.cc;
    }

    if (payload.bcc) {
        emailPayload.bcc = payload.bcc;
    }

    if (payload.html) {
        emailPayload.html = payload.html;
    }

    const replyTo = payload.replyTo?.trim() || mail.resendReplyTo;
    if (replyTo) {
        emailPayload.replyTo = replyTo;
    }

    await client.emails.send(emailPayload);
}

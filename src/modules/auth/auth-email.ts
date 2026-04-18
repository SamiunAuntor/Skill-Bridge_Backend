import { sendMailQueued } from "../../services/email";
import { buildAuthEmail, type AuthEmailKind } from "./auth-email-templates";

export type { AuthEmailKind } from "./auth-email-templates";

export function sendAuthEmail(
    kind: AuthEmailKind,
    to: string,
    actionUrl: string,
    displayName?: string | null
): void {
    const { subject, text, html } = buildAuthEmail(kind, actionUrl, displayName);
    sendMailQueued({
        to,
        subject,
        text,
        html,
        context: `auth:${kind}`,
    });
}

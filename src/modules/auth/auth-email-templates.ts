import {
    escapeHtml,
    renderEmailLayout,
} from "../../services/email/email-template";

export type AuthEmailKind = "verification" | "password_reset";

const brandName = "SkillBridge";

export function buildAuthEmail(
    kind: AuthEmailKind,
    actionUrl: string,
    displayName?: string | null
): { subject: string; text: string; html: string } {
    const cleaned = (displayName ?? "")
        .trim()
        .replace(/[\r\n\u0000]+/g, " ");
    const first = cleaned.split(/\s+/).filter(Boolean)[0] || "there";
    const safeFirst = escapeHtml(first);

    if (kind === "verification") {
        const subject = `Verify your ${brandName} email`;
        const text = `Hi ${first},\n\nOpen this link to verify your email address:\n${actionUrl}\n\nAfter verifying, you can sign in to ${brandName}.\n\nIf you did not create an account, you can ignore this message.`;
        const html = renderEmailLayout({
            preheader: "Verify your email",
            title: "Verify your email",
            greeting: `Hi ${safeFirst},`,
            intro: `Please confirm your email address to finish setting up your ${escapeHtml(brandName)} account.`,
            bodyBlocks: [
                `This quick step helps us keep your account secure and makes sure we can send you important session and account updates.`,
            ],
            ctaLabel: "Verify email",
            ctaUrl: actionUrl,
            footerNote: `If you did not sign up for ${brandName}, you can safely ignore this email.`,
        });
        return { subject, text, html };
    }

    const subject = `Reset your ${brandName} password`;
    const text = `Hi ${first},\n\nWe received a request to reset your password. Open this link:\n${actionUrl}\n\nIf you did not request this, you can ignore this email.\n`;
    const html = renderEmailLayout({
        preheader: "Reset your password",
        title: "Reset your password",
        greeting: `Hi ${safeFirst},`,
        intro: `We received a request to reset your ${escapeHtml(brandName)} password.`,
        bodyBlocks: [
            `Use the button below to choose a new password. This link expires after a while for your security.`,
        ],
        ctaLabel: "Reset password",
        ctaUrl: actionUrl,
        footerNote: `If you did not request a password reset, you can ignore this email. Your password will stay the same.`,
    });
    return { subject, text, html };
}

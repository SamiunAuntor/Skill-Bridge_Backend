export type AuthEmailKind = "verification" | "password_reset";

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

const brandName = "SkillBridge";
const primary = "#003358";
const secondary = "#006b5c";
const muted = "#42474f";
const surface = "#f6fafe";
const cardBg = "#ffffff";

function layoutCard(params: {
    title: string;
    greeting: string;
    body: string;
    buttonLabel: string;
    buttonUrl: string;
    footerNote: string;
}): string {
    const { title, greeting, body, buttonLabel, buttonUrl, footerNote } = params;
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${surface};font-family:Georgia,'Times New Roman',serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${surface};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:${cardBg};border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,51,88,0.08);border:1px solid #e4e9ed;">
          <tr>
            <td style="padding:28px 32px 8px 32px;background:linear-gradient(135deg,${primary} 0%,${secondary} 100%);">
              <p style="margin:0;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.85);">${escapeHtml(brandName)}</p>
              <h1 style="margin:12px 0 0 0;font-size:22px;line-height:1.25;color:#ffffff;font-weight:700;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px 32px;">
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:${muted};">${greeting}</p>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.65;color:${muted};">${body}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="border-radius:10px;background:${primary};">
                    <a href="${escapeHtml(buttonUrl)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(buttonLabel)}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#727780;word-break:break-all;">If the button does not work, copy and paste this link into your browser:<br><a href="${escapeHtml(buttonUrl)}" style="color:${secondary};">${escapeHtml(buttonUrl)}</a></p>
              <hr style="margin:24px 0;border:none;border-top:1px solid #e4e9ed;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9aa0a6;">${footerNote}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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
        const html = layoutCard({
            title: "Verify your email",
            greeting: `Hi ${safeFirst},`,
            body: `Please confirm your email address to finish setting up your ${escapeHtml(brandName)} account. This helps us keep your account secure.`,
            buttonLabel: "Verify email",
            buttonUrl: actionUrl,
            footerNote: `If you did not sign up for ${brandName}, you can safely ignore this email.`,
        });
        return { subject, text, html };
    }

    const subject = `Reset your ${brandName} password`;
    const text = `Hi ${first},\n\nWe received a request to reset your password. Open this link:\n${actionUrl}\n\nIf you did not request this, you can ignore this email.\n`;
    const html = layoutCard({
        title: "Reset your password",
        greeting: `Hi ${safeFirst},`,
        body: `We received a request to reset your ${escapeHtml(brandName)} password. Click the button below to choose a new password. This link will expire after a while for your security.`,
        buttonLabel: "Reset password",
        buttonUrl: actionUrl,
        footerNote: `If you did not request a password reset, you can ignore this email. Your password will stay the same.`,
    });
    return { subject, text, html };
}

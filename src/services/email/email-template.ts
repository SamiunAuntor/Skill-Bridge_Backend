const brandName = "SkillBridge";
const pageBg = "#eef4fb";
const cardBg = "#ffffff";
const headerBg = "#1d3b66";
const headerAccent = "#2e537e";
const primaryText = "#153051";
const secondaryText = "#506176";
const mutedText = "#7a8797";
const surfaceBg = "#f6f9fc";
const borderColor = "#d8e3f0";
const buttonBg = "#1d3b66";
const buttonText = "#ffffff";
const linkColor = "#1f6f66";

export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function renderEmailDetailRows(
    rows: Array<{ label: string; value: string }>
): string {
    if (rows.length === 0) {
        return "";
    }

    const content = rows
        .map(
            (row) => `
                <tr>
                  <td style="padding:10px 0 10px 0;vertical-align:top;border-bottom:1px solid ${borderColor};width:38%;">
                    <div style="font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${mutedText};">
                      ${escapeHtml(row.label)}
                    </div>
                  </td>
                  <td style="padding:10px 0 10px 14px;vertical-align:top;border-bottom:1px solid ${borderColor};">
                    <div style="font-size:14px;line-height:1.5;color:${primaryText};font-weight:700;">
                      ${escapeHtml(row.value)}
                    </div>
                  </td>
                </tr>
            `
        )
        .join("");

    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid ${borderColor};border-radius:16px;overflow:hidden;background:${surfaceBg};">
        <tbody>${content}</tbody>
      </table>
    `;
}

export function renderEmailLayout(params: {
    preheader: string;
    title: string;
    greeting?: string;
    intro: string;
    bodyBlocks?: string[];
    detailRowsHtml?: string;
    ctaLabel?: string;
    ctaUrl?: string | null;
    footerNote?: string;
}) {
    const greetingHtml = params.greeting
        ? `<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:${primaryText};">${params.greeting}</p>`
        : "";

    const bodyHtml = (params.bodyBlocks ?? [])
        .map(
            (block) => `
              <p style="margin:0 0 14px 0;font-size:14px;line-height:1.68;color:${secondaryText};">
                ${block}
              </p>
            `
        )
        .join("");

    const detailsHtml = params.detailRowsHtml
        ? `<div style="margin-top:20px;">${params.detailRowsHtml}</div>`
        : "";

    const ctaHtml =
        params.ctaLabel && params.ctaUrl
            ? `
              <div style="margin-top:28px;">
                <a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;background:${buttonBg};color:${buttonText};text-decoration:none;font-weight:800;font-size:14px;padding:12px 18px;border-radius:12px;">
                  ${escapeHtml(params.ctaLabel)}
                </a>
              </div>
              <p style="margin:14px 0 0 0;font-size:11px;line-height:1.55;color:${mutedText};word-break:break-word;">
                If the button does not work, copy and paste this link into your browser:<br>
                <a href="${escapeHtml(params.ctaUrl)}" style="color:${linkColor};text-decoration:none;">${escapeHtml(params.ctaUrl)}</a>
              </p>
            `
            : "";

    const footerHtml = params.footerNote
        ? `
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid ${borderColor};">
            <p style="margin:0;font-size:11px;line-height:1.55;color:${mutedText};">
              ${params.footerNote}
            </p>
          </div>
        `
        : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background:${pageBg};font-family:Inter,Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${escapeHtml(params.preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${pageBg};padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:${cardBg};border-radius:24px;overflow:hidden;border:1px solid rgba(21,48,81,0.08);box-shadow:0 14px 36px rgba(21,48,81,0.08);">
          <tr>
            <td style="padding:22px 26px;background:linear-gradient(180deg, ${headerBg} 0%, ${headerAccent} 100%);">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.78);">
                ${escapeHtml(params.preheader)}
              </div>
              <div style="margin-top:12px;font-size:16px;font-weight:800;letter-spacing:0.02em;color:#ffffff;">
                ${escapeHtml(brandName)}
              </div>
              <h1 style="margin:14px 0 0 0;font-size:34px;line-height:1.08;font-weight:900;letter-spacing:-0.035em;color:#ffffff;">
                ${escapeHtml(params.title)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:26px;">
              ${greetingHtml}
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.68;color:${secondaryText};">
                ${params.intro}
              </p>
              ${bodyHtml}
              ${detailsHtml}
              ${ctaHtml}
              ${footerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return html;
}

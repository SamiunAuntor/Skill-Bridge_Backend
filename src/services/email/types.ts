export type SendEmailPayload = {
    /** Recipient(s) */
    to: string | string[];
    subject: string;
    /** Plain text body (always recommended for deliverability) */
    text: string;
    /** Optional HTML body */
    html?: string;
    /** Overrides default `SMTP_FROM` for this message */
    from?: string;
    replyTo?: string;
    cc?: string | string[];
    bcc?: string | string[];
    /**
     * For logs only when SMTP is disabled (dev console / production warning).
     * Example: `auth:verification`, `notifications:booking`
     */
    context?: string;
};

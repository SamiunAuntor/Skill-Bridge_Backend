export { sendMail, sendMailQueued, isMailConfigured } from "./mail.service";
export type { SendEmailPayload } from "./types";
export { createSmtpTransport, getDefaultFromAddress } from "./create-smtp-transport";

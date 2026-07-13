import app from "./app";
import { env } from "./config/env";
import { startNotificationCron } from "./jobs/notification.cron";
import { startPaymentCron } from "./jobs/payment.cron";
import { isMailConfigured } from "./services/email";
import { logger } from "./shared/utils/logger";

app.listen(env.PORT, () => {
    logger.info(`Server running on port http://localhost:${env.PORT}`);

    if (isMailConfigured()) {
        logger.info(
            "[mail] SMTP env looks configured - outbound email (auth + sendMail*) will use your provider."
        );
    } else {
        logger.warn(
            "[mail] SMTP not configured - emails use the configured development fallback. See .env.example."
        );
    }

    if (env.ENABLE_NOTIFICATION_CRON) {
        startNotificationCron();
        logger.info("[notification-cron] worker started.");
    } else {
        logger.warn(
            "[notification-cron] worker disabled. Set ENABLE_NOTIFICATION_CRON=true on a dedicated always-on runtime."
        );
    }

    if (env.ENABLE_PAYMENT_CRON) {
        startPaymentCron();
        logger.info("[payment-cron] worker started.");
    } else {
        logger.warn(
            "[payment-cron] worker disabled. Set ENABLE_PAYMENT_CRON=true on a dedicated always-on runtime."
        );
    }
});

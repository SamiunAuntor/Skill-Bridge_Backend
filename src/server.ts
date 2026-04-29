import app from "./app";
import { env } from "./config/env";
import { startNotificationCron } from "./jobs/notification.cron";
import { startPaymentCron } from "./jobs/payment.cron";
import { isMailConfigured } from "./services/email";

app.listen(env.PORT, () => {
    console.log(`Server running on port http://localhost:${env.PORT}`);

    if (isMailConfigured()) {
        console.log(
            "[mail] SMTP env looks configured - outbound email (auth + sendMail*) will use your provider."
        );
    } else {
        console.warn(
            "[mail] SMTP not configured - emails only print to this console. See .env.example."
        );
    }

    if (env.ENABLE_NOTIFICATION_CRON) {
        startNotificationCron();
        console.log("[notification-cron] worker started.");
    } else {
        console.warn(
            "[notification-cron] worker disabled. Set ENABLE_NOTIFICATION_CRON=true on a dedicated always-on runtime."
        );
    }

    if (env.ENABLE_PAYMENT_CRON) {
        startPaymentCron();
        console.log("[payment-cron] worker started.");
    } else {
        console.warn(
            "[payment-cron] worker disabled. Set ENABLE_PAYMENT_CRON=true on a dedicated always-on runtime."
        );
    }
});

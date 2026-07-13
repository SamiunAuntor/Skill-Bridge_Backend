import cron from "node-cron";
import {
    completeExpiredSessions,
    processPendingNotifications,
} from "../modules/notification/notification.service";
import { logger } from "../shared/utils/logger";

export function startNotificationCron(): void {
    let isRunning = false;

    const runScheduledJobs = async () => {
        if (isRunning) {
            return;
        }

        isRunning = true;

        try {
            const [processedNotifications, completedSessions] = await Promise.all([
                processPendingNotifications(),
                completeExpiredSessions(),
            ]);

            if (processedNotifications > 0 || completedSessions > 0) {
                logger.info(
                    `[notification-cron] notifications=${processedNotifications} completedSessions=${completedSessions}`
                );
            }
        } catch (error) {
            logger.error("[notification-cron] scheduled job run failed", error);
        } finally {
            isRunning = false;
        }
    };

    cron.schedule("*/5 * * * *", () => {
        void runScheduledJobs();
    });

    void runScheduledJobs();
}

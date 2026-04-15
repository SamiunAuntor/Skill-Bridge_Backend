import cron from "node-cron";
import {
    completeExpiredSessions,
    processPendingNotifications,
} from "../modules/notification/notification.service";

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
                console.log(
                    `[notification-cron] notifications=${processedNotifications} completedSessions=${completedSessions}`
                );
            }
        } catch (error) {
            console.error("[notification-cron] scheduled job run failed:", error);
        } finally {
            isRunning = false;
        }
    };

    cron.schedule("*/5 * * * *", () => {
        void runScheduledJobs();
    });

    void runScheduledJobs();
}

import cron from "node-cron";
import {
    cleanupInvalidUnpaidPaymentSessions,
    expireExpiredPaymentHolds,
} from "../modules/payment/payment-maintenance.service";
import { logger } from "../shared/utils/logger";

export function startPaymentCron(): void {
    let isRunning = false;

    const runPaymentMaintenance = async () => {
        if (isRunning) {
            return;
        }

        isRunning = true;

        try {
            const [expiredHolds, reconciledSessions] = await Promise.all([
                expireExpiredPaymentHolds(),
                cleanupInvalidUnpaidPaymentSessions(),
            ]);

            if (expiredHolds > 0 || reconciledSessions > 0) {
                logger.info(
                    `[payment-cron] expiredHolds=${expiredHolds} reconciledSessions=${reconciledSessions}`
                );
            }
        } catch (error) {
            logger.error("[payment-cron] scheduled job run failed", error);
        } finally {
            isRunning = false;
        }
    };

    cron.schedule("*/3 * * * *", () => {
        void runPaymentMaintenance();
    });

    void runPaymentMaintenance();
}

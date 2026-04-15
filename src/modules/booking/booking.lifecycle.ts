import { BookingStatus, SessionStatus } from "../../generated/prisma/client";
import { prisma } from "../../config/prisma.config";

function calculateDurationHours(startTime: Date, endTime: Date): number {
    return Math.max(
        0,
        Number(
            ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
        )
    );
}

export async function reconcileCompletedSessions(): Promise<number> {
    const now = new Date();

    const expiredBookings = await prisma.booking.findMany({
        where: {
            deletedAt: null,
            status: BookingStatus.confirmed,
            endTime: {
                lte: now,
            },
            session: {
                is: {
                    status: {
                        in: [SessionStatus.scheduled, SessionStatus.ongoing],
                    },
                },
            },
        },
        select: {
            id: true,
            startTime: true,
            endTime: true,
            session: {
                select: {
                    actualStartTime: true,
                },
            },
        },
    });

    if (expiredBookings.length === 0) {
        return 0;
    }

    await prisma.$transaction(
        async (tx) => {
            for (const booking of expiredBookings) {
                await tx.session.update({
                    where: {
                        bookingId: booking.id,
                    },
                    data: {
                        status: SessionStatus.completed,
                        actualStartTime: booking.session?.actualStartTime ?? booking.startTime,
                        actualEndTime: booking.endTime,
                        durationHours: calculateDurationHours(booking.startTime, booking.endTime),
                    },
                });

                await tx.booking.update({
                    where: {
                        id: booking.id,
                    },
                    data: {
                        status: BookingStatus.completed,
                        completedAt: now,
                    },
                });
            }
        },
        {
            maxWait: 10000,
            timeout: 20000,
        }
    );

    return expiredBookings.length;
}

export function startBookingLifecycleWorker(): void {
    const intervalMs = 60 * 1000;
    let isRunning = false;

    const tick = async () => {
        if (isRunning) {
            return;
        }

        isRunning = true;

        try {
            const completedCount = await reconcileCompletedSessions();

            if (completedCount > 0) {
                console.log(
                    `[booking-lifecycle] completed ${completedCount} expired session(s).`
                );
            }
        } catch (error) {
            console.error("[booking-lifecycle] reconcile failed:", error);
        } finally {
            isRunning = false;
        }
    };

    void tick();

    const handle = setInterval(() => {
        void tick();
    }, intervalMs);

    handle.unref();
}

import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { requireAuthUser, sendSuccess } from "../../shared/controller/controller.utils";
import {
    getMyNotifications,
    getMyUnreadNotificationCount,
    markAllMyNotificationsAsRead,
    markMyNotificationAsRead,
} from "./notification.service";

function toPositiveInt(value: unknown, fallback: number): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.floor(parsed);
}

export async function getMyNotificationsController(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const authUser = requireAuthUser(req);
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 10), 50);
    const status = req.query.status === "unread" ? "unread" : "all";

    const data = await getMyNotifications(authUser.id, {
        page,
        limit,
        status,
    });

    sendSuccess(res, "Notifications retrieved successfully.", data);
}

export async function getMyUnreadNotificationCountController(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const authUser = requireAuthUser(req);
    const data = await getMyUnreadNotificationCount(authUser.id);

    sendSuccess(res, "Unread notification count retrieved successfully.", data);
}

export async function markMyNotificationAsReadController(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const authUser = requireAuthUser(req);
    const notificationId = String(req.params.id || "").trim();
    const data = await markMyNotificationAsRead(authUser.id, notificationId);

    sendSuccess(res, "Notification marked as read.", data);
}

export async function markAllMyNotificationsAsReadController(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const authUser = requireAuthUser(req);
    const data = await markAllMyNotificationsAsRead(authUser.id);

    sendSuccess(res, "All notifications marked as read.", data);
}

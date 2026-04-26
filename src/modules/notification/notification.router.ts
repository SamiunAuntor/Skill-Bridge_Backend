import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import {
    getMyNotificationsController,
    getMyUnreadNotificationCountController,
    markAllMyNotificationsAsReadController,
    markMyNotificationAsReadController,
} from "./notification.controller";

const notificationRouter = Router();

notificationRouter.get("/me", requireAuth, getMyNotificationsController);
notificationRouter.get(
    "/me/unread-count",
    requireAuth,
    getMyUnreadNotificationCountController
);
notificationRouter.patch(
    "/me/read-all",
    requireAuth,
    markAllMyNotificationsAsReadController
);
notificationRouter.patch("/:id/read", requireAuth, markMyNotificationAsReadController);

export default notificationRouter;

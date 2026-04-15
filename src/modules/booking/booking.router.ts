import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import {
    cancelBookingController,
    createBookingController,
    getMySessionsController,
    getTutorDashboardSummaryController,
    joinSessionController,
} from "./booking.controller";

const bookingRouter = Router();

bookingRouter.get("/me/sessions", requireAuth, getMySessionsController);
bookingRouter.get(
    "/me/tutor-dashboard",
    requireAuth,
    requireRole("tutor"),
    getTutorDashboardSummaryController
);
bookingRouter.post("/", requireAuth, requireRole("student"), createBookingController);
bookingRouter.post(
    "/:bookingId/join",
    requireAuth,
    requireRole("student", "tutor"),
    joinSessionController
);
bookingRouter.patch(
    "/:bookingId/cancel",
    requireAuth,
    requireRole("student", "tutor"),
    cancelBookingController
);

export default bookingRouter;

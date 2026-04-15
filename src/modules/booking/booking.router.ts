import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import {
    cancelBookingController,
    createBookingController,
    getMySessionsController,
} from "./booking.controller";

const bookingRouter = Router();

bookingRouter.get("/me/sessions", requireAuth, getMySessionsController);
bookingRouter.post("/", requireAuth, requireRole("student"), createBookingController);
bookingRouter.patch(
    "/:bookingId/cancel",
    requireAuth,
    requireRole("student", "tutor"),
    cancelBookingController
);

export default bookingRouter;

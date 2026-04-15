import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { createBookingController } from "./booking.controller";

const bookingRouter = Router();

bookingRouter.post("/", requireAuth, requireRole("student"), createBookingController);

export default bookingRouter;

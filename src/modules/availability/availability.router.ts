import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import {
    createAvailabilitySlotController,
    deleteAvailabilitySlotController,
    getMyAvailabilityController,
    getPublicTutorAvailabilityController,
} from "./availability.controller";

const availabilityRouter = Router();

availabilityRouter.get(
    "/me",
    requireAuth,
    requireRole("tutor"),
    getMyAvailabilityController
);
availabilityRouter.post(
    "/me",
    requireAuth,
    requireRole("tutor"),
    createAvailabilitySlotController
);
availabilityRouter.delete(
    "/me/:slotId",
    requireAuth,
    requireRole("tutor"),
    deleteAvailabilitySlotController
);
availabilityRouter.get("/tutor/:tutorId", getPublicTutorAvailabilityController);

export default availabilityRouter;

import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import {
    getMyTutorProfileController,
    getTutorDetails,
    listTutors,
    updateMyTutorProfileController,
} from "./tutor.controller";

const tutorRouter = Router();

tutorRouter.get(
    "/profile",
    requireAuth,
    requireRole("tutor"),
    getMyTutorProfileController
);
tutorRouter.put(
    "/profile",
    requireAuth,
    requireRole("tutor"),
    updateMyTutorProfileController
);
tutorRouter.get("/", listTutors);
tutorRouter.get("/:id", getTutorDetails);

export default tutorRouter;

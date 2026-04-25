import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import {
    getMyTutorProfileController,
    listTutorCategoryOptionsController,
    getTutorDetailsController,
    listTutorSubjectOptionsController,
    listTutorsController,
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
tutorRouter.get("/categories", listTutorCategoryOptionsController);
tutorRouter.get("/subjects", listTutorSubjectOptionsController);
tutorRouter.get("/", listTutorsController);
tutorRouter.get("/:id", getTutorDetailsController);

export default tutorRouter;

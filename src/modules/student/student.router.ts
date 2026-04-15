import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { updateMyStudentProfileController } from "./student.controller";

const studentRouter = Router();

studentRouter.patch(
    "/me/profile",
    requireAuth,
    requireRole("student"),
    updateMyStudentProfileController
);

export default studentRouter;

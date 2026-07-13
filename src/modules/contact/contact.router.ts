import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import {
    getContactSubmissionsController,
    submitContactController,
    updateContactStatusController,
} from "./contact.controller";

export const contactPublicRouter = Router();
contactPublicRouter.post("/", submitContactController);

export const contactAdminRouter = Router();
contactAdminRouter.use(requireAuth, requireRole("admin"));
contactAdminRouter.get("/", getContactSubmissionsController);
contactAdminRouter.patch("/:id/status", updateContactStatusController);

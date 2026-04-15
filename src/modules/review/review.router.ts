import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { createReviewController } from "./review.controller";

const reviewRouter = Router();

reviewRouter.post("/", requireAuth, requireRole("student"), createReviewController);

export default reviewRouter;

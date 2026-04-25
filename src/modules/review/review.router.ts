import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import {
    createReviewController,
    getMyTutorReviewsController,
    getReviewByIdController,
    updateReviewController,
} from "./review.controller";

const reviewRouter = Router();

reviewRouter.post("/", requireAuth, requireRole("student"), createReviewController);
reviewRouter.get("/me/tutor", requireAuth, requireRole("tutor"), getMyTutorReviewsController);
reviewRouter.get("/:id", requireAuth, getReviewByIdController);
reviewRouter.patch("/:id", requireAuth, requireRole("student"), updateReviewController);

export default reviewRouter;

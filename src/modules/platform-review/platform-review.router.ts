import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import {
    getVisiblePlatformReviewsController,
    submitPlatformReviewController,
} from "./platform-review.controller";

const platformReviewRouter = Router();

platformReviewRouter.get("/", getVisiblePlatformReviewsController);
platformReviewRouter.post("/", requireAuth, submitPlatformReviewController);

export default platformReviewRouter;

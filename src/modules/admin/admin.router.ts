import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import {
    createAdminCategoryController,
    createAdminDegreeController,
    createAdminSubjectController,
    deleteAdminCategoryController,
    deleteAdminDegreeController,
    deleteAdminPlatformReviewController,
    deleteAdminSubjectController,
    getAdminBookingsController,
    getAdminCategoriesController,
    getAdminDashboardController,
    getAdminDegreesController,
    getAdminPlatformReviewsController,
    getAdminSubjectsController,
    getAdminUsersController,
    updateAdminCategoryController,
    updateAdminDegreeController,
    updateAdminPlatformReviewStatusController,
    updateAdminSubjectController,
    updateAdminUserStatusController,
} from "./admin.controller";

const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/dashboard", getAdminDashboardController);
adminRouter.get("/users", getAdminUsersController);
adminRouter.patch("/users/:id", updateAdminUserStatusController);
adminRouter.get("/bookings", getAdminBookingsController);

adminRouter.get("/categories", getAdminCategoriesController);
adminRouter.post("/categories", createAdminCategoryController);
adminRouter.patch("/categories/:id", updateAdminCategoryController);
adminRouter.delete("/categories/:id", deleteAdminCategoryController);

adminRouter.get("/subjects", getAdminSubjectsController);
adminRouter.post("/subjects", createAdminSubjectController);
adminRouter.patch("/subjects/:id", updateAdminSubjectController);
adminRouter.delete("/subjects/:id", deleteAdminSubjectController);

adminRouter.get("/degrees", getAdminDegreesController);
adminRouter.post("/degrees", createAdminDegreeController);
adminRouter.patch("/degrees/:id", updateAdminDegreeController);
adminRouter.delete("/degrees/:id", deleteAdminDegreeController);

adminRouter.get("/platform-reviews", getAdminPlatformReviewsController);
adminRouter.patch(
    "/platform-reviews/:id/status",
    updateAdminPlatformReviewStatusController
);
adminRouter.delete("/platform-reviews/:id", deleteAdminPlatformReviewController);

export default adminRouter;

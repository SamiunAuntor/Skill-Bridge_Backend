import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import {
    changePasswordController,
    getCurrentSessionController,
    loginController,
    logoutAllController,
    logoutController,
    refreshController,
    registerController,
    resetPasswordController,
} from "./auth.controller";

const authRouter = Router();

authRouter.post("/register", registerController);
authRouter.post("/login", loginController);
authRouter.get("/me", getCurrentSessionController);
authRouter.post("/refresh", refreshController);
authRouter.post("/logout", logoutController);
authRouter.post("/logout-all", requireAuth, logoutAllController);
authRouter.post("/change-password", requireAuth, changePasswordController);
authRouter.post("/reset-password", resetPasswordController);

export default authRouter;

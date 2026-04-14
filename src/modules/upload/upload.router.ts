import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { signImageUploadController } from "./upload.controller";

const uploadRouter = Router();

uploadRouter.post("/sign", requireAuth, signImageUploadController);

export default uploadRouter;

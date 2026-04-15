import { Router } from "express";
import { getLandingDataController } from "./public.controller";

const publicRouter = Router();

publicRouter.get("/landing", getLandingDataController);

export default publicRouter;

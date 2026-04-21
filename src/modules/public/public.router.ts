import { Router } from "express";
import {
    getLandingDataController,
    getPublicSubjectDetailsController,
    getPublicSubjectsController,
} from "./public.controller";

const publicRouter = Router();

publicRouter.get("/landing", getLandingDataController);
publicRouter.get("/subjects", getPublicSubjectsController);
publicRouter.get("/subjects/:slug", getPublicSubjectDetailsController);

export default publicRouter;

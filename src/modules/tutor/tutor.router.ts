import { Router } from "express";
import { getTutorDetails, listTutors } from "./tutor.controller";

const tutorRouter = Router();

tutorRouter.get("/", listTutors);
tutorRouter.get("/:id", getTutorDetails);

export default tutorRouter;

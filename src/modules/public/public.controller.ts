import { Request, Response } from "express";
import { asyncHandler } from "../../shared/controller/async-handler";
import { sendSuccess } from "../../shared/controller/controller.utils";
import { getLandingData, getPublicSubjectBySlug, getPublicSubjects } from "./public.services";

export const getLandingDataController = asyncHandler(async (
    _req: Request,
    res: Response
): Promise<void> => {
    const data = await getLandingData();
    sendSuccess(res, "Landing data fetched successfully.", data);
});

export const getPublicSubjectsController = asyncHandler(async (
    _req: Request,
    res: Response
): Promise<void> => {
    const data = await getPublicSubjects();
    sendSuccess(res, "Subjects fetched successfully.", data);
});

export const getPublicSubjectDetailsController = asyncHandler(async (
    req: Request,
    res: Response
): Promise<void> => {
    const slug =
        typeof req.params.slug === "string" ? req.params.slug : "";
    const data = await getPublicSubjectBySlug(slug);
    sendSuccess(res, "Subject details fetched successfully.", data);
});

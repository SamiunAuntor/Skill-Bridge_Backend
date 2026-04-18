import { Request, Response } from "express";
import { asyncHandler } from "../../shared/controller/async-handler";
import { sendSuccess } from "../../shared/controller/controller.utils";
import { getLandingData } from "./public.services";

export const getLandingDataController = asyncHandler(async (
    _req: Request,
    res: Response
): Promise<void> => {
    const data = await getLandingData();
    sendSuccess(res, "Landing data fetched successfully.", data);
});

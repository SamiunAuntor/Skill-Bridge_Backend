import { NextFunction, Request, Response } from "express";
import { getLandingData } from "./public.services";

export async function getLandingDataController(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const data = await getLandingData();

        res.status(200).json({
            success: true,
            message: "Landing data fetched successfully.",
            data,
        });
    } catch (error) {
        next(error);
    }
}

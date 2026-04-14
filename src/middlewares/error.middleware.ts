import { Request, Response, NextFunction } from "express";

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err);

    const statusCode =
        typeof (err as Error & { statusCode?: number }).statusCode === "number"
            ? (err as Error & { statusCode: number }).statusCode
            : 500;
    const details = (err as Error & { details?: unknown }).details;

    res.status(statusCode).json({
        success: false,
        message: err.message || "Something went wrong",
        ...(details !== undefined ? { details } : {}),
    });
};

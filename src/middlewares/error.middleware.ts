import { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/http-error";

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err);

    const statusCode =
        typeof (err as Error & { statusCode?: number }).statusCode === "number"
            ? (err as Error & { statusCode: number }).statusCode
            : 500;
    const details = (err as Error & { details?: unknown }).details;
    const message =
        err instanceof HttpError
            ? err.message
            : statusCode >= 500
              ? "Something went wrong on our side. Please try again."
              : err.message || "Something went wrong";

    res.status(statusCode).json({
        success: false,
        message,
        ...(details !== undefined ? { details } : {}),
    });
};

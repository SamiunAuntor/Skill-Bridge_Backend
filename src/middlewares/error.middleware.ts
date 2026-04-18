import { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error";
import { formatZodError } from "../shared/validation/validation-error";

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err);

    if (err instanceof ZodError) {
        const formatted = formatZodError(err);

        res.status(400).json({
            success: false,
            message: formatted.message,
            details: formatted.details,
        });
        return;
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            res.status(409).json({
                success: false,
                message: "A record with this information already exists.",
            });
            return;
        }

        if (err.code === "P2025") {
            res.status(404).json({
                success: false,
                message: "The requested record could not be found.",
            });
            return;
        }

        if (err.code === "P2003") {
            res.status(400).json({
                success: false,
                message: "This request references related data that does not exist or cannot be changed.",
            });
            return;
        }
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
        res.status(400).json({
            success: false,
            message: "The request data is invalid.",
        });
        return;
    }

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

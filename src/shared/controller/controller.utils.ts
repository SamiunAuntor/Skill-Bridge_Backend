import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../utils/http-error";

export function requireAuthUser(req: AuthenticatedRequest) {
    if (!req.authUser) {
        throw new HttpError(401, "Unauthorized");
    }

    return req.authUser;
}

export function sendSuccess<T>(
    res: Response,
    message: string,
    data: T,
    statusCode = 200
): void {
    res.status(statusCode).json({
        success: true,
        message,
        data,
    });
}

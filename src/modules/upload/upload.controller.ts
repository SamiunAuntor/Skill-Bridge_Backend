import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../utils/http-error";
import { createSignedImageUpload } from "./upload.services";

export async function signImageUploadController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }

        const result = createSignedImageUpload();

        res.status(200).json({
            success: true,
            message: "Upload signature generated successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

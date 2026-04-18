import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../utils/http-error";
import {
    deleteUploadedAsset,
    toUploadedAssetPayload,
    UploadResourceType,
} from "./upload.services";

async function respondWithUploadedAsset(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
    resourceType: UploadResourceType,
    successMessage: string
): Promise<void> {
    try {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }

        const uploadedAsset = toUploadedAssetPayload(req.file, resourceType);

        res.status(200).json({
            success: true,
            message: successMessage,
            data: uploadedAsset,
        });
    } catch (error) {
        try {
            const uploadedAsset = toUploadedAssetPayload(req.file, resourceType);
            await deleteUploadedAsset({
                publicId: uploadedAsset.publicId,
                resourceType,
            });
        } catch {
            // Ignore rollback failures here; the main error will still be surfaced.
        }

        next(error);
    }
}

export async function uploadImageController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    await respondWithUploadedAsset(
        req,
        res,
        next,
        "image",
        "Image uploaded successfully."
    );
}

export async function uploadPdfController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    await respondWithUploadedAsset(
        req,
        res,
        next,
        "raw",
        "PDF uploaded successfully."
    );
}

export async function deleteUploadedAssetController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }

        const publicId =
            typeof req.body?.publicId === "string" ? req.body.publicId.trim() : "";
        const resourceType =
            req.body?.resourceType === "raw" ? "raw" : req.body?.resourceType === "image" ? "image" : null;

        if (!publicId || !resourceType) {
            throw new HttpError(400, "Uploaded file information is required.");
        }

        await deleteUploadedAsset({
            publicId,
            resourceType,
        });

        res.status(200).json({
            success: true,
            message: "Uploaded file removed successfully.",
        });
    } catch (error) {
        next(error);
    }
}

import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/controller/async-handler";
import { requireAuthUser, sendSuccess } from "../../shared/controller/controller.utils";
import { validateRequest } from "../../shared/validation/validate-request";
import {
    deleteUploadedAsset,
    toUploadedAssetPayload,
    UploadResourceType,
} from "./upload.services";
import { deleteUploadedAssetSchema } from "./upload.validation";

async function respondWithUploadedAsset(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
    resourceType: UploadResourceType,
    successMessage: string
): Promise<void> {
    try {
        requireAuthUser(req);

        const uploadedAsset = toUploadedAssetPayload(req.file, resourceType);

        sendSuccess(res, successMessage, uploadedAsset);
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

export const uploadImageController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    await respondWithUploadedAsset(
        req,
        res,
        next,
        "image",
        "Image uploaded successfully."
    );
});

export const uploadPdfController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    await respondWithUploadedAsset(
        req,
        res,
        next,
        "raw",
        "PDF uploaded successfully."
    );
});

export const deleteUploadedAssetController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    requireAuthUser(req);
    const { publicId, resourceType } = validateRequest(
        deleteUploadedAssetSchema,
        req.body
    );

    await deleteUploadedAsset({
        publicId,
        resourceType,
    });

    sendSuccess(res, "Uploaded file removed successfully.", null);
});

import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/controller/async-handler";
import { requireAuthUser, sendSuccess } from "../../shared/controller/controller.utils";
import { validateRequest } from "../../shared/validation/validate-request";
import { HttpError } from "../../utils/http-error";
import {
    createUploadedAssetDeleteToken,
    deleteUploadedAsset,
    toUploadedAssetPayload,
    UploadResourceType,
    verifyUploadedAssetDeleteToken,
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
        const authUser = requireAuthUser(req);
        const uploadedAsset = toUploadedAssetPayload(req.file, resourceType);
        uploadedAsset.deleteToken = await createUploadedAssetDeleteToken({
            publicId: uploadedAsset.publicId,
            resourceType,
            userId: authUser.id,
        });

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
    const authUser = requireAuthUser(req);
    const { publicId, resourceType, deleteToken } = validateRequest(
        deleteUploadedAssetSchema,
        req.body
    );
    const authorizedAsset = await verifyUploadedAssetDeleteToken(deleteToken);

    if (
        authorizedAsset.userId !== authUser.id ||
        authorizedAsset.publicId !== publicId ||
        authorizedAsset.resourceType !== resourceType
    ) {
        throw new HttpError(401, "Uploaded file authorization is invalid or expired.");
    }

    await deleteUploadedAsset({
        publicId,
        resourceType,
    });

    sendSuccess(res, "Uploaded file removed successfully.", null);
});

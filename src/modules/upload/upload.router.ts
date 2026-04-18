import { NextFunction, Response, Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../../middlewares/auth.middleware";
import {
    deleteUploadedAssetController,
    uploadImageController,
    uploadPdfController,
} from "./upload.controller";
import {
    handleUploadMiddlewareError,
    uploadImageMiddleware,
    uploadPdfMiddleware,
} from "./upload.middleware";

const uploadRouter = Router();

function withSingleFileUpload(
    middleware: ReturnType<typeof uploadImageMiddleware.single>
) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        middleware(req, res, (error) => {
            if (!error) {
                next();
                return;
            }

            try {
                handleUploadMiddlewareError(error);
            } catch (handledError) {
                next(handledError);
            }
        });
    };
}

uploadRouter.post(
    "/images",
    requireAuth,
    withSingleFileUpload(uploadImageMiddleware.single("file")),
    uploadImageController
);

uploadRouter.post(
    "/pdfs",
    requireAuth,
    withSingleFileUpload(uploadPdfMiddleware.single("file")),
    uploadPdfController
);

uploadRouter.delete("/assets", requireAuth, deleteUploadedAssetController);

export default uploadRouter;

import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinary } from "../../lib/cloudinary";
import { HttpError } from "../../utils/http-error";
import {
    createUploadPublicId,
    UploadResourceType,
} from "./upload.services";

const IMAGE_MAX_FILE_SIZE = 3 * 1024 * 1024;
const PDF_MAX_FILE_SIZE = 10 * 1024 * 1024;

const allowedImageMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

const allowedPdfMimeTypes = new Set(["application/pdf"]);

function createCloudinaryStorage(resourceType: UploadResourceType) {
    const folder =
        resourceType === "image" ? "skillbridge/images" : "skillbridge/pdfs";

    return new CloudinaryStorage({
        cloudinary,
        params: async (_req, file) => ({
            folder,
            resource_type: resourceType,
            public_id: createUploadPublicId(file.originalname),
        }),
    });
}

function createFileFilter(
    allowedMimeTypes: Set<string>,
    invalidFileMessage: string
): (
    req: Express.Request,
    file: Express.Multer.File,
    callback: multer.FileFilterCallback
) => void {
    return (_req, file, callback) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
            callback(new HttpError(400, invalidFileMessage));
            return;
        }

        callback(null, true);
    };
}

function createMulterUpload(
    resourceType: UploadResourceType,
    maxFileSize: number,
    invalidFileMessage: string
) {
    const allowedMimeTypes =
        resourceType === "image" ? allowedImageMimeTypes : allowedPdfMimeTypes;

    return multer({
        storage: createCloudinaryStorage(resourceType),
        limits: {
            fileSize: maxFileSize,
            files: 1,
        },
        fileFilter: createFileFilter(allowedMimeTypes, invalidFileMessage),
    });
}

export const uploadImageMiddleware = createMulterUpload(
    "image",
    IMAGE_MAX_FILE_SIZE,
    "Upload a JPG, PNG, or WEBP image."
);

export const uploadPdfMiddleware = createMulterUpload(
    "raw",
    PDF_MAX_FILE_SIZE,
    "Upload a PDF document."
);

export function handleUploadMiddlewareError(error: unknown): never {
    if (error instanceof HttpError) {
        throw error;
    }

    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            throw new HttpError(400, "File size exceeds the allowed limit.");
        }

        throw new HttpError(400, "Unable to process the uploaded file.");
    }

    throw new HttpError(500, "Unable to upload this file right now.");
}

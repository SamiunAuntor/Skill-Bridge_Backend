import { randomUUID } from "crypto";
import { cloudinary } from "../../lib/cloudinary";
import { HttpError } from "../../utils/http-error";

export type UploadResourceType = "image" | "raw";

export interface UploadedAssetPayload {
    secureUrl: string;
    publicId: string;
    originalName: string;
    resourceType: UploadResourceType;
    bytes: number;
}

export interface UploadedCloudinaryFile {
    path?: string;
    filename?: string;
    originalname?: string;
    size?: number;
}

export interface DeleteUploadedAssetInput {
    publicId: string;
    resourceType: UploadResourceType;
}

export function createUploadPublicId(originalName?: string): string {
    const baseName = (originalName ?? "asset")
        .replace(/\.[^.]+$/, "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50);

    const safeBaseName = baseName || "asset";

    return `${safeBaseName}-${randomUUID()}`;
}

export function toUploadedAssetPayload(
    file: UploadedCloudinaryFile | undefined,
    resourceType: UploadResourceType
): UploadedAssetPayload {
    if (!file?.path || !file.filename) {
        throw new HttpError(500, "Uploaded file metadata is missing.");
    }

    return {
        secureUrl: file.path,
        publicId: file.filename,
        originalName: file.originalname ?? "uploaded-file",
        resourceType,
        bytes: file.size ?? 0,
    };
}

export async function deleteUploadedAsset(
    input: DeleteUploadedAssetInput
): Promise<void> {
    const publicId = input.publicId?.trim();

    if (!publicId) {
        throw new HttpError(400, "Uploaded asset id is required.");
    }

    const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: input.resourceType,
        invalidate: true,
    });

    if (
        result.result !== "ok" &&
        result.result !== "not found"
    ) {
        throw new HttpError(500, "Unable to remove uploaded file.");
    }
}

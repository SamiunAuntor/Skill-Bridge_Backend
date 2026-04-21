import { randomUUID } from "crypto";
import { jwtVerify, SignJWT } from "jose";
import { cloudinary } from "../../lib/cloudinary";
import { env } from "../../config/env";
import { HttpError } from "../../utils/http-error";

export type UploadResourceType = "image" | "raw";

export interface UploadedAssetPayload {
    secureUrl: string;
    publicId: string;
    originalName: string;
    resourceType: UploadResourceType;
    bytes: number;
    deleteToken: string;
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

type UploadedAssetDeleteTokenPayload = {
    publicId: string;
    resourceType: UploadResourceType;
    userId: string;
    typ: "uploaded-asset-delete";
};

const uploadDeleteTokenSecret = new TextEncoder().encode(env.JWT_SECRET);

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
        deleteToken: "",
    };
}

export async function createUploadedAssetDeleteToken(input: {
    publicId: string;
    resourceType: UploadResourceType;
    userId: string;
}): Promise<string> {
    return new SignJWT({
        publicId: input.publicId,
        resourceType: input.resourceType,
        userId: input.userId,
        typ: "uploaded-asset-delete",
    } satisfies UploadedAssetDeleteTokenPayload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30m")
        .sign(uploadDeleteTokenSecret);
}

export async function verifyUploadedAssetDeleteToken(
    token: string
): Promise<UploadedAssetDeleteTokenPayload> {
    const result = await jwtVerify(token, uploadDeleteTokenSecret);
    const payload = result.payload;

    if (
        typeof payload.publicId !== "string" ||
        (payload.resourceType !== "image" && payload.resourceType !== "raw") ||
        typeof payload.userId !== "string" ||
        payload.typ !== "uploaded-asset-delete"
    ) {
        throw new HttpError(401, "Uploaded file authorization is invalid or expired.");
    }

    return {
        publicId: payload.publicId,
        resourceType: payload.resourceType,
        userId: payload.userId,
        typ: "uploaded-asset-delete",
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

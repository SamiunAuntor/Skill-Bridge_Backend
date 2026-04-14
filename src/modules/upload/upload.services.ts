import { env } from "../../config/env";
import { cloudinary } from "../../lib/cloudinary";

export interface SignedUploadPayload {
    timestamp: number;
    signature: string;
    apiKey: string;
    cloudName: string;
    folder: string;
}

export function createSignedImageUpload(): SignedUploadPayload {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "skillbridge/tutors/profile";

    const signature = cloudinary.utils.api_sign_request(
        {
            folder,
            timestamp,
        },
        env.CLOUDINARY_API_SECRET as string
    );

    return {
        timestamp,
        signature,
        apiKey: env.CLOUDINARY_API_KEY as string,
        cloudName: env.CLOUDINARY_CLOUD_NAME as string,
        folder,
    };
}

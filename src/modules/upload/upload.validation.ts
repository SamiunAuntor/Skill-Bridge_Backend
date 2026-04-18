import { z } from "zod";

export const deleteUploadedAssetSchema = z.object({
    publicId: z.string().trim().min(1, "Uploaded file id is required."),
    resourceType: z.enum(["image", "raw"], {
        error: "Uploaded file resource type is required.",
    }),
});

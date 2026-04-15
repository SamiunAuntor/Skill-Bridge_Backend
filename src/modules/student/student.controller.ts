import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../utils/http-error";
import { updateMyStudentProfile } from "./student.services";

export async function updateMyStudentProfileController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }

        if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
            throw new HttpError(400, "Invalid student profile payload.");
        }

        const body = req.body as Record<string, unknown>;
        const fullName =
            typeof body.fullName === "string" ? body.fullName.trim() : "";
        const profileImageUrl =
            typeof body.profileImageUrl === "string"
                ? body.profileImageUrl
                : body.profileImageUrl === null
                  ? null
                  : undefined;

        if (!fullName) {
            throw new HttpError(400, "Full name is required.");
        }

        const result = await updateMyStudentProfile(req.authUser.id, {
            fullName,
            ...(profileImageUrl !== undefined ? { profileImageUrl } : {}),
        });

        res.status(200).json({
            success: true,
            message: "Student profile updated successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

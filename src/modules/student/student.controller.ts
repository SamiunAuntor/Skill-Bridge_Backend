import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/controller/async-handler";
import { requireAuthUser, sendSuccess } from "../../shared/controller/controller.utils";
import { validateRequest } from "../../shared/validation/validate-request";
import { updateMyStudentProfile } from "./student.services";
import { updateStudentProfileSchema } from "./student.validation";

export const updateMyStudentProfileController = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const authUser = requireAuthUser(req);
    const body = validateRequest(updateStudentProfileSchema, req.body);

    const result = await updateMyStudentProfile(authUser.id, {
        fullName: body.fullName,
        ...(body.profileImageUrl !== undefined
            ? { profileImageUrl: body.profileImageUrl }
            : {}),
    });

    sendSuccess(res, "Student profile updated successfully.", result);
});

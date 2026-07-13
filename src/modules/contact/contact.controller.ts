import { Request, Response } from "express";
import { asyncHandler } from "../../shared/controller/async-handler";
import { sendSuccess } from "../../shared/controller/controller.utils";
import { validateRequest } from "../../shared/validation/validate-request";
import {
    createContactSubmission,
    getContactSubmissions,
    updateContactSubmissionStatus,
} from "./contact.service";
import {
    contactAdminQuerySchema,
    contactIdParamsSchema,
    contactStatusSchema,
    contactSubmissionSchema,
} from "./contact.validation";

export const submitContactController = asyncHandler(async (req: Request, res: Response) => {
    const payload = validateRequest(contactSubmissionSchema, req.body);
    if (payload.website) {
        sendSuccess(res, "Thanks for contacting SkillBridge.", { accepted: true }, 201);
        return;
    }
    const result = await createContactSubmission({
        name: payload.name,
        email: payload.email,
        subject: payload.subject,
        message: payload.message,
    });
    sendSuccess(res, "Thanks for contacting SkillBridge. We received your message.", result, 201);
});

export const getContactSubmissionsController = asyncHandler(async (req: Request, res: Response) => {
    const query = validateRequest(contactAdminQuerySchema, req.query);
    const result = await getContactSubmissions({
        ...(query.q ? { q: query.q } : {}),
        ...(query.status ? { status: query.status } : {}),
        sortBy: query.sortBy,
        page: query.page,
        limit: query.limit,
    });
    sendSuccess(res, "Contact submissions fetched successfully.", result);
});

export const updateContactStatusController = asyncHandler(async (req: Request, res: Response) => {
    const { id } = validateRequest(contactIdParamsSchema, req.params);
    const { status } = validateRequest(contactStatusSchema, req.body);
    const result = await updateContactSubmissionStatus(id, status);
    sendSuccess(res, "Contact submission status updated.", result);
});

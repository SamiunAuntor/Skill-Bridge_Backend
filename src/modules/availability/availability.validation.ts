import { z } from "zod";

const isoDateTimeField = (fieldName: string) =>
    z.string().trim().min(1, `${fieldName} is required.`).transform((value, ctx) => {
        const parsed = new Date(value);

        if (Number.isNaN(parsed.getTime())) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${fieldName} must be a valid ISO date-time.`,
            });
            return z.NEVER;
        }

        return parsed;
    });

export const availabilitySlotSchema = z.object({
    startAt: isoDateTimeField("startAt"),
    endAt: isoDateTimeField("endAt"),
});

export const slotIdParamsSchema = z.object({
    slotId: z.string().trim().min(1, "slotId is required."),
});

export const tutorAvailabilityParamsSchema = z.object({
    tutorId: z.string().trim().min(1, "Tutor id is required."),
});

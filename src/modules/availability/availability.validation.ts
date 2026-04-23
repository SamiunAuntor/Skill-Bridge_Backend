import { z } from "zod";

const isoDateTimeField = (fieldName: string) =>
    z.string().trim().min(1, `${fieldName} is required.`).transform((value, ctx) => {
        const parsed = new Date(value);

        if (Number.isNaN(parsed.getTime())) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${fieldName} must be a valid date and time.`,
            });
            return z.NEVER;
        }

        return parsed;
    });

export const availabilitySlotSchema = z.object({
    startAt: isoDateTimeField("Start time"),
    endAt: isoDateTimeField("End time"),
});

export const slotIdParamsSchema = z.object({
    slotId: z.string().trim().min(1, "Availability slot is required."),
});

export const tutorAvailabilityParamsSchema = z.object({
    tutorId: z.string().trim().min(1, "Tutor id is required."),
});

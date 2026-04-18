import { z } from "zod";

export function formatZodError(error: z.ZodError) {
    const details = error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
    }));

    return {
        message: details[0]?.message ?? "Validation failed.",
        details,
    };
}

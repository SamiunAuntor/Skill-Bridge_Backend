import { z } from "zod";

export function validateRequest<TSchema extends z.ZodTypeAny>(
    schema: TSchema,
    input: unknown
): z.infer<TSchema> {
    return schema.parse(input);
}

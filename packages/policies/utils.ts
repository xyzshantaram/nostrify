import { z } from "zod";

export type FieldType = "string" | "multi_string" | "number" | "multi_number" | "boolean";

/**
 * Serializes a Zod schema into a record of field types.
 * Special-cases NIP-01 filters as `multi_string`.
 */
export function zodSchemaToFields(schema: z.ZodObject<any>): Record<string, FieldType> {
    const result: Record<string, FieldType> = {};

    for (const [key, field] of Object.entries(schema.shape)) {
        if (key === "filters") {
            result[key] = "multi_string";
            continue;
        }

        console.log(key);

        if (field instanceof z.ZodArray) {
            const elementType = field._def.type._def.typeName;
            console.log(elementType);

            if (elementType === "ZodString") {
                result[key] = "multi_string";
            } else if (elementType === "ZodNumber") {
                result[key] = "multi_number";
            }
        } else if (field instanceof z.ZodString) {
            result[key] = "string";
        } else if (field instanceof z.ZodNumber) {
            result[key] = "number";
        }
    }

    return result;
}
import { z } from "zod";

type FieldType = "string" | "multi_string" | "number" | "multi_number" | "boolean";

export interface FieldItem {
    type: FieldType;
    description?: string;
}

/**
 * Serializes a Zod schema into a record of field types.
 * Special-cases NIP-01 filters as `multi_string`.
 */
export function zodSchemaToFields(schema: z.ZodObject<any>): Record<string, FieldItem> {
    const result: Record<string, FieldItem> = {};

    for (const [key, field] of Object.entries(schema.shape) as [string, z.ZodTypeAny][]) {
        result[key] = { type: "string" };
        // doing it this way because otherwise each object ends up with a description: undefined on it
        if (field.description) result[key].description = field.description;

        if (key === "filters") {
            result[key].type = "multi_string";
            continue;
        }

        if (field instanceof z.ZodArray) {
            const elementType = field._def.type._def.typeName;
            if (elementType === "ZodString") {
                result[key].type = "multi_string";
            } else if (elementType === "ZodNumber") {
                result[key].type = "multi_number";
            }
        } else if (field instanceof z.ZodString) {
            result[key].type = "string";
        } else if (field instanceof z.ZodNumber) {
            result[key].type = "number";
        }
    }

    return result;
}
import { z } from 'zod';

type FieldType = 'string' | 'multi_string' | 'number' | 'multi_number' | 'boolean' | 'unknown';

export interface FieldItem {
  type: FieldType;
  description?: string;
}

/**
 * Serializes a Zod schema into a record of field types. NOT meant to be used
 * as a general-purpose serializer - this is specifically for generating policy
 * parameter descriptions!
 * Special-cases NIP-01 filters as `multi_string`.
 */
export function zodSchemaToFields(schema: z.ZodObject<any>): Record<string, FieldItem> {
  const result: Record<string, FieldItem> = {};

  for (const [key, field] of Object.entries(schema.shape) as [string, z.ZodTypeAny][]) {
    result[key] = { type: 'unknown' };

    if (key === 'filters') {
      result[key].type = 'multi_string';
    } else if (field instanceof z.ZodArray) {
      // zod version is pinned and there is precedent for parsing _def:
      // https://github.com/colinhacks/zod/discussions/1953
      const elementType = field._def.type._def.typeName;
      if (elementType === 'ZodNumber') result[key].type = 'multi_number';
      else result[key].type = 'multi_string';
    } else if (field instanceof z.ZodNumber) result[key].type = 'number';
    else if (field instanceof z.ZodBoolean) result[key].type = 'boolean';
    else if (field instanceof z.ZodString) result[key].type = 'string';

    // doing it this way because otherwise each object ends up with a description: undefined on it
    if (field.description) result[key].description = field.description;
  }

  return result;
}

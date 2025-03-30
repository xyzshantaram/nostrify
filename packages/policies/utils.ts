import { z } from 'zod';

type FieldType = 'string' | 'multi_string' | 'number' | 'multi_number' | 'boolean' | 'unknown';

export interface FieldItem {
  type: FieldType;
  description?: string;
  optional?: boolean;
  default?: any;
}

interface UnwrappedZodType {
  baseType: z.ZodTypeAny;
  optional?: boolean;
  defaultValue?: any;
}

/**
 * Extracts the base type from wrapped Zod types like ZodOptional and ZodDefault.
 */
function unwrapZodType(field: z.ZodTypeAny): UnwrappedZodType {
  let optional = false;
  let defaultValue: any = undefined;

  while (field instanceof z.ZodOptional || field instanceof z.ZodDefault) {
    if (field instanceof z.ZodOptional) optional = true;
    if (field instanceof z.ZodDefault) defaultValue = field._def.defaultValue();
    field = field._def.innerType;
  }

  const ret: UnwrappedZodType = { baseType: field, optional, defaultValue };
  if (!optional) delete ret.optional;
  if (typeof defaultValue === 'string' && defaultValue.length === 0) delete ret.defaultValue;
  if (typeof defaultValue === 'object' && Object.keys(defaultValue).length === 0) delete ret.defaultValue;
  if (defaultValue instanceof Array && defaultValue.length === 0) delete ret.defaultValue;
  return ret;
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
    const { baseType, optional, defaultValue } = unwrapZodType(field);
    result[key] = { type: 'unknown', optional, default: defaultValue };

    if (key === 'filters') {
      result[key].type = 'multi_string';
    } else if (baseType instanceof z.ZodArray) {
      const elementType = unwrapZodType(baseType._def.type).baseType._def.typeName;
      if (elementType === 'ZodNumber') result[key].type = 'multi_number';
      else result[key].type = 'multi_string';
    } else if (baseType instanceof z.ZodNumber) result[key].type = 'number';
    else if (baseType instanceof z.ZodBoolean) result[key].type = 'boolean';
    else if (baseType instanceof z.ZodString) result[key].type = 'string';

    if (result[key].type === 'unknown') console.log(key, baseType);

    if (baseType.description) result[key].description = baseType.description;
  }

  return result;
}

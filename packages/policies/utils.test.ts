import { assertEquals } from "@std/assert";
import { z } from "zod";
import { zodSchemaToFields } from "./utils.ts";

Deno.test("zodSchemaToFields - basic types", () => {
    const schema = z.object({
        name: z.string(),
        age: z.number(),
    });

    const result = zodSchemaToFields(schema);
    assertEquals(result, {
        name: "string",
        age: "number",
    });
});

Deno.test("zodSchemaToFields - array types", () => {
    const schema = z.object({
        tags: z.array(z.string()),
        scores: z.array(z.number()),
    });

    const result = zodSchemaToFields(schema);
    assertEquals(result, {
        tags: "multi_string",
        scores: "multi_number",
    });
});

Deno.test("zodSchemaToFields - special-case NIP-01 filters", () => {
    const schema = z.object({
        filters: z.array(z.string()),
        keywords: z.array(z.string()),
    });

    const result = zodSchemaToFields(schema);
    assertEquals(result, {
        filters: "multi_string",
        keywords: "multi_string",
    });
});

Deno.test("zodSchemaToFields - mixed types", () => {
    const schema = z.object({
        id: z.string(),
        values: z.array(z.number()),
        flags: z.array(z.string()),
    });

    const result = zodSchemaToFields(schema);
    assertEquals(result, {
        id: "string",
        values: "multi_number",
        flags: "multi_string",
    });
});
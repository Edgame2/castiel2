/**
 * Unit tests for Zod to JSON Schema conversion
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodToFastifySchema } from '../../../src/utils/zodToJsonSchema';

describe('zodToFastifySchema', () => {
  it('should convert simple string schema', () => {
    const schema = z.string();
    const jsonSchema = zodToFastifySchema(schema);

    expect(jsonSchema).toHaveProperty('type', 'string');
  });

  it('should convert object schema', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const jsonSchema = zodToFastifySchema(schema);

    expect(jsonSchema).toHaveProperty('type', 'object');
    expect(jsonSchema.properties).toHaveProperty('name');
    expect(jsonSchema.properties).toHaveProperty('age');
  });

  it('should convert enum schema', () => {
    const schema = z.enum(['A', 'B', 'C']);
    const jsonSchema = zodToFastifySchema(schema);

    expect(jsonSchema).toHaveProperty('enum');
    expect(jsonSchema.enum).toEqual(['A', 'B', 'C']);
  });

  it('should convert optional fields', () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });
    const jsonSchema = zodToFastifySchema(schema);

    expect(jsonSchema.required).toContain('required');
    expect(jsonSchema.required).not.toContain('optional');
  });
});




/**
 * Utility to convert Zod schemas to JSON Schema for Fastify Swagger
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

/**
 * Convert a Zod schema to JSON Schema format for Fastify
 */
export function zodToFastifySchema(zodSchema: z.ZodTypeAny): any {
  const jsonSchema = zodToJsonSchema(zodSchema, {
    target: 'openApi3',
    $refStrategy: 'none', // Inline all schemas
  });
  
  return jsonSchema;
}




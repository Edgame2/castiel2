/**
 * Utility to convert Zod schemas to JSON Schema for Fastify Swagger
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

/**
 * Convert a Zod schema to JSON Schema format for Fastify
 */
export function zodToFastifySchema(zodSchema: z.ZodTypeAny): any {
  const opts = { target: 'openApi3', $refStrategy: 'none' as const };
  return zodToJsonSchema(zodSchema as any, opts as any);
}




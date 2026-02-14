/**
 * Input Validation Utilities
 */

import { z } from 'zod';
import { LogCategory, LogSeverity } from '../types';

/**
 * Create Log Input Schema
 */
export const createLogSchema = z.object({
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  geolocation: z.record(z.unknown()).optional(),
  action: z.string().min(1).max(255),
  category: z.nativeEnum(LogCategory).optional().default(LogCategory.ACTION),
  severity: z.nativeEnum(LogSeverity).optional().default(LogSeverity.INFO),
  resourceType: z.string().max(100).optional(),
  resourceId: z.string().max(255).optional(),
  message: z.string().min(1).max(10000),
  metadata: z.record(z.unknown()).optional().default({}),
  source: z.string().max(100).optional(),
  correlationId: z.string().optional(),
});

export type CreateLogSchemaType = z.infer<typeof createLogSchema>;

/**
 * Batch Log Input Schema
 */
export const batchLogSchema = z.object({
  logs: z.array(createLogSchema).min(1).max(1000),
});

/**
 * Log Search Schema
 */
export const logSearchSchema = z.object({
  query: z.string().max(500).optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  category: z.nativeEnum(LogCategory).optional(),
  severity: z.nativeEnum(LogSeverity).optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  source: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().min(1).max(1000).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  sortBy: z.enum(['timestamp', 'action', 'severity']).optional().default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Aggregation Schema
 */
export const aggregationSchema = z.object({
  field: z.enum(['category', 'severity', 'action', 'source', 'resourceType']),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
});




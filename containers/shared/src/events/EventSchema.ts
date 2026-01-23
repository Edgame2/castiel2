/**
 * Event Schema Validation
 * @module @coder/shared/events
 */

import { randomUUID } from 'crypto';
import { z } from 'zod';
import { DomainEvent, PublishEventOptions } from '../types/events';

/**
 * Event schema validator
 */
const EventSchema = z.object({
  id: z.string().uuid(),
  type: z.string().regex(/^[a-z]+\.[a-z]+\.[a-z]+$/), // Format: module.resource.action
  version: z.string(),
  timestamp: z.string().datetime(),
  tenantId: z.string().uuid(),
  source: z.object({
    service: z.string(),
    instance: z.string(),
  }),
  data: z.any(),
  metadata: z.object({
    correlationId: z.string().uuid().optional(),
    causationId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
  }).optional(),
});

/**
 * Validate event structure
 */
export function validateEvent(event: unknown): event is DomainEvent {
  try {
    EventSchema.parse(event);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Create event with validation
 */
export function createEvent<T>(
  type: string,
  tenantId: string,
  data: T,
  source: { service: string; instance: string },
  options?: PublishEventOptions
): DomainEvent<T> {
  const event: DomainEvent<T> = {
    id: randomUUID(),
    type,
    version: '1.0',
    timestamp: new Date().toISOString(),
    tenantId,
    source,
    data,
  };

  if (options) {
    event.metadata = {
      correlationId: options.correlationId,
      causationId: options.causationId,
      userId: options.userId,
    };
  }

  // Validate before returning
  if (!validateEvent(event)) {
    throw new Error('Invalid event structure');
  }

  return event;
}


/**
 * Event Helper Functions
 * 
 * Helper functions to construct and publish events easily.
 */

import { createBaseEvent, publishEventSafely } from '../events/publishers/AuthEventPublisher';
import { AuthEvent } from '../types/events';

/**
 * Extract metadata from request
 */
export function extractEventMetadata(request: any): {
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  deviceName?: string;
  deviceType?: string;
  country?: string;
  city?: string;
} {
  const ipAddress = request.ip || request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || undefined;
  const userAgent = request.headers['user-agent'] || undefined;
  const sessionId = (request as any).sessionId || undefined;

  return {
    ipAddress,
    userAgent,
    sessionId,
  };
}

/**
 * Publish event safely (non-blocking)
 */
export async function publishEventSafelyHelper(event: AuthEvent): Promise<void> {
  await publishEventSafely(event);
}




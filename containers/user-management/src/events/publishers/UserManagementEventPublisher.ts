/**
 * User Management Event Publisher
 * 
 * Publishes user management events to RabbitMQ.
 */

import { getEventPublisher, connectEventPublisher, closeConnection } from '@coder/shared';
import { getConfig } from '../../config';
import { log } from '../../utils/logger';
import type { UserManagementEvent } from '../../types/events';

/**
 * Get the shared event publisher instance (used for publishing).
 */
function getPublisher() {
  const config = getConfig();
  if (!config.rabbitmq?.url) return null;
  return getEventPublisher(
    { url: config.rabbitmq.url, exchange: config.rabbitmq.exchange || 'coder.events' },
    'user-management'
  );
}

/**
 * Initialize event publisher and test connection
 */
export async function initializeEventPublisher(): Promise<void> {
  const config = getConfig();
  if (!config.rabbitmq?.url) {
    log.warn('RabbitMQ URL not configured, events will not be published', { service: 'user-management' });
    return;
  }
  try {
    await connectEventPublisher(
      { url: config.rabbitmq.url, exchange: config.rabbitmq.exchange || 'coder.events' },
      'user-management'
    );
    log.info('Event publisher initialized', { service: 'user-management', exchange: config.rabbitmq.exchange || 'coder.events' });
  } catch (error: unknown) {
    log.error('Failed to initialize event publisher', error, { service: 'user-management' });
  }
}

export { closeConnection };

/**
 * Create base event structure
 */
export function createBaseEvent(
  type: UserManagementEvent['type'],
  userId?: string,
  organizationId?: string,
  correlationId?: string,
  data?: Record<string, unknown>
): Partial<UserManagementEvent> {
  return {
    type,
    timestamp: new Date().toISOString(),
    userId,
    organizationId,
    actorId: userId || 'system',
    data: (data ?? {}) as UserManagementEvent['data'],
    metadata: {
      correlationId,
    },
  } as Partial<UserManagementEvent>;
}

/**
 * Extract event metadata from request
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
  return {
    ipAddress: request.ip || request.headers['x-forwarded-for'] || request.headers['x-real-ip'],
    userAgent: request.headers['user-agent'],
    sessionId: (request as any).user?.sessionId,
    deviceName: (request as any).deviceName,
    deviceType: (request as any).deviceType,
    country: (request as any).country,
    city: (request as any).city,
  };
}

/**
 * Publish event safely (handles errors gracefully)
 */
export async function publishEventSafely(event: UserManagementEvent): Promise<void> {
  const publisher = getPublisher();
  if (!publisher) {
    log.debug('Event publisher not initialized, skipping event', { type: event.type, service: 'user-management' });
    return;
  }
  const tenantId = event.organizationId ?? 'global';
  try {
    await publisher.publish(event.type, tenantId, event.data ?? {});
    log.debug('Event published', { type: event.type, userId: event.userId, service: 'user-management' });
  } catch (error: unknown) {
    log.error('Failed to publish event', error, {
      type: event.type,
      userId: event.userId,
      service: 'user-management',
    });
  }
}

/**
 * Close event publisher connection
 */
export async function closeEventPublisher(): Promise<void> {
  try {
    await closeConnection();
    log.info('Event publisher closed', { service: 'user-management' });
  } catch (error: unknown) {
    log.error('Error closing event publisher', error, { service: 'user-management' });
  }
}


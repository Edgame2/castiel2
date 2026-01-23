/**
 * User Management Event Publisher
 * 
 * Publishes user management events to RabbitMQ.
 */

import { EventPublisher, getChannel, closeConnection } from '@coder/shared';
import { getConfig } from '../../config';
import { log } from '../../utils/logger';
import { UserManagementEvent } from '../../types/events';

let eventPublisher: EventPublisher | null = null;

/**
 * Initialize event publisher and test connection
 */
export async function initializeEventPublisher(): Promise<void> {
  if (eventPublisher) {
    return;
  }

  const config = getConfig();
  
  if (!config.rabbitmq?.url) {
    log.warn('RabbitMQ URL not configured, events will not be published', { service: 'user-management' });
    return;
  }

  try {
    // Test connection by getting channel
    await getChannel();
    
    // Create publisher instance
    eventPublisher = new EventPublisher(config.rabbitmq.exchange || 'coder.events');
    
    log.info('Event publisher initialized', { service: 'user-management', exchange: config.rabbitmq.exchange || 'coder.events' });
  } catch (error: any) {
    log.error('Failed to initialize event publisher', error, { service: 'user-management' });
    // Don't throw - allow service to start without events
  }
}

/**
 * Create base event structure
 */
export function createBaseEvent(
  type: string,
  userId?: string,
  organizationId?: string,
  correlationId?: string,
  data?: any
): Partial<UserManagementEvent> {
  return {
    type,
    timestamp: new Date().toISOString(),
    userId,
    organizationId,
    actorId: userId || 'system',
    data: data || {},
    metadata: {
      correlationId,
    },
  };
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
  if (!eventPublisher) {
    log.debug('Event publisher not initialized, skipping event', { type: event.type, service: 'user-management' });
    return;
  }

  try {
    await eventPublisher.publish(event.type, event);
    log.debug('Event published', { type: event.type, userId: event.userId, service: 'user-management' });
  } catch (error: any) {
    log.error('Failed to publish event', error, {
      type: event.type,
      userId: event.userId,
      service: 'user-management',
    });
    // Don't throw - event publishing failures shouldn't break the request
  }
}

/**
 * Close event publisher connection
 */
export async function closeEventPublisher(): Promise<void> {
  try {
    await closeConnection();
    eventPublisher = null;
    log.info('Event publisher closed', { service: 'user-management' });
  } catch (error: any) {
    log.error('Error closing event publisher', error, { service: 'user-management' });
  }
}


/**
 * Authentication Event Publisher
 * 
 * Publishes authentication events to RabbitMQ exchange 'coder_events'
 * Per ModuleImplementationGuide Section 9
 */

import { randomUUID } from 'crypto';
import { EventPublisher, connectEventPublisher, closeConnection } from '@coder/shared';
import { log } from '../../utils/logger';
import type { AuthEvent } from '../../types/events';
import { BaseEvent } from '../../types/events';
import { getConfig } from '../../config';

let publisher: EventPublisher | null = null;

/**
 * Initialize event publisher and test connection
 */
export async function initializeEventPublisher(): Promise<void> {
  if (publisher) {
    return;
  }

  const config = getConfig();
  
  if (!config.rabbitmq?.url) {
    log.warn('RabbitMQ URL not configured, events will not be published', { service: 'auth' });
    return;
  }

  try {
    const rabbitmqConfig = {
      url: config.rabbitmq.url,
      exchange: config.rabbitmq.exchange || 'coder.events',
    };
    await connectEventPublisher(rabbitmqConfig, 'auth');
    publisher = new EventPublisher(rabbitmqConfig, 'auth');
    
    log.info('Event publisher initialized', { service: 'auth', exchange: rabbitmqConfig.exchange });
  } catch (error: any) {
    log.error('Failed to initialize event publisher', error, { service: 'auth' });
    // Don't throw - allow service to start without events
  }
}

/**
 * Close event publisher connection
 */
export async function closeEventPublisher(): Promise<void> {
  try {
    await closeConnection();
    publisher = null;
    log.info('Event publisher closed', { service: 'auth' });
  } catch (error: any) {
    log.error('Error closing event publisher', error, { service: 'auth' });
  }
}

/**
 * Get event publisher instance
 */
function getPublisher(): EventPublisher | null {
  if (!publisher) {
    const config = getConfig();
    if (config.rabbitmq?.url) {
      publisher = new EventPublisher(
        { url: config.rabbitmq.url, exchange: config.rabbitmq.exchange || 'coder.events' },
        'auth'
      );
    }
  }
  return publisher;
}

/**
 * Create base event structure
 */
export function createBaseEvent(
  type: string,
  userId?: string,
  tenantId?: string,
  correlationId?: string,
  data?: any
): BaseEvent {
  return {
    id: randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    version: '1.0',
    source: 'auth-service',
    correlationId,
    tenantId,
    userId,
    data: data || {},
  };
}

/**
 * Publish an authentication event
 * 
 * @param event - Event to publish
 * @param routingKey - Optional routing key (defaults to event.type)
 */
export async function publishEvent(event: AuthEvent, routingKey?: string): Promise<void> {
  const pub = getPublisher();
  if (!pub) {
    log.debug('Event publisher not initialized, skipping event', { type: event.type, service: 'auth' });
    return;
  }

  try {
    const tenantId = (event as { tenantId?: string }).tenantId ?? event.userId ?? '';
    await pub.publish(event.type, tenantId, event.data);
    log.debug('Auth event published', { type: event.type, service: 'auth' });
  } catch (error) {
    log.error('Failed to publish auth event', error as Error, {
      eventType: event.type,
      tenantId: (event as { tenantId?: string }).tenantId,
      userId: event.userId,
      service: 'auth',
    });
    // Do not re-throw - event publishing should not block core functionality
  }
}

/**
 * Publish event safely (non-blocking, errors are logged but don't throw)
 */
export async function publishEventSafely(event: AuthEvent, routingKey?: string): Promise<void> {
  try {
    await publishEvent(event, routingKey);
  } catch (error) {
    // Error already logged in publishEvent
  }
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


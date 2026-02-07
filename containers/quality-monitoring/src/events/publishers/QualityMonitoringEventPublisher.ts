/**
 * Event publisher for integration sync events
 */

import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config/index.js';
import { log } from '../../utils/logger.js';

let publisher: EventPublisher | null = null;

export async function initializeEventPublisher(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event publishing disabled', { service: 'quality_monitoring' });
    return;
  }
  
  try {
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange || 'coder_events',
        exchangeType: 'topic',
      },
      'quality_monitoring'
    );
    log.info('Event publisher initialized', { service: 'quality_monitoring' });
  } catch (error) {
    log.error('Failed to initialize event publisher', error, { service: 'quality_monitoring' });
    throw error;
  }
}

export async function closeEventPublisher(): Promise<void> {
  if (publisher) {
    publisher = null;
  }
}

export async function publishQualityMonitoringEvent(
  eventType: string,
  tenantId: string,
  data: any,
  metadata?: { correlationId?: string; userId?: string }
): Promise<void> {
  if (!publisher) {
    log.warn('Event publisher not initialized, skipping event', { eventType, service: 'quality_monitoring' });
    return;
  }
  
  try {
    await publisher.publish(eventType, tenantId, data, metadata);
  } catch (error) {
    log.error('Failed to publish event', error, { eventType, service: 'quality_monitoring' });
  }
}

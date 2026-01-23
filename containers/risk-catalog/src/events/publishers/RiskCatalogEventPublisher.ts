/**
 * Event publisher for risk catalog events
 */

import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';

let publisher: EventPublisher | null = null;

export async function initializeEventPublisher(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event publishing disabled', { service: 'risk-catalog' });
    return;
  }
  
  try {
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange || 'coder_events',
        exchangeType: 'topic',
      },
      'risk-catalog'
    );
    log.info('Event publisher initialized', { service: 'risk-catalog' });
  } catch (error) {
    log.error('Failed to initialize event publisher', error, { service: 'risk-catalog' });
    throw error;
  }
}

export async function closeEventPublisher(): Promise<void> {
  if (publisher) {
    publisher = null;
  }
}

export async function publishRiskCatalogEvent(
  eventType: string,
  tenantId: string,
  data: any,
  metadata?: { correlationId?: string; userId?: string }
): Promise<void> {
  if (!publisher) {
    log.warn('Event publisher not initialized, skipping event', { eventType, service: 'risk-catalog' });
    return;
  }
  
  try {
    await publisher.publish(eventType, tenantId, data, metadata);
  } catch (error) {
    log.error('Failed to publish event', error, { eventType, service: 'risk-catalog' });
  }
}

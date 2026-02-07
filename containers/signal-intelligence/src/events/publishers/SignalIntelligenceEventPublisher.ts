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
    log.warn('RabbitMQ URL not configured, event publishing disabled', { service: 'signal_intelligence' });
    return;
  }
  
  try {
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange || 'coder_events',
        exchangeType: 'topic',
      },
      'signal_intelligence'
    );
    log.info('Event publisher initialized', { service: 'signal_intelligence' });
  } catch (error) {
    log.error('Failed to initialize event publisher', error, { service: 'signal_intelligence' });
    throw error;
  }
}

export async function closeEventPublisher(): Promise<void> {
  if (publisher) {
    publisher = null;
  }
}

export async function publishSignalIntelligenceEvent(
  eventType: string,
  tenantId: string,
  data: any,
  metadata?: { correlationId?: string; userId?: string }
): Promise<void> {
  if (!publisher) {
    log.warn('Event publisher not initialized, skipping event', { eventType, service: 'signal_intelligence' });
    return;
  }
  
  try {
    await publisher.publish(eventType, tenantId, data, metadata);
  } catch (error) {
    log.error('Failed to publish event', error, { eventType, service: 'signal_intelligence' });
  }
}

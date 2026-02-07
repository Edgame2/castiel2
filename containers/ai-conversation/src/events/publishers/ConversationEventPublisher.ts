/**
 * Event publisher for conversation events
 */

import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';

let publisher: EventPublisher | null = null;

/**
 * Initialize event publisher
 */
export async function initializeEventPublisher(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event publishing disabled', { service: 'ai-conversation' });
    return;
  }
  
  try {
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange || 'coder_events',
        exchangeType: 'topic',
      },
      'ai-conversation'
    );
    
    log.info('Event publisher initialized', { service: 'ai-conversation' });
  } catch (error) {
    log.error('Failed to initialize event publisher', error, { service: 'ai-conversation' });
    throw error;
  }
}

/**
 * Close event publisher
 */
export async function closeEventPublisher(): Promise<void> {
  if (publisher) {
    try {
      await publisher.close();
      log.info('Event publisher closed', { service: 'ai-conversation' });
    } catch (error) {
      log.warn('Error closing event publisher', { error, service: 'ai-conversation' });
    } finally {
      publisher = null;
    }
  }
}

/**
 * Publish conversation event
 */
export async function publishConversationEvent(
  eventType: string,
  tenantId: string,
  data: any,
  metadata?: { correlationId?: string; userId?: string }
): Promise<void> {
  if (!publisher) {
    log.warn('Event publisher not initialized, skipping event', { eventType, service: 'ai-conversation' });
    return;
  }
  
  try {
    await publisher.publish(eventType, tenantId, data, metadata);
  } catch (error) {
    log.error('Failed to publish event', error, { eventType, service: 'ai-conversation' });
  }
}

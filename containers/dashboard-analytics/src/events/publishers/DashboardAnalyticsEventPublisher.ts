/**
 * Event publisher for integration sync events
 */

import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';

let publisher: EventPublisher | null = null;

export async function initializeEventPublisher(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event publishing disabled', { service: 'dashboard_analytics' });
    return;
  }
  
  try {
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange || 'coder_events',
        exchangeType: 'topic',
      },
      'dashboard_analytics'
    );
    log.info('Event publisher initialized', { service: 'dashboard_analytics' });
  } catch (error) {
    log.error('Failed to initialize event publisher', error, { service: 'dashboard_analytics' });
    throw error;
  }
}

export async function closeEventPublisher(): Promise<void> {
  if (publisher) {
    publisher = null;
  }
}

export async function publishDashboardAnalyticsEvent(
  eventType: string,
  tenantId: string,
  data: any,
  metadata?: { correlationId?: string; userId?: string }
): Promise<void> {
  if (!publisher) {
    log.warn('Event publisher not initialized, skipping event', { eventType, service: 'dashboard_analytics' });
    return;
  }
  
  try {
    await publisher.publish(eventType, tenantId, data, metadata);
  } catch (error) {
    log.error('Failed to publish event', error, { eventType, service: 'dashboard_analytics' });
  }
}

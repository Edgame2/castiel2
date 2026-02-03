/**
 * Event publisher for cache management events (merged from cache-management container).
 * Emits cache_management.* for backward compatibility with existing consumers.
 */

import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config';

let publisher: EventPublisher | null = null;

export async function initializeCacheManagementEventPublisher(): Promise<void> {
  const config = loadConfig();
  const url = config.rabbitmq?.url;
  if (!url) {
    console.warn('[cache-service] RabbitMQ URL not configured, cache management event publishing disabled');
    return;
  }
  try {
    publisher = new EventPublisher(
      {
        url,
        exchange: config.rabbitmq.exchange || 'coder_events',
        exchangeType: 'topic',
      },
      'cache_management'
    );
    console.info('[cache-service] Cache management event publisher initialized');
  } catch (error) {
    console.error('[cache-service] Failed to initialize cache management event publisher:', error);
    throw error;
  }
}

export async function closeCacheManagementEventPublisher(): Promise<void> {
  publisher = null;
}

export async function publishCacheManagementEvent(
  eventType: string,
  tenantId: string,
  data: Record<string, unknown>,
  metadata?: { correlationId?: string; userId?: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish(eventType, tenantId, data, metadata);
  } catch (error) {
    console.error('[cache-service] Failed to publish event', eventType, error);
  }
}

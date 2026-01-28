/**
 * Event publisher for shard events
 * Publishes shard.created, shard.updated, shard.deleted events
 */

import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config';

let publisher: EventPublisher | null = null;

export async function initializeEventPublisher(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq?.url) {
    console.warn('[ShardEventPublisher] RabbitMQ URL not configured, event publishing disabled');
    return;
  }
  
  try {
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange || 'coder_events',
        exchangeType: 'topic',
      },
      'shard-manager'
    );
    await publisher.connect();
    console.log('[ShardEventPublisher] Event publisher initialized');
  } catch (error) {
    console.error('[ShardEventPublisher] Failed to initialize event publisher:', error);
    throw error;
  }
}

export async function closeEventPublisher(): Promise<void> {
  if (publisher) {
    await publisher.close();
    publisher = null;
  }
}

export async function publishShardEvent(
  eventType: 'shard.created' | 'shard.updated' | 'shard.deleted',
  tenantId: string,
  data: {
    shardId: string;
    shardTypeId: string;
    shardTypeName?: string;
    opportunityId?: string;
  },
  metadata?: { correlationId?: string; userId?: string }
): Promise<void> {
  if (!publisher) {
    // Silently skip if publisher not initialized (non-critical)
    return;
  }
  
  try {
    await publisher.publish(eventType, tenantId, data, metadata);
  } catch (error) {
    // Log error but don't throw (non-critical)
    console.error(`[ShardEventPublisher] Failed to publish ${eventType} event:`, error);
  }
}

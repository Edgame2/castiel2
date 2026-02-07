/**
 * Event consumer for ai-conversation
 * Consumes shard update events to update conversation context
 */

import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';

let consumer: EventConsumer | null = null;

export async function initializeEventConsumer(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event consumption disabled', { service: 'ai-conversation' });
    return;
  }
  
  try {
    consumer = new EventConsumer({
      url: config.rabbitmq.url,
      exchange: config.rabbitmq.exchange || 'coder_events',
      queue: config.rabbitmq.queue,
      routingKeys: (config.rabbitmq as { bindings?: string[] }).bindings ?? ['#'],
    });

    // Handle shard updates (update conversation context when linked shards change)
    consumer.on('shard.updated', async (event) => {
      const shardId = event.data?.shardId ?? event.data?.id;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!shardId || !tenantId) {
        log.warn('shard.updated missing shardId or tenantId', {
          hasData: !!event.data,
          tenantId: event.tenantId,
          service: 'ai-conversation',
        });
        return;
      }
      log.debug('Shard updated, may affect conversation context', {
        shardId,
        tenantId,
        service: 'ai-conversation',
      });

      // Check if shard is linked to any conversations
      try {
        const { getContainer } = await import('@coder/shared/database');
        const container = getContainer('conversation_conversations');

        // Query conversations that have this shard linked
        // Cosmos DB uses ARRAY_CONTAINS for array field queries
        const { resources: conversations } = await container.items
          .query(
            {
              query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND (ARRAY_CONTAINS(c.linkedShardIds, @shardId) OR (c.metadata != null AND ARRAY_CONTAINS(c.metadata.linkedShardIds, @shardId)))',
              parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@shardId', value: shardId },
              ],
            },
            { partitionKey: tenantId }
          )
          .fetchNext();

        if (conversations && conversations.length > 0) {
          log.info('Shard linked to conversations, context may need refresh', {
            shardId,
            conversationCount: conversations.length,
            tenantId,
            service: 'ai-conversation',
          });
          // Context refresh is handled by context-service when conversations are accessed
        }
      } catch (error: unknown) {
        log.warn('Failed to check shard-conversation links', {
          error: error instanceof Error ? error.message : String(error),
          shardId,
          tenantId,
          service: 'ai-conversation',
        });
      }
    });

    await consumer.start();
    log.info('Event consumer initialized and started', { service: 'ai-conversation' });
  } catch (error) {
    log.error('Failed to initialize event consumer', error, { service: 'ai-conversation' });
    throw error;
  }
}

export async function closeEventConsumer(): Promise<void> {
  if (consumer) {
    await consumer.stop();
    consumer = null;
  }
}

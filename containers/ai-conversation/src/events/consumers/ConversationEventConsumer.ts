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
      bindings: config.rabbitmq.bindings,
    });

    // Handle shard updates (update conversation context when linked shards change)
    consumer.on('shard.updated', async (event) => {
      log.debug('Shard updated, may affect conversation context', {
        shardId: event.data.shardId,
        tenantId: event.tenantId,
        service: 'ai-conversation',
      });
      
      // Check if shard is linked to any conversations
      try {
        const { getContainer } = await import('@coder/shared/database');
        const container = getContainer('conversation_conversations');
        
        // Query conversations that have this shard linked
        // Cosmos DB uses ARRAY_CONTAINS for array field queries
        const { resources: conversations } = await container.items
          .query({
            query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND (ARRAY_CONTAINS(c.linkedShardIds, @shardId) OR (c.metadata != null AND ARRAY_CONTAINS(c.metadata.linkedShardIds, @shardId)))',
            parameters: [
              { name: '@tenantId', value: event.tenantId },
              { name: '@shardId', value: event.data.shardId },
            ],
          })
          .fetchNext();
        
        if (conversations && conversations.length > 0) {
          log.info('Shard linked to conversations, context may need refresh', {
            shardId: event.data.shardId,
            conversationCount: conversations.length,
            tenantId: event.tenantId,
            service: 'ai-conversation',
          });
          // Context refresh is handled by context-service when conversations are accessed
        }
      } catch (error: any) {
        log.warn('Failed to check shard-conversation links', {
          error: error.message,
          shardId: event.data.shardId,
          tenantId: event.tenantId,
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
    consumer = null;
  }
}

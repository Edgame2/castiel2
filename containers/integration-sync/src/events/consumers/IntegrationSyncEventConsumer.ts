/**
 * Event consumer for integration sync
 * Consumes shard updates for bidirectional sync
 */

import { EventConsumer } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';
import { IntegrationSyncService } from '../../services/IntegrationSyncService';

let consumer: EventConsumer | null = null;
let integrationSyncService: IntegrationSyncService | null = null;

export async function initializeEventConsumer(app?: FastifyInstance): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event consumption disabled', { service: 'integration-sync' });
    return;
  }
  
  try {
    // Initialize integration sync service
    integrationSyncService = new IntegrationSyncService(app);
    
    consumer = new EventConsumer({
      url: config.rabbitmq.url,
      exchange: config.rabbitmq.exchange || 'coder_events',
      queue: config.rabbitmq.queue,
      routingKeys: config.rabbitmq.bindings || [],
    });

    // Handle shard updates for bidirectional sync (1.4 Real-Time Write-Back)
    consumer.on('shard.updated', async (event) => {
      const shardId = event.data?.shardId ?? event.data?.id;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!shardId || !tenantId) {
        log.warn('shard.updated missing shardId or tenantId', {
          hasData: !!event.data,
          tenantId: event.tenantId,
          service: 'integration-sync',
        });
        return;
      }
      log.info('Shard updated, triggering bidirectional sync if needed', {
        shardId,
        tenantId,
        service: 'integration-sync',
      });

      if (!integrationSyncService) {
        log.error('Integration sync service not initialized', { service: 'integration-sync' });
        return;
      }

      try {
        await integrationSyncService.handleBidirectionalSync(shardId, tenantId);
      } catch (error: unknown) {
        log.error('Failed to handle bidirectional sync', error instanceof Error ? error : new Error(String(error)), {
          shardId,
          tenantId,
          service: 'integration-sync',
        });
      }
    });

    await consumer.start();
    log.info('Event consumer initialized and started', { service: 'integration-sync' });
  } catch (error) {
    log.error('Failed to initialize event consumer', error, { service: 'integration-sync' });
    throw error;
  }
}

export async function closeEventConsumer(): Promise<void> {
  if (consumer) {
    await consumer.stop();
    consumer = null;
  }
}

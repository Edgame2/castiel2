/**
 * Event consumer for data enrichment
 * Consumes shard creation/update events and triggers enrichment
 */

import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';
import { publishEnrichmentEvent } from '../publishers/EnrichmentEventPublisher';

let consumer: EventConsumer | null = null;

export async function initializeEventConsumer(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event consumption disabled', { service: 'data-enrichment' });
    return;
  }
  
  try {
    consumer = new EventConsumer({
      url: config.rabbitmq.url,
      exchange: config.rabbitmq.exchange || 'coder_events',
      queue: config.rabbitmq.queue,
      bindings: config.rabbitmq.bindings,
    });

    // Handle shard creation
    consumer.on('shard.created', async (event) => {
      log.info('Shard created, triggering enrichment', {
        shardId: event.data.shardId,
        tenantId: event.tenantId,
        service: 'data-enrichment',
      });
      
      // Trigger enrichment for new shards
      await triggerEnrichment(event.data.shardId, event.tenantId);
    });

    // Handle shard updates
    consumer.on('shard.updated', async (event) => {
      log.info('Shard updated, triggering re-enrichment', {
        shardId: event.data.shardId,
        tenantId: event.tenantId,
        service: 'data-enrichment',
      });
      
      // Trigger re-enrichment for updated shards
      await triggerEnrichment(event.data.shardId, event.tenantId);
    });

    await consumer.start();
    log.info('Event consumer initialized and started', { service: 'data-enrichment' });
  } catch (error) {
    log.error('Failed to initialize event consumer', error, { service: 'data-enrichment' });
    throw error;
  }
}

async function triggerEnrichment(shardId: string, tenantId: string): Promise<void> {
  try {
    const { EnrichmentService } = await import('../../services/EnrichmentService');
    const enrichmentService = new EnrichmentService();
    
    await enrichmentService.triggerEnrichment(shardId, tenantId);
  } catch (error) {
    log.error('Failed to trigger enrichment', error, {
      shardId,
      tenantId,
      service: 'data-enrichment',
    });
  }
}

export async function closeEventConsumer(): Promise<void> {
  if (consumer) {
    consumer = null;
  }
}

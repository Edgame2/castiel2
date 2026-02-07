/**
 * Event consumer for data enrichment
 * Consumes shard creation/update events and triggers enrichment and embedding generation
 */

import { EventConsumer } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../../config/index.js';
import { log } from '../../utils/logger.js';

let consumer: EventConsumer | null = null;

export async function initializeEventConsumer(app?: FastifyInstance): Promise<void> {
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
      routingKeys: (config.rabbitmq as { bindings?: string[] }).bindings ?? ['#'],
    });

    // Handle shard creation (2.4 Embedding Processor)
    // Only vectorize Document, Email, Meeting, Message, CalendarEvent shards (not Opportunity, Account, Contact)
    consumer.on('shard.created', async (event) => {
      const shardId = event.data?.shardId ?? event.data?.id;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      const shardTypeId = event.data?.shardTypeId;
      
      if (!shardId || !tenantId) {
        log.warn('shard.created missing shardId or tenantId', {
          hasData: !!event.data,
          tenantId: event.tenantId,
          service: 'data-enrichment',
        });
        return;
      }

      // Filter: Only vectorize multi-modal content shards (Document, Email, Meeting, Message, CalendarEvent)
      // Do NOT vectorize CRM shards (Opportunity, Account, Contact)
      const vectorizableShardTypes = ['document', 'email', 'meeting', 'message', 'calendarevent'];
      const shardTypeLower = shardTypeId?.toLowerCase();

      if (!shardTypeLower || !vectorizableShardTypes.includes(shardTypeLower)) {
        log.debug('Skipping vectorization for non-vectorizable shard type', {
          shardId,
          shardTypeId,
          tenantId,
          service: 'data-enrichment',
        });
        return;
      }

      log.info('Shard created, triggering enrichment', {
        shardId,
        shardTypeId,
        tenantId,
        service: 'data-enrichment',
      });
      await triggerEnrichment(shardId, tenantId, app);
    });

    // Handle shard updates (2.4 Embedding Processor)
    // Only vectorize Document, Email, Meeting, Message, CalendarEvent shards (not Opportunity, Account, Contact)
    consumer.on('shard.updated', async (event) => {
      const shardId = event.data?.shardId ?? event.data?.id;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      const shardTypeId = event.data?.shardTypeId;
      
      if (!shardId || !tenantId) {
        log.warn('shard.updated missing shardId or tenantId', {
          hasData: !!event.data,
          tenantId: event.tenantId,
          service: 'data-enrichment',
        });
        return;
      }

      // Filter: Only vectorize multi-modal content shards (Document, Email, Meeting, Message, CalendarEvent)
      // Do NOT vectorize CRM shards (Opportunity, Account, Contact)
      const vectorizableShardTypes = ['document', 'email', 'meeting', 'message', 'calendarevent'];
      const shardTypeLower = shardTypeId?.toLowerCase();

      if (!shardTypeLower || !vectorizableShardTypes.includes(shardTypeLower)) {
        log.debug('Skipping vectorization for non-vectorizable shard type', {
          shardId,
          shardTypeId,
          tenantId,
          service: 'data-enrichment',
        });
        return;
      }

      log.info('Shard updated, triggering re-enrichment', {
        shardId,
        shardTypeId,
        tenantId,
        service: 'data-enrichment',
      });
      await triggerEnrichment(shardId, tenantId, app);
    });

    await consumer.start();
    log.info('Event consumer initialized and started', { service: 'data-enrichment' });
  } catch (error) {
    log.error('Failed to initialize event consumer', error, { service: 'data-enrichment' });
    throw error;
  }
}

async function triggerEnrichment(shardId: string, tenantId: string, app?: FastifyInstance): Promise<void> {
  try {
    const { EnrichmentService } = await import('../../services/EnrichmentService');
    const enrichmentService = new EnrichmentService(app);
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

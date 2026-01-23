/**
 * Slack Ingestion Worker
 * 
 * Ingests Slack channels and messages into the shard system.
 * Processes ingestion events from BullMQ queue.
 */

import { Worker, Job } from 'bullmq';
import { QueueName, QueueProducerService } from '@castiel/queue';
import type { IngestionEventMessage, ShardCreatedMessage } from '@castiel/queue';
import { CosmosClient } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { IngestionEvent } from '@castiel/api-core';
import { v4 as uuidv4 } from 'uuid';
import { normalizeIngestionEvent } from '../shared/normalization-helper.js';
import { createRedisConnection } from '@castiel/queue';

interface SlackIngestionWorkerConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  keyVaultUrl: string;
}

export class SlackIngestionWorker {
  private worker: Worker;
  private cosmosClient: CosmosClient;
  private monitoring: IMonitoringProvider;
  private config: SlackIngestionWorkerConfig;
  private queueProducer: QueueProducerService;

  constructor(
    config: SlackIngestionWorkerConfig,
    monitoring: IMonitoringProvider,
    redis: any
  ) {
    this.config = config;
    this.monitoring = monitoring;

    // Initialize Cosmos DB
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });

    // Initialize queue producer for shard-created events
    this.queueProducer = new QueueProducerService({
      redis,
      monitoring,
    });

    this.worker = new Worker(
      QueueName.INGESTION_EVENTS,
      async (job: Job<IngestionEventMessage>) => {
        // Only process Slack events
        if (job.data.source === 'slack') {
          return this.processSlackIngestion(job);
        }
        // Skip non-Slack events
        return;
      },
      {
        connection: redis,
        concurrency: parseInt(process.env.SLACK_INGESTION_CONCURRENCY || '3', 10),
        removeOnComplete: {
          age: 24 * 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
        },
      }
    );

    this.worker.on('completed', (job) => {
      if (job.data.source === 'slack') {
        this.monitoring.trackEvent('slack-ingestion-worker.completed', {
          jobId: job.id,
          tenantId: job.data.tenantId,
          sourceId: job.data.sourceId,
        });
      }
    });

    this.worker.on('failed', (job, err) => {
      if (job?.data?.source === 'slack') {
        this.monitoring.trackException(err, {
          context: 'SlackIngestionWorker',
          jobId: job.id,
          tenantId: job.data.tenantId,
        });
      }
    });
  }

  private async processSlackIngestion(
    job: Job<IngestionEventMessage>
  ): Promise<void> {
    const startTime = Date.now();
    const { tenantId, sourceId, eventType, data, timestamp } = job.data;

    try {
      this.monitoring.trackEvent('slack-ingestion-worker.started', {
        jobId: job.id,
        tenantId,
        sourceId,
        eventType,
      });

      // Convert IngestionEventMessage to IngestionEvent format
      const ingestionEvent: IngestionEvent = {
        tenantId,
        source: 'slack',
        sourceId,
        eventType: eventType as 'create' | 'update' | 'delete',
        observedAt: timestamp ? new Date(timestamp) : new Date(),
        payload: data,
        correlationId: job.id?.toString() || uuidv4(),
      };

      // Normalize the ingestion event into shard data
      const normalizedShard = normalizeIngestionEvent(ingestionEvent);
      
      if (!normalizedShard) {
        this.monitoring.trackEvent('slack-ingestion-worker.normalization_skipped', {
          jobId: job.id,
          tenantId,
          sourceId,
          reason: 'normalization_returned_null',
        });
        return;
      }

      // Create or update shard in Cosmos DB
      const shard = await this.createOrUpdateShard(normalizedShard);

      // Emit shard-created event for new shards (revisionNumber === 1)
      if (shard.revisionNumber === 1) {
        const shardCreatedMessage: ShardCreatedMessage = {
          shardId: shard.id,
          tenantId: shard.tenantId,
          shardTypeId: shard.shardTypeId,
          shard: shard,
        };

        await this.queueProducer.enqueueShardCreated(shardCreatedMessage);
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('slack-ingestion-worker.completed', {
        jobId: job.id,
        tenantId,
        sourceId,
        duration,
        shardId: shard.id,
        shardTypeId: shard.shardTypeId,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackException(error as Error, {
        context: 'SlackIngestionWorker.processSlackIngestion',
        jobId: job.id,
        tenantId,
        sourceId,
        duration,
      });
      throw error;
    }
  }

  /**
   * Create or update shard in Cosmos DB
   */
  private async createOrUpdateShard(shardData: any): Promise<any> {
    const database = this.cosmosClient.database(this.config.databaseId);
    const shardsContainer = database.container('shards');

    // Check if shard already exists by external_relationships
    const externalId = shardData.external_relationships[0]?.externalId;
    const system = shardData.external_relationships[0]?.system;

    if (externalId && system) {
      const { resources: existing } = await shardsContainer.items
        .query({
          query: `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.shardTypeId = @shardTypeId AND ARRAY_CONTAINS(c.external_relationships, {externalId: @externalId, system: @system}, true)`,
          parameters: [
            { name: '@tenantId', value: shardData.tenantId },
            { name: '@shardTypeId', value: shardData.shardTypeId },
            { name: '@externalId', value: externalId },
            { name: '@system', value: system },
          ],
        })
        .fetchAll();

      if (existing.length > 0) {
        // Update existing shard
        const existingShard = existing[0];
        const updated = {
          ...existingShard,
          structuredData: shardData.structuredData,
          external_relationships: shardData.external_relationships,
          status: shardData.status,
          updatedAt: new Date().toISOString(),
          revisionNumber: (existingShard.revisionNumber || 0) + 1,
          revisionId: uuidv4(),
        };

        await shardsContainer.item(existingShard.id, shardData.tenantId).replace(updated);
        return updated;
      }
    }

    // Create new shard with all required fields
    const newShard = {
      id: uuidv4(),
      ...shardData,
      vectors: [], // Required: empty vectors array
      schemaVersion: 1, // Required: default schema version
      lastActivityAt: new Date().toISOString(), // Required: initial activity timestamp
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revisionId: uuidv4(),
      revisionNumber: 1,
    };

    const { resource } = await shardsContainer.items.create(newShard);
    return resource || newShard;
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queueProducer.close();
  }
}


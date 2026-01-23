/**
 * Project Auto-Attachment Worker
 * 
 * Consumes shard-created events and automatically links
 * shards to projects based on overlap rules.
 */

import { Job } from 'bullmq';
import { BaseWorker, getWorkerConfigFromEnv, DEFAULT_WORKER_CONFIG } from '@castiel/queue';
import type { Redis, Cluster } from 'ioredis';
import { QueueName } from '@castiel/queue';
import type { ShardCreatedMessage } from '@castiel/queue';
import { CosmosClient } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  ShardRepository,
  ProjectAutoAttachmentService,
} from '@castiel/api-core';
import { createRedisConnection } from '@castiel/queue';

interface ProjectAutoAttachmentWorkerConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
}

export class ProjectAutoAttachmentWorker extends BaseWorker<ShardCreatedMessage> {
  private cosmosClient: CosmosClient;
  private config: ProjectAutoAttachmentWorkerConfig;
  private autoAttachmentService: ProjectAutoAttachmentService;

  constructor(
    config: ProjectAutoAttachmentWorkerConfig,
    monitoring: IMonitoringProvider,
    redis: Redis | Cluster
  ) {
    // Get standardized worker config from environment
    const workerConfig = getWorkerConfigFromEnv('shard-created', {
      ...DEFAULT_WORKER_CONFIG,
      concurrency: parseInt(process.env.PROJECT_AUTO_ATTACHMENT_CONCURRENCY || '5', 10),
    });

    // Initialize base worker
    super(
      {
        queueName: QueueName.SHARD_CREATED,
        redis,
        monitoring,
        concurrency: workerConfig.concurrency,
        removeOnComplete: workerConfig.removeOnComplete,
        removeOnFail: workerConfig.removeOnFail,
        workerName: 'project-auto-attachment-worker',
      },
      async (job: Job<ShardCreatedMessage>) => {
        return this.processShardCreated(job);
      }
    );

    this.config = config;

    // Initialize Cosmos DB
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });

    // Initialize services
    const shardRepository = new ShardRepository(monitoring);

    // Initialize ProjectAutoAttachmentService
    this.autoAttachmentService = new ProjectAutoAttachmentService(
      monitoring,
      shardRepository,
      {} // config - optional
    );
  }

  private async processShardCreated(
    job: Job<ShardCreatedMessage>
  ): Promise<void> {
    const startTime = Date.now();
    const { shardId, tenantId, shardTypeId, shard } = job.data;

    try {
      this.monitoring.trackEvent('project-auto-attachment-worker.started', {
        jobId: job.id,
        shardId,
        tenantId,
        shardTypeId,
      });

      // Only process if this is a new shard (revisionNumber === 1)
      if (shard.revisionNumber !== 1) {
        this.monitoring.trackEvent('project-auto-attachment-worker.skipped', {
          jobId: job.id,
          shardId,
          reason: 'not_first_revision',
        });
        return;
      }

      // Execute auto-attachment
      await this.autoAttachmentService.processShardCreated(shard);

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('project-auto-attachment-worker.completed', {
        jobId: job.id,
        shardId,
        tenantId,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackException(error as Error, {
        context: 'ProjectAutoAttachmentWorker.processShardCreated',
        jobId: job.id,
        shardId,
        tenantId,
        duration,
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}




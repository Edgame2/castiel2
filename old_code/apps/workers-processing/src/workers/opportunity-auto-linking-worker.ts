/**
 * Opportunity Auto-Linking Worker
 * 
 * Consumes shard-created events and automatically links
 * shards to opportunities based on multi-factor matching.
 */

import { Job } from 'bullmq';
import { BaseWorker, getWorkerConfigFromEnv, DEFAULT_WORKER_CONFIG } from '@castiel/queue';
import type { Redis, Cluster } from 'ioredis';
import { QueueName, QueueProducerService } from '@castiel/queue';
import type { ShardCreatedMessage, RiskEvaluationMessage } from '@castiel/queue';
import { CosmosClient } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  ShardRepository,
  ShardTypeRepository,
  ShardRelationshipService,
  OpportunityAutoLinkingService,
  CORE_SHARD_TYPE_NAMES,
} from '@castiel/api-core';
import { createRedisConnection } from '@castiel/queue';

interface OpportunityAutoLinkingWorkerConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
}

export class OpportunityAutoLinkingWorker extends BaseWorker<ShardCreatedMessage> {
  private cosmosClient: CosmosClient;
  private config: OpportunityAutoLinkingWorkerConfig;
  private autoLinkingService: OpportunityAutoLinkingService;
  private shardTypeRepository: ShardTypeRepository;
  private queueProducer: QueueProducerService;

  constructor(
    config: OpportunityAutoLinkingWorkerConfig,
    monitoring: IMonitoringProvider,
    redis: Redis | Cluster
  ) {
    // Get standardized worker config from environment
    const workerConfig = getWorkerConfigFromEnv('shard-created', {
      ...DEFAULT_WORKER_CONFIG,
      concurrency: parseInt(process.env.OPPORTUNITY_AUTO_LINKING_CONCURRENCY || '5', 10),
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
        workerName: 'opportunity-auto-linking-worker',
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
    this.shardTypeRepository = new ShardTypeRepository(monitoring);
    const relationshipService = new ShardRelationshipService(
      monitoring,
      shardRepository
    );

    // Initialize OpportunityAutoLinkingService
    this.autoLinkingService = new OpportunityAutoLinkingService(
      monitoring,
      shardRepository,
      relationshipService,
      this.shardTypeRepository
    );

    // Initialize queue producer for risk evaluation queueing
    this.queueProducer = new QueueProducerService({
      redis,
      monitoring,
    });
  }

  async close(): Promise<void> {
    await super.close();
    await this.queueProducer.close();
  }

  private async processShardCreated(
    job: Job<ShardCreatedMessage>
  ): Promise<void> {
    const startTime = Date.now();
    const { shardId, tenantId, shardTypeId, shard } = job.data;

    try {
      this.monitoring.trackEvent('opportunity-auto-linking-worker.started', {
        jobId: job.id,
        shardId,
        tenantId,
        shardTypeId,
      });

      // Only process if this is a new shard (revisionNumber === 1)
      if (shard.revisionNumber !== 1) {
        this.monitoring.trackEvent('opportunity-auto-linking-worker.skipped', {
          jobId: job.id,
          shardId,
          reason: 'not_first_revision',
        });
        return;
      }

      // Execute auto-linking
      await this.autoLinkingService.processShardCreated(shard);

      // If this is an opportunity shard, queue risk evaluation
      const shardType = await this.shardTypeRepository.findById(shardTypeId, tenantId);
      if (shardType?.name === CORE_SHARD_TYPE_NAMES.OPPORTUNITY) {
        try {
          const userId = shard.createdBy || shard.userId || 'system';
          const riskEvaluationMessage: RiskEvaluationMessage = {
            opportunityId: shardId,
            tenantId,
            userId,
            trigger: 'shard_created',
            priority: 'normal',
            options: {
              includeHistorical: true,
              includeAI: true,
              includeSemanticDiscovery: true,
            },
            timestamp: new Date(),
          };

          await this.queueProducer.enqueueRiskEvaluation(riskEvaluationMessage);
          this.monitoring.trackEvent('opportunity-auto-linking-worker.risk_evaluation_queued', {
            jobId: job.id,
            shardId,
            tenantId,
            opportunityId: shardId,
          });
        } catch (error) {
          // Log but don't fail - risk evaluation queueing is optional
          this.monitoring.trackException(error as Error, {
            context: 'OpportunityAutoLinkingWorker.processShardCreated.queueRiskEvaluation',
            jobId: job.id,
            shardId,
            tenantId,
          });
        }
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('opportunity-auto-linking-worker.completed', {
        jobId: job.id,
        shardId,
        tenantId,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackException(error as Error, {
        context: 'OpportunityAutoLinkingWorker.processShardCreated',
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
    await this.queueProducer.close();
  }
}


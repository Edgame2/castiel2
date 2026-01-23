/**
 * Risk Evaluation Worker
 * 
 * Consumes risk-evaluation events and processes risk evaluations
 * asynchronously for opportunities.
 */

import { Job } from 'bullmq';
import { BaseWorker, getWorkerConfigFromEnv, DEFAULT_WORKER_CONFIG } from '@castiel/queue';
import type { Redis, Cluster } from 'ioredis';
import { QueueName } from '@castiel/queue';
import type { RiskEvaluationMessage } from '@castiel/queue';
import { CosmosClient } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  ShardRepository,
  ShardTypeRepository,
  ShardRelationshipService,
  RiskCatalogService,
  RiskEvaluationService,
} from '@castiel/api-core';
import { createRedisConnection } from '@castiel/queue';

interface RiskEvaluationWorkerConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  openaiEndpoint?: string;
  openaiKey?: string;
}

export class RiskEvaluationWorker extends BaseWorker<RiskEvaluationMessage> {
  private cosmosClient: CosmosClient;
  private config: RiskEvaluationWorkerConfig;
  private riskEvaluationService: RiskEvaluationService;

  constructor(
    config: RiskEvaluationWorkerConfig,
    monitoring: IMonitoringProvider,
    redis: Redis | Cluster
  ) {
    // Get standardized worker config from environment
    const workerConfig = getWorkerConfigFromEnv('risk-evaluations', {
      ...DEFAULT_WORKER_CONFIG,
      concurrency: parseInt(process.env.RISK_EVALUATION_CONCURRENCY || '3', 10),
    });

    // Initialize base worker
    super(
      {
        queueName: QueueName.RISK_EVALUATIONS,
        redis,
        monitoring,
        concurrency: workerConfig.concurrency,
        removeOnComplete: workerConfig.removeOnComplete,
        removeOnFail: workerConfig.removeOnFail,
        workerName: 'risk-evaluation-worker',
      },
      async (job: Job<RiskEvaluationMessage>) => {
        return this.processRiskEvaluation(job);
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
    const shardTypeRepository = new ShardTypeRepository(monitoring);
    const relationshipService = new ShardRelationshipService(
      monitoring,
      shardRepository
    );
    const riskCatalogService = new RiskCatalogService(
      monitoring,
      shardRepository,
      shardTypeRepository
    );

    // Initialize RiskEvaluationService
    this.riskEvaluationService = new RiskEvaluationService(
      monitoring,
      shardRepository,
      shardTypeRepository,
      relationshipService,
      riskCatalogService,
      undefined, // vectorSearchService - optional
      undefined, // insightService - optional
      undefined  // serviceBusService - optional
    );
  }

  /**
   * Override to provide custom job context
   */
  protected getJobContext(job: Job<RiskEvaluationMessage>): Record<string, any> {
    return {
      ...super.getJobContext(job),
      opportunityId: job.data.opportunityId,
      userId: job.data.userId,
      trigger: job.data.trigger,
      priority: job.data.priority,
    };
  }

  private async processRiskEvaluation(
    job: Job<RiskEvaluationMessage>
  ): Promise<void> {
    const startTime = Date.now();
    const { opportunityId, tenantId, userId, trigger, priority, options } = job.data;

    try {
      this.monitoring.trackEvent('risk-evaluation-worker.started', {
        jobId: job.id,
        opportunityId,
        tenantId,
        trigger,
        priority,
      });

      // Execute risk evaluation using RiskEvaluationService
      const evaluation = await this.riskEvaluationService.evaluateOpportunity(
        opportunityId,
        tenantId,
        userId,
        {
          includeHistorical: options.includeHistorical,
          includeAI: options.includeAI,
          includeSemanticDiscovery: options.includeSemanticDiscovery,
        }
      );

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('risk-evaluation-worker.completed', {
        jobId: job.id,
        opportunityId,
        tenantId,
        duration,
        risksDetected: evaluation.risks?.length || 0,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackException(error as Error, {
        context: 'RiskEvaluationWorker.processRiskEvaluation',
        jobId: job.id,
        opportunityId,
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




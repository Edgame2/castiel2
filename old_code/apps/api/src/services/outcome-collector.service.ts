/**
 * Outcome Collector Service
 * Collects prediction outcomes for adaptive learning
 * Supports real-time and batch collection
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import {
  LearningOutcome,
  ServiceType,
  Context,
} from '../types/adaptive-learning.types.js';
import { contextKeyGenerator } from '../utils/context-key-generator.js';

export interface PredictionRecord {
  predictionId: string;
  tenantId: string;
  serviceType: ServiceType;
  contextKey: string;
  prediction: any;
  componentScores: Record<string, number>;
  weights: Record<string, number>;
  timestamp: Date;
}

export interface OutcomeRecord {
  predictionId: string;
  tenantId: string;
  actualOutcome: number; // 0-1: success/failure or performance metric
  outcomeType: 'success' | 'failure' | 'partial';
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Outcome Collector Service
 */
export class OutcomeCollectorService {
  private client: CosmosClient;
  private database: Database;
  private outcomesContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private predictionQueue: Map<string, PredictionRecord> = new Map();

  constructor(cosmosClient: CosmosClient, redis?: Redis, monitoring?: IMonitoringProvider) {
    this.redis = redis;
    this.monitoring = monitoring;

    // Initialize Cosmos client
    const connectionPolicy: ConnectionPolicy = {
      connectionMode: 'Direct' as any, // Best performance (ConnectionMode enum not available in this version)
      requestTimeout: 30000,
      enableEndpointDiscovery: true,
      retryOptions: {
        maxRetryAttemptCount: 9,
        fixedRetryIntervalInMilliseconds: 0,
        maxWaitTimeInSeconds: 30,
      } as RetryOptions,
    };

    this.client = cosmosClient || new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
      connectionPolicy,
    });

    this.database = this.client.database(config.cosmosDb.databaseId);
    this.outcomesContainer = this.database.container(config.cosmosDb.containers.learningOutcomes);

    // Start batch processor
    this.startBatchProcessor();
  }

  /**
   * Record prediction (non-blocking, <100ms target)
   */
  async recordPrediction(
    tenantId: string,
    serviceType: ServiceType,
    context: Context,
    prediction: any,
    componentScores: Record<string, number>,
    weights: Record<string, number>
  ): Promise<string> {
    const predictionId = uuidv4();
    const contextKey = contextKeyGenerator.generateSimple(context);

    const predictionRecord: PredictionRecord = {
      predictionId,
      tenantId,
      serviceType,
      contextKey,
      prediction,
      componentScores,
      weights,
      timestamp: new Date(),
    };

    // Store in memory queue for batch processing
    this.predictionQueue.set(predictionId, predictionRecord);

    // For high-value tenants, also store immediately in Redis for fast access
    if (this.redis && this.isHighValueTenant(tenantId)) {
      try {
        const key = `prediction:${tenantId}:${predictionId}`;
        await this.redis.setex(key, 3600, JSON.stringify(predictionRecord)); // 1 hour TTL
      } catch (error) {
        // Non-blocking, continue even if Redis fails
        this.monitoring?.trackException(error as Error, { operation: 'recordPrediction.redis' });
      }
    }

    this.monitoring?.trackEvent('outcome_collector.prediction_recorded', {
      tenantId,
      serviceType,
      predictionId,
    });

    return predictionId;
  }

  /**
   * Record outcome (real-time for high-value tenants, batch for others)
   */
  async recordOutcome(
    predictionId: string,
    tenantId: string,
    actualOutcome: number,
    outcomeType: 'success' | 'failure' | 'partial' = 'success',
    metadata?: Record<string, any>
  ): Promise<void> {
    const outcomeRecord: OutcomeRecord = {
      predictionId,
      tenantId,
      actualOutcome,
      outcomeType,
      timestamp: new Date(),
      metadata,
    };

    // Get prediction record
    let predictionRecord = this.predictionQueue.get(predictionId);
    if (!predictionRecord && this.redis) {
      try {
        const cached = await this.redis.get(`prediction:${tenantId}:${predictionId}`);
        if (cached) {
          predictionRecord = JSON.parse(cached);
        }
      } catch (error) {
        // Continue without prediction record
      }
    }

    if (!predictionRecord) {
      this.monitoring?.trackEvent('outcome_collector.prediction_not_found', {
        tenantId,
        predictionId,
      });
      return;
    }

    // Create learning outcome
    const learningOutcome: LearningOutcome = {
      id: uuidv4(),
      tenantId,
      serviceType: predictionRecord.serviceType,
      contextKey: predictionRecord.contextKey,
      predictionId,
      prediction: predictionRecord.prediction,
      actualOutcome,
      componentScores: predictionRecord.componentScores,
      weights: predictionRecord.weights,
      timestamp: new Date(),
      outcomeType,
    };

    // Real-time processing for high-value tenants
    if (this.isHighValueTenant(tenantId)) {
      try {
        await this.outcomesContainer.items.create(learningOutcome);
        this.monitoring?.trackEvent('outcome_collector.outcome_recorded_realtime', {
          tenantId,
          predictionId,
        });
      } catch (error) {
        this.monitoring?.trackException(error as Error, { operation: 'recordOutcome.realtime' });
        // Fall back to batch processing
        await this.queueForBatch(learningOutcome);
      }
    } else {
      // Batch processing for regular tenants
      await this.queueForBatch(learningOutcome);
    }

    // Remove from queue
    this.predictionQueue.delete(predictionId);
    if (this.redis) {
      await this.redis.del(`prediction:${tenantId}:${predictionId}`);
    }
  }

  /**
   * Queue outcome for batch processing
   */
  private async queueForBatch(outcome: LearningOutcome): Promise<void> {
    // Store in Redis list for batch processing
    if (this.redis) {
      try {
        const key = `outcome_queue:${outcome.tenantId}`;
        await this.redis.lpush(key, JSON.stringify(outcome));
        await this.redis.ltrim(key, 0, 9999); // Keep last 10k
      } catch (error) {
        this.monitoring?.trackException(error as Error, { operation: 'queueForBatch' });
      }
    }
  }

  /**
   * Process batch outcomes (called periodically)
   */
  async processBatchOutcomes(tenantId?: string): Promise<number> {
    let processed = 0;

    try {
      if (!this.redis) {
        return 0;
      }

      const tenantIds = tenantId ? [tenantId] : await this.getTenantIdsWithQueuedOutcomes();

      for (const tid of tenantIds) {
        const key = `outcome_queue:${tid}`;
        const outcomes = await this.redis.lrange(key, 0, 99); // Process 100 at a time

        if (outcomes.length === 0) {
          continue;
        }

        // Batch insert to Cosmos DB
        const learningOutcomes: LearningOutcome[] = outcomes.map((o) => JSON.parse(o));

        for (const outcome of learningOutcomes) {
          try {
            await this.outcomesContainer.items.create(outcome);
            processed++;
          } catch (error) {
            this.monitoring?.trackException(error as Error, {
              operation: 'processBatchOutcomes',
              tenantId: tid,
              predictionId: outcome.predictionId,
            });
          }
        }

        // Remove processed outcomes
        if (processed > 0) {
          await this.redis.ltrim(key, outcomes.length, -1);
        }
      }
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'processBatchOutcomes' });
    }

    return processed;
  }

  /**
   * Get tenant IDs with queued outcomes
   */
  private async getTenantIdsWithQueuedOutcomes(): Promise<string[]> {
    if (!this.redis) {
      return [];
    }

    try {
      const keys = await this.redis.keys('outcome_queue:*');
      return keys.map((key) => key.replace('outcome_queue:', ''));
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'getTenantIdsWithQueuedOutcomes' });
      return [];
    }
  }

  /**
   * Check if tenant is high-value (for real-time processing)
   */
  private isHighValueTenant(tenantId: string): boolean {
    // TODO: Implement logic to determine high-value tenants
    // For now, return false (use batch processing)
    return false;
  }

  /**
   * Start batch processor (runs every 5 minutes)
   */
  private startBatchProcessor(): void {
    setInterval(async () => {
      try {
        const processed = await this.processBatchOutcomes();
        if (processed > 0) {
          this.monitoring?.trackEvent('outcome_collector.batch_processed', {
            count: processed,
          });
        }
      } catch (error) {
        this.monitoring?.trackException(error as Error, { operation: 'batchProcessor' });
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
}

/**
 * Adaptive Learning Rollout Service
 * Gradually applies learned parameters with monitoring and automatic rollback
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { FeatureFlagService } from './feature-flag.service.js';
import {
  ComponentWeightLearning,
  ServiceType,
  RollbackDecision,
} from '../types/adaptive-learning.types.js';
import { statisticalValidator } from '../utils/statistical-validator.js';

export interface RolloutConfig {
  enabled: boolean;
  tenants: {
    [tenantId: string]: {
      enabled: boolean;
      rolloutPercentage: number; // 0-100
      services: {
        risk: boolean;
        forecast: boolean;
        recommendations: boolean;
      };
    };
  };
  fallbackToDefaults: boolean;
  minimumExamplesBeforeUse: number;
}

export interface RolloutStage {
  stage: number;
  name: string;
  learnedWeight: number; // 0-1: How much to use learned params
  defaultWeight: number; // 0-1: How much to use defaults
  duration: number; // Days to stay in this stage
}

const ROLLOUT_SCHEDULE: RolloutStage[] = [
  { stage: 1, name: 'Week 9', learnedWeight: 0.10, defaultWeight: 0.90, duration: 7 },
  { stage: 2, name: 'Week 10', learnedWeight: 0.30, defaultWeight: 0.70, duration: 7 },
  { stage: 3, name: 'Week 11', learnedWeight: 0.50, defaultWeight: 0.50, duration: 7 },
  { stage: 4, name: 'Week 12', learnedWeight: 0.80, defaultWeight: 0.20, duration: 7 },
  { stage: 5, name: 'Week 13+', learnedWeight: 0.95, defaultWeight: 0.05, duration: Infinity },
];

/**
 * Adaptive Learning Rollout Service
 */
export class AdaptiveLearningRolloutService {
  private client: CosmosClient;
  private database: Database;
  private weightsContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private featureFlagService?: FeatureFlagService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    featureFlagService?: FeatureFlagService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.featureFlagService = featureFlagService;

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
    this.weightsContainer = this.database.container(config.cosmosDb.containers.adaptiveWeights);
  }

  /**
   * Get rollout percentage for tenant/service
   */
  async getRolloutPercentage(
    tenantId: string,
    serviceType: ServiceType
  ): Promise<number> {
    // Check feature flag
    if (this.featureFlagService) {
      const flagName = `adaptive_learning_${serviceType}`;
      const enabled = await this.featureFlagService.isEnabled(flagName, { tenantId });
      if (!enabled) {
        return 0; // Feature disabled
      }
    }

    // Get current rollout stage (based on time since rollout started)
    // For now, use a simple time-based approach
    const rolloutStartDate = new Date('2025-01-01'); // TODO: Get from config
    const daysSinceStart = Math.floor((Date.now() - rolloutStartDate.getTime()) / (24 * 60 * 60 * 1000));

    // Determine stage based on days
    let currentStage = ROLLOUT_SCHEDULE[0];
    for (const stage of ROLLOUT_SCHEDULE) {
      if (daysSinceStart >= (stage.stage - 1) * 7) {
        currentStage = stage;
      } else {
        break;
      }
    }

    return currentStage.learnedWeight;
  }

  /**
   * Check if rollback is needed
   */
  async shouldRollback(
    tenantId: string,
    contextKey: string,
    serviceType: ServiceType
  ): Promise<RollbackDecision> {
    try {
      // Get learning record
      const id = `${tenantId}:${contextKey}:${serviceType}`;
      const { resource: learning } = await this.weightsContainer.item(id, tenantId).read<ComponentWeightLearning>();

      if (!learning) {
        return { shouldRollback: false };
      }

      // Criterion 1: Statistical performance degradation (>5%)
      const degradation = learning.performance.baseline - learning.performance.accuracy;
      const degradationPercentage = learning.performance.baseline > 0
        ? degradation / learning.performance.baseline
        : 0;

      if (degradationPercentage > 0.05) {
        // Verify statistical significance
        const baselinePerf = [learning.performance.baseline];
        const currentPerf = [learning.performance.accuracy];
        const validation = await statisticalValidator.validateDegradation(
          baselinePerf,
          currentPerf,
          0.05
        );

        if (validation.isSignificant) {
          return {
            shouldRollback: true,
            reason: `Performance degraded by ${(degradationPercentage * 100).toFixed(1)}% (statistically significant)`,
            degradation: degradationPercentage,
          };
        }
      }

      // Criterion 2: User-reported issues (≥3 reports)
      // TODO: Integrate with user feedback system
      const userIssues = 0; // Placeholder
      if (userIssues >= 3) {
        return {
          shouldRollback: true,
          reason: `${userIssues} user-reported issues`,
          userIssues,
        };
      }

      // Criterion 3: Anomaly detection (score > 0.8)
      // TODO: Integrate with anomaly detection service
      const anomalyScore = 0; // Placeholder
      if (anomalyScore > 0.8) {
        return {
          shouldRollback: true,
          reason: `Anomalous behavior detected (score: ${anomalyScore.toFixed(2)})`,
          anomalyScore,
        };
      }

      // Criterion 4: Consecutive failures (>70% failure rate in last 20 predictions)
      // TODO: Query recent outcomes
      const failureRate = 0; // Placeholder
      if (failureRate > 0.7) {
        return {
          shouldRollback: true,
          reason: `High failure rate: ${(failureRate * 100).toFixed(1)}%`,
          failureRate,
        };
      }

      return { shouldRollback: false };
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'shouldRollback' });
      return { shouldRollback: false };
    }
  }

  /**
   * Execute rollback to previous version
   */
  async executeRollback(
    tenantId: string,
    contextKey: string,
    serviceType: ServiceType,
    reason: string
  ): Promise<void> {
    try {
      // Get learning record
      const id = `${tenantId}:${contextKey}:${serviceType}`;
      const { resource: learning } = await this.weightsContainer.item(id, tenantId).read<ComponentWeightLearning>();

      if (!learning || !learning.previousVersion) {
        this.monitoring?.trackEvent('rollback.failed', {
          tenantId,
          contextKey,
          serviceType,
          reason: 'No previous version available',
        });
        return;
      }

      // Get previous version
      const { resource: previousVersion } = await this.weightsContainer
        .item(learning.previousVersion, tenantId)
        .read<ComponentWeightLearning>();

      if (!previousVersion) {
        this.monitoring?.trackEvent('rollback.failed', {
          tenantId,
          contextKey,
          serviceType,
          reason: 'Previous version not found',
        });
        return;
      }

      // Restore previous weights
      learning.activeWeights = previousVersion.activeWeights;
      learning.learnedWeights = previousVersion.learnedWeights;
      learning.blendRatio = previousVersion.blendRatio;
      learning.rolledBack = true;
      learning.rollbackReason = reason;
      learning.rollbackAt = new Date();
      learning.version += 1;

      await this.weightsContainer.items.upsert(learning);

      // Invalidate cache
      if (this.redis) {
        const cacheKey = `learned_params:${tenantId}:weights:${contextKey}:${serviceType}`;
        await this.redis.del(cacheKey);
      }

      // Alert team
      this.monitoring?.trackEvent('rollback.executed', {
        tenantId,
        contextKey,
        serviceType,
        reason,
        severity: 'high',
      });

      this.monitoring?.trackException(new Error(`Rolled back learned weights: ${reason}`), {
        operation: 'executeRollback',
        tenantId,
        contextKey,
        serviceType,
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'executeRollback' });
      throw error;
    }
  }
}

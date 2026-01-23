/**
 * Adaptive Model Selection Service
 * Learns optimal model selection criteria and auto-graduates models
 * (Global → Industry → Tenant-specific)
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import {
  ModelSelectionLearning,
  ServiceType,
  Context,
  ModelMetadata,
} from '../types/adaptive-learning.types.js';
import { contextKeyGenerator } from '../utils/context-key-generator.js';
import { statisticalValidator } from '../utils/statistical-validator.js';
import { cacheKeys, CacheTTL } from '../utils/cache-keys.js';

/**
 * Adaptive Model Selection Service
 */
export class AdaptiveModelSelectionService {
  private client: CosmosClient;
  private database: Database;
  private selectionContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;

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
    this.selectionContainer = this.database.container(config.cosmosDb.containers.modelSelectionHistory);
  }

  /**
   * Select best model for tenant/context
   * Returns: 'global' | 'industry' | 'tenant'
   */
  async selectModel(
    tenantId: string,
    modelType: ServiceType,
    context: Context
  ): Promise<{ model: 'global' | 'industry' | 'tenant'; reason: string; metadata?: ModelMetadata }> {
    const contextKey = contextKeyGenerator.generateSimple(context);

    // Try cache first
    const cacheKey = `learned_params:${tenantId}:model_sel:${contextKey}:${modelType}`;
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.monitoring?.trackMetric('adaptive_model_selection.cache_hit', 1, { modelType });
          const cachedResult = JSON.parse(cached);
          return cachedResult;
        }
      } catch (error) {
        this.monitoring?.trackException(error as Error, { operation: 'selectModel.cache' });
      }
    }

    // Get learning record
    const learning = await this.getOrCreateLearning(tenantId, modelType, contextKey);

    // Check graduation state
    if (learning.graduationState.readyForGraduation) {
      const nextStage = this.getNextStage(learning.graduationState.stage);
      if (nextStage && learning.models[nextStage]) {
        const result = {
          model: nextStage,
          reason: `Auto-graduated to ${nextStage} model (${learning.graduationState.examples} examples, ${(learning.performance.improvement * 100).toFixed(1)}% improvement)`,
          metadata: learning.models[nextStage],
        };

        // Cache result
        if (this.redis) {
          await this.redis.setex(cacheKey, CacheTTL.ADAPTIVE_MODEL_SEL, JSON.stringify(result));
        }

        return result;
      }
    }

    // Use best model based on performance
    const bestModel = learning.performance.bestModel;
    const validModelKey = (bestModel === 'global' || bestModel === 'industry' || bestModel === 'tenant') 
      ? bestModel 
      : 'global';
    const result = {
      model: validModelKey as 'global' | 'industry' | 'tenant',
      reason: `Best performing model: ${bestModel} (${(learning.performance.globalModelAccuracy * 100).toFixed(1)}% accuracy)`,
      metadata: learning.models[validModelKey] || learning.models.global,
    };

    // Cache result
    if (this.redis) {
      await this.redis.setex(cacheKey, CacheTTL.ADAPTIVE_MODEL_SEL, JSON.stringify(result));
    }

    return result;
  }

  /**
   * Learn selection criteria from model performance
   */
  async learnSelectionCriteria(
    tenantId: string,
    modelType: ServiceType,
    context: Context,
    performance: {
      globalAccuracy: number;
      industryAccuracy?: number;
      tenantAccuracy?: number;
      examples: number;
    }
  ): Promise<void> {
    const contextKey = contextKeyGenerator.generateSimple(context);
    const learning = await this.getOrCreateLearning(tenantId, modelType, contextKey);

    // Update model performance
    learning.models.global.accuracy = performance.globalAccuracy;
    learning.performance.globalModelAccuracy = performance.globalAccuracy;

    if (performance.industryAccuracy !== undefined) {
      if (!learning.models.industry) {
        learning.models.industry = {
          modelId: `industry-${context.industry || 'unknown'}`,
          version: '1.0',
          accuracy: performance.industryAccuracy,
          lastTrained: new Date(),
          examplesUsed: performance.examples,
        };
      } else {
        learning.models.industry.accuracy = performance.industryAccuracy;
        learning.models.industry.examplesUsed = performance.examples;
      }
    }

    if (performance.tenantAccuracy !== undefined) {
      if (!learning.models.tenant) {
        learning.models.tenant = {
          modelId: `tenant-${tenantId}`,
          version: '1.0',
          accuracy: performance.tenantAccuracy,
          lastTrained: new Date(),
          examplesUsed: performance.examples,
        };
      } else {
        learning.models.tenant.accuracy = performance.tenantAccuracy;
        learning.models.tenant.examplesUsed = performance.examples;
      }
    }

    // Determine best model
    const models = [
      { name: 'global', accuracy: learning.models.global.accuracy },
      ...(learning.models.industry ? [{ name: 'industry', accuracy: learning.models.industry.accuracy }] : []),
      ...(learning.models.tenant ? [{ name: 'tenant', accuracy: learning.models.tenant.accuracy }] : []),
    ];

    models.sort((a, b) => b.accuracy - a.accuracy);
    learning.performance.bestModel = models[0].name;
    learning.performance.improvement = (models[0].accuracy - learning.models.global.accuracy) / learning.models.global.accuracy;

    // Update graduation state
    learning.graduationState.examples = performance.examples;
    learning.graduationState.readyForGraduation = this.checkGraduationReadiness(learning);

    // Learn selection criteria (data sufficiency and performance improvement thresholds)
    // These are learned from historical patterns
    if (learning.graduationState.readyForGraduation) {
      // Update learned thresholds based on when graduation became ready
      learning.selectionCriteria.dataSufficiency = Math.min(
        learning.selectionCriteria.dataSufficiency,
        performance.examples
      );
      learning.selectionCriteria.performanceImprovement = Math.max(
        learning.selectionCriteria.performanceImprovement,
        learning.performance.improvement
      );
    }

    learning.updatedAt = new Date();
    // Version is optional, increment if it exists
    if ('version' in learning && typeof (learning as any).version === 'number') {
      (learning as any).version = ((learning as any).version || 1) + 1;
    }

    // Save to Cosmos DB
    await this.selectionContainer.items.upsert(learning);

    // Invalidate cache
    if (this.redis) {
      const cacheKey = `learned_params:${tenantId}:model_sel:${contextKey}:${modelType}`;
      await this.redis.del(cacheKey);
    }
  }

  /**
   * Check if model is ready for graduation to next stage
   */
  async checkGraduation(
    tenantId: string,
    modelType: ServiceType,
    specialization: 'industry' | 'tenant'
  ): Promise<{ ready: boolean; reason?: string; criteria: any }> {
    // This would check against learned criteria
    // For now, use default thresholds that will be learned
    const defaultDataSufficiency = 3000; // Will be learned
    const defaultPerformanceImprovement = 0.05; // 5%, will be learned

    // TODO: Get actual learning record and use learned criteria
    return {
      ready: false,
      reason: 'Graduation check not yet implemented with learned criteria',
      criteria: {
        dataSufficiency: defaultDataSufficiency,
        performanceImprovement: defaultPerformanceImprovement,
      },
    };
  }

  /**
   * Get or create learning record
   */
  private async getOrCreateLearning(
    tenantId: string,
    modelType: ServiceType,
    contextKey: string
  ): Promise<ModelSelectionLearning> {
    const id = `${tenantId}:${modelType}:${contextKey}`;

    try {
      const { resource } = await this.selectionContainer.item(id, tenantId).read<ModelSelectionLearning>();
      if (resource) {
        return resource;
      }
    } catch (error) {
      // Not found, create new
    }

    // Create new learning record
    const now = new Date();
    const learning: ModelSelectionLearning = {
      id,
      tenantId,
      modelType,
      contextKey,
      models: {
        global: {
          modelId: `global-${modelType}`,
          version: '1.0',
          accuracy: 0.5, // Default baseline
          lastTrained: now,
          examplesUsed: 0,
        },
      },
      selectionCriteria: {
        dataSufficiency: 3000, // Default, will be learned
        performanceImprovement: 0.05, // 5%, will be learned
      },
      performance: {
        globalModelAccuracy: 0.5,
        bestModel: 'global',
        improvement: 0,
      },
      graduationState: {
        stage: 'global',
        examples: 0,
        readyForGraduation: false,
      },
      createdAt: now,
      updatedAt: now,
    };

    await this.selectionContainer.items.create(learning);
    return learning;
  }

  /**
   * Check if ready for graduation
   */
  private checkGraduationReadiness(learning: ModelSelectionLearning): boolean {
    const currentStage = learning.graduationState.stage;
    const examples = learning.graduationState.examples;

    // Check data sufficiency
    if (examples < learning.selectionCriteria.dataSufficiency) {
      return false;
    }

    // Check performance improvement
    if (learning.performance.improvement < learning.selectionCriteria.performanceImprovement) {
      return false;
    }

    // Check if next stage model exists
    const nextStage = this.getNextStage(currentStage);
    if (!nextStage) {
      return false; // Already at highest stage
    }

    // Check if next stage model has better performance
    if (nextStage === 'industry' && learning.models.industry) {
      return learning.models.industry.accuracy > learning.models.global.accuracy;
    }

    if (nextStage === 'tenant' && learning.models.tenant) {
      return learning.models.tenant.accuracy > learning.models.global.accuracy;
    }

    return false;
  }

  /**
   * Get next graduation stage
   */
  private getNextStage(current: 'global' | 'industry' | 'tenant'): 'industry' | 'tenant' | null {
    switch (current) {
      case 'global':
        return 'industry';
      case 'industry':
        return 'tenant';
      case 'tenant':
        return null; // Already at highest stage
    }
  }
}

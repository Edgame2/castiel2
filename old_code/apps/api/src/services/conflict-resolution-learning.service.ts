/**
 * Conflict Resolution Learning Service
 * Learns optimal conflict resolution strategies when AI components disagree
 * 
 * Replaces hardcoded resolution strategies (highest_confidence, rule_priority, merged)
 * with learned strategies that adapt to each tenant and context.
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { contextKeyGenerator } from '../utils/context-key-generator.js';
import { statisticalValidator } from '../utils/statistical-validator.js';
import type {
  ConflictResolutionLearning,
  ConflictResolutionStrategy,
  Context,
  ServiceType,
  LearningStage,
  ValidationResult,
  ValidationCriteria,
  TenantValue,
} from '../types/adaptive-learning.types.js';
import { LEARNING_CURVE } from '../types/adaptive-learning.types.js';
import { CacheTTL } from '../utils/cache-keys.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Default conflict resolution strategies
 */
const DEFAULT_RESOLUTION_STRATEGIES: Record<string, ConflictResolutionStrategy> = {
  'rule:historical': 'rule_priority',
  'rule:semantic': 'rule_priority',
  'rule:ai': 'rule_priority',
  'historical:semantic': 'highest_confidence',
  'historical:ai': 'highest_confidence',
  'semantic:ai': 'merged',
} as const;

/**
 * Default resolution strategy (fallback)
 */
const DEFAULT_STRATEGY: ConflictResolutionStrategy = 'highest_confidence';

/**
 * Thompson Sampling Bandit for Strategy Selection
 */
class ThompsonSamplingBandit {
  private alphas: Map<string, number> = new Map(); // Successes
  private betas: Map<string, number> = new Map();  // Failures

  /**
   * Select strategy using Thompson Sampling
   */
  selectStrategy(strategies: ConflictResolutionStrategy[]): ConflictResolutionStrategy {
    if (strategies.length === 0) {
      return DEFAULT_STRATEGY;
    }

    if (strategies.length === 1) {
      return strategies[0];
    }

    // Initialize if needed
    strategies.forEach(strategy => {
      if (!this.alphas.has(strategy)) {
        this.alphas.set(strategy, 1); // Prior: 1 success
        this.betas.set(strategy, 1);  // Prior: 1 failure
      }
    });

    // Sample from Beta distribution for each strategy
    const samples: Array<{ strategy: ConflictResolutionStrategy; sample: number }> = [];
    for (const strategy of strategies) {
      const alpha = this.alphas.get(strategy)!;
      const beta = this.betas.get(strategy)!;
      const sample = this.sampleBeta(alpha, beta);
      samples.push({ strategy, sample });
    }

    // Select strategy with highest sample
    samples.sort((a, b) => b.sample - a.sample);
    return samples[0].strategy;
  }

  /**
   * Update with outcome
   */
  updateWithOutcome(strategy: ConflictResolutionStrategy, success: boolean): void {
    const alpha = this.alphas.get(strategy) || 1;
    const beta = this.betas.get(strategy) || 1;

    if (success) {
      this.alphas.set(strategy, alpha + 1);
    } else {
      this.betas.set(strategy, beta + 1);
    }
  }

  /**
   * Get state for a strategy
   */
  getState(strategy: ConflictResolutionStrategy): { alpha: number; beta: number; expectedValue: number } {
    const alpha = this.alphas.get(strategy) || 1;
    const beta = this.betas.get(strategy) || 1;
    const expectedValue = alpha / (alpha + beta);
    return { alpha, beta, expectedValue };
  }

  /**
   * Sample from Beta distribution
   */
  private sampleBeta(alpha: number, beta: number): number {
    // Simplified Beta sampling using Gamma approximation
    const gamma1 = this.sampleGamma(alpha, 1);
    const gamma2 = this.sampleGamma(beta, 1);
    return gamma1 / (gamma1 + gamma2);
  }

  /**
   * Sample from Gamma distribution (simplified)
   */
  private sampleGamma(shape: number, scale: number): number {
    // Simplified: use normal approximation for large shapes
    if (shape > 10) {
      const mean = shape * scale;
      const variance = shape * scale * scale;
      return Math.max(0.001, this.sampleNormal(mean, Math.sqrt(variance)));
    }
    // For small shapes, use simple approximation
    return shape * scale * (0.5 + Math.random() * 0.5);
  }

  /**
   * Sample from Normal distribution
   */
  private sampleNormal(mean: number, stdDev: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  }
}

/**
 * Conflict Resolution Learning Service
 */
export class ConflictResolutionLearningService {
  private client: CosmosClient;
  private database: Database;
  private learningContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private bandits: Map<string, ThompsonSamplingBandit> = new Map();

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
    this.learningContainer = this.database.container(config.cosmosDb.containers.conflictResolutionLearning);
  }

  /**
   * Get optimal resolution strategy for a conflict
   */
  async getResolutionStrategy(
    tenantId: string,
    context: Context,
    method1: string,
    method2: string
  ): Promise<ConflictResolutionStrategy> {
    const contextKey = contextKeyGenerator.generateForRisk(context);
    const cacheKey = `conflict_resolution:${tenantId}:${contextKey}:${method1}:${method2}`;

    // Try cache first
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.monitoring?.trackMetric('conflict_resolution.cache_hit', 1);
          return cached as ConflictResolutionStrategy;
        }
      } catch (error) {
        this.monitoring?.trackException(error as Error, { operation: 'getResolutionStrategy.cache' });
      }
    }

    // Get from Cosmos DB
    try {
      const learning = await this.getOrCreateLearning(tenantId, contextKey, method1, method2);
      const strategy = this.blendStrategy(learning);

      // Cache the result
      if (this.redis) {
        await this.redis.setex(cacheKey, CacheTTL.ADAPTIVE_WEIGHTS, strategy);
      }

      return strategy;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'getResolutionStrategy' });
      // Fallback to default
      return this.getDefaultStrategy(method1, method2);
    }
  }

  /**
   * Learn from conflict resolution outcome
   */
  async learnFromResolution(
    tenantId: string,
    context: Context,
    method1: string,
    method2: string,
    strategy: ConflictResolutionStrategy,
    outcome: number // 0-1: success/failure or performance metric
  ): Promise<void> {
    try {
      const contextKey = contextKeyGenerator.generateForRisk(context);
      const learning = await this.getOrCreateLearning(tenantId, contextKey, method1, method2);

      // Update Thompson Sampling bandit
      const banditKey = `${tenantId}:${contextKey}:${method1}:${method2}`;
      let bandit = this.bandits.get(banditKey);
      if (!bandit) {
        bandit = new ThompsonSamplingBandit();
        this.bandits.set(banditKey, bandit);
      }

      const success = outcome > 0.5; // Threshold for success
      bandit.updateWithOutcome(strategy, success);

      // Update learning record
      learning.examples += 1;
      learning.lastExampleTimestamp = new Date();

      // Calculate new learned strategy from bandit
      const availableStrategies: ConflictResolutionStrategy[] = [
        'highest_confidence',
        'rule_priority',
        'merged',
      ];
      const strategyScores: Array<{ strategy: ConflictResolutionStrategy; score: number }> = [];
      for (const strat of availableStrategies) {
        const state = bandit.getState(strat);
        strategyScores.push({ strategy: strat, score: state.expectedValue });
      }

      // Select best strategy
      strategyScores.sort((a, b) => b.score - a.score);
      learning.learnedStrategy = strategyScores[0].strategy;
      learning.activeStrategy = this.blendStrategy(learning);

      // Update learning rate
      // Default to medium tenant value - can be enhanced with actual tenant value lookup
      const tenantValue: TenantValue = 'medium'; // Could be determined from tenant metadata
      const performanceGain = learning.performance.improvement || 0;
      learning.learningRate = this.calculateLearningRate(
        learning.examples,
        tenantValue,
        performanceGain
      );

      // Update blend ratio based on learning curve
      const stage = this.getLearningStage(learning.examples);
      const curve = LEARNING_CURVE[stage];
      learning.blendRatio = curve.learnedWeight;

      // Update performance (simplified - would track actual outcomes)
      learning.performance.accuracy = learning.performance.accuracy * 0.9 + (success ? 1 : 0) * 0.1;

      // Save to Cosmos DB
      learning.version += 1;
      learning.updatedAt = new Date();
      learning.modifiedBy = 'system';

      await this.learningContainer.items.upsert(learning);

      // Invalidate cache
      if (this.redis) {
        const cacheKey = `conflict_resolution:${tenantId}:${contextKey}:${method1}:${method2}`;
        await this.redis.del(cacheKey);
      }

      this.monitoring?.trackEvent('conflict_resolution.learned', {
        tenantId,
        contextKey,
        method1,
        method2,
        strategy: learning.activeStrategy,
        examples: learning.examples,
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'learnFromResolution',
        tenantId,
      });
      // Don't throw - learning is non-critical
    }
  }

  /**
   * Get or create learning record
   */
  private async getOrCreateLearning(
    tenantId: string,
    contextKey: string,
    method1: string,
    method2: string
  ): Promise<ConflictResolutionLearning> {
    const id = `${tenantId}:${contextKey}:${method1}:${method2}`;

    try {
      const { resource } = await this.learningContainer.item(id, tenantId).read<ConflictResolutionLearning>();
      if (resource) {
        return resource;
      }
    } catch (error: any) {
      if (error.code !== 404) {
        throw error;
      }
    }

    // Create new learning record
    const defaultStrategy = this.getDefaultStrategy(method1, method2);
    const learning: ConflictResolutionLearning = {
      id,
      tenantId,
      contextKey,
      method1,
      method2,
      conflictType: `${method1}:${method2}`,
      defaultStrategy,
      activeStrategy: defaultStrategy,
      blendRatio: 0.0,
      examples: 0,
      lastExampleTimestamp: new Date(),
      learningRate: 0.1,
      performance: {
        accuracy: 0.5,
        baseline: 0.5,
        improvement: 0,
        confidenceInterval: {
          lower: 0.4,
          upper: 0.6,
        },
      },
      validated: false,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      modifiedBy: 'system',
      tags: [],
    };

    await this.learningContainer.items.create(learning);
    return learning;
  }

  /**
   * Blend default and learned strategy
   */
  private blendStrategy(learning: ConflictResolutionLearning): ConflictResolutionStrategy {
    if (learning.examples < 100) {
      return learning.defaultStrategy; // Bootstrap: use default
    }

    if (!learning.learnedStrategy) {
      return learning.defaultStrategy;
    }

    // Use learned strategy based on blend ratio
    const useLearned = Math.random() < learning.blendRatio;
    return useLearned ? learning.learnedStrategy : learning.defaultStrategy;
  }

  /**
   * Get default strategy for method pair
   */
  private getDefaultStrategy(method1: string, method2: string): ConflictResolutionStrategy {
    const key1 = `${method1}:${method2}`;
    const key2 = `${method2}:${method1}`;
    return DEFAULT_RESOLUTION_STRATEGIES[key1] || 
           DEFAULT_RESOLUTION_STRATEGIES[key2] || 
           DEFAULT_STRATEGY;
  }

  /**
   * Calculate learning rate
   */
  private calculateLearningRate(
    examples: number,
    tenantValue: TenantValue,
    performanceGain: number
  ): number {
    // Inverse decay: 1 / (1 + examples / decayFactor)
    const baseDecayFactor = 100;
    const valueMultipliers: Record<TenantValue, number> = {
      high: 1.5,
      medium: 1.0,
      low: 0.7,
    };
    const decayFactor = baseDecayFactor * valueMultipliers[tenantValue];
    const baseRate = 1 / (1 + examples / decayFactor);

    // Boost if performance is improving
    const performanceBoost = Math.min(0.2, performanceGain * 0.5);
    return Math.min(0.5, baseRate + performanceBoost);
  }

  /**
   * Get learning stage
   */
  private getLearningStage(examples: number): LearningStage {
    if (examples < 100) return 'bootstrap';
    if (examples < 500) return 'initial';
    if (examples < 1000) return 'transition';
    return 'mature';
  }
}

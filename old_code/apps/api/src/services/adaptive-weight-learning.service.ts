/**
 * Adaptive Weight Learning Service
 * Learns optimal component weights per tenant/context using Thompson Sampling
 * Replaces hardcoded weights with adaptive learning
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import {
  ComponentWeightLearning,
  ServiceType,
  Context,
  WeightUpdate,
  LearningStage,
  LEARNING_CURVE,
  DEFAULT_RISK_WEIGHTS,
  DEFAULT_RECOMMENDATION_WEIGHTS,
  DEFAULT_FORECAST_WEIGHTS,
  ThompsonSamplingState,
} from '../types/adaptive-learning.types.js';
import { contextKeyGenerator } from '../utils/context-key-generator.js';
import { statisticalValidator } from '../utils/statistical-validator.js';
import { cacheKeys, CacheTTL } from '../utils/cache-keys.js';

/**
 * Thompson Sampling Multi-Armed Bandit
 */
class ThompsonSamplingBandit {
  private states: Map<string, ThompsonSamplingState> = new Map();

  /**
   * Select component with highest sampled value
   */
  selectComponent(components: string[]): string {
    if (components.length === 0) {
      throw new Error('No components provided');
    }

    // Sample from each component's beta distribution
    const samples = components.map((comp) => {
      const state = this.states.get(comp) || { component: comp, alpha: 1, beta: 1, lastUpdated: new Date() };
      const sample = this.sampleBeta(state.alpha, state.beta);
      return { component: comp, sample };
    });

    // Select component with highest sample
    samples.sort((a, b) => b.sample - a.sample);
    return samples[0].component;
  }

  /**
   * Update component state with outcome
   */
  updateWithOutcome(component: string, success: boolean): void {
    const state = this.states.get(component) || {
      component,
      alpha: 1,
      beta: 1,
      lastUpdated: new Date(),
    };

    if (success) {
      state.alpha += 1;
    } else {
      state.beta += 1;
    }

    state.lastUpdated = new Date();
    this.states.set(component, state);
  }

  /**
   * Get current state for a component
   */
  getState(component: string): ThompsonSamplingState {
    return (
      this.states.get(component) || {
        component,
        alpha: 1,
        beta: 1,
        lastUpdated: new Date(),
      }
    );
  }

  /**
   * Sample from Beta distribution
   */
  private sampleBeta(alpha: number, beta: number): number {
    // Beta distribution sampling using gamma functions
    const gamma1 = this.sampleGamma(alpha, 1);
    const gamma2 = this.sampleGamma(beta, 1);
    const sum = gamma1 + gamma2;
    return sum === 0 ? 0.5 : gamma1 / sum;
  }

  /**
   * Sample from Gamma distribution (Marsaglia and Tsang method)
   */
  private sampleGamma(shape: number, scale: number): number {
    if (shape < 1) {
      // For shape < 1, use transformation
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x: number;
      let v: number;

      // Generate normal random variable
      do {
        x = this.sampleNormal();
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();

      if (u < 1 - 0.0331 * (x * x) * (x * x)) {
        return d * v * scale;
      }

      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v * scale;
      }
    }
  }

  /**
   * Sample from standard normal distribution (Box-Muller transform)
   */
  private sampleNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

/**
 * Adaptive Weight Learning Service
 */
export class AdaptiveWeightLearningService {
  private client: CosmosClient;
  private database: Database;
  private weightsContainer: Container;
  private outcomesContainer: Container;
  private historyContainer: Container;
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
    this.weightsContainer = this.database.container(config.cosmosDb.containers.adaptiveWeights);
    this.outcomesContainer = this.database.container(config.cosmosDb.containers.learningOutcomes);
    this.historyContainer = this.database.container(config.cosmosDb.containers.parameterHistory);
  }

  /**
   * Get weights for a specific tenant/context
   * Returns blended weights based on learning curve
   */
  async getWeights(
    tenantId: string,
    contextKey: string,
    serviceType: ServiceType
  ): Promise<Record<string, number>> {
    const cacheKey = `learned_params:${tenantId}:weights:${contextKey}:${serviceType}`;

    // Try cache first
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.monitoring?.trackMetric('adaptive_learning.cache_hit', 1, { serviceType });
          return JSON.parse(cached);
        }
      } catch (error) {
        this.monitoring?.trackException(error as Error, { operation: 'getWeights.cache' });
      }
    }

    // Get from Cosmos DB
    try {
      const learning = await this.getOrCreateLearning(tenantId, contextKey, serviceType);
      const weights = this.blendWeights(learning);

      // Cache the result
      if (this.redis) {
        await this.redis.setex(cacheKey, CacheTTL.ADAPTIVE_WEIGHTS, JSON.stringify(weights));
      }

      return weights;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'getWeights' });
      // Fallback to defaults
      return this.getDefaultWeights(serviceType);
    }
  }

  /**
   * Learn from outcome
   */
  async learnFromOutcome(
    tenantId: string,
    contextKey: string,
    serviceType: ServiceType,
    component: string,
    outcome: number // 0-1: success/failure or performance metric
  ): Promise<void> {
    try {
      // Get or create learning record
      const learning = await this.getOrCreateLearning(tenantId, contextKey, serviceType);

      // Update Thompson Sampling bandit
      const banditKey = `${tenantId}:${contextKey}:${serviceType}`;
      let bandit = this.bandits.get(banditKey);
      if (!bandit) {
        bandit = new ThompsonSamplingBandit();
        this.bandits.set(banditKey, bandit);
      }

      const success = outcome > 0.5; // Threshold for success
      bandit.updateWithOutcome(component, success);

      // Update learning record
      learning.examples += 1;
      learning.lastExampleTimestamp = new Date();

      // Calculate new learned weights from bandit
      const components = Object.keys(learning.defaultWeights);
      const newWeights: Record<string, number> = {};

      // Use Thompson Sampling to select components and derive weights
      const componentScores: Array<{ component: string; score: number }> = [];
      for (const comp of components) {
        const state = bandit.getState(comp);
        const expectedValue = state.alpha / (state.alpha + state.beta);
        componentScores.push({ component: comp, score: expectedValue });
      }

      // Normalize to sum to 1
      const totalScore = componentScores.reduce((sum, item) => sum + item.score, 0);
      for (const item of componentScores) {
        newWeights[item.component] = totalScore === 0 ? 1 / components.length : item.score / totalScore;
      }

      learning.learnedWeights = newWeights;

      // Update learning rate
      learning.learningRate = this.calculateLearningRate(
        learning.examples,
        'medium' as const, // TODO: Get tenant value
        0 // TODO: Get performance gain
      );

      // Update blend ratio based on learning curve
      const stage = this.getLearningStage(learning.examples);
      const curve = LEARNING_CURVE[stage];
      learning.blendRatio = curve.learnedWeight;

      // Blend weights
      learning.activeWeights = this.blendWeights(learning);

      // Update performance (simplified - in production, track actual performance)
      learning.performance.accuracy = outcome; // Simplified

      learning.updatedAt = new Date();
      learning.version += 1;

      // Save to Cosmos DB
      await this.weightsContainer.items.upsert(learning);

      // Invalidate cache
      if (this.redis) {
        const cacheKey = `learned_params:${tenantId}:weights:${contextKey}:${serviceType}`;
        await this.redis.del(cacheKey);
      }

      // Record outcome
      await this.recordOutcome(tenantId, contextKey, serviceType, component, outcome, newWeights);
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'learnFromOutcome' });
      throw error;
    }
  }

  /**
   * Get or create learning record
   */
  private async getOrCreateLearning(
    tenantId: string,
    contextKey: string,
    serviceType: ServiceType
  ): Promise<ComponentWeightLearning> {
    const id = `${tenantId}:${contextKey}:${serviceType}`;

    try {
      const { resource } = await this.weightsContainer.item(id, tenantId).read<ComponentWeightLearning>();
      if (resource) {
        return resource;
      }
    } catch (error) {
      // Not found, create new
    }

    // Create new learning record
    const defaultWeights = this.getDefaultWeights(serviceType);
    const now = new Date();

    const learning: ComponentWeightLearning = {
      id,
      tenantId,
      contextKey,
      serviceType,
      defaultWeights,
      learnedWeights: { ...defaultWeights },
      activeWeights: { ...defaultWeights },
      blendRatio: 0,
      examples: 0,
      lastExampleTimestamp: now,
      learningRate: 0.1,
      performance: {
        accuracy: 0,
        baseline: 0.5, // Default baseline
        improvement: 0,
        confidenceInterval: { lower: 0, upper: 0 },
      },
      validated: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      modifiedBy: 'system',
      tags: [],
    };

    await this.weightsContainer.items.create(learning);
    return learning;
  }

  /**
   * Blend learned and default weights based on learning curve
   */
  private blendWeights(learning: ComponentWeightLearning): Record<string, number> {
    const blended: Record<string, number> = {};
    const components = Object.keys(learning.defaultWeights);

    for (const component of components) {
      const defaultWeight = learning.defaultWeights[component] || 0;
      const learnedWeight = learning.learnedWeights[component] || defaultWeight;
      blended[component] = learning.blendRatio * learnedWeight + (1 - learning.blendRatio) * defaultWeight;
    }

    // Normalize to sum to 1
    const total = Object.values(blended).reduce((sum, w) => sum + w, 0);
    if (total > 0) {
      for (const component of components) {
        blended[component] = blended[component] / total;
      }
    }

    return blended;
  }

  /**
   * Get default weights for service type
   */
  private getDefaultWeights(serviceType: ServiceType): Record<string, number> {
    switch (serviceType) {
      case 'risk':
        return { ...DEFAULT_RISK_WEIGHTS };
      case 'recommendations':
        return { ...DEFAULT_RECOMMENDATION_WEIGHTS };
      case 'forecast':
        return { ...DEFAULT_FORECAST_WEIGHTS };
      default:
        throw new Error(`Unknown service type: ${serviceType}`);
    }
  }

  /**
   * Calculate learning rate with inverse decay
   */
  private calculateLearningRate(
    examples: number,
    tenantValue: 'high' | 'medium' | 'low',
    performanceGain: number
  ): number {
    const baseRate = 0.1;
    const decayFactor = 0.01;
    const decayedRate = baseRate / (1 + decayFactor * examples);

    const tenantMultiplier = {
      high: 1.5,
      medium: 1.0,
      low: 0.7,
    }[tenantValue];

    const performanceMultiplier = 1 + Math.min(performanceGain, 0.5);

    return decayedRate * tenantMultiplier * performanceMultiplier;
  }

  /**
   * Get learning stage based on examples
   */
  private getLearningStage(examples: number): LearningStage {
    if (examples < 100) return 'bootstrap';
    if (examples < 500) return 'initial';
    if (examples < 1000) return 'transition';
    return 'mature';
  }

  /**
   * Record outcome for analysis
   */
  private async recordOutcome(
    tenantId: string,
    contextKey: string,
    serviceType: ServiceType,
    component: string,
    outcome: number,
    weights: Record<string, number>
  ): Promise<void> {
    const outcomeDoc = {
      id: uuidv4(),
      tenantId,
      serviceType,
      contextKey,
      predictionId: uuidv4(), // TODO: Get actual prediction ID
      prediction: {},
      actualOutcome: outcome,
      componentScores: { [component]: outcome },
      weights,
      timestamp: new Date(),
      outcomeType: outcome > 0.5 ? 'success' : outcome > 0.3 ? 'partial' : 'failure',
    };

    await this.outcomesContainer.items.create(outcomeDoc);
  }

  /**
   * Validate weights using statistical validation
   */
  async validateWeights(tenantId: string, contextKey: string, serviceType: ServiceType): Promise<boolean> {
    // TODO: Implement full validation with bootstrap
    // For now, return true if we have enough examples
    const learning = await this.getOrCreateLearning(tenantId, contextKey, serviceType);
    return learning.examples >= 100;
  }
}

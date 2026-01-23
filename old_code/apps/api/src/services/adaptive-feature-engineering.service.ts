/**
 * Adaptive Feature Engineering Service
 * Context-aware feature engineering with learned importance
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import {
  FeatureImportanceLearning,
  Context,
} from '../types/adaptive-learning.types.js';
import { contextKeyGenerator } from '../utils/context-key-generator.js';
import { cacheKeys, CacheTTL } from '../utils/cache-keys.js';

export interface Feature {
  name: string;
  value: any;
  type: 'numeric' | 'categorical' | 'text' | 'datetime';
}

export interface FeatureSet {
  features: Feature[];
  context: Context;
  importance?: Record<string, number>; // Feature name -> importance score
}

/**
 * Adaptive Feature Engineering Service
 */
export class AdaptiveFeatureEngineeringService {
  private client: CosmosClient;
  private database: Database;
  private featuresContainer: Container;
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
    // Note: Using signal_weights container for now, could create dedicated feature_importance container
    this.featuresContainer = this.database.container(config.cosmosDb.containers.signalWeights);
  }

  /**
   * Get context-appropriate features for tenant/opportunity
   */
  async getFeatures(
    tenantId: string,
    opportunity: any, // Opportunity shard or similar
    context: Context
  ): Promise<FeatureSet> {
    const contextKey = contextKeyGenerator.generateSimple(context);

    // Get learned feature importance
    const importance = await this.getFeatureImportance(tenantId, contextKey);

    // Extract base features from opportunity
    const baseFeatures = this.extractBaseFeatures(opportunity, context);

    // Add context-aware derived features
    const derivedFeatures = this.generateDerivedFeatures(baseFeatures, context, importance);

    // Filter and rank by importance
    const allFeatures = [...baseFeatures, ...derivedFeatures];
    const rankedFeatures = this.rankFeaturesByImportance(allFeatures, importance);

    return {
      features: rankedFeatures,
      context,
      importance: importance.features,
    };
  }

  /**
   * Learn feature importance from model performance
   */
  async learnFeatureImportance(
    tenantId: string,
    context: Context,
    modelPerformance: {
      features: Record<string, any>; // Feature name -> values used
      performance: number; // Model accuracy/performance
      shapValues?: Record<string, number>; // SHAP values if available
    }
  ): Promise<void> {
    const contextKey = contextKeyGenerator.generateSimple(context);
    const learning = await this.getOrCreateFeatureLearning(tenantId, contextKey);

    // Update feature importance
    if (modelPerformance.shapValues) {
      // Use SHAP values directly (most accurate)
      for (const [featureName, shapValue] of Object.entries(modelPerformance.shapValues)) {
        const currentImportance = learning.features[featureName] || 0;
        // Moving average update
        const alpha = 0.1;
        learning.features[featureName] = alpha * Math.abs(shapValue) + (1 - alpha) * currentImportance;
      }
    } else {
      // Estimate importance from correlation with performance
      for (const [featureName, featureValue] of Object.entries(modelPerformance.features)) {
        // Simplified: features that correlate with high performance get higher importance
        const correlation = this.estimateCorrelation(featureValue, modelPerformance.performance);
        const currentImportance = learning.features[featureName] || 0;
        const alpha = 0.1;
        learning.features[featureName] = alpha * Math.abs(correlation) + (1 - alpha) * currentImportance;
      }
    }

    learning.examples += 1;
    learning.lastUpdated = new Date();

    // Save to Cosmos DB
    await this.featuresContainer.items.upsert(learning);

    // Invalidate cache
    if (this.redis) {
      const cacheKey = `learned_params:${tenantId}:features:${contextKey}`;
      await this.redis.del(cacheKey);
    }
  }

  /**
   * Discover new feature combinations
   */
  async discoverFeatureCombinations(
    tenantId: string,
    examples: Array<{ features: Record<string, any>; outcome: number }>
  ): Promise<string[]> {
    // Simple feature discovery: look for feature pairs that correlate with outcomes
    const discovered: string[] = [];

    // Get all feature names
    const allFeatureNames = new Set<string>();
    for (const example of examples) {
      for (const featureName of Object.keys(example.features)) {
        allFeatureNames.add(featureName);
      }
    }

    const featureArray = Array.from(allFeatureNames);

    // Check pairs for correlation
    for (let i = 0; i < featureArray.length; i++) {
      for (let j = i + 1; j < featureArray.length; j++) {
        const feature1 = featureArray[i];
        const feature2 = featureArray[j];

        // Calculate correlation of feature interaction with outcome
        const interactionValues = examples.map((ex) => {
          const val1 = ex.features[feature1] || 0;
          const val2 = ex.features[feature2] || 0;
          return val1 * val2; // Simple interaction
        });

        const outcomes = examples.map((ex) => ex.outcome);
        const correlation = this.calculateCorrelation(interactionValues, outcomes);

        if (Math.abs(correlation) > 0.3) {
          // Strong correlation, add as discovered feature
          const combinationName = `${feature1}_x_${feature2}`;
          discovered.push(combinationName);
        }
      }
    }

    return discovered;
  }

  /**
   * Get feature importance for tenant/context
   */
  private async getFeatureImportance(
    tenantId: string,
    contextKey: string
  ): Promise<FeatureImportanceLearning> {
    return await this.getOrCreateFeatureLearning(tenantId, contextKey);
  }

  /**
   * Get or create feature learning record
   */
  private async getOrCreateFeatureLearning(
    tenantId: string,
    contextKey: string
  ): Promise<FeatureImportanceLearning> {
    const id = `${tenantId}:${contextKey}`;

    // Try cache first
    const cacheKey = `learned_params:${tenantId}:features:${contextKey}`;
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        // Cache miss, continue to DB
      }
    }

    try {
      const { resource } = await this.featuresContainer.item(id, tenantId).read<FeatureImportanceLearning>();
      if (resource) {
        // Cache result
        if (this.redis) {
          await this.redis.setex(cacheKey, CacheTTL.ADAPTIVE_FEATURES, JSON.stringify(resource));
        }
        return resource;
      }
    } catch (error) {
      // Not found, create new
    }

    // Create new learning record
    const now = new Date();
    const learning: FeatureImportanceLearning = {
      id,
      tenantId,
      contextKey,
      features: {}, // Will be populated as we learn
      learnedFrom: 'correlation', // Default, will update to 'shap' if available
      examples: 0,
      lastUpdated: now,
    };

    await this.featuresContainer.items.create(learning);

    // Cache result
    if (this.redis) {
      await this.redis.setex(cacheKey, CacheTTL.ADAPTIVE_FEATURES, JSON.stringify(learning));
    }

    return learning;
  }

  /**
   * Extract base features from opportunity
   */
  private extractBaseFeatures(opportunity: any, context: Context): Feature[] {
    const features: Feature[] = [];

    // Extract common opportunity features
    if (opportunity.amount !== undefined) {
      features.push({ name: 'amount', value: opportunity.amount, type: 'numeric' });
    }
    if (opportunity.stage) {
      features.push({ name: 'stage', value: opportunity.stage, type: 'categorical' });
    }
    if (opportunity.industry) {
      features.push({ name: 'industry', value: opportunity.industry, type: 'categorical' });
    }
    if (opportunity.createdAt) {
      features.push({ name: 'age_days', value: this.calculateAgeDays(opportunity.createdAt), type: 'numeric' });
    }

    return features;
  }

  /**
   * Generate derived features based on context and importance
   */
  private generateDerivedFeatures(
    baseFeatures: Feature[],
    context: Context,
    importance: FeatureImportanceLearning
  ): Feature[] {
    const derived: Feature[] = [];

    // Example derived features
    const amountFeature = baseFeatures.find((f) => f.name === 'amount');
    const stageFeature = baseFeatures.find((f) => f.name === 'stage');

    if (amountFeature && stageFeature) {
      // Deal size by stage
      derived.push({
        name: 'amount_by_stage',
        value: (amountFeature.value as number) * this.getStageMultiplier(stageFeature.value as string),
        type: 'numeric',
      });
    }

    // Add more derived features based on learned importance
    // Features with high importance get more derived variants

    return derived;
  }

  /**
   * Rank features by importance
   */
  private rankFeaturesByImportance(
    features: Feature[],
    importance: FeatureImportanceLearning
  ): Feature[] {
    return features.sort((a, b) => {
      const importanceA = importance.features[a.name] || 0;
      const importanceB = importance.features[b.name] || 0;
      return importanceB - importanceA; // Descending order
    });
  }

  /**
   * Calculate correlation between two arrays
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const meanX = x.reduce((sum, v) => sum + v, 0) / x.length;
    const meanY = y.reduce((sum, v) => sum + v, 0) / y.length;

    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;

    for (let i = 0; i < x.length; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      numerator += diffX * diffY;
      sumSqX += diffX * diffX;
      sumSqY += diffY * diffY;
    }

    const denominator = Math.sqrt(sumSqX * sumSqY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Estimate correlation between single value and performance
   */
  private estimateCorrelation(featureValue: any, performance: number): number {
    // Simplified: normalize feature value and compare to performance
    const normalizedValue = typeof featureValue === 'number' ? featureValue / 1000000 : 0.5;
    return 1 - Math.abs(normalizedValue - performance);
  }

  /**
   * Calculate age in days
   */
  private calculateAgeDays(date: Date | string): number {
    const created = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffTime = now.getTime() - created.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get stage multiplier for feature engineering
   */
  private getStageMultiplier(stage: string): number {
    const multipliers: Record<string, number> = {
      discovery: 0.1,
      qualification: 0.3,
      proposal: 0.6,
      negotiation: 0.8,
      closed_won: 1.0,
      closed_lost: 0.0,
    };
    return multipliers[stage] || 0.5;
  }
}

/**
 * Meta-Learning Service
 * Learns which component to trust when based on context and uncertainty
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { ServiceType, Context } from '../types/adaptive-learning.types.js';
import { contextKeyGenerator } from '../utils/context-key-generator.js';
import { cacheKeys, CacheTTL } from '../utils/cache-keys.js';

export interface TrustScore {
  component: string;
  trustScore: number; // 0-1: How much to trust this component
  confidence: number; // 0-1: Confidence in trust score
  context: string[]; // Contexts where this component is most trusted
  lastUpdated: Date;
}

export interface ComponentTrustScores {
  tenantId: string;
  serviceType: ServiceType;
  contextKey: string;
  components: Record<string, TrustScore>;
  overallTrust: number;
  lastUpdated: Date;
}

/**
 * Meta-Learning Service
 */
export class MetaLearningService {
  private client: CosmosClient;
  private database: Database;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private trustCache: Map<string, ComponentTrustScores> = new Map();

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
  }

  /**
   * Get component trust scores for tenant/context
   */
  async getTrustScores(
    tenantId: string,
    serviceType: ServiceType,
    context: Context
  ): Promise<ComponentTrustScores> {
    const contextKey = contextKeyGenerator.generateSimple(context);
    const cacheKey = `${tenantId}:${serviceType}:${contextKey}`;

    // Check memory cache
    let trustScores = this.trustCache.get(cacheKey);
    if (trustScores) {
      return trustScores;
    }

    // Check Redis cache
    if (this.redis) {
      try {
        const cached = await this.redis.get(`trust_scores:${cacheKey}`);
        if (cached) {
          const parsed = JSON.parse(cached) as ComponentTrustScores;
          if (parsed) {
            trustScores = parsed;
            this.trustCache.set(cacheKey, trustScores);
            return trustScores;
          }
        }
      } catch (error) {
        // Continue to DB
      }
    }

    // Get or create trust scores
    trustScores = await this.getOrCreateTrustScores(tenantId, serviceType, contextKey);
    this.trustCache.set(cacheKey, trustScores);

    // Cache in Redis
    if (this.redis) {
      await this.redis.setex(`trust_scores:${cacheKey}`, CacheTTL.ADAPTIVE_META, JSON.stringify(trustScores));
    }

    return trustScores;
  }

  /**
   * Learn trust scores from outcomes
   */
  async learnTrustScores(
    tenantId: string,
    serviceType: ServiceType,
    context: Context,
    outcomes: Array<{
      component: string;
      prediction: number;
      actualOutcome: number;
      uncertainty?: number; // 0-1: Prediction uncertainty
    }>
  ): Promise<void> {
    const contextKey = contextKeyGenerator.generateSimple(context);
    const trustScores = await this.getOrCreateTrustScores(tenantId, serviceType, contextKey);

    // Update trust scores based on outcomes
    for (const outcome of outcomes) {
      if (!trustScores.components[outcome.component]) {
        trustScores.components[outcome.component] = {
          component: outcome.component,
          trustScore: 0.5, // Default trust
          confidence: 0.5,
          context: [contextKey],
          lastUpdated: new Date(),
        };
      }

      const trust = trustScores.components[outcome.component];

      // Calculate prediction error
      const error = Math.abs(outcome.prediction - outcome.actualOutcome);

      // Update trust score (lower error = higher trust)
      const alpha = 0.1; // Learning rate
      const newTrust = 1 - error; // Inverse of error
      trust.trustScore = alpha * newTrust + (1 - alpha) * trust.trustScore;

      // Adjust for uncertainty (higher uncertainty = lower trust)
      if (outcome.uncertainty !== undefined) {
        trust.trustScore = trust.trustScore * (1 - outcome.uncertainty * 0.5);
      }

      // Update confidence (more examples = higher confidence)
      trust.confidence = Math.min(1, trust.confidence + 0.01);

      // Track contexts where component performs well
      if (error < 0.2) {
        // Good performance
        if (!trust.context.includes(contextKey)) {
          trust.context.push(contextKey);
        }
      }

      trust.lastUpdated = new Date();
    }

    // Update overall trust
    const componentTrusts = Object.values(trustScores.components);
    trustScores.overallTrust = componentTrusts.length > 0
      ? componentTrusts.reduce((sum, t) => sum + t.trustScore, 0) / componentTrusts.length
      : 0.5;

    trustScores.lastUpdated = new Date();

    // Save to Cosmos DB (async)
    this.saveTrustScores(trustScores).catch((error) => {
      this.monitoring?.trackException(error as Error, { operation: 'learnTrustScores.save' });
    });

    // Invalidate cache
    const cacheKey = `${tenantId}:${serviceType}:${contextKey}`;
    this.trustCache.delete(cacheKey);
    if (this.redis) {
      await this.redis.del(`trust_scores:${cacheKey}`);
    }
  }

  /**
   * Route by uncertainty (use ensemble when uncertainty is high)
   */
  async routeByUncertainty(
    tenantId: string,
    serviceType: ServiceType,
    context: Context,
    uncertainty: number // 0-1: Prediction uncertainty
  ): Promise<{
    useEnsemble: boolean;
    primaryComponent?: string;
    components: string[];
  }> {
    const trustScores = await this.getTrustScores(tenantId, serviceType, context);

    // High uncertainty: use ensemble
    if (uncertainty > 0.7) {
      return {
        useEnsemble: true,
        components: Object.keys(trustScores.components),
      };
    }

    // Medium uncertainty: use top 2 components
    if (uncertainty > 0.4) {
      const sorted = Object.entries(trustScores.components)
        .sort((a, b) => b[1].trustScore - a[1].trustScore)
        .slice(0, 2)
        .map(([component]) => component);

      return {
        useEnsemble: true,
        primaryComponent: sorted[0],
        components: sorted,
      };
    }

    // Low uncertainty: use most trusted component
    const sorted = Object.entries(trustScores.components)
      .sort((a, b) => b[1].trustScore - a[1].trustScore);

    return {
      useEnsemble: false,
      primaryComponent: sorted[0]?.[0],
      components: sorted[0] ? [sorted[0][0]] : [],
    };
  }

  /**
   * Get or create trust scores
   */
  private async getOrCreateTrustScores(
    tenantId: string,
    serviceType: ServiceType,
    contextKey: string
  ): Promise<ComponentTrustScores> {
    // For now, create new trust scores
    // In production, would load from Cosmos DB
    const now = new Date();
    return {
      tenantId,
      serviceType,
      contextKey,
      components: {},
      overallTrust: 0.5,
      lastUpdated: now,
    };
  }

  /**
   * Save trust scores to Cosmos DB
   */
  private async saveTrustScores(trustScores: ComponentTrustScores): Promise<void> {
    // TODO: Implement Cosmos DB storage
    // For now, just track in memory and Redis
    this.monitoring?.trackEvent('meta_learning.trust_scores_updated', {
      tenantId: trustScores.tenantId,
      serviceType: trustScores.serviceType,
      contextKey: trustScores.contextKey,
      overallTrust: trustScores.overallTrust,
    });
  }
}

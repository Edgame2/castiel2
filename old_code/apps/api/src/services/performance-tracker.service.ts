/**
 * Performance Tracker Service
 * Tracks component performance for adaptive learning
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { ServiceType, Context } from '../types/adaptive-learning.types.js';
import { contextKeyGenerator } from '../utils/context-key-generator.js';

export interface ComponentPerformance {
  component: string;
  accuracy: number; // 0-1
  totalPredictions: number;
  correctPredictions: number;
  lastUpdated: Date;
}

export interface PerformanceMetrics {
  tenantId: string;
  serviceType: ServiceType;
  contextKey: string;
  components: Record<string, ComponentPerformance>;
  overallAccuracy: number;
  lastUpdated: Date;
}

/**
 * Performance Tracker Service
 */
export class PerformanceTrackerService {
  private client: CosmosClient;
  private database: Database;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private performanceCache: Map<string, PerformanceMetrics> = new Map();

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
   * Track component performance
   */
  async trackPerformance(
    tenantId: string,
    serviceType: ServiceType,
    context: Context,
    component: string,
    wasCorrect: boolean
  ): Promise<void> {
    const contextKey = contextKeyGenerator.generateSimple(context);
    const cacheKey = `${tenantId}:${serviceType}:${contextKey}`;

    // Get or create performance metrics
    let metrics = this.performanceCache.get(cacheKey);
    if (!metrics) {
      metrics = await this.getOrCreateMetrics(tenantId, serviceType, contextKey);
      this.performanceCache.set(cacheKey, metrics);
    }

    // Update component performance
    if (!metrics.components[component]) {
      metrics.components[component] = {
        component,
        accuracy: 0.5, // Default
        totalPredictions: 0,
        correctPredictions: 0,
        lastUpdated: new Date(),
      };
    }

    const compPerf = metrics.components[component];
    compPerf.totalPredictions += 1;
    if (wasCorrect) {
      compPerf.correctPredictions += 1;
    }
    compPerf.accuracy = compPerf.correctPredictions / compPerf.totalPredictions;
    compPerf.lastUpdated = new Date();

    // Update overall accuracy
    const totalPredictions = Object.values(metrics.components).reduce(
      (sum, c) => sum + c.totalPredictions,
      0
    );
    const totalCorrect = Object.values(metrics.components).reduce(
      (sum, c) => sum + c.correctPredictions,
      0
    );
    metrics.overallAccuracy = totalPredictions > 0 ? totalCorrect / totalPredictions : 0.5;
    metrics.lastUpdated = new Date();

    // Save to Cosmos DB (async, non-blocking)
    this.saveMetrics(metrics).catch((error) => {
      this.monitoring?.trackException(error as Error, { operation: 'trackPerformance.save' });
    });

    // Cache in Redis
    if (this.redis) {
      try {
        const key = `performance:${cacheKey}`;
        await this.redis.setex(key, 3600, JSON.stringify(metrics)); // 1 hour TTL
      } catch (error) {
        // Non-blocking
      }
    }
  }

  /**
   * Get component performance
   */
  async getPerformance(
    tenantId: string,
    serviceType: ServiceType,
    context: Context
  ): Promise<PerformanceMetrics> {
    const contextKey = contextKeyGenerator.generateSimple(context);
    const cacheKey = `${tenantId}:${serviceType}:${contextKey}`;

    // Check memory cache
    let metrics = this.performanceCache.get(cacheKey);
    if (metrics) {
      return metrics;
    }

    // Check Redis cache
    if (this.redis) {
      try {
        const cached = await this.redis.get(`performance:${cacheKey}`);
        if (cached) {
          const parsed = JSON.parse(cached) as PerformanceMetrics;
          if (parsed) {
            metrics = parsed;
            this.performanceCache.set(cacheKey, metrics);
            return metrics;
          }
        }
      } catch (error) {
        // Continue to DB
      }
    }

    // Get from DB or create new
    metrics = await this.getOrCreateMetrics(tenantId, serviceType, contextKey);
    this.performanceCache.set(cacheKey, metrics);

    return metrics;
  }

  /**
   * Get or create performance metrics
   */
  private async getOrCreateMetrics(
    tenantId: string,
    serviceType: ServiceType,
    contextKey: string
  ): Promise<PerformanceMetrics> {
    // For now, create new metrics (in production, would load from Cosmos DB)
    const now = new Date();
    return {
      tenantId,
      serviceType,
      contextKey,
      components: {},
      overallAccuracy: 0.5,
      lastUpdated: now,
    };
  }

  /**
   * Save metrics to Cosmos DB
   */
  private async saveMetrics(metrics: PerformanceMetrics): Promise<void> {
    // TODO: Implement Cosmos DB storage
    // For now, just track in memory and Redis
    this.monitoring?.trackEvent('performance_tracker.metrics_updated', {
      tenantId: metrics.tenantId,
      serviceType: metrics.serviceType,
      contextKey: metrics.contextKey,
      overallAccuracy: metrics.overallAccuracy,
    });
  }
}

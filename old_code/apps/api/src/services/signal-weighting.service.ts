/**
 * Signal Weighting Service
 * Learns optimal weights for different feedback signals (explicit and implicit)
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import {
  SignalWeightLearning,
  Context,
} from '../types/adaptive-learning.types.js';
import { contextKeyGenerator } from '../utils/context-key-generator.js';
import { cacheKeys, CacheTTL } from '../utils/cache-keys.js';

export type SignalType = 'explicit' | 'implicit' | 'time_spent' | 'action_taken' | 'dismissal' | 'engagement';

export interface Signal {
  signalType: SignalType;
  value: number; // 0-1: normalized signal value
  context?: Context;
  timestamp: Date;
  userId?: string;
  userExpertise?: 'novice' | 'intermediate' | 'expert';
}

export interface SignalOutcome {
  signals: Signal[];
  outcome: number; // 0-1: actual outcome (success/failure or performance metric)
  timestamp: Date;
}

/**
 * Signal Weighting Service
 */
export class SignalWeightingService {
  private client: CosmosClient;
  private database: Database;
  private signalsContainer: Container;
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
    this.signalsContainer = this.database.container(config.cosmosDb.containers.signalWeights);
  }

  /**
   * Learn signal weights from outcomes
   */
  async learnSignalWeights(
    tenantId: string,
    signals: Signal[],
    outcome: number
  ): Promise<void> {
    try {
      // Group signals by type
      const signalsByType = new Map<SignalType, Signal[]>();
      for (const signal of signals) {
        if (!signalsByType.has(signal.signalType)) {
          signalsByType.set(signal.signalType, []);
        }
        signalsByType.get(signal.signalType)!.push(signal);
      }

      // Learn weights for each signal type
      for (const [signalType, typeSignals] of signalsByType.entries()) {
        const learning = await this.getOrCreateSignalLearning(tenantId, signalType);

        // Calculate signal predictive power (correlation with outcome)
        const avgSignalValue = typeSignals.reduce((sum, s) => sum + s.value, 0) / typeSignals.length;
        const correlation = this.calculateCorrelation(avgSignalValue, outcome);

        // Update reliability score (moving average)
        const alpha = 0.1; // Learning rate
        learning.reliability = alpha * Math.abs(correlation) + (1 - alpha) * learning.reliability;

        // Update weights based on predictive power
        // Signals with higher correlation get higher weights
        if (learning.weights[signalType] === undefined) {
          learning.weights[signalType] = 0.5; // Default weight
        }

        // Adjust weight based on correlation
        const weightAdjustment = correlation * 0.1; // Small adjustment per learning step
        learning.weights[signalType] = Math.max(0, Math.min(1, learning.weights[signalType] + weightAdjustment));

        // Normalize weights to sum to 1
        this.normalizeWeights(learning.weights);

        learning.examples += typeSignals.length;
        learning.lastUpdated = new Date();

        // Save to Cosmos DB
        await this.signalsContainer.items.upsert(learning);

        // Invalidate cache
        if (this.redis) {
          const cacheKey = `learned_params:${tenantId}:signals:${signalType}`;
          await this.redis.del(cacheKey);
        }
      }
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'learnSignalWeights' });
      throw error;
    }
  }

  /**
   * Combine signals with learned weights
   */
  async combineSignals(tenantId: string, signals: Signal[]): Promise<number> {
    // Get weights for each signal type
    const weights: Record<string, number> = {};
    const signalValues: Record<string, number[]> = {};

    // Group signals by type
    for (const signal of signals) {
      if (!weights[signal.signalType]) {
        const learning = await this.getSignalWeights(tenantId, signal.signalType);
        weights[signal.signalType] = learning.weights[signal.signalType] || 0.5;
      }

      if (!signalValues[signal.signalType]) {
        signalValues[signal.signalType] = [];
      }
      signalValues[signal.signalType].push(signal.value);
    }

    // Calculate weighted average
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [signalType, values] of Object.entries(signalValues)) {
      const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
      const weight = weights[signalType] || 0.5;
      weightedSum += avgValue * weight;
      totalWeight += weight;
    }

    // Normalize to 0-1
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Get signal weights for tenant
   */
  async getSignalWeights(tenantId: string, signalType: SignalType): Promise<SignalWeightLearning> {
    return await this.getOrCreateSignalLearning(tenantId, signalType);
  }

  /**
   * Get or create signal learning record
   */
  private async getOrCreateSignalLearning(
    tenantId: string,
    signalType: SignalType
  ): Promise<SignalWeightLearning> {
    const id = `${tenantId}:${signalType}`;

    // Try cache first
    const cacheKey = `learned_params:${tenantId}:signals:${signalType}`;
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
      const { resource } = await this.signalsContainer.item(id, tenantId).read<SignalWeightLearning>();
      if (resource) {
        // Cache result
        if (this.redis) {
          await this.redis.setex(cacheKey, CacheTTL.ADAPTIVE_SIGNALS, JSON.stringify(resource));
        }
        return resource;
      }
    } catch (error) {
      // Not found, create new
    }

    // Create new learning record
    const now = new Date();
    const learning: SignalWeightLearning = {
      id,
      tenantId,
      signalType,
      weights: {
        [signalType]: 0.5, // Default weight
      },
      reliability: 0.5, // Default reliability
      examples: 0,
      lastUpdated: now,
    };

    await this.signalsContainer.items.create(learning);

    // Cache result
    if (this.redis) {
      await this.redis.setex(cacheKey, CacheTTL.ADAPTIVE_SIGNALS, JSON.stringify(learning));
    }

    return learning;
  }

  /**
   * Calculate correlation between signal and outcome
   */
  private calculateCorrelation(signalValue: number, outcome: number): number {
    // Simplified correlation calculation
    // In production, use Pearson correlation over multiple examples
    const diff = signalValue - outcome;
    return 1 - Math.abs(diff); // Higher when signal matches outcome
  }

  /**
   * Normalize weights to sum to 1
   */
  private normalizeWeights(weights: Record<string, number>): void {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (total > 0) {
      for (const key of Object.keys(weights)) {
        weights[key] = weights[key] / total;
      }
    }
  }
}

/**
 * Active Learning Service
 * Intelligently requests feedback to maximize learning efficiency
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { ServiceType, Context } from '../types/adaptive-learning.types.js';
import { FeedbackLearningService } from './feedback-learning.service.js';

export type QueryStrategy = 'uncertainty' | 'representative' | 'impact' | 'diversity';

export interface FeedbackRequest {
  id: string;
  tenantId: string;
  userId: string;
  opportunityId?: string;
  recommendationId?: string;
  reason: string;
  strategy: QueryStrategy;
  priority: 'low' | 'medium' | 'high';
  requestedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'completed' | 'expired';
}

export interface SamplingRateConfig {
  tenantId: string;
  baseRate: number; // 0-1: Base sampling rate
  currentRate: number; // 0-1: Current sampling rate
  adaptiveRate: boolean; // Whether rate is adaptive
  lastUpdated: Date;
}

/**
 * Active Learning Service
 */
export class ActiveLearningService {
  private client: CosmosClient;
  private database: Database;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private feedbackService?: FeedbackLearningService;
  private samplingRates: Map<string, SamplingRateConfig> = new Map();

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    feedbackService?: FeedbackLearningService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.feedbackService = feedbackService;

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
   * Select query strategy for requesting feedback
   */
  async selectQueryStrategy(tenantId: string): Promise<QueryStrategy> {
    // Strategy selection based on learning stage
    // Early stage: diversity (explore)
    // Mid stage: uncertainty (exploit uncertainty)
    // Late stage: impact (focus on high-value)

    // TODO: Determine learning stage from examples
    const examples = 0; // Placeholder

    if (examples < 100) {
      return 'diversity'; // Explore diverse examples
    } else if (examples < 500) {
      return 'uncertainty'; // Focus on uncertain predictions
    } else {
      return 'impact'; // Focus on high-impact opportunities
    }
  }

  /**
   * Request feedback for an opportunity/recommendation
   */
  async requestFeedback(
    tenantId: string,
    userId: string,
    opportunityId: string,
    reason: string,
    strategy?: QueryStrategy
  ): Promise<FeedbackRequest> {
    const selectedStrategy = strategy || await this.selectQueryStrategy(tenantId);

    // Check sampling rate
    const shouldRequest = await this.shouldRequestFeedback(tenantId, userId);
    if (!shouldRequest) {
      throw new Error('Sampling rate limit reached');
    }

    const request: FeedbackRequest = {
      id: `fb_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      userId,
      opportunityId,
      reason,
      strategy: selectedStrategy,
      priority: this.determinePriority(strategy),
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'pending',
    };

    // Store in Redis for tracking
    if (this.redis) {
      const key = `feedback_request:${tenantId}:${request.id}`;
      await this.redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(request));
    }

    this.monitoring?.trackEvent('active_learning.feedback_requested', {
      tenantId,
      userId,
      opportunityId,
      strategy: selectedStrategy,
    });

    return request;
  }

  /**
   * Optimize sampling rate based on feedback quality and learning progress
   */
  async optimizeSamplingRate(tenantId: string): Promise<number> {
    const config = await this.getSamplingRateConfig(tenantId);

    if (!config.adaptiveRate) {
      return config.baseRate;
    }

    // TODO: Analyze feedback quality and learning progress
    // For now, use simple heuristic
    const feedbackQuality = 0.7; // Placeholder
    const learningProgress = 0.5; // Placeholder

    // Adjust rate based on quality and progress
    // High quality + low progress = increase rate
    // Low quality + high progress = decrease rate
    let newRate = config.baseRate;

    if (feedbackQuality > 0.8 && learningProgress < 0.5) {
      newRate = Math.min(1, config.currentRate * 1.1); // Increase
    } else if (feedbackQuality < 0.5 && learningProgress > 0.7) {
      newRate = Math.max(0.1, config.currentRate * 0.9); // Decrease
    }

    config.currentRate = newRate;
    config.lastUpdated = new Date();
    this.samplingRates.set(tenantId, config);

    return newRate;
  }

  /**
   * Check if feedback should be requested (sampling rate check)
   */
  private async shouldRequestFeedback(tenantId: string, userId: string): Promise<boolean> {
    const config = await this.getSamplingRateConfig(tenantId);
    const random = Math.random();
    return random < config.currentRate;
  }

  /**
   * Determine priority based on strategy
   */
  private determinePriority(strategy?: QueryStrategy): 'low' | 'medium' | 'high' {
    switch (strategy) {
      case 'impact':
        return 'high';
      case 'uncertainty':
        return 'medium';
      case 'representative':
        return 'medium';
      case 'diversity':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Get sampling rate configuration
   */
  private async getSamplingRateConfig(tenantId: string): Promise<SamplingRateConfig> {
    // Check cache
    let config = this.samplingRates.get(tenantId);
    if (config) {
      return config;
    }

    // Check Redis
    if (this.redis) {
      try {
        const cached = await this.redis.get(`sampling_rate:${tenantId}`);
        if (cached) {
          const parsed = JSON.parse(cached) as SamplingRateConfig;
          if (parsed) {
            config = parsed;
            this.samplingRates.set(tenantId, config);
            return config;
          }
        }
      } catch (error) {
        // Continue to default
      }
    }

    // Create default config
    config = {
      tenantId,
      baseRate: 0.1, // 10% default sampling rate
      currentRate: 0.1,
      adaptiveRate: true,
      lastUpdated: new Date(),
    };

    this.samplingRates.set(tenantId, config);
    return config;
  }
}

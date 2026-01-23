/**
 * Feedback Quality Service
 * Assesses feedback quality and adjusts influence on learning
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { FeedbackLearningService, FeedbackEntry } from './feedback-learning.service.js';

export interface FeedbackQualityAssessment {
  feedbackId: string;
  tenantId: string;
  userId: string;
  qualityScore: number; // 0-1: Overall quality
  reliability: number; // 0-1: User reliability
  bias: number; // 0-1: Detected bias (0 = no bias, 1 = high bias)
  trainingWeight: number; // 0-1: Weight to use in training
  factors: {
    consistency: number; // Consistency with other feedback
    detail: number; // Level of detail provided
    timeliness: number; // How quickly feedback was provided
    expertise: number; // User expertise level
  };
  assessedAt: Date;
}

export interface UserReliability {
  userId: string;
  tenantId: string;
  reliabilityScore: number; // 0-1
  totalFeedback: number;
  consistentFeedback: number;
  averageQuality: number;
  lastUpdated: Date;
}

/**
 * Feedback Quality Service
 */
export class FeedbackQualityService {
  private client: CosmosClient;
  private database: Database;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private feedbackService?: FeedbackLearningService;
  private userReliability: Map<string, UserReliability> = new Map();

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
   * Assess feedback quality
   */
  async assessQuality(
    feedbackId: string,
    tenantId: string,
    feedback: FeedbackEntry
  ): Promise<FeedbackQualityAssessment> {
    // Get user reliability
    const userReliability = await this.getUserReliability(feedback.userId, tenantId);

    // Calculate quality factors
    const consistency = await this.calculateConsistency(tenantId, feedback);
    const detail = this.calculateDetail(feedback);
    const timeliness = this.calculateTimeliness(feedback);
    const expertise = userReliability.reliabilityScore;

    // Calculate overall quality score
    const qualityScore = (
      consistency * 0.3 +
      detail * 0.2 +
      timeliness * 0.1 +
      expertise * 0.4
    );

    // Detect bias
    const bias = await this.detectBias(feedback, tenantId);

    // Calculate training weight (high quality, low bias = high weight)
    const trainingWeight = qualityScore * (1 - bias * 0.5);

    const assessment: FeedbackQualityAssessment = {
      feedbackId,
      tenantId,
      userId: feedback.userId,
      qualityScore,
      reliability: userReliability.reliabilityScore,
      bias,
      trainingWeight,
      factors: {
        consistency,
        detail,
        timeliness,
        expertise,
      },
      assessedAt: new Date(),
    };

    // Update user reliability
    await this.updateUserReliability(feedback.userId, tenantId, qualityScore, consistency);

    return assessment;
  }

  /**
   * Get user reliability score
   */
  async getUserReliability(userId: string, tenantId: string): Promise<UserReliability> {
    const key = `${tenantId}:${userId}`;

    // Check cache
    let reliability = this.userReliability.get(key);
    if (reliability) {
      return reliability;
    }

    // Check Redis
    if (this.redis) {
      try {
        const cached = await this.redis.get(`user_reliability:${key}`);
        if (cached) {
          const parsed = JSON.parse(cached) as UserReliability;
          if (parsed) {
            reliability = parsed;
            this.userReliability.set(key, reliability);
            return reliability;
          }
        }
      } catch (error) {
        // Continue to default
      }
    }

    // Get from feedback service if available
    if (this.feedbackService) {
      const expertise = await this.feedbackService.getUserExpertise(userId, tenantId);
      const expertiseScore = expertise === 'expert' ? 0.9 : expertise === 'intermediate' ? 0.7 : 0.5;

      reliability = {
        userId,
        tenantId,
        reliabilityScore: expertiseScore,
        totalFeedback: 0,
        consistentFeedback: 0,
        averageQuality: 0.5,
        lastUpdated: new Date(),
      };
    } else {
      // Default reliability
      reliability = {
        userId,
        tenantId,
        reliabilityScore: 0.5,
        totalFeedback: 0,
        consistentFeedback: 0,
        averageQuality: 0.5,
        lastUpdated: new Date(),
      };
    }

    this.userReliability.set(key, reliability);
    return reliability;
  }

  /**
   * Detect systematic bias in feedback
   */
  async detectBias(feedback: FeedbackEntry, tenantId: string): Promise<number> {
    // Get user's feedback history
    if (!this.feedbackService) {
      return 0; // No bias detected if no feedback service
    }

    const userFeedback = await this.feedbackService.getFeedback(tenantId, {
      limit: 50,
    });

    const userFeedbackList = userFeedback.filter((f) => f.userId === feedback.userId);

    if (userFeedbackList.length < 5) {
      return 0; // Not enough data to detect bias
    }

    // Check for systematic patterns
    const allPositive = userFeedbackList.every((f) => f.rating === 'positive');
    const allNegative = userFeedbackList.every((f) => f.rating === 'negative');

    if (allPositive || allNegative) {
      return 0.7; // High bias: always positive or always negative
    }

    // Check for extreme scores
    const extremeScores = userFeedbackList.filter((f) => f.score === 1 || f.score === 5);
    const extremeRatio = extremeScores.length / userFeedbackList.length;

    if (extremeRatio > 0.8) {
      return 0.5; // Moderate bias: mostly extreme scores
    }

    return 0; // Low bias
  }

  /**
   * Adjust training weight based on quality score
   */
  adjustTrainingWeight(feedbackId: string, qualityScore: number): number {
    // Higher quality = higher weight
    // But cap at 1.0 and floor at 0.1
    return Math.max(0.1, Math.min(1.0, qualityScore));
  }

  /**
   * Calculate consistency with other feedback
   */
  private async calculateConsistency(tenantId: string, feedback: FeedbackEntry): Promise<number> {
    if (!this.feedbackService) {
      return 0.5; // Default consistency
    }

    // Get similar feedback (same model, similar query)
    const similarFeedback = await this.feedbackService.getFeedback(tenantId, {
      limit: 20,
      modelId: feedback.modelId,
      insightType: feedback.insightType,
    });

    if (similarFeedback.length < 3) {
      return 0.5; // Not enough data
    }

    // Check if feedback rating matches majority
    const ratings = similarFeedback.map((f) => f.rating);
    const positiveCount = ratings.filter((r) => r === 'positive').length;
    const negativeCount = ratings.filter((r) => r === 'negative').length;
    const majority = positiveCount > negativeCount ? 'positive' : 'negative';

    return feedback.rating === majority ? 0.9 : 0.3;
  }

  /**
   * Calculate detail level
   */
  private calculateDetail(feedback: FeedbackEntry): number {
    if (!feedback.comment) {
      return 0.2; // No comment = low detail
    }

    const commentLength = feedback.comment.length;
    if (commentLength > 100) {
      return 1.0; // Detailed comment
    } else if (commentLength > 50) {
      return 0.7; // Moderate detail
    } else {
      return 0.4; // Low detail
    }
  }

  /**
   * Calculate timeliness
   */
  private calculateTimeliness(feedback: FeedbackEntry): number {
    // Feedback provided quickly after response = more reliable
    // For now, assume all feedback is timely
    return 0.8;
  }

  /**
   * Update user reliability
   */
  private async updateUserReliability(
    userId: string,
    tenantId: string,
    qualityScore: number,
    consistency: number
  ): Promise<void> {
    const reliability = await this.getUserReliability(userId, tenantId);

    reliability.totalFeedback += 1;
    if (consistency > 0.7) {
      reliability.consistentFeedback += 1;
    }

    // Update average quality (moving average)
    const alpha = 0.1;
    reliability.averageQuality = alpha * qualityScore + (1 - alpha) * reliability.averageQuality;

    // Update reliability score
    const consistencyRatio = reliability.consistentFeedback / reliability.totalFeedback;
    reliability.reliabilityScore = (
      reliability.averageQuality * 0.6 +
      consistencyRatio * 0.4
    );

    reliability.lastUpdated = new Date();

    // Cache
    this.userReliability.set(`${tenantId}:${userId}`, reliability);
    if (this.redis) {
      await this.redis.setex(
        `user_reliability:${tenantId}:${userId}`,
        3600,
        JSON.stringify(reliability)
      );
    }
  }
}

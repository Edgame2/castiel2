/**
 * Explanation Quality Service
 * Assesses and improves explanation quality based on user feedback
 * 
 * Features:
 * - Explanation quality scoring (clarity, completeness, actionability)
 * - User preference learning
 * - Explanation style personalization
 * - A/B testing for explanations
 * - Quality feedback loop
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { ExplainableAIService, Explanation } from './explainable-ai.service.js';
import { FeedbackLearningService } from './feedback-learning.service.js';

export type QualityDimension = 'clarity' | 'completeness' | 'actionability' | 'relevance' | 'trustworthiness';

export type ExplanationStyle = 'concise' | 'detailed' | 'technical' | 'business' | 'visual';

export interface ExplanationQuality {
  qualityId: string;
  tenantId: string; // Partition key
  userId?: string;
  explanationId: string;
  responseId: string;
  scores: {
    clarity: number; // 0-1
    completeness: number; // 0-1
    actionability: number; // 0-1
    relevance: number; // 0-1
    trustworthiness: number; // 0-1
    overall: number; // 0-1: Weighted average
  };
  feedback: {
    helpful: boolean;
    rating?: number; // 1-5
    comments?: string;
    suggestedImprovements?: string[];
  };
  style: ExplanationStyle;
  preferences?: {
    preferredLength: 'short' | 'medium' | 'long';
    preferredDetail: 'high' | 'medium' | 'low';
    preferredFormat: 'text' | 'structured' | 'visual';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityMetrics {
  tenantId: string;
  userId?: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  metrics: {
    avgQuality: number;
    avgClarity: number;
    avgCompleteness: number;
    avgActionability: number;
    feedbackRate: number; // 0-1: % of explanations with feedback
    helpfulRate: number; // 0-1: % of explanations marked helpful
    improvementTrend: number; // -1 to 1: Trend in quality over time
  };
  topIssues: Array<{
    dimension: QualityDimension;
    frequency: number;
    avgScore: number;
  }>;
}

export interface PersonalizedExplanationRequest {
  tenantId: string;
  userId: string;
  baseExplanation: Explanation;
  preferredStyle?: ExplanationStyle;
}

/**
 * Explanation Quality Service
 */
export class ExplanationQualityService {
  private client: CosmosClient;
  private database: Database;
  private qualityContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private explainableAIService?: ExplainableAIService;
  private feedbackLearningService?: FeedbackLearningService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    explainableAIService?: ExplainableAIService,
    feedbackLearningService?: FeedbackLearningService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.explainableAIService = explainableAIService;
    this.feedbackLearningService = feedbackLearningService;

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
    this.qualityContainer = this.database.container(config.cosmosDb.containers.explanationQuality);
  }

  /**
   * Assess explanation quality
   */
  async assessQuality(
    tenantId: string,
    explanation: Explanation,
    userId?: string
  ): Promise<ExplanationQuality> {
    const qualityId = uuidv4();

    // Calculate quality scores
    const scores = this.calculateQualityScores(explanation);

    // Detect style
    const style = this.detectStyle(explanation);

    // Get user preferences if available
    const preferences = userId ? await this.getUserPreferences(tenantId, userId) : undefined;

    const quality: ExplanationQuality = {
      qualityId,
      tenantId,
      userId,
      explanationId: explanation.id,
      responseId: explanation.responseId,
      scores,
      feedback: {
        helpful: false, // Will be updated when feedback is provided
      },
      style,
      preferences,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.qualityContainer.items.create(quality);

    this.monitoring?.trackEvent('explanation_quality.assessed', {
      tenantId,
      explanationId: explanation.id,
      overallScore: scores.overall,
      userId,
    });

    return quality;
  }

  /**
   * Record user feedback on explanation
   */
  async recordFeedback(
    tenantId: string,
    explanationId: string,
    feedback: {
      helpful: boolean;
      rating?: number;
      comments?: string;
      suggestedImprovements?: string[];
    },
    userId?: string
  ): Promise<void> {
    try {
      // Find quality record
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.explanationId = @explanationId',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@explanationId', value: explanationId },
        ],
      };

      const { resources } = await this.qualityContainer.items.query(querySpec).fetchAll();
      const quality = resources[0] as ExplanationQuality | undefined;

      if (quality) {
        quality.feedback = feedback;
        quality.updatedAt = new Date();
        await this.qualityContainer.item(quality.qualityId, tenantId).replace(quality);

        // Learn from feedback
        if (userId && this.feedbackLearningService) {
          await this.learnFromFeedback(tenantId, userId, quality, feedback);
        }
      } else {
        // Create new quality record if not found
        const newQuality: ExplanationQuality = {
          qualityId: uuidv4(),
          tenantId,
          userId,
          explanationId,
          responseId: '', // Would need to get from explanation
          scores: {
            clarity: 0.5,
            completeness: 0.5,
            actionability: 0.5,
            relevance: 0.5,
            trustworthiness: 0.5,
            overall: 0.5,
          },
          feedback,
          style: 'detailed',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await this.qualityContainer.items.create(newQuality);
      }

      this.monitoring?.trackEvent('explanation_quality.feedback_recorded', {
        tenantId,
        explanationId,
        helpful: feedback.helpful,
        rating: feedback.rating,
        userId,
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'recordFeedback',
        tenantId,
        explanationId,
      });
    }
  }

  /**
   * Personalize explanation based on user preferences
   */
  async personalizeExplanation(
    request: PersonalizedExplanationRequest
  ): Promise<Explanation> {
    const { tenantId, userId, baseExplanation, preferredStyle } = request;

    // Get user preferences
    const preferences = await this.getUserPreferences(tenantId, userId);
    const style = preferredStyle || this.inferPreferredStyle(preferences);

    // Adapt explanation based on style
    const personalized = this.adaptExplanationToStyle(baseExplanation, style, preferences);

    // Assess quality of personalized explanation
    await this.assessQuality(tenantId, personalized, userId);

    return personalized;
  }

  /**
   * Get quality metrics
   */
  async getQualityMetrics(
    tenantId: string,
    userId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<QualityMetrics> {
    const range = timeRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date(),
    };

    let querySpec: any = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
      parameters: [{ name: '@tenantId', value: tenantId }],
    };

    if (userId) {
      querySpec.query += ' AND c.userId = @userId';
      querySpec.parameters.push({ name: '@userId', value: userId });
    }

    querySpec.query += ' AND c.createdAt >= @start AND c.createdAt <= @end';

    querySpec.parameters.push(
      { name: '@start', value: range.start.toISOString() },
      { name: '@end', value: range.end.toISOString() }
    );

    const { resources } = await this.qualityContainer.items.query(querySpec).fetchAll();
    const qualities = resources as ExplanationQuality[];

    if (qualities.length === 0) {
      return {
        tenantId,
        userId,
        timeRange: range,
        metrics: {
          avgQuality: 0,
          avgClarity: 0,
          avgCompleteness: 0,
          avgActionability: 0,
          feedbackRate: 0,
          helpfulRate: 0,
          improvementTrend: 0,
        },
        topIssues: [],
      };
    }

    // Calculate metrics
    const avgQuality = qualities.reduce((sum, q) => sum + q.scores.overall, 0) / qualities.length;
    const avgClarity = qualities.reduce((sum, q) => sum + q.scores.clarity, 0) / qualities.length;
    const avgCompleteness = qualities.reduce((sum, q) => sum + q.scores.completeness, 0) / qualities.length;
    const avgActionability = qualities.reduce((sum, q) => sum + q.scores.actionability, 0) / qualities.length;

    const withFeedback = qualities.filter(q => q.feedback.rating !== undefined || q.feedback.comments);
    const feedbackRate = qualities.length > 0 ? withFeedback.length / qualities.length : 0;

    const helpful = qualities.filter(q => q.feedback.helpful);
    const helpfulRate = qualities.length > 0 ? helpful.length / qualities.length : 0;

    // Calculate improvement trend
    const sortedByDate = qualities.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const firstHalf = sortedByDate.slice(0, Math.floor(sortedByDate.length / 2));
    const secondHalf = sortedByDate.slice(Math.floor(sortedByDate.length / 2));
    
    const firstHalfAvg = firstHalf.length > 0 
      ? firstHalf.reduce((sum, q) => sum + q.scores.overall, 0) / firstHalf.length 
      : 0;
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((sum, q) => sum + q.scores.overall, 0) / secondHalf.length
      : 0;
    
    const improvementTrend = firstHalfAvg > 0 
      ? (secondHalfAvg - firstHalfAvg) / firstHalfAvg 
      : 0;

    // Identify top issues
    const dimensionScores: Record<QualityDimension, Array<{ score: number }>> = {
      clarity: [],
      completeness: [],
      actionability: [],
      relevance: [],
      trustworthiness: [],
    };

    qualities.forEach(q => {
      dimensionScores.clarity.push({ score: q.scores.clarity });
      dimensionScores.completeness.push({ score: q.scores.completeness });
      dimensionScores.actionability.push({ score: q.scores.actionability });
      dimensionScores.relevance.push({ score: q.scores.relevance });
      dimensionScores.trustworthiness.push({ score: q.scores.trustworthiness });
    });

    const topIssues = Object.entries(dimensionScores)
      .map(([dimension, scores]) => ({
        dimension: dimension as QualityDimension,
        frequency: scores.filter(s => s.score < 0.6).length,
        avgScore: scores.reduce((sum, s) => sum + s.score, 0) / scores.length,
      }))
      .filter(issue => issue.frequency > 0)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    return {
      tenantId,
      userId,
      timeRange: range,
      metrics: {
        avgQuality,
        avgClarity,
        avgCompleteness,
        avgActionability,
        feedbackRate,
        helpfulRate,
        improvementTrend,
      },
      topIssues,
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Calculate quality scores
   */
  private calculateQualityScores(explanation: Explanation): ExplanationQuality['scores'] {
    // Clarity: Based on summary length, structure, readability
    const clarity = this.assessClarity(explanation);

    // Completeness: Based on presence of all explanation components
    const completeness = this.assessCompleteness(explanation);

    // Actionability: Based on presence of actionable insights
    const actionability = this.assessActionability(explanation);

    // Relevance: Based on source attribution and key factors
    const relevance = this.assessRelevance(explanation);

    // Trustworthiness: Based on confidence breakdown and limitations
    const trustworthiness = this.assessTrustworthiness(explanation);

    // Overall: Weighted average
    const overall = (
      clarity * 0.25 +
      completeness * 0.20 +
      actionability * 0.25 +
      relevance * 0.15 +
      trustworthiness * 0.15
    );

    return {
      clarity,
      completeness,
      actionability,
      relevance,
      trustworthiness,
      overall,
    };
  }

  /**
   * Assess clarity
   */
  private assessClarity(explanation: Explanation): number {
    let score = 0.5;

    // Summary exists and is reasonable length
    if (explanation.summary && explanation.summary.length > 20 && explanation.summary.length < 500) {
      score += 0.2;
    }

    // Reasoning steps are clear
    if (explanation.reasoningSteps && explanation.reasoningSteps.length > 0) {
      score += 0.2;
    }

    // Key factors are identified
    if (explanation.keyFactors && explanation.keyFactors.length > 0) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  /**
   * Assess completeness
   */
  private assessCompleteness(explanation: Explanation): number {
    let score = 0.0;

    if (explanation.summary) score += 0.2;
    if (explanation.reasoningSteps && explanation.reasoningSteps.length > 0) score += 0.2;
    if (explanation.sourceAttribution && explanation.sourceAttribution.length > 0) score += 0.2;
    if (explanation.confidenceBreakdown) score += 0.2;
    if (explanation.keyFactors && explanation.keyFactors.length > 0) score += 0.1;
    if (explanation.limitations && explanation.limitations.length > 0) score += 0.1;

    return score;
  }

  /**
   * Assess actionability
   */
  private assessActionability(explanation: Explanation): number {
    let score = 0.3; // Base score

    // Check for actionable language in summary
    const actionableWords = ['should', 'recommend', 'suggest', 'consider', 'action', 'next steps'];
    const summaryLower = explanation.summary.toLowerCase();
    if (actionableWords.some(word => summaryLower.includes(word))) {
      score += 0.3;
    }

    // Key factors with influence
    if (explanation.keyFactors && explanation.keyFactors.some(f => f.influence !== 'neutral')) {
      score += 0.2;
    }

    // Alternatives provided
    if (explanation.alternatives && explanation.alternatives.length > 0) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  /**
   * Assess relevance
   */
  private assessRelevance(explanation: Explanation): number {
    let score = 0.5;

    // Source attribution
    if (explanation.sourceAttribution && explanation.sourceAttribution.length > 0) {
      score += 0.3;
      const highRelevanceSources = explanation.sourceAttribution.filter(s => s.relevance > 0.7);
      if (highRelevanceSources.length > 0) {
        score += 0.2;
      }
    }

    return Math.min(1.0, score);
  }

  /**
   * Assess trustworthiness
   */
  private assessTrustworthiness(explanation: Explanation): number {
    let score = 0.5;

    // Confidence breakdown
    if (explanation.confidenceBreakdown) {
      if (explanation.confidenceBreakdown.overall > 0.7) {
        score += 0.2;
      }
      if (explanation.confidenceBreakdown.explanation) {
        score += 0.2;
      }
    }

    // Limitations acknowledged
    if (explanation.limitations && explanation.limitations.length > 0) {
      score += 0.1; // Acknowledging limitations increases trust
    }

    return Math.min(1.0, score);
  }

  /**
   * Detect explanation style
   */
  private detectStyle(explanation: Explanation): ExplanationStyle {
    const summaryLength = explanation.summary?.length || 0;
    const hasTechnical = explanation.debug !== undefined;
    const hasDetailedSteps = explanation.reasoningSteps && explanation.reasoningSteps.length > 5;

    if (hasTechnical && hasDetailedSteps) {
      return 'technical';
    } else if (summaryLength > 300) {
      return 'detailed';
    } else if (summaryLength < 100) {
      return 'concise';
    } else {
      return 'business';
    }
  }

  /**
   * Get user preferences
   */
  private async getUserPreferences(
    tenantId: string,
    userId: string
  ): Promise<ExplanationQuality['preferences'] | undefined> {
    // Query recent quality records to infer preferences
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId ORDER BY c.createdAt DESC',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@userId', value: userId },
      ],
    };

    const { resources } = await this.qualityContainer.items.query(querySpec).fetchAll();
    const recentQualities = (resources as ExplanationQuality[]).slice(0, 10);

    if (recentQualities.length === 0) {
      return undefined;
    }

    // Infer preferences from feedback
    const helpfulQualities = recentQualities.filter(q => q.feedback.helpful);
    if (helpfulQualities.length === 0) {
      return undefined;
    }

    const avgSummaryLength = helpfulQualities.reduce((sum, q) => {
      // Would need to get explanation to calculate length
      return sum + 200; // Placeholder
    }, 0) / helpfulQualities.length;

    return {
      preferredLength: avgSummaryLength < 150 ? 'short' : avgSummaryLength > 400 ? 'long' : 'medium',
      preferredDetail: 'medium', // Would infer from feedback
      preferredFormat: 'text', // Would infer from feedback
    };
  }

  /**
   * Infer preferred style from preferences
   */
  private inferPreferredStyle(
    preferences?: ExplanationQuality['preferences']
  ): ExplanationStyle {
    if (!preferences) {
      return 'detailed';
    }

    if (preferences.preferredLength === 'short') {
      return 'concise';
    } else if (preferences.preferredDetail === 'high') {
      return 'technical';
    } else {
      return 'detailed';
    }
  }

  /**
   * Adapt explanation to style
   */
  private adaptExplanationToStyle(
    explanation: Explanation,
    style: ExplanationStyle,
    preferences?: ExplanationQuality['preferences']
  ): Explanation {
    // Create adapted explanation
    const adapted = { ...explanation };

    switch (style) {
      case 'concise':
        // Shorten summary
        if (adapted.summary && adapted.summary.length > 150) {
          adapted.summary = adapted.summary.substring(0, 150) + '...';
        }
        // Reduce reasoning steps
        if (adapted.reasoningSteps && adapted.reasoningSteps.length > 3) {
          adapted.reasoningSteps = adapted.reasoningSteps.slice(0, 3);
        }
        break;

      case 'technical':
        // Keep all technical details
        // Add more debug info if available
        break;

      case 'detailed':
        // Ensure comprehensive explanation
        // Add more reasoning steps if needed
        break;

      case 'business':
        // Focus on business impact
        // Simplify technical details
        break;
    }

    return adapted;
  }

  /**
   * Learn from feedback
   */
  private async learnFromFeedback(
    tenantId: string,
    userId: string,
    quality: ExplanationQuality,
    feedback: ExplanationQuality['feedback']
  ): Promise<void> {
    if (!this.feedbackLearningService) {
      return;
    }

    try {
      // Record feedback as learning signal
      const outcome = feedback.helpful ? 1.0 : 0.0;
      if (feedback.rating) {
        // Convert numeric rating to feedback rating type
        const rating: 'positive' | 'negative' | 'neutral' = 
          feedback.rating >= 4 ? 'positive' : 
          feedback.rating <= 2 ? 'negative' : 
          'neutral';
        await this.feedbackLearningService.recordFeedback({
          tenantId,
          userId,
          conversationId: quality.explanationId, // Use explanationId as conversationId
          messageId: quality.explanationId, // Use explanationId as messageId
          query: `Explanation quality feedback for ${quality.style} style`,
          response: JSON.stringify({ style: quality.style, scores: quality.scores }),
          modelId: 'unknown', // Model ID not available in ExplanationQuality
          insightType: 'explanation_quality',
          rating,
          score: feedback.rating,
        });
      }
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'learnFromFeedback',
        tenantId,
        userId,
      });
    }
  }
}

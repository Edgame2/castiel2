/**
 * Explanation Monitoring Service
 * Monitors explanation usage and effectiveness
 * 
 * Features:
 * - Explanation view tracking
 * - User engagement metrics
 * - Explanation effectiveness measurement
 * - Gap identification (what users need explained)
 * - Usage pattern analysis
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { ExplanationQualityService } from './explanation-quality.service.js';
import { ExplainableAIService } from './explainable-ai.service.js';

export interface ExplanationView {
  viewId: string;
  tenantId: string; // Partition key
  userId: string;
  explanationId: string;
  responseId: string;
  viewedAt: Date;
  viewDuration?: number; // seconds
  sectionsViewed?: string[]; // Which sections were viewed
  interactions?: Array<{
    type: 'expand' | 'collapse' | 'click_source' | 'request_more_detail';
    timestamp: Date;
    section?: string;
  }>;
  metadata?: Record<string, any>;
}

export interface ExplanationUsageMetrics {
  metricsId: string;
  tenantId: string;
  userId?: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  usage: {
    totalViews: number;
    uniqueExplanations: number;
    avgViewDuration: number; // seconds
    avgInteractionsPerView: number;
    mostViewedSections: Array<{ section: string; views: number }>;
    leastViewedSections: Array<{ section: string; views: number }>;
  };
  engagement: {
    engagementScore: number; // 0-1
    deepEngagementRate: number; // 0-1: % of views with interactions
    bounceRate: number; // 0-1: % of views < 5 seconds
    returnRate: number; // 0-1: % of users viewing multiple explanations
  };
  effectiveness: {
    avgQualityScore: number; // 0-1
    helpfulRate: number; // 0-1: % marked helpful
    improvementRate: number; // 0-1: % with improvement suggestions
  };
  gaps: Array<{
    type: 'missing_explanation' | 'unclear_explanation' | 'insufficient_detail';
    frequency: number;
    examples: string[];
  }>;
  createdAt: Date;
}

export interface ExplanationGap {
  gapId: string;
  tenantId: string;
  userId?: string;
  gapType: 'missing_explanation' | 'unclear_explanation' | 'insufficient_detail';
  context: {
    responseId?: string;
    query?: string;
    topic?: string;
    requestedAt: Date;
  };
  frequency: number;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  resolvedAt?: Date;
}

/**
 * Explanation Monitoring Service
 */
export class ExplanationMonitoringService {
  private client: CosmosClient;
  private database: Database;
  private viewsContainer: Container;
  private metricsContainer: Container;
  private gapsContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private explanationQualityService?: ExplanationQualityService;
  private explainableAIService?: ExplainableAIService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    explanationQualityService?: ExplanationQualityService,
    explainableAIService?: ExplainableAIService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.explanationQualityService = explanationQualityService;
    this.explainableAIService = explainableAIService;

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
    this.viewsContainer = this.database.container(config.cosmosDb.containers.explanationMonitoring);
    this.metricsContainer = this.database.container(config.cosmosDb.containers.explanationMonitoring);
    this.gapsContainer = this.database.container(config.cosmosDb.containers.explanationMonitoring);
  }

  /**
   * Track explanation view
   */
  async trackView(
    tenantId: string,
    userId: string,
    explanationId: string,
    responseId: string,
    metadata?: Record<string, any>
  ): Promise<ExplanationView> {
    const viewId = uuidv4();
    const view: ExplanationView = {
      viewId,
      tenantId,
      userId,
      explanationId,
      responseId,
      viewedAt: new Date(),
      metadata,
    };

    await this.viewsContainer.items.create(view);

    this.monitoring?.trackEvent('explanation_monitoring.viewed', {
      tenantId,
      userId,
      explanationId,
      responseId,
    });

    return view;
  }

  /**
   * Update view with duration and interactions
   */
  async updateView(
    viewId: string,
    tenantId: string,
    updates: {
      viewDuration?: number;
      sectionsViewed?: string[];
      interactions?: ExplanationView['interactions'];
    }
  ): Promise<void> {
    try {
      const { resource: view } = await this.viewsContainer.item(viewId, tenantId).read<ExplanationView>();
      if (!view) {
        return;
      }

      view.viewDuration = updates.viewDuration ?? view.viewDuration;
      view.sectionsViewed = updates.sectionsViewed ?? view.sectionsViewed;
      if (updates.interactions) {
        view.interactions = [...(view.interactions || []), ...updates.interactions];
      }

      await this.viewsContainer.item(viewId, tenantId).replace(view);
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'updateView',
        tenantId,
        viewId,
      });
    }
  }

  /**
   * Record interaction with explanation
   */
  async recordInteraction(
    viewId: string,
    tenantId: string,
    interaction: {
      type: 'expand' | 'collapse' | 'click_source' | 'request_more_detail';
      section?: string;
    }
  ): Promise<void> {
    await this.updateView(viewId, tenantId, {
      interactions: [{
        ...interaction,
        timestamp: new Date(),
      }],
    });
  }

  /**
   * Get usage metrics
   */
  async getUsageMetrics(
    tenantId: string,
    userId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ExplanationUsageMetrics> {
    const range = timeRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date(),
    };

    // Check cache
    const cacheKey = userId
      ? `explanation_metrics:${tenantId}:${userId}`
      : `explanation_metrics:${tenantId}`;

    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Get views
    let querySpec: any = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
      parameters: [{ name: '@tenantId', value: tenantId }],
    };

    if (userId) {
      querySpec.query += ' AND c.userId = @userId';
      querySpec.parameters.push({ name: '@userId', value: userId });
    }

    querySpec.query += ' AND c.viewedAt >= @start AND c.viewedAt <= @end';
    querySpec.parameters.push(
      { name: '@start', value: range.start.toISOString() },
      { name: '@end', value: range.end.toISOString() }
    );

    const { resources: views } = await this.viewsContainer.items.query(querySpec).fetchAll();
    const explanationViews = views as ExplanationView[];

    // Calculate usage metrics
    const totalViews = explanationViews.length;
    const uniqueExplanations = new Set(explanationViews.map(v => v.explanationId)).size;
    const avgViewDuration = explanationViews
      .filter(v => v.viewDuration !== undefined)
      .reduce((sum, v) => sum + (v.viewDuration || 0), 0) / 
      Math.max(1, explanationViews.filter(v => v.viewDuration !== undefined).length);

    const totalInteractions = explanationViews.reduce((sum, v) => 
      sum + (v.interactions?.length || 0), 0);
    const avgInteractionsPerView = totalViews > 0 ? totalInteractions / totalViews : 0;

    // Section views
    const sectionViews: Record<string, number> = {};
    explanationViews.forEach(v => {
      v.sectionsViewed?.forEach(section => {
        sectionViews[section] = (sectionViews[section] || 0) + 1;
      });
    });

    const mostViewedSections = Object.entries(sectionViews)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([section, views]) => ({ section, views }));

    const leastViewedSections = Object.entries(sectionViews)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 5)
      .map(([section, views]) => ({ section, views }));

    // Engagement metrics
    const deepEngagement = explanationViews.filter(v => 
      (v.interactions?.length || 0) > 0
    ).length;
    const deepEngagementRate = totalViews > 0 ? deepEngagement / totalViews : 0;

    const bounces = explanationViews.filter(v => 
      (v.viewDuration || 0) < 5
    ).length;
    const bounceRate = totalViews > 0 ? bounces / totalViews : 0;

    const uniqueUsers = new Set(explanationViews.map(v => v.userId));
    const usersWithMultipleViews = Array.from(uniqueUsers).filter(userId => {
      const userViews = explanationViews.filter(v => v.userId === userId);
      return userViews.length > 1;
    }).length;
    const returnRate = uniqueUsers.size > 0 ? usersWithMultipleViews / uniqueUsers.size : 0;

    const engagementScore = (
      (1 - bounceRate) * 0.4 +
      deepEngagementRate * 0.4 +
      returnRate * 0.2
    );

    // Effectiveness metrics (would integrate with ExplanationQualityService)
    const avgQualityScore = 0.7; // Placeholder - would query from quality service
    const helpfulRate = 0.6; // Placeholder
    const improvementRate = 0.2; // Placeholder

    // Identify gaps
    const gaps = await this.identifyGaps(tenantId, userId, range);

    const metrics: ExplanationUsageMetrics = {
      metricsId: uuidv4(),
      tenantId,
      userId,
      timeRange: range,
      usage: {
        totalViews,
        uniqueExplanations,
        avgViewDuration,
        avgInteractionsPerView,
        mostViewedSections,
        leastViewedSections,
      },
      engagement: {
        engagementScore,
        deepEngagementRate,
        bounceRate,
        returnRate,
      },
      effectiveness: {
        avgQualityScore,
        helpfulRate,
        improvementRate,
      },
      gaps,
      createdAt: new Date(),
    };

    // Cache for 1 hour
    if (this.redis) {
      await this.redis.setex(cacheKey, 60 * 60, JSON.stringify(metrics));
    }

    await this.metricsContainer.items.create(metrics);

    return metrics;
  }

  /**
   * Identify explanation gaps
   */
  async identifyGaps(
    tenantId: string,
    userId: string | undefined,
    timeRange: { start: Date; end: Date }
  ): Promise<ExplanationUsageMetrics['gaps']> {
    const gaps: ExplanationUsageMetrics['gaps'] = [];

    // Query for gaps
    let querySpec: any = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.gapType != null',
      parameters: [{ name: '@tenantId', value: tenantId }],
    };

    if (userId) {
      querySpec.query += ' AND c.userId = @userId';
      querySpec.parameters.push({ name: '@userId', value: userId });
    }

    querySpec.query += ' AND c.createdAt >= @start AND c.createdAt <= @end';
    querySpec.parameters.push(
      { name: '@start', value: timeRange.start.toISOString() },
      { name: '@end', value: timeRange.end.toISOString() }
    );

    const { resources } = await this.gapsContainer.items.query(querySpec).fetchAll();
    const gapRecords = resources as ExplanationGap[];

    // Group by type
    const gapsByType: Record<string, ExplanationGap[]> = {};
    gapRecords.forEach(gap => {
      if (!gapsByType[gap.gapType]) {
        gapsByType[gap.gapType] = [];
      }
      gapsByType[gap.gapType].push(gap);
    });

    // Build gap summary
    for (const [gapType, records] of Object.entries(gapsByType)) {
      gaps.push({
        type: gapType as any,
        frequency: records.length,
        examples: records
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 3)
          .map(g => g.context.topic || g.context.query || 'Unknown'),
      });
    }

    return gaps;
  }

  /**
   * Record explanation gap
   */
  async recordGap(
    tenantId: string,
    gap: Omit<ExplanationGap, 'gapId' | 'createdAt'>
  ): Promise<ExplanationGap> {
    const gapId = uuidv4();
    const explanationGap: ExplanationGap = {
      ...gap,
      gapId,
      createdAt: new Date(),
    };

    await this.gapsContainer.items.create(explanationGap);

    this.monitoring?.trackEvent('explanation_monitoring.gap_recorded', {
      tenantId,
      gapId,
      gapType: gap.gapType,
      userId: gap.userId,
    });

    return explanationGap;
  }

  /**
   * Analyze usage patterns
   */
  async analyzeUsagePatterns(
    tenantId: string,
    userId?: string
  ): Promise<{
    patterns: Array<{
      pattern: string;
      frequency: number;
      description: string;
    }>;
    recommendations: string[];
  }> {
    const metrics = await this.getUsageMetrics(tenantId, userId);

    const patterns: Array<{ pattern: string; frequency: number; description: string }> = [];
    const recommendations: string[] = [];

    // Pattern: High bounce rate
    if (metrics.engagement.bounceRate > 0.5) {
      patterns.push({
        pattern: 'high_bounce_rate',
        frequency: metrics.engagement.bounceRate,
        description: 'High bounce rate indicates explanations may be too long or unclear',
      });
      recommendations.push('Consider making explanations more concise or adding visual summaries');
    }

    // Pattern: Low engagement
    if (metrics.engagement.deepEngagementRate < 0.2) {
      patterns.push({
        pattern: 'low_engagement',
        frequency: 1 - metrics.engagement.deepEngagementRate,
        description: 'Low interaction rate suggests explanations may not be engaging',
      });
      recommendations.push('Add interactive elements or expandable sections to increase engagement');
    }

    // Pattern: Section preferences
    if (metrics.usage.mostViewedSections.length > 0) {
      patterns.push({
        pattern: 'section_preferences',
        frequency: 1.0,
        description: `Users prefer ${metrics.usage.mostViewedSections[0].section} section`,
      });
      recommendations.push(`Prioritize ${metrics.usage.mostViewedSections[0].section} content in explanations`);
    }

    return { patterns, recommendations };
  }
}

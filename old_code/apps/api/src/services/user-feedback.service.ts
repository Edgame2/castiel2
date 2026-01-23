/**
 * Phase 6.2: User Feedback Service
 * 
 * Comprehensive feedback collection, analysis, and continuous improvement system.
 * Builds on existing FeedbackLearningService and adds:
 * - Automated alerts for negative patterns
 * - Integration with prompt improvement
 * - Feedback visibility and metrics
 * - Rapid response to critical feedback
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import type { FeedbackLearningService, FeedbackEntry, FeedbackAnalysis, LearningRecommendation } from './feedback-learning.service.js';
import type { PromptResolverService } from './ai-insights/prompt-resolver.service.js';
import type { InsightService } from './insight.service.js';
import { v4 as uuidv4 } from 'uuid';

export interface FeedbackAlert {
  id: string;
  tenantId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'negative_pattern' | 'quality_degradation' | 'model_issue' | 'prompt_issue' | 'context_issue';
  title: string;
  description: string;
  metrics: {
    negativeRate: number;
    sampleSize: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  recommendations: string[];
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

export interface FeedbackMetrics {
  period: 'day' | 'week' | 'month';
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  positiveRate: number;
  negativeRate: number;
  averageRating: number;
  satisfactionScore: number; // 0-100
  trends: {
    positiveRate: number; // Change from previous period
    negativeRate: number;
    averageRating: number;
  };
  topIssues: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  byModel: Record<string, {
    total: number;
    positiveRate: number;
    negativeRate: number;
    averageRating: number;
  }>;
  byInsightType: Record<string, {
    total: number;
    positiveRate: number;
    negativeRate: number;
    averageRating: number;
  }>;
}

export interface PromptImprovementSuggestion {
  promptId: string;
  promptSlug: string;
  currentVersion: number;
  suggestedChanges: {
    systemPrompt?: string;
    userPrompt?: string;
    reason: string;
    basedOnFeedback: string[];
    expectedImprovement: number; // Percentage
  };
  priority: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
}

export interface FeedbackDashboard {
  metrics: FeedbackMetrics;
  recentAlerts: FeedbackAlert[];
  topRecommendations: LearningRecommendation[];
  improvementSuggestions: PromptImprovementSuggestion[];
  trends: {
    satisfactionOverTime: Array<{ date: string; score: number }>;
    feedbackVolumeOverTime: Array<{ date: string; count: number }>;
  };
}

/**
 * User Feedback Service
 * Comprehensive feedback management and continuous improvement
 */
export class UserFeedbackService {
  private alertThresholds = {
    negativeRate: {
      low: 0.15,      // 15% negative rate triggers low alert
      medium: 0.25,  // 25% negative rate triggers medium alert
      high: 0.35,    // 35% negative rate triggers high alert
      critical: 0.50, // 50% negative rate triggers critical alert
    },
    sampleSize: 10,  // Minimum sample size for alerts
  };

  // Phase 6.2: In-memory alert storage (in production, this would be persisted to database)
  private alerts: Map<string, FeedbackAlert[]> = new Map(); // tenantId -> alerts
  private readonly MAX_ALERTS_PER_TENANT = 100; // Keep last 100 alerts per tenant

  constructor(
    private monitoring: IMonitoringProvider,
    private feedbackLearningService: FeedbackLearningService,
    private promptResolver?: PromptResolverService,
    private insightService?: InsightService
  ) {}

  // ============================================
  // Feedback Collection Enhancement
  // ============================================

  /**
   * Record feedback with enhanced tracking and immediate analysis
   */
  async recordFeedback(
    feedback: Omit<FeedbackEntry, 'id' | 'createdAt'>
  ): Promise<FeedbackEntry> {
    // Record in learning service
    const entry = await this.feedbackLearningService.recordFeedback(feedback);

    // Phase 6.2: Immediate pattern detection and alerting
    if (feedback.rating === 'negative' || feedback.thumbs === 'down') {
      // Check for critical issues
      if ((feedback as any).reportedAsHarmful || feedback.categories?.includes('hallucination')) {
        await this.triggerCriticalAlert(feedback);
      }

      // Check for negative patterns (async, non-blocking)
      this.checkNegativePatterns(feedback.tenantId).catch((error) => {
        this.monitoring.trackException(error as Error, {
          operation: 'user-feedback.check-negative-patterns',
          tenantId: feedback.tenantId,
        });
      });
    }

    // Track feedback collection
    this.monitoring.trackEvent('user-feedback.recorded', {
      tenantId: feedback.tenantId,
      rating: feedback.rating,
      hasComment: !!feedback.comment,
      categories: feedback.categories?.length || 0,
      modelId: feedback.modelId,
      insightType: feedback.insightType,
    });

    return entry;
  }

  // ============================================
  // Automated Alerts (23.3 Rapid Response)
  // ============================================

  /**
   * Check for negative patterns and trigger alerts
   */
  private async checkNegativePatterns(tenantId: string): Promise<void> {
    const analysis = await this.feedbackLearningService.analyzeFeedback(tenantId, 'day');

    if (analysis.totalFeedback < this.alertThresholds.sampleSize) {
      return; // Not enough data
    }

    // Check overall negative rate
    if (analysis.negativeRate >= this.alertThresholds.negativeRate.critical) {
      await this.createAlert(tenantId, {
        severity: 'critical',
        type: 'negative_pattern',
        title: 'Critical: High Negative Feedback Rate',
        description: `Negative feedback rate is ${(analysis.negativeRate * 100).toFixed(1)}%, exceeding critical threshold of ${(this.alertThresholds.negativeRate.critical * 100).toFixed(1)}%`,
        metrics: {
          negativeRate: analysis.negativeRate,
          sampleSize: analysis.totalFeedback,
          trend: 'degrading',
        },
        recommendations: [
          'Review recent prompt changes',
          'Check for model degradation',
          'Investigate context quality issues',
          'Review top negative categories',
        ],
      });
    } else if (analysis.negativeRate >= this.alertThresholds.negativeRate.high) {
      await this.createAlert(tenantId, {
        severity: 'high',
        type: 'negative_pattern',
        title: 'High Negative Feedback Rate',
        description: `Negative feedback rate is ${(analysis.negativeRate * 100).toFixed(1)}%`,
        metrics: {
          negativeRate: analysis.negativeRate,
          sampleSize: analysis.totalFeedback,
          trend: 'degrading',
        },
        recommendations: [
          'Monitor feedback trends closely',
          'Review problematic patterns',
          'Consider prompt adjustments',
        ],
      });
    }

    // Check model-specific issues
    for (const [modelId, modelFeedback] of Object.entries(analysis.byModel)) {
      if (modelFeedback.totalResponses >= this.alertThresholds.sampleSize &&
          modelFeedback.negativeRate >= this.alertThresholds.negativeRate.high) {
        await this.createAlert(tenantId, {
          severity: 'high',
          type: 'model_issue',
          title: `Model Issue: ${modelId}`,
          description: `Model ${modelId} has ${(modelFeedback.negativeRate * 100).toFixed(1)}% negative feedback rate`,
          metrics: {
            negativeRate: modelFeedback.negativeRate,
            sampleSize: modelFeedback.totalResponses,
            trend: 'degrading',
          },
          recommendations: [
            `Consider switching from ${modelId} for affected use cases`,
            'Review model-specific prompt templates',
            'Check for model availability issues',
          ],
        });
      }
    }

    // Check insight type issues
    for (const [insightType, typeFeedback] of Object.entries(analysis.byInsightType)) {
      if (typeFeedback.totalResponses >= this.alertThresholds.sampleSize &&
          typeFeedback.negativeRate >= this.alertThresholds.negativeRate.high) {
        await this.createAlert(tenantId, {
          severity: 'high',
          type: 'prompt_issue',
          title: `Prompt Issue: ${insightType} insights`,
          description: `${insightType} insights have ${(typeFeedback.negativeRate * 100).toFixed(1)}% negative feedback rate`,
          metrics: {
            negativeRate: typeFeedback.negativeRate,
            sampleSize: typeFeedback.totalResponses,
            trend: 'degrading',
          },
          recommendations: [
            `Review prompt template for insights-${insightType}`,
            'Check context assembly for this insight type',
            'Consider A/B testing alternative prompts',
          ],
        });
      }
    }
  }

  /**
   * Trigger critical alert for harmful content
   */
  private async triggerCriticalAlert(feedback: Omit<FeedbackEntry, 'id' | 'createdAt'>): Promise<void> {
    await this.createAlert(feedback.tenantId, {
      severity: 'critical',
      type: 'negative_pattern',
      title: 'Critical: Harmful Content Reported',
      description: `User reported harmful content in response. Model: ${feedback.modelId}, Insight Type: ${feedback.insightType || 'unknown'}`,
      metrics: {
        negativeRate: 1.0,
        sampleSize: 1,
        trend: 'degrading',
      },
      recommendations: [
        'Immediately review the reported content',
        'Check prompt injection defenses',
        'Review content filters',
        'Consider blocking this model/template combination',
      ],
    });

    // Track critical event
    this.monitoring.trackEvent('user-feedback.critical-harmful-reported', {
      tenantId: feedback.tenantId,
      modelId: feedback.modelId,
      insightType: feedback.insightType,
      messageId: feedback.messageId,
    });
  }

  /**
   * Create an alert
   */
  private async createAlert(
    tenantId: string,
    alert: Omit<FeedbackAlert, 'id' | 'tenantId' | 'createdAt'>
  ): Promise<FeedbackAlert> {
    const feedbackAlert: FeedbackAlert = {
      id: uuidv4(),
      tenantId,
      ...alert,
      createdAt: new Date(),
    };

    // Phase 6.2: Store alert (in-memory - in production, persist to database)
    const tenantAlerts = this.alerts.get(tenantId) || [];
    tenantAlerts.unshift(feedbackAlert); // Add to beginning
    // Keep only recent alerts
    if (tenantAlerts.length > this.MAX_ALERTS_PER_TENANT) {
      tenantAlerts.splice(this.MAX_ALERTS_PER_TENANT);
    }
    this.alerts.set(tenantId, tenantAlerts);

    // Track alert creation
    this.monitoring.trackEvent('user-feedback.alert-created', {
      tenantId,
      severity: alert.severity,
      type: alert.type,
      negativeRate: alert.metrics.negativeRate,
    });

    // For critical alerts, also track as exception for immediate attention
    if (alert.severity === 'critical') {
      this.monitoring.trackException(new Error(`Critical feedback alert: ${alert.title}`), {
        operation: 'user-feedback.critical-alert',
        tenantId,
        alertType: alert.type,
      });
    }

    return feedbackAlert;
  }

  // ============================================
  // Feedback Metrics (23.5 Feedback Visibility)
  // ============================================

  /**
   * Get comprehensive feedback metrics
   */
  async getFeedbackMetrics(
    tenantId: string,
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<FeedbackMetrics> {
    const analysis = await this.feedbackLearningService.analyzeFeedback(tenantId, period);

    // Calculate trends (compare with previous period)
    const previousPeriod = period === 'day' ? 'day' : period === 'week' ? 'day' : 'week';
    const previousAnalysis = await this.feedbackLearningService.analyzeFeedback(tenantId, previousPeriod);

    const positiveCount = Math.round(analysis.positiveRate * analysis.totalFeedback);
    const negativeCount = Math.round(analysis.negativeRate * analysis.totalFeedback);
    const neutralCount = analysis.totalFeedback - positiveCount - negativeCount;

    // Calculate satisfaction score (0-100)
    const satisfactionScore = analysis.averageScore > 0
      ? (analysis.averageScore / 5) * 100
      : analysis.positiveRate * 100;

    return {
      period,
      totalFeedback: analysis.totalFeedback,
      positiveCount,
      negativeCount,
      neutralCount,
      positiveRate: analysis.positiveRate,
      negativeRate: analysis.negativeRate,
      averageRating: analysis.averageScore,
      satisfactionScore,
      trends: {
        positiveRate: analysis.positiveRate - previousAnalysis.positiveRate,
        negativeRate: analysis.negativeRate - previousAnalysis.negativeRate,
        averageRating: analysis.averageScore - previousAnalysis.averageScore,
      },
      topIssues: analysis.topNegativeCategories.map(cat => ({
        category: cat.category,
        count: cat.count,
        percentage: (cat.count / negativeCount) * 100,
      })),
      byModel: Object.fromEntries(
        Object.entries(analysis.byModel).map(([modelId, feedback]) => [
          modelId,
          {
            total: feedback.totalResponses,
            positiveRate: feedback.positiveRate,
            negativeRate: feedback.negativeRate,
            averageRating: feedback.avgScore,
          },
        ])
      ),
      byInsightType: Object.fromEntries(
        Object.entries(analysis.byInsightType).map(([type, feedback]) => [
          type,
          {
            total: feedback.totalResponses,
            positiveRate: feedback.positiveRate,
            negativeRate: feedback.negativeRate,
            averageRating: feedback.avgScore,
          },
        ])
      ),
    };
  }

  /**
   * Get feedback dashboard data
   */
  async getFeedbackDashboard(tenantId: string): Promise<FeedbackDashboard> {
    const metrics = await this.getFeedbackMetrics(tenantId, 'week');
    const analysis = await this.feedbackLearningService.analyzeFeedback(tenantId, 'week');

    // Phase 6.2: Get recent alerts (in-memory - in production, retrieve from database)
    const recentAlerts = (this.alerts.get(tenantId) || [])
      .filter(alert => !alert.resolvedAt) // Only unresolved alerts
      .slice(0, 20); // Last 20 alerts

    // Get top recommendations
    const topRecommendations = analysis.recommendations
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 10);

    // Generate prompt improvement suggestions
    const improvementSuggestions = await this.generatePromptImprovements(tenantId, analysis);

    // Phase 6.2: Generate trends from recent feedback (simplified - in production would use time-series database)
    const recentFeedback = await this.feedbackLearningService.getFeedback(tenantId, {
      limit: 1000,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    });

    // Group by day for trends
    const dailyData = new Map<string, { satisfaction: number[]; count: number }>();
    for (const entry of recentFeedback) {
      const date = new Date(entry.createdAt).toISOString().split('T')[0];
      const existing = dailyData.get(date) || { satisfaction: [], count: 0 };
      if (entry.score) {
        existing.satisfaction.push(entry.score);
      }
      existing.count++;
      dailyData.set(date, existing);
    }

    const satisfactionOverTime = Array.from(dailyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        score: data.satisfaction.length > 0
          ? (data.satisfaction.reduce((a, b) => a + b, 0) / data.satisfaction.length) * 20 // Convert 1-5 to 0-100
          : 0,
      }));

    const feedbackVolumeOverTime = Array.from(dailyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        count: data.count,
      }));

    const trends = {
      satisfactionOverTime,
      feedbackVolumeOverTime,
    };

    return {
      metrics,
      recentAlerts,
      topRecommendations,
      improvementSuggestions,
      trends,
    };
  }

  // ============================================
  // Continuous Improvement (23.4)
  // ============================================

  /**
   * Generate prompt improvement suggestions based on feedback
   */
  private async generatePromptImprovements(
    tenantId: string,
    analysis: FeedbackAnalysis
  ): Promise<PromptImprovementSuggestion[]> {
    const suggestions: PromptImprovementSuggestion[] = [];

    // Analyze feedback by insight type to identify prompt issues
    for (const [insightType, typeFeedback] of Object.entries(analysis.byInsightType)) {
      if (typeFeedback.negativeRate > 0.2 && typeFeedback.totalResponses >= 10) {
        // High negative rate for this insight type - suggest prompt improvements
        const promptSlug = `insights-${insightType}`;
        
        // Get current prompt if available
        if (this.promptResolver) {
          try {
            const currentPrompt = await this.promptResolver.resolvePromptDefinition(
              tenantId,
              'system',
              promptSlug
            );

            if (currentPrompt) {
              suggestions.push({
                promptId: currentPrompt.id,
                promptSlug,
                currentVersion: currentPrompt.version || 1,
                suggestedChanges: {
                  reason: `High negative feedback rate (${(typeFeedback.negativeRate * 100).toFixed(1)}%) for ${insightType} insights. Top issues: ${typeFeedback.topIssues.join(', ')}`,
                  basedOnFeedback: typeFeedback.topIssues,
                  expectedImprovement: Math.min(50, typeFeedback.negativeRate * 100), // Estimate improvement
                },
                priority: typeFeedback.negativeRate > 0.3 ? 'high' : 'medium',
                confidence: Math.min(0.9, typeFeedback.totalResponses / 100), // Higher confidence with more data
              });
            }
          } catch (error) {
            // Prompt not found or error - skip
          }
        }
      }
    }

    return suggestions;
  }

  /**
   * Apply prompt improvements based on feedback
   */
  async applyPromptImprovement(
    tenantId: string,
    suggestion: PromptImprovementSuggestion,
    userId: string
  ): Promise<void> {
    if (!this.promptResolver) {
      throw new Error('PromptResolverService is required for prompt improvements');
    }

    // In production, this would:
    // 1. Create a new prompt version with suggested changes
    // 2. Set up A/B test if confidence is high
    // 3. Track the improvement application

    this.monitoring.trackEvent('user-feedback.prompt-improvement-applied', {
      tenantId,
      userId,
      promptId: suggestion.promptId,
      promptSlug: suggestion.promptSlug,
      priority: suggestion.priority,
      confidence: suggestion.confidence,
    });
  }
}

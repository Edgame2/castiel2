/**
 * Social Signal Service
 * Monitors social media and external signals for sales intelligence
 * 
 * Features:
 * - Social media monitoring
 * - News and press release tracking
 * - Industry trend analysis
 * - Competitive intelligence signals
 * - Customer success signals
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { MultiModalIntelligenceService } from './multimodal-intelligence.service.js';

export type SignalSource = 'social_media' | 'news' | 'press_release' | 'industry_report' | 'competitive' | 'customer_success';

export type SignalType = 'positive' | 'negative' | 'neutral' | 'opportunity' | 'risk';

export interface SocialSignal {
  signalId: string;
  tenantId: string; // Partition key
  opportunityId?: string;
  accountId?: string;
  source: SignalSource;
  signalType: SignalType;
  content: {
    title: string;
    description: string;
    url?: string;
    publishedAt: Date;
    author?: string;
    platform?: string; // For social media
  };
  relevance: {
    score: number; // 0-1: How relevant to opportunity/account
    factors: string[];
  };
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    confidence: number; // 0-1
  };
  impact: {
    level: 'high' | 'medium' | 'low';
    description: string;
    potentialActions?: string[];
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  processedAt: Date;
}

export interface SocialSignalSummary {
  summaryId: string;
  tenantId: string;
  opportunityId?: string;
  accountId?: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  signals: {
    total: number;
    bySource: Record<SignalSource, number>;
    byType: Record<SignalType, number>;
    bySentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
  insights: {
    keySignals: SocialSignal[];
    trends: string[];
    recommendations: string[];
    riskIndicators: string[];
  };
  createdAt: Date;
}

/**
 * Social Signal Service
 */
export class SocialSignalService {
  private client: CosmosClient;
  private database: Database;
  private signalsContainer: Container;
  private summariesContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private multimodalIntelligence?: MultiModalIntelligenceService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    multimodalIntelligence?: MultiModalIntelligenceService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.multimodalIntelligence = multimodalIntelligence;

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
    this.signalsContainer = this.database.container(config.cosmosDb.containers.socialSignals);
    this.summariesContainer = this.database.container(config.cosmosDb.containers.socialSignals);
  }

  /**
   * Record a social signal
   */
  async recordSignal(
    tenantId: string,
    signal: Omit<SocialSignal, 'signalId' | 'createdAt' | 'processedAt'>
  ): Promise<SocialSignal> {
    const signalId = uuidv4();
    const now = new Date();

    // Analyze relevance and sentiment if not provided
    const relevance = signal.relevance || await this.analyzeRelevance(signal.content, tenantId, signal.opportunityId);
    const sentiment = signal.sentiment || await this.analyzeSentiment(signal.content.description);

    // Determine signal type if not provided
    const signalType = signal.signalType || this.determineSignalType(sentiment, signal.content);

    // Assess impact
    const impact = signal.impact || this.assessImpact(sentiment, relevance, signalType);

    const socialSignal: SocialSignal = {
      ...signal,
      signalId,
      relevance,
      sentiment,
      signalType,
      impact,
      createdAt: now,
      processedAt: now,
    };

    await this.signalsContainer.items.create(socialSignal);

    // Invalidate cached summaries
    if (this.redis) {
      if (signal.opportunityId) {
        await this.redis.del(`social_signals:${tenantId}:opportunity:${signal.opportunityId}`);
      }
      if (signal.accountId) {
        await this.redis.del(`social_signals:${tenantId}:account:${signal.accountId}`);
      }
    }

    this.monitoring?.trackEvent('social_signal.recorded', {
      tenantId,
      signalId,
      source: signal.source,
      signalType,
      opportunityId: signal.opportunityId,
    });

    return socialSignal;
  }

  /**
   * Get signals for an opportunity
   */
  async getOpportunitySignals(
    tenantId: string,
    opportunityId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<SocialSignal[]> {
    // Check cache
    if (this.redis) {
      const cacheKey = `social_signals:${tenantId}:opportunity:${opportunityId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const querySpec: any = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.opportunityId = @opportunityId',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@opportunityId', value: opportunityId },
      ],
    };

    if (timeRange) {
      querySpec.query += ' AND c.content.publishedAt >= @start AND c.content.publishedAt <= @end';
      querySpec.parameters.push(
        { name: '@start', value: timeRange.start.toISOString() },
        { name: '@end', value: timeRange.end.toISOString() }
      );
    }

    querySpec.query += ' ORDER BY c.content.publishedAt DESC';

    const { resources } = await this.signalsContainer.items.query(querySpec).fetchAll();
    const signals = resources as SocialSignal[];

    // Cache for 15 minutes
    if (this.redis) {
      const cacheKey = `social_signals:${tenantId}:opportunity:${opportunityId}`;
      await this.redis.setex(cacheKey, 15 * 60, JSON.stringify(signals));
    }

    return signals;
  }

  /**
   * Generate signal summary for an opportunity
   */
  async generateSummary(
    tenantId: string,
    opportunityId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<SocialSignalSummary> {
    const signals = await this.getOpportunitySignals(tenantId, opportunityId, timeRange);

    const now = new Date();
    const range = timeRange || {
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: now,
    };

    // Calculate statistics
    const bySource: Record<SignalSource, number> = {
      social_media: 0,
      news: 0,
      press_release: 0,
      industry_report: 0,
      competitive: 0,
      customer_success: 0,
    };

    const byType: Record<SignalType, number> = {
      positive: 0,
      negative: 0,
      neutral: 0,
      opportunity: 0,
      risk: 0,
    };

    const bySentiment = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    signals.forEach(signal => {
      bySource[signal.source] = (bySource[signal.source] || 0) + 1;
      byType[signal.signalType] = (byType[signal.signalType] || 0) + 1;
      bySentiment[signal.sentiment.overall] = (bySentiment[signal.sentiment.overall] || 0) + 1;
    });

    // Get key signals (high relevance or high impact)
    const keySignals = signals
      .filter(s => s.relevance.score > 0.7 || s.impact.level === 'high')
      .sort((a, b) => b.relevance.score - a.relevance.score)
      .slice(0, 10);

    // Identify trends
    const trends = this.identifyTrends(signals);

    // Generate recommendations
    const recommendations = this.generateRecommendations(signals, trends);

    // Identify risk indicators
    const riskIndicators = this.identifyRiskIndicators(signals);

    const summary: SocialSignalSummary = {
      summaryId: uuidv4(),
      tenantId,
      opportunityId,
      timeRange: range,
      signals: {
        total: signals.length,
        bySource,
        byType,
        bySentiment,
      },
      insights: {
        keySignals,
        trends,
        recommendations,
        riskIndicators,
      },
      createdAt: new Date(),
    };

    await this.summariesContainer.items.create(summary);

    this.monitoring?.trackEvent('social_signal.summary_generated', {
      tenantId,
      opportunityId,
      signalCount: signals.length,
    });

    return summary;
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Analyze relevance to opportunity
   */
  private async analyzeRelevance(
    content: SocialSignal['content'],
    tenantId: string,
    opportunityId?: string
  ): Promise<{ score: number; factors: string[] }> {
    // Placeholder - would use AI/NLP to analyze relevance
    // For now, simple keyword matching
    const factors: string[] = [];
    let score = 0.5;

    // Check for company/account mentions
    if (content.description.toLowerCase().includes('company') || 
        content.description.toLowerCase().includes('account')) {
      score += 0.2;
      factors.push('Company/account mentioned');
    }

    // Check for industry keywords
    const industryKeywords = ['technology', 'software', 'enterprise', 'solution'];
    const hasIndustryKeywords = industryKeywords.some(k => 
      content.description.toLowerCase().includes(k)
    );
    if (hasIndustryKeywords) {
      score += 0.1;
      factors.push('Industry keywords present');
    }

    score = Math.min(1.0, score);

    return { score, factors };
  }

  /**
   * Analyze sentiment
   */
  private async analyzeSentiment(text: string): Promise<{
    overall: 'positive' | 'neutral' | 'negative';
    confidence: number;
  }> {
    // Placeholder - would use AI sentiment analysis
    const positiveWords = ['success', 'growth', 'expansion', 'achievement', 'win'];
    const negativeWords = ['decline', 'loss', 'challenge', 'concern', 'risk'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;

    let overall: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (positiveCount > negativeCount && positiveCount > 0) {
      overall = 'positive';
    } else if (negativeCount > positiveCount && negativeCount > 0) {
      overall = 'negative';
    }

    const confidence = Math.min(0.9, (positiveCount + negativeCount) / 5);

    return { overall, confidence };
  }

  /**
   * Determine signal type
   */
  private determineSignalType(
    sentiment: { overall: 'positive' | 'neutral' | 'negative' },
    content: SocialSignal['content']
  ): SignalType {
    const lowerText = content.description.toLowerCase();

    // Check for opportunity keywords
    if (lowerText.includes('expansion') || lowerText.includes('growth') || 
        lowerText.includes('investment') || lowerText.includes('funding')) {
      return 'opportunity';
    }

    // Check for risk keywords
    if (lowerText.includes('layoff') || lowerText.includes('restructuring') ||
        lowerText.includes('challenge') || lowerText.includes('decline')) {
      return 'risk';
    }

    // Map sentiment to type
    if (sentiment.overall === 'positive') return 'positive';
    if (sentiment.overall === 'negative') return 'negative';
    return 'neutral';
  }

  /**
   * Assess impact
   */
  private assessImpact(
    sentiment: { overall: 'positive' | 'neutral' | 'negative' },
    relevance: { score: number },
    signalType: SignalType
  ): {
    level: 'high' | 'medium' | 'low';
    description: string;
    potentialActions?: string[];
  } {
    let level: 'high' | 'medium' | 'low' = 'low';
    const actions: string[] = [];

    // High impact: high relevance + opportunity/risk type
    if (relevance.score > 0.7 && (signalType === 'opportunity' || signalType === 'risk')) {
      level = 'high';
      if (signalType === 'opportunity') {
        actions.push('Engage with account to explore expansion opportunity');
      } else {
        actions.push('Assess risk and develop mitigation strategy');
      }
    } else if (relevance.score > 0.5 || signalType === 'opportunity' || signalType === 'risk') {
      level = 'medium';
    }

    const description = `${signalType} signal with ${relevance.score.toFixed(2)} relevance score`;

    return {
      level,
      description,
      potentialActions: actions.length > 0 ? actions : undefined,
    };
  }

  /**
   * Identify trends
   */
  private identifyTrends(signals: SocialSignal[]): string[] {
    const trends: string[] = [];

    // Sentiment trend
    const recentSignals = signals.slice(0, 10);
    const positiveCount = recentSignals.filter(s => s.sentiment.overall === 'positive').length;
    const negativeCount = recentSignals.filter(s => s.sentiment.overall === 'negative').length;

    if (positiveCount > negativeCount * 2) {
      trends.push('Positive sentiment trend detected');
    } else if (negativeCount > positiveCount * 2) {
      trends.push('Negative sentiment trend detected');
    }

    // Source diversity
    const uniqueSources = new Set(signals.map(s => s.source)).size;
    if (uniqueSources >= 4) {
      trends.push('High signal diversity across multiple sources');
    }

    // Opportunity signals
    const opportunitySignals = signals.filter(s => s.signalType === 'opportunity').length;
    if (opportunitySignals > 0) {
      trends.push(`${opportunitySignals} opportunity signals detected`);
    }

    return trends;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(signals: SocialSignal[], trends: string[]): string[] {
    const recommendations: string[] = [];

    const riskSignals = signals.filter(s => s.signalType === 'risk');
    if (riskSignals.length > 0) {
      recommendations.push('Monitor risk signals closely and prepare mitigation strategies');
    }

    const opportunitySignals = signals.filter(s => s.signalType === 'opportunity');
    if (opportunitySignals.length > 0) {
      recommendations.push('Engage proactively to capitalize on opportunity signals');
    }

    if (trends.some(t => t.includes('Negative sentiment'))) {
      recommendations.push('Address negative sentiment through proactive communication');
    }

    return recommendations;
  }

  /**
   * Identify risk indicators
   */
  private identifyRiskIndicators(signals: SocialSignal[]): string[] {
    const indicators: string[] = [];

    const riskSignals = signals.filter(s => s.signalType === 'risk');
    if (riskSignals.length > 0) {
      indicators.push(`${riskSignals.length} risk signals detected`);
    }

    const negativeSignals = signals.filter(s => s.sentiment.overall === 'negative');
    if (negativeSignals.length > signals.length * 0.3) {
      indicators.push('High proportion of negative sentiment signals');
    }

    return indicators;
  }
}

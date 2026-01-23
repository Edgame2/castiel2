/**
 * Product Usage Service
 * Integrates product usage data for sales intelligence
 * 
 * Features:
 * - Product usage pattern analysis
 * - Feature adoption tracking
 * - Usage-based health scoring
 * - Expansion opportunity detection
 * - Churn risk prediction
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { MultiModalIntelligenceService } from './multimodal-intelligence.service.js';

export interface ProductUsageEvent {
  eventId: string;
  tenantId: string;
  accountId: string;
  opportunityId?: string;
  userId?: string;
  eventType: 'feature_used' | 'feature_adopted' | 'feature_abandoned' | 'login' | 'session' | 'api_call';
  feature?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UsagePattern {
  patternId: string;
  tenantId: string;
  accountId: string;
  opportunityId?: string;
  patternType: 'adoption' | 'engagement' | 'churn_risk' | 'expansion';
  pattern: {
    featureAdoptionRate?: number; // 0-1
    activeUsers?: number;
    dailyActiveUsers?: number;
    weeklyActiveUsers?: number;
    monthlyActiveUsers?: number;
    avgSessionDuration?: number; // minutes
    featureUsageFrequency?: Record<string, number>;
    churnRiskScore?: number; // 0-1
    expansionOpportunityScore?: number; // 0-1
  };
  confidence: number; // 0-1
  detectedAt: Date;
  lastUpdated: Date;
}

export interface ProductUsageIntelligence {
  intelligenceId: string;
  tenantId: string;
  accountId: string;
  opportunityId?: string;
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    activeFeatures: number;
    adoptionRate: number; // 0-1
    engagementScore: number; // 0-1
  };
  health: {
    score: number; // 0-1
    level: 'healthy' | 'at_risk' | 'critical';
    factors: string[];
  };
  patterns: UsagePattern[];
  insights: {
    adoption: {
      topFeatures: Array<{ feature: string; usage: number }>;
      underutilizedFeatures: string[];
    };
    expansion: {
      opportunities: string[];
      score: number; // 0-1
    };
    churn: {
      riskLevel: 'low' | 'medium' | 'high';
      indicators: string[];
      score: number; // 0-1
    };
  };
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product Usage Service
 */
export class ProductUsageService {
  private client: CosmosClient;
  private database: Database;
  private eventsContainer: Container;
  private patternsContainer: Container;
  private intelligenceContainer: Container;
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
    this.eventsContainer = this.database.container(config.cosmosDb.containers.productUsage);
    this.patternsContainer = this.database.container(config.cosmosDb.containers.productUsage);
    this.intelligenceContainer = this.database.container(config.cosmosDb.containers.productUsage);
  }

  /**
   * Record product usage event
   */
  async recordEvent(
    event: Omit<ProductUsageEvent, 'eventId'>
  ): Promise<ProductUsageEvent> {
    const eventId = uuidv4();
    const usageEvent: ProductUsageEvent = {
      ...event,
      eventId,
    };

    await this.eventsContainer.items.create(usageEvent);

    // Invalidate cached intelligence
    if (this.redis) {
      if (event.opportunityId) {
        await this.redis.del(`product_usage:${event.tenantId}:opportunity:${event.opportunityId}`);
      }
      await this.redis.del(`product_usage:${event.tenantId}:account:${event.accountId}`);
    }

    this.monitoring?.trackEvent('product_usage.event_recorded', {
      tenantId: event.tenantId,
      accountId: event.accountId,
      eventType: event.eventType,
      feature: event.feature,
    });

    return usageEvent;
  }

  /**
   * Analyze product usage for an account/opportunity
   */
  async analyzeUsage(
    tenantId: string,
    accountId: string,
    opportunityId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ProductUsageIntelligence> {
    // Check cache
    const cacheKey = opportunityId
      ? `product_usage:${tenantId}:opportunity:${opportunityId}`
      : `product_usage:${tenantId}:account:${accountId}`;

    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Get events
    const events = await this.getUsageEvents(tenantId, accountId, opportunityId, timeRange);

    // Calculate summary
    const summary = this.calculateSummary(events);

    // Detect patterns
    const patterns = await this.detectPatterns(tenantId, accountId, opportunityId, events);

    // Assess health
    const health = this.assessHealth(events, patterns);

    // Generate insights
    const insights = await this.generateInsights(events, patterns);

    // Generate recommendations
    const recommendations = this.generateRecommendations(insights, health);

    const intelligence: ProductUsageIntelligence = {
      intelligenceId: uuidv4(),
      tenantId,
      accountId,
      opportunityId,
      summary,
      health,
      patterns,
      insights,
      recommendations,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save intelligence
    await this.intelligenceContainer.items.create(intelligence);

    // Cache for 1 hour
    if (this.redis) {
      await this.redis.setex(cacheKey, 60 * 60, JSON.stringify(intelligence));
    }

    this.monitoring?.trackEvent('product_usage.analyzed', {
      tenantId,
      accountId,
      opportunityId,
      eventCount: summary.totalEvents,
    });

    return intelligence;
  }

  /**
   * Detect churn risk
   */
  async detectChurnRisk(
    tenantId: string,
    accountId: string,
    opportunityId?: string
  ): Promise<{ riskScore: number; level: 'low' | 'medium' | 'high'; indicators: string[] }> {
    const events = await this.getUsageEvents(tenantId, accountId, opportunityId);
    
    // Calculate recent activity
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentEvents = events.filter(e => e.timestamp >= last30Days);
    
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const veryRecentEvents = events.filter(e => e.timestamp >= last7Days);

    let riskScore = 0.5;
    const indicators: string[] = [];

    // Low recent activity
    if (recentEvents.length < 10) {
      riskScore += 0.2;
      indicators.push('Low activity in last 30 days');
    }

    if (veryRecentEvents.length === 0) {
      riskScore += 0.3;
      indicators.push('No activity in last 7 days');
    }

    // Feature abandonment
    const abandonedFeatures = this.detectAbandonedFeatures(events);
    if (abandonedFeatures.length > 0) {
      riskScore += 0.2;
      indicators.push(`${abandonedFeatures.length} features abandoned`);
    }

    riskScore = Math.min(1.0, riskScore);

    const level: 'low' | 'medium' | 'high' = 
      riskScore > 0.7 ? 'high' : 
      riskScore > 0.4 ? 'medium' : 
      'low';

    return { riskScore, level, indicators };
  }

  /**
   * Detect expansion opportunities
   */
  async detectExpansionOpportunities(
    tenantId: string,
    accountId: string,
    opportunityId?: string
  ): Promise<{ opportunities: string[]; score: number }> {
    const events = await this.getUsageEvents(tenantId, accountId, opportunityId);
    const opportunities: string[] = [];
    let score = 0.3; // Base score

    // High usage of core features
    const featureUsage = this.calculateFeatureUsage(events);
    const highUsageFeatures = Object.entries(featureUsage)
      .filter(([_, count]) => count > 100)
      .map(([feature]) => feature);

    if (highUsageFeatures.length > 0) {
      score += 0.2;
      opportunities.push(`High usage of ${highUsageFeatures.length} features - consider premium tier`);
    }

    // Growing user base
    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean)).size;
    if (uniqueUsers > 10) {
      score += 0.2;
      opportunities.push(`Large user base (${uniqueUsers} users) - consider seat expansion`);
    }

    // Feature requests (would come from support/feedback)
    // Placeholder for now
    if (events.some(e => e.eventType === 'feature_adopted')) {
      score += 0.1;
      opportunities.push('Active feature adoption - potential for additional features');
    }

    score = Math.min(1.0, score);

    return { opportunities, score };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Get usage events
   */
  private async getUsageEvents(
    tenantId: string,
    accountId: string,
    opportunityId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ProductUsageEvent[]> {
    let querySpec: any = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.accountId = @accountId',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@accountId', value: accountId },
      ],
    };

    if (opportunityId) {
      querySpec.query += ' AND c.opportunityId = @opportunityId';
      querySpec.parameters.push({ name: '@opportunityId', value: opportunityId });
    }

    if (timeRange) {
      querySpec.query += ' AND c.timestamp >= @start AND c.timestamp <= @end';
      querySpec.parameters.push(
        { name: '@start', value: timeRange.start.toISOString() },
        { name: '@end', value: timeRange.end.toISOString() }
      );
    }

    querySpec.query += ' ORDER BY c.timestamp DESC';

    const { resources } = await this.eventsContainer.items.query(querySpec).fetchAll();
    return resources as ProductUsageEvent[];
  }

  /**
   * Calculate summary
   */
  private calculateSummary(events: ProductUsageEvent[]): ProductUsageIntelligence['summary'] {
    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean)).size;
    const uniqueFeatures = new Set(events.map(e => e.feature).filter(Boolean)).size;
    
    // Calculate adoption rate (simplified)
    const featureEvents = events.filter(e => e.feature);
    const adoptionRate = featureEvents.length > 0 ? Math.min(1.0, uniqueFeatures / 10) : 0;

    // Calculate engagement score
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentEvents = events.filter(e => e.timestamp >= last30Days);
    const engagementScore = Math.min(1.0, recentEvents.length / 100);

    return {
      totalEvents: events.length,
      uniqueUsers,
      activeFeatures: uniqueFeatures,
      adoptionRate,
      engagementScore,
    };
  }

  /**
   * Detect patterns
   */
  private async detectPatterns(
    tenantId: string,
    accountId: string,
    opportunityId: string | undefined,
    events: ProductUsageEvent[]
  ): Promise<UsagePattern[]> {
    const patterns: UsagePattern[] = [];

    // Adoption pattern
    const adoptionPattern = await this.analyzeAdoption(tenantId, accountId, opportunityId, events);
    patterns.push(adoptionPattern);

    // Engagement pattern
    const engagementPattern = await this.analyzeEngagement(tenantId, accountId, opportunityId, events);
    patterns.push(engagementPattern);

    // Churn risk pattern
    const churnRisk = await this.detectChurnRisk(tenantId, accountId, opportunityId);
    patterns.push({
      patternId: uuidv4(),
      tenantId,
      accountId,
      opportunityId,
      patternType: 'churn_risk',
      pattern: {
        churnRiskScore: churnRisk.riskScore,
      },
      confidence: 0.8,
      detectedAt: new Date(),
      lastUpdated: new Date(),
    });

    // Expansion pattern
    const expansion = await this.detectExpansionOpportunities(tenantId, accountId, opportunityId);
    patterns.push({
      patternId: uuidv4(),
      tenantId,
      accountId,
      opportunityId,
      patternType: 'expansion',
      pattern: {
        expansionOpportunityScore: expansion.score,
      },
      confidence: 0.7,
      detectedAt: new Date(),
      lastUpdated: new Date(),
    });

    return patterns;
  }

  /**
   * Analyze adoption
   */
  private async analyzeAdoption(
    tenantId: string,
    accountId: string,
    opportunityId: string | undefined,
    events: ProductUsageEvent[]
  ): Promise<UsagePattern> {
    const featureUsage = this.calculateFeatureUsage(events);
    const totalFeatureEvents = Object.values(featureUsage).reduce((sum, count) => sum + count, 0);
    const uniqueFeatures = Object.keys(featureUsage).length;
    const adoptionRate = uniqueFeatures > 0 ? Math.min(1.0, uniqueFeatures / 20) : 0;

    return {
      patternId: uuidv4(),
      tenantId,
      accountId,
      opportunityId,
      patternType: 'adoption',
      pattern: {
        featureAdoptionRate: adoptionRate,
        featureUsageFrequency: featureUsage,
      },
      confidence: totalFeatureEvents > 50 ? 0.8 : 0.5,
      detectedAt: new Date(),
      lastUpdated: new Date(),
    };
  }

  /**
   * Analyze engagement
   */
  private async analyzeEngagement(
    tenantId: string,
    accountId: string,
    opportunityId: string | undefined,
    events: ProductUsageEvent[]
  ): Promise<UsagePattern> {
    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean));
    const now = new Date();
    
    const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyActive = new Set(events.filter(e => e.timestamp >= lastDay).map(e => e.userId).filter(Boolean)).size;
    const weeklyActive = new Set(events.filter(e => e.timestamp >= lastWeek).map(e => e.userId).filter(Boolean)).size;
    const monthlyActive = new Set(events.filter(e => e.timestamp >= lastMonth).map(e => e.userId).filter(Boolean)).size;

    return {
      patternId: uuidv4(),
      tenantId,
      accountId,
      opportunityId,
      patternType: 'engagement',
      pattern: {
        activeUsers: uniqueUsers.size,
        dailyActiveUsers: dailyActive,
        weeklyActiveUsers: weeklyActive,
        monthlyActiveUsers: monthlyActive,
      },
      confidence: events.length > 100 ? 0.8 : 0.5,
      detectedAt: new Date(),
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate feature usage
   */
  private calculateFeatureUsage(events: ProductUsageEvent[]): Record<string, number> {
    const usage: Record<string, number> = {};
    events.forEach(event => {
      if (event.feature) {
        usage[event.feature] = (usage[event.feature] || 0) + 1;
      }
    });
    return usage;
  }

  /**
   * Detect abandoned features
   */
  private detectAbandonedFeatures(events: ProductUsageEvent[]): string[] {
    const featureLastUsed: Record<string, Date> = {};
    events.forEach(event => {
      if (event.feature) {
        const lastUsed = featureLastUsed[event.feature];
        if (!lastUsed || event.timestamp > lastUsed) {
          featureLastUsed[event.feature] = event.timestamp;
        }
      }
    });

    const now = new Date();
    const abandonedThreshold = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days

    return Object.entries(featureLastUsed)
      .filter(([_, lastUsed]) => lastUsed < abandonedThreshold)
      .map(([feature]) => feature);
  }

  /**
   * Assess health
   */
  private assessHealth(
    events: ProductUsageEvent[],
    patterns: UsagePattern[]
  ): ProductUsageIntelligence['health'] {
    const churnPattern = patterns.find(p => p.patternType === 'churn_risk');
    const engagementPattern = patterns.find(p => p.patternType === 'engagement');
    
    let score = 0.5;
    const factors: string[] = [];

    // Churn risk
    const churnRisk = churnPattern?.pattern.churnRiskScore || 0.5;
    if (churnRisk < 0.3) {
      score += 0.2;
      factors.push('Low churn risk');
    } else if (churnRisk > 0.7) {
      score -= 0.3;
      factors.push('High churn risk');
    }

    // Engagement
    const dailyActive = engagementPattern?.pattern.dailyActiveUsers || 0;
    if (dailyActive > 5) {
      score += 0.2;
      factors.push('High daily active users');
    } else if (dailyActive === 0) {
      score -= 0.3;
      factors.push('No daily active users');
    }

    score = Math.max(0, Math.min(1, score));

    const level: 'healthy' | 'at_risk' | 'critical' = 
      score > 0.7 ? 'healthy' : 
      score > 0.4 ? 'at_risk' : 
      'critical';

    return { score, level, factors };
  }

  /**
   * Generate insights
   */
  private async generateInsights(
    events: ProductUsageEvent[],
    patterns: UsagePattern[]
  ): Promise<ProductUsageIntelligence['insights']> {
    const adoptionPattern = patterns.find(p => p.patternType === 'adoption');
    const expansionPattern = patterns.find(p => p.patternType === 'expansion');
    const churnPattern = patterns.find(p => p.patternType === 'churn_risk');

    // Top features
    const featureUsage = adoptionPattern?.pattern.featureUsageFrequency || {};
    const topFeatures = Object.entries(featureUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([feature, usage]) => ({ feature, usage }));

    // Underutilized features
    const allFeatures = Object.keys(featureUsage);
    const underutilized = allFeatures.filter(f => (featureUsage[f] || 0) < 10);

    // Expansion
    const expansionScore = expansionPattern?.pattern.expansionOpportunityScore || 0;
    const expansion = await this.detectExpansionOpportunities(
      events[0]?.tenantId || '',
      events[0]?.accountId || ''
    );

    // Churn
    const churnScore = churnPattern?.pattern.churnRiskScore || 0;
    const churnLevel: 'low' | 'medium' | 'high' = 
      churnScore > 0.7 ? 'high' : 
      churnScore > 0.4 ? 'medium' : 
      'low';
    
    const churnIndicators: string[] = [];
    if (churnScore > 0.5) {
      churnIndicators.push('Declining usage patterns');
    }

    return {
      adoption: {
        topFeatures,
        underutilizedFeatures: underutilized,
      },
      expansion: {
        opportunities: expansion.opportunities,
        score: expansionScore,
      },
      churn: {
        riskLevel: churnLevel,
        indicators: churnIndicators,
        score: churnScore,
      },
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    insights: ProductUsageIntelligence['insights'],
    health: ProductUsageIntelligence['health']
  ): string[] {
    const recommendations: string[] = [];

    if (health.level === 'critical') {
      recommendations.push('Immediate intervention needed - account health is critical');
    }

    if (insights.churn.riskLevel === 'high') {
      recommendations.push('Proactive engagement needed to prevent churn');
    }

    if (insights.expansion.score > 0.6) {
      recommendations.push('Strong expansion opportunity - consider upsell conversation');
    }

    if (insights.adoption.underutilizedFeatures.length > 0) {
      recommendations.push(`Provide training on ${insights.adoption.underutilizedFeatures.length} underutilized features`);
    }

    return recommendations;
  }
}

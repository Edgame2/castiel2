/**
 * Competitive Intelligence Service
 * Provides competitive intelligence and analysis
 * 
 * Features:
 * - Competitor tracking
 * - Competitive positioning analysis
 * - Win/loss analysis against competitors
 * - Competitive threat detection
 * - Competitive strategy recommendations
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { SocialSignalService } from './social-signal.service.js';
import { RiskEvaluationService } from '@castiel/api-core';

export type CompetitivePosition = 'leading' | 'competitive' | 'trailing' | 'unknown';

export interface CompetitiveIntelligence {
  intelligenceId: string;
  tenantId: string; // Partition key
  opportunityId?: string;
  accountId?: string;
  competitor: {
    name: string;
    position: CompetitivePosition;
    strengths: string[];
    weaknesses: string[];
    differentiators: string[];
  };
  analysis: {
    winProbability: number; // 0-1: Probability of winning against this competitor
    threatLevel: 'high' | 'medium' | 'low';
    keyFactors: Array<{
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      score: number; // 0-1
    }>;
  };
  winLoss: {
    historical: {
      wins: number;
      losses: number;
      winRate: number; // 0-1
    };
    patterns: Array<{
      pattern: string;
      frequency: number;
      impact: 'positive' | 'negative';
    }>;
  };
  signals: {
    recent: Array<{
      signalId: string;
      type: 'product_launch' | 'pricing_change' | 'partnership' | 'customer_win' | 'customer_loss';
      description: string;
      impact: 'high' | 'medium' | 'low';
      timestamp: Date;
    }>;
    trends: string[];
  };
  recommendations: Array<{
    type: 'differentiate' | 'price' | 'feature' | 'relationship' | 'timing';
    priority: 'low' | 'medium' | 'high';
    description: string;
    expectedImpact: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompetitiveThreat {
  threatId: string;
  tenantId: string;
  opportunityId: string;
  competitor: string;
  threatLevel: 'high' | 'medium' | 'low';
  description: string;
  indicators: string[];
  recommendedActions: string[];
  detectedAt: Date;
}

/**
 * Competitive Intelligence Service
 */
export class CompetitiveIntelligenceService {
  private client: CosmosClient;
  private database: Database;
  private intelligenceContainer: Container;
  private threatContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private socialSignalService?: SocialSignalService;
  private riskEvaluationService?: RiskEvaluationService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    socialSignalService?: SocialSignalService,
    riskEvaluationService?: RiskEvaluationService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.socialSignalService = socialSignalService;
    this.riskEvaluationService = riskEvaluationService;

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
    this.intelligenceContainer = this.database.container(config.cosmosDb.containers.competitiveIntelligence);
    this.threatContainer = this.database.container(config.cosmosDb.containers.competitiveIntelligence);
  }

  /**
   * Analyze competitive intelligence for opportunity
   */
  async analyzeCompetition(
    tenantId: string,
    opportunityId: string,
    competitorName: string
  ): Promise<CompetitiveIntelligence> {
    const intelligenceId = uuidv4();

    // Get competitor profile
    const competitor = await this.getCompetitorProfile(tenantId, competitorName);

    // Analyze competitive position
    const analysis = await this.analyzeCompetitivePosition(
      tenantId,
      opportunityId,
      competitorName
    );

    // Get win/loss history
    const winLoss = await this.getWinLossHistory(tenantId, competitorName);

    // Get competitive signals
    const signals = await this.getCompetitiveSignals(tenantId, opportunityId, competitorName);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      competitor,
      analysis,
      winLoss,
      signals
    );

    const intelligence: CompetitiveIntelligence = {
      intelligenceId,
      tenantId,
      opportunityId,
      competitor,
      analysis,
      winLoss,
      signals,
      recommendations,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.intelligenceContainer.items.create(intelligence);

    this.monitoring?.trackEvent('competitive_intelligence.analyzed', {
      tenantId,
      opportunityId,
      competitorName,
      threatLevel: analysis.threatLevel,
      winProbability: analysis.winProbability,
    });

    return intelligence;
  }

  /**
   * Detect competitive threats
   */
  async detectThreats(
    tenantId: string,
    opportunityId: string
  ): Promise<CompetitiveThreat[]> {
    // Get all competitors for opportunity
    const competitors = await this.getOpportunityCompetitors(tenantId, opportunityId);

    const threats: CompetitiveThreat[] = [];

    for (const competitor of competitors) {
      const intelligence = await this.analyzeCompetition(tenantId, opportunityId, competitor);

      if (intelligence.analysis.threatLevel === 'high') {
        const threat: CompetitiveThreat = {
          threatId: uuidv4(),
          tenantId,
          opportunityId,
          competitor,
          threatLevel: 'high',
          description: `High competitive threat from ${competitor}`,
          indicators: intelligence.analysis.keyFactors
            .filter(f => f.impact === 'negative')
            .map(f => f.factor),
          recommendedActions: intelligence.recommendations
            .filter(r => r.priority === 'high')
            .map(r => r.description),
          detectedAt: new Date(),
        };

        threats.push(threat);
        await this.threatContainer.items.create(threat);
      }
    }

    this.monitoring?.trackEvent('competitive_intelligence.threats_detected', {
      tenantId,
      opportunityId,
      threatCount: threats.length,
    });

    return threats;
  }

  // ============================================
  // Analysis Methods
  // ============================================

  /**
   * Get competitor profile
   */
  private async getCompetitorProfile(
    tenantId: string,
    competitorName: string
  ): Promise<CompetitiveIntelligence['competitor']> {
    // Placeholder - would query from competitor database
    // For now, return sample profile
    return {
      name: competitorName,
      position: 'competitive',
      strengths: ['Strong brand', 'Lower pricing', 'Established customer base'],
      weaknesses: ['Limited features', 'Older technology'],
      differentiators: ['Innovation', 'Customer support'],
    };
  }

  /**
   * Analyze competitive position
   */
  private async analyzeCompetitivePosition(
    tenantId: string,
    opportunityId: string,
    competitorName: string
  ): Promise<CompetitiveIntelligence['analysis']> {
    // Calculate win probability (simplified)
    const winProbability = 0.6; // Placeholder

    // Determine threat level
    const threatLevel: 'high' | 'medium' | 'low' = 
      winProbability < 0.4 ? 'high' :
      winProbability < 0.6 ? 'medium' :
      'low';

    // Key factors
    const keyFactors: CompetitiveIntelligence['analysis']['keyFactors'] = [
      {
        factor: 'Pricing',
        impact: 'negative',
        score: 0.7,
      },
      {
        factor: 'Feature Set',
        impact: 'positive',
        score: 0.8,
      },
      {
        factor: 'Relationship',
        impact: 'positive',
        score: 0.6,
      },
    ];

    return {
      winProbability,
      threatLevel,
      keyFactors,
    };
  }

  /**
   * Get win/loss history
   */
  private async getWinLossHistory(
    tenantId: string,
    competitorName: string
  ): Promise<CompetitiveIntelligence['winLoss']> {
    // Query historical opportunities
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.competitor = @competitor',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@competitor', value: competitorName },
      ],
    };

    try {
      const { resources } = await this.intelligenceContainer.items.query(querySpec).fetchAll();
      const history = resources as CompetitiveIntelligence[];

      const wins = history.filter(h => h.analysis.winProbability > 0.5).length;
      const losses = history.length - wins;
      const winRate = history.length > 0 ? wins / history.length : 0.5;

      return {
        historical: {
          wins,
          losses,
          winRate,
        },
        patterns: [
          {
            pattern: 'Price-sensitive deals favor competitor',
            frequency: 0.6,
            impact: 'negative',
          },
          {
            pattern: 'Feature-rich deals favor us',
            frequency: 0.7,
            impact: 'positive',
          },
        ],
      };
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'getWinLossHistory',
        tenantId,
        competitorName,
      });

      return {
        historical: {
          wins: 0,
          losses: 0,
          winRate: 0.5,
        },
        patterns: [],
      };
    }
  }

  /**
   * Get competitive signals
   */
  private async getCompetitiveSignals(
    tenantId: string,
    opportunityId: string,
    competitorName: string
  ): Promise<CompetitiveIntelligence['signals']> {
    // Get signals from SocialSignalService
    if (this.socialSignalService) {
      const signals = await this.socialSignalService.getOpportunitySignals(tenantId, opportunityId);
      const competitiveSignals = signals.filter(s => 
        s.content.description.toLowerCase().includes(competitorName.toLowerCase())
      );

      const recent = competitiveSignals.slice(0, 5).map(s => ({
        signalId: s.signalId,
        type: 'customer_win' as const, // Would determine from signal
        description: s.content.description,
        impact: s.impact.level,
        timestamp: s.content.publishedAt,
      }));

      return {
        recent,
        trends: ['Increasing competitive activity', 'New product launches'],
      };
    }

    return {
      recent: [],
      trends: [],
    };
  }

  /**
   * Get opportunity competitors
   */
  private async getOpportunityCompetitors(
    tenantId: string,
    opportunityId: string
  ): Promise<string[]> {
    // Placeholder - would query from opportunity data
    return ['Competitor A', 'Competitor B'];
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    competitor: CompetitiveIntelligence['competitor'],
    analysis: CompetitiveIntelligence['analysis'],
    winLoss: CompetitiveIntelligence['winLoss'],
    signals: CompetitiveIntelligence['signals']
  ): CompetitiveIntelligence['recommendations'] {
    const recommendations: CompetitiveIntelligence['recommendations'] = [];

    if (analysis.threatLevel === 'high') {
      recommendations.push({
        type: 'differentiate',
        priority: 'high',
        description: `Emphasize differentiators: ${competitor.differentiators.join(', ')}`,
        expectedImpact: 'Could improve win probability by 15-20%',
      });
    }

    if (competitor.strengths.includes('Lower pricing')) {
      recommendations.push({
        type: 'price',
        priority: 'medium',
        description: 'Consider competitive pricing strategy',
        expectedImpact: 'Could neutralize pricing advantage',
      });
    }

    if (winLoss.patterns.some(p => p.pattern.includes('Feature-rich'))) {
      recommendations.push({
        type: 'feature',
        priority: 'high',
        description: 'Highlight feature advantages',
        expectedImpact: 'Could leverage historical pattern of feature wins',
      });
    }

    return recommendations;
  }
}

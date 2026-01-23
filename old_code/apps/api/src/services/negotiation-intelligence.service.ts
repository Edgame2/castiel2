/**
 * Negotiation Intelligence Service
 * Provides negotiation support and intelligence
 * 
 * Features:
 * - Negotiation strategy recommendations
 * - Counter-proposal analysis
 * - Deal structure optimization
 * - Negotiation pattern learning
 * - Win/loss analysis
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { RiskEvaluationService } from '@castiel/api-core';
import { CommunicationAnalysisService } from './communication-analysis.service.js';

export type NegotiationStrategy = 'competitive' | 'collaborative' | 'accommodating' | 'avoiding' | 'compromising';

export interface NegotiationAnalysis {
  analysisId: string;
  tenantId: string; // Partition key
  opportunityId: string;
  currentProposal: {
    value: number;
    terms: Record<string, any>;
    structure: string; // e.g., "annual_contract", "monthly_recurring"
  };
  strategy: {
    recommended: NegotiationStrategy;
    confidence: number; // 0-1
    reasoning: string;
    alternatives: Array<{
      strategy: NegotiationStrategy;
      score: number;
      pros: string[];
      cons: string[];
    }>;
  };
  counterProposal: {
    suggested: {
      value: number;
      terms: Record<string, any>;
      rationale: string;
    };
    alternatives: Array<{
      value: number;
      terms: Record<string, any>;
      winProbability: number; // 0-1
      risk: number; // 0-1
    }>;
  };
  dealStructure: {
    optimal: {
      structure: string;
      value: number;
      terms: Record<string, any>;
      benefits: string[];
    };
    alternatives: Array<{
      structure: string;
      value: number;
      terms: Record<string, any>;
      score: number;
    }>;
  };
  patterns: {
    similarNegotiations: Array<{
      opportunityId: string;
      outcome: 'won' | 'lost';
      strategy: NegotiationStrategy;
      finalValue: number;
      lessons: string[];
    }>;
    commonIssues: string[];
    successFactors: string[];
  };
  recommendations: Array<{
    type: 'strategy' | 'pricing' | 'terms' | 'timing';
    priority: 'low' | 'medium' | 'high';
    description: string;
    expectedImpact: string;
  }>;
  createdAt: Date;
}

export interface NegotiationOutcome {
  outcomeId: string;
  tenantId: string;
  opportunityId: string;
  strategy: NegotiationStrategy;
  initialProposal: {
    value: number;
    terms: Record<string, any>;
  };
  finalProposal: {
    value: number;
    terms: Record<string, any>;
  };
  outcome: 'won' | 'lost' | 'pending';
  factors: {
    pricing: number; // 0-1: Impact of pricing
    terms: number; // 0-1: Impact of terms
    relationship: number; // 0-1: Impact of relationship
    timing: number; // 0-1: Impact of timing
  };
  lessons: string[];
  recordedAt: Date;
}

/**
 * Negotiation Intelligence Service
 */
export class NegotiationIntelligenceService {
  private client: CosmosClient;
  private database: Database;
  private analysisContainer: Container;
  private outcomeContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private riskEvaluationService?: RiskEvaluationService;
  private communicationAnalysisService?: CommunicationAnalysisService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    riskEvaluationService?: RiskEvaluationService,
    communicationAnalysisService?: CommunicationAnalysisService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.riskEvaluationService = riskEvaluationService;
    this.communicationAnalysisService = communicationAnalysisService;

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
    this.analysisContainer = this.database.container(config.cosmosDb.containers.negotiationIntelligence);
    this.outcomeContainer = this.database.container(config.cosmosDb.containers.negotiationIntelligence);
  }

  /**
   * Analyze negotiation and provide recommendations
   */
  async analyzeNegotiation(
    tenantId: string,
    opportunityId: string,
    currentProposal: NegotiationAnalysis['currentProposal']
  ): Promise<NegotiationAnalysis> {
    const analysisId = uuidv4();

    // Get risk evaluation
    const riskEvaluation = await this.getRiskEvaluation(tenantId, opportunityId);

    // Analyze communication patterns
    const communicationPatterns = await this.analyzeCommunicationPatterns(tenantId, opportunityId);

    // Recommend strategy
    const strategy = this.recommendStrategy(currentProposal, riskEvaluation, communicationPatterns);

    // Suggest counter-proposal
    const counterProposal = this.suggestCounterProposal(currentProposal, strategy, riskEvaluation);

    // Optimize deal structure
    const dealStructure = this.optimizeDealStructure(currentProposal, strategy, riskEvaluation);

    // Find similar negotiations
    const patterns = await this.findSimilarNegotiations(tenantId, opportunityId, currentProposal);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      strategy,
      counterProposal,
      dealStructure,
      patterns
    );

    const analysis: NegotiationAnalysis = {
      analysisId,
      tenantId,
      opportunityId,
      currentProposal,
      strategy,
      counterProposal,
      dealStructure,
      patterns,
      recommendations,
      createdAt: new Date(),
    };

    await this.analysisContainer.items.create(analysis);

    this.monitoring?.trackEvent('negotiation_intelligence.analyzed', {
      tenantId,
      opportunityId,
      strategy: strategy.recommended,
      analysisId,
    });

    return analysis;
  }

  /**
   * Record negotiation outcome for learning
   */
  async recordOutcome(
    tenantId: string,
    opportunityId: string,
    outcome: Omit<NegotiationOutcome, 'outcomeId' | 'recordedAt'>
  ): Promise<NegotiationOutcome> {
    const outcomeId = uuidv4();
    const negotiationOutcome: NegotiationOutcome = {
      ...outcome,
      outcomeId,
      tenantId,
      opportunityId,
      recordedAt: new Date(),
    };

    await this.outcomeContainer.items.create(negotiationOutcome);

    this.monitoring?.trackEvent('negotiation_intelligence.outcome_recorded', {
      tenantId,
      opportunityId,
      outcome: outcome.outcome,
      strategy: outcome.strategy,
    });

    return negotiationOutcome;
  }

  // ============================================
  // Analysis Methods
  // ============================================

  /**
   * Get risk evaluation
   */
  private async getRiskEvaluation(
    tenantId: string,
    opportunityId: string
  ): Promise<{ riskScore: number; revenueAtRisk: number } | null> {
    // Placeholder - would call RiskEvaluationService
    return {
      riskScore: 0.5,
      revenueAtRisk: 0,
    };
  }

  /**
   * Analyze communication patterns
   */
  private async analyzeCommunicationPatterns(
    tenantId: string,
    opportunityId: string
  ): Promise<{ sentiment: number; engagement: number; tone: string }> {
    // Placeholder - would call CommunicationAnalysisService
    return {
      sentiment: 0.7,
      engagement: 0.8,
      tone: 'positive',
    };
  }

  /**
   * Recommend negotiation strategy
   */
  private recommendStrategy(
    proposal: NegotiationAnalysis['currentProposal'],
    riskEvaluation: { riskScore: number; revenueAtRisk: number } | null,
    communication: { sentiment: number; engagement: number; tone: string }
  ): NegotiationAnalysis['strategy'] {
    // Determine strategy based on multiple factors
    let recommended: NegotiationStrategy = 'collaborative';
    let confidence = 0.7;
    let reasoning = '';

    const riskScore = riskEvaluation?.riskScore || 0.5;
    const sentiment = communication.sentiment;
    const engagement = communication.engagement;

    // High risk + low sentiment = competitive
    if (riskScore > 0.7 && sentiment < 0.5) {
      recommended = 'competitive';
      confidence = 0.8;
      reasoning = 'High risk and low sentiment suggest competitive approach needed';
    }
    // High engagement + positive sentiment = collaborative
    else if (engagement > 0.7 && sentiment > 0.6) {
      recommended = 'collaborative';
      confidence = 0.85;
      reasoning = 'High engagement and positive sentiment favor collaborative approach';
    }
    // Medium risk = compromising
    else if (riskScore > 0.4 && riskScore < 0.7) {
      recommended = 'compromising';
      confidence = 0.75;
      reasoning = 'Moderate risk suggests balanced compromising approach';
    }

    // Generate alternatives
    const alternatives: NegotiationAnalysis['strategy']['alternatives'] = [
      {
        strategy: 'collaborative',
        score: 0.8,
        pros: ['Builds long-term relationship', 'Higher win probability'],
        cons: ['May require more concessions', 'Longer negotiation cycle'],
      },
      {
        strategy: 'competitive',
        score: 0.6,
        pros: ['Protects margins', 'Faster decisions'],
        cons: ['May damage relationship', 'Lower win probability'],
      },
      {
        strategy: 'compromising',
        score: 0.7,
        pros: ['Balanced approach', 'Moderate win probability'],
        cons: ['May not optimize value', 'Requires careful balance'],
      },
    ];

    return {
      recommended,
      confidence,
      reasoning,
      alternatives,
    };
  }

  /**
   * Suggest counter-proposal
   */
  private suggestCounterProposal(
    current: NegotiationAnalysis['currentProposal'],
    strategy: NegotiationAnalysis['strategy'],
    riskEvaluation: { riskScore: number; revenueAtRisk: number } | null
  ): NegotiationAnalysis['counterProposal'] {
    const baseValue = current.value;
    const riskScore = riskEvaluation?.riskScore || 0.5;

    // Adjust value based on strategy and risk
    let suggestedValue = baseValue;
    let rationale = '';

    if (strategy.recommended === 'competitive') {
      suggestedValue = baseValue * 1.05; // 5% increase
      rationale = 'Competitive strategy suggests holding firm or increasing value';
    } else if (strategy.recommended === 'collaborative') {
      suggestedValue = baseValue * 0.98; // 2% decrease for flexibility
      rationale = 'Collaborative strategy allows for slight flexibility to build relationship';
    } else {
      suggestedValue = baseValue * 1.02; // 2% increase
      rationale = 'Compromising strategy suggests moderate increase';
    }

    // Adjust for risk
    if (riskScore > 0.7) {
      suggestedValue = baseValue * 1.03; // Increase to account for risk
      rationale += ' Adjusted upward to account for high risk';
    }

    const alternatives: NegotiationAnalysis['counterProposal']['alternatives'] = [
      {
        value: baseValue * 1.1,
        terms: { ...current.terms, paymentTerms: 'net_30' },
        winProbability: 0.4,
        risk: 0.6,
      },
      {
        value: baseValue * 0.95,
        terms: { ...current.terms, paymentTerms: 'net_60' },
        winProbability: 0.7,
        risk: 0.3,
      },
      {
        value: baseValue,
        terms: { ...current.terms, paymentTerms: 'net_45' },
        winProbability: 0.6,
        risk: 0.4,
      },
    ];

    return {
      suggested: {
        value: suggestedValue,
        terms: current.terms,
        rationale,
      },
      alternatives,
    };
  }

  /**
   * Optimize deal structure
   */
  private optimizeDealStructure(
    current: NegotiationAnalysis['currentProposal'],
    strategy: NegotiationAnalysis['strategy'],
    riskEvaluation: { riskScore: number; revenueAtRisk: number } | null
  ): NegotiationAnalysis['dealStructure'] {
    const optimal: NegotiationAnalysis['dealStructure']['optimal'] = {
      structure: 'annual_contract',
      value: current.value,
      terms: {
        ...current.terms,
        contractLength: '12_months',
        paymentTerms: 'annual',
      },
      benefits: [
        'Higher customer lifetime value',
        'Reduced churn risk',
        'Better cash flow predictability',
      ],
    };

    const alternatives: NegotiationAnalysis['dealStructure']['alternatives'] = [
      {
        structure: 'monthly_recurring',
        value: current.value * 0.9,
        terms: { ...current.terms, contractLength: 'month_to_month' },
        score: 0.7,
      },
      {
        structure: 'quarterly_contract',
        value: current.value * 0.95,
        terms: { ...current.terms, contractLength: '3_months' },
        score: 0.8,
      },
      {
        structure: 'multi_year',
        value: current.value * 1.1,
        terms: { ...current.terms, contractLength: '24_months' },
        score: 0.85,
      },
    ];

    return {
      optimal,
      alternatives,
    };
  }

  /**
   * Find similar negotiations
   */
  private async findSimilarNegotiations(
    tenantId: string,
    opportunityId: string,
    proposal: NegotiationAnalysis['currentProposal']
  ): Promise<NegotiationAnalysis['patterns']> {
    // Query similar negotiations from history
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.outcome != @pending ORDER BY c.recordedAt DESC',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@pending', value: 'pending' },
      ],
    };

    try {
      const { resources } = await this.outcomeContainer.items.query(querySpec).fetchAll();
      const outcomes = resources as NegotiationOutcome[];

      // Filter by similar value range (±20%)
      const similar = outcomes.filter(o => {
        const valueDiff = Math.abs(o.initialProposal.value - proposal.value) / proposal.value;
        return valueDiff <= 0.2;
      }).slice(0, 5);

      const similarNegotiations = similar
        .filter(o => o.outcome === 'won' || o.outcome === 'lost')
        .map(o => ({
          opportunityId: o.opportunityId,
          outcome: o.outcome as 'won' | 'lost',
          strategy: o.strategy,
          finalValue: o.finalProposal.value,
          lessons: o.lessons,
        }));

      // Extract common patterns
      const wonNegotiations = similar.filter(o => o.outcome === 'won');
      const lostNegotiations = similar.filter(o => o.outcome === 'lost');

      const commonIssues: string[] = [];
      const successFactors: string[] = [];

      if (lostNegotiations.length > 0) {
        commonIssues.push('Pricing too aggressive');
        commonIssues.push('Terms not flexible enough');
      }

      if (wonNegotiations.length > 0) {
        successFactors.push('Collaborative approach');
        successFactors.push('Flexible payment terms');
      }

      return {
        similarNegotiations,
        commonIssues,
        successFactors,
      };
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'findSimilarNegotiations',
        tenantId,
        opportunityId,
      });

      return {
        similarNegotiations: [],
        commonIssues: [],
        successFactors: [],
      };
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    strategy: NegotiationAnalysis['strategy'],
    counterProposal: NegotiationAnalysis['counterProposal'],
    dealStructure: NegotiationAnalysis['dealStructure'],
    patterns: NegotiationAnalysis['patterns']
  ): NegotiationAnalysis['recommendations'] {
    const recommendations: NegotiationAnalysis['recommendations'] = [];

    recommendations.push({
      type: 'strategy',
      priority: 'high',
      description: `Recommended strategy: ${strategy.recommended} - ${strategy.reasoning}`,
      expectedImpact: 'Could improve win probability by 15-20%',
    });

    if (counterProposal.suggested.value !== counterProposal.alternatives[0]?.value) {
      recommendations.push({
        type: 'pricing',
        priority: 'medium',
        description: `Consider counter-proposal of ${counterProposal.suggested.value.toLocaleString()}`,
        expectedImpact: 'Could optimize deal value by 5-10%',
      });
    }

    if (patterns.commonIssues.length > 0) {
      recommendations.push({
        type: 'terms',
        priority: 'high',
        description: `Address common issues: ${patterns.commonIssues.join(', ')}`,
        expectedImpact: 'Could reduce risk of losing deal by 20-25%',
      });
    }

    return recommendations;
  }
}

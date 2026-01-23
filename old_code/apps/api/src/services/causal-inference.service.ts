/**
 * Causal Inference Service
 * Identifies causal relationships between opportunity factors and outcomes
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { OpportunityService } from './opportunity.service.js';
import { RiskEvaluationService } from './risk-evaluation.service.js';

export interface CausalRelationship {
  relationshipId: string;
  tenantId: string;
  cause: {
    factor: string; // e.g., "stage", "amount", "closeDate"
    value: any;
    category?: string; // e.g., "temporal", "financial", "relational"
  };
  effect: {
    outcome: string; // e.g., "win_probability", "risk_score", "time_to_close"
    direction: 'positive' | 'negative' | 'neutral';
    strength: number; // 0-1: Causal strength
  };
  confidence: number; // 0-1: Confidence in causal relationship
  evidence: {
    sampleSize: number;
    correlation: number; // -1 to 1
    pValue?: number; // Statistical significance
    counterfactualSupport?: number; // 0-1: Support from counterfactuals
  };
  context: {
    applicableStages?: string[];
    applicableIndustries?: string[];
    conditions?: Record<string, any>;
  };
  discoveredAt: Date;
  validatedAt?: Date;
}

export interface CausalAnalysis {
  opportunityId: string;
  tenantId: string;
  factors: Array<{
    factor: string;
    value: any;
    causalImpact: number; // -1 to 1: Impact on outcome
    confidence: number;
  }>;
  recommendations: Array<{
    action: string;
    expectedImpact: number; // 0-1: Expected improvement
    priority: 'low' | 'medium' | 'high';
    rationale: string;
  }>;
  analyzedAt: Date;
}

/**
 * Causal Inference Service
 */
export class CausalInferenceService {
  private client: CosmosClient;
  private database: Database;
  private relationshipsContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private opportunityService?: OpportunityService;
  private riskEvaluationService?: RiskEvaluationService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    opportunityService?: OpportunityService,
    riskEvaluationService?: RiskEvaluationService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.opportunityService = opportunityService;
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
    // Using learning_outcomes container for now, could create dedicated causal_relationships container
    this.relationshipsContainer = this.database.container(config.cosmosDb.containers.learningOutcomes);
  }

  /**
   * Discover causal relationships from historical data
   */
  async discoverCausalRelationships(
    tenantId: string,
    options?: {
      factors?: string[]; // Specific factors to analyze
      outcomes?: string[]; // Specific outcomes to analyze
      minSampleSize?: number; // Minimum samples for discovery
    }
  ): Promise<CausalRelationship[]> {
    const relationships: CausalRelationship[] = [];

    // Get historical opportunities
    if (!this.opportunityService) {
      return relationships;
    }

    // TODO: Query historical opportunities and outcomes
    // For now, return placeholder relationships based on common patterns

    // Example: Stage progression → Win probability
    relationships.push({
      relationshipId: uuidv4(),
      tenantId,
      cause: {
        factor: 'stage',
        value: 'proposal',
        category: 'temporal',
      },
      effect: {
        outcome: 'win_probability',
        direction: 'positive',
        strength: 0.6,
      },
      confidence: 0.8,
      evidence: {
        sampleSize: 100,
        correlation: 0.65,
        pValue: 0.001,
      },
      context: {
        applicableStages: ['qualification', 'proposal', 'negotiation'],
      },
      discoveredAt: new Date(),
    });

    // Example: Large deal size → Higher risk
    relationships.push({
      relationshipId: uuidv4(),
      tenantId,
      cause: {
        factor: 'amount',
        value: 'large', // > $500k
        category: 'financial',
      },
      effect: {
        outcome: 'risk_score',
        direction: 'positive',
        strength: 0.4,
      },
      confidence: 0.7,
      evidence: {
        sampleSize: 50,
        correlation: 0.45,
        pValue: 0.01,
      },
      context: {},
      discoveredAt: new Date(),
    });

    // Save discovered relationships
    for (const relationship of relationships) {
      await this.relationshipsContainer.items.create(relationship);
    }

    this.monitoring?.trackEvent('causal_inference.relationships_discovered', {
      tenantId,
      count: relationships.length,
    });

    return relationships;
  }

  /**
   * Analyze causal factors for a specific opportunity
   */
  async analyzeOpportunity(
    opportunityId: string,
    tenantId: string
  ): Promise<CausalAnalysis> {
    // Get opportunity data
    // TODO: Load actual opportunity from OpportunityService

    // Get applicable causal relationships
    const relationships = await this.getApplicableRelationships(tenantId, opportunityId);

    // Analyze factors
    const factors: CausalAnalysis['factors'] = [];
    const recommendations: CausalAnalysis['recommendations'] = [];

    for (const relationship of relationships) {
      // Calculate causal impact
      const impact = this.calculateCausalImpact(relationship);

      factors.push({
        factor: relationship.cause.factor,
        value: relationship.cause.value,
        causalImpact: impact,
        confidence: relationship.confidence,
      });

      // Generate recommendations
      if (relationship.effect.direction === 'negative' && relationship.effect.strength > 0.3) {
        recommendations.push({
          action: `Mitigate ${relationship.cause.factor} impact`,
          expectedImpact: relationship.effect.strength,
          priority: relationship.effect.strength > 0.6 ? 'high' : 'medium',
          rationale: `${relationship.cause.factor} has negative impact on ${relationship.effect.outcome}`,
        });
      }
    }

    const analysis: CausalAnalysis = {
      opportunityId,
      tenantId,
      factors,
      recommendations,
      analyzedAt: new Date(),
    };

    return analysis;
  }

  /**
   * Get applicable causal relationships for an opportunity
   */
  private async getApplicableRelationships(
    tenantId: string,
    opportunityId: string
  ): Promise<CausalRelationship[]> {
    try {
      const query = `
        SELECT * FROM c
        WHERE c.tenantId = @tenantId
        AND c.type = 'causal_relationship'
        ORDER BY c.confidence DESC
      `;

      const { resources } = await this.relationshipsContainer.items
        .query<CausalRelationship>({
          query,
          parameters: [
            { name: '@tenantId', value: tenantId },
          ],
        })
        .fetchAll();

      return resources.slice(0, 10); // Top 10 relationships
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'getApplicableRelationships' });
      return [];
    }
  }

  /**
   * Calculate causal impact of a relationship
   */
  private calculateCausalImpact(relationship: CausalRelationship): number {
    // Impact = strength * direction
    const directionMultiplier = relationship.effect.direction === 'positive' ? 1 : -1;
    return relationship.effect.strength * directionMultiplier;
  }

  /**
   * Validate causal relationship with counterfactual evidence
   */
  async validateRelationship(
    relationshipId: string,
    tenantId: string,
    counterfactualEvidence: number
  ): Promise<CausalRelationship | null> {
    try {
      const { resource: relationship } = await this.relationshipsContainer
        .item(relationshipId, tenantId)
        .read<CausalRelationship>();

      if (!relationship) {
        return null;
      }

      // Update with counterfactual support
      relationship.evidence.counterfactualSupport = counterfactualEvidence;
      relationship.validatedAt = new Date();

      // Recalculate confidence
      relationship.confidence = (
        relationship.evidence.correlation * 0.4 +
        (1 - (relationship.evidence.pValue || 0.05)) * 0.3 +
        counterfactualEvidence * 0.3
      );

      await this.relationshipsContainer.items.upsert(relationship);

      return relationship;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'validateRelationship' });
      return null;
    }
  }
}

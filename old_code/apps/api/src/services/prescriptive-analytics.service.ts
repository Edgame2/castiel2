/**
 * Prescriptive Analytics Service
 * Generates actionable recommendations based on predictive and causal analysis
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import {
  RiskEvaluationService,
  OpportunityService,
} from '@castiel/api-core';
import { CausalInferenceService } from './causal-inference.service.js';
import { RecommendationsService } from './recommendation.service.js';

export type ActionPriority = 'critical' | 'high' | 'medium' | 'low';
export type ActionCategory = 'risk_mitigation' | 'opportunity_optimization' | 'relationship_building' | 'timeline_management' | 'financial_optimization';

export interface PrescriptiveAction {
  actionId: string;
  tenantId: string;
  opportunityId: string;
  category: ActionCategory;
  priority: ActionPriority;
  title: string;
  description: string;
  rationale: string; // Why this action is recommended
  expectedImpact: {
    metric: string; // e.g., "win_probability", "risk_score", "revenue"
    improvement: number; // 0-1: Expected improvement
    confidence: number; // 0-1: Confidence in impact estimate
  };
  steps: Array<{
    step: number;
    action: string;
    estimatedTime?: string; // e.g., "2 hours", "1 day"
    dependencies?: string[]; // Other action IDs
  }>;
  prerequisites?: string[]; // Other actions that should be completed first
  cost?: {
    estimated: number; // Estimated cost
    currency: string;
    type: 'time' | 'financial' | 'resource';
  };
  risk?: {
    level: 'low' | 'medium' | 'high';
    description: string;
  };
  generatedAt: Date;
  expiresAt?: Date; // Action may become irrelevant
}

export interface PrescriptivePlan {
  planId: string;
  tenantId: string;
  opportunityId: string;
  actions: PrescriptiveAction[];
  overallImpact: {
    expectedImprovement: number; // 0-1: Overall expected improvement
    confidence: number;
    timeToValue: string; // e.g., "2 weeks", "1 month"
  };
  generatedAt: Date;
}

/**
 * Prescriptive Analytics Service
 */
export class PrescriptiveAnalyticsService {
  private client: CosmosClient;
  private database: Database;
  private plansContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private riskEvaluationService?: RiskEvaluationService;
  private causalInferenceService?: CausalInferenceService;
  private recommendationsService?: RecommendationsService;
  private opportunityService?: OpportunityService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    riskEvaluationService?: RiskEvaluationService,
    causalInferenceService?: CausalInferenceService,
    recommendationsService?: RecommendationsService,
    opportunityService?: OpportunityService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.riskEvaluationService = riskEvaluationService;
    this.causalInferenceService = causalInferenceService;
    this.recommendationsService = recommendationsService;
    this.causalInferenceService = causalInferenceService;
    this.opportunityService = opportunityService;

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
    // Using learning_outcomes container for now, could create dedicated prescriptive_plans container
    this.plansContainer = this.database.container(config.cosmosDb.containers.learningOutcomes);
  }

  /**
   * Generate prescriptive action plan for an opportunity
   */
  async generateActionPlan(
    opportunityId: string,
    tenantId: string,
    userId: string
  ): Promise<PrescriptivePlan> {
    const actions: PrescriptiveAction[] = [];

    // 1. Risk-based actions
    if (this.riskEvaluationService) {
      try {
        const riskActions = await this.generateRiskMitigationActions(
          opportunityId,
          tenantId,
          userId
        );
        actions.push(...riskActions);
      } catch (error) {
        this.monitoring?.trackException(error as Error, {
          operation: 'generateActionPlan.riskActions',
        });
      }
    }

    // 2. Causal inference-based actions
    if (this.causalInferenceService) {
      try {
        const causalAnalysis = await this.causalInferenceService.analyzeOpportunity(
          opportunityId,
          tenantId
        );
        const causalActions = this.convertCausalRecommendationsToActions(
          causalAnalysis,
          opportunityId,
          tenantId
        );
        actions.push(...causalActions);
      } catch (error) {
        this.monitoring?.trackException(error as Error, {
          operation: 'generateActionPlan.causalActions',
        });
      }
    }

    // 3. Recommendation-based actions
    if (this.recommendationsService) {
      try {
        const recActions = await this.generateRecommendationBasedActions(
          opportunityId,
          tenantId,
          userId
        );
        actions.push(...recActions);
      } catch (error) {
        this.monitoring?.trackException(error as Error, {
          operation: 'generateActionPlan.recommendationActions',
        });
      }
    }

    // Sort actions by priority and expected impact
    actions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.expectedImpact.improvement - a.expectedImpact.improvement;
    });

    // Calculate overall impact
    const overallImpact = this.calculateOverallImpact(actions);

    const plan: PrescriptivePlan = {
      planId: uuidv4(),
      tenantId,
      opportunityId,
      actions,
      overallImpact,
      generatedAt: new Date(),
    };

    // Save plan
    await this.plansContainer.items.create({
      ...plan,
      type: 'prescriptive_plan',
      partitionKey: tenantId,
    });

    this.monitoring?.trackEvent('prescriptive_analytics.plan_generated', {
      tenantId,
      opportunityId,
      actionCount: actions.length,
    });

    return plan;
  }

  /**
   * Generate risk mitigation actions
   */
  private async generateRiskMitigationActions(
    opportunityId: string,
    tenantId: string,
    userId: string
  ): Promise<PrescriptiveAction[]> {
    const actions: PrescriptiveAction[] = [];

    if (!this.riskEvaluationService) {
      return actions;
    }

    try {
      const evaluation = await this.riskEvaluationService.evaluateOpportunity(
        opportunityId,
        tenantId,
        userId
      );

      // Generate actions for high-risk factors
      for (const risk of evaluation.risks) {
        if (risk.confidence > 0.7) {
          actions.push({
            actionId: uuidv4(),
            tenantId,
            opportunityId,
            category: 'risk_mitigation',
            priority: risk.confidence > 0.8 ? 'critical' : 'high',
            title: `Mitigate ${risk.category} Risk`,
            description: `Address ${risk.riskName || risk.category} risk`,
            rationale: `High confidence risk detected: ${risk.category}`,
            expectedImpact: {
              metric: 'risk_score',
              improvement: risk.confidence * 0.5, // Reduce risk by 50% of current level
              confidence: risk.confidence,
            },
            steps: [
              {
                step: 1,
                action: `Review ${risk.category} factors`,
                estimatedTime: '1 hour',
              },
              {
                step: 2,
                action: `Develop mitigation strategy`,
                estimatedTime: '2 hours',
              },
            ],
            generatedAt: new Date(),
          });
        }
      }
    } catch (error) {
      // Return empty array on error
    }

    return actions;
  }

  /**
   * Convert causal recommendations to actions
   */
  private convertCausalRecommendationsToActions(
    causalAnalysis: any,
    opportunityId: string,
    tenantId: string
  ): PrescriptiveAction[] {
    const actions: PrescriptiveAction[] = [];

    for (const recommendation of causalAnalysis.recommendations || []) {
      actions.push({
        actionId: uuidv4(),
        tenantId,
        opportunityId,
        category: 'opportunity_optimization',
        priority: recommendation.priority,
        title: recommendation.action,
        description: recommendation.rationale,
        rationale: recommendation.rationale,
        expectedImpact: {
          metric: 'win_probability',
          improvement: recommendation.expectedImpact,
          confidence: 0.7,
        },
        steps: [
          {
            step: 1,
            action: recommendation.action,
            estimatedTime: '1 day',
          },
        ],
        generatedAt: new Date(),
      });
    }

    return actions;
  }

  /**
   * Generate recommendation-based actions
   */
  private async generateRecommendationBasedActions(
    opportunityId: string,
    tenantId: string,
    userId: string
  ): Promise<PrescriptiveAction[]> {
    const actions: PrescriptiveAction[] = [];

    if (!this.recommendationsService) {
      return actions;
    }

    try {
      // Get recommendations for opportunity context
      const recommendations = await this.recommendationsService.getRecommendations(
        tenantId,
        {
          opportunityId,
          limit: 5,
        }
      );

      for (const rec of recommendations.items || []) {
        actions.push({
          actionId: uuidv4(),
          tenantId,
          opportunityId,
          category: 'opportunity_optimization',
          priority: 'medium',
          title: rec.title || 'Follow Recommendation',
          description: rec.description || 'Apply recommended approach',
          rationale: `Based on similar successful opportunities`,
          expectedImpact: {
            metric: 'win_probability',
            improvement: rec.score || 0.3,
            confidence: 0.6,
          },
          steps: [
            {
              step: 1,
              action: rec.title || 'Apply recommendation',
              estimatedTime: '2 hours',
            },
          ],
          generatedAt: new Date(),
        });
      }
    } catch (error) {
      // Return empty array on error
    }

    return actions;
  }

  /**
   * Calculate overall impact of action plan
   */
  private calculateOverallImpact(actions: PrescriptiveAction[]): {
    expectedImprovement: number;
    confidence: number;
    timeToValue: string;
  } {
    if (actions.length === 0) {
      return {
        expectedImprovement: 0,
        confidence: 0,
        timeToValue: 'N/A',
      };
    }

    // Weighted average of improvements
    const totalImprovement = actions.reduce(
      (sum, action) => sum + action.expectedImpact.improvement * action.expectedImpact.confidence,
      0
    );
    const totalConfidence = actions.reduce(
      (sum, action) => sum + action.expectedImpact.confidence,
      0
    );

    const expectedImprovement = totalConfidence > 0 ? totalImprovement / totalConfidence : 0;
    const confidence = totalConfidence / actions.length;

    // Estimate time to value (based on action steps)
    const totalSteps = actions.reduce((sum, action) => sum + action.steps.length, 0);
    const estimatedDays = Math.ceil(totalSteps / 3); // ~3 steps per day
    const timeToValue = estimatedDays <= 7 ? `${estimatedDays} days` : `${Math.ceil(estimatedDays / 7)} weeks`;

    return {
      expectedImprovement: Math.min(1, expectedImprovement),
      confidence,
      timeToValue,
    };
  }

  /**
   * Get action plan for an opportunity
   */
  async getActionPlan(
    opportunityId: string,
    tenantId: string
  ): Promise<PrescriptivePlan | null> {
    try {
      const query = `
        SELECT * FROM c
        WHERE c.tenantId = @tenantId
        AND c.opportunityId = @opportunityId
        AND c.type = 'prescriptive_plan'
        ORDER BY c.generatedAt DESC
      `;

      const { resources } = await this.plansContainer.items
        .query<PrescriptivePlan>({
          query,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@opportunityId', value: opportunityId },
          ],
        })
        .fetchAll();

      return resources[0] || null;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'getActionPlan' });
      return null;
    }
  }
}

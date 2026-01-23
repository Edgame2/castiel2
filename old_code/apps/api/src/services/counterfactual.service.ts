/**
 * Counterfactual Service
 * Generates what-if scenarios for opportunities
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { ServiceType, Context, CounterfactualScenario } from '../types/adaptive-learning.types.js';
import { RiskEvaluationService } from './risk-evaluation.service.js';

export interface CounterfactualRequest {
  opportunityId: string;
  tenantId: string;
  changes: Record<string, any>; // Desired changes
  includeRiskAnalysis?: boolean;
}

/**
 * Counterfactual Service
 */
export class CounterfactualService {
  private client: CosmosClient;
  private database: Database;
  private scenariosContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private riskEvaluationService?: RiskEvaluationService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    riskEvaluationService?: RiskEvaluationService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
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
    // Using learning_outcomes container for now, could create dedicated scenarios container
    this.scenariosContainer = this.database.container(config.cosmosDb.containers.learningOutcomes);
  }

  /**
   * Generate counterfactual scenario
   */
  async generateCounterfactual(
    request: CounterfactualRequest
  ): Promise<CounterfactualScenario> {
    const scenarioId = uuidv4();

    // Estimate feasibility
    const feasibility = await this.estimateFeasibility(request.changes, request.opportunityId);

    // Apply changes to opportunity (hypothetical)
    const hypotheticalOpportunity = await this.applyChanges(request.opportunityId, request.changes);

    // Predict outcome with changes
    let predictedOutcome = {
      riskScore: 0.5,
      winProbability: 0.5,
      revenue: 0,
    };

    if (this.riskEvaluationService) {
      try {
        // Re-evaluate risk with hypothetical opportunity
        const evaluation = await this.riskEvaluationService.evaluateOpportunity(
          request.opportunityId,
          request.tenantId,
          'system', // System user
          {
            forceRefresh: true,
          }
        );

        predictedOutcome.riskScore = evaluation.riskScore;
        predictedOutcome.winProbability = 1 - evaluation.riskScore; // Simplified
        predictedOutcome.revenue = (hypotheticalOpportunity.structuredData as any)?.amount || 0;
      } catch (error) {
        this.monitoring?.trackException(error as Error, { operation: 'generateCounterfactual.evaluation' });
      }
    }

    const scenario: CounterfactualScenario = {
      scenarioId,
      tenantId: request.tenantId,
      opportunityId: request.opportunityId,
      changes: request.changes,
      predictedOutcome,
      feasibility,
      confidence: 0.7, // Default confidence
      createdAt: new Date(),
    };

    // Save scenario
    await this.scenariosContainer.items.create(scenario);

    // Cache in Redis
    if (this.redis) {
      const key = `counterfactual:${request.tenantId}:${scenarioId}`;
      await this.redis.setex(key, 24 * 60 * 60, JSON.stringify(scenario)); // 24 hours
    }

    this.monitoring?.trackEvent('counterfactual.scenario_generated', {
      tenantId: request.tenantId,
      opportunityId: request.opportunityId,
      scenarioId,
    });

    return scenario;
  }

  /**
   * Estimate feasibility of changes
   */
  async estimateFeasibility(
    changes: Record<string, any>,
    opportunityId: string
  ): Promise<number> {
    // Simple feasibility estimation
    // In production, would use ML model or rule-based system

    let feasibility = 1.0;

    // Check change types
    for (const [key, value] of Object.entries(changes)) {
      // Stage changes: easier to move forward than backward
      if (key === 'stage') {
        const stageOrder = ['discovery', 'qualification', 'proposal', 'negotiation', 'closed_won'];
        // Would need current stage to compare
        // For now, assume moderate feasibility
        feasibility *= 0.8;
      }

      // Amount changes: large increases are less feasible
      if (key === 'amount') {
        // Would need current amount to compare
        // For now, assume moderate feasibility
        feasibility *= 0.7;
      }

      // Timeline changes: shortening timeline is less feasible
      if (key === 'closeDate') {
        feasibility *= 0.6;
      }
    }

    return Math.max(0.1, Math.min(1.0, feasibility));
  }

  /**
   * Apply changes to opportunity (hypothetical)
   */
  private async applyChanges(opportunityId: string, changes: Record<string, any>): Promise<any> {
    // In production, would load actual opportunity and apply changes
    // For now, return hypothetical opportunity
    return {
      id: opportunityId,
      structuredData: changes,
    };
  }

  /**
   * Validate counterfactual against actual outcome
   */
  async validateCounterfactual(
    scenarioId: string,
    tenantId: string,
    actualOutcome: 'won' | 'lost' | 'cancelled'
  ): Promise<{
    validated: boolean;
    accuracy: number; // 0-1: How accurate was the prediction
    error: number; // Prediction error
  }> {
    try {
      // Get scenario
      const { resource: scenario } = await this.scenariosContainer
        .item(scenarioId, tenantId)
        .read<CounterfactualScenario>();

      if (!scenario) {
        return {
          validated: false,
          accuracy: 0,
          error: 1,
        };
      }

      // Compare predicted vs actual
      const predictedWin = scenario.predictedOutcome.winProbability > 0.5;
      const actualWin = actualOutcome === 'won';

      const accuracy = predictedWin === actualWin ? 1.0 : 0.0;
      const error = Math.abs(scenario.predictedOutcome.winProbability - (actualWin ? 1.0 : 0.0));

      // Update scenario with validation
      scenario.validated = true;
      scenario.actualOutcome = actualOutcome;
      scenario.validationAccuracy = accuracy;
      scenario.validatedAt = new Date();

      await this.scenariosContainer.items.upsert(scenario);

      return {
        validated: true,
        accuracy,
        error,
      };
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'validateCounterfactual' });
      return {
        validated: false,
        accuracy: 0,
        error: 1,
      };
    }
  }
}

/**
 * Neuro-Symbolic Service
 * Combines neural (ML/LLM) predictions with symbolic (rule-based) reasoning
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { RiskEvaluationService } from './risk-evaluation.service.js';
import { RecommendationsService } from './recommendation.service.js';

export interface SymbolicRule {
  ruleId: string;
  name: string;
  condition: (context: any) => boolean;
  action: (context: any) => any;
  priority: number; // Higher = more important
  category: 'constraint' | 'optimization' | 'validation' | 'explanation';
}

export interface NeuralPrediction {
  predictionId: string;
  model: 'ml' | 'llm' | 'ensemble';
  value: number; // Prediction value
  confidence: number; // 0-1
  features?: Record<string, any>;
}

export interface ConstrainedPrediction {
  predictionId: string;
  neuralPrediction: NeuralPrediction;
  constraints: Array<{
    ruleId: string;
    ruleName: string;
    satisfied: boolean;
    adjustment?: number; // Adjustment applied
  }>;
  adjustedValue: number; // Neural prediction adjusted by constraints
  explanation: string; // Symbolic explanation
  confidence: number; // Combined confidence
}

export interface KnowledgeIntegration {
  integrationId: string;
  tenantId: string;
  neuralKnowledge: {
    patterns: Record<string, number>; // Learned patterns
    weights: Record<string, number>; // Learned weights
  };
  symbolicKnowledge: {
    rules: SymbolicRule[];
    domainFacts: Record<string, any>; // Domain-specific facts
  };
  integrated: {
    hybridRules: Array<{
      ruleId: string;
      neuralComponent: string;
      symbolicComponent: string;
      confidence: number;
    }>;
  };
  lastUpdated: Date;
}

/**
 * Neuro-Symbolic Service
 */
export class NeuroSymbolicService {
  private client: CosmosClient;
  private database: Database;
  private integrationsContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private riskEvaluationService?: RiskEvaluationService;
  private recommendationsService?: RecommendationsService;

  // Symbolic rules
  private rules: SymbolicRule[] = [];

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    riskEvaluationService?: RiskEvaluationService,
    recommendationsService?: RecommendationsService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.riskEvaluationService = riskEvaluationService;
    this.recommendationsService = recommendationsService;

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
    // Using learning_outcomes container for now, could create dedicated neuro_symbolic container
    this.integrationsContainer = this.database.container(config.cosmosDb.containers.learningOutcomes);

    // Initialize default symbolic rules
    this.initializeDefaultRules();
  }

  /**
   * Constrained optimization: Apply symbolic rules to neural predictions
   */
  async constrainedOptimization(
    neuralPrediction: NeuralPrediction,
    context: any,
    tenantId: string
  ): Promise<ConstrainedPrediction> {
    // Get applicable rules
    const applicableRules = this.getApplicableRules(context);

    // Check constraints
    const constraints = applicableRules
      .filter((rule) => rule.category === 'constraint')
      .map((rule) => {
        const satisfied = rule.condition(context);
        let adjustment = 0;

        if (!satisfied) {
          // Apply constraint: adjust prediction
          adjustment = this.calculateConstraintAdjustment(rule, neuralPrediction, context);
        }

        return {
          ruleId: rule.ruleId,
          ruleName: rule.name,
          satisfied,
          adjustment,
        };
      });

    // Apply adjustments
    const totalAdjustment = constraints.reduce((sum, c) => sum + (c.adjustment || 0), 0);
    const adjustedValue = Math.max(0, Math.min(1, neuralPrediction.value + totalAdjustment));

    // Generate symbolic explanation
    const explanation = this.generateSymbolicExplanation(neuralPrediction, constraints, context);

    // Calculate combined confidence (neural confidence reduced if constraints violated)
    const constraintViolations = constraints.filter((c) => !c.satisfied).length;
    const confidence = neuralPrediction.confidence * (1 - constraintViolations * 0.1);

    const constrained: ConstrainedPrediction = {
      predictionId: uuidv4(),
      neuralPrediction,
      constraints,
      adjustedValue,
      explanation,
      confidence: Math.max(0, confidence),
    };

    return constrained;
  }

  /**
   * Symbolic explanation: Explain neural prediction using rules
   */
  async symbolicExplanation(
    neuralPrediction: NeuralPrediction,
    context: any
  ): Promise<string> {
    const applicableRules = this.getApplicableRules(context);

    // Find rules that support or contradict the prediction
    const supportingRules = applicableRules.filter((rule) => {
      if (rule.category === 'explanation') {
        return rule.condition(context);
      }
      return false;
    });

    // Generate explanation
    if (supportingRules.length > 0) {
      const ruleNames = supportingRules.map((r) => r.name).join(', ');
      return `Prediction of ${neuralPrediction.value.toFixed(2)} is supported by: ${ruleNames}`;
    }

    return `Neural model predicts ${neuralPrediction.value.toFixed(2)} with ${(neuralPrediction.confidence * 100).toFixed(0)}% confidence`;
  }

  /**
   * Integrate neural learning with domain knowledge
   */
  async integrateKnowledge(
    tenantId: string,
    neuralKnowledge: {
      patterns: Record<string, number>;
      weights: Record<string, number>;
    },
    symbolicKnowledge: {
      rules: SymbolicRule[];
      domainFacts: Record<string, any>;
    }
  ): Promise<KnowledgeIntegration> {
    // Create hybrid rules that combine neural and symbolic components
    const hybridRules = this.createHybridRules(neuralKnowledge, symbolicKnowledge);

    const integration: KnowledgeIntegration = {
      integrationId: uuidv4(),
      tenantId,
      neuralKnowledge,
      symbolicKnowledge,
      integrated: {
        hybridRules,
      },
      lastUpdated: new Date(),
    };

    // Save integration
    await this.integrationsContainer.items.create({
      ...integration,
      type: 'knowledge_integration',
      partitionKey: tenantId,
    });

    this.monitoring?.trackEvent('neuro_symbolic.knowledge_integrated', {
      tenantId,
      hybridRuleCount: hybridRules.length,
    });

    return integration;
  }

  /**
   * Get applicable rules for context
   */
  private getApplicableRules(context: any): SymbolicRule[] {
    return this.rules.filter((rule) => {
      try {
        return rule.condition(context);
      } catch (error) {
        return false;
      }
    });
  }

  /**
   * Calculate constraint adjustment
   */
  private calculateConstraintAdjustment(
    rule: SymbolicRule,
    prediction: NeuralPrediction,
    context: any
  ): number {
    // Default: reduce prediction by 10% if constraint violated
    return -prediction.value * 0.1;
  }

  /**
   * Generate symbolic explanation
   */
  private generateSymbolicExplanation(
    prediction: NeuralPrediction,
    constraints: Array<{ ruleId: string; ruleName: string; satisfied: boolean; adjustment?: number }>,
    context: any
  ): string {
    const parts: string[] = [];

    parts.push(`Neural model predicts ${prediction.value.toFixed(2)}`);

    const violated = constraints.filter((c) => !c.satisfied);
    if (violated.length > 0) {
      parts.push(`Constraints violated: ${violated.map((c) => c.ruleName).join(', ')}`);
      parts.push(`Adjusted prediction: ${(prediction.value + (violated.reduce((sum, c) => sum + (c.adjustment || 0), 0))).toFixed(2)}`);
    } else {
      parts.push('All constraints satisfied');
    }

    return parts.join('. ');
  }

  /**
   * Create hybrid rules combining neural and symbolic components
   */
  private createHybridRules(
    neuralKnowledge: { patterns: Record<string, number>; weights: Record<string, number> },
    symbolicKnowledge: { rules: SymbolicRule[]; domainFacts: Record<string, any> }
  ): Array<{ ruleId: string; neuralComponent: string; symbolicComponent: string; confidence: number }> {
    const hybridRules: Array<{ ruleId: string; neuralComponent: string; symbolicComponent: string; confidence: number }> = [];

    // Match neural patterns with symbolic rules
    for (const [pattern, value] of Object.entries(neuralKnowledge.patterns)) {
      const matchingRule = symbolicKnowledge.rules.find((rule) => rule.name.toLowerCase().includes(pattern.toLowerCase()));

      if (matchingRule) {
        hybridRules.push({
          ruleId: uuidv4(),
          neuralComponent: `Pattern: ${pattern} (weight: ${value.toFixed(2)})`,
          symbolicComponent: `Rule: ${matchingRule.name}`,
          confidence: Math.min(1, value * 0.8), // Combine confidence
        });
      }
    }

    return hybridRules;
  }

  /**
   * Initialize default symbolic rules
   */
  private initializeDefaultRules(): void {
    // Constraint: Risk score cannot exceed 1.0
    this.rules.push({
      ruleId: 'constraint_risk_max',
      name: 'Maximum Risk Constraint',
      condition: (context) => true, // Always applicable
      action: (context) => {
        if (context.riskScore > 1.0) {
          return { riskScore: 1.0 };
        }
        return context;
      },
      priority: 10,
      category: 'constraint',
    });

    // Constraint: Win probability must be between 0 and 1
    this.rules.push({
      ruleId: 'constraint_probability_range',
      name: 'Probability Range Constraint',
      condition: (context) => context.hasOwnProperty('winProbability'),
      action: (context) => {
        if (context.winProbability < 0) {
          return { winProbability: 0 };
        }
        if (context.winProbability > 1) {
          return { winProbability: 1 };
        }
        return context;
      },
      priority: 10,
      category: 'constraint',
    });

    // Explanation: High deal value increases risk
    this.rules.push({
      ruleId: 'explanation_high_value_risk',
      name: 'High Value Risk Explanation',
      condition: (context) => context.amount > 500000,
      action: (context) => ({
        explanation: 'Large deal size increases risk due to higher stakes',
      }),
      priority: 5,
      category: 'explanation',
    });

    // Optimization: Early stage opportunities need more nurturing
    this.rules.push({
      ruleId: 'optimization_early_stage',
      name: 'Early Stage Optimization',
      condition: (context) => ['discovery', 'qualification'].includes(context.stage),
      action: (context) => ({
        recommendation: 'Increase engagement frequency for early-stage opportunities',
      }),
      priority: 7,
      category: 'optimization',
    });
  }
}

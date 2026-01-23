/**
 * Adaptive Learning Validation Service
 * Validates learned parameters before applying
 * Includes trigger logic for when to validate
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import {
  ComponentWeightLearning,
  ServiceType,
  Context,
  ValidationResult,
  ValidationCriteria,
} from '../types/adaptive-learning.types.js';
import { statisticalValidator } from '../utils/statistical-validator.js';
import { contextKeyGenerator } from '../utils/context-key-generator.js';

export interface ValidationTrigger {
  tenantId: string;
  contextKey: string;
  serviceType: ServiceType;
  shouldValidate: boolean;
  reason?: string;
  lastValidatedAt?: Date;
  lastValidatedExamples?: number;
  currentExamples: number;
  timeSinceLastValidation: number; // milliseconds
}

/**
 * Adaptive Learning Validation Service
 */
export class AdaptiveLearningValidationService {
  private client: CosmosClient;
  private database: Database;
  private weightsContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;

  // Validation trigger criteria
  private readonly EXAMPLE_THRESHOLD = 100; // Validate after 100 new examples
  private readonly TIME_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  private readonly PERFORMANCE_IMPROVEMENT_THRESHOLD = 0.10; // 10% improvement
  private readonly PERFORMANCE_DEGRADATION_THRESHOLD = 0.05; // 5% degradation

  constructor(cosmosClient: CosmosClient, redis?: Redis, monitoring?: IMonitoringProvider) {
    this.redis = redis;
    this.monitoring = monitoring;

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
    this.weightsContainer = this.database.container(config.cosmosDb.containers.adaptiveWeights);
  }

  /**
   * Check if validation should be triggered
   */
  async shouldValidate(
    tenantId: string,
    contextKey: string,
    serviceType: ServiceType
  ): Promise<ValidationTrigger> {
    try {
      // Get learning record
      const id = `${tenantId}:${contextKey}:${serviceType}`;
      let learning: ComponentWeightLearning | null = null;

      try {
        const { resource } = await this.weightsContainer.item(id, tenantId).read<ComponentWeightLearning>();
        learning = resource || null;
      } catch (error) {
        // Not found, no validation needed yet
        return {
          tenantId,
          contextKey,
          serviceType,
          shouldValidate: false,
          reason: 'No learning record found',
          currentExamples: 0,
          timeSinceLastValidation: 0,
        };
      }

      if (!learning) {
        return {
          tenantId,
          contextKey,
          serviceType,
          shouldValidate: false,
          reason: 'No learning record',
          currentExamples: 0,
          timeSinceLastValidation: 0,
        };
      }

      const currentExamples = learning.examples;
      const lastValidatedAt = learning.validatedAt || learning.createdAt;
      const lastValidatedExamples = learning.validatedAt
        ? learning.examples - (learning.validatedAt ? 0 : learning.examples)
        : 0;
      const timeSinceLastValidation = Date.now() - lastValidatedAt.getTime();

      // Criterion 1: Example threshold (100 examples since last validation)
      const examplesSinceLastValidation = currentExamples - lastValidatedExamples;
      if (examplesSinceLastValidation >= this.EXAMPLE_THRESHOLD) {
        return {
          tenantId,
          contextKey,
          serviceType,
          shouldValidate: true,
          reason: `Example threshold reached: ${examplesSinceLastValidation} >= ${this.EXAMPLE_THRESHOLD}`,
          lastValidatedAt,
          lastValidatedExamples,
          currentExamples,
          timeSinceLastValidation,
        };
      }

      // Criterion 2: Time threshold (7 days)
      if (timeSinceLastValidation >= this.TIME_THRESHOLD) {
        return {
          tenantId,
          contextKey,
          serviceType,
          shouldValidate: true,
          reason: `Time threshold reached: ${Math.floor(timeSinceLastValidation / (24 * 60 * 60 * 1000))} days >= 7 days`,
          lastValidatedAt,
          lastValidatedExamples,
          currentExamples,
          timeSinceLastValidation,
        };
      }

      // Criterion 3: Performance improvement detected (>10%)
      const performanceImprovement = learning.performance.accuracy - learning.performance.baseline;
      if (performanceImprovement > this.PERFORMANCE_IMPROVEMENT_THRESHOLD) {
        return {
          tenantId,
          contextKey,
          serviceType,
          shouldValidate: true,
          reason: `Performance improvement detected: ${(performanceImprovement * 100).toFixed(1)}% > ${(this.PERFORMANCE_IMPROVEMENT_THRESHOLD * 100).toFixed(1)}%`,
          lastValidatedAt,
          lastValidatedExamples,
          currentExamples,
          timeSinceLastValidation,
        };
      }

      // Criterion 4: Performance degradation detected (>5%)
      const performanceDegradation = learning.performance.baseline - learning.performance.accuracy;
      if (performanceDegradation > this.PERFORMANCE_DEGRADATION_THRESHOLD) {
        return {
          tenantId,
          contextKey,
          serviceType,
          shouldValidate: true,
          reason: `Performance degradation detected: ${(performanceDegradation * 100).toFixed(1)}% > ${(this.PERFORMANCE_DEGRADATION_THRESHOLD * 100).toFixed(1)}%`,
          lastValidatedAt,
          lastValidatedExamples,
          currentExamples,
          timeSinceLastValidation,
        };
      }

      return {
        tenantId,
        contextKey,
        serviceType,
        shouldValidate: false,
        reason: 'No validation criteria met',
        lastValidatedAt,
        lastValidatedExamples,
        currentExamples,
        timeSinceLastValidation,
      };
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'shouldValidate' });
      return {
        tenantId,
        contextKey,
        serviceType,
        shouldValidate: false,
        reason: `Error checking validation: ${(error as Error).message}`,
        currentExamples: 0,
        timeSinceLastValidation: 0,
      };
    }
  }

  /**
   * Validate weights using statistical validation
   */
  async validateWeights(
    tenantId: string,
    contextKey: string,
    serviceType: ServiceType,
    criteria?: Partial<ValidationCriteria>
  ): Promise<ValidationResult> {
    try {
      // Get learning record
      const id = `${tenantId}:${contextKey}:${serviceType}`;
      const { resource: learning } = await this.weightsContainer.item(id, tenantId).read<ComponentWeightLearning>();

      if (!learning) {
        return {
          validated: false,
          reason: 'No learning record found',
          confidence: 0,
          lowerBound: 0,
          upperBound: 0,
          medianImprovement: 0,
          sampleSize: 0,
          validatedAt: new Date(),
        };
      }

      // Get performance data (simplified - in production, would get from outcomes)
      // For now, use the performance metrics from learning record
      const learnedPerformance = [learning.performance.accuracy];
      const defaultPerformance = [learning.performance.baseline];

      // If we have enough examples, use actual outcome data
      // TODO: Query learning_outcomes container for actual performance data

      // Perform statistical validation
      const result = await statisticalValidator.validateLearnedParameters(
        learnedPerformance,
        defaultPerformance,
        criteria
      );

      // Update learning record with validation results
      if (result.validated) {
        learning.validated = true;
        learning.validatedAt = new Date();
        learning.validationResults = result;
        learning.version += 1;

        await this.weightsContainer.items.upsert(learning);

        // Invalidate cache
        if (this.redis) {
          const cacheKey = `learned_params:${tenantId}:weights:${contextKey}:${serviceType}`;
          await this.redis.del(cacheKey);
        }
      }

      return result;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'validateWeights' });
      return {
        validated: false,
        reason: `Validation error: ${(error as Error).message}`,
        confidence: 0,
        lowerBound: 0,
        upperBound: 0,
        medianImprovement: 0,
        sampleSize: 0,
        validatedAt: new Date(),
      };
    }
  }

  /**
   * Check if learned parameters should be applied
   */
  async shouldApplyLearnedParams(
    tenantId: string,
    paramType: 'weights' | 'model_selection' | 'signal_weights' | 'feature_importance',
    examples: number
  ): Promise<boolean> {
    // Minimum examples required: 100
    if (examples < 100) {
      return false;
    }

    // Additional checks based on param type
    switch (paramType) {
      case 'weights':
        // For weights, need at least 100 examples
        return examples >= 100;
      case 'model_selection':
        // For model selection, need more examples (3000 for graduation)
        return examples >= 100; // Can start learning earlier
      case 'signal_weights':
        // For signal weights, need sufficient signal diversity
        return examples >= 50; // Lower threshold for signals
      case 'feature_importance':
        // For feature importance, need enough examples for SHAP
        return examples >= 100;
      default:
        return examples >= 100;
    }
  }
}

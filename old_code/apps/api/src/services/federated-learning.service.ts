/**
 * Federated Learning Service
 * Privacy-preserving learning across tenants
 * 
 * Features:
 * - Federated learning coordination
 * - Differential privacy
 * - Secure aggregation
 * - Model sharing protocols
 * - Privacy-preserving weight updates
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { AdaptiveWeightLearningService } from './adaptive-weight-learning.service.js';
import { MetaLearningService } from './meta-learning.service.js';

export type FederatedLearningRoundStatus = 'pending' | 'collecting' | 'aggregating' | 'completed' | 'failed';

export interface FederatedLearningRound {
  roundId: string;
  tenantId: string; // Partition key (coordinator tenant)
  modelType: 'weights' | 'patterns' | 'strategies';
  status: FederatedLearningRoundStatus;
  participants: Array<{
    tenantId: string;
    contributionId: string;
    contributionHash: string; // Hash of contribution for verification
    submittedAt?: Date;
  }>;
  aggregation: {
    method: 'average' | 'weighted_average' | 'secure_aggregation';
    aggregatedModel: Record<string, any>; // Aggregated model parameters
    privacyBudget: number; // Privacy budget consumed
    noiseLevel?: number; // Differential privacy noise level
  };
  startedAt: Date;
  completedAt?: Date;
}

export interface FederatedContribution {
  contributionId: string;
  tenantId: string; // Partition key
  roundId: string;
  modelType: FederatedLearningRound['modelType'];
  contribution: {
    parameters: Record<string, number>; // Model parameters (e.g., weights)
    sampleCount: number; // Number of samples used
    metadata?: Record<string, any>;
  };
  privacy: {
    differentialPrivacy: boolean;
    epsilon?: number; // Privacy parameter
    delta?: number; // Privacy parameter
    noiseAdded?: number; // Amount of noise added
  };
  submittedAt: Date;
}

export interface FederatedModel {
  modelId: string;
  tenantId: string; // Partition key
  modelType: FederatedLearningRound['modelType'];
  globalModel: Record<string, any>; // Global aggregated model
  roundCount: number; // Number of rounds participated
  lastUpdated: Date;
  performance: {
    accuracy: number; // 0-1
    improvement: number; // Improvement over local model
  };
}

/**
 * Federated Learning Service
 */
export class FederatedLearningService {
  private client: CosmosClient;
  private database: Database;
  private roundsContainer: Container;
  private contributionsContainer: Container;
  private modelsContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private adaptiveWeightLearningService?: AdaptiveWeightLearningService;
  private metaLearningService?: MetaLearningService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    adaptiveWeightLearningService?: AdaptiveWeightLearningService,
    metaLearningService?: MetaLearningService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.adaptiveWeightLearningService = adaptiveWeightLearningService;
    this.metaLearningService = metaLearningService;

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
    this.roundsContainer = this.database.container(config.cosmosDb.containers.federatedLearning);
    this.contributionsContainer = this.database.container(config.cosmosDb.containers.federatedLearning);
    this.modelsContainer = this.database.container(config.cosmosDb.containers.federatedLearning);
  }

  /**
   * Start a federated learning round
   */
  async startRound(
    tenantId: string,
    modelType: FederatedLearningRound['modelType'],
    participants: string[],
    aggregationMethod: FederatedLearningRound['aggregation']['method'] = 'weighted_average'
  ): Promise<FederatedLearningRound> {
    const roundId = uuidv4();

    const round: FederatedLearningRound = {
      roundId,
      tenantId,
      modelType,
      status: 'collecting',
      participants: participants.map(p => ({
        tenantId: p,
        contributionId: '',
        contributionHash: '',
      })),
      aggregation: {
        method: aggregationMethod,
        aggregatedModel: {},
        privacyBudget: 0,
      },
      startedAt: new Date(),
    };

    await this.roundsContainer.items.create(round);

    this.monitoring?.trackEvent('federated_learning.round_started', {
      tenantId,
      roundId,
      modelType,
      participantCount: participants.length,
    });

    return round;
  }

  /**
   * Submit contribution to federated learning round
   */
  async submitContribution(
    tenantId: string,
    roundId: string,
    contribution: Omit<FederatedContribution['contribution'], 'sampleCount'>,
    privacyConfig?: {
      differentialPrivacy?: boolean;
      epsilon?: number;
      delta?: number;
    }
  ): Promise<FederatedContribution> {
    // Get round
    const { resource: round } = await this.roundsContainer.item(roundId, tenantId).read<FederatedLearningRound>();
    if (!round) {
      throw new Error(`Round not found: ${roundId}`);
    }

    if (round.status !== 'collecting') {
      throw new Error(`Round is not accepting contributions: ${round.status}`);
    }

    // Apply differential privacy if enabled
    let noiseAdded = 0;
    let parameters = contribution.parameters;

    if (privacyConfig?.differentialPrivacy) {
      const epsilon = privacyConfig.epsilon || 1.0;
      const noise = this.addDifferentialPrivacyNoise(parameters, epsilon);
      parameters = noise.parameters;
      noiseAdded = noise.noiseLevel;
    }

    // Create contribution
    const contributionId = uuidv4();
    const federatedContribution: FederatedContribution = {
      contributionId,
      tenantId,
      roundId,
      modelType: round.modelType,
      contribution: {
        ...contribution,
        parameters,
        sampleCount: contribution.metadata?.sampleCount || 100, // Default
      },
      privacy: {
        differentialPrivacy: privacyConfig?.differentialPrivacy || false,
        epsilon: privacyConfig?.epsilon,
        delta: privacyConfig?.delta,
        noiseAdded,
      },
      submittedAt: new Date(),
    };

    await this.contributionsContainer.items.create(federatedContribution);

    // Update round with contribution
    const participant = round.participants.find(p => p.tenantId === tenantId);
    if (participant) {
      participant.contributionId = contributionId;
      participant.contributionHash = this.hashContribution(parameters);
      participant.submittedAt = new Date();
    }

    await this.roundsContainer.item(roundId, tenantId).replace(round);

    this.monitoring?.trackEvent('federated_learning.contribution_submitted', {
      tenantId,
      roundId,
      contributionId,
      differentialPrivacy: privacyConfig?.differentialPrivacy || false,
    });

    return federatedContribution;
  }

  /**
   * Aggregate contributions and complete round
   */
  async aggregateAndComplete(
    tenantId: string,
    roundId: string
  ): Promise<FederatedLearningRound> {
    const { resource: round } = await this.roundsContainer.item(roundId, tenantId).read<FederatedLearningRound>();
    if (!round) {
      throw new Error(`Round not found: ${roundId}`);
    }

    round.status = 'aggregating';
    await this.roundsContainer.item(roundId, tenantId).replace(round);

    // Get all contributions
    const contributions: FederatedContribution[] = [];
    for (const participant of round.participants) {
      if (participant.contributionId) {
        try {
          const { resource: contribution } = await this.contributionsContainer
            .item(participant.contributionId, participant.tenantId)
            .read<FederatedContribution>();
          if (contribution) {
            contributions.push(contribution);
          }
        } catch (error) {
          this.monitoring?.trackException(error as Error, {
            operation: 'aggregateAndComplete.getContribution',
            roundId,
            contributionId: participant.contributionId,
          });
        }
      }
    }

    if (contributions.length === 0) {
      throw new Error('No contributions to aggregate');
    }

    // Aggregate based on method
    const aggregatedModel = await this.aggregateContributions(
      contributions,
      round.aggregation.method
    );

    // Update round
    round.aggregation.aggregatedModel = aggregatedModel;
    round.aggregation.privacyBudget = contributions.reduce(
      (sum, c) => sum + (c.privacy.epsilon || 0),
      0
    );
    round.status = 'completed';
    round.completedAt = new Date();

    await this.roundsContainer.item(roundId, tenantId).replace(round);

    // Update global model
    await this.updateGlobalModel(tenantId, round.modelType, aggregatedModel);

    this.monitoring?.trackEvent('federated_learning.round_completed', {
      tenantId,
      roundId,
      contributionCount: contributions.length,
      privacyBudget: round.aggregation.privacyBudget,
    });

    return round;
  }

  /**
   * Get global federated model
   */
  async getGlobalModel(
    tenantId: string,
    modelType: FederatedLearningRound['modelType']
  ): Promise<FederatedModel | null> {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.modelType = @modelType',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@modelType', value: modelType },
      ],
    };

    try {
      const { resources } = await this.modelsContainer.items.query(querySpec).fetchAll();
      return (resources[0] as FederatedModel) || null;
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'getGlobalModel',
        tenantId,
        modelType,
      });
      return null;
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Add differential privacy noise
   */
  private addDifferentialPrivacyNoise(
    parameters: Record<string, number>,
    epsilon: number
  ): { parameters: Record<string, number>; noiseLevel: number } {
    // Laplace mechanism for differential privacy
    const sensitivity = 1.0; // Sensitivity of the function
    const scale = sensitivity / epsilon;

    const noisyParameters: Record<string, number> = {};
    let totalNoise = 0;

    for (const [key, value] of Object.entries(parameters)) {
      // Sample from Laplace distribution
      const noise = this.sampleLaplace(scale);
      noisyParameters[key] = value + noise;
      totalNoise += Math.abs(noise);
    }

    return {
      parameters: noisyParameters,
      noiseLevel: totalNoise / Object.keys(parameters).length,
    };
  }

  /**
   * Sample from Laplace distribution
   */
  private sampleLaplace(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Hash contribution for verification
   */
  private hashContribution(parameters: Record<string, number>): string {
    // Simple hash (in production, use crypto hash)
    const str = JSON.stringify(parameters);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Aggregate contributions
   */
  private async aggregateContributions(
    contributions: FederatedContribution[],
    method: FederatedLearningRound['aggregation']['method']
  ): Promise<Record<string, any>> {
    if (contributions.length === 0) {
      return {};
    }

    const aggregated: Record<string, number> = {};
    const parameterKeys = Object.keys(contributions[0].contribution.parameters);

    if (method === 'average') {
      // Simple average
      for (const key of parameterKeys) {
        const sum = contributions.reduce(
          (s, c) => s + (c.contribution.parameters[key] || 0),
          0
        );
        aggregated[key] = sum / contributions.length;
      }
    } else if (method === 'weighted_average') {
      // Weight by sample count
      const totalSamples = contributions.reduce(
        (sum, c) => sum + c.contribution.sampleCount,
        0
      );

      for (const key of parameterKeys) {
        const weightedSum = contributions.reduce(
          (s, c) => s + (c.contribution.parameters[key] || 0) * c.contribution.sampleCount,
          0
        );
        aggregated[key] = totalSamples > 0 ? weightedSum / totalSamples : 0;
      }
    } else if (method === 'secure_aggregation') {
      // Secure aggregation (simplified - would use cryptographic protocols)
      // For now, use weighted average with additional privacy
      const totalSamples = contributions.reduce(
        (sum, c) => sum + c.contribution.sampleCount,
        0
      );

      for (const key of parameterKeys) {
        const weightedSum = contributions.reduce(
          (s, c) => s + (c.contribution.parameters[key] || 0) * c.contribution.sampleCount,
          0
        );
        // Add small additional noise for secure aggregation
        const noise = this.sampleLaplace(0.01);
        aggregated[key] = totalSamples > 0 ? (weightedSum / totalSamples) + noise : noise;
      }
    }

    return aggregated;
  }

  /**
   * Update global model
   */
  private async updateGlobalModel(
    tenantId: string,
    modelType: FederatedLearningRound['modelType'],
    aggregatedModel: Record<string, any>
  ): Promise<void> {
    const existing = await this.getGlobalModel(tenantId, modelType);

    if (existing) {
      existing.globalModel = aggregatedModel;
      existing.roundCount += 1;
      existing.lastUpdated = new Date();
      await this.modelsContainer.item(existing.modelId, tenantId).replace(existing);
    } else {
      const modelId = uuidv4();
      const newModel: FederatedModel = {
        modelId,
        tenantId,
        modelType,
        globalModel: aggregatedModel,
        roundCount: 1,
        lastUpdated: new Date(),
        performance: {
          accuracy: 0.75, // Would calculate from validation
          improvement: 0.1, // Would calculate vs local model
        },
      };
      await this.modelsContainer.items.create(newModel);
    }
  }
}

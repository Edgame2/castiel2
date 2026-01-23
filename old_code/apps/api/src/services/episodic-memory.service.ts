/**
 * Episodic Memory Service
 * Learns from notable events (big wins, surprising losses, near misses, critical interventions)
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { ServiceType, Context } from '../types/adaptive-learning.types.js';
import { contextKeyGenerator } from '../utils/context-key-generator.js';
import { cacheKeys, CacheTTL } from '../utils/cache-keys.js';

export type EventSignificance = 'big_win' | 'surprising_loss' | 'near_miss' | 'critical_intervention';

export interface EpisodicMemory {
  episodeId: string;
  tenantId: string; // Partition key
  opportunityId: string;
  significance: EventSignificance;
  context: {
    opportunity: any; // Opportunity snapshot
    stakeholders?: any[]; // Stakeholder snapshots
    risks?: any[]; // Risk snapshots
    predictions?: any; // Prediction snapshots
  };
  outcome: {
    actual: 'won' | 'lost' | 'cancelled';
    predicted?: 'won' | 'lost';
    surprise: boolean; // Was outcome surprising?
  };
  lessons: {
    successFactors?: string[];
    failureFactors?: string[];
    interventions?: string[]; // What interventions helped/hurt
  };
  applicableContexts: string[]; // Context keys where this episode applies
  createdAt: Date;
  updatedAt: Date;
}

export interface EpisodeSimilarity {
  episodeId: string;
  similarityScore: number; // 0-1
  sharedFactors: string[];
}

/**
 * Episodic Memory Service
 */
export class EpisodicMemoryService {
  private client: CosmosClient;
  private database: Database;
  private episodesContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;

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
    // Using learning_outcomes container for now, could create dedicated episodes container
    this.episodesContainer = this.database.container(config.cosmosDb.containers.learningOutcomes);
  }

  /**
   * Identify significant events
   */
  async identifySignificantEvent(
    opportunityId: string,
    tenantId: string,
    outcome: 'won' | 'lost' | 'cancelled',
    predicted?: 'won' | 'lost',
    riskScore?: number
  ): Promise<EventSignificance | null> {
    // Big win: Won with high risk score
    if (outcome === 'won' && riskScore && riskScore > 0.7) {
      return 'big_win';
    }

    // Surprising loss: Lost when predicted to win
    if (outcome === 'lost' && predicted === 'won') {
      return 'surprising_loss';
    }

    // Near miss: Lost with very low risk score
    if (outcome === 'lost' && riskScore && riskScore < 0.3) {
      return 'near_miss';
    }

    // Critical intervention: Won after high risk was detected
    if (outcome === 'won' && riskScore && riskScore > 0.8) {
      return 'critical_intervention';
    }

    return null; // Not significant enough
  }

  /**
   * Capture episode with full context
   */
  async captureEpisode(
    opportunityId: string,
    tenantId: string,
    significance: EventSignificance,
    context: {
      opportunity: any;
      stakeholders?: any[];
      risks?: any[];
      predictions?: any;
    },
    outcome: {
      actual: 'won' | 'lost' | 'cancelled';
      predicted?: 'won' | 'lost';
    }
  ): Promise<EpisodicMemory> {
    const episodeId = uuidv4();
    const now = new Date();

    // Extract lessons
    const lessons = await this.extractLessons(significance, context, outcome);

    // Determine applicable contexts
    const applicableContexts = this.determineApplicableContexts(context);

    const episode: EpisodicMemory = {
      episodeId,
      tenantId,
      opportunityId,
      significance,
      context,
      outcome: {
        ...outcome,
        surprise: outcome.actual !== outcome.predicted,
      },
      lessons,
      applicableContexts,
      createdAt: now,
      updatedAt: now,
    };

    // Save to Cosmos DB
    await this.episodesContainer.items.create(episode);

    // Cache in Redis
    if (this.redis) {
      const key = `episode:${tenantId}:${episodeId}`;
      await this.redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(episode)); // 7 days
    }

    this.monitoring?.trackEvent('episodic_memory.episode_captured', {
      tenantId,
      opportunityId,
      significance,
    });

    return episode;
  }

  /**
   * Extract lessons from episode
   */
  async extractLessons(
    significance: EventSignificance,
    context: any,
    outcome: { actual: 'won' | 'lost' | 'cancelled'; predicted?: 'won' | 'lost' }
  ): Promise<{ successFactors?: string[]; failureFactors?: string[]; interventions?: string[] }> {
    const lessons: { successFactors?: string[]; failureFactors?: string[]; interventions?: string[] } = {};

    if (significance === 'big_win' || (significance === 'critical_intervention' && outcome.actual === 'won')) {
      // Extract success factors
      lessons.successFactors = this.extractSuccessFactors(context);
      lessons.interventions = this.extractInterventions(context);
    }

    if (significance === 'surprising_loss' || significance === 'near_miss') {
      // Extract failure factors
      lessons.failureFactors = this.extractFailureFactors(context);
    }

    return lessons;
  }

  /**
   * Retrieve similar episodes
   */
  async retrieveSimilarEpisodes(
    opportunityId: string,
    tenantId: string,
    context: Context,
    limit: number = 5
  ): Promise<EpisodeSimilarity[]> {
    const contextKey = contextKeyGenerator.generateSimple(context);

    try {
      // Query for episodes with similar contexts
      const query = `
        SELECT * FROM c
        WHERE c.tenantId = @tenantId
        AND ARRAY_CONTAINS(c.applicableContexts, @contextKey)
        ORDER BY c.createdAt DESC
      `;

      const { resources } = await this.episodesContainer.items
        .query<EpisodicMemory>({
          query,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@contextKey', value: contextKey },
          ],
        })
        .fetchAll();

      // Calculate similarity scores
      const similarities: EpisodeSimilarity[] = resources.slice(0, limit).map((episode) => {
        const similarity = this.calculateSimilarity(context, episode.context);
        return {
          episodeId: episode.episodeId,
          similarityScore: similarity.score,
          sharedFactors: similarity.factors,
        };
      });

      return similarities.sort((a, b) => b.similarityScore - a.similarityScore);
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'retrieveSimilarEpisodes' });
      return [];
    }
  }

  /**
   * Extract success factors
   */
  private extractSuccessFactors(context: any): string[] {
    const factors: string[] = [];

    // Analyze opportunity characteristics
    if (context.opportunity) {
      if (context.opportunity.structuredData?.stage === 'closed_won') {
        factors.push('Strong closing stage execution');
      }
      if (context.opportunity.structuredData?.amount > 500000) {
        factors.push('Large deal size');
      }
    }

    // Analyze risks (if risks were mitigated)
    if (context.risks && context.risks.length > 0) {
      factors.push('Risk mitigation successful');
    }

    return factors;
  }

  /**
   * Extract failure factors
   */
  private extractFailureFactors(context: any): string[] {
    const factors: string[] = [];

    // Analyze what went wrong
    if (context.risks && context.risks.length > 0) {
      const highRisks = context.risks.filter((r: any) => r.confidence > 0.7);
      if (highRisks.length > 0) {
        factors.push('High risk factors not addressed');
      }
    }

    return factors;
  }

  /**
   * Extract interventions
   */
  private extractInterventions(context: any): string[] {
    const interventions: string[] = [];

    // TODO: Extract actual interventions from context
    // For now, placeholder
    if (context.risks && context.risks.length > 0) {
      interventions.push('Risk mitigation actions taken');
    }

    return interventions;
  }

  /**
   * Determine applicable contexts
   */
  private determineApplicableContexts(context: any): string[] {
    const contexts: string[] = [];

    if (context.opportunity) {
      const oppData = context.opportunity.structuredData;
      if (oppData?.industry) {
        contexts.push(oppData.industry);
      }
      if (oppData?.stage) {
        contexts.push(oppData.stage);
      }
    }

    return contexts.length > 0 ? contexts : ['all'];
  }

  /**
   * Calculate similarity between contexts
   */
  private calculateSimilarity(context1: Context, context2: any): { score: number; factors: string[] } {
    const factors: string[] = [];
    let matches = 0;
    let total = 0;

    // Compare industry
    if (context1.industry && context2.opportunity?.structuredData?.industry) {
      total++;
      if (context1.industry === context2.opportunity.structuredData.industry) {
        matches++;
        factors.push('industry');
      }
    }

    // Compare stage
    if (context1.stage && context2.opportunity?.structuredData?.stage) {
      total++;
      if (context1.stage === context2.opportunity.structuredData.stage) {
        matches++;
        factors.push('stage');
      }
    }

    // Compare deal size
    if (context1.dealSize && context2.opportunity?.structuredData?.amount) {
      total++;
      const size1 = context1.dealSize;
      const size2 = context2.opportunity.structuredData.amount < 50000 ? 'small' :
                    context2.opportunity.structuredData.amount < 500000 ? 'medium' : 'large';
      if (size1 === size2) {
        matches++;
        factors.push('dealSize');
      }
    }

    const score = total > 0 ? matches / total : 0.5;
    return { score, factors };
  }
}

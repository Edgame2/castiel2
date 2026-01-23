/**
 * Collaborative Intelligence Service
 * Team learning and knowledge sharing
 * 
 * Features:
 * - Team pattern learning
 * - Cross-user insight sharing
 * - Collective intelligence aggregation
 * - Expert identification
 * - Knowledge transfer learning
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { FeedbackLearningService } from './feedback-learning.service.js';
import { MetaLearningService } from './meta-learning.service.js';

export interface TeamPattern {
  patternId: string;
  tenantId: string; // Partition key
  teamId?: string;
  patternType: 'success' | 'failure' | 'preference' | 'expertise';
  pattern: {
    context: string; // e.g., "tech:large:proposal"
    action: string; // What action was taken
    outcome: number; // 0-1: Success/failure
    frequency: number; // How often this pattern occurs
    users: string[]; // Users who exhibit this pattern
  };
  confidence: number; // 0-1
  detectedAt: Date;
  lastUpdated: Date;
}

export interface CollectiveInsight {
  insightId: string;
  tenantId: string;
  teamId?: string;
  insightType: 'best_practice' | 'anti_pattern' | 'expert_knowledge' | 'team_preference';
  content: {
    title: string;
    description: string;
    context: string;
    evidence: Array<{
      userId: string;
      example: string;
      outcome: number;
    }>;
  };
  aggregation: {
    contributorCount: number;
    consensusScore: number; // 0-1: How much team agrees
    validationScore: number; // 0-1: How validated this insight is
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpertProfile {
  expertId: string;
  tenantId: string;
  userId: string;
  expertise: Array<{
    domain: string; // e.g., "risk_analysis", "forecasting"
    score: number; // 0-1: Expertise level
    evidence: Array<{
      type: 'high_accuracy' | 'consistency' | 'peer_recognition' | 'innovation';
      description: string;
    }>;
  }>;
  metrics: {
    accuracy: number; // 0-1: Average prediction accuracy
    consistency: number; // 0-1: Consistency across contexts
    contribution: number; // 0-1: Contribution to team learning
    recognition: number; // 0-1: Peer recognition
  };
  lastUpdated: Date;
}

export interface KnowledgeTransfer {
  transferId: string;
  tenantId: string;
  fromUserId: string;
  toUserId: string;
  knowledgeType: 'pattern' | 'insight' | 'preference' | 'expertise';
  content: {
    source: string; // Source insight/pattern ID
    adapted: any; // Adapted knowledge for recipient
    context: string;
  };
  effectiveness: {
    applied: boolean;
    outcome?: number; // 0-1: How effective was the transfer
    feedback?: string;
  };
  transferredAt: Date;
  appliedAt?: Date;
}

/**
 * Collaborative Intelligence Service
 */
export class CollaborativeIntelligenceService {
  private client: CosmosClient;
  private database: Database;
  private patternsContainer: Container;
  private insightsContainer: Container;
  private expertsContainer: Container;
  private transfersContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private feedbackLearningService?: FeedbackLearningService;
  private metaLearningService?: MetaLearningService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    feedbackLearningService?: FeedbackLearningService,
    metaLearningService?: MetaLearningService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.feedbackLearningService = feedbackLearningService;
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
    this.patternsContainer = this.database.container(config.cosmosDb.containers.collaborativeIntelligence);
    this.insightsContainer = this.database.container(config.cosmosDb.containers.collaborativeIntelligence);
    this.expertsContainer = this.database.container(config.cosmosDb.containers.collaborativeIntelligence);
    this.transfersContainer = this.database.container(config.cosmosDb.containers.collaborativeIntelligence);
  }

  /**
   * Learn team patterns from user actions
   */
  async learnTeamPattern(
    tenantId: string,
    teamId: string | undefined,
    pattern: Omit<TeamPattern, 'patternId' | 'detectedAt' | 'lastUpdated'>
  ): Promise<TeamPattern> {
    const patternId = uuidv4();
    const teamPattern: TeamPattern = {
      ...pattern,
      patternId,
      tenantId,
      teamId,
      detectedAt: new Date(),
      lastUpdated: new Date(),
    };

    await this.patternsContainer.items.create(teamPattern);

    this.monitoring?.trackEvent('collaborative_intelligence.pattern_learned', {
      tenantId,
      teamId,
      patternId,
      patternType: pattern.patternType,
    });

    return teamPattern;
  }

  /**
   * Aggregate collective insights from team
   */
  async aggregateCollectiveInsight(
    tenantId: string,
    teamId: string | undefined,
    insight: Omit<CollectiveInsight, 'insightId' | 'createdAt' | 'updatedAt'>
  ): Promise<CollectiveInsight> {
    const insightId = uuidv4();
    const collectiveInsight: CollectiveInsight = {
      ...insight,
      insightId,
      tenantId,
      teamId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.insightsContainer.items.create(collectiveInsight);

    // Invalidate cache
    if (this.redis && teamId) {
      await this.redis.del(`collective_insights:${tenantId}:${teamId}`);
    }

    this.monitoring?.trackEvent('collaborative_intelligence.insight_aggregated', {
      tenantId,
      teamId,
      insightId,
      insightType: insight.insightType,
    });

    return collectiveInsight;
  }

  /**
   * Identify experts in a domain
   */
  async identifyExpert(
    tenantId: string,
    userId: string,
    domain: string
  ): Promise<ExpertProfile | null> {
    // Check cache
    if (this.redis) {
      const cacheKey = `expert:${tenantId}:${userId}:${domain}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Get user's performance data (would integrate with feedback/outcome services)
    const performance = await this.getUserPerformance(tenantId, userId, domain);

    if (performance.accuracy < 0.7 && performance.consistency < 0.7) {
      return null; // Not an expert
    }

    const expertProfile: ExpertProfile = {
      expertId: uuidv4(),
      tenantId,
      userId,
      expertise: [{
        domain,
        score: (performance.accuracy + performance.consistency) / 2,
        evidence: this.generateExpertEvidence(performance),
      }],
      metrics: performance,
      lastUpdated: new Date(),
    };

    await this.expertsContainer.items.create(expertProfile);

    // Cache for 1 hour
    if (this.redis) {
      const cacheKey = `expert:${tenantId}:${userId}:${domain}`;
      await this.redis.setex(cacheKey, 60 * 60, JSON.stringify(expertProfile));
    }

    this.monitoring?.trackEvent('collaborative_intelligence.expert_identified', {
      tenantId,
      userId,
      domain,
      expertiseScore: expertProfile.expertise[0].score,
    });

    return expertProfile;
  }

  /**
   * Transfer knowledge from expert to user
   */
  async transferKnowledge(
    tenantId: string,
    fromUserId: string,
    toUserId: string,
    knowledgeType: KnowledgeTransfer['knowledgeType'],
    content: KnowledgeTransfer['content']
  ): Promise<KnowledgeTransfer> {
    const transferId = uuidv4();
    const transfer: KnowledgeTransfer = {
      transferId,
      tenantId,
      fromUserId,
      toUserId,
      knowledgeType,
      content,
      effectiveness: {
        applied: false,
      },
      transferredAt: new Date(),
    };

    await this.transfersContainer.items.create(transfer);

    this.monitoring?.trackEvent('collaborative_intelligence.knowledge_transferred', {
      tenantId,
      fromUserId,
      toUserId,
      knowledgeType,
      transferId,
    });

    return transfer;
  }

  /**
   * Get team insights for a context
   */
  async getTeamInsights(
    tenantId: string,
    context: string,
    teamId?: string
  ): Promise<CollectiveInsight[]> {
    // Check cache
    const cacheKey = teamId
      ? `collective_insights:${tenantId}:${teamId}:${context}`
      : `collective_insights:${tenantId}:${context}`;

    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    let querySpec: any = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND CONTAINS(c.content.context, @context, true)',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@context', value: context },
      ],
    };

    if (teamId) {
      querySpec.query += ' AND c.teamId = @teamId';
      querySpec.parameters.push({ name: '@teamId', value: teamId });
    }

    querySpec.query += ' ORDER BY c.aggregation.validationScore DESC, c.createdAt DESC';

    const { resources } = await this.insightsContainer.items.query(querySpec).fetchAll();
    const insights = resources as CollectiveInsight[];

    // Cache for 15 minutes
    if (this.redis) {
      await this.redis.setex(cacheKey, 15 * 60, JSON.stringify(insights));
    }

    return insights;
  }

  /**
   * Share insight across team
   */
  async shareInsight(
    tenantId: string,
    userId: string,
    insight: {
      title: string;
      description: string;
      context: string;
      evidence: Array<{ example: string; outcome: number }>;
    },
    teamId?: string
  ): Promise<CollectiveInsight> {
    // Check if similar insight exists
    const existing = await this.findSimilarInsight(tenantId, insight, teamId);

    if (existing) {
      // Update existing insight
      existing.content.evidence.push({
        userId,
        example: insight.evidence[0]?.example || '',
        outcome: insight.evidence[0]?.outcome || 0.5,
      });
      existing.aggregation.contributorCount += 1;
      existing.updatedAt = new Date();
      await this.insightsContainer.item(existing.insightId, tenantId).replace(existing);
      return existing;
    }

    // Create new insight
    const insightData: Omit<CollectiveInsight, 'insightId' | 'createdAt' | 'updatedAt'> = {
      tenantId,
      teamId,
      insightType: 'best_practice',
      content: {
        title: insight.title,
        description: insight.description,
        context: insight.context,
        evidence: insight.evidence.map(e => ({
          userId,
          example: e.example,
          outcome: e.outcome,
        })),
      },
      aggregation: {
        contributorCount: 1,
        consensusScore: 0.5, // Will increase as more contribute
        validationScore: 0.3, // Initial validation
      },
    };
    return await this.aggregateCollectiveInsight(tenantId, teamId, insightData);
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Get user performance
   */
  private async getUserPerformance(
    tenantId: string,
    userId: string,
    domain: string
  ): Promise<ExpertProfile['metrics']> {
    // Placeholder - would query from feedback/outcome services
    // For now, return sample data
    return {
      accuracy: 0.85,
      consistency: 0.80,
      contribution: 0.75,
      recognition: 0.70,
    };
  }

  /**
   * Generate expert evidence
   */
  private generateExpertEvidence(
    performance: ExpertProfile['metrics']
  ): ExpertProfile['expertise'][0]['evidence'] {
    const evidence: ExpertProfile['expertise'][0]['evidence'] = [];

    if (performance.accuracy > 0.8) {
      evidence.push({
        type: 'high_accuracy',
        description: `High accuracy: ${(performance.accuracy * 100).toFixed(1)}%`,
      });
    }

    if (performance.consistency > 0.75) {
      evidence.push({
        type: 'consistency',
        description: `Consistent performance: ${(performance.consistency * 100).toFixed(1)}%`,
      });
    }

    if (performance.contribution > 0.7) {
      evidence.push({
        type: 'innovation',
        description: `High contribution to team learning`,
      });
    }

    return evidence;
  }

  /**
   * Find similar insight
   */
  private async findSimilarInsight(
    tenantId: string,
    insight: { title: string; description: string; context: string },
    teamId?: string
  ): Promise<CollectiveInsight | null> {
    let querySpec: any = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.content.context = @context',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@context', value: insight.context },
      ],
    };

    if (teamId) {
      querySpec.query += ' AND c.teamId = @teamId';
      querySpec.parameters.push({ name: '@teamId', value: teamId });
    }

    const { resources } = await this.insightsContainer.items.query(querySpec).fetchAll();
    const insights = resources as CollectiveInsight[];

    // Find similar by title/description
    const similar = insights.find(i => {
      const titleSimilarity = this.calculateSimilarity(i.content.title, insight.title);
      const descSimilarity = this.calculateSimilarity(i.content.description, insight.description);
      return titleSimilarity > 0.7 || descSimilarity > 0.7;
    });

    return similar || null;
  }

  /**
   * Calculate string similarity (simple Jaccard)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}

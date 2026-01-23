/**
 * Relationship Evolution Service
 * Tracks relationship evolution and health over time
 * 
 * Features:
 * - Relationship strength tracking
 * - Relationship lifecycle stages
 * - Relationship health scoring
 * - Relationship pattern detection
 * - Relationship prediction
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { ShardRelationshipService } from './shard-relationship.service.js';
import { CommunicationAnalysisService } from './communication-analysis.service.js';
import { CalendarIntelligenceService } from './calendar-intelligence.service.js';

export type RelationshipStage = 'initial' | 'developing' | 'established' | 'strong' | 'declining' | 'at_risk';

export interface RelationshipEvolution {
  evolutionId: string;
  tenantId: string; // Partition key
  sourceShardId: string;
  targetShardId: string;
  relationshipType: string;
  currentStage: RelationshipStage;
  strength: number; // 0-1: Relationship strength
  health: {
    score: number; // 0-100
    factors: Array<{
      factor: string;
      score: number;
      impact: 'positive' | 'negative' | 'neutral';
    }>;
  };
  lifecycle: {
    stage: RelationshipStage;
    enteredAt: Date;
    duration: number; // days in current stage
    transitions: Array<{
      from: RelationshipStage;
      to: RelationshipStage;
      timestamp: Date;
      reason: string;
    }>;
  };
  metrics: {
    interactionFrequency: number; // Interactions per month
    lastInteraction: Date;
    averageResponseTime: number; // hours
    engagementScore: number; // 0-1
    sentimentTrend: 'improving' | 'stable' | 'declining';
  };
  patterns: {
    detected: string[];
    anomalies: string[];
    predictions: Array<{
      prediction: string;
      confidence: number; // 0-1
      timeframe: string; // e.g., "30 days"
    }>;
  };
  recommendations: Array<{
    type: 'strengthen' | 'maintain' | 'repair' | 'monitor';
    priority: 'low' | 'medium' | 'high';
    description: string;
    expectedImpact: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Relationship Evolution Service
 */
export class RelationshipEvolutionService {
  private client: CosmosClient;
  private database: Database;
  private evolutionContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private shardRelationshipService?: ShardRelationshipService;
  private communicationAnalysisService?: CommunicationAnalysisService;
  private calendarIntelligenceService?: CalendarIntelligenceService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    shardRelationshipService?: ShardRelationshipService,
    communicationAnalysisService?: CommunicationAnalysisService,
    calendarIntelligenceService?: CalendarIntelligenceService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.shardRelationshipService = shardRelationshipService;
    this.communicationAnalysisService = communicationAnalysisService;
    this.calendarIntelligenceService = calendarIntelligenceService;

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
    this.evolutionContainer = this.database.container(config.cosmosDb.containers.relationshipEvolution);
  }

  /**
   * Track relationship evolution
   */
  async trackEvolution(
    tenantId: string,
    sourceShardId: string,
    targetShardId: string,
    relationshipType: string
  ): Promise<RelationshipEvolution> {
    // Check if evolution already exists
    const existing = await this.getEvolution(tenantId, sourceShardId, targetShardId, relationshipType);
    if (existing) {
      return await this.updateEvolution(existing);
    }

    // Create new evolution
    const evolutionId = uuidv4();
    const now = new Date();

    // Calculate initial metrics
    const metrics = await this.calculateMetrics(tenantId, sourceShardId, targetShardId);

    // Determine initial stage
    const stage = this.determineStage(metrics);

    // Calculate strength
    const strength = this.calculateStrength(metrics);

    // Calculate health
    const health = this.calculateHealth(metrics, strength);

    // Detect patterns
    const patterns = await this.detectPatterns(tenantId, sourceShardId, targetShardId, metrics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(stage, health, patterns);

    const evolution: RelationshipEvolution = {
      evolutionId,
      tenantId,
      sourceShardId,
      targetShardId,
      relationshipType,
      currentStage: stage,
      strength,
      health,
      lifecycle: {
        stage,
        enteredAt: now,
        duration: 0,
        transitions: [],
      },
      metrics,
      patterns,
      recommendations,
      createdAt: now,
      updatedAt: now,
    };

    await this.evolutionContainer.items.create(evolution);

    this.monitoring?.trackEvent('relationship_evolution.tracked', {
      tenantId,
      sourceShardId,
      targetShardId,
      relationshipType,
      stage,
      strength,
    });

    return evolution;
  }

  /**
   * Update existing evolution
   */
  private async updateEvolution(
    evolution: RelationshipEvolution
  ): Promise<RelationshipEvolution> {
    // Recalculate metrics
    const metrics = await this.calculateMetrics(
      evolution.tenantId,
      evolution.sourceShardId,
      evolution.targetShardId
    );

    // Determine new stage
    const newStage = this.determineStage(metrics);

    // Check for stage transition
    if (newStage !== evolution.currentStage) {
      evolution.lifecycle.transitions.push({
        from: evolution.currentStage,
        to: newStage,
        timestamp: new Date(),
        reason: this.getTransitionReason(evolution.currentStage, newStage, metrics),
      });
      evolution.lifecycle.stage = newStage;
      evolution.lifecycle.enteredAt = new Date();
      evolution.currentStage = newStage;
    }

    // Update duration
    evolution.lifecycle.duration = Math.floor(
      (Date.now() - evolution.lifecycle.enteredAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Recalculate strength and health
    evolution.strength = this.calculateStrength(metrics);
    evolution.health = this.calculateHealth(metrics, evolution.strength);
    evolution.metrics = metrics;

    // Update patterns
    evolution.patterns = await this.detectPatterns(
      evolution.tenantId,
      evolution.sourceShardId,
      evolution.targetShardId,
      metrics
    );

    // Update recommendations
    evolution.recommendations = this.generateRecommendations(
      evolution.currentStage,
      evolution.health,
      evolution.patterns
    );

    evolution.updatedAt = new Date();

    await this.evolutionContainer.item(evolution.evolutionId, evolution.tenantId).replace(evolution);

    this.monitoring?.trackEvent('relationship_evolution.updated', {
      tenantId: evolution.tenantId,
      evolutionId: evolution.evolutionId,
      stage: evolution.currentStage,
      strength: evolution.strength,
    });

    return evolution;
  }

  /**
   * Get evolution for relationship
   */
  async getEvolution(
    tenantId: string,
    sourceShardId: string,
    targetShardId: string,
    relationshipType: string
  ): Promise<RelationshipEvolution | null> {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.sourceShardId = @sourceShardId AND c.targetShardId = @targetShardId AND c.relationshipType = @relationshipType',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@sourceShardId', value: sourceShardId },
        { name: '@targetShardId', value: targetShardId },
        { name: '@relationshipType', value: relationshipType },
      ],
    };

    try {
      const { resources } = await this.evolutionContainer.items.query(querySpec).fetchAll();
      return (resources[0] as RelationshipEvolution) || null;
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'getEvolution',
        tenantId,
        sourceShardId,
        targetShardId,
      });
      return null;
    }
  }

  // ============================================
  // Calculation Methods
  // ============================================

  /**
   * Calculate relationship metrics
   */
  private async calculateMetrics(
    tenantId: string,
    sourceShardId: string,
    targetShardId: string
  ): Promise<RelationshipEvolution['metrics']> {
    // Placeholder - would integrate with communication and calendar services
    // For now, return sample metrics
    return {
      interactionFrequency: 4.5, // Interactions per month
      lastInteraction: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      averageResponseTime: 24, // hours
      engagementScore: 0.75,
      sentimentTrend: 'stable',
    };
  }

  /**
   * Determine relationship stage
   */
  private determineStage(
    metrics: RelationshipEvolution['metrics']
  ): RelationshipStage {
    const daysSinceLastInteraction = Math.floor(
      (Date.now() - metrics.lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
    );

    // High engagement + recent interaction = strong
    if (metrics.engagementScore > 0.8 && daysSinceLastInteraction < 14) {
      return 'strong';
    }

    // Low engagement + old interaction = declining
    if (metrics.engagementScore < 0.5 && daysSinceLastInteraction > 30) {
      return 'declining';
    }

    // Medium engagement = established
    if (metrics.engagementScore > 0.6) {
      return 'established';
    }

    // Low engagement = at_risk
    if (metrics.engagementScore < 0.4) {
      return 'at_risk';
    }

    // Default based on frequency
    if (metrics.interactionFrequency > 2) {
      return 'developing';
    }

    return 'initial';
  }

  /**
   * Calculate relationship strength
   */
  private calculateStrength(
    metrics: RelationshipEvolution['metrics']
  ): number {
    // Strength = weighted combination of metrics
    const frequencyScore = Math.min(1.0, metrics.interactionFrequency / 10);
    const engagementScore = metrics.engagementScore;
    const recencyScore = Math.max(0, 1 - (Date.now() - metrics.lastInteraction.getTime()) / (1000 * 60 * 60 * 24 * 30));

    return (frequencyScore * 0.3 + engagementScore * 0.5 + recencyScore * 0.2);
  }

  /**
   * Calculate relationship health
   */
  private calculateHealth(
    metrics: RelationshipEvolution['metrics'],
    strength: number
  ): RelationshipEvolution['health'] {
    const factors: RelationshipEvolution['health']['factors'] = [];

    // Frequency factor
    const frequencyScore = Math.min(100, (metrics.interactionFrequency / 5) * 100);
    factors.push({
      factor: 'Interaction Frequency',
      score: frequencyScore,
      impact: frequencyScore > 60 ? 'positive' : frequencyScore < 40 ? 'negative' : 'neutral',
    });

    // Engagement factor
    const engagementScore = metrics.engagementScore * 100;
    factors.push({
      factor: 'Engagement',
      score: engagementScore,
      impact: engagementScore > 70 ? 'positive' : engagementScore < 50 ? 'negative' : 'neutral',
    });

    // Recency factor
    const daysSinceLastInteraction = Math.floor(
      (Date.now() - metrics.lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
    );
    const recencyScore = Math.max(0, 100 - (daysSinceLastInteraction / 30) * 100);
    factors.push({
      factor: 'Recency',
      score: recencyScore,
      impact: recencyScore > 70 ? 'positive' : recencyScore < 30 ? 'negative' : 'neutral',
    });

    // Overall health score
    const overallScore = Math.round(
      (frequencyScore * 0.3 + engagementScore * 0.4 + recencyScore * 0.3)
    );

    return {
      score: overallScore,
      factors,
    };
  }

  /**
   * Detect patterns
   */
  private async detectPatterns(
    tenantId: string,
    sourceShardId: string,
    targetShardId: string,
    metrics: RelationshipEvolution['metrics']
  ): Promise<RelationshipEvolution['patterns']> {
    const detected: string[] = [];
    const anomalies: string[] = [];
    const predictions: RelationshipEvolution['patterns']['predictions'] = [];

    // Detect declining engagement
    if (metrics.sentimentTrend === 'declining') {
      detected.push('Declining engagement trend');
      anomalies.push('Sentiment trend is declining');
      predictions.push({
        prediction: 'Relationship may move to at_risk stage',
        confidence: 0.7,
        timeframe: '30 days',
      });
    }

    // Detect low frequency
    if (metrics.interactionFrequency < 1) {
      detected.push('Low interaction frequency');
      anomalies.push('Interaction frequency below optimal');
    }

    // Detect high response time
    if (metrics.averageResponseTime > 48) {
      detected.push('High response time');
      anomalies.push('Average response time is high');
    }

    return {
      detected,
      anomalies,
      predictions,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    stage: RelationshipStage,
    health: RelationshipEvolution['health'],
    patterns: RelationshipEvolution['patterns']
  ): RelationshipEvolution['recommendations'] {
    const recommendations: RelationshipEvolution['recommendations'] = [];

    if (stage === 'at_risk' || stage === 'declining') {
      recommendations.push({
        type: 'repair',
        priority: 'high',
        description: 'Relationship is at risk - immediate action needed',
        expectedImpact: 'Could prevent relationship deterioration',
      });
    } else if (stage === 'strong') {
      recommendations.push({
        type: 'maintain',
        priority: 'low',
        description: 'Relationship is strong - maintain current engagement level',
        expectedImpact: 'Maintains relationship strength',
      });
    } else {
      recommendations.push({
        type: 'strengthen',
        priority: 'medium',
        description: 'Increase engagement to strengthen relationship',
        expectedImpact: 'Could improve relationship strength by 10-15%',
      });
    }

    if (patterns.anomalies.length > 0) {
      recommendations.push({
        type: 'monitor',
        priority: 'medium',
        description: `Monitor anomalies: ${patterns.anomalies.join(', ')}`,
        expectedImpact: 'Early detection of issues',
      });
    }

    return recommendations;
  }

  /**
   * Get transition reason
   */
  private getTransitionReason(
    from: RelationshipStage,
    to: RelationshipStage,
    metrics: RelationshipEvolution['metrics']
  ): string {
    if (to === 'strong') {
      return 'High engagement and frequent interactions';
    } else if (to === 'declining') {
      return 'Decreasing engagement and infrequent interactions';
    } else if (to === 'at_risk') {
      return 'Low engagement and no recent interactions';
    } else if (to === 'established') {
      return 'Stable engagement and regular interactions';
    }
    return 'Natural progression';
  }
}

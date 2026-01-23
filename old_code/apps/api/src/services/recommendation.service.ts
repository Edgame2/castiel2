// @ts-nocheck
/**
 * Recommendations Service
 * Multi-factor recommendation engine with vector search, collaborative filtering, and temporal scoring
 */

import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import {
  Recommendation,
  RecommendationRequest,
  RecommendationBatch,
  RecommendationExplanation,
  RecommendationType,
  RecommendationSource,
  RecommendationStatus,
  RecommendationFeedback,
  RecommendationStatistics,
  LinkRecommendation,
  RecommendationAlgorithmConfig,
  VectorSearchInput,
  RecommendationMetrics,
  UpdateRecommendationWeights,
  CreateRecommendationInput,
  RecommendationQueryParams,
  RecommendationPage,
} from '../types/recommendation.types';
import { CosmosDBService } from './cosmos-db.service';
import { CacheService } from './cache.service';
import { VectorSearchService } from './vector-search.service.js';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { ProjectActivityService } from './project-activity.service';
import { PlaybookExecutionService } from './playbook-execution.service.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly RECOMMENDATIONS_CACHE_TTL = 1800; // 30 minutes
  private readonly STATS_CACHE_TTL = 3600; // 1 hour

  // Default algorithm configuration
  private algorithmConfig: RecommendationAlgorithmConfig = {
    vectorSearchWeight: 0.4, // Updated default (was 0.5)
    collaborativeWeight: 0.3,
    temporalWeight: 0.2,
    contentWeight: 0.1, // Added content weight
    vectorSimilarityThreshold: 0.6,
    minCollaborativeDataPoints: 5,
    temporalDecayDays: 30,
    contentSimilarityThreshold: 0.5,
    batchGenerationFrequency: 6,
    maxRecommendationsPerUser: 20,
    recommendationTTLDays: 7,
    enableFeedbackLearning: true,
    feedbackWeightFactor: 0.1,
  };

  // Default weights for fallback
  private readonly DEFAULT_WEIGHTS = {
    vectorSearch: 0.4,
    collaborative: 0.3,
    temporal: 0.2,
    content: 0.1,
  };

  constructor(
    @Inject(CosmosDBService) private cosmosDB: CosmosDBService,
    @Inject(CacheService) private cache: CacheService,
    @Inject(VectorSearchService) private vectorSearch: VectorSearchService,
    @Inject(PerformanceMonitoringService) private performanceMonitoring: PerformanceMonitoringService,
    @Inject(ProjectActivityService) private activityService: ProjectActivityService,
    // Optional: Adaptive weight learning service
    private adaptiveWeightService?: any, // AdaptiveWeightLearningService - optional for gradual rollout
    private outcomeCollector?: any, // OutcomeCollectorService - optional
    private performanceTracker?: any, // PerformanceTrackerService - optional
    private playbookExecutionService?: PlaybookExecutionService, // PlaybookExecutionService - optional
    // Optional: ML services for enhanced ranking
    private featureStoreService?: any, // FeatureStoreService - optional for ML ranking
    private modelService?: any, // ModelService - optional for ML ranking
  ) {}

  /**
   * Get recommendations for a user in a project (multi-factor)
   */
  async getRecommendations(
    tenantId: string,
    request: RecommendationRequest,
  ): Promise<RecommendationBatch> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      // Check cache first
      const cacheKey = `recommendations:${request.projectId}:${request.userId}`;
      const cached = await this.cache.get<RecommendationBatch>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for recommendations: ${requestId}`);
        return cached;
      }

      const recommendations: Recommendation[] = [];
      const metrics: Partial<RecommendationMetrics> = {
        requestId,
        userId: request.userId,
        projectId: request.projectId,
        vectorSearchResults: 0,
        collaborativeMatches: 0,
        temporalBoosts: 0,
        finalRecommendations: 0,
      };

      // 1. Vector search-based recommendations (50%)
      const vectorStartTime = Date.now();
      const vectorRecs = await this.getVectorSearchRecommendations(
        tenantId,
        request.projectId,
        request.userId,
        request.limit || 10,
      );
      metrics.vectorSearchResults = vectorRecs.length;
      metrics.vectorSearchTimeMs = Date.now() - vectorStartTime;
      recommendations.push(...vectorRecs);

      // 2. Collaborative filtering recommendations (30%)
      const collabStartTime = Date.now();
      const collabRecs = await this.getCollaborativeRecommendations(
        tenantId,
        request.projectId,
        request.userId,
        request.limit || 10,
      );
      metrics.collaborativeMatches = collabRecs.length;
      metrics.collaborativeFilteringTimeMs = Date.now() - collabStartTime;
      recommendations.push(...collabRecs);

      // 3. Temporal/recency recommendations (20%)
      const temporalStartTime = Date.now();
      const temporalRecs = await this.getTemporalRecommendations(
        tenantId,
        request.projectId,
        request.userId,
        request.limit || 10,
      );
      metrics.temporalBoosts = temporalRecs.length;
      metrics.temporalScoringTimeMs = Date.now() - temporalStartTime;
      recommendations.push(...temporalRecs);

      // 4. Get adaptive weights (if available)
      const weights = await this.getWeightsForContext(tenantId, {
        projectId: request.projectId,
        userId: request.userId,
        itemType: request.type,
        userRole: request.userRole,
      });

      // 5. Merge, deduplicate, and score with learned weights
      const mergedRecs = this.mergeAndScoreRecommendations(recommendations, weights);

      // 5a. Apply ML ranking if ML services are available
      let rankedRecs = mergedRecs;
      if (this.featureStoreService && this.modelService) {
        try {
          rankedRecs = await this.applyMLRanking(
            tenantId,
            request.projectId,
            request.userId,
            mergedRecs,
            weights
          );
          metrics.mlRankingApplied = true;
        } catch (error) {
          this.logger.warn(`ML ranking failed, using merged scores: ${error.message}`);
          metrics.mlRankingApplied = false;
          // Continue with merged scores
        }
      } else {
        metrics.mlRankingApplied = false;
      }

      // 5. Filter by confidence
      const minConfidence = request.minConfidence ?? 0.5;
      const filteredRecs = rankedRecs.filter((r) => r.confidenceScore >= minConfidence);

      // 6. Apply limit
      const finalRecs = filteredRecs.slice(0, request.limit || 10);

      // 7. Generate explanations
      const explanationStartTime = Date.now();
      for (const rec of finalRecs) {
        try {
          rec.explanation = await this.generateExplanation(tenantId, rec);
        } catch (error) {
          this.logger.warn(`Failed to generate explanation for recommendation ${rec.id}: ${error.message}`);
          rec.explanation = `Recommended based on ${rec.sources.join(', ')} analysis`;
        }
      }
      metrics.explanationGenerationTimeMs = Date.now() - explanationStartTime;

      // 8. Track prediction for adaptive learning (non-blocking)
      this.trackPredictionForLearning(tenantId, request, finalRecs, weights).catch((error) => {
        this.logger.warn(`Failed to track prediction for learning: ${error.message}`);
      });

      // 8. Save recommendations to database
      for (const rec of finalRecs) {
        try {
          await this.cosmosDB.upsertDocument('recommendations', rec, tenantId);
        } catch (error) {
          this.logger.warn(`Failed to save recommendation: ${error.message}`);
        }
      }

      metrics.finalRecommendations = finalRecs.length;

      // Calculate average confidence
      const avgConfidence = finalRecs.length > 0 ? finalRecs.reduce((sum, r) => sum + r.confidenceScore, 0) / finalRecs.length : 0;
      metrics.avgConfidenceScore = avgConfidence;

      // Calculate diversity score
      const types = new Set(finalRecs.map((r) => r.type)).size;
      metrics.diversityScore = types / Object.keys(RecommendationType).length;

      // Record metrics
      await this.recordRecommendationMetrics(tenantId, {
        ...metrics,
        totalTimeMs: Date.now() - startTime,
        timestamp: new Date(),
      } as RecommendationMetrics);

      // Build response
      const batch: RecommendationBatch = {
        requestId,
        recommendations: finalRecs,
        totalCount: finalRecs.length,
        generatedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };

      // Cache result
      await this.cache.set(cacheKey, batch, this.RECOMMENDATIONS_CACHE_TTL);

      this.logger.log(
        `Generated ${finalRecs.length} recommendations for user ${request.userId} in ${batch.executionTimeMs}ms`,
      );

      return batch;
    } catch (error) {
      this.logger.error(`Failed to get recommendations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get vector search-based recommendations (semantic similarity)
   * Weight: 50%
   */
  private async getVectorSearchRecommendations(
    tenantId: string,
    projectId: string,
    userId: string,
    limit: number,
  ): Promise<Recommendation[]> {
    try {
      // Get user's recent activities/interests
      const recentActivityQuery = `
        SELECT TOP 5 pa.details FROM project_activities pa
        WHERE pa.tenantId = @tenantId AND pa.projectId = @projectId
        AND pa.actorUserId = @userId
        ORDER BY pa.timestamp DESC
      `;

      const recentActivities = await this.cosmosDB.queryDocuments<any>(
        'project-activities',
        recentActivityQuery,
        [
          { name: '@tenantId', value: tenantId },
          { name: '@projectId', value: projectId },
          { name: '@userId', value: userId },
        ],
        tenantId,
      );

      if (recentActivities.length === 0) {
        return [];
      }

      // Build query from user interests
      const userInterests = recentActivities.map((a) => a.details?.description || '').filter((d) => d);
      const query = userInterests.slice(0, 3).join(' ');

      if (!query) {
        return [];
      }

      // Perform vector search
      const vectorResults = await this.vectorSearch.search({
        query,
        topK: limit * 2,
        minScore: this.algorithmConfig.vectorSimilarityThreshold,
        filters: {
          projectId,
          excludeIds: [],
        },
      });

      // Convert to recommendations
      const recs: Recommendation[] = vectorResults.slice(0, limit).map((result) => ({
        id: uuidv4(),
        tenantId,
        projectId,
        userId,
        type: RecommendationType.SHARD_LINK,
        targetId: result.id,
        targetName: result.name,
        targetType: 'shard',
        confidenceScore: result.score,
        reasonCodes: ['SEMANTIC_SIMILARITY'],
        explanation: `Similar to your recent work (${(result.score * 100).toFixed(0)}% match)`,
        sources: [RecommendationSource.VECTOR_SEARCH],
        vectorScore: result.score,
        status: RecommendationStatus.PENDING,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.algorithmConfig.recommendationTTLDays * 24 * 60 * 60 * 1000),
        ttl: this.algorithmConfig.recommendationTTLDays * 24 * 60 * 60,
      }));

      return recs;
    } catch (error) {
      this.logger.warn(`Failed to get vector search recommendations: ${error.message}`);
      return [];
    }
  }

  /**
   * Get collaborative filtering recommendations
   * Weight: 30%
   */
  private async getCollaborativeRecommendations(
    tenantId: string,
    projectId: string,
    userId: string,
    limit: number,
  ): Promise<Recommendation[]> {
    try {
      // Find similar users (based on shared projects/collaborations)
      const similarUsersQuery = `
        SELECT DISTINCT pc.collaboratorUserId, COUNT(1) as sharedCount
        FROM project_collaborators pc
        JOIN project_collaborators pc2
        ON pc.projectId = pc2.projectId
        AND pc.tenantId = pc2.tenantId
        AND pc2.collaboratorUserId = @userId
        WHERE pc.tenantId = @tenantId AND pc.collaboratorUserId != @userId
        GROUP BY pc.collaboratorUserId
        ORDER BY sharedCount DESC
      `;

      const similarUsers = await this.cosmosDB.queryDocuments<any>(
        'project-collaborators',
        similarUsersQuery,
        [
          { name: '@tenantId', value: tenantId },
          { name: '@userId', value: userId },
        ],
        tenantId,
      );

      if (similarUsers.length < this.algorithmConfig.minCollaborativeDataPoints) {
        return [];
      }

      // Get items liked by similar users
      const similarUserIds = similarUsers.slice(0, 5).map((u) => u.collaboratorUserId);

      const itemsQuery = `
        SELECT DISTINCT sl.toShardId, COUNT(1) as popularity
        FROM project_shard_links sl
        WHERE sl.tenantId = @tenantId AND sl.projectId = @projectId
        AND sl.createdBy IN (${similarUserIds.map((_, i) => `@user${i}`).join(',')})
        GROUP BY sl.toShardId
        ORDER BY popularity DESC
      `;

      const params: any[] = [
        { name: '@tenantId', value: tenantId },
        { name: '@projectId', value: projectId },
      ];

      similarUserIds.forEach((userId, i) => {
        params.push({ name: `@user${i}`, value: userId });
      });

      const popularItems = await this.cosmosDB.queryDocuments<any>('project-shard-links', itemsQuery, params, tenantId);

      // Convert to recommendations
      const recs: Recommendation[] = popularItems.slice(0, limit).map((item, index) => ({
        id: uuidv4(),
        tenantId,
        projectId,
        userId,
        type: RecommendationType.SHARD_INCLUSION,
        targetId: item.toShardId,
        targetName: `Shard ${item.toShardId.substring(0, 8)}`,
        targetType: 'shard',
        confidenceScore: Math.min(1, item.popularity / similarUsers.length),
        reasonCodes: ['COLLABORATIVE_FILTERING'],
        explanation: `Users like you found this helpful (${item.popularity} similar user${item.popularity > 1 ? 's' : ''})`,
        sources: [RecommendationSource.COLLABORATIVE_FILTERING],
        collaborativeScore: Math.min(1, item.popularity / similarUsers.length),
        status: RecommendationStatus.PENDING,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.algorithmConfig.recommendationTTLDays * 24 * 60 * 60 * 1000),
        ttl: this.algorithmConfig.recommendationTTLDays * 24 * 60 * 60,
      }));

      return recs;
    } catch (error) {
      this.logger.warn(`Failed to get collaborative recommendations: ${error.message}`);
      return [];
    }
  }

  /**
   * Get temporal/recency-based recommendations
   * Weight: 20%
   */
  private async getTemporalRecommendations(
    tenantId: string,
    projectId: string,
    userId: string,
    limit: number,
  ): Promise<Recommendation[]> {
    try {
      const decayDays = this.algorithmConfig.temporalDecayDays;
      const decayTime = Date.now() - decayDays * 24 * 60 * 60 * 1000;

      // Get trending items in the project
      const trendingQuery = `
        SELECT sl.toShardId, COUNT(1) as recentCount, MAX(sl.createdAt) as lastLinked
        FROM project_shard_links sl
        WHERE sl.tenantId = @tenantId AND sl.projectId = @projectId
        AND sl.createdAt > DateTimeAdd('s', @decayTime, DateTimeNow())
        GROUP BY sl.toShardId
        ORDER BY recentCount DESC, lastLinked DESC
      `;

      const params: any[] = [
        { name: '@tenantId', value: tenantId },
        { name: '@projectId', value: projectId },
        { name: '@decayTime', value: Math.floor(decayTime / 1000) },
      ];

      const trendingItems = await this.cosmosDB.queryDocuments<any>(
        'project-shard-links',
        trendingQuery,
        params,
        tenantId,
      );

      // Calculate temporal score with decay
      const recs: Recommendation[] = trendingItems.slice(0, limit).map((item) => {
        const daysSinceLinked = (Date.now() - new Date(item.lastLinked).getTime()) / (24 * 60 * 60 * 1000);
        const decayFactor = Math.exp(-daysSinceLinked / decayDays);
        const recencyScore = Math.max(0.5, decayFactor); // Min 0.5, max 1.0

        return {
          id: uuidv4(),
          tenantId,
          projectId,
          userId,
          type: RecommendationType.SHARD_INCLUSION,
          targetId: item.toShardId,
          targetName: `Trending Shard ${item.toShardId.substring(0, 8)}`,
          targetType: 'shard',
          confidenceScore: Math.min(1, recencyScore * (item.recentCount / 10)),
          reasonCodes: ['RECENT_ACTIVITY'],
          explanation: `Trending in your project (${item.recentCount} recent links)`,
          sources: [RecommendationSource.TEMPORAL],
          temporalScore: recencyScore,
          status: RecommendationStatus.PENDING,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + this.algorithmConfig.recommendationTTLDays * 24 * 60 * 60 * 1000),
          ttl: this.algorithmConfig.recommendationTTLDays * 24 * 60 * 60,
        };
      });

      return recs;
    } catch (error) {
      this.logger.warn(`Failed to get temporal recommendations: ${error.message}`);
      return [];
    }
  }

  /**
   * Merge recommendations from multiple sources and calculate composite score
   */
  /**
   * Get weights for context (adaptive or default)
   */
  private async getWeightsForContext(
    tenantId: string,
    context: { projectId?: string; userId?: string; itemType?: string; userRole?: string }
  ): Promise<{ vectorSearch: number; collaborative: number; temporal: number; content: number }> {
    // If adaptive weight service not available, use defaults
    if (!this.adaptiveWeightService) {
      return this.DEFAULT_WEIGHTS;
    }

    try {
      // Generate context key
      const contextKey = this.generateContextKey(context);

      // Get learned weights
      const learned = await this.adaptiveWeightService.getWeights(
        tenantId,
        contextKey,
        'recommendations'
      );

      return {
        vectorSearch: learned.vectorSearch || this.DEFAULT_WEIGHTS.vectorSearch,
        collaborative: learned.collaborative || this.DEFAULT_WEIGHTS.collaborative,
        temporal: learned.temporal || this.DEFAULT_WEIGHTS.temporal,
        content: learned.content || this.DEFAULT_WEIGHTS.content,
      };
    } catch (error) {
      this.logger.warn(`Failed to get learned weights, using defaults: ${error.message}`);
      return this.DEFAULT_WEIGHTS;
    }
  }

  /**
   * Generate context key for recommendations
   */
  private generateContextKey(context: { projectId?: string; userId?: string; itemType?: string; userRole?: string }): string {
    const parts: string[] = [];
    if (context.itemType) parts.push(context.itemType);
    if (context.userRole) parts.push(context.userRole);
    return parts.join(':') || 'all';
  }

  /**
   * Track prediction for adaptive learning
   */
  private async trackPredictionForLearning(
    tenantId: string,
    request: RecommendationRequest,
    recommendations: Recommendation[],
    weights: { vectorSearch: number; collaborative: number; temporal: number; content: number }
  ): Promise<void> {
    if (!this.outcomeCollector) {
      return; // Service not available
    }

    try {
      const context = {
        projectId: request.projectId,
        userId: request.userId,
        itemType: request.type,
        userRole: request.userRole,
      };

      // Record prediction for each recommendation source
      const componentScores: Record<string, number> = {
        vectorSearch: recommendations.find((r) => r.vectorScore)?.vectorScore || 0,
        collaborative: recommendations.find((r) => r.collaborativeScore)?.collaborativeScore || 0,
        temporal: recommendations.find((r) => r.temporalScore)?.temporalScore || 0,
        content: recommendations.find((r) => r.contentScore)?.contentScore || 0,
      };

      await this.outcomeCollector.recordPrediction(
        tenantId,
        'recommendations',
        context,
        recommendations,
        componentScores,
        weights
      );
    } catch (error) {
      // Non-blocking, don't throw
      this.logger.warn(`Failed to track prediction: ${error.message}`);
    }
  }

  /**
   * Record outcome when user acts on recommendation
   */
  async onRecommendationAction(
    tenantId: string,
    recommendationId: string,
    action: 'clicked' | 'dismissed' | 'converted'
  ): Promise<void> {
    if (!this.outcomeCollector) {
      return;
    }

    try {
      const outcome = {
        clicked: 0.7, // Partial positive signal
        dismissed: 0.0, // Negative signal
        converted: 1.0, // Strong positive signal
      }[action];

      // TODO: Get prediction ID from recommendation
      const predictionId = recommendationId; // Simplified

      await this.outcomeCollector.recordOutcome(
        predictionId,
        tenantId,
        outcome,
        action === 'converted' ? 'success' : action === 'clicked' ? 'partial' : 'failure'
      );

      // Trigger learning update if adaptive weight service available
      if (this.adaptiveWeightService) {
        // TODO: Get context and component from recommendation
        // For now, simplified
        const contextKey = 'all';
        await this.adaptiveWeightService.learnFromOutcome(
          tenantId,
          contextKey,
          'recommendations',
          'vectorSearch', // Simplified - would determine actual component
          outcome
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to record recommendation outcome: ${error.message}`);
    }
  }

  private mergeAndScoreRecommendations(
    recommendations: Recommendation[],
    weights: { vectorSearch: number; collaborative: number; temporal: number; content: number } = this.DEFAULT_WEIGHTS
  ): Recommendation[] {
    // Group by target
    const grouped = new Map<string, Recommendation[]>();

    for (const rec of recommendations) {
      const key = `${rec.type}:${rec.targetId}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(rec);
    }

    // Merge and calculate composite scores
    const merged: Recommendation[] = [];

    for (const [key, recs] of grouped.entries()) {
      if (recs.length === 1) {
        merged.push(recs[0]);
      } else {
        // Create composite recommendation
        const composite = recs[0];

        // Calculate weighted average score using learned weights
        let vectorScore = 0;
        let collabScore = 0;
        let temporalScore = 0;
        let contentScore = 0;

        for (const rec of recs) {
          if (rec.vectorScore) {vectorScore = rec.vectorScore;}
          if (rec.collaborativeScore) {collabScore = rec.collaborativeScore;}
          if (rec.temporalScore) {temporalScore = rec.temporalScore;}
          if (rec.contentScore) {contentScore = rec.contentScore;}
        }

        // Use learned weights instead of hardcoded algorithmConfig weights
        const compositeScore =
          vectorScore * weights.vectorSearch +
          collabScore * weights.collaborative +
          temporalScore * weights.temporal +
          contentScore * weights.content;

        composite.confidenceScore = Math.min(1, compositeScore);
        composite.sources = [...new Set(recs.flatMap((r) => r.sources))];
        composite.vectorScore = vectorScore;
        composite.collaborativeScore = collabScore;
        composite.temporalScore = temporalScore;
        composite.contentScore = contentScore;

        merged.push(composite);
      }
    }

    // Sort by confidence score
    return merged.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Generate human-readable explanation for a recommendation
   */
  private async generateExplanation(tenantId: string, rec: Recommendation): Promise<string> {
    try {
      const sources = rec.sources.map((s) => {
        if (s === RecommendationSource.VECTOR_SEARCH) {return 'semantic similarity';}
        if (s === RecommendationSource.COLLABORATIVE_FILTERING) {return 'user patterns';}
        if (s === RecommendationSource.TEMPORAL) {return 'recent activity';}
        return s.toLowerCase();
      });

      const scorePercent = Math.round(rec.confidenceScore * 100);

      return `Recommended based on ${sources.join(' and ')} (${scorePercent}% confidence).`;
    } catch (error) {
      this.logger.warn(`Failed to generate explanation: ${error.message}`);
      return `Recommended based on multiple factors (${Math.round(rec.confidenceScore * 100)}% confidence).`;
    }
  }

  /**
   * Get detailed explanation for a recommendation
   */
  async explainRecommendation(
    tenantId: string,
    projectId: string,
    recommendationId: string,
  ): Promise<RecommendationExplanation> {
    try {
      const rec = await this.cosmosDB.getDocument('recommendations', recommendationId, tenantId);
      if (!rec) {
        throw new BadRequestException(`Recommendation ${recommendationId} not found`);
      }

      const explanation: RecommendationExplanation = {
        recommendationId,
        summary: rec.explanation,
        detailedReasons: this.buildExplanationReasons(rec),
        totalScore: rec.confidenceScore,
        scoreBreakdown: {
          vectorScore: rec.vectorScore,
          collaborativeScore: rec.collaborativeScore,
          temporalScore: rec.temporalScore,
        },
        contextItems: rec.metadata?.relatedItems,
        supportingData: rec.metadata,
      };

      return explanation;
    } catch (error) {
      this.logger.error(`Failed to explain recommendation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build detailed explanation reasons
   */
  private buildExplanationReasons(rec: Recommendation): Array<{
    type: 'CONTENT' | 'BEHAVIOR' | 'RECENCY' | 'RELEVANCE' | 'SIMILARITY';
    weight: number;
    description: string;
    evidence?: string[];
  }> {
    const reasons = [];

    if (rec.vectorScore && rec.vectorScore > 0) {
      reasons.push({
        type: 'SIMILARITY' as const,
        weight: this.algorithmConfig.vectorSearchWeight,
        description: `Semantically similar to your recent work (${(rec.vectorScore * 100).toFixed(0)}% match)`,
        evidence: rec.metadata?.matchedTerms,
      });
    }

    if (rec.collaborativeScore && rec.collaborativeScore > 0) {
      reasons.push({
        type: 'BEHAVIOR' as const,
        weight: this.algorithmConfig.collaborativeWeight,
        description: `Other users with similar interests found this helpful`,
        evidence: [],
      });
    }

    if (rec.temporalScore && rec.temporalScore > 0) {
      reasons.push({
        type: 'RECENCY' as const,
        weight: this.algorithmConfig.temporalWeight,
        description: `Trending in your project recently`,
        evidence: [],
      });
    }

    return reasons;
  }

  /**
   * Provide feedback on a recommendation (for learning)
   */
  async provideFeedback(
    tenantId: string,
    projectId: string,
    recommendationId: string,
    feedback: 'positive' | 'negative' | 'irrelevant',
  ): Promise<void> {
    try {
      const rec = await this.cosmosDB.getDocument('recommendations', recommendationId, tenantId);
      if (!rec) {
        throw new BadRequestException(`Recommendation ${recommendationId} not found`);
      }

      rec.userFeedback = feedback;
      rec.feedbackProvidedAt = new Date();
      rec.status = RecommendationStatus.ACCEPTED;

      await this.cosmosDB.upsertDocument('recommendations', rec, tenantId);

      // Store feedback for learning (separate collection)
      const feedbackRecord: RecommendationFeedback = {
        recommendationId,
        userId: rec.userId,
        projectId,
        feedback,
        timestamp: new Date(),
      };

      await this.cosmosDB.upsertDocument('recommendation-feedback', feedbackRecord, tenantId);

      // Invalidate cache
      await this.cache.delete(`recommendations:${projectId}:${rec.userId}`);

      this.logger.log(`Feedback recorded: ${recommendationId} -> ${feedback}`);
    } catch (error) {
      this.logger.error(`Failed to provide feedback: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute playbook from recommendation
   */
  async executePlaybookFromRecommendation(
    tenantId: string,
    recommendationId: string,
    playbookId: string,
    context?: Record<string, any>
  ): Promise<{ executionId: string }> {
    if (!this.playbookExecutionService) {
      throw new Error('PlaybookExecutionService not available');
    }

    try {
      // Get recommendation to extract context
      const query = `
        SELECT * FROM recommendations r
        WHERE r.id = @recommendationId AND r.tenantId = @tenantId
      `;

      const recs = await this.cosmosDB.queryDocuments<Recommendation>(
        'recommendations',
        query,
        [
          { name: '@recommendationId', value: recommendationId },
          { name: '@tenantId', value: tenantId },
        ],
        tenantId,
      );

      if (recs.length === 0) {
        throw new BadRequestException(`Recommendation not found: ${recommendationId}`);
      }

      const recommendation = recs[0];

      // Execute playbook with recommendation context
      const execution = await this.playbookExecutionService.executePlaybook(
        tenantId,
        playbookId,
        {
          ...context,
          recommendationId: recommendation.id,
          targetId: recommendation.targetId,
          projectId: recommendation.projectId,
          userId: recommendation.userId,
        }
      );

      this.logger.log(
        `Executed playbook ${playbookId} from recommendation ${recommendationId}`
      );

      return { executionId: execution.executionId };
    } catch (error) {
      this.logger.error(`Failed to execute playbook from recommendation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recommendation statistics for a project
   */
  async getStatistics(tenantId: string, projectId: string): Promise<RecommendationStatistics> {
    try {
      const cacheKey = `rec-stats:${projectId}`;
      const cached = await this.cache.get<RecommendationStatistics>(cacheKey);
      if (cached) {return cached;}

      const query = `
        SELECT * FROM recommendations r
        WHERE r.tenantId = @tenantId AND r.projectId = @projectId
      `;

      const recs = await this.cosmosDB.queryDocuments<Recommendation>(
        'recommendations',
        query,
        [
          { name: '@tenantId', value: tenantId },
          { name: '@projectId', value: projectId },
        ],
        tenantId,
      );

      if (recs.length === 0) {
        const emptyStats: RecommendationStatistics = {
          totalGenerated: 0,
          acceptanceRate: 0,
          dismissalRate: 0,
          avgConfidenceScore: 0,
          byType: {} as any,
          bySource: {} as any,
          topRecommendedItems: [],
        };

        await this.cache.set(cacheKey, emptyStats, this.STATS_CACHE_TTL);
        return emptyStats;
      }

      const accepted = recs.filter((r) => r.status === RecommendationStatus.ACCEPTED).length;
      const dismissed = recs.filter((r) => r.status === RecommendationStatus.DISMISSED).length;

      // Group by type
      const byType: Record<string, number> = {};
      Object.values(RecommendationType).forEach((type) => {
        byType[type] = recs.filter((r) => r.type === type).length;
      });

      // Group by source
      const bySource: Record<string, number> = {};
      Object.values(RecommendationSource).forEach((source) => {
        bySource[source] = recs.filter((r) => r.sources.includes(source)).length;
      });

      // Get top recommended items
      const itemCounts = new Map<string, { accepted: number; dismissed: number; name: string }>();
      recs.forEach((r) => {
        const existing = itemCounts.get(r.targetId) || { accepted: 0, dismissed: 0, name: r.targetName };
        if (r.status === RecommendationStatus.ACCEPTED) {existing.accepted++;}
        if (r.status === RecommendationStatus.DISMISSED) {existing.dismissed++;}
        itemCounts.set(r.targetId, existing);
      });

      const topRecommendedItems = Array.from(itemCounts.entries())
        .map(([itemId, data]) => ({
          itemId,
          itemName: data.name,
          acceptanceCount: data.accepted,
          dismissalCount: data.dismissed,
        }))
        .sort((a, b) => b.acceptanceCount - a.acceptanceCount)
        .slice(0, 10);

      const stats: RecommendationStatistics = {
        totalGenerated: recs.length,
        acceptanceRate: recs.length > 0 ? accepted / recs.length : 0,
        dismissalRate: recs.length > 0 ? dismissed / recs.length : 0,
        avgConfidenceScore: recs.length > 0 ? recs.reduce((sum, r) => sum + r.confidenceScore, 0) / recs.length : 0,
        byType: byType as any,
        bySource: bySource as any,
        topRecommendedItems,
      };

      await this.cache.set(cacheKey, stats, this.STATS_CACHE_TTL);
      return stats;
    } catch (error) {
      this.logger.error(`Failed to get recommendation statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update recommendation algorithm weights
   */
  async updateAlgorithmWeights(weights: UpdateRecommendationWeights): Promise<void> {
    try {
      // Validate weights sum to 1.0
      const total =
        (weights.vectorSearchWeight ?? this.algorithmConfig.vectorSearchWeight) +
        (weights.collaborativeWeight ?? this.algorithmConfig.collaborativeWeight) +
        (weights.temporalWeight ?? this.algorithmConfig.temporalWeight);

      if (Math.abs(total - 1.0) > 0.01) {
        throw new BadRequestException('Weights must sum to 1.0');
      }

      if (weights.vectorSearchWeight) {this.algorithmConfig.vectorSearchWeight = weights.vectorSearchWeight;}
      if (weights.collaborativeWeight) {this.algorithmConfig.collaborativeWeight = weights.collaborativeWeight;}
      if (weights.temporalWeight) {this.algorithmConfig.temporalWeight = weights.temporalWeight;}

      // Clear recommendation cache to force regeneration
      await this.cache.delete('recommendations:*');

      this.logger.log('Algorithm weights updated');
    } catch (error) {
      this.logger.error(`Failed to update algorithm weights: ${error.message}`);
      throw error;
    }
  }

  /**
   * Record recommendation metrics for monitoring
   */
  private async recordRecommendationMetrics(tenantId: string, metrics: RecommendationMetrics): Promise<void> {
    try {
      await this.cosmosDB.upsertDocument('recommendation-metrics', metrics, tenantId);

      // Also track with performance monitoring service
      await this.performanceMonitoring.trackRecommendationMetric(tenantId, {
        responseTime: metrics.totalTimeMs,
        recommendationCount: metrics.finalRecommendations,
        avgConfidenceScore: metrics.avgConfidenceScore,
        diversityScore: metrics.diversityScore,
      });
    } catch (error) {
      this.logger.warn(`Failed to record recommendation metrics: ${error.message}`);
    }
  }

  /**
   * Query recommendations with filtering and pagination
   */
  async queryRecommendations(
    tenantId: string,
    params: RecommendationQueryParams,
  ): Promise<RecommendationPage> {
    try {
      let query = `
        SELECT * FROM recommendations r
        WHERE r.tenantId = @tenantId AND r.projectId = @projectId
      `;

      const parameters: any[] = [
        { name: '@tenantId', value: tenantId },
        { name: '@projectId', value: params.projectId },
      ];

      if (params.userId) {
        query += ` AND r.userId = @userId`;
        parameters.push({ name: '@userId', value: params.userId });
      }

      if (params.type) {
        query += ` AND r.type = @type`;
        parameters.push({ name: '@type', value: params.type });
      }

      if (params.status) {
        query += ` AND r.status = @status`;
        parameters.push({ name: '@status', value: params.status });
      }

      if (params.minConfidence) {
        query += ` AND r.confidenceScore >= @minConfidence`;
        parameters.push({ name: '@minConfidence', value: params.minConfidence });
      }

      const sortBy = params.sortBy || 'createdAt';
      const sortDir = params.sortDirection === 'asc' ? 'ASC' : 'DESC';
      const sortField = sortBy === 'confidence' ? 'r.confidenceScore' : sortBy === 'relevance' ? 'r.confidenceScore' : 'r.createdAt';

      query += ` ORDER BY ${sortField} ${sortDir}`;

      // Get total count
      const totalRecs = await this.cosmosDB.queryDocuments<Recommendation>(
        'recommendations',
        query + ` OFFSET 0 LIMIT 999999`,
        parameters,
        tenantId,
      );

      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 20;
      const offset = (page - 1) * limit;

      const paginatedQuery = query + ` OFFSET @offset LIMIT @limit`;
      parameters.push(
        { name: '@offset', value: offset },
        { name: '@limit', value: limit },
      );

      const items = await this.cosmosDB.queryDocuments<Recommendation>(
        'recommendations',
        paginatedQuery,
        parameters,
        tenantId,
      );

      const totalCount = totalRecs.length;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        items,
        totalCount,
        pageNumber: page,
        totalPages,
        pageSize: limit,
        hasMore: page < totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to query recommendations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply ML ranking to recommendations
   * Combines ML model scores with existing recommendation scores
   */
  private async applyMLRanking(
    tenantId: string,
    projectId: string,
    userId: string,
    recommendations: Recommendation[],
    weights: { vectorSearch: number; collaborative: number; temporal: number; content: number }
  ): Promise<Recommendation[]> {
    try {
      // Extract features for each recommendation
      const recommendationFeatures = await Promise.all(
        recommendations.map(async (rec) => {
          try {
            // Build feature vector for recommendation
            const features: Record<string, unknown> = {
              userId,
              projectId,
              recommendationType: rec.type,
              targetId: rec.targetId,
              targetType: rec.targetType,
              vectorScore: rec.vectorScore || 0,
              collaborativeScore: rec.collaborativeScore || 0,
              temporalScore: rec.temporalScore || 0,
              contentScore: rec.contentScore || 0,
              existingConfidenceScore: rec.confidenceScore,
            };

            // Get ML ranking score
            const mlRankings = await this.modelService.getRecommendations(
              features,
              undefined, // industryId - could be extracted from project context
              recommendations.length // limit
            );

            // Find ML score for this recommendation
            const mlRanking = mlRankings.find((r: any) => r.itemId === rec.targetId);
            const mlScore = mlRanking ? mlRanking.score : 0.5; // Default to 0.5 if not found

            return {
              recommendation: rec,
              mlScore,
              mlRank: mlRanking ? mlRanking.rank : recommendations.length + 1,
            };
          } catch (error) {
            this.logger.warn(`Failed to get ML ranking for recommendation ${rec.id}: ${error.message}`);
            // Return recommendation with default ML score
            return {
              recommendation: rec,
              mlScore: 0.5,
              mlRank: recommendations.length + 1,
            };
          }
        })
      );

      // Combine ML scores with existing scores
      // Weight: 70% existing score, 30% ML score (can be made configurable)
      const mlWeight = 0.3;
      const existingWeight = 0.7;

      const rankedRecommendations = recommendationFeatures.map(({ recommendation, mlScore }) => {
        const combinedScore = 
          (recommendation.confidenceScore * existingWeight) + 
          (mlScore * mlWeight);

        return {
          ...recommendation,
          confidenceScore: Math.min(1, combinedScore),
          mlScore, // Store ML score for analysis
          sources: [...recommendation.sources, RecommendationSource.ML_RANKING], // Add ML as a source
        };
      });

      // Re-sort by combined score
      return rankedRecommendations.sort((a, b) => b.confidenceScore - a.confidenceScore);
    } catch (error) {
      this.logger.warn(`ML ranking failed: ${error.message}`);
      // Return original recommendations if ML ranking fails
      return recommendations;
    }
  }

  /**
   * Set ML services for late initialization
   * Allows ML services to be injected after RecommendationsService is created
   */
  setMLServices(
    featureStoreService: any, // FeatureStoreService
    modelService: any // ModelService
  ): void {
    this.featureStoreService = featureStoreService;
    this.modelService = modelService;
  }
}

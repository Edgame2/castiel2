/**
 * Recommendations Service
 * Multi-factor recommendation engine with CAIS integration
 * Combines vector search, collaborative filtering, temporal, content-based, and ML recommendations
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import {
  Recommendation,
  RecommendationRequest,
  RecommendationBatch,
  RecommendationFeedback,
  LearnedWeights,
  ModelSelection,
  FeedbackAction,
} from '../types/recommendations.types';
import { publishRecommendationEvent } from '../events/publishers/RecommendationEventPublisher';
import { v4 as uuidv4 } from 'uuid';

// Default weights for fallback
const DEFAULT_WEIGHTS: LearnedWeights = {
  vectorSearch: 0.4,
  collaborative: 0.3,
  temporal: 0.2,
  content: 0.1,
  ml: 0.0,
};

export class RecommendationsService {
  private config: ReturnType<typeof loadConfig>;
  private adaptiveLearningClient: ServiceClient;
  private mlServiceClient: ServiceClient;
  private embeddingsClient: ServiceClient;
  private shardManagerClient: ServiceClient;
  private analyticsServiceClient: ServiceClient;
  private recommendationCache = new Map<string, { batch: RecommendationBatch; expiresAt: number }>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    
    // Initialize service clients
    this.adaptiveLearningClient = new ServiceClient({
      baseURL: this.config.services.adaptive_learning?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.mlServiceClient = new ServiceClient({
      baseURL: this.config.services.ml_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.embeddingsClient = new ServiceClient({
      baseURL: this.config.services.embeddings?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.analyticsServiceClient = new ServiceClient({
      baseURL: this.config.services.analytics_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      // If app not available, return empty - will be handled by gateway/service mesh
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'recommendations',
      serviceName: 'recommendations',
      tenantId,
    });
  }

  /**
   * Get learned weights from adaptive-learning service
   */
  async getLearnedWeights(tenantId: string): Promise<LearnedWeights> {
    try {
      const token = this.getServiceToken(tenantId);
      const response = await this.adaptiveLearningClient.get<LearnedWeights>(
        `/api/v1/adaptive-learning/weights/${tenantId}?component=recommendations`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      return response || DEFAULT_WEIGHTS;
    } catch (error: any) {
      log.warn('Failed to get learned weights, using defaults', {
        error: error.message,
        tenantId,
        service: 'recommendations',
      });
      return DEFAULT_WEIGHTS;
    }
  }

  /**
   * Get model selection from adaptive-learning service
   */
  async getModelSelection(tenantId: string): Promise<ModelSelection> {
    try {
      const token = this.getServiceToken(tenantId);
      const response = await this.adaptiveLearningClient.get<ModelSelection>(
        `/api/v1/adaptive-learning/model-selection/${tenantId}?context=recommendations`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      return response || { modelId: 'default-recommendation-model', confidence: 0.8 };
    } catch (error: any) {
      log.warn('Failed to get model selection, using default', {
        error: error.message,
        tenantId,
        service: 'recommendations',
      });
      return { modelId: 'default-recommendation-model', confidence: 0.8 };
    }
  }

  /**
   * Generate recommendations (async via events or synchronous)
   */
  async generateRecommendations(request: RecommendationRequest): Promise<RecommendationBatch> {
    const startTime = Date.now();
    const recommendationId = uuidv4();

    try {
      log.info('Starting recommendation generation', {
        recommendationId,
        opportunityId: request.opportunityId,
        tenantId: request.tenantId,
        service: 'recommendations',
      });

      // Publish started event
      await publishRecommendationEvent('recommendation.generation.started', request.tenantId, {
        recommendationId,
        opportunityId: request.opportunityId,
      });

      // Check cache
      const cacheKey = `${request.tenantId}:${request.opportunityId || request.userId}`;
      const cached = this.recommendationCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        log.debug('Returning cached recommendations', {
          recommendationId,
          opportunityId: request.opportunityId,
          service: 'recommendations',
        });
        return cached.batch;
      }

      // Step 1: Get learned weights from adaptive-learning (REST)
      const weights = await this.getLearnedWeights(request.tenantId);
      log.debug('Retrieved learned weights', {
        weights,
        tenantId: request.tenantId,
        service: 'recommendations',
      });

      // Step 2: Generate recommendations using multiple algorithms
      const allRecommendations: Recommendation[] = [];
      const metadata: RecommendationBatch['metadata'] = {};

      // Vector search-based recommendations
      if (weights.vectorSearch && weights.vectorSearch > 0) {
        const vectorRecs = await this.getVectorSearchRecommendations(request, weights.vectorSearch);
        allRecommendations.push(...vectorRecs);
        metadata.vectorSearchCount = vectorRecs.length;
      }

      // Collaborative filtering recommendations
      if (weights.collaborative && weights.collaborative > 0) {
        const collabRecs = await this.getCollaborativeRecommendations(request, weights.collaborative);
        allRecommendations.push(...collabRecs);
        metadata.collaborativeCount = collabRecs.length;
      }

      // Temporal/recency-based recommendations
      if (weights.temporal && weights.temporal > 0) {
        const temporalRecs = await this.getTemporalRecommendations(request, weights.temporal);
        allRecommendations.push(...temporalRecs);
        metadata.temporalCount = temporalRecs.length;
      }

      // Content-based recommendations
      if (weights.content && weights.content > 0) {
        const contentRecs = await this.getContentRecommendations(request, weights.content);
        allRecommendations.push(...contentRecs);
        metadata.contentCount = contentRecs.length;
      }

      // ML-enhanced recommendations
      if (weights.ml && weights.ml > 0) {
        const mlRecs = await this.getMLRecommendations(request, weights.ml);
        allRecommendations.push(...mlRecs);
        metadata.mlCount = mlRecs.length;
      }

      // Step 3: Merge and score recommendations
      const merged = this.mergeAndScoreRecommendations(allRecommendations, weights);
      
      // Step 4: Apply limit and sort
      const sorted = merged
        .sort((a, b) => b.score - a.score)
        .slice(0, request.limit || 20);

      // Step 5: Generate explanations
      const withExplanations = await Promise.all(
        sorted.map(rec => this.generateExplanation(rec))
      );

      // Step 6: Build recommendation batch
      const batch: RecommendationBatch = {
        recommendations: withExplanations,
        total: withExplanations.length,
        generatedAt: new Date(),
        metadata,
      };

      // Step 7: Store in database
      await this.storeRecommendations(batch, request.tenantId);

      // Step 8: Cache result
      this.recommendationCache.set(cacheKey, {
        batch,
        expiresAt: Date.now() + this.CACHE_TTL,
      });

      // Step 9: Publish completion event
      await publishRecommendationEvent('recommendation.generation.completed', request.tenantId, {
        recommendationId,
        opportunityId: request.opportunityId,
        recommendations: withExplanations,
        workflowId: request.workflowId, // Include workflowId for tracking
        timestamp: new Date().toISOString(),
      });

      // Step 10: recordPrediction (REST) and publish outcome to adaptive-learning (MISSING_FEATURES 3.2)
      const avgScore = withExplanations.length ? withExplanations.reduce((s, r) => s + r.score, 0) / withExplanations.length : 0.5;
      if (this.config.services.adaptive_learning?.url) {
        try {
          const token = this.getServiceToken(request.tenantId);
          await this.adaptiveLearningClient.post(
            '/api/v1/adaptive-learning/outcomes/record-prediction',
            {
              component: 'recommendations',
              predictionId: recommendationId,
              context: { opportunityId: request.opportunityId, count: withExplanations.length },
              predictedValue: avgScore,
            },
            { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': request.tenantId } }
          );
        } catch (e: unknown) {
          log.warn('recordPrediction (adaptive-learning) failed', { error: (e as Error).message, recommendationId, service: 'recommendations' });
        }
      }
      await publishRecommendationEvent('adaptive.learning.outcome.recorded', request.tenantId, {
        component: 'recommendations',
        recommendations: withExplanations.map(r => ({
          id: r.id,
          source: r.source,
          score: r.score,
        })),
      });

      log.info('Recommendation generation completed', {
        recommendationId,
        opportunityId: request.opportunityId,
        count: withExplanations.length,
        durationMs: Date.now() - startTime,
        service: 'recommendations',
      });

      return batch;
    } catch (error: any) {
      log.error('Recommendation generation failed', error, {
        recommendationId,
        opportunityId: request.opportunityId,
        tenantId: request.tenantId,
        service: 'recommendations',
      });

      // Publish failure event
      await publishRecommendationEvent('recommendation.generation.failed', request.tenantId, {
        recommendationId,
        opportunityId: request.opportunityId,
        error: error.message || 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Vector search-based recommendations
   */
  private async getVectorSearchRecommendations(
    request: RecommendationRequest,
    weight: number
  ): Promise<Recommendation[]> {
    try {
      if (!request.opportunityId) {
        return [];
      }

      const token = this.getServiceToken(request.tenantId);
      
      // Get opportunity shard
      const opportunityShard = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${request.opportunityId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': request.tenantId,
          },
        }
      );

      if (!opportunityShard) {
        return [];
      }

      const data = opportunityShard.structuredData || {};
      const opportunityText = JSON.stringify({
        description: data.description || '',
        summary: data.summary || '',
        stage: data.stage || '',
      });

      // Get embeddings for opportunity
      const embeddingResponse = await this.embeddingsClient.post<any>(
        '/api/v1/embeddings',
        {
          text: opportunityText,
          model: 'text-embedding-ada-002',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': request.tenantId,
          },
        }
      );

      if (!embeddingResponse.embedding) {
        return [];
      }

      // Search for similar opportunities using vector search
      const similarOpportunities = await this.shardManagerClient.post<any>(
        '/api/v1/shards/query',
        {
          shardType: 'opportunity',
          filters: {
            stage: { $ne: data.stage }, // Different stage
          },
          limit: 10,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': request.tenantId,
          },
        }
      );

      const recommendations: Recommendation[] = [];
      
      for (const similarOpp of (similarOpportunities.data || []).slice(0, 5)) {
        if (similarOpp.id === request.opportunityId) continue;
        
        const similarData = similarOpp.structuredData || {};
        const outcome = similarData.outcome || similarData.status;
        
        // Only recommend from successful opportunities
        if (outcome === 'won' || outcome === 'closed_won') {
          recommendations.push({
            id: uuidv4(),
            tenantId: request.tenantId,
            opportunityId: request.opportunityId,
            type: 'action',
            source: 'vector_search',
            title: `Similar successful opportunity: ${similarOpp.name || similarOpp.id}`,
            description: `Based on similar opportunities, consider: ${similarData.stage || 'similar stage'}`,
            confidence: 0.7 * weight,
            score: 0.7 * weight,
            status: 'active',
            createdAt: new Date(),
            metadata: {
              similarOpportunityId: similarOpp.id,
              similarityScore: 0.7,
            },
          });
        }
      }

      return recommendations;
    } catch (error: any) {
      log.warn('Vector search recommendations failed', {
        error: error.message,
        tenantId: request.tenantId,
        service: 'recommendations',
      });
      return [];
    }
  }

  /**
   * Collaborative filtering recommendations
   */
  private async getCollaborativeRecommendations(
    request: RecommendationRequest,
    weight: number
  ): Promise<Recommendation[]> {
    try {
      if (!request.userId) {
        return [];
      }

      const token = this.getServiceToken(request.tenantId);
      
      // Get user's past successful recommendations
      const container = getContainer('recommendation_recommendations');
      const feedbackContainer = getContainer('recommendation_feedback');
      
      // Query user's accepted recommendations
      const userFeedbackQuery = {
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId AND c.action = @action',
        parameters: [
          { name: '@tenantId', value: request.tenantId },
          { name: '@userId', value: request.userId },
          { name: '@action', value: 'accept' },
        ],
      };

      const { resources: userFeedback } = await feedbackContainer.items
        .query(userFeedbackQuery, { partitionKey: request.tenantId })
        .fetchAll();

      if (!userFeedback || userFeedback.length === 0) {
        return [];
      }

      // Find other users who accepted similar recommendations
      const acceptedRecommendationIds = userFeedback.map((f: any) => f.recommendationId);
      
      // Query recommendations that were accepted by other users
      const similarUsersQuery = {
        query: 'SELECT c.userId FROM c WHERE c.tenantId = @tenantId AND c.recommendationId IN (@recIds) AND c.action = @action AND c.userId != @userId',
        parameters: [
          { name: '@tenantId', value: request.tenantId },
          { name: '@recIds', value: acceptedRecommendationIds },
          { name: '@action', value: 'accept' },
          { name: '@userId', value: request.userId },
        ],
      };

      const { resources: similarUsers } = await feedbackContainer.items
        .query(similarUsersQuery, { partitionKey: request.tenantId })
        .fetchAll();

      if (!similarUsers || similarUsers.length === 0) {
        return [];
      }

      const similarUserIds = [...new Set(similarUsers.map((u: any) => u.userId))];
      
      // Get recommendations accepted by similar users
      const recommendations: Recommendation[] = [];
      for (const similarUserId of similarUserIds.slice(0, 5)) {
        const similarUserFeedbackQuery = {
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId AND c.action = @action',
          parameters: [
            { name: '@tenantId', value: request.tenantId },
            { name: '@userId', value: similarUserId },
            { name: '@action', value: 'accept' },
          ],
        };

        const { resources: similarUserFeedback } = await feedbackContainer.items
          .query(similarUserFeedbackQuery, { partitionKey: request.tenantId })
          .fetchAll();

        for (const feedback of (similarUserFeedback || []).slice(0, 3)) {
          // Get the recommendation details
          try {
            const { resource: rec } = await container.item(feedback.recommendationId, request.tenantId).read();
            if (rec && rec.status === 'active') {
              recommendations.push({
                ...rec,
                id: uuidv4(), // New ID for this user
                confidence: 0.6 * weight,
                score: 0.6 * weight,
                metadata: {
                  ...rec.metadata,
                  collaborativeMatch: true,
                  similarUserId,
                },
              });
            }
          } catch (error) {
            // Recommendation may have been deleted
            continue;
          }
        }
      }

      return recommendations;
    } catch (error: any) {
      log.warn('Collaborative filtering recommendations failed', {
        error: error.message,
        tenantId: request.tenantId,
        service: 'recommendations',
      });
      return [];
    }
  }

  /**
   * Temporal/recency-based recommendations
   */
  private async getTemporalRecommendations(
    request: RecommendationRequest,
    weight: number
  ): Promise<Recommendation[]> {
    try {
      const container = getContainer('recommendation_recommendations');
      
      // Query recent recommendations (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.createdAt >= @date ORDER BY c.createdAt DESC',
        parameters: [
          { name: '@tenantId', value: request.tenantId },
          { name: '@date', value: thirtyDaysAgo.toISOString() },
        ],
      };

      const { resources } = await container.items
        .query(querySpec, { partitionKey: request.tenantId })
        .fetchAll();

      const recommendations: Recommendation[] = [];
      const now = Date.now();
      
      for (const rec of (resources || []).slice(0, 10)) {
        const createdAt = new Date(rec.createdAt).getTime();
        const daysAgo = (now - createdAt) / (1000 * 60 * 60 * 24);
        
        // Boost score based on recency (more recent = higher score)
        let recencyBoost = 1.0;
        if (daysAgo < 1) recencyBoost = 1.0;
        else if (daysAgo < 7) recencyBoost = 0.9;
        else if (daysAgo < 14) recencyBoost = 0.7;
        else recencyBoost = 0.5;

        recommendations.push({
          ...rec,
          confidence: (rec.confidence || 0.5) * recencyBoost * weight,
          score: (rec.score || 0.5) * recencyBoost * weight,
          metadata: {
            ...rec.metadata,
            temporalBoost: recencyBoost,
            daysAgo,
          },
        });
      }

      // Sort by recency-boosted score
      return recommendations.sort((a, b) => b.score - a.score).slice(0, 5);
    } catch (error: any) {
      log.warn('Temporal recommendations failed', {
        error: error.message,
        tenantId: request.tenantId,
        service: 'recommendations',
      });
      return [];
    }
  }

  /**
   * Content-based recommendations
   */
  private async getContentRecommendations(
    request: RecommendationRequest,
    weight: number
  ): Promise<Recommendation[]> {
    try {
      if (!request.opportunityId) {
        return [];
      }

      const token = this.getServiceToken(request.tenantId);
      
      // Get opportunity shard
      const opportunityShard = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${request.opportunityId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': request.tenantId,
          },
        }
      );

      if (!opportunityShard) {
        return [];
      }

      const data = opportunityShard.structuredData || {};
      const contentKeywords = [
        ...(data.description || '').toLowerCase().split(/\s+/),
        ...(data.summary || '').toLowerCase().split(/\s+/),
        data.stage || '',
        data.type || '',
      ].filter(k => k.length > 3);

      // Query similar opportunities by content keywords
      const similarOpportunities = await this.shardManagerClient.post<any>(
        '/api/v1/shards/query',
        {
          shardType: 'opportunity',
          filters: {
            $or: [
              { description: { $contains: contentKeywords[0] || '' } },
              { summary: { $contains: contentKeywords[0] || '' } },
              { stage: data.stage },
            ],
          },
          limit: 10,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': request.tenantId,
          },
        }
      );

      const recommendations: Recommendation[] = [];
      
      for (const similarOpp of (similarOpportunities.data || []).slice(0, 5)) {
        if (similarOpp.id === request.opportunityId) continue;
        
        const similarData = similarOpp.structuredData || {};
        const outcome = similarData.outcome || similarData.status;
        
        // Recommend actions from successful similar opportunities
        if (outcome === 'won' || outcome === 'closed_won') {
          recommendations.push({
            id: uuidv4(),
            tenantId: request.tenantId,
            opportunityId: request.opportunityId,
            type: 'action',
            source: 'content',
            title: `Content-based recommendation: ${similarData.stage || 'similar stage'}`,
            description: `Similar opportunities with matching content were successful at stage: ${similarData.stage}`,
            confidence: 0.65 * weight,
            score: 0.65 * weight,
            status: 'active',
            createdAt: new Date(),
            metadata: {
              similarOpportunityId: similarOpp.id,
              contentMatch: true,
              matchedKeywords: contentKeywords.slice(0, 3),
            },
          });
        }
      }

      return recommendations;
    } catch (error: any) {
      log.warn('Content-based recommendations failed', {
        error: error.message,
        tenantId: request.tenantId,
        service: 'recommendations',
      });
      return [];
    }
  }

  /**
   * ML-enhanced recommendations
   */
  private async getMLRecommendations(
    request: RecommendationRequest,
    weight: number
  ): Promise<Recommendation[]> {
    try {
      if (!request.opportunityId) {
        return [];
      }

      const modelSelection = await this.getModelSelection(request.tenantId);
      const token = this.getServiceToken(request.tenantId);
      
      // Get opportunity shard for feature extraction
      const opportunityShard = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${request.opportunityId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': request.tenantId,
          },
        }
      );

      if (!opportunityShard) {
        return [];
      }

      // Extract features
      const data = opportunityShard.structuredData || {};
      const features = {
        amount: data.amount || 0,
        stage: data.stage || '',
        probability: data.probability || 0,
        daysInStage: data.daysInStage || 0,
        hasDescription: !!(data.description && data.description.length > 0),
        descriptionLength: (data.description || '').length,
      };

      // Call ML service for recommendations
      const mlResponse = await this.mlServiceClient.post<any>(
        `/api/v1/ml/recommendations/predict`,
        {
          opportunityId: request.opportunityId,
          modelId: modelSelection.modelId,
          features,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': request.tenantId,
          },
        }
      );

      const recommendations: Recommendation[] = [];
      
      if (mlResponse.recommendations && Array.isArray(mlResponse.recommendations)) {
        for (const mlRec of mlResponse.recommendations) {
          recommendations.push({
            id: uuidv4(),
            tenantId: request.tenantId,
            opportunityId: request.opportunityId,
            type: mlRec.type || 'action',
            source: 'ml',
            title: mlRec.title || mlRec.recommendation || 'ML-generated recommendation',
            description: mlRec.description || mlRec.reasoning || '',
            confidence: (mlRec.confidence || modelSelection.confidence) * weight,
            score: (mlRec.score || mlRec.confidence || 0.7) * weight,
            status: 'active',
            createdAt: new Date(),
            metadata: {
              modelId: modelSelection.modelId,
              mlFeatures: features,
              mlReasoning: mlRec.reasoning,
            },
          });
        }
      }

      return recommendations;
    } catch (error: any) {
      log.warn('ML recommendations failed', {
        error: error.message,
        tenantId: request.tenantId,
        service: 'recommendations',
      });
      return [];
    }
  }

  /**
   * Merge and score recommendations from multiple sources
   */
  private mergeAndScoreRecommendations(
    recommendations: Recommendation[],
    weights: LearnedWeights
  ): Recommendation[] {
    // Deduplicate by ID
    const uniqueMap = new Map<string, Recommendation>();
    
    for (const rec of recommendations) {
      const existing = uniqueMap.get(rec.id);
      if (existing) {
        // Merge scores based on weights
        const sourceWeight = weights[rec.source] || 0;
        existing.score = (existing.score + rec.score * sourceWeight) / 2;
      } else {
        // Apply source weight to score
        const sourceWeight = weights[rec.source] || 0;
        rec.score = rec.score * sourceWeight;
        uniqueMap.set(rec.id, rec);
      }
    }

    return Array.from(uniqueMap.values());
  }

  /**
   * Generate explanation for recommendation
   */
  private async generateExplanation(recommendation: Recommendation): Promise<Recommendation> {
    try {
      const source = recommendation.source;
      const confidence = (recommendation.confidence * 100).toFixed(0);
      const metadata = recommendation.metadata || {};

      let explanation = `Recommended based on ${source} with ${confidence}% confidence`;

      // Add source-specific details
      if (source === 'vector_search' && metadata.similarOpportunityId) {
        explanation += `. Similar to successful opportunity ${metadata.similarOpportunityId}`;
      } else if (source === 'collaborative' && metadata.similarUserId) {
        explanation += `. Users similar to you have found this helpful`;
      } else if (source === 'temporal' && metadata.daysAgo !== undefined) {
        explanation += `. Recently active (${Math.round(metadata.daysAgo)} days ago)`;
      } else if (source === 'content' && metadata.matchedKeywords) {
        explanation += `. Matches your content keywords: ${metadata.matchedKeywords.slice(0, 3).join(', ')}`;
      } else if (source === 'ml' && metadata.modelId) {
        explanation += `. ML model ${metadata.modelId} identified this as relevant`;
      }

      // Add reasoning from metadata if available
      if (metadata.mlReasoning) {
        explanation += `. Reasoning: ${metadata.mlReasoning.substring(0, 100)}`;
      }

      recommendation.explanation = explanation;
      return recommendation;
    } catch (error: any) {
      log.warn('Explanation generation failed', {
        error: error.message,
        recommendationId: recommendation.id,
        service: 'recommendations',
      });
      recommendation.explanation = `Recommended based on ${recommendation.source} with ${(recommendation.confidence * 100).toFixed(0)}% confidence`;
      return recommendation;
    }
  }

  /**
   * Store recommendations in database
   */
  private async storeRecommendations(batch: RecommendationBatch, tenantId: string): Promise<void> {
    try {
      const container = getContainer('recommendation_recommendations');
      
      for (const rec of batch.recommendations) {
        await container.items.create(
          {
            id: rec.id,
            tenantId,
            ...rec,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { partitionKey: tenantId }
        );
      }
    } catch (error: any) {
      log.error('Failed to store recommendations', error, {
        tenantId,
        service: 'recommendations',
      });
      // Don't throw - recommendations can continue without storage
    }
  }

  /**
   * Record user feedback on recommendation
   */
  async recordFeedback(feedback: RecommendationFeedback): Promise<void> {
    try {
      log.info('Recording recommendation feedback', {
        recommendationId: feedback.recommendationId,
        action: feedback.action,
        userId: feedback.userId,
        tenantId: feedback.tenantId,
        service: 'recommendations',
      });

      // Store feedback in database
      const container = getContainer('recommendation_feedback');
      await container.items.create(
        {
          id: uuidv4(),
          tenantId: feedback.tenantId,
          ...feedback,
          timestamp: new Date(),
          createdAt: new Date(),
        },
        { partitionKey: feedback.tenantId }
      );

      // Update recommendation status
      const recContainer = getContainer('recommendation_recommendations');
      const { resource: recommendation } = await recContainer
        .item(feedback.recommendationId, feedback.tenantId)
        .read();

      if (recommendation) {
        const newStatus: Recommendation['status'] =
          feedback.action === 'accept'
            ? 'accepted'
            : feedback.action === 'ignore'
            ? 'ignored'
            : 'irrelevant';

        await recContainer.item(feedback.recommendationId, feedback.tenantId).replace({
          ...recommendation,
          status: newStatus,
          updatedAt: new Date(),
        });
      }

      // Publish feedback event (critical for CAIS)
      await publishRecommendationEvent('recommendation.feedback.received', feedback.tenantId, {
        recommendationId: feedback.recommendationId,
        action: feedback.action,
        userId: feedback.userId,
        timestamp: new Date().toISOString(),
      });

      log.info('Recommendation feedback recorded', {
        recommendationId: feedback.recommendationId,
        action: feedback.action,
        service: 'recommendations',
      });
    } catch (error: any) {
      log.error('Failed to record feedback', error, {
        recommendationId: feedback.recommendationId,
        tenantId: feedback.tenantId,
        service: 'recommendations',
      });
      throw error;
    }
  }
}

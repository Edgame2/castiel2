/**
 * Recommendations Service
 * Multi-factor recommendation engine with vector search, collaborative filtering, and temporal scoring
 */
import { RecommendationRequest, RecommendationBatch, RecommendationExplanation, RecommendationStatistics, UpdateRecommendationWeights, RecommendationQueryParams, RecommendationPage } from '../types/recommendation.types';
import { CosmosDBService } from './cosmos-db.service';
import { CacheService } from './cache.service';
import { VectorSearchService } from './vector-search.service.js';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { ProjectActivityService } from './project-activity.service';
export declare class RecommendationsService {
    private cosmosDB;
    private cache;
    private vectorSearch;
    private performanceMonitoring;
    private activityService;
    private readonly logger;
    private readonly RECOMMENDATIONS_CACHE_TTL;
    private readonly STATS_CACHE_TTL;
    private algorithmConfig;
    constructor(cosmosDB: CosmosDBService, cache: CacheService, vectorSearch: VectorSearchService, performanceMonitoring: PerformanceMonitoringService, activityService: ProjectActivityService);
    /**
     * Get recommendations for a user in a project (multi-factor)
     */
    getRecommendations(tenantId: string, request: RecommendationRequest): Promise<RecommendationBatch>;
    /**
     * Get vector search-based recommendations (semantic similarity)
     * Weight: 50%
     */
    private getVectorSearchRecommendations;
    /**
     * Get collaborative filtering recommendations
     * Weight: 30%
     */
    private getCollaborativeRecommendations;
    /**
     * Get temporal/recency-based recommendations
     * Weight: 20%
     */
    private getTemporalRecommendations;
    /**
     * Merge recommendations from multiple sources and calculate composite score
     */
    private mergeAndScoreRecommendations;
    /**
     * Generate human-readable explanation for a recommendation
     */
    private generateExplanation;
    /**
     * Get detailed explanation for a recommendation
     */
    explainRecommendation(tenantId: string, projectId: string, recommendationId: string): Promise<RecommendationExplanation>;
    /**
     * Build detailed explanation reasons
     */
    private buildExplanationReasons;
    /**
     * Provide feedback on a recommendation (for learning)
     */
    provideFeedback(tenantId: string, projectId: string, recommendationId: string, feedback: 'positive' | 'negative' | 'irrelevant'): Promise<void>;
    /**
     * Get recommendation statistics for a project
     */
    getStatistics(tenantId: string, projectId: string): Promise<RecommendationStatistics>;
    /**
     * Update recommendation algorithm weights
     */
    updateAlgorithmWeights(weights: UpdateRecommendationWeights): Promise<void>;
    /**
     * Record recommendation metrics for monitoring
     */
    private recordRecommendationMetrics;
    /**
     * Query recommendations with filtering and pagination
     */
    queryRecommendations(tenantId: string, params: RecommendationQueryParams): Promise<RecommendationPage>;
}
//# sourceMappingURL=recommendation.service.d.ts.map
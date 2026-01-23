/**
 * Recommendation Routes
 * API endpoints for the multi-factor recommendation engine
 */
import { RecommendationsService } from '../services/recommendation.service';
import { RecommendationRequest, RecommendationBatch, RecommendationExplanation, RecommendationStatistics, RecommendationQueryParams, RecommendationPage, UpdateRecommendationWeights, BulkRecommendationFeedback } from '../types/recommendation.types';
import { UserJWT } from '../types/auth.types';
export declare class RecommendationsController {
    private recommendationsService;
    constructor(recommendationsService: RecommendationsService);
    /**
     * POST /api/v1/recommendations/generate
     * Get multi-factor recommendations for a user in a project
     */
    generateRecommendations(input: RecommendationRequest, tenantId: string, user: UserJWT): Promise<RecommendationBatch>;
    /**
     * GET /api/v1/recommendations
     * Query recommendations with filtering and pagination
     */
    queryRecommendations(params: RecommendationQueryParams, tenantId: string): Promise<RecommendationPage>;
    /**
     * GET /api/v1/recommendations/:recommendationId
     * Get a specific recommendation with details
     */
    getRecommendation(recommendationId: string, projectId: string, tenantId: string): Promise<any>;
    /**
     * GET /api/v1/recommendations/:recommendationId/explain
     * Get detailed explanation for a recommendation
     */
    explainRecommendation(recommendationId: string, projectId: string, tenantId: string): Promise<RecommendationExplanation>;
    /**
     * POST /api/v1/recommendations/:recommendationId/feedback
     * Provide feedback on a recommendation (for learning)
     */
    provideFeedback(recommendationId: string, projectId: string, feedback: 'positive' | 'negative' | 'irrelevant', tenantId: string): Promise<void>;
    /**
     * POST /api/v1/recommendations/feedback/bulk
     * Bulk provide feedback on multiple recommendations
     */
    bulkProvideFeedback(input: BulkRecommendationFeedback, projectId: string, tenantId: string): Promise<void>;
    /**
     * GET /api/v1/recommendations/statistics
     * Get recommendation statistics for a project
     */
    getStatistics(projectId: string, tenantId: string): Promise<RecommendationStatistics>;
}
/**
 * Admin Routes for Recommendations (super admin only)
 */
export declare class AdminRecommendationsController {
    private recommendationsService;
    constructor(recommendationsService: RecommendationsService);
    /**
     * PATCH /api/v1/admin/recommendations/algorithm/weights
     * Update recommendation algorithm weights
     */
    updateAlgorithmWeights(input: UpdateRecommendationWeights, tenantId: string, user: UserJWT): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * GET /api/v1/admin/recommendations/algorithm/config
     * Get current algorithm configuration
     */
    getAlgorithmConfig(tenantId: string): Promise<any>;
    /**
     * POST /api/v1/admin/recommendations/regenerate
     * Force regenerate recommendations for a project
     */
    forceRegenerateRecommendations(projectId: string, tenantId: string, user: UserJWT): Promise<{
        success: boolean;
        jobId: string;
        message: string;
    }>;
    /**
     * GET /api/v1/admin/recommendations/metrics
     * Get recommendation system metrics
     */
    getSystemMetrics(timeRangeHours: number | undefined, tenantId: string): Promise<any>;
    /**
     * POST /api/v1/admin/recommendations/cache/clear
     * Clear recommendation cache
     */
    clearCache(projectId: string | undefined, tenantId: string): Promise<void>;
}
//# sourceMappingURL=recommendation.routes.d.ts.map
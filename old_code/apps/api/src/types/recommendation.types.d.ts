/**
 * Recommendation Types
 * Multi-factor recommendation engine with explanation generation
 */
export declare enum RecommendationType {
    SHARD_LINK = "SHARD_LINK",// Recommend linking two shards
    SHARD_INCLUSION = "SHARD_INCLUSION",// Recommend including shard in project
    COLLABORATOR = "COLLABORATOR",// Recommend user to collaborate
    TEMPLATE = "TEMPLATE",// Recommend template for new project
    AI_CONTEXT = "AI_CONTEXT"
}
export declare enum RecommendationSource {
    VECTOR_SEARCH = "VECTOR_SEARCH",// Semantic similarity
    COLLABORATIVE_FILTERING = "COLLABORATIVE_FILTERING",// User patterns
    TEMPORAL = "TEMPORAL",// Recent activity
    CONTENT_BASED = "CONTENT_BASED",// Similar content
    HYBRID = "HYBRID"
}
export declare enum RecommendationStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    DISMISSED = "DISMISSED",
    EXPIRED = "EXPIRED"
}
/**
 * Single recommendation item
 */
export interface Recommendation {
    id: string;
    tenantId: string;
    projectId: string;
    userId: string;
    type: RecommendationType;
    targetId: string;
    targetName: string;
    targetType: string;
    confidenceScore: number;
    reasonCodes: string[];
    explanation: string;
    sources: RecommendationSource[];
    vectorScore?: number;
    collaborativeScore?: number;
    temporalScore?: number;
    contentScore?: number;
    status: RecommendationStatus;
    createdAt: Date;
    expiresAt: Date;
    feedbackProvidedAt?: Date;
    userFeedback?: 'positive' | 'negative' | 'irrelevant';
    metadata?: {
        contextTokens?: number;
        matchedTerms?: string[];
        relatedItems?: string[];
        relevanceTier?: 'high' | 'medium' | 'low';
    };
    ttl?: number;
}
/**
 * Batch recommendation request
 */
export interface RecommendationRequest {
    projectId: string;
    userId: string;
    type?: RecommendationType;
    limit?: number;
    minConfidence?: number;
    freshOnly?: boolean;
}
/**
 * Batch recommendation response
 */
export interface RecommendationBatch {
    requestId: string;
    recommendations: Recommendation[];
    totalCount: number;
    generatedAt: Date;
    executionTimeMs: number;
}
/**
 * Recommendation explanation with detailed breakdown
 */
export interface RecommendationExplanation {
    recommendationId: string;
    summary: string;
    detailedReasons: ExplanationReason[];
    totalScore: number;
    scoreBreakdown: {
        vectorScore?: number;
        collaborativeScore?: number;
        temporalScore?: number;
        contentScore?: number;
    };
    contextItems?: string[];
    supportingData?: Record<string, any>;
}
/**
 * Single explanation reason
 */
export interface ExplanationReason {
    type: 'CONTENT' | 'BEHAVIOR' | 'RECENCY' | 'RELEVANCE' | 'SIMILARITY';
    weight: number;
    description: string;
    evidence?: string[];
}
/**
 * Recommendation feedback for learning
 */
export interface RecommendationFeedback {
    recommendationId: string;
    userId: string;
    projectId: string;
    feedback: 'positive' | 'negative' | 'irrelevant';
    timestamp: Date;
    notes?: string;
}
/**
 * Recommendation statistics and metrics
 */
export interface RecommendationStatistics {
    totalGenerated: number;
    acceptanceRate: number;
    dismissalRate: number;
    avgConfidenceScore: number;
    byType: Record<RecommendationType, number>;
    bySource: Record<RecommendationSource, number>;
    topRecommendedItems: {
        itemId: string;
        itemName: string;
        acceptanceCount: number;
        dismissalCount: number;
    }[];
    timeSeriesData?: {
        date: string;
        generated: number;
        accepted: number;
        dismissed: number;
    }[];
}
/**
 * Link-specific recommendation
 */
export interface LinkRecommendation extends Recommendation {
    type: RecommendationType.SHARD_LINK;
    relationshipType: string;
    bidirectional?: boolean;
    suggestedStrength?: number;
}
/**
 * Shard inclusion recommendation
 */
export interface ShardInclusionRecommendation extends Recommendation {
    type: RecommendationType.SHARD_INCLUSION;
    shardId: string;
    rationale: string;
    suggestedPosition?: number;
}
/**
 * Collaborator recommendation
 */
export interface CollaboratorRecommendation extends Recommendation {
    type: RecommendationType.COLLABORATOR;
    userId: string;
    suggestedRole: string;
    similarityReason: string;
}
/**
 * Template recommendation
 */
export interface TemplateRecommendation extends Recommendation {
    type: RecommendationType.TEMPLATE;
    templateId: string;
    category: string;
    matchPercentage: number;
}
/**
 * AI chat context recommendation
 */
export interface AIContextRecommendation extends Recommendation {
    type: RecommendationType.AI_CONTEXT;
    contextShardIds: string[];
    suggestedTokenBudget: number;
    relevanceToQuery?: string;
}
/**
 * Recommendation algorithm configuration
 */
export interface RecommendationAlgorithmConfig {
    vectorSearchWeight: number;
    collaborativeWeight: number;
    temporalWeight: number;
    vectorSimilarityThreshold: number;
    minCollaborativeDataPoints: number;
    temporalDecayDays: number;
    contentSimilarityThreshold: number;
    batchGenerationFrequency: number;
    maxRecommendationsPerUser: number;
    recommendationTTLDays: number;
    enableFeedbackLearning: boolean;
    feedbackWeightFactor: number;
}
/**
 * Batch update request for recommendations
 */
export interface BulkRecommendationFeedback {
    recommendations: {
        id: string;
        feedback: 'positive' | 'negative' | 'irrelevant';
        notes?: string;
    }[];
}
/**
 * Vector search input for recommendations
 */
export interface VectorSearchInput {
    query: string;
    embeddings?: number[];
    topK: number;
    minScore: number;
    filters?: {
        type?: string;
        projectId?: string;
        excludeIds?: string[];
    };
}
/**
 * Recommendation cache entry
 */
export interface RecommendationCache {
    userId: string;
    projectId: string;
    recommendations: Recommendation[];
    generatedAt: Date;
    expiresAt: Date;
    version: number;
}
/**
 * Recommendation metrics for performance tracking
 */
export interface RecommendationMetrics {
    requestId: string;
    userId: string;
    projectId: string;
    totalTimeMs: number;
    vectorSearchTimeMs?: number;
    collaborativeFilteringTimeMs?: number;
    temporalScoringTimeMs?: number;
    explanationGenerationTimeMs?: number;
    vectorSearchResults: number;
    collaborativeMatches: number;
    temporalBoosts: number;
    finalRecommendations: number;
    avgConfidenceScore: number;
    diversityScore: number;
    cacheMiss: boolean;
    timestamp: Date;
}
/**
 * Update recommendation weights request
 */
export interface UpdateRecommendationWeights {
    vectorSearchWeight?: number;
    collaborativeWeight?: number;
    temporalWeight?: number;
}
/**
 * Create recommendation request (admin/system)
 */
export interface CreateRecommendationInput {
    projectId: string;
    userId: string;
    type: RecommendationType;
    targetId: string;
    targetName: string;
    targetType: string;
    confidenceScore: number;
    explanation: string;
    sources: RecommendationSource[];
    metadata?: Record<string, any>;
}
/**
 * Query parameters for recommendation listing
 */
export interface RecommendationQueryParams {
    projectId: string;
    userId?: string;
    type?: RecommendationType;
    status?: RecommendationStatus;
    minConfidence?: number;
    page?: number;
    limit?: number;
    sortBy?: 'confidence' | 'createdAt' | 'relevance';
    sortDirection?: 'asc' | 'desc';
}
/**
 * Paginated recommendation response
 */
export interface RecommendationPage {
    items: Recommendation[];
    totalCount: number;
    pageNumber: number;
    totalPages: number;
    pageSize: number;
    hasMore: boolean;
}
//# sourceMappingURL=recommendation.types.d.ts.map
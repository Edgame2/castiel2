/**
 * Recommendation Types
 * Multi-factor recommendation engine with explanation generation
 */

export enum RecommendationType {
  SHARD_LINK = 'SHARD_LINK',           // Recommend linking two shards
  SHARD_INCLUSION = 'SHARD_INCLUSION', // Recommend including shard in project
  COLLABORATOR = 'COLLABORATOR',       // Recommend user to collaborate
  TEMPLATE = 'TEMPLATE',               // Recommend template for new project
  AI_CONTEXT = 'AI_CONTEXT',           // Recommend context for AI chat
}

export enum RecommendationSource {
  VECTOR_SEARCH = 'VECTOR_SEARCH',           // Semantic similarity
  COLLABORATIVE_FILTERING = 'COLLABORATIVE_FILTERING', // User patterns
  TEMPORAL = 'TEMPORAL',                     // Recent activity
  CONTENT_BASED = 'CONTENT_BASED',          // Similar content
  ML_RANKING = 'ML_RANKING',                // ML model ranking
  HYBRID = 'HYBRID',                        // Multiple factors
}

export enum RecommendationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DISMISSED = 'DISMISSED',
  EXPIRED = 'EXPIRED',
}

/**
 * Single recommendation item
 */
export interface Recommendation {
  id: string;
  tenantId: string;
  projectId: string;
  userId: string;

  // Core recommendation data
  type: RecommendationType;
  targetId: string;                    // ID of recommended item (shardId, userId, templateId, etc.)
  targetName: string;                  // Display name of target
  targetType: string;                  // Type of target (shard, user, template, etc.)

  // Scoring
  confidenceScore: number;             // 0-1 confidence in recommendation
  reasonCodes: string[];               // Machine-readable reasons
  explanation: string;                 // Human-readable explanation
  sources: RecommendationSource[];     // Which algorithms contributed

  // Scoring breakdown
  vectorScore?: number;                // 0-1 semantic similarity score
  collaborativeScore?: number;         // 0-1 collaborative filtering score
  temporalScore?: number;              // 0-1 recency boost score
  contentScore?: number;               // 0-1 content similarity score

  // Status and feedback
  status: RecommendationStatus;
  createdAt: Date;
  expiresAt: Date;                     // Auto-expire recommendations
  feedbackProvidedAt?: Date;
  userFeedback?: 'positive' | 'negative' | 'irrelevant';

  // Metadata
  metadata?: {
    contextTokens?: number;            // Token count for context
    matchedTerms?: string[];           // Keywords that matched
    relatedItems?: string[];           // Other related recommendations
    relevanceTier?: 'high' | 'medium' | 'low';
  };

  // TTL for cleanup
  ttl?: number;
}

/**
 * Batch recommendation request
 */
export interface RecommendationRequest {
  projectId: string;
  userId: string;
  type?: RecommendationType;           // Filter by type, default: all
  limit?: number;                      // Default: 10
  minConfidence?: number;              // Default: 0.5
  freshOnly?: boolean;                 // Only non-expired, default: true
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
  summary: string;                     // Brief explanation
  detailedReasons: ExplanationReason[];

  // Scoring contribution
  totalScore: number;                  // 0-1
  scoreBreakdown: {
    vectorScore?: number;
    collaborativeScore?: number;
    temporalScore?: number;
    contentScore?: number;
  };

  // Context
  contextItems?: string[];             // Related shards, users, etc.
  supportingData?: Record<string, any>;
}

/**
 * Single explanation reason
 */
export interface ExplanationReason {
  type: 'CONTENT' | 'BEHAVIOR' | 'RECENCY' | 'RELEVANCE' | 'SIMILARITY';
  weight: number;                      // Contribution to overall score
  description: string;                 // Human-readable description
  evidence?: string[];                 // Supporting data points
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
  acceptanceRate: number;              // 0-1
  dismissalRate: number;               // 0-1
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
  relationshipType: string;            // Recommended relationship type
  bidirectional?: boolean;
  suggestedStrength?: number;          // 0-1
}

/**
 * Shard inclusion recommendation
 */
export interface ShardInclusionRecommendation extends Recommendation {
  type: RecommendationType.SHARD_INCLUSION;
  shardId: string;
  rationale: string;                   // Why include this shard
  suggestedPosition?: number;          // Order in project
}

/**
 * Collaborator recommendation
 */
export interface CollaboratorRecommendation extends Recommendation {
  type: RecommendationType.COLLABORATOR;
  userId: string;
  suggestedRole: string;               // VIEWER, CONTRIBUTOR, MANAGER
  similarityReason: string;            // Why recommended this user
}

/**
 * Template recommendation
 */
export interface TemplateRecommendation extends Recommendation {
  type: RecommendationType.TEMPLATE;
  templateId: string;
  category: string;
  matchPercentage: number;             // 0-100
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
  // Weights for multi-factor scoring
  vectorSearchWeight: number;          // Default: 0.5
  collaborativeWeight: number;         // Default: 0.3
  temporalWeight: number;              // Default: 0.2

  // Algorithm parameters
  vectorSimilarityThreshold: number;   // Default: 0.6
  minCollaborativeDataPoints: number;  // Default: 5
  temporalDecayDays: number;           // Default: 30
  contentSimilarityThreshold: number;  // Default: 0.5

  // Batch settings
  batchGenerationFrequency: number;    // Hours, default: 6
  maxRecommendationsPerUser: number;   // Default: 20
  recommendationTTLDays: number;       // Default: 7

  // Feedback learning
  enableFeedbackLearning: boolean;     // Default: true
  feedbackWeightFactor: number;        // Default: 0.1
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
  embeddings?: number[];               // Precomputed embeddings
  topK: number;                        // Default: 10
  minScore: number;                    // Default: 0.6
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
  version: number;                     // For cache invalidation
}

/**
 * Recommendation metrics for performance tracking
 */
export interface RecommendationMetrics {
  requestId: string;
  userId: string;
  projectId: string;

  // Processing time
  totalTimeMs: number;
  vectorSearchTimeMs?: number;
  collaborativeFilteringTimeMs?: number;
  temporalScoringTimeMs?: number;
  explanationGenerationTimeMs?: number;

  // Data statistics
  vectorSearchResults: number;
  collaborativeMatches: number;
  temporalBoosts: number;
  finalRecommendations: number;

  // Quality metrics
  avgConfidenceScore: number;
  diversityScore: number;              // 0-1 diversity of recommendations
  mlRankingApplied?: boolean;         // Whether ML ranking was applied
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
  page?: number;                       // Default: 1
  limit?: number;                      // Default: 20
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

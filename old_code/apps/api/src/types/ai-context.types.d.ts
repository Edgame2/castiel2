/**
 * AI Chat Context Types
 * Context assembly for AI-powered chat with topic extraction, clustering, and optimization
 */
export declare enum ContextSourceType {
    SHARD = "SHARD",
    ACTIVITY_LOG = "ACTIVITY_LOG",
    RECOMMENDATION = "RECOMMENDATION",
    TEMPLATE = "TEMPLATE",
    RELATED_LINK = "RELATED_LINK",
    USER_PREFERENCE = "USER_PREFERENCE",
    SEARCH_RESULT = "SEARCH_RESULT",
    CONVERSATION_HISTORY = "CONVERSATION_HISTORY"
}
export declare enum TopicCategory {
    TECHNICAL = "TECHNICAL",
    BUSINESS = "BUSINESS",
    PROCESS = "PROCESS",
    PLANNING = "PLANNING",
    ANALYSIS = "ANALYSIS",
    DOCUMENTATION = "DOCUMENTATION",
    REQUIREMENTS = "REQUIREMENTS",
    WORKFLOW = "WORKFLOW",
    DECISION = "DECISION",
    OTHER = "OTHER"
}
export declare enum ContextQualityLevel {
    HIGH = "HIGH",// 0.8-1.0 relevance
    MEDIUM = "MEDIUM",// 0.5-0.79 relevance
    LOW = "LOW",// 0.2-0.49 relevance
    MINIMAL = "MINIMAL"
}
/**
 * Extracted topic from document or context
 */
export interface ExtractedTopic {
    id: string;
    name: string;
    category: TopicCategory;
    keywords: string[];
    relevanceScore: number;
    frequency: number;
    entities?: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
    metadata?: Record<string, any>;
}
/**
 * Clustered group of related topics
 */
export interface TopicCluster {
    id: string;
    name: string;
    topics: ExtractedTopic[];
    centroidVector?: number[];
    coherenceScore: number;
    summary: string;
    relatedClusters?: string[];
}
/**
 * Context source item (shard, activity, etc.)
 */
export interface ContextSourceItem {
    id: string;
    sourceType: ContextSourceType;
    sourceId: string;
    sourceName: string;
    content: string;
    summary?: string;
    url?: string;
    createdAt: Date;
    updatedAt?: Date;
    relevanceScore: number;
    relevanceReason?: string;
    topicMatches?: string[];
    estimatedTokens: number;
    actualTokens?: number;
    metadata?: {
        author?: string;
        category?: string;
        tags?: string[];
        priority?: number;
        weight?: number;
    };
}
/**
 * Assembled context for AI chat
 */
export interface AssembledContext {
    id: string;
    tenantId: string;
    projectId: string;
    userId: string;
    query: string;
    queryEmbedding?: number[];
    queryTopics: ExtractedTopic[];
    sources: ContextSourceItem[];
    clusters: TopicCluster[];
    selectedShards: string[];
    selectedActivities: string[];
    selectedRecommendations: string[];
    summary: string;
    contextLength: number;
    contextLengthPercentage: number;
    qualityLevel: ContextQualityLevel;
    relevanceScore: number;
    optimizationApplied?: string[];
    compressionRatio?: number;
    createdAt: Date;
    expiresAt: Date;
    ttl?: number;
}
/**
 * Context assembly request
 */
export interface ContextAssemblyRequest {
    projectId: string;
    userId: string;
    query: string;
    maxTokens?: number;
    minRelevance?: number;
    includeHistory?: boolean;
    focusTopics?: string[];
    excludeSourceTypes?: ContextSourceType[];
    maxSourcesPerType?: number;
}
/**
 * Context assembly response
 */
export interface ContextAssemblyResponse {
    context: AssembledContext;
    executionTimeMs: number;
    recommendations?: {
        additionalSources?: ContextSourceItem[];
        refinedQuery?: string;
        suggestedFollowUp?: string;
    };
}
/**
 * Topic extraction request
 */
export interface TopicExtractionRequest {
    content: string;
    documents?: Array<{
        id: string;
        text: string;
        metadata?: Record<string, any>;
    }>;
    maxTopics?: number;
    minRelevance?: number;
    categorizationModel?: string;
}
/**
 * Topic extraction response
 */
export interface TopicExtractionResponse {
    topics: ExtractedTopic[];
    clusters: TopicCluster[];
    keyPhrases: string[];
    documentSummary?: string;
    executionTimeMs: number;
}
/**
 * Context optimization strategy
 */
export interface ContextOptimization {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    maxTokens: number;
    compressionLevel: number;
    priorityStrategy: 'relevance' | 'recency' | 'frequency' | 'hybrid';
    summaryEnabled: boolean;
    summaryCompressionRatio?: number;
    clusteringEnabled: boolean;
    minClusterCoherence?: number;
    createdAt: Date;
    updatedAt: Date;
    appliedCount?: number;
}
/**
 * Context caching entry
 */
export interface ContextCache {
    id: string;
    tenantId: string;
    projectId: string;
    userId: string;
    queryHash: string;
    context: AssembledContext;
    generatedAt: Date;
    expiresAt: Date;
    hitCount: number;
    version: number;
}
/**
 * Context similarity metrics
 */
export interface ContextSimilarity {
    sourceId1: string;
    sourceId2: string;
    similarity: number;
    commonTopics: string[];
    topicOverlap: number;
    euclideanDistance: number;
}
/**
 * Context quality metrics
 */
export interface ContextQualityMetrics {
    contextId: string;
    overallQuality: number;
    relevanceScore: number;
    coherenceScore: number;
    diversityScore: number;
    tokenEfficiency: number;
    retrievalTime: number;
    tokenCompression: number;
}
/**
 * Context assembly configuration
 */
export interface ContextAssemblyConfig {
    enabled: boolean;
    defaultMaxTokens: number;
    maxTokensPerProject: number;
    maxSourcesPerType: number;
    maxTotalSources: number;
    minRelevanceScore: number;
    minCohesion: number;
    optimizationLevel: number;
    compressionEnabled: boolean;
    summaryEnabled: boolean;
    clusteringEnabled: boolean;
    cacheTTLMinutes: number;
    enableCache: boolean;
    topicModelType: 'tfidf' | 'lda' | 'bert';
    maxTopicsPerDocument: number;
    timeoutSeconds: number;
    maxConcurrentAssemblies: number;
}
/**
 * Conversation context (for multi-turn conversations)
 */
export interface ConversationContext {
    id: string;
    tenantId: string;
    projectId: string;
    userId: string;
    conversationId: string;
    messages: {
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
        context?: AssembledContext;
    }[];
    currentContext?: AssembledContext;
    contextHistory: AssembledContext[];
    topics: ExtractedTopic[];
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
    ttl?: number;
}
/**
 * Context update request
 */
export interface UpdateContextRequest {
    contextId: string;
    additions?: ContextSourceItem[];
    removals?: string[];
    recalculate?: boolean;
    reoptimize?: boolean;
}
/**
 * Context comparison result
 */
export interface ContextComparison {
    context1Id: string;
    context2Id: string;
    similarity: number;
    sourceOverlap: number;
    topicDifferences: {
        onlyIn1: ExtractedTopic[];
        onlyIn2: ExtractedTopic[];
        common: ExtractedTopic[];
    };
    qualityDifference: number;
}
/**
 * Context source ranking for selection
 */
export interface RankedContextSource extends ContextSourceItem {
    rank: number;
    score: number;
    scoreBreakdown: {
        relevance: number;
        recency: number;
        importance: number;
        diversity: number;
    };
    reason: string;
}
/**
 * Context assembly metrics for monitoring
 */
export interface ContextAssemblyMetrics {
    requestId: string;
    userId: string;
    projectId: string;
    totalTimeMs: number;
    extractionTimeMs?: number;
    clusteringTimeMs?: number;
    rankingTimeMs?: number;
    optimizationTimeMs?: number;
    sourcesAvailable: number;
    sourcesSelected: number;
    topicsExtracted: number;
    clustersGenerated: number;
    finalTokenCount: number;
    relevanceScore: number;
    qualityLevel: ContextQualityLevel;
    cacheHit: boolean;
    timestamp: Date;
}
/**
 * Batch context assembly request
 */
export interface BatchContextAssemblyRequest {
    requests: ContextAssemblyRequest[];
    parallel?: boolean;
}
/**
 * Batch context assembly response
 */
export interface BatchContextAssemblyResponse {
    contexts: AssembledContext[];
    successful: number;
    failed: number;
    errors?: Array<{
        requestIndex: number;
        error: string;
    }>;
    totalTimeMs: number;
}
/**
 * Query expansion for better context retrieval
 */
export interface ExpandedQuery {
    original: string;
    expanded: string;
    synonyms: string[];
    relatedTerms: string[];
    entities: string[];
    expandedEmbedding?: number[];
}
/**
 * Context invalidation request
 */
export interface ContextInvalidationRequest {
    contextIds?: string[];
    projectId?: string;
    userId?: string;
    sourceId?: string;
    reason: string;
}
//# sourceMappingURL=ai-context.types.d.ts.map
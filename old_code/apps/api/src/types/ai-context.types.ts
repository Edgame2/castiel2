/**
 * AI Chat Context Types
 * Context assembly for AI-powered chat with topic extraction, clustering, and optimization
 */

export enum ContextSourceType {
  SHARD = 'SHARD',
  ACTIVITY_LOG = 'ACTIVITY_LOG',
  RECOMMENDATION = 'RECOMMENDATION',
  TEMPLATE = 'TEMPLATE',
  RELATED_LINK = 'RELATED_LINK',
  USER_PREFERENCE = 'USER_PREFERENCE',
  SEARCH_RESULT = 'SEARCH_RESULT',
  CONVERSATION_HISTORY = 'CONVERSATION_HISTORY',
}

export enum TopicCategory {
  TECHNICAL = 'TECHNICAL',
  BUSINESS = 'BUSINESS',
  PROCESS = 'PROCESS',
  PLANNING = 'PLANNING',
  ANALYSIS = 'ANALYSIS',
  DOCUMENTATION = 'DOCUMENTATION',
  REQUIREMENTS = 'REQUIREMENTS',
  WORKFLOW = 'WORKFLOW',
  DECISION = 'DECISION',
  OTHER = 'OTHER',
}

export enum ContextQualityLevel {
  HIGH = 'HIGH',           // 0.8-1.0 relevance
  MEDIUM = 'MEDIUM',       // 0.5-0.79 relevance
  LOW = 'LOW',             // 0.2-0.49 relevance
  MINIMAL = 'MINIMAL',     // <0.2 relevance
}

/**
 * Extracted topic from document or context
 */
export interface ExtractedTopic {
  id: string;
  name: string;
  category: TopicCategory;
  keywords: string[];
  relevanceScore: number;        // 0-1
  frequency: number;             // How many times mentioned
  entities?: string[];           // Named entities (names, organizations, etc.)
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
  coherenceScore: number;        // 0-1 (how well topics fit together)
  summary: string;
  relatedClusters?: string[];    // IDs of related clusters
}

/**
 * Context source item (shard, activity, etc.)
 */
export interface ContextSourceItem {
  id: string;
  sourceType: ContextSourceType;
  sourceId: string;              // ID in original container
  sourceName: string;
  content: string;               // Extracted text content
  summary?: string;              // Optional summary
  url?: string;                  // Link to source
  createdAt: Date;
  updatedAt?: Date;

  // Relevance scoring
  relevanceScore: number;        // 0-1
  relevanceReason?: string;
  topicMatches?: string[];       // Matched topic IDs

  // Token estimation
  estimatedTokens: number;
  actualTokens?: number;

  // Metadata
  metadata?: {
    author?: string;
    category?: string;
    tags?: string[];
    priority?: number;
    weight?: number;             // User importance weight
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

  // Query information
  query: string;
  queryEmbedding?: number[];
  queryTopics: ExtractedTopic[];

  // Context composition
  sources: ContextSourceItem[];
  clusters: TopicCluster[];
  selectedShards: string[];      // IDs of selected shards
  selectedActivities: string[];  // IDs of selected activities
  selectedRecommendations: string[];

  // Summary and statistics
  summary: string;
  contextLength: number;         // Total tokens
  contextLengthPercentage: number; // % of token budget
  qualityLevel: ContextQualityLevel;
  relevanceScore: number;        // 0-1 overall relevance

  // Optimization
  optimizationApplied?: string[];
  compressionRatio?: number;     // Original vs compressed tokens

  // Metadata
  createdAt: Date;
  expiresAt: Date;               // Cache expiry
  ttl?: number;                  // TTL for cleanup
}

/**
 * Context assembly request
 */
export interface ContextAssemblyRequest {
  projectId: string;
  userId: string;
  query: string;
  maxTokens?: number;            // Default: 4000
  minRelevance?: number;         // Default: 0.5
  includeHistory?: boolean;      // Include conversation history
  focusTopics?: string[];        // Focus on specific topics
  excludeSourceTypes?: ContextSourceType[];
  maxSourcesPerType?: number;    // Limit sources per type
}

/**
 * Context assembly response
 */
export interface ContextAssemblyWarning {
  type: 'truncation' | 'empty_context' | 'permission_filtered' | 'low_relevance' | 'service_unavailable';
  severity: 'info' | 'warning' | 'error';
  message: string;
  details?: Record<string, any>;
  suggestion?: string;
}

export interface ContextAssemblyResponse {
  context: AssembledContext;
  executionTimeMs: number;
  warnings?: ContextAssemblyWarning[];
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
  maxTopics?: number;            // Default: 10
  minRelevance?: number;         // Default: 0.3
  categorizationModel?: string;  // 'tfidf', 'lda', 'bert'
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

  // Optimization parameters
  maxTokens: number;
  compressionLevel: number;      // 0-1 (higher = more aggressive)
  priorityStrategy: 'relevance' | 'recency' | 'frequency' | 'hybrid';
  summaryEnabled: boolean;
  summaryCompressionRatio?: number;

  // Clustering
  clusteringEnabled: boolean;
  minClusterCoherence?: number;

  // Metadata
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
  queryHash: string;             // Hash of normalized query
  context: AssembledContext;
  generatedAt: Date;
  expiresAt: Date;
  hitCount: number;              // Cache hit tracking
  version: number;               // For invalidation
}

/**
 * Context similarity metrics
 */
export interface ContextSimilarity {
  sourceId1: string;
  sourceId2: string;
  similarity: number;            // 0-1 cosine similarity
  commonTopics: string[];
  topicOverlap: number;          // 0-1
  euclideanDistance: number;
}

/**
 * Context quality metrics
 */
export interface ContextQualityMetrics {
  contextId: string;
  overallQuality: number;        // 0-1
  relevanceScore: number;
  coherenceScore: number;        // How well topics fit together
  diversityScore: number;        // 0-1 (variety of topics)
  tokenEfficiency: number;       // Quality per token ratio
  retrievalTime: number;         // Time to assemble (ms)
  tokenCompression: number;      // % reduction achieved
}

/**
 * Context assembly configuration
 */
export interface ContextAssemblyConfig {
  enabled: boolean;
  
  // Token budget
  defaultMaxTokens: number;      // Default: 4000
  maxTokensPerProject: number;   // Default: 8000
  
  // Source limits
  maxSourcesPerType: number;     // Default: 10
  maxTotalSources: number;       // Default: 50
  
  // Quality thresholds
  minRelevanceScore: number;     // Default: 0.5
  minCohesion: number;           // Default: 0.3
  
  // Optimization
  optimizationLevel: number;     // 0-1 (higher = more aggressive)
  compressionEnabled: boolean;
  summaryEnabled: boolean;
  clusteringEnabled: boolean;
  
  // Caching
  cacheTTLMinutes: number;       // Default: 30
  enableCache: boolean;
  
  // Topic extraction
  topicModelType: 'tfidf' | 'lda' | 'bert';
  maxTopicsPerDocument: number;  // Default: 10
  
  // Performance
  timeoutSeconds: number;        // Default: 30
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
  
  // Conversation state
  currentContext?: AssembledContext;
  contextHistory: AssembledContext[];
  topics: ExtractedTopic[];
  
  // Metadata
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
  removals?: string[];           // Source IDs to remove
  recalculate?: boolean;
  reoptimize?: boolean;
}

/**
 * Context comparison result
 */
export interface ContextComparison {
  context1Id: string;
  context2Id: string;
  similarity: number;            // 0-1
  sourceOverlap: number;         // % of sources in common
  topicDifferences: {
    onlyIn1: ExtractedTopic[];
    onlyIn2: ExtractedTopic[];
    common: ExtractedTopic[];
  };
  qualityDifference: number;     // Quality2 - Quality1
}

/**
 * Context source ranking for selection
 */
export interface RankedContextSource extends ContextSourceItem {
  rank: number;
  score: number;                 // 0-1 combined score
  scoreBreakdown: {
    relevance: number;
    recency: number;
    importance: number;
    diversity: number;           // Reduces redundancy
  };
  reason: string;                // Why this was selected
}

/**
 * Context assembly metrics for monitoring
 */
export interface ContextAssemblyMetrics {
  requestId: string;
  userId: string;
  projectId: string;
  
  // Timing
  totalTimeMs: number;
  extractionTimeMs?: number;
  clusteringTimeMs?: number;
  rankingTimeMs?: number;
  optimizationTimeMs?: number;
  
  // Statistics
  sourcesAvailable: number;
  sourcesSelected: number;
  topicsExtracted: number;
  clustersGenerated: number;
  finalTokenCount: number;
  
  // Quality
  relevanceScore: number;
  qualityLevel: ContextQualityLevel;
  
  // Cache
  cacheHit: boolean;
  
  timestamp: Date;
}

/**
 * Batch context assembly request
 */
export interface BatchContextAssemblyRequest {
  requests: ContextAssemblyRequest[];
  parallel?: boolean;            // Parallel vs sequential
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
  contextIds?: string[];         // Specific contexts
  projectId?: string;            // All project contexts
  userId?: string;               // All user contexts
  sourceId?: string;             // All contexts using source
  reason: string;
}

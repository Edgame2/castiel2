/**
 * AI Context Assembly Types
 * Enhanced context assembly with topic extraction and quality scoring
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
 * Extracted topic
 */
export interface ExtractedTopic {
  id: string;
  name: string;
  category: TopicCategory;
  keywords: string[];
  relevanceScore: number;        // 0-1
  frequency: number;
  entities?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  metadata?: Record<string, any>;
}

/**
 * Topic cluster
 */
export interface TopicCluster {
  id: string;
  name: string;
  topics: ExtractedTopic[];
  coherenceScore: number;        // 0-1
  summary: string;
  relatedClusters?: string[];
}

/**
 * Context source item
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
  relevanceScore: number;        // 0-1
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
 * Assembled context for AI
 */
export interface AssembledContext {
  id: string;
  tenantId: string;
  projectId?: string;
  userId: string;
  query: string;
  queryEmbedding?: number[];
  queryTopics: ExtractedTopic[];
  sources: ContextSourceItem[];
  clusters: TopicCluster[];
  selectedShards: string[];
  selectedActivities: string[];
  summary: string;
  contextLength: number;         // Total tokens
  contextLengthPercentage: number;
  qualityLevel: ContextQualityLevel;
  relevanceScore: number;        // 0-1 overall relevance
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
  projectId?: string;
  userId: string;
  query: string;
  maxTokens?: number;            // Default: 4000
  minRelevance?: number;         // Default: 0.5
  includeHistory?: boolean;
  focusTopics?: string[];
  excludeSourceTypes?: ContextSourceType[];
  maxSourcesPerType?: number;
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
 * Expanded query
 */
export interface ExpandedQuery {
  original: string;
  expanded: string;
  synonyms: string[];
  relatedTerms: string[];
  entities: string[];
}

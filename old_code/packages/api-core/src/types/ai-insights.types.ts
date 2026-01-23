/**
 * AI Insights Types
 * Core types for the insight generation pipeline
 */

// ============================================
// Insight Types
// ============================================

export type InsightType =
  | 'summary'
  | 'analysis'
  | 'comparison'
  | 'recommendation'
  | 'prediction'
  | 'extraction'
  | 'search'
  | 'generation';

export type InsightTrigger =
  | 'on_demand'
  | 'proactive'
  | 'scheduled'
  | 'event_driven'
  | 'widget';

export type InsightFormat =
  | 'brief'
  | 'detailed'
  | 'bullets'
  | 'table'
  | 'chart'
  | 'structured';

// ============================================
// Context Scope
// ============================================

export interface ContextScope {
  // Primary target
  shardId?: string;
  shardTypeId?: string;

  // Broader scope
  projectId?: string;
  companyId?: string;
  portfolioId?: string;

  // Time constraints
  timeRange?: {
    from: Date;
    to: Date;
  };

  // Filters
  tags?: string[];
  status?: string[];

  // Limits
  maxShards?: number;
  maxTokens?: number;
}

// ============================================
// Intent Analysis
// ============================================

export interface IntentAnalysisResult {
  // Classification
  insightType: InsightType;
  confidence: number;

  // Multi-intent support (for queries with multiple intents)
  isMultiIntent?: boolean;
  secondaryIntents?: Array<{
    type: InsightType;
    confidence: number;
    query?: string; // Decomposed sub-query for this intent
  }>;

  // Extracted entities
  entities: ExtractedEntity[];

  // Resolved scope
  scope: ContextScope;

  // Template recommendation
  suggestedTemplateId?: string;

  // Complexity assessment
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTokens: number;
}

export interface ExtractedEntity {
  type: 'shard' | 'shard_type' | 'time_range' | 'metric' | 'action' | 'comparison_target';
  value: string;
  shardId?: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

// ============================================
// Context Assembly
// ============================================

export interface AssembledContext {
  // Primary context
  primary: ContextChunk;

  // Related context
  related: ContextChunk[];

  // RAG results
  ragChunks: RAGChunk[];

  // Metadata
  metadata: {
    templateId: string;
    templateName: string;
    totalTokens: number;
    sourceCount: number;
    assembledAt: Date;
  };

  // Formatted for LLM
  formattedContext: string;
}

export interface ContextChunk {
  shardId: string;
  shardName: string;
  shardTypeId: string;
  shardTypeName: string;

  content: Record<string, unknown>;
  tokenCount: number;

  // Relationship info
  relationshipType?: string;
  depth?: number;
}

export interface RAGChunk {
  id: string;
  shardId: string;
  shardName: string;
  shardTypeId: string;

  content: string;
  chunkIndex: number;

  score: number;
  highlight?: string;

  tokenCount: number;

  // Citation metadata (for web search results)
  citation?: {
    url: string;
    title: string;
    domain: string;
    scrapedAt?: string;
    accessedAt?: string;
  };
}

// ============================================
// LLM Execution
// ============================================

export interface LLMExecutionRequest {
  // Model selection
  modelId: string;

  // Prompts
  systemPrompt: string;
  userPrompt: string;

  // Context
  context: AssembledContext;

  // Options
  options: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    stream: boolean;
    tools?: ToolDefinition[];
    responseFormat?: 'text' | 'json';
  };
}

export interface LLMExecutionResult {
  content: string;

  // Tool calls
  toolCalls?: ToolCallResult[];

  // Usage
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  // Metadata
  model: string;
  latencyMs: number;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCallResult {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

// ============================================
// Grounding
// ============================================

export interface GroundedResponse {
  // Original content
  originalContent: string;

  // With citations
  groundedContent: string;

  // Citations
  citations: Citation[];

  // Confidence
  overallConfidence: number;
  groundingScore: number;

  // Claims analysis
  claims: VerifiedClaim[];

  // Potential issues
  warnings: GroundingWarning[];
}

export interface Citation {
  id: string;
  text: string;

  source: {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    fieldPath?: string;
  };

  confidence: number;
  matchType: 'exact' | 'paraphrase' | 'inference';
}

export interface VerifiedClaim {
  claim: string;
  verified: boolean;
  confidence: number;
  sources: string[]; // Citation IDs
  category: 'factual' | 'analytical' | 'opinion' | 'prediction';
}

export interface GroundingWarning {
  type: 'unverified_claim' | 'low_confidence' | 'stale_data' | 'potential_hallucination';
  message: string;
  severity: 'low' | 'medium' | 'high';
  claimIndex?: number;
}

// ============================================
// Insight Request/Response
// ============================================

export interface InsightRequest {
  tenantId: string;
  userId: string;
  userRoles?: string[]; // User roles for permission checking (optional)

  // User input
  query: string;

  // Conversation context
  conversationId?: string;
  parentMessageId?: string;

  // Scope
  scopeMode?: 'global' | 'project';
  projectId?: string; // c_project shardId when scopeMode = 'project'
  scope?: ContextScope;

  // AI configuration
  assistantId?: string;
  modelId?: string;
  templateId?: string;

  // Content requirements
  requiredContentType?: 'text' | 'image' | 'audio' | 'video';
  allowContentFallback?: boolean;

  // Task characteristics
  taskComplexity?: 'simple' | 'moderate' | 'complex';

  // Budget constraints
  budget?: {
    maxCostUSD?: number;
    preferEconomy?: boolean;
  };

  // Options
  options?: {
    temperature?: number;
    maxTokens?: number;
    maxConversationTokens?: number; // Max tokens for conversation history (default: 4000)
    format?: InsightFormat;
    includeReasoning?: boolean;
    webSearchEnabled?: boolean;
    enableDeepSearch?: boolean;
    deepSearchPages?: number;
    toolsEnabled?: boolean;
    enableReranking?: boolean; // Enable semantic reranking of RAG results (default: true)
  };
}

export interface InsightResponse {
  // Generated content
  content: string;
  format: InsightFormat;

  // Grounding
  citations: Citation[];
  confidence: number;
  groundingScore: number;

  // Context used
  sources: {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    relevance: number;
  }[];

  // Suggested follow-ups
  suggestedQuestions: string[];

  // Actions
  suggestedActions?: {
    type: string;
    label: string;
    parameters: Record<string, unknown>;
  }[];

  // Usage
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  latencyMs: number;

  // Metadata
  insightType: InsightType;
  model: string;
  templateId: string;
  createdAt: Date;
  conversationId?: string; // Conversation ID (auto-created if not provided)
  
  // Warnings (e.g., ungrounded response, context quality issues)
  warnings?: Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    impact?: string;
  }>;
  
  // Extended metadata
  metadata?: {
    contextQuality?: any; // ContextQuality from ContextQualityService
    provider?: string;
    connectionId?: string;
    modelVersion?: string;
    [key: string]: unknown;
  };
}

// ============================================
// Streaming Events
// ============================================

export type InsightStreamEvent =
  | { type: 'start'; messageId: string; conversationId: string; model: string }
  | { type: 'context'; sources: ContextChunk[]; ragChunks: RAGChunk[] }
  | { type: 'delta'; content: string; index: number }
  | { type: 'tool_use'; toolCallId: string; name: string; status: string; result?: unknown }
  | { type: 'citation'; citations: Citation[] }
  | { type: 'reasoning'; step: string; content: string }
  | { type: 'complete'; response: InsightResponse }
  | { type: 'error'; code: string; message: string };

// ============================================
// Proactive Insights
// ============================================

export interface ProactiveInsightConfig {
  id: string;
  name: string;

  // Trigger
  trigger: {
    type: 'schedule' | 'event' | 'condition';

    // Schedule
    cron?: string;
    interval?: number;

    // Event
    eventTypes?: string[];

    // Condition
    conditions?: {
      field: string;
      operator: 'eq' | 'gt' | 'lt' | 'contains' | 'changed';
      value: unknown;
    }[];
  };

  // Scope
  scope: ContextScope;

  // Insight configuration
  insightType: InsightType;
  templateId?: string;
  customPrompt?: string;

  // Notification
  notification: {
    channels: ('email' | 'in_app' | 'webhook')[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
    recipients?: string[];
  };

  // Status
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export interface ProactiveInsightResult {
  configId: string;

  // Generated insight
  insight: InsightResponse;

  // What triggered it
  trigger: {
    type: string;
    details: Record<string, unknown>;
  };

  // Notifications sent
  notifications: {
    channel: string;
    recipient: string;
    status: 'sent' | 'failed';
    sentAt?: Date;
  }[];

  createdAt: Date;
}

// ============================================
// Quick Insight Types
// ============================================

export type QuickInsightType =
  | 'summary'
  | 'key_points'
  | 'risks'
  | 'opportunities'
  | 'next_steps'
  | 'comparison'
  | 'trends'
  | 'custom';

export interface QuickInsightRequest {
  shardId: string;
  type: QuickInsightType;
  customPrompt?: string;
  options?: {
    format?: InsightFormat;
    maxLength?: number;
    includeRelated?: boolean;
    modelId?: string;
  };
}

export interface QuickInsightResponse {
  id: string;
  shardId: string;
  type: QuickInsightType;

  content: string;
  format: InsightFormat;

  sources: {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    relevance: number;
  }[];

  confidence: number;
  groundingScore: number;

  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  latencyMs: number;

  suggestedQuestions: string[];
  suggestedActions?: {
    type: string;
    label: string;
    parameters: Record<string, unknown>;
  }[];

  createdAt: Date;
  expiresAt?: Date;
}

// ============================================
// Suggestion Types
// ============================================

export interface SuggestionRequest {
  shardId: string;
  limit?: number;
  context?: string;
}

export interface Suggestion {
  question: string;
  category: 'analysis' | 'summary' | 'extraction' | 'comparison' | 'prediction';
  priority: number;
}

export interface SuggestionResponse {
  shardId: string;
  suggestions: Suggestion[];
  generatedAt: Date;
}

// ============================================
// Widget Types
// ============================================

export type InsightWidgetType =
  | 'summary'
  | 'metrics'
  | 'trends'
  | 'risks'
  | 'opportunities'
  | 'activity'
  | 'custom';

export interface InsightWidgetConfig {
  id: string;
  dashboardId: string;
  type: InsightWidgetType;
  title: string;

  scope: ContextScope;

  config: {
    refreshInterval?: number; // Seconds
    maxItems?: number;
    format?: InsightFormat;
    customPrompt?: string;
  };

  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface InsightWidgetData {
  widgetId: string;
  type: InsightWidgetType;

  config: InsightWidgetConfig;

  data: {
    content?: string;
    items?: unknown[];
    metrics?: Record<string, number>;
    chart?: ChartData;
  };

  sources: {
    shardId: string;
    shardName: string;
    relevance: number;
  }[];
  confidence: number;

  generatedAt: Date;
  expiresAt: Date;

  status: 'fresh' | 'stale' | 'refreshing' | 'error';
  error?: string;
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area';
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

// ============================================
// Feedback Analytics
// ============================================

export interface FeedbackAnalytics {
  period: {
    from: Date;
    to: Date;
  };

  summary: {
    totalFeedback: number;
    averageRating: number;
    thumbsUpPercentage: number;
    regenerationRate: number;
    harmfulReportRate: number;
  };

  categoryBreakdown: {
    category: string;
    count: number;
    percentage: number;
  }[];

  trendByDay: {
    date: string;
    averageRating: number;
    feedbackCount: number;
  }[];

  byModel: {
    modelId: string;
    modelName: string;
    averageRating: number;
    feedbackCount: number;
  }[];

  byAssistant: {
    assistantId: string;
    assistantName: string;
    averageRating: number;
    feedbackCount: number;
  }[];
}

// ============================================
// Model Selection
// ============================================

/**
 * Response when required model is unavailable
 */
export interface ModelUnavailableResponse {
  success: false;
  error: 'MODEL_UNAVAILABLE' | 'NO_CONNECTIONS' | 'NO_CAPABILITY';
  message: string;
  requestedContentType?: string;
  availableAlternatives: Array<{
    modelId: string;
    modelName: string;
    contentType: string;
    reason: string;
  }>;
  availableTypes?: string[];
  suggestedAction: string;
}

/**
 * Request for model selection
 */
export interface ModelSelectionRequest {
  tenantId: string;
  userId: string;

  // Task characteristics
  query: string;
  insightType?: string;
  contextSize?: number;

  // Content requirements
  requiredContentType?: 'text' | 'image' | 'audio' | 'video';
  allowFallback?: boolean;

  // Constraints
  maxCostUSD?: number;
  maxLatencyMs?: number;
  preferQuality?: 'economy' | 'standard' | 'premium';

  // Overrides
  modelId?: string; // User explicit choice
}

/**
 * Result of successful model selection
 */
export interface ModelSelectionResult {
  success: true;
  connection: any; // AIConnectionCredentials
  model: any; // AIModel
  reason: string;
  estimatedCost: number;
  estimatedLatencyMs: number;
  alternatives: Array<{
    modelId: string;
    modelName: string;
    reason: string;
  }>;
}

/**
 * Result when model selection fails
 */
export interface ModelUnavailableResult {
  success: false;
  error: 'MODEL_UNAVAILABLE' | 'NO_CONNECTIONS' | 'NO_CAPABILITY';
  message: string;
  requestedContentType?: string;
  availableTypes: string[];
  suggestions: string[];
}






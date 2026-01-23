/**
 * AI Insights Types
 * Core types for the insight generation pipeline
 */
export type InsightType = 'summary' | 'analysis' | 'comparison' | 'recommendation' | 'prediction' | 'extraction' | 'search' | 'generation';
export type InsightTrigger = 'on_demand' | 'proactive' | 'scheduled' | 'event_driven' | 'widget';
export type InsightFormat = 'brief' | 'detailed' | 'bullets' | 'table' | 'chart' | 'structured';
export interface ContextScope {
    shardId?: string;
    shardTypeId?: string;
    projectId?: string;
    companyId?: string;
    portfolioId?: string;
    timeRange?: {
        from: Date;
        to: Date;
    };
    tags?: string[];
    status?: string[];
    maxShards?: number;
    maxTokens?: number;
}
export interface IntentAnalysisResult {
    insightType: InsightType;
    confidence: number;
    isMultiIntent?: boolean;
    secondaryIntents?: Array<{
        type: InsightType;
        confidence: number;
        query?: string;
    }>;
    entities: ExtractedEntity[];
    scope: ContextScope;
    suggestedTemplateId?: string;
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
export interface AssembledContext {
    primary: ContextChunk;
    related: ContextChunk[];
    ragChunks: RAGChunk[];
    metadata: {
        templateId: string;
        templateName: string;
        totalTokens: number;
        sourceCount: number;
        assembledAt: Date;
    };
    formattedContext: string;
}
export interface ContextChunk {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    shardTypeName: string;
    content: Record<string, unknown>;
    tokenCount: number;
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
    citation?: {
        url: string;
        title: string;
        domain: string;
        scrapedAt?: string;
        accessedAt?: string;
    };
}
export interface LLMExecutionRequest {
    modelId: string;
    systemPrompt: string;
    userPrompt: string;
    context: AssembledContext;
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
    toolCalls?: ToolCallResult[];
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
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
export interface GroundedResponse {
    originalContent: string;
    groundedContent: string;
    citations: Citation[];
    overallConfidence: number;
    groundingScore: number;
    claims: VerifiedClaim[];
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
    sources: string[];
    category: 'factual' | 'analytical' | 'opinion' | 'prediction';
}
export interface GroundingWarning {
    type: 'unverified_claim' | 'low_confidence' | 'stale_data' | 'potential_hallucination';
    message: string;
    severity: 'low' | 'medium' | 'high';
    claimIndex?: number;
}
export interface InsightRequest {
    tenantId: string;
    userId: string;
    userRoles?: string[];
    query: string;
    conversationId?: string;
    parentMessageId?: string;
    scopeMode?: 'global' | 'project';
    projectId?: string;
    scope?: ContextScope;
    assistantId?: string;
    modelId?: string;
    templateId?: string;
    requiredContentType?: 'text' | 'image' | 'audio' | 'video';
    allowContentFallback?: boolean;
    taskComplexity?: 'simple' | 'moderate' | 'complex';
    budget?: {
        maxCostUSD?: number;
        preferEconomy?: boolean;
    };
    options?: {
        temperature?: number;
        maxTokens?: number;
        maxConversationTokens?: number;
        format?: InsightFormat;
        includeReasoning?: boolean;
        webSearchEnabled?: boolean;
        enableDeepSearch?: boolean;
        deepSearchPages?: number;
        toolsEnabled?: boolean;
        enableReranking?: boolean;
    };
}
export interface InsightResponse {
    content: string;
    format: InsightFormat;
    citations: Citation[];
    confidence: number;
    groundingScore: number;
    sources: {
        shardId: string;
        shardName: string;
        shardTypeId: string;
        relevance: number;
    }[];
    suggestedQuestions: string[];
    suggestedActions?: {
        type: string;
        label: string;
        parameters: Record<string, unknown>;
    }[];
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    cost: number;
    latencyMs: number;
    insightType: InsightType;
    model: string;
    templateId: string;
    createdAt: Date;
    conversationId?: string;
}
export type InsightStreamEvent = {
    type: 'start';
    messageId: string;
    conversationId: string;
    model: string;
} | {
    type: 'context';
    sources: ContextChunk[];
    ragChunks: RAGChunk[];
} | {
    type: 'delta';
    content: string;
    index: number;
} | {
    type: 'tool_use';
    toolCallId: string;
    name: string;
    status: string;
    result?: unknown;
} | {
    type: 'citation';
    citations: Citation[];
} | {
    type: 'reasoning';
    step: string;
    content: string;
} | {
    type: 'complete';
    response: InsightResponse;
} | {
    type: 'error';
    code: string;
    message: string;
};
export interface ProactiveInsightConfig {
    id: string;
    name: string;
    trigger: {
        type: 'schedule' | 'event' | 'condition';
        cron?: string;
        interval?: number;
        eventTypes?: string[];
        conditions?: {
            field: string;
            operator: 'eq' | 'gt' | 'lt' | 'contains' | 'changed';
            value: unknown;
        }[];
    };
    scope: ContextScope;
    insightType: InsightType;
    templateId?: string;
    customPrompt?: string;
    notification: {
        channels: ('email' | 'in_app' | 'webhook')[];
        priority: 'low' | 'medium' | 'high' | 'urgent';
        recipients?: string[];
    };
    isActive: boolean;
    lastRun?: Date;
    nextRun?: Date;
}
export interface ProactiveInsightResult {
    configId: string;
    insight: InsightResponse;
    trigger: {
        type: string;
        details: Record<string, unknown>;
    };
    notifications: {
        channel: string;
        recipient: string;
        status: 'sent' | 'failed';
        sentAt?: Date;
    }[];
    createdAt: Date;
}
export type QuickInsightType = 'summary' | 'key_points' | 'risks' | 'opportunities' | 'next_steps' | 'comparison' | 'trends' | 'custom';
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
export type InsightWidgetType = 'summary' | 'metrics' | 'trends' | 'risks' | 'opportunities' | 'activity' | 'custom';
export interface InsightWidgetConfig {
    id: string;
    dashboardId: string;
    type: InsightWidgetType;
    title: string;
    scope: ContextScope;
    config: {
        refreshInterval?: number;
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
    query: string;
    insightType?: string;
    contextSize?: number;
    requiredContentType?: 'text' | 'image' | 'audio' | 'video';
    allowFallback?: boolean;
    maxCostUSD?: number;
    maxLatencyMs?: number;
    preferQuality?: 'economy' | 'standard' | 'premium';
    modelId?: string;
}
/**
 * Result of successful model selection
 */
export interface ModelSelectionResult {
    success: true;
    connection: any;
    model: any;
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
//# sourceMappingURL=ai-insights.types.d.ts.map
/**
 * AI Enrichment Types
 * Type definitions for AI enrichment pipeline
 */
/**
 * Enrichment processor types
 */
export declare enum EnrichmentProcessorType {
    ENTITY_EXTRACTION = "entity-extraction",
    CLASSIFICATION = "classification",
    SUMMARIZATION = "summarization",
    SENTIMENT_ANALYSIS = "sentiment-analysis",
    KEY_PHRASES = "key-phrases"
}
/**
 * Enrichment processor configuration
 */
export interface EnrichmentProcessorConfig {
    type: EnrichmentProcessorType;
    enabled: boolean;
    parameters?: Record<string, unknown>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}
/**
 * Enrichment configuration for a tenant/shard type
 */
export interface EnrichmentConfiguration {
    id: string;
    tenantId: string;
    shardTypeId?: string;
    name: string;
    description?: string;
    processors: EnrichmentProcessorConfig[];
    schedule?: EnrichmentSchedule;
    autoEnrich?: boolean;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastRunAt?: Date;
}
/**
 * Enrichment schedule configuration
 */
export interface EnrichmentSchedule {
    enabled: boolean;
    cronExpression: string;
    timezone?: string;
    lastExecutionAt?: Date;
    nextExecutionAt?: Date;
}
/**
 * Entity extracted from content
 */
export interface ExtractedEntity {
    type: string;
    text: string;
    confidence: number;
    startOffset?: number;
    endOffset?: number;
    metadata?: Record<string, unknown>;
}
/**
 * Classification result
 */
export interface ClassificationResult {
    category: string;
    confidence: number;
    subcategories?: string[];
    tags?: string[];
}
/**
 * Summarization result
 */
export interface SummarizationResult {
    summary: string;
    length: 'short' | 'medium' | 'long';
    keyPoints?: string[];
    wordCount: number;
}
/**
 * Sentiment analysis result
 */
export interface SentimentAnalysisResult {
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    score: number;
    confidence: number;
    aspects?: Array<{
        aspect: string;
        sentiment: string;
        score: number;
    }>;
}
/**
 * Key phrases result
 */
export interface KeyPhrasesResult {
    phrases: Array<{
        text: string;
        score: number;
    }>;
    topics?: string[];
}
/**
 * Enrichment results stored in shard metadata
 */
export interface EnrichmentResults {
    entities?: ExtractedEntity[];
    classification?: ClassificationResult;
    summary?: SummarizationResult;
    sentiment?: SentimentAnalysisResult;
    keyPhrases?: KeyPhrasesResult;
    enrichedAt: Date;
    enrichmentConfigId: string;
    processingTimeMs: number;
    model?: string;
    cost?: {
        promptTokens: number;
        completionTokens: number;
        totalCost: number;
    };
}
export type EnrichmentTriggerSource = 'manual' | 'scheduled' | 'auto';
/**
 * Enrichment job status
 */
export declare enum EnrichmentJobStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
/**
 * Enrichment job
 */
export interface EnrichmentJob {
    id: string;
    tenantId: string;
    shardId: string;
    configId: string;
    status: EnrichmentJobStatus;
    triggeredBy: EnrichmentTriggerSource;
    triggeredByUserId?: string;
    processors: EnrichmentProcessorType[];
    results?: EnrichmentResults;
    error?: string;
    errorCode?: string;
    retryCount: number;
    maxRetries: number;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    processingTimeMs?: number;
}
/**
 * Enrichment history entry
 */
export interface EnrichmentHistoryEntry {
    id: string;
    tenantId: string;
    shardId: string;
    configId: string;
    processors: EnrichmentProcessorType[];
    status: EnrichmentJobStatus;
    results?: EnrichmentResults;
    error?: string;
    enrichedAt: Date;
    processingTimeMs: number;
    triggeredBy: EnrichmentTriggerSource;
    userId?: string;
}
/**
 * Bulk enrichment request
 */
export interface BulkEnrichmentRequest {
    tenantId: string;
    shardIds?: string[];
    shardTypeId?: string;
    configId: string;
    force?: boolean;
    priority?: 'low' | 'normal' | 'high';
    triggeredBy?: EnrichmentTriggerSource;
    triggeredByUserId?: string;
}
/**
 * Bulk enrichment response
 */
export interface BulkEnrichmentResponse {
    batchId: string;
    tenantId: string;
    totalShards: number;
    jobsCreated: number;
    estimatedTimeMinutes: number;
    status: 'queued' | 'processing';
}
/**
 * Enrich single shard request
 */
export interface EnrichShardRequest {
    shardId: string;
    tenantId: string;
    configId: string;
    processors?: EnrichmentProcessorType[];
    force?: boolean;
    triggeredBy?: EnrichmentTriggerSource;
    triggeredByUserId?: string;
}
/**
 * Enrich shard response
 */
export interface EnrichShardResponse {
    jobId: string;
    shardId: string;
    status: EnrichmentJobStatus;
    message: string;
}
/**
 * Enrichment statistics
 */
export interface EnrichmentStatistics {
    tenantId: string;
    totalShards: number;
    enrichedShards: number;
    pendingShards: number;
    failedShards: number;
    averageProcessingTimeMs: number;
    totalCost: number;
    lastEnrichedAt?: Date;
    enrichmentsByProcessor: Record<EnrichmentProcessorType, number>;
}
/**
 * Enrichment error codes
 */
export declare enum EnrichmentErrorCode {
    SHARD_NOT_FOUND = "SHARD_NOT_FOUND",
    CONFIG_NOT_FOUND = "CONFIG_NOT_FOUND",
    PROCESSOR_FAILED = "PROCESSOR_FAILED",
    INVALID_CONFIG = "INVALID_CONFIG",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    INSUFFICIENT_CONTENT = "INSUFFICIENT_CONTENT",
    OPENAI_ERROR = "OPENAI_ERROR",
    TIMEOUT = "TIMEOUT"
}
/**
 * Enrichment error
 */
export declare class EnrichmentError extends Error {
    readonly code: EnrichmentErrorCode;
    readonly statusCode: number;
    readonly details?: Record<string, unknown> | undefined;
    constructor(message: string, code: EnrichmentErrorCode, statusCode?: number, details?: Record<string, unknown> | undefined);
}
/**
 * Default enrichment configuration
 */
export declare const DEFAULT_ENRICHMENT_CONFIG: Partial<EnrichmentConfiguration>;
/**
 * Validate enrichment configuration
 */
export declare function validateEnrichmentConfig(config: Partial<EnrichmentConfiguration>): boolean;
//# sourceMappingURL=enrichment.types.d.ts.map
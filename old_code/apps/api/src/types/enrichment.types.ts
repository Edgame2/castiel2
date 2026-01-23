/**
 * AI Enrichment Types
 * Type definitions for AI enrichment pipeline
 */

/**
 * Enrichment processor types
 */
export enum EnrichmentProcessorType {
  ENTITY_EXTRACTION = 'entity-extraction',
  CLASSIFICATION = 'classification',
  SUMMARIZATION = 'summarization',
  SENTIMENT_ANALYSIS = 'sentiment-analysis',
  KEY_PHRASES = 'key-phrases',
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
  shardTypeId?: string; // Optional: specific to a shard type
  name: string;
  description?: string;
  processors: EnrichmentProcessorConfig[];
  schedule?: EnrichmentSchedule;
  autoEnrich?: boolean; // Automatically enrich on shard creation/update
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
  cronExpression: string; // e.g., "0 0 * * *" for daily at midnight
  timezone?: string;
  lastExecutionAt?: Date;
  nextExecutionAt?: Date;
}

/**
 * Entity extracted from content
 */
export interface ExtractedEntity {
  type: string; // person, organization, location, date, etc.
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
  score: number; // -1 to 1
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
export enum EnrichmentJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
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
  userId?: string; // If manually triggered
}

/**
 * Bulk enrichment request
 */
export interface BulkEnrichmentRequest {
  tenantId: string;
  shardIds?: string[]; // If not provided, enrich all shards
  shardTypeId?: string; // Filter by shard type
  configId: string;
  force?: boolean; // Re-enrich even if already enriched
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
  processors?: EnrichmentProcessorType[]; // Override config processors
  force?: boolean; // Re-enrich even if already enriched
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
export enum EnrichmentErrorCode {
  SHARD_NOT_FOUND = 'SHARD_NOT_FOUND',
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  PROCESSOR_FAILED = 'PROCESSOR_FAILED',
  INVALID_CONFIG = 'INVALID_CONFIG',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_CONTENT = 'INSUFFICIENT_CONTENT',
  OPENAI_ERROR = 'OPENAI_ERROR',
  TIMEOUT = 'TIMEOUT',
}

/**
 * Enrichment error
 */
export class EnrichmentError extends Error {
  constructor(
    message: string,
    public readonly code: EnrichmentErrorCode,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'EnrichmentError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Default enrichment configuration
 */
export const DEFAULT_ENRICHMENT_CONFIG: Partial<EnrichmentConfiguration> = {
  enabled: true,
  autoEnrich: false,
  processors: [
    {
      type: EnrichmentProcessorType.ENTITY_EXTRACTION,
      enabled: true,
      model: 'gpt-4',
      temperature: 0.1,
      maxTokens: 1000,
    },
    {
      type: EnrichmentProcessorType.CLASSIFICATION,
      enabled: true,
      model: 'gpt-4',
      temperature: 0.1,
      maxTokens: 500,
    },
    {
      type: EnrichmentProcessorType.SUMMARIZATION,
      enabled: true,
      parameters: { length: 'medium' },
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 500,
    },
  ],
};

/**
 * Validate enrichment configuration
 */
export function validateEnrichmentConfig(config: Partial<EnrichmentConfiguration>): boolean {
  if (!config.tenantId) {
    throw new EnrichmentError(
      'tenantId is required',
      EnrichmentErrorCode.INVALID_CONFIG,
      400
    );
  }

  if (!config.name) {
    throw new EnrichmentError('name is required', EnrichmentErrorCode.INVALID_CONFIG, 400);
  }

  if (!config.processors || config.processors.length === 0) {
    throw new EnrichmentError(
      'At least one processor must be configured',
      EnrichmentErrorCode.INVALID_CONFIG,
      400
    );
  }

  // Validate each processor
  for (const processor of config.processors) {
    if (!Object.values(EnrichmentProcessorType).includes(processor.type)) {
      throw new EnrichmentError(
        `Invalid processor type: ${processor.type}`,
        EnrichmentErrorCode.INVALID_CONFIG,
        400
      );
    }

    if (processor.temperature !== undefined && (processor.temperature < 0 || processor.temperature > 2)) {
      throw new EnrichmentError(
        `Invalid temperature: ${processor.temperature}. Must be between 0 and 2`,
        EnrichmentErrorCode.INVALID_CONFIG,
        400
      );
    }

    if (processor.maxTokens !== undefined && processor.maxTokens < 1) {
      throw new EnrichmentError(
        `Invalid maxTokens: ${processor.maxTokens}. Must be greater than 0`,
        EnrichmentErrorCode.INVALID_CONFIG,
        400
      );
    }
  }

  // Validate schedule if provided
  if (config.schedule) {
    if (config.schedule.enabled && !config.schedule.cronExpression) {
      throw new EnrichmentError(
        'cronExpression is required when schedule is enabled',
        EnrichmentErrorCode.INVALID_CONFIG,
        400
      );
    }
  }

  return true;
}

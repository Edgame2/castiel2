/**
 * AI Enrichment Types
 * Type definitions for AI enrichment pipeline
 */
/**
 * Enrichment processor types
 */
export var EnrichmentProcessorType;
(function (EnrichmentProcessorType) {
    EnrichmentProcessorType["ENTITY_EXTRACTION"] = "entity-extraction";
    EnrichmentProcessorType["CLASSIFICATION"] = "classification";
    EnrichmentProcessorType["SUMMARIZATION"] = "summarization";
    EnrichmentProcessorType["SENTIMENT_ANALYSIS"] = "sentiment-analysis";
    EnrichmentProcessorType["KEY_PHRASES"] = "key-phrases";
})(EnrichmentProcessorType || (EnrichmentProcessorType = {}));
/**
 * Enrichment job status
 */
export var EnrichmentJobStatus;
(function (EnrichmentJobStatus) {
    EnrichmentJobStatus["PENDING"] = "pending";
    EnrichmentJobStatus["PROCESSING"] = "processing";
    EnrichmentJobStatus["COMPLETED"] = "completed";
    EnrichmentJobStatus["FAILED"] = "failed";
    EnrichmentJobStatus["CANCELLED"] = "cancelled";
})(EnrichmentJobStatus || (EnrichmentJobStatus = {}));
/**
 * Enrichment error codes
 */
export var EnrichmentErrorCode;
(function (EnrichmentErrorCode) {
    EnrichmentErrorCode["SHARD_NOT_FOUND"] = "SHARD_NOT_FOUND";
    EnrichmentErrorCode["CONFIG_NOT_FOUND"] = "CONFIG_NOT_FOUND";
    EnrichmentErrorCode["PROCESSOR_FAILED"] = "PROCESSOR_FAILED";
    EnrichmentErrorCode["INVALID_CONFIG"] = "INVALID_CONFIG";
    EnrichmentErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    EnrichmentErrorCode["INSUFFICIENT_CONTENT"] = "INSUFFICIENT_CONTENT";
    EnrichmentErrorCode["OPENAI_ERROR"] = "OPENAI_ERROR";
    EnrichmentErrorCode["TIMEOUT"] = "TIMEOUT";
})(EnrichmentErrorCode || (EnrichmentErrorCode = {}));
/**
 * Enrichment error
 */
export class EnrichmentError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'EnrichmentError';
        Error.captureStackTrace(this, this.constructor);
    }
}
/**
 * Default enrichment configuration
 */
export const DEFAULT_ENRICHMENT_CONFIG = {
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
export function validateEnrichmentConfig(config) {
    if (!config.tenantId) {
        throw new EnrichmentError('tenantId is required', EnrichmentErrorCode.INVALID_CONFIG, 400);
    }
    if (!config.name) {
        throw new EnrichmentError('name is required', EnrichmentErrorCode.INVALID_CONFIG, 400);
    }
    if (!config.processors || config.processors.length === 0) {
        throw new EnrichmentError('At least one processor must be configured', EnrichmentErrorCode.INVALID_CONFIG, 400);
    }
    // Validate each processor
    for (const processor of config.processors) {
        if (!Object.values(EnrichmentProcessorType).includes(processor.type)) {
            throw new EnrichmentError(`Invalid processor type: ${processor.type}`, EnrichmentErrorCode.INVALID_CONFIG, 400);
        }
        if (processor.temperature !== undefined && (processor.temperature < 0 || processor.temperature > 2)) {
            throw new EnrichmentError(`Invalid temperature: ${processor.temperature}. Must be between 0 and 2`, EnrichmentErrorCode.INVALID_CONFIG, 400);
        }
        if (processor.maxTokens !== undefined && processor.maxTokens < 1) {
            throw new EnrichmentError(`Invalid maxTokens: ${processor.maxTokens}. Must be greater than 0`, EnrichmentErrorCode.INVALID_CONFIG, 400);
        }
    }
    // Validate schedule if provided
    if (config.schedule) {
        if (config.schedule.enabled && !config.schedule.cronExpression) {
            throw new EnrichmentError('cronExpression is required when schedule is enabled', EnrichmentErrorCode.INVALID_CONFIG, 400);
        }
    }
    return true;
}
//# sourceMappingURL=enrichment.types.js.map
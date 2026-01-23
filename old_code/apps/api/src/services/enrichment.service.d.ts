/**
 * AI Enrichment Service
 * Manages AI enrichment pipeline for Shards with pluggable processors
 */
import { Container } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { EnrichmentJob, EnrichmentProcessorType, EnrichShardRequest, EnrichShardResponse, BulkEnrichmentRequest, BulkEnrichmentResponse, EnrichmentStatistics } from '../types/enrichment.types.js';
import { AzureOpenAIService } from './azure-openai.service.js';
/**
 * Base processor interface
 */
export interface IEnrichmentProcessor {
    process(text: string, config: Record<string, unknown>): Promise<unknown>;
    getType(): EnrichmentProcessorType;
}
/**
 * Enrichment Service
 */
export declare class EnrichmentService {
    private readonly container;
    private readonly redis;
    private readonly monitoring;
    private processors;
    private processingJobs;
    private retryTimeouts;
    constructor(container: Container, redis: Redis, azureOpenAI: AzureOpenAIService, monitoring: IMonitoringProvider);
    /**
     * Register a custom processor
     */
    registerProcessor(processor: IEnrichmentProcessor): void;
    /**
     * Enrich a single shard
     */
    enrichShard(request: EnrichShardRequest): Promise<EnrichShardResponse>;
    /**
     * Bulk enrich multiple shards
     */
    bulkEnrich(request: BulkEnrichmentRequest): Promise<BulkEnrichmentResponse>;
    /**
     * Get enrichment job status
     */
    getJobStatus(jobId: string, tenantId: string): Promise<EnrichmentJob | null>;
    /**
     * Get enrichment statistics for a tenant
     */
    getStatistics(tenantId: string): Promise<EnrichmentStatistics>;
    /**
     * Process a single enrichment job
     */
    private processJob;
    /**
     * Process batch jobs with priority
     */
    private processBatchJobs;
    /**
     * Helper: Get shard from Cosmos DB
     */
    private getShard;
    /**
     * Helper: Get enrichment configuration
     */
    private getEnrichmentConfig;
    /**
     * Helper: Get shards by filter
     */
    private getShardsByFilter;
    /**
     * Helper: Update shard with enrichment results
     */
    private updateShardEnrichment;
    /**
     * Helper: Invalidate shard cache
     */
    private invalidateShardCache;
    /**
     * Helper: Store job in Redis
     */
    private storeJob;
    /**
     * Helper: Update job in Redis
     */
    private updateJob;
    /**
     * Helper: Save enrichment history
     */
    private saveEnrichmentHistory;
}
//# sourceMappingURL=enrichment.service.d.ts.map
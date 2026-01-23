/**
 * AI Enrichment Service
 * Manages AI enrichment pipeline for Shards with pluggable processors
 */

import type { Container } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  EnrichmentJob,
  EnrichmentJobStatus,
  EnrichmentProcessorType,
  EnrichmentConfiguration,
  EnrichmentResults,
  EnrichmentHistoryEntry,
  EnrichmentTriggerSource,
  EnrichShardRequest,
  EnrichShardResponse,
  BulkEnrichmentRequest,
  BulkEnrichmentResponse,
  EnrichmentStatistics,
  EnrichmentError,
  EnrichmentErrorCode,
  ExtractedEntity,
  ClassificationResult,
  SummarizationResult,
  SentimentAnalysisResult,
  KeyPhrasesResult,
} from '../types/enrichment.types.js';
import type { Shard } from '../types/shard.types.js';
import { AzureOpenAIService } from './azure-openai.service.js';
import { extractTextFromShard } from '../utils/text-processing.utils.js';
import { DEFAULT_VECTORIZATION_CONFIG } from '../types/vectorization.types.js';
import { v4 as uuidv4 } from 'uuid';
import { CACHE_KEYS } from '@castiel/shared-types';

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
export class EnrichmentService {
  private processors = new Map<EnrichmentProcessorType, IEnrichmentProcessor>();
  private processingJobs = new Map<string, EnrichmentJob>();
  private retryTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly container: Container,
    private readonly redis: Redis,
    azureOpenAI: AzureOpenAIService,
    private readonly monitoring: IMonitoringProvider
  ) {
    // Register built-in processors
    this.registerProcessor(new EntityExtractionProcessor(azureOpenAI, monitoring));
    this.registerProcessor(new ClassificationProcessor(azureOpenAI, monitoring));
    this.registerProcessor(new SummarizationProcessor(azureOpenAI, monitoring));
    this.registerProcessor(new SentimentAnalysisProcessor(azureOpenAI, monitoring));
    this.registerProcessor(new KeyPhrasesProcessor(azureOpenAI, monitoring));
  }

  /**
   * Register a custom processor
   */
  registerProcessor(processor: IEnrichmentProcessor): void {
    this.processors.set(processor.getType(), processor);
    this.monitoring.trackEvent('enrichment-processor-registered', {
      type: processor.getType(),
    });
  }

  /**
   * Enrich a single shard
   */
  async enrichShard(request: EnrichShardRequest): Promise<EnrichShardResponse> {
    const startTime = Date.now();

    try {
      // Fetch configuration
      const config = await this.getEnrichmentConfig(request.configId, request.tenantId);

      if (!config) {
        throw new EnrichmentError(
          `Enrichment configuration not found: ${request.configId}`,
          EnrichmentErrorCode.CONFIG_NOT_FOUND,
          404
        );
      }

      if (!config.enabled) {
        throw new EnrichmentError(
          `Enrichment configuration is disabled: ${request.configId}`,
          EnrichmentErrorCode.INVALID_CONFIG,
          400
        );
      }

      // Fetch shard
      const shard = await this.getShard(request.shardId, request.tenantId);

      if (!shard) {
        throw new EnrichmentError(
          `Shard not found: ${request.shardId}`,
          EnrichmentErrorCode.SHARD_NOT_FOUND,
          404
        );
      }

      // Check if already enriched
      if (
        shard.metadata?.enrichment &&
        shard.metadata.enrichment.enrichedAt &&
        !request.force
      ) {
        this.monitoring.trackEvent('enrichment-skipped-already-enriched', {
          shardId: request.shardId,
          tenantId: request.tenantId,
        });

        return {
          jobId: 'already-enriched',
          shardId: request.shardId,
          status: EnrichmentJobStatus.COMPLETED,
          message: 'Shard already enriched. Use force=true to re-enrich.',
        };
      }

      const triggeredBy: EnrichmentTriggerSource = request.triggeredBy ?? 'manual';
      // Create enrichment job
      const job: EnrichmentJob = {
        id: uuidv4(),
        tenantId: request.tenantId,
        shardId: request.shardId,
        configId: request.configId,
        status: EnrichmentJobStatus.PENDING,
        triggeredBy,
        triggeredByUserId: request.triggeredByUserId,
        processors: request.processors || config.processors.filter((p) => p.enabled).map((p) => p.type),
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
      };

      // Store job in memory (for tracking) and Redis (for persistence)
      this.processingJobs.set(job.id, job);
      await this.storeJob(job);

      // Process asynchronously
      this.processJob(job, config, shard).catch((error) => {
        this.monitoring.trackException(error, {
          jobId: job.id,
          shardId: request.shardId,
        });
      });

      this.monitoring.trackMetric('enrichment-job-created', 1, {
        tenantId: request.tenantId,
        processors: job.processors.join(','),
      });

      return {
        jobId: job.id,
        shardId: request.shardId,
        status: EnrichmentJobStatus.PENDING,
        message: 'Enrichment job created successfully',
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;

      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        shardId: request.shardId,
        tenantId: request.tenantId,
        processingTimeMs,
      });

      throw error;
    }
  }

  /**
   * Bulk enrich multiple shards
   */
  async bulkEnrich(request: BulkEnrichmentRequest): Promise<BulkEnrichmentResponse> {
    const startTime = Date.now();
    const batchId = uuidv4();

    try {
      // Fetch configuration
      const config = await this.getEnrichmentConfig(request.configId, request.tenantId);

      if (!config) {
        throw new EnrichmentError(
          `Enrichment configuration not found: ${request.configId}`,
          EnrichmentErrorCode.CONFIG_NOT_FOUND,
          404
        );
      }

      // Get shards to enrich
      const shards = await this.getShardsByFilter(
        request.tenantId,
        request.shardIds,
        request.shardTypeId,
        request.force
      );

      const triggeredBy: EnrichmentTriggerSource = request.triggeredBy ?? 'manual';

      // Create jobs for each shard
      const jobs: EnrichmentJob[] = [];
      for (const shard of shards) {
        const job: EnrichmentJob = {
          id: uuidv4(),
          tenantId: request.tenantId,
          shardId: shard.id,
          configId: request.configId,
          status: EnrichmentJobStatus.PENDING,
          triggeredBy,
          triggeredByUserId: request.triggeredByUserId,
          processors: config.processors.filter((p) => p.enabled).map((p) => p.type),
          retryCount: 0,
          maxRetries: 3,
          createdAt: new Date(),
        };

        jobs.push(job);
        this.processingJobs.set(job.id, job);
        await this.storeJob(job);
      }

      // Store batch metadata
      await this.redis.setex(
        `enrichment:batch:${batchId}`,
        86400, // 24 hours
        JSON.stringify({
          batchId,
          tenantId: request.tenantId,
          totalShards: shards.length,
          jobIds: jobs.map((j) => j.id),
          createdAt: new Date().toISOString(),
        })
      );

      // Process jobs asynchronously with priority
      this.processBatchJobs(jobs, config, request.priority || 'normal').catch((error) => {
        this.monitoring.trackException(error, {
          batchId,
          tenantId: request.tenantId,
        });
      });

      this.monitoring.trackMetric('enrichment-bulk-job-created', jobs.length, {
        tenantId: request.tenantId,
        batchId,
      });

      return {
        batchId,
        tenantId: request.tenantId,
        totalShards: shards.length,
        jobsCreated: jobs.length,
        estimatedTimeMinutes: Math.ceil((shards.length * 30) / 60), // ~30s per shard
        status: 'queued',
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;

      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        tenantId: request.tenantId,
        processingTimeMs,
      });

      throw error;
    }
  }

  /**
   * Get enrichment job status
   */
  async getJobStatus(jobId: string, tenantId: string): Promise<EnrichmentJob | null> {
    // Check memory first
    const memoryJob = this.processingJobs.get(jobId);
    if (memoryJob) {
      return memoryJob;
    }

    // Check Redis
    const jobData = await this.redis.get(`enrichment:job:${jobId}`);
    if (!jobData) {
      return null;
    }

    const job = JSON.parse(jobData) as EnrichmentJob;
    if (job.tenantId !== tenantId) {
      return null; // Tenant isolation
    }

    return job;
  }

  /**
   * Get enrichment statistics for a tenant
   */
  async getStatistics(tenantId: string): Promise<EnrichmentStatistics> {
    const query = `
      SELECT 
        COUNT(1) as totalShards,
        SUM(CASE WHEN c.metadata.enrichment != null THEN 1 ELSE 0 END) as enrichedShards,
        AVG(c.metadata.enrichment.processingTimeMs) as averageProcessingTimeMs,
        MAX(c.metadata.enrichment.enrichedAt) as lastEnrichedAt
      FROM c
      WHERE c.tenantId = @tenantId AND c.type = 'shard'
    `;

    const { resources } = await this.container.items
      .query({
        query,
        parameters: [{ name: '@tenantId', value: tenantId }],
      })
      .fetchAll();

    const stats = resources[0] || {
      totalShards: 0,
      enrichedShards: 0,
      averageProcessingTimeMs: 0,
    };

    return {
      tenantId,
      totalShards: stats.totalShards || 0,
      enrichedShards: stats.enrichedShards || 0,
      pendingShards: (stats.totalShards || 0) - (stats.enrichedShards || 0),
      failedShards: 0, // Would need separate tracking
      averageProcessingTimeMs: stats.averageProcessingTimeMs || 0,
      totalCost: 0, // Would need separate cost tracking
      lastEnrichedAt: stats.lastEnrichedAt ? new Date(stats.lastEnrichedAt) : undefined,
      enrichmentsByProcessor: {
        [EnrichmentProcessorType.ENTITY_EXTRACTION]: 0,
        [EnrichmentProcessorType.CLASSIFICATION]: 0,
        [EnrichmentProcessorType.SUMMARIZATION]: 0,
        [EnrichmentProcessorType.SENTIMENT_ANALYSIS]: 0,
        [EnrichmentProcessorType.KEY_PHRASES]: 0,
      },
    };
  }

  /**
   * Process a single enrichment job
   */
  private async processJob(
    job: EnrichmentJob,
    config: EnrichmentConfiguration,
    shard: Shard
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Update job status
      job.status = EnrichmentJobStatus.PROCESSING;
      job.startedAt = new Date();
      await this.updateJob(job);

      // Extract text from shard
      const { text } = extractTextFromShard(
        shard,
        DEFAULT_VECTORIZATION_CONFIG.textSources
      );

      if (!text || text.trim().length < 10) {
        throw new EnrichmentError(
          'Insufficient content for enrichment',
          EnrichmentErrorCode.INSUFFICIENT_CONTENT,
          400
        );
      }

      // Initialize results
      const results: EnrichmentResults = {
        enrichedAt: new Date(),
        enrichmentConfigId: config.id,
        processingTimeMs: 0,
      };

      const totalPromptTokens = 0;
      const totalCompletionTokens = 0;
      const totalCost = 0;

      // Process each enabled processor
      for (const processorConfig of config.processors.filter((p) => p.enabled)) {
        if (!job.processors.includes(processorConfig.type)) {
          continue; // Skip if not requested
        }

        const processor = this.processors.get(processorConfig.type);
        if (!processor) {
          this.monitoring.trackEvent('enrichment-processor-not-found', {
            type: processorConfig.type,
          });
          continue;
        }

        try {
          const result = await processor.process(text, processorConfig.parameters || {});

          // Store result based on processor type
          switch (processorConfig.type) {
            case EnrichmentProcessorType.ENTITY_EXTRACTION:
              results.entities = result as ExtractedEntity[];
              break;
            case EnrichmentProcessorType.CLASSIFICATION:
              results.classification = result as ClassificationResult;
              break;
            case EnrichmentProcessorType.SUMMARIZATION:
              results.summary = result as SummarizationResult;
              break;
            case EnrichmentProcessorType.SENTIMENT_ANALYSIS:
              results.sentiment = result as SentimentAnalysisResult;
              break;
            case EnrichmentProcessorType.KEY_PHRASES:
              results.keyPhrases = result as KeyPhrasesResult;
              break;
          }

          this.monitoring.trackEvent('enrichment-processor-success', {
            type: processorConfig.type,
            jobId: job.id,
          });
        } catch (error) {
          this.monitoring.trackException(
            error instanceof Error ? error : new Error(String(error)),
            {
              processorType: processorConfig.type,
              jobId: job.id,
            }
          );
          // Continue with other processors even if one fails
        }
      }

      // Calculate processing time
      results.processingTimeMs = Date.now() - startTime;
      results.cost = {
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        totalCost,
      };

      // Update shard with enrichment results
      await this.updateShardEnrichment(shard.id, shard.tenantId, results);

      // Invalidate shard cache
      await this.invalidateShardCache(shard.id, shard.tenantId);

      // Save to enrichment history
      await this.saveEnrichmentHistory({
        id: uuidv4(),
        tenantId: job.tenantId,
        shardId: job.shardId,
        configId: job.configId,
        processors: job.processors,
        status: EnrichmentJobStatus.COMPLETED,
        results,
        enrichedAt: new Date(),
        processingTimeMs: results.processingTimeMs,
        triggeredBy: job.triggeredBy,
        userId: job.triggeredByUserId,
      });

      // Update job status
      job.status = EnrichmentJobStatus.COMPLETED;
      job.completedAt = new Date();
      job.processingTimeMs = results.processingTimeMs;
      job.results = results;
      await this.updateJob(job);

      this.monitoring.trackMetric('enrichment-job-completed', 1, {
        tenantId: job.tenantId,
        processingTimeMs: results.processingTimeMs,
      });
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;

      // Update job status
      job.status = EnrichmentJobStatus.FAILED;
      job.completedAt = new Date();
      job.processingTimeMs = processingTimeMs;
      job.error = error instanceof Error ? error.message : String(error);
      job.errorCode =
        error instanceof EnrichmentError ? error.code : EnrichmentErrorCode.PROCESSOR_FAILED;

      await this.updateJob(job);

      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        jobId: job.id,
        shardId: job.shardId,
        processingTimeMs,
      });

      // Retry if applicable
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = EnrichmentJobStatus.PENDING;
        await this.updateJob(job);

        // Retry after delay with proper error handling
        const retryDelay = 5000 * job.retryCount; // Exponential backoff
        const timeoutId = setTimeout(() => {
          // Remove timeout reference when executing
          this.retryTimeouts.delete(job.id);
          
          // Execute retry with proper error handling
          this.processJob(job, config, shard).catch((retryError) => {
            this.monitoring.trackException(retryError, {
              jobId: job.id,
              retryCount: job.retryCount,
              operation: 'enrichment.retry',
            });
          });
        }, retryDelay);
        
        // Track timeout for cleanup on shutdown
        this.retryTimeouts.set(job.id, timeoutId);
      }
    } finally {
      // Clean up from memory if completed or failed with max retries
      if (
        job.status === EnrichmentJobStatus.COMPLETED ||
        (job.status === EnrichmentJobStatus.FAILED && job.retryCount >= job.maxRetries)
      ) {
        this.processingJobs.delete(job.id);
        // Clear any pending retry timeout
        const timeoutId = this.retryTimeouts.get(job.id);
        if (timeoutId) {
          clearTimeout(timeoutId);
          this.retryTimeouts.delete(job.id);
        }
      }
    }
  }

  /**
   * Process batch jobs with priority
   */
  private async processBatchJobs(
    jobs: EnrichmentJob[],
    config: EnrichmentConfiguration,
    priority: 'low' | 'normal' | 'high'
  ): Promise<void> {
    const delayMs = priority === 'high' ? 1000 : priority === 'normal' ? 5000 : 10000;

    for (const job of jobs) {
      const shard = await this.getShard(job.shardId, job.tenantId);
      if (shard) {
        await this.processJob(job, config, shard);
        // Add delay between jobs to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Helper: Get shard from Cosmos DB
   */
  private async getShard(shardId: string, tenantId: string): Promise<Shard | null> {
    try {
      const { resource } = await this.container.item(shardId, tenantId).read<Shard>();
      return resource || null;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Helper: Get enrichment configuration
   */
  private async getEnrichmentConfig(
    configId: string,
    tenantId: string
  ): Promise<EnrichmentConfiguration | null> {
    try {
      const { resource } = await this.container
        .item(configId, tenantId)
        .read<EnrichmentConfiguration>();
      return resource || null;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create or update enrichment configuration in Cosmos DB
   * This ensures the config exists before triggering enrichment
   */
  async ensureEnrichmentConfig(config: EnrichmentConfiguration): Promise<EnrichmentConfiguration> {
    try {
      // Try to read existing config
      const existing = await this.getEnrichmentConfig(config.id, config.tenantId);
      
      if (existing) {
        // Update existing config
        const updated: EnrichmentConfiguration = {
          ...config,
          updatedAt: new Date(),
          createdAt: existing.createdAt, // Preserve original creation date
        };
        
        await this.container
          .item(config.id, config.tenantId)
          .replace(updated);
        
        return updated;
      } else {
        // Create new config
        const newConfig: EnrichmentConfiguration = {
          ...config,
          createdAt: config.createdAt || new Date(),
          updatedAt: new Date(),
        };
        
        await this.container.items.create(newConfig);
        
        this.monitoring.trackEvent('enrichment-config-created', {
          configId: config.id,
          tenantId: config.tenantId,
          shardTypeId: config.shardTypeId,
        });
        
        return newConfig;
      }
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'enrichment.ensureEnrichmentConfig',
        configId: config.id,
        tenantId: config.tenantId,
      });
      throw error;
    }
  }

  /**
   * Helper: Get shards by filter
   */
  private async getShardsByFilter(
    tenantId: string,
    shardIds?: string[],
    shardTypeId?: string,
    force?: boolean
  ): Promise<Shard[]> {
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.type = "shard"';
    const parameters: Array<{ name: string; value: string | string[] }> = [
      { name: '@tenantId', value: tenantId },
    ];

    if (shardIds && shardIds.length > 0) {
      query += ' AND ARRAY_CONTAINS(@shardIds, c.id)';
      parameters.push({ name: '@shardIds', value: shardIds });
    }

    if (shardTypeId) {
      query += ' AND c.shardTypeId = @shardTypeId';
      parameters.push({ name: '@shardTypeId', value: shardTypeId });
    }

    if (!force) {
      query += ' AND (c.metadata.enrichment = null OR c.metadata.enrichment.enrichedAt = null)';
    }

    const { resources } = await this.container.items
      .query<Shard>({
        query,
        parameters,
      })
      .fetchAll();

    return resources;
  }

  /**
   * Helper: Update shard with enrichment results
   */
  private async updateShardEnrichment(
    shardId: string,
    tenantId: string,
    results: EnrichmentResults
  ): Promise<void> {
    try {
      const shard = await this.getShard(shardId, tenantId);
      if (!shard) {
        throw new EnrichmentError(
          `Shard not found: ${shardId}`,
          EnrichmentErrorCode.SHARD_NOT_FOUND,
          404
        );
      }

      // Validate tenant isolation
      if (shard.tenantId !== tenantId) {
        throw new EnrichmentError(
          `Tenant mismatch: shard belongs to ${shard.tenantId}, requested ${tenantId}`,
          EnrichmentErrorCode.SHARD_NOT_FOUND,
          403
        );
      }

      shard.metadata = shard.metadata || {};
      shard.metadata.enrichment = results;
      shard.lastEnrichedAt = results.enrichedAt;
      shard.updatedAt = new Date();

      await this.container.items.upsert(shard);
    } catch (error) {
      // Re-throw EnrichmentError as-is
      if (error instanceof EnrichmentError) {
        throw error;
      }

      // Wrap other errors
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'enrichment.updateShardEnrichment',
        shardId,
        tenantId,
      });

      throw new EnrichmentError(
        `Failed to update shard enrichment: ${error instanceof Error ? error.message : String(error)}`,
        EnrichmentErrorCode.PROCESSOR_FAILED,
        500,
        error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : undefined
      );
    }
  }

  /**
   * Helper: Invalidate shard cache
   */
  private async invalidateShardCache(shardId: string, tenantId: string): Promise<void> {
    const cacheKey = CACHE_KEYS.shard(tenantId, shardId);
    await this.redis.del(cacheKey);

    this.monitoring.trackEvent('cache-invalidated', {
      key: cacheKey,
      reason: 'enrichment',
    });
  }

  /**
   * Helper: Store job in Redis
   */
  private async storeJob(job: EnrichmentJob): Promise<void> {
    await this.redis.setex(
      `enrichment:job:${job.id}`,
      86400, // 24 hours
      JSON.stringify(job)
    );
  }

  /**
   * Helper: Update job in Redis
   */
  private async updateJob(job: EnrichmentJob): Promise<void> {
    await this.storeJob(job);
  }

  /**
   * Helper: Save enrichment history
   */
  private async saveEnrichmentHistory(entry: EnrichmentHistoryEntry): Promise<void> {
    await this.container.items.create({
      ...entry,
      type: 'enrichment-history',
      partitionKey: entry.tenantId,
    });
  }
}

/**
 * Entity Extraction Processor
 */
class EntityExtractionProcessor implements IEnrichmentProcessor {
  constructor(
    private readonly azureOpenAI: AzureOpenAIService,
    private readonly monitoring: IMonitoringProvider
  ) {}

  getType(): EnrichmentProcessorType {
    return EnrichmentProcessorType.ENTITY_EXTRACTION;
  }

  async process(text: string, _config: Record<string, unknown>): Promise<ExtractedEntity[]> {
    const prompt = `Extract named entities from the following text. Return a JSON array of entities with type (person, organization, location, date, product, etc.), text, and confidence (0-1).

Text:
${text}

Return only the JSON array, no additional text.`;

    const response = await this.azureOpenAI.complete(prompt, {
      temperature: 0.1,
      maxTokens: 1000,
    });

    try {
      const entities = JSON.parse(response) as ExtractedEntity[];
      return entities;
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }
}

/**
 * Classification Processor
 */
class ClassificationProcessor implements IEnrichmentProcessor {
  constructor(
    private readonly azureOpenAI: AzureOpenAIService,
    private readonly monitoring: IMonitoringProvider
  ) {}

  getType(): EnrichmentProcessorType {
    return EnrichmentProcessorType.CLASSIFICATION;
  }

  async process(text: string, config: Record<string, unknown>): Promise<ClassificationResult> {
    const categories = (config.categories as string[]) || [
      'Technology',
      'Business',
      'Finance',
      'Healthcare',
      'Education',
      'Legal',
      'Marketing',
      'Other',
    ];

    const prompt = `Classify the following text into one of these categories: ${categories.join(', ')}. Also provide relevant tags and subcategories. Return JSON with category, confidence (0-1), subcategories[], and tags[].

Text:
${text}

Return only the JSON object, no additional text.`;

    const response = await this.azureOpenAI.complete(prompt, {
      temperature: 0.1,
      maxTokens: 500,
    });

    try {
      const result = JSON.parse(response) as ClassificationResult;
      return result;
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)));
      return {
        category: 'Other',
        confidence: 0,
        subcategories: [],
        tags: [],
      };
    }
  }
}

/**
 * Summarization Processor
 */
class SummarizationProcessor implements IEnrichmentProcessor {
  constructor(
    private readonly azureOpenAI: AzureOpenAIService,
    private readonly monitoring: IMonitoringProvider
  ) {}

  getType(): EnrichmentProcessorType {
    return EnrichmentProcessorType.SUMMARIZATION;
  }

  async process(text: string, config: Record<string, unknown>): Promise<SummarizationResult> {
    const length = (config.length as 'short' | 'medium' | 'long') || 'medium';
    const maxWords = length === 'short' ? 50 : length === 'medium' ? 150 : 300;

    const prompt = `Summarize the following text in approximately ${maxWords} words. Also extract 3-5 key points. Return JSON with summary, keyPoints[], and wordCount.

Text:
${text}

Return only the JSON object, no additional text.`;

    const response = await this.azureOpenAI.complete(prompt, {
      temperature: 0.3,
      maxTokens: 500,
    });

    try {
      const result = JSON.parse(response) as SummarizationResult;
      result.length = length;
      return result;
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)));
      return {
        summary: '',
        length,
        keyPoints: [],
        wordCount: 0,
      };
    }
  }
}

/**
 * Sentiment Analysis Processor
 */
class SentimentAnalysisProcessor implements IEnrichmentProcessor {
  constructor(
    private readonly azureOpenAI: AzureOpenAIService,
    private readonly monitoring: IMonitoringProvider
  ) {}

  getType(): EnrichmentProcessorType {
    return EnrichmentProcessorType.SENTIMENT_ANALYSIS;
  }

  async process(
    text: string,
    _config: Record<string, unknown>
  ): Promise<SentimentAnalysisResult> {
    const prompt = `Analyze the sentiment of the following text. Return JSON with sentiment (positive/negative/neutral/mixed), score (-1 to 1), and confidence (0-1).

Text:
${text}

Return only the JSON object, no additional text.`;

    const response = await this.azureOpenAI.complete(prompt, {
      temperature: 0.1,
      maxTokens: 300,
    });

    try {
      const result = JSON.parse(response) as SentimentAnalysisResult;
      return result;
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)));
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0,
      };
    }
  }
}

/**
 * Key Phrases Processor
 */
class KeyPhrasesProcessor implements IEnrichmentProcessor {
  constructor(
    private readonly azureOpenAI: AzureOpenAIService,
    private readonly monitoring: IMonitoringProvider
  ) {}

  getType(): EnrichmentProcessorType {
    return EnrichmentProcessorType.KEY_PHRASES;
  }

  async process(text: string, _config: Record<string, unknown>): Promise<KeyPhrasesResult> {
    const prompt = `Extract key phrases and topics from the following text. Return JSON with phrases array (text and score 0-1) and topics array.

Text:
${text}

Return only the JSON object, no additional text.`;

    const response = await this.azureOpenAI.complete(prompt, {
      temperature: 0.1,
      maxTokens: 500,
    });

    try {
      const result = JSON.parse(response) as KeyPhrasesResult;
      return result;
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)));
      return {
        phrases: [],
        topics: [],
      };
    }
  }
}

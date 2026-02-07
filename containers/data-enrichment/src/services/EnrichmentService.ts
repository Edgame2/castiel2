/**
 * Data Enrichment Service
 * AI enrichment and vectorization pipeline for shards
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { publishEnrichmentEvent } from '../events/publishers/EnrichmentEventPublisher';
import { v4 as uuidv4 } from 'uuid';
import {
  EnrichmentJob as EnrichmentJobType,
  EnrichmentJobStatus,
  EnrichmentProcessorType,
  EnrichmentConfiguration,
  EnrichmentResults,
  EnrichmentError,
  EnrichmentErrorCode,
  EnrichShardRequest,
  EnrichShardResponse,
  BulkEnrichmentRequest,
  BulkEnrichmentResponse,
  EnrichmentStatistics,
  ExtractedEntity,
  ClassificationResult,
  SummarizationResult,
  SentimentAnalysisResult,
  KeyPhrasesResult,
} from '../types/enrichment.types';
import { IEnrichmentProcessor } from './processors/IEnrichmentProcessor';
import {
  EntityExtractionProcessor,
  ClassificationProcessor,
  SummarizationProcessor,
  SentimentAnalysisProcessor,
  KeyPhrasesProcessor,
} from './processors';
import { extractTextFromShard } from '../utils/textExtraction';

export interface EnrichmentJob {
  jobId: string;
  tenantId: string;
  shardId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  enrichmentResults?: any;
  vectorizationResults?: any;
  startedAt?: Date | string;
  completedAt?: Date | string;
  error?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class EnrichmentService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private embeddingsClient: ServiceClient;
  private _aiServiceClient: ServiceClient;
  private processors = new Map<EnrichmentProcessorType, IEnrichmentProcessor>();
  private _runningJobs = new Set<string>();
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();

    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.embeddingsClient = new ServiceClient({
      baseURL: this.config.services.embeddings?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this._aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    // Register built-in processors
    const aiServiceUrl = this.config.services.ai_service?.url;
    this.registerProcessor(new EntityExtractionProcessor(app as any, aiServiceUrl));
    this.registerProcessor(new ClassificationProcessor(app as any, aiServiceUrl));
    this.registerProcessor(new SummarizationProcessor(app as any, aiServiceUrl));
    this.registerProcessor(new SentimentAnalysisProcessor(app as any, aiServiceUrl));
    this.registerProcessor(new KeyPhrasesProcessor(app as any, aiServiceUrl));
  }

  /**
   * Register a custom processor
   */
  registerProcessor(processor: IEnrichmentProcessor): void {
    this.processors.set(processor.getType(), processor);
    log.info('Enrichment processor registered', {
      type: processor.getType(),
      service: 'data-enrichment',
    });
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      // If app not available, return empty - will be handled by gateway/service mesh
      return '';
    }
    return generateServiceToken(this.app as any, {
      serviceId: 'data-enrichment',
      serviceName: 'data-enrichment',
      tenantId,
    });
  }

  /**
   * Get or create default enrichment configuration
   */
  private async getDefaultConfig(tenantId: string): Promise<EnrichmentConfiguration> {
    try {
      const container = getContainer('enrichment_configurations');
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.id = @id',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@id', value: 'default' },
          ],
        })
        .fetchAll();

      if (resources.length > 0) {
        return resources[0] as EnrichmentConfiguration;
      }

      // Create default configuration
      const defaultConfig: EnrichmentConfiguration = {
        id: 'default',
        tenantId,
        name: 'Default Enrichment Configuration',
        description: 'Default configuration for all shards',
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await container.items.create(defaultConfig, { partitionKey: tenantId } as any);
      return defaultConfig;
    } catch (error: any) {
      log.error('Failed to get default config', error, { tenantId, service: 'data-enrichment' });
      throw new EnrichmentError(
        'Failed to get enrichment configuration',
        EnrichmentErrorCode.CONFIG_NOT_FOUND,
        500
      );
    }
  }

  /**
   * Enrich a shard using processors
   */
  async enrichShard(request: EnrichShardRequest): Promise<EnrichShardResponse> {
    const jobId = uuidv4();

    try {
      // Get configuration
      const config = await this.getDefaultConfig(request.tenantId);

      if (!config.enabled) {
        throw new EnrichmentError(
          'Enrichment configuration is disabled',
          EnrichmentErrorCode.INVALID_CONFIG,
          400
        );
      }

      // Get shard
      const token = this.getServiceToken(request.tenantId);
      const shard = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${request.shardId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': request.tenantId,
          },
        }
      );

      if (!shard) {
        throw new EnrichmentError(
          `Shard not found: ${request.shardId}`,
          EnrichmentErrorCode.SHARD_NOT_FOUND,
          404
        );
      }

      // Check if already enriched
      if (shard.metadata?.enrichment && !request.force) {
        return {
          jobId: 'already-enriched',
          shardId: request.shardId,
          status: EnrichmentJobStatus.COMPLETED,
          message: 'Shard already enriched. Use force=true to re-enrich.',
        };
      }

      // Create job
      const job: EnrichmentJobType = {
        id: jobId,
        tenantId: request.tenantId,
        shardId: request.shardId,
        configId: config.id,
        status: EnrichmentJobStatus.PENDING,
        triggeredBy: request.triggeredBy || 'manual',
        triggeredByUserId: request.triggeredByUserId,
        processors: request.processors || config.processors.filter((p) => p.enabled).map((p) => p.type),
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
      };

      // Store job
      const container = getContainer('enrichment_jobs');
      await container.items.create(job, { partitionKey: request.tenantId } as any);

      // Process asynchronously
      this.processJobWithProcessors(job, config, shard).catch((error) => {
        log.error('Enrichment job processing failed', error, {
          jobId,
          shardId: request.shardId,
          service: 'data-enrichment',
        });
      });

      return {
        jobId,
        shardId: request.shardId,
        status: EnrichmentJobStatus.PENDING,
        message: 'Enrichment job created successfully',
      };
    } catch (error: any) {
      log.error('Failed to enrich shard', error, {
        shardId: request.shardId,
        tenantId: request.tenantId,
        service: 'data-enrichment',
      });
      throw error;
    }
  }

  /**
   * Process enrichment job with processors
   */
  private async processJobWithProcessors(
    job: EnrichmentJobType,
    config: EnrichmentConfiguration,
    shard: any
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Update job status
      job.status = EnrichmentJobStatus.PROCESSING;
      job.startedAt = new Date();
      await this.updateJob(job);

      // Extract text from shard
      const text = extractTextFromShard(shard);

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

      // Process each enabled processor
      for (const processorConfig of config.processors.filter((p) => p.enabled)) {
        if (!job.processors.includes(processorConfig.type)) {
          continue;
        }

        const processor = this.processors.get(processorConfig.type);
        if (!processor) {
          log.warn('Processor not found', {
            type: processorConfig.type,
            jobId: job.id,
            service: 'data-enrichment',
          });
          continue;
        }

        try {
          const result = await processor.process(text, {
            ...processorConfig.parameters,
            tenantId: job.tenantId,
          });

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
        } catch (error: any) {
          log.error('Processor failed', error, {
            processorType: processorConfig.type,
            jobId: job.id,
            service: 'data-enrichment',
          });
          // Continue with other processors
        }
      }

      // Calculate processing time
      results.processingTimeMs = Date.now() - startTime;

      // Update shard with enrichment results
      await this.updateShardEnrichment(job.shardId, job.tenantId, results);

      // Generate embeddings via embeddings service (enrichment-before-embedding flow)
      try {
        const token = this.getServiceToken(job.tenantId);
        await this.embeddingsClient.post(
          '/api/v1/shard-embeddings/generate',
          { shardId: job.shardId, forceRegenerate: false },
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : '',
              'X-Tenant-ID': job.tenantId,
            },
          }
        );
      } catch (embErr: unknown) {
        log.warn('Embedding generation failed after enrichment (enrichment succeeded)', {
          jobId: job.id,
          shardId: job.shardId,
          error: embErr instanceof Error ? embErr.message : String(embErr),
          service: 'data-enrichment',
        });
      }

      // Update job
      job.status = EnrichmentJobStatus.COMPLETED;
      job.completedAt = new Date();
      job.processingTimeMs = results.processingTimeMs;
      job.results = results;
      await this.updateJob(job);

      // Publish event
      await publishEnrichmentEvent('enrichment.job.completed', job.tenantId, {
        jobId: job.id,
        shardId: job.shardId,
        results,
      });
    } catch (error: any) {
      job.status = EnrichmentJobStatus.FAILED;
      job.completedAt = new Date();
      job.error = error instanceof Error ? error.message : String(error);
      job.errorCode = error instanceof EnrichmentError ? error.code : EnrichmentErrorCode.PROCESSOR_FAILED;
      await this.updateJob(job);

      await publishEnrichmentEvent('enrichment.job.failed', job.tenantId, {
        jobId: job.id,
        shardId: job.shardId,
        error: job.error,
      });
    }
  }

  /**
   * Update shard with enrichment results
   */
  private async updateShardEnrichment(
    shardId: string,
    tenantId: string,
    results: EnrichmentResults
  ): Promise<void> {
    try {
      const token = this.getServiceToken(tenantId);
      const shard = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${shardId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!shard) {
        throw new EnrichmentError(
          `Shard not found: ${shardId}`,
          EnrichmentErrorCode.SHARD_NOT_FOUND,
          404
        );
      }

      shard.metadata = shard.metadata || {};
      shard.metadata.enrichment = results;
      shard.updatedAt = new Date();

      await this.shardManagerClient.put<any>(
        `/api/v1/shards/${shardId}`,
        shard,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
    } catch (error: any) {
      log.error('Failed to update shard enrichment', error, {
        shardId,
        tenantId,
        service: 'data-enrichment',
      });
      throw error;
    }
  }

  /**
   * Update job in database
   */
  private async updateJob(job: EnrichmentJobType): Promise<void> {
    try {
      const container = getContainer('enrichment_jobs');
      await container.item(job.id, job.tenantId).replace({
        ...job,
        id: job.id,
        tenantId: job.tenantId,
        updatedAt: new Date(),
      });
    } catch (error: any) {
      log.error('Failed to update job', error, {
        jobId: job.id,
        service: 'data-enrichment',
      });
    }
  }

  /**
   * Trigger enrichment for a shard (legacy method - uses default config)
   */
  async triggerEnrichment(shardId: string, tenantId: string): Promise<EnrichmentJob> {
    // Use new enrichShard method with default config
    const response = await this.enrichShard({
      shardId,
      tenantId,
      configId: 'default',
      triggeredBy: 'manual',
    });

    // Get the job to return legacy format
    const job = await this.getEnrichmentJob(response.jobId, tenantId);
    if (!job) {
      throw new Error('Failed to create enrichment job');
    }

    // Convert to legacy format
    return {
      jobId: job.id,
      tenantId: job.tenantId,
      shardId: job.shardId,
      status: job.status === EnrichmentJobStatus.COMPLETED ? 'completed' :
              job.status === EnrichmentJobStatus.FAILED ? 'failed' :
              job.status === EnrichmentJobStatus.PROCESSING ? 'running' : 'pending',
      enrichmentResults: job.results,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.completedAt || job.createdAt,
    };
  }

  /**
   * Get enrichment job status
   */
  async getEnrichmentJob(jobId: string, tenantId: string): Promise<EnrichmentJobType | null> {
    try {
      const container = getContainer('enrichment_jobs');
      const { resource } = await container.item(jobId, tenantId).read<EnrichmentJobType>();
      return resource || null;
    } catch (error: any) {
      log.error('Failed to get enrichment job', error, {
        jobId,
        tenantId,
        service: 'data-enrichment',
      });
      return null;
    }
  }

  /**
   * Bulk enrich multiple shards
   */
  async bulkEnrich(request: BulkEnrichmentRequest): Promise<BulkEnrichmentResponse> {
    const batchId = uuidv4();

    try {
      // Get configuration
      const config = await this.getDefaultConfig(request.tenantId);

      if (!config.enabled) {
        throw new EnrichmentError(
          'Enrichment configuration is disabled',
          EnrichmentErrorCode.INVALID_CONFIG,
          400
        );
      }

      // Get shards to enrich
      const token = this.getServiceToken(request.tenantId);
      let shards: any[] = [];

      if (request.shardIds && request.shardIds.length > 0) {
        // Get specific shards
        for (const shardId of request.shardIds) {
          try {
            const shard = await this.shardManagerClient.get<any>(
              `/api/v1/shards/${shardId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'X-Tenant-ID': request.tenantId,
                },
              }
            );
            if (shard && (!shard.metadata?.enrichment || request.force)) {
              shards.push(shard);
            }
          } catch (error) {
            log.warn('Failed to get shard', { shardId, error, service: 'data-enrichment' });
          }
        }
      } else {
        // Get all shards (would need shard-manager list endpoint)
        // For now, return error if no shardIds provided
        throw new EnrichmentError(
          'shardIds must be provided for bulk enrichment',
          EnrichmentErrorCode.INVALID_CONFIG,
          400
        );
      }

      // Create jobs for each shard
      const jobs: EnrichmentJobType[] = [];
      for (const shard of shards) {
        const job: EnrichmentJobType = {
          id: uuidv4(),
          tenantId: request.tenantId,
          shardId: shard.id,
          configId: config.id,
          status: EnrichmentJobStatus.PENDING,
          triggeredBy: request.triggeredBy || 'manual',
          triggeredByUserId: request.triggeredByUserId,
          processors: config.processors.filter((p) => p.enabled).map((p) => p.type),
          retryCount: 0,
          maxRetries: 3,
          createdAt: new Date(),
        };

        jobs.push(job);
        const container = getContainer('enrichment_jobs');
        await container.items.create(job, { partitionKey: request.tenantId } as any);

        // Process asynchronously
        this.processJobWithProcessors(job, config, shard).catch((error) => {
          log.error('Bulk enrichment job failed', error, {
            jobId: job.id,
            shardId: shard.id,
            service: 'data-enrichment',
          });
        });
      }

      return {
        batchId,
        tenantId: request.tenantId,
        totalShards: shards.length,
        jobsCreated: jobs.length,
        estimatedTimeMinutes: Math.ceil((shards.length * 30) / 60), // ~30s per shard
        status: 'queued',
      };
    } catch (error: any) {
      log.error('Bulk enrichment failed', error, {
        tenantId: request.tenantId,
        service: 'data-enrichment',
      });
      throw error;
    }
  }

  /**
   * Get enrichment statistics
   */
  async getStatistics(tenantId: string): Promise<EnrichmentStatistics> {
    try {
      const container = getContainer('enrichment_jobs');
      const { resources: jobs } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
          parameters: [{ name: '@tenantId', value: tenantId }],
        })
        .fetchAll();

      const completed = jobs.filter((j) => j.status === EnrichmentJobStatus.COMPLETED);
      const failed = jobs.filter((j) => j.status === EnrichmentJobStatus.FAILED);
      const pending = jobs.filter((j) => j.status === EnrichmentJobStatus.PENDING);

      const totalProcessingTime = completed.reduce((sum, j) => sum + (j.processingTimeMs || 0), 0);
      const avgProcessingTime = completed.length > 0 ? totalProcessingTime / completed.length : 0;

      const enrichmentsByProcessor: Record<EnrichmentProcessorType, number> = {
        [EnrichmentProcessorType.ENTITY_EXTRACTION]: 0,
        [EnrichmentProcessorType.CLASSIFICATION]: 0,
        [EnrichmentProcessorType.SUMMARIZATION]: 0,
        [EnrichmentProcessorType.SENTIMENT_ANALYSIS]: 0,
        [EnrichmentProcessorType.KEY_PHRASES]: 0,
      };

      for (const job of completed) {
        for (const processor of job.processors || []) {
          enrichmentsByProcessor[processor] = (enrichmentsByProcessor[processor] || 0) + 1;
        }
      }

      return {
        tenantId,
        totalShards: jobs.length,
        enrichedShards: completed.length,
        pendingShards: pending.length,
        failedShards: failed.length,
        averageProcessingTimeMs: avgProcessingTime,
        totalCost: 0, // Would need cost tracking
        lastEnrichedAt: completed.length > 0
          ? completed.sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))[0].completedAt
          : undefined,
        enrichmentsByProcessor,
      };
    } catch (error: any) {
      log.error('Failed to get statistics', error, { tenantId, service: 'data-enrichment' });
      throw error;
    }
  }
}

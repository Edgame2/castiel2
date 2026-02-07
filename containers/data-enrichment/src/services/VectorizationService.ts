/**
 * Vectorization Service
 * Manages vectorization of shards with job-based processing
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { publishEnrichmentEvent } from '../events/publishers/EnrichmentEventPublisher.js';
import { v4 as uuidv4 } from 'uuid';
import {
  VectorizationJob,
  VectorizationStatus,
  VectorizeShardRequest,
  VectorizationStatusResponse,
  BatchVectorizeRequest,
  BatchVectorizeResponse,
  VectorizationResult,
  VectorizationError,
  VectorizationErrorCode,
  VectorizationConfig,
  DEFAULT_VECTORIZATION_CONFIG,
} from '../types/vectorization.types.js';
import { extractTextFromShard } from '../utils/textExtraction.js';

export class VectorizationService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private embeddingsClient: ServiceClient;
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
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app as any, {
      serviceId: 'data-enrichment',
      serviceName: 'data-enrichment',
      tenantId,
    });
  }

  /**
   * Vectorize a shard
   */
  async vectorizeShard(request: VectorizeShardRequest): Promise<VectorizationStatusResponse> {
    const jobId = uuidv4();

    try {
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
        throw new VectorizationError(
          `Shard not found: ${request.shardId}`,
          VectorizationErrorCode.SHARD_NOT_FOUND,
          404
        );
      }

      // Check if already vectorized
      if (shard.metadata?.embedding && !request.force) {
        return {
          jobId: 'already-vectorized',
          shardId: request.shardId,
          status: VectorizationStatus.COMPLETED,
          createdAt: new Date().toISOString(),
        };
      }

      // Merge config
      const config: VectorizationConfig = {
        ...DEFAULT_VECTORIZATION_CONFIG,
        ...request.config,
      };

      // Create job
      const job: VectorizationJob = {
        id: jobId,
        tenantId: request.tenantId,
        shardId: request.shardId,
        shardTypeId: shard.shardTypeId,
        status: VectorizationStatus.PENDING,
        config,
        priority: request.priority || 0,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
      };

      // Store job
      const container = getContainer('vectorization_jobs');
      await container.items.create(job, { partitionKey: request.tenantId } as any);

      // Process asynchronously
      this.processJob(job, shard).catch((error) => {
        log.error('Vectorization job processing failed', error, {
          jobId,
          shardId: request.shardId,
          service: 'data-enrichment',
        });
      });

      return {
        jobId,
        shardId: request.shardId,
        status: VectorizationStatus.PENDING,
        createdAt: job.createdAt.toISOString(),
      };
    } catch (error: any) {
      log.error('Failed to vectorize shard', error, {
        shardId: request.shardId,
        tenantId: request.tenantId,
        service: 'data-enrichment',
      });
      throw error;
    }
  }

  /**
   * Process vectorization job
   */
  private async processJob(job: VectorizationJob, shard: any): Promise<void> {
    const startTime = Date.now();

    try {
      // Update job status
      job.status = VectorizationStatus.IN_PROGRESS;
      job.startedAt = new Date();
      await this.updateJob(job);

      // Extract text from shard
      const text = extractTextFromShard(shard);

      if (!text || text.trim().length < 10) {
        throw new VectorizationError(
          'Insufficient content for vectorization',
          VectorizationErrorCode.TEXT_EXTRACTION_FAILED,
          400
        );
      }

      // Generate embedding
      const token = this.getServiceToken(job.tenantId);
      const embeddingResponse = await this.embeddingsClient.post<any>(
        '/api/v1/embeddings',
        {
          text,
          model: job.config.model,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': job.tenantId,
          },
        }
      );

      if (!embeddingResponse.embedding || !Array.isArray(embeddingResponse.embedding)) {
        throw new VectorizationError(
          'Failed to generate embedding',
          VectorizationErrorCode.EMBEDDING_API_ERROR,
          500
        );
      }

      const embedding = embeddingResponse.embedding;
      const dimensions = embedding.length;

      // Update shard with embedding
      await this.shardManagerClient.put<any>(
        `/api/v1/shards/${job.shardId}`,
        {
          ...shard,
          metadata: {
            ...shard.metadata,
            embedding,
            embeddingModel: job.config.model,
            vectorizedAt: new Date(),
          },
          updatedAt: new Date(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': job.tenantId,
          },
        }
      );

      // Calculate result
      const executionTime = Date.now() - startTime;
      const tokenCount = Math.ceil(text.length / 4); // Rough estimate

      const result: VectorizationResult = {
        vectorCount: 1,
        totalTokens: tokenCount,
        chunksProcessed: 1,
        model: job.config.model,
        dimensions,
        executionTimeMs: executionTime,
      };

      // Update job
      job.status = VectorizationStatus.COMPLETED;
      job.completedAt = new Date();
      job.result = result;
      await this.updateJob(job);

      // Publish event
      await publishEnrichmentEvent('vectorization.job.completed', job.tenantId, {
        jobId: job.id,
        shardId: job.shardId,
        result,
      });
    } catch (error: any) {
      job.status = VectorizationStatus.FAILED;
      job.completedAt = new Date();
      job.error = {
        code: error.code || VectorizationErrorCode.UNKNOWN_ERROR,
        message: error.message || 'Vectorization failed',
        details: error.details,
      };
      await this.updateJob(job);

      await publishEnrichmentEvent('vectorization.job.failed', job.tenantId, {
        jobId: job.id,
        shardId: job.shardId,
        error: job.error,
      });
    }
  }

  /**
   * Update job in database
   */
  private async updateJob(job: VectorizationJob): Promise<void> {
    try {
      const container = getContainer('vectorization_jobs');
      await container.item(job.id, job.tenantId).replace({
        ...job,
        id: job.id,
        tenantId: job.tenantId,
        updatedAt: new Date(),
      });
    } catch (error: any) {
      log.error('Failed to update vectorization job', error, {
        jobId: job.id,
        service: 'data-enrichment',
      });
    }
  }

  /**
   * Get vectorization job status
   */
  async getJobStatus(jobId: string, tenantId: string): Promise<VectorizationStatusResponse | null> {
    try {
      const container = getContainer('vectorization_jobs');
      const { resource: job } = await container.item(jobId, tenantId).read<VectorizationJob>();

      if (!job) {
        return null;
      }

      return {
        jobId: job.id,
        shardId: job.shardId,
        status: job.status,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
      };
    } catch (error: any) {
      log.error('Failed to get vectorization job', error, {
        jobId,
        tenantId,
        service: 'data-enrichment',
      });
      return null;
    }
  }

  /**
   * Batch vectorize shards
   */
  async batchVectorize(request: BatchVectorizeRequest): Promise<BatchVectorizeResponse> {
    const jobIds: string[] = [];

    try {
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
            if (shard && (!shard.metadata?.embedding || request.filter?.missingVectors)) {
              shards.push(shard);
            }
          } catch (error) {
            log.warn('Failed to get shard for batch vectorization', { shardId, error, service: 'data-enrichment' });
          }
        }
      } else {
        throw new VectorizationError(
          'shardIds must be provided for batch vectorization',
          VectorizationErrorCode.INVALID_CONFIG,
          400
        );
      }

      // Create jobs for each shard
      const config: VectorizationConfig = {
        ...DEFAULT_VECTORIZATION_CONFIG,
        ...request.config,
      };

      for (const shard of shards) {
        const job: VectorizationJob = {
          id: uuidv4(),
          tenantId: request.tenantId,
          shardId: shard.id,
          shardTypeId: shard.shardTypeId,
          status: VectorizationStatus.PENDING,
          config,
          priority: request.priority || 0,
          retryCount: 0,
          maxRetries: 3,
          createdAt: new Date(),
        };

        jobIds.push(job.id);
        const container = getContainer('vectorization_jobs');
        await container.items.create(job, { partitionKey: request.tenantId } as any);

        // Process asynchronously
        this.processJob(job, shard).catch((error) => {
          log.error('Batch vectorization job failed', error, {
            jobId: job.id,
            shardId: shard.id,
            service: 'data-enrichment',
          });
        });
      }

      return {
        jobIds,
        totalShards: shards.length,
      };
    } catch (error: any) {
      log.error('Batch vectorization failed', error, {
        tenantId: request.tenantId,
        service: 'data-enrichment',
      });
      throw error;
    }
  }
}

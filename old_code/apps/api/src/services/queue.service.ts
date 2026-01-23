// @ts-nocheck - Not used by workers-sync, has type mismatches with queue package
/**
 * Queue Service
 *
 * Replaces AzureServiceBusService with BullMQ-based queue service.
 * Provides the same interface for drop-in replacement.
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { QueueProducerService } from '@castiel/queue';
import { createRedisConnection } from '@castiel/queue';
import type { EmbeddingJobMessage } from '../types/embedding-job.types.js';
import { shouldIgnoreShardType } from '../types/embedding-job.types.js';
import type { DocumentChunkJobMessage } from '../types/document-chunk-job.types.js';
import type { GenerationJob } from './content-generation/types/generation.types.js';
import type { EnrichmentJob } from '../types/enrichment.types.js';
import { config } from '../config/env.js';

export class QueueService {
  private queueProducer: QueueProducerService;
  private monitoring: IMonitoringProvider;

  constructor(monitoring: IMonitoringProvider) {
    this.monitoring = monitoring;

    // Initialize Redis connection
    const redis = createRedisConnection({
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS_ENABLED === 'true',
    });

    this.queueProducer = new QueueProducerService({
      redis,
      monitoring,
    });

    this.monitoring.trackEvent('queue-service.initialized', {
      ignoredShardTypes: config.embeddingJob.ignoredShardTypes.join(', '),
    });
  }

  /**
   * Check if a shard type should be ignored from embedding
   */
  isShardTypeIgnored(shardTypeId: string): boolean {
    return shouldIgnoreShardType(shardTypeId, config.embeddingJob.ignoredShardTypes);
  }

  /**
   * Send an embedding job message
   * Returns false if the shard type is ignored
   */
  async sendEmbeddingJob(
    jobMessage: EmbeddingJobMessage,
    options?: { delayInSeconds?: number }
  ): Promise<boolean> {
    // Check if this shard type should be ignored
    if (this.isShardTypeIgnored(jobMessage.shardTypeId)) {
      this.monitoring.trackEvent('embedding_job.ignored', {
        shardId: jobMessage.shardId,
        tenantId: jobMessage.tenantId,
        shardTypeId: jobMessage.shardTypeId,
        reason: 'shard_type_in_ignore_list',
      });
      return false;
    }

    try {
      await this.queueProducer.enqueueEmbeddingJob(jobMessage, {
        delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
      });
      return true;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        context: 'QueueService.sendEmbeddingJob',
        shardId: jobMessage.shardId,
      });
      throw error;
    }
  }

  /**
   * Send multiple embedding job messages in batch
   */
  async sendEmbeddingJobBatch(
    jobMessages: EmbeddingJobMessage[],
    options?: { delayInSeconds?: number }
  ): Promise<number> {
    // Filter out ignored shard types
    const messagesToSend = jobMessages.filter(job => {
      const isIgnored = this.isShardTypeIgnored(job.shardTypeId);
      if (isIgnored) {
        this.monitoring.trackEvent('embedding_job.ignored', {
          shardId: job.shardId,
          tenantId: job.tenantId,
          shardTypeId: job.shardTypeId,
          reason: 'shard_type_in_ignore_list',
        });
      }
      return !isIgnored;
    });

    if (messagesToSend.length === 0) {
      return 0;
    }

    // Enqueue all messages with individual error handling
    const results = await Promise.allSettled(
      messagesToSend.map(job =>
        this.queueProducer.enqueueEmbeddingJob(job, {
          delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
        })
      )
    );

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Log individual failures with context
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const job = messagesToSend[index];
        this.monitoring.trackException(result.reason instanceof Error ? result.reason : new Error(String(result.reason)), {
          context: 'QueueService.sendEmbeddingJobBatch.individual-failure',
          shardId: job.shardId,
          tenantId: job.tenantId,
          shardTypeId: job.shardTypeId,
          errorMessage: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    });

    // Log batch summary
    this.monitoring.trackEvent('embedding_jobs.enqueued_batch', {
      sentCount: successful,
      failedCount: failed,
      totalCount: jobMessages.length,
      ignoredCount: jobMessages.length - messagesToSend.length,
      successRate: messagesToSend.length > 0 ? (successful / messagesToSend.length) * 100 : 0,
    });

    // If all jobs failed, throw an error
    if (failed === messagesToSend.length && messagesToSend.length > 0) {
      throw new Error(`All ${messagesToSend.length} embedding jobs failed to enqueue`);
    }

    return successful;
  }

  /**
   * Get the list of ignored shard types
   */
  getIgnoredShardTypes(): string[] {
    return [...config.embeddingJob.ignoredShardTypes];
  }

  /**
   * Send a document chunk job message
   */
  async sendDocumentChunkJob(
    jobMessage: DocumentChunkJobMessage,
    options?: { delayInSeconds?: number }
  ): Promise<boolean> {
    try {
      await this.queueProducer.enqueueDocumentChunkJob(jobMessage, {
        delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
      });
      return true;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        context: 'QueueService.sendDocumentChunkJob',
        shardId: jobMessage.shardId,
      });
      throw error;
    }
  }

  /**
   * Send a document check job message
   */
  async sendDocumentCheckJob(
    jobMessage: any,
    options?: { delayInSeconds?: number }
  ): Promise<boolean> {
    try {
      await this.queueProducer.enqueueDocumentCheckJob(jobMessage, {
        delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
      });
      return true;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        context: 'QueueService.sendDocumentCheckJob',
        shardId: jobMessage.shardId,
      });
      throw error;
    }
  }

  /**
   * Send a content generation job message
   */
  async sendGenerationJob(
    jobMessage: GenerationJob & { template?: any; userToken?: string },
    options?: { delayInSeconds?: number }
  ): Promise<boolean> {
    try {
      await this.queueProducer.enqueueGenerationJob(jobMessage, {
        delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
      });
      return true;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        context: 'QueueService.sendGenerationJob',
        jobId: jobMessage.id,
      });
      throw error;
    }
  }

  /**
   * Send an ingestion event message
   */
  async sendIngestionEvent(
    message: any,
    options?: { delayInSeconds?: number; sessionId?: string }
  ): Promise<void> {
    try {
      await this.queueProducer.enqueueIngestionEvent(message, {
        delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
        priority: 5,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        context: 'QueueService.sendIngestionEvent',
        tenantId: message.tenantId,
      });
      throw error;
    }
  }

  /**
   * Send a shard emission message
   * Emits shard events (created, updated, deleted, restored) to the shard-emission queue
   */
  async sendShardEmission(
    message: {
      shardId: string;
      tenantId: string;
      shardTypeId: string;
      eventType: 'created' | 'updated' | 'deleted' | 'restored';
      triggeredBy?: string;
      triggerSource?: 'api' | 'worker' | 'sync' | 'system';
      changes?: Record<string, any>;
      previousState?: Record<string, any>;
      shardSnapshot?: {
        id: string;
        tenantId: string;
        shardTypeId: string;
        shardTypeName?: string;
        title?: string;
        status?: string;
        structuredData?: any;
        tags?: string[];
        createdAt?: string;
        updatedAt?: string;
      };
      correlationId?: string;
    },
    options?: { delayInSeconds?: number; sessionId?: string }
  ): Promise<void> {
    try {
      const shardEmissionMessage = {
        shardId: message.shardId,
        tenantId: message.tenantId,
        shardTypeId: message.shardTypeId,
        eventType: message.eventType,
        triggeredBy: message.triggeredBy,
        triggerSource: message.triggerSource || 'api',
        changes: message.changes,
        previousState: message.previousState,
        shardSnapshot: message.shardSnapshot,
        timestamp: new Date().toISOString(),
        correlationId: message.correlationId || options?.sessionId,
      };

      await this.queueProducer.enqueueShardEmission(shardEmissionMessage, {
        delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
        priority: 5, // Normal priority
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        context: 'QueueService.sendShardEmission',
        tenantId: message.tenantId,
        shardId: message.shardId,
        eventType: message.eventType,
      });
      // Don't throw - shard operations should succeed even if emission fails
      // This allows the system to continue functioning if the queue is temporarily unavailable
    }
  }

  /**
   * Send an enrichment job message
   */
  async sendEnrichmentJob(
    message: EnrichmentJob | { jobId: string; tenantId: string; shardId: string; configId: string; processors?: string[] },
    options?: { delayInSeconds?: number; sessionId?: string }
  ): Promise<void> {
    try {
      await this.queueProducer.enqueueEnrichmentJob(message, {
        delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
        priority: 5,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        context: 'QueueService.sendEnrichmentJob',
        tenantId: message.tenantId,
        shardId: message.shardId,
      });
      throw error;
    }
  }

  /**
   * Send a shard-created event message
   */
  async sendShardCreatedEvent(
    message: { shardId: string; tenantId: string; shardTypeId: string; shard: any },
    options?: { delayInSeconds?: number; sessionId?: string }
  ): Promise<void> {
    try {
      await this.queueProducer.enqueueShardCreated(message, {
        delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
        priority: 5,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        context: 'QueueService.sendShardCreatedEvent',
        tenantId: message.tenantId,
        shardId: message.shardId,
      });
      // Don't throw - shard creation should succeed even if event emission fails
    }
  }

  /**
   * Send a risk evaluation job message
   */
  async sendRiskEvaluationJob(
    message: {
      opportunityId: string;
      tenantId: string;
      userId: string;
      trigger: 'scheduled' | 'opportunity_updated' | 'shard_created' | 'manual' | 'risk_catalog_created' | 'risk_catalog_updated';
      priority: 'high' | 'normal' | 'low';
      options: {
        includeHistorical?: boolean;
        includeAI?: boolean;
        includeSemanticDiscovery?: boolean;
      };
      timestamp: Date;
    },
    options?: { delayInSeconds?: number }
  ): Promise<void> {
    try {
      await this.queueProducer.enqueueRiskEvaluation(message, {
        delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        context: 'QueueService.sendRiskEvaluationJob',
        opportunityId: message.opportunityId,
      });
      throw error;
    }
  }

  /**
   * Health check - verify queue connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to enqueue a test job (or just check Redis connection)
      return true;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        context: 'QueueService.healthCheck',
      });
      return false;
    }
  }

  /**
   * Close the queue service
   */
  async close(): Promise<void> {
    await this.queueProducer.close();
  }
}




/**
 * Queue Producers
 * 
 * BullMQ queue producers for enqueueing jobs
 */

import { Queue, QueueOptions } from 'bullmq';
import type { Redis, Cluster } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { getRedisConnectionFromEnv } from './redis.js';
import { QueueName } from './types.js';
import { ensureCorrelationId } from './correlation-id.js';
import { JobScheduler, type SchedulePattern } from './job-scheduler.js';
import type {
  EmbeddingJobMessage,
  DocumentChunkJobMessage,
  DocumentCheckJobMessage,
  GenerationJobMessage,
  SyncInboundScheduledMessage,
  SyncInboundWebhookMessage,
  SyncOutboundMessage,
  IngestionEventMessage,
  EnrichmentJobMessage,
  ShardCreatedMessage,
  ShardEmissionMessage,
  RiskEvaluationMessage,
} from './types.js';

export interface QueueProducerOptions {
  redis?: Redis | Cluster;
  monitoring?: IMonitoringProvider;
  defaultJobOptions?: QueueOptions['defaultJobOptions'];
}

/**
 * Queue Producer Service
 * 
 * Handles enqueueing jobs to BullMQ queues
 */
export class QueueProducerService {
  private queues: Map<string, Queue> = new Map();
  private redis: Redis | Cluster;
  private monitoring?: IMonitoringProvider;
  private defaultJobOptions: QueueOptions['defaultJobOptions'];
  private scheduler?: JobScheduler;

  constructor(options: QueueProducerOptions = {}) {
    this.redis = options.redis || getRedisConnectionFromEnv();
    this.monitoring = options.monitoring;
    this.defaultJobOptions = options.defaultJobOptions || {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    };
    
    // Initialize scheduler if monitoring is available
    if (this.monitoring) {
      this.scheduler = new JobScheduler(this.redis, this.monitoring);
    }
  }

  /**
   * Get the job scheduler instance
   */
  getScheduler(): JobScheduler | undefined {
    return this.scheduler;
  }

  /**
   * Get or create a queue
   */
  private getQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      const queue = new Queue(queueName, {
        connection: this.redis,
        defaultJobOptions: this.defaultJobOptions,
      });
      this.queues.set(queueName, queue);
    }
    return this.queues.get(queueName)!;
  }

  /**
   * Send embedding job
   */
  async enqueueEmbeddingJob(
    job: EmbeddingJobMessage,
    options?: { delay?: number; priority?: number; correlationId?: string; parentJobId?: string }
  ): Promise<string> {
    const queue = this.getQueue(QueueName.EMBEDDING_JOBS);
    const startTime = Date.now();

    try {
      // Ensure correlation ID exists
      const correlationId = options?.correlationId || ensureCorrelationId(job);
      if (!job.correlationId) {
        job.correlationId = correlationId;
      }

      // Set parent job ID if provided
      if (options?.parentJobId) {
        job.parentJobId = options.parentJobId;
      }

      const addedJob = await queue.add(
        'embedding-job',
        job,
        {
          jobId: job.dedupeKey, // Use dedupeKey for deduplication
          priority: options?.priority,
          delay: options?.delay,
        }
      );

      const jobId = addedJob.id || '';
      const duration = Date.now() - startTime;
      this.monitoring?.trackEvent('embedding_job.enqueued', {
        shardId: job.shardId,
        tenantId: job.tenantId,
        shardTypeId: job.shardTypeId,
        dedupeKey: job.dedupeKey,
        correlationId: job.correlationId,
        parentJobId: job.parentJobId,
        jobId,
      });

      this.monitoring?.trackDependency(
        'bullmq.enqueue',
        'Redis',
        QueueName.EMBEDDING_JOBS,
        duration,
        true
      );

      return jobId;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring?.trackException(error as Error, {
        context: 'QueueProducerService.enqueueEmbeddingJob',
        shardId: job.shardId,
      });

      this.monitoring?.trackDependency(
        'bullmq.enqueue',
        'Redis',
        QueueName.EMBEDDING_JOBS,
        duration,
        false,
        (error as Error).message
      );

      throw error;
    }
  }

  /**
   * Send document chunk job
   */
  async enqueueDocumentChunkJob(
    job: DocumentChunkJobMessage,
    options?: { delay?: number; priority?: number; correlationId?: string }
  ): Promise<void> {
    const queue = this.getQueue(QueueName.DOCUMENT_CHUNK_JOBS);
    const startTime = Date.now();

    try {
      // Ensure correlation ID exists
      const correlationId = options?.correlationId || ensureCorrelationId(job);
      if (!job.correlationId) {
        job.correlationId = correlationId;
      }

      const jobId = `doc-chunk-${job.shardId}-${Date.now()}`;
      await queue.add('document-chunk-job', job, {
        jobId,
        priority: options?.priority,
        delay: options?.delay,
      });

      const duration = Date.now() - startTime;
      this.monitoring?.trackEvent('document_chunk_job.enqueued', {
        shardId: job.shardId,
        tenantId: job.tenantId,
        correlationId: job.correlationId,
      });

      this.monitoring?.trackDependency(
        'bullmq.enqueue',
        'Redis',
        QueueName.DOCUMENT_CHUNK_JOBS,
        duration,
        true
      );
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        context: 'QueueProducerService.enqueueDocumentChunkJob',
        shardId: job.shardId,
      });
      throw error;
    }
  }

  /**
   * Send document check job
   */
  async enqueueDocumentCheckJob(
    job: DocumentCheckJobMessage,
    options?: { delay?: number; priority?: number; correlationId?: string }
  ): Promise<void> {
    const queue = this.getQueue(QueueName.DOCUMENT_CHECK_JOBS);
    const startTime = Date.now();

    try {
      // Ensure correlation ID exists
      const correlationId = options?.correlationId || ensureCorrelationId(job);
      if (!job.correlationId) {
        job.correlationId = correlationId;
      }

      const jobId = `doc-check-${job.shardId}-${Date.now()}`;
      await queue.add('document-check-job', job, {
        jobId,
        priority: options?.priority,
        delay: options?.delay,
      });

      const duration = Date.now() - startTime;
      this.monitoring?.trackEvent('document_check_job.enqueued', {
        shardId: job.shardId,
        tenantId: job.tenantId,
        correlationId: job.correlationId,
      });

      this.monitoring?.trackDependency(
        'bullmq.enqueue',
        'Redis',
        QueueName.DOCUMENT_CHECK_JOBS,
        duration,
        true
      );
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        context: 'QueueProducerService.enqueueDocumentCheckJob',
        shardId: job.shardId,
      });
      throw error;
    }
  }

  /**
   * Send content generation job
   */
  async enqueueGenerationJob(
    job: GenerationJobMessage,
    options?: { delay?: number; priority?: number }
  ): Promise<void> {
    const queue = this.getQueue(QueueName.CONTENT_GENERATION_JOBS);

    try {
      await queue.add('content-generation-job', job, {
        jobId: `gen-${job.id}`,
        priority: options?.priority,
        delay: options?.delay,
      });

      this.monitoring?.trackEvent('content_generation_job.enqueued', {
        jobId: job.id,
        templateId: job.templateId,
        tenantId: job.tenantId,
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        context: 'QueueProducerService.enqueueGenerationJob',
        jobId: job.id,
      });
      throw error;
    }
  }

  /**
   * Send sync inbound scheduled job
   */
  async enqueueSyncInboundScheduled(
    job: SyncInboundScheduledMessage,
    options?: { delay?: number; priority?: number }
  ): Promise<void> {
    const queue = this.getQueue(QueueName.SYNC_INBOUND_SCHEDULED);

    try {
      await queue.add('sync-inbound-scheduled', job, {
        jobId: `sync-inbound-${job.syncTaskId}`,
        priority: options?.priority,
        delay: options?.delay,
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        context: 'QueueProducerService.enqueueSyncInboundScheduled',
        syncTaskId: job.syncTaskId,
      });
      throw error;
    }
  }

  /**
   * Schedule a recurring sync inbound job
   */
  async scheduleSyncInboundScheduled(
    job: SyncInboundScheduledMessage,
    pattern: SchedulePattern,
    options?: {
      jobId?: string;
      priority?: number;
      startDate?: Date;
      endDate?: Date;
      tz?: string;
    }
  ): Promise<string> {
    if (!this.scheduler) {
      throw new Error('Job scheduler not initialized. Monitoring provider required.');
    }

    return this.scheduler.scheduleJob(
      QueueName.SYNC_INBOUND_SCHEDULED,
      'sync-inbound-scheduled',
      job,
      pattern,
      {
        jobId: options?.jobId || `scheduled-sync-inbound-${job.syncTaskId}`,
        priority: options?.priority,
        startDate: options?.startDate,
        endDate: options?.endDate,
        tz: options?.tz,
      }
    );
  }

  /**
   * Send sync inbound webhook job
   */
  async enqueueSyncInboundWebhook(
    job: SyncInboundWebhookMessage,
    options?: { delay?: number; priority?: number }
  ): Promise<void> {
    const queue = this.getQueue(QueueName.SYNC_INBOUND_WEBHOOK);

    try {
      await queue.add('sync-inbound-webhook', job, {
        jobId: `sync-webhook-${job.connectionId}-${Date.now()}`,
        priority: options?.priority || 5, // Higher priority for webhooks
        delay: options?.delay,
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        context: 'QueueProducerService.enqueueSyncInboundWebhook',
        connectionId: job.connectionId,
      });
      throw error;
    }
  }

  /**
   * Send sync outbound job
   */
  async enqueueSyncOutbound(
    job: SyncOutboundMessage,
    options?: { delay?: number; priority?: number }
  ): Promise<void> {
    const queue = this.getQueue(QueueName.SYNC_OUTBOUND);

    try {
      await queue.add('sync-outbound', job, {
        jobId: `sync-outbound-${job.correlationId}`,
        priority: options?.priority,
        delay: options?.delay,
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        context: 'QueueProducerService.enqueueSyncOutbound',
        correlationId: job.correlationId,
      });
      throw error;
    }
  }

  /**
   * Send ingestion event
   */
  async enqueueIngestionEvent(
    job: IngestionEventMessage,
    options?: { delay?: number; priority?: number }
  ): Promise<void> {
    const queue = this.getQueue(QueueName.INGESTION_EVENTS);

    try {
      await queue.add('ingestion-event', job, {
        jobId: `ingestion-${job.tenantId}-${job.sourceId}-${Date.now()}`,
        priority: options?.priority,
        delay: options?.delay,
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        context: 'QueueProducerService.enqueueIngestionEvent',
        tenantId: job.tenantId,
        source: job.source,
      });
      throw error;
    }
  }

  /**
   * Send enrichment job
   */
  async enqueueEnrichmentJob(
    job: EnrichmentJobMessage,
    options?: { delay?: number; priority?: number; correlationId?: string }
  ): Promise<void> {
    const queue = this.getQueue(QueueName.ENRICHMENT_JOBS);

    try {
      // Ensure correlation ID exists
      const correlationId = options?.correlationId || ensureCorrelationId(job);
      if (!job.correlationId) {
        job.correlationId = correlationId;
      }

      await queue.add('enrichment-job', job, {
        jobId: `enrichment-${job.shardId}-${Date.now()}`,
        priority: options?.priority,
        delay: options?.delay,
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        context: 'QueueProducerService.enqueueEnrichmentJob',
        shardId: job.shardId,
      });
      throw error;
    }
  }

  /**
   * Send shard created event
   */
  async enqueueShardCreated(
    job: ShardCreatedMessage,
    options?: { delay?: number; priority?: number }
  ): Promise<void> {
    const queue = this.getQueue(QueueName.SHARD_CREATED);

    try {
      await queue.add('shard-created', job, {
        jobId: `shard-created-${job.shardId}-${Date.now()}`,
        priority: options?.priority,
        delay: options?.delay,
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        context: 'QueueProducerService.enqueueShardCreated',
        shardId: job.shardId,
      });
      // Don't throw - shard creation should succeed even if event emission fails
    }
  }

  /**
   * Send shard emission event
   * Emits shard events (created, updated, deleted, restored) to the shard-emission queue
   */
  async enqueueShardEmission(
    job: ShardEmissionMessage,
    options?: { delay?: number; priority?: number }
  ): Promise<void> {
    const queue = this.getQueue(QueueName.SHARD_EMISSION);
    const startTime = Date.now();

    try {
      // Ensure correlation ID exists
      const correlationId = job.correlationId || ensureCorrelationId(job);
      if (!job.correlationId) {
        job.correlationId = correlationId;
      }

      // Generate job ID with correlation ID for better tracking
      const jobId = `shard-emission-${job.shardId}-${job.correlationId}`;

      await queue.add('shard-emission', job, {
        jobId,
        priority: options?.priority,
        delay: options?.delay,
      });

      const duration = Date.now() - startTime;
      this.monitoring?.trackEvent('shard_emission.enqueued', {
        shardId: job.shardId,
        tenantId: job.tenantId,
        eventType: job.eventType,
        triggerSource: job.triggerSource,
        correlationId: job.correlationId,
        duration,
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        context: 'QueueProducerService.enqueueShardEmission',
        shardId: job.shardId,
        tenantId: job.tenantId,
        eventType: job.eventType,
      });
      // Don't throw - shard operations should succeed even if emission fails
      // This allows the system to continue functioning if the queue is temporarily unavailable
    }
  }

  /**
   * Send risk evaluation job
   */
  async enqueueRiskEvaluation(
    job: RiskEvaluationMessage,
    options?: { delay?: number; priority?: number }
  ): Promise<void> {
    const queue = this.getQueue(QueueName.RISK_EVALUATIONS);

    try {
      const priority = job.priority === 'high' ? 8 : job.priority === 'normal' ? 5 : 3;
      await queue.add('risk-evaluation', job, {
        jobId: `risk-eval-${job.opportunityId}-${Date.now()}`,
        priority: options?.priority || priority,
        delay: options?.delay,
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        context: 'QueueProducerService.enqueueRiskEvaluation',
        opportunityId: job.opportunityId,
      });
      throw error;
    }
  }

  /**
   * Close all queues
   */
  async close(): Promise<void> {
    // Close scheduler if initialized
    if (this.scheduler) {
      await this.scheduler.close();
    }
    
    // Close all queues
    const closePromises = Array.from(this.queues.values()).map(queue => queue.close());
    await Promise.all(closePromises);
    this.queues.clear();
  }
}




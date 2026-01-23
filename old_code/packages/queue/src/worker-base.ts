/**
 * Base Worker Class
 * 
 * Provides standardized patterns for BullMQ workers including:
 * - Standard error handling
 * - Standard event listeners
 * - Standard monitoring/logging
 * - Graceful shutdown
 */

import { Worker, Job, Queue, type WorkerOptions, type RateLimiterOptions } from 'bullmq';
import type { Redis, Cluster } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { ParentChildJobManager } from './parent-child-jobs.js';

export interface BaseWorkerConfig {
  queueName: string;
  redis: Redis | Cluster;
  monitoring: IMonitoringProvider;
  concurrency?: number;
  removeOnComplete?: {
    age?: number;
    count?: number;
  };
  removeOnFail?: {
    age?: number;
  };
  workerName?: string;
  /**
   * Rate limiter configuration
   * Limits the number of jobs processed per time window
   */
  rateLimiter?: {
    max: number; // Maximum number of jobs
    duration: number; // Time window in milliseconds
  };
}

export interface WorkerJobProcessor<T = any> {
  (job: Job<T>): Promise<void>;
}

/**
 * Worker health metrics
 */
export interface WorkerHealthMetrics {
  workerName: string;
  queueName: string;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  stalledJobs: number;
  errorRate: number; // failed / (completed + failed)
  averageProcessingTime?: number;
  throughput?: number; // jobs per second
  concurrency: number;
  isRunning: boolean;
}

/**
 * Base class for all BullMQ workers
 * Provides standardized error handling, event listeners, and monitoring
 */
export abstract class BaseWorker<T = any> {
  protected worker: Worker;
  protected monitoring: IMonitoringProvider;
  protected config: BaseWorkerConfig;
  protected workerName: string;
  private queue: Queue;
  protected parentChildManager?: ParentChildJobManager;
  private completedCount: number = 0;
  private failedCount: number = 0;
  private stalledCount: number = 0;
  private delayedCount: number = 0; // Jobs delayed (potentially due to rate limiting)
  private processingTimes: number[] = [];
  private readonly maxProcessingTimeSamples: number = 1000;
  private jobStartTimes: Map<string, number> = new Map(); // jobId -> startTime

  constructor(config: BaseWorkerConfig, processor: WorkerJobProcessor<T>) {
    this.config = config;
    this.monitoring = config.monitoring;
    this.workerName = config.workerName || config.queueName;

    // Standard worker options
    const workerOptions: WorkerOptions = {
      connection: config.redis,
      concurrency: config.concurrency || 5,
      removeOnComplete: config.removeOnComplete || {
        age: 24 * 3600, // 24 hours
        count: 1000,
      },
      removeOnFail: config.removeOnFail || {
        age: 7 * 24 * 3600, // 7 days
      },
      // Add rate limiter if configured
      ...(config.rateLimiter && {
        limiter: {
          max: config.rateLimiter.max,
          duration: config.rateLimiter.duration,
        } as RateLimiterOptions,
      }),
    };

    // Create queue instance for metrics
    this.queue = new Queue(config.queueName, {
      connection: config.redis,
    });

    // Create worker
    this.worker = new Worker(config.queueName, processor, workerOptions);

    // Set up standard event listeners
    this.setupEventListeners();

    // Set up graceful shutdown
    this.setupGracefulShutdown();

    this.monitoring.trackEvent(`${this.workerName}.initialized`, {
      queueName: config.queueName,
      concurrency: workerOptions.concurrency,
    });
  }

  /**
   * Set up standard event listeners
   */
  private setupEventListeners(): void {
    // Job active (started processing)
    this.worker.on('active', (job: Job<T>) => {
      const startTime = Date.now();
      if (job.id) {
        this.jobStartTimes.set(job.id, startTime);
      }
    });

    // Job completed
    this.worker.on('completed', (job: Job<T>) => {
      this.completedCount++;
      
      // Track processing time
      if (job.id && this.jobStartTimes.has(job.id)) {
        const startTime = this.jobStartTimes.get(job.id)!;
        const duration = Date.now() - startTime;
        this.jobStartTimes.delete(job.id);
        
        this.processingTimes.push(duration);
        if (this.processingTimes.length > this.maxProcessingTimeSamples) {
          this.processingTimes.shift();
        }
        
        // Track metric
        this.monitoring.trackMetric('worker.processing_time', duration, {
          workerName: this.workerName,
          queueName: this.config.queueName,
        });
      }
      
      this.monitoring.trackEvent(`${this.workerName}.completed`, {
        jobId: job.id,
        ...this.getJobContext(job),
      });
      
      // Track completed count
      this.monitoring.trackMetric('worker.completed_jobs', this.completedCount, {
        workerName: this.workerName,
        queueName: this.config.queueName,
      });
    });

    // Job delayed (may be due to rate limiting)
    this.worker.on('delayed', (job: Job<T>) => {
      this.delayedCount++;
      
      // If rate limiter is configured, track delayed jobs as potential rate limit hits
      if (this.config.rateLimiter) {
        this.monitoring.trackMetric('worker.rate_limiter_delayed', 1, {
          workerName: this.workerName,
          queueName: this.config.queueName,
          max: this.config.rateLimiter.max.toString(),
          duration: this.config.rateLimiter.duration.toString(),
        });
      }
      
      this.monitoring.trackEvent(`${this.workerName}.delayed`, {
        jobId: job.id,
        delay: job.delay,
        ...this.getJobContext(job),
      });
    });

    // Job failed
    this.worker.on('failed', async (job: Job<T> | undefined, err: Error) => {
      this.failedCount++;
      
      // Clean up start time if exists
      if (job?.id && this.jobStartTimes.has(job.id)) {
        this.jobStartTimes.delete(job.id);
      }
      
      // Update parent job if this is a child job
      if (job) {
        const jobContext = this.getJobContext(job);
        if (jobContext.parentJobId && this.parentChildManager) {
          try {
            await this.parentChildManager.markChildFailed(
              jobContext.parentJobId,
              job.id || ''
            );
          } catch (error) {
            // Log but don't fail the error handling
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
              context: 'BaseWorker.parent-job-update-on-failure',
              jobId: job.id,
              parentJobId: jobContext.parentJobId,
            });
          }
        }
      }
      
      // Track failed count
      this.monitoring.trackMetric('worker.failed_jobs', this.failedCount, {
        workerName: this.workerName,
        queueName: this.config.queueName,
      });
      
      // Update error rate
      const total = this.completedCount + this.failedCount;
      if (total > 0) {
        const errorRate = this.failedCount / total;
        this.monitoring.trackMetric('worker.error_rate', errorRate, {
          workerName: this.workerName,
          queueName: this.config.queueName,
        });
      }
      
      this.monitoring.trackException(err, {
        context: this.workerName,
        jobId: job?.id,
        ...(job ? this.getJobContext(job) : {}),
      });
    });

    // Job stalled (taking too long)
    this.worker.on('stalled', (jobId: string) => {
      this.stalledCount++;
      this.monitoring.trackMetric('worker.stalled_jobs', this.stalledCount, {
        workerName: this.workerName,
        queueName: this.config.queueName,
      });
      this.monitoring.trackEvent(`${this.workerName}.stalled`, {
        jobId,
      });
    });

    // Worker error
    this.worker.on('error', (err: Error) => {
      this.monitoring.trackException(err, {
        context: `${this.workerName}.worker-error`,
      });
    });

    // Worker closed
    this.worker.on('closed', () => {
      this.monitoring.trackEvent(`${this.workerName}.closed`, {});
    });
  }

  /**
   * Extract context from job data for logging
   * Override in subclasses to provide custom context
   */
  protected getJobContext(job: Job<T>): Record<string, any> {
    const data = job.data as any;
    const context: Record<string, any> = {};

    // Extract common fields
    if (data.tenantId) context.tenantId = data.tenantId;
    if (data.shardId) context.shardId = data.shardId;
    if (data.jobId) context.jobId = data.jobId;
    if (data.integrationId) context.integrationId = data.integrationId;
    
    // Extract correlation ID for distributed tracing
    if (data.correlationId) context.correlationId = data.correlationId;
    
    // Extract parent job ID for parent-child relationships
    if (data.parentJobId) context.parentJobId = data.parentJobId;

    return context;
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.monitoring.trackEvent(`${this.workerName}.shutdown-initiated`, {
        signal,
      });

      try {
        await this.worker.close();
        this.monitoring.trackEvent(`${this.workerName}.shutdown-complete`, {});
        process.exit(0);
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          context: `${this.workerName}.shutdown-error`,
        });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Get the underlying worker instance
   */
  getWorker(): Worker {
    return this.worker;
  }

  /**
   * Close the worker gracefully
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
  }

  /**
   * Get queue depth (waiting + active jobs)
   */
  async getQueueDepth(): Promise<number> {
    try {
      const counts = await this.queue.getJobCounts();
      return counts.waiting + counts.active;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        context: `${this.workerName}.getQueueDepth`,
      });
      return 0;
    }
  }

  /**
   * Get worker health metrics
   */
  async getHealthMetrics(): Promise<WorkerHealthMetrics> {
    try {
      // Get job counts from the queue
      const counts = await this.queue.getJobCounts();
      const activeJobs = counts.active;
      const queueDepth = counts.waiting + counts.active;
      
      // Calculate error rate
      const total = this.completedCount + this.failedCount;
      const errorRate = total > 0 ? this.failedCount / total : 0;
      
      // Calculate average processing time
      const averageProcessingTime = this.processingTimes.length > 0
        ? this.processingTimes.reduce((sum, t) => sum + t, 0) / this.processingTimes.length
        : undefined;
      
      // Track active jobs metric
      this.monitoring.trackMetric('worker.active_jobs', activeJobs, {
        workerName: this.workerName,
        queueName: this.config.queueName,
      });
      
      // Track queue depth metric (for auto-scaling)
      this.monitoring.trackMetric('queue.depth', queueDepth, {
        queueName: this.config.queueName,
      });
      
      return {
        workerName: this.workerName,
        queueName: this.config.queueName,
        activeJobs,
        completedJobs: this.completedCount,
        failedJobs: this.failedCount,
        stalledJobs: this.stalledCount,
        errorRate,
        averageProcessingTime,
        concurrency: this.config.concurrency || 5,
        isRunning: this.worker.isRunning(),
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        context: `${this.workerName}.getHealthMetrics`,
      });
      // Return default metrics on error
      return {
        workerName: this.workerName,
        queueName: this.config.queueName,
        activeJobs: 0,
        completedJobs: this.completedCount,
        failedJobs: this.failedCount,
        stalledJobs: this.stalledCount,
        errorRate: 0,
        concurrency: this.config.concurrency || 5,
        isRunning: false,
      };
    }
  }

  /**
   * Reset worker metrics counters
   */
  resetMetrics(): void {
    this.completedCount = 0;
    this.failedCount = 0;
    this.stalledCount = 0;
    this.delayedCount = 0;
    this.processingTimes = [];
    this.jobStartTimes.clear();
  }
}

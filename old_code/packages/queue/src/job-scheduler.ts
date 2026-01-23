/**
 * Job Scheduler Utilities
 * 
 * Provides utilities for scheduling recurring jobs using BullMQ's native scheduling
 * Supports cron patterns and interval-based repetition
 */

import { Queue } from 'bullmq';
import type { Redis, Cluster } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';

/**
 * Schedule pattern types
 */
export type SchedulePattern = 
  | { type: 'cron'; pattern: string } // Cron pattern (e.g., '0 * * * *')
  | { type: 'interval'; every: number }; // Interval in milliseconds

/**
 * Scheduled job metadata
 */
export interface ScheduledJobMetadata {
  jobId: string;
  queueName: string;
  jobName: string;
  pattern: SchedulePattern;
  jobData: any;
  options?: {
    priority?: number;
    startDate?: Date;
    endDate?: Date;
    tz?: string; // Timezone for cron jobs
  };
  createdAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
}

/**
 * Job Scheduler
 * 
 * Manages recurring jobs using BullMQ's native scheduling
 */
export class JobScheduler {
  private queues: Map<string, Queue> = new Map();
  private scheduledJobs: Map<string, ScheduledJobMetadata> = new Map();
  private redis: Redis | Cluster;
  private metadataPrefix = 'scheduled-job:';

  constructor(
    redis: Redis | Cluster,
    private monitoring: IMonitoringProvider
  ) {
    this.redis = redis;
  }

  /**
   * Get or create a queue
   */
  private getQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      const queue = new Queue(queueName, {
        connection: this.redis,
      });
      this.queues.set(queueName, queue);
    }
    return this.queues.get(queueName)!;
  }

  /**
   * Schedule a recurring job
   */
  async scheduleJob(
    queueName: string,
    jobName: string,
    jobData: any,
    pattern: SchedulePattern,
    options?: {
      jobId?: string;
      priority?: number;
      startDate?: Date;
      endDate?: Date;
      tz?: string;
    }
  ): Promise<string> {
    const queue = this.getQueue(queueName);
    const jobId = options?.jobId || `scheduled-${queueName}-${jobName}-${Date.now()}`;

    try {
      // Build repeat options based on pattern type
      const repeatOptions: any = {
        jobId,
      };

      if (pattern.type === 'cron') {
        repeatOptions.pattern = pattern.pattern;
        if (options?.tz) {
          repeatOptions.tz = options.tz;
        }
        if (options?.startDate) {
          repeatOptions.startDate = options.startDate;
        }
        if (options?.endDate) {
          repeatOptions.endDate = options.endDate;
        }
      } else {
        // Interval-based
        repeatOptions.every = pattern.every;
        if (options?.startDate) {
          repeatOptions.startDate = options.startDate;
        }
        if (options?.endDate) {
          repeatOptions.endDate = options.endDate;
        }
      }

      // Add job with repeat option
      const job = await queue.add(
        jobName,
        jobData,
        {
          jobId,
          priority: options?.priority,
          repeat: repeatOptions,
        }
      );

      // Store metadata
      const metadata: ScheduledJobMetadata = {
        jobId: job.id || jobId,
        queueName,
        jobName,
        pattern,
        jobData,
        options: {
          priority: options?.priority,
          startDate: options?.startDate,
          endDate: options?.endDate,
          tz: options?.tz,
        },
        createdAt: new Date().toISOString(),
      };

      await this.storeMetadata(metadata);
      this.scheduledJobs.set(jobId, metadata);

      this.monitoring.trackEvent('job-scheduler.scheduled', {
        jobId,
        queueName,
        jobName,
        patternType: pattern.type,
        pattern: pattern.type === 'cron' ? pattern.pattern : `${pattern.every}ms`,
      });

      return jobId;
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        context: 'JobScheduler.scheduleJob',
        jobId,
        queueName,
        jobName,
      });
      throw error;
    }
  }

  /**
   * Remove a scheduled job
   */
  async removeScheduledJob(jobId: string, queueName: string): Promise<void> {
    try {
      const queue = this.getQueue(queueName);
      
      // Remove the repeatable job
      await queue.removeRepeatableByKey(jobId);

      // Remove metadata
      await this.redis.del(`${this.metadataPrefix}${jobId}`);
      this.scheduledJobs.delete(jobId);

      this.monitoring.trackEvent('job-scheduler.removed', {
        jobId,
        queueName,
      });
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        context: 'JobScheduler.removeScheduledJob',
        jobId,
        queueName,
      });
      throw error;
    }
  }

  /**
   * Get all scheduled jobs for a queue
   */
  async getScheduledJobs(queueName: string): Promise<ScheduledJobMetadata[]> {
    try {
      const queue = this.getQueue(queueName);
      const repeatableJobs = await queue.getRepeatableJobs();

      const metadataList: ScheduledJobMetadata[] = [];

      for (const repeatableJob of repeatableJobs) {
        const jobId = repeatableJob.id || `unknown-${Date.now()}`;
        const metadata = await this.getMetadata(jobId);
        if (metadata) {
          metadataList.push(metadata);
        } else {
          // If metadata not found, create from repeatable job info
          // BullMQ RepeatableJob structure: { id, name, pattern, next, tz, every, startDate, endDate }
          const pattern: SchedulePattern = repeatableJob.every
            ? { type: 'interval', every: typeof repeatableJob.every === 'number' ? repeatableJob.every : 0 }
            : { type: 'cron', pattern: repeatableJob.pattern || '0 * * * *' }; // Default to hourly if pattern not available
          
          metadataList.push({
            jobId,
            queueName,
            jobName: repeatableJob.name || 'unknown',
            pattern,
            jobData: {}, // Not available from repeatable job
            options: {
              // RepeatableJob may not have all these properties
              tz: repeatableJob.tz || undefined,
            },
            createdAt: new Date().toISOString(),
            nextRunAt: repeatableJob.next ? new Date(repeatableJob.next).toISOString() : undefined,
          });
        }
      }

      return metadataList;
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        context: 'JobScheduler.getScheduledJobs',
        queueName,
      });
      throw error;
    }
  }

  /**
   * Update a scheduled job
   */
  async updateScheduledJob(
    jobId: string,
    queueName: string,
    updates: {
      pattern?: SchedulePattern;
      jobData?: any;
      options?: {
        priority?: number;
        startDate?: Date;
        endDate?: Date;
        tz?: string;
      };
    }
  ): Promise<void> {
    try {
      // Remove existing job
      await this.removeScheduledJob(jobId, queueName);

      // Get existing metadata
      const existing = await this.getMetadata(jobId);
      if (!existing) {
        throw new Error(`Scheduled job not found: ${jobId}`);
      }

      // Schedule with updated options
      await this.scheduleJob(
        queueName,
        existing.jobName,
        updates.jobData || existing.jobData,
        updates.pattern || existing.pattern,
        {
          jobId,
          ...updates.options,
        }
      );

      this.monitoring.trackEvent('job-scheduler.updated', {
        jobId,
        queueName,
      });
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        context: 'JobScheduler.updateScheduledJob',
        jobId,
        queueName,
      });
      throw error;
    }
  }

  /**
   * Store metadata in Redis
   */
  private async storeMetadata(metadata: ScheduledJobMetadata): Promise<void> {
    const key = `${this.metadataPrefix}${metadata.jobId}`;
    await this.redis.setex(key, 30 * 24 * 3600, JSON.stringify(metadata)); // 30 days
  }

  /**
   * Get metadata from Redis
   */
  private async getMetadata(jobId: string): Promise<ScheduledJobMetadata | null> {
    const key = `${this.metadataPrefix}${jobId}`;
    const metadataJson = await this.redis.get(key);
    if (!metadataJson) {
      return null;
    }
    return JSON.parse(metadataJson) as ScheduledJobMetadata;
  }

  /**
   * Close all queues
   */
  async close(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.queues.clear();
  }
}

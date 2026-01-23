/**
 * Sync Inbound Worker
 * 
 * Processes inbound sync tasks from BullMQ queue.
 * Handles pull-based sync (fetching data from external systems).
 */

import { Worker, Job } from 'bullmq';
import type { SyncInboundScheduledMessage, SyncInboundWebhookMessage } from '@castiel/queue';
import { QueueName, getRateLimiterForQueue } from '@castiel/queue';
import type { InitializedServices } from '../shared/initialize-services.js';
import { createRedisConnection } from '@castiel/queue';
import { SyncTaskRepository } from '@castiel/api-core/workers-sync';

export class SyncInboundWorker {
  private worker: Worker;
  private services: InitializedServices;

  constructor(services: InitializedServices, redis: any) {
    this.services = services;

    const scheduledRateLimiter = getRateLimiterForQueue(QueueName.SYNC_INBOUND_SCHEDULED);
    this.worker = new Worker(
      QueueName.SYNC_INBOUND_SCHEDULED,
      async (job: Job<SyncInboundScheduledMessage>) => {
        return this.processScheduledSync(job);
      },
      {
        connection: redis,
        concurrency: parseInt(process.env.SYNC_WORKER_CONCURRENCY || '5', 10),
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
        ...(scheduledRateLimiter && {
          limiter: {
            max: scheduledRateLimiter.max,
            duration: scheduledRateLimiter.duration,
          },
        }),
      }
    );

    // Also handle webhook-triggered syncs
    const webhookRateLimiter = getRateLimiterForQueue(QueueName.SYNC_INBOUND_WEBHOOK);
    const webhookWorker = new Worker(
      QueueName.SYNC_INBOUND_WEBHOOK,
      async (job: Job<SyncInboundWebhookMessage>) => {
        return this.processWebhookSync(job);
      },
      {
        connection: redis,
        concurrency: parseInt(process.env.SYNC_WEBHOOK_CONCURRENCY || '10', 10),
        removeOnComplete: {
          age: 24 * 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
        },
        ...(webhookRateLimiter && {
          limiter: {
            max: webhookRateLimiter.max,
            duration: webhookRateLimiter.duration,
          },
        }),
      }
    );

    // Set up error handling
    this.worker.on('completed', (job) => {
      this.services.monitoring.trackEvent('sync-inbound-worker.completed', {
        jobId: job.id,
        tenantId: job.data.tenantId,
        integrationId: job.data.integrationId,
      });
    });

    this.worker.on('failed', (job, err) => {
      this.services.monitoring.trackException(err, {
        context: 'SyncInboundWorker',
        jobId: job?.id,
        tenantId: job?.data?.tenantId,
      });
    });
  }

  private async processScheduledSync(
    job: Job<SyncInboundScheduledMessage>
  ): Promise<void> {
    const startTime = Date.now();
    const { integrationId, tenantId, connectionId, syncTaskId } = job.data;

    try {
      this.services.monitoring.trackEvent('sync-inbound-worker.started', {
        jobId: job.id,
        tenantId,
        integrationId,
        syncTaskId,
      });

      // Check rate limits
      if (this.services.integrationRateLimiter) {
        const rateLimitCheck = await this.services.integrationRateLimiter.checkRateLimit({
          integrationId,
          tenantId,
          operation: 'fetch',
        });

        if (!rateLimitCheck.allowed && !rateLimitCheck.queued) {
          // Requeue with delay
          throw new Error(
            `RATE_LIMIT_EXCEEDED|${rateLimitCheck.retryAfterSeconds}`
          );
        }
      }

      // Execute sync using SyncTaskService
      if (!this.services.syncTaskService) {
        throw new Error('SyncTaskService not initialized');
      }

      // Use triggerSync method instead of executeSyncTask
      // The sync will execute asynchronously
      const execution = await this.services.syncTaskService.triggerSync(
        syncTaskId,
        tenantId,
        'system' // System user for scheduled syncs
      );
      
      // Return a result object compatible with the expected structure
      const result = {
        status: execution.status,
        recordsProcessed: 0, // Will be updated by the async execution
        executionId: execution.id,
      };

      const duration = Date.now() - startTime;
      this.services.monitoring.trackEvent('sync-inbound-worker.completed', {
        jobId: job.id,
        tenantId,
        integrationId,
        duration,
        recordsProcessed: result.recordsProcessed || 0,
        status: result.status,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.services.monitoring.trackException(error as Error, {
        context: 'SyncInboundWorker.processScheduledSync',
        jobId: job.id,
        tenantId,
        integrationId,
        duration,
      });
      throw error;
    }
  }

  private async processWebhookSync(
    job: Job<SyncInboundWebhookMessage>
  ): Promise<void> {
    const startTime = Date.now();
    const { integrationId, tenantId, connectionId, webhookEvent } = job.data;

    try {
      this.services.monitoring.trackEvent('sync-inbound-webhook-worker.started', {
        jobId: job.id,
        tenantId,
        integrationId,
      });

      // Process webhook-triggered sync
      if (!this.services.syncTaskService) {
        throw new Error('SyncTaskService not initialized');
      }

      // Find sync task for this integration and trigger sync
      // The webhook event will be processed by the sync task execution
      // For now, we'll need to find the task by integrationId
      // Note: This is a simplified approach - in production, you'd want to
      // find the specific task that handles this webhook event type
      const taskRepository = new SyncTaskRepository(
        this.services.cosmosClient,
        process.env.COSMOS_DB_DATABASE_ID || 'castiel',
        'sync_tasks'
      );
      
      const tasks = await taskRepository.list({
        filter: {
          tenantId,
          // Note: We'd need tenantIntegrationId here, but we only have integrationId
          // This is a limitation that should be addressed in the architecture
        },
        limit: 1,
      });
      
      if (!tasks.tasks || tasks.tasks.length === 0) {
        throw new Error(`No sync task found for integration ${integrationId}`);
      }
      
      const task = tasks.tasks[0];
      
      // Trigger sync with 'system' user (webhook-triggered)
      const execution = await this.services.syncTaskService.triggerSync(
        task.id,
        tenantId,
        'system' // System user for webhook-triggered syncs
      );
      
      const result = {
        status: execution.status,
        executionId: execution.id,
      };

      const duration = Date.now() - startTime;
      this.services.monitoring.trackEvent('sync-inbound-webhook-worker.completed', {
        jobId: job.id,
        tenantId,
        integrationId,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.services.monitoring.trackException(error as Error, {
        context: 'SyncInboundWorker.processWebhookSync',
        jobId: job.id,
        tenantId,
        integrationId,
        duration,
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}




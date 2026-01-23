/**
 * Sync Outbound Worker
 * 
 * Processes outbound sync tasks - pushing local changes to external systems.
 */

import { Worker, Job } from 'bullmq';
import { QueueName } from '@castiel/queue';
import type { SyncOutboundMessage } from '@castiel/queue';
import type { InitializedServices } from '../shared/initialize-services.js';
import { createRedisConnection } from '@castiel/queue';

export class SyncOutboundWorker {
  private worker: Worker;
  private services: InitializedServices;

  constructor(services: InitializedServices, redis: any) {
    this.services = services;

    this.worker = new Worker(
      QueueName.SYNC_OUTBOUND,
      async (job: Job<SyncOutboundMessage>) => {
        return this.processOutboundSync(job);
      },
      {
        connection: redis,
        concurrency: parseInt(process.env.SYNC_OUTBOUND_CONCURRENCY || '5', 10),
        removeOnComplete: {
          age: 24 * 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
        },
      }
    );

    this.worker.on('completed', (job) => {
      this.services.monitoring.trackEvent('sync-outbound-worker.completed', {
        jobId: job.id,
        tenantId: job.data.tenantId,
        integrationId: job.data.integrationId,
      });
    });

    this.worker.on('failed', (job, err) => {
      this.services.monitoring.trackException(err, {
        context: 'SyncOutboundWorker',
        jobId: job?.id,
        tenantId: job?.data?.tenantId,
      });
    });
  }

  private async processOutboundSync(
    job: Job<SyncOutboundMessage>
  ): Promise<void> {
    const startTime = Date.now();
    const { integrationId, tenantId, connectionId, entityId, shardId, operation, changes } = job.data;

    try {
      this.services.monitoring.trackEvent('sync-outbound-worker.started', {
        jobId: job.id,
        tenantId,
        integrationId,
        operation,
        shardId,
      });

      // Check rate limits
      if (this.services.integrationRateLimiter) {
        const rateLimitCheck = await this.services.integrationRateLimiter.checkRateLimit({
          integrationId,
          tenantId,
          operation: 'push',
        });

        if (!rateLimitCheck.allowed && !rateLimitCheck.queued) {
          // Requeue with delay
          throw new Error(
            `RATE_LIMIT_EXCEEDED|${rateLimitCheck.retryAfterSeconds}`
          );
        }
      }

      // Execute outbound sync
      // Note: BidirectionalSyncEngine doesn't have pushChanges method
      // Outbound sync should be handled through the adapter directly
      // For now, we'll create a simplified result
      // TODO: Implement proper outbound sync using adapter
      const result = {
        success: false,
        error: 'Outbound sync not fully implemented - requires adapter integration',
      };
      
      // Log the attempt
      this.services.monitoring.trackEvent('sync-outbound-worker.attempted', {
        integrationId,
        tenantId,
        operation,
        shardId,
      });
      
      throw new Error('Outbound sync requires adapter integration - not yet implemented');

      const duration = Date.now() - startTime;
      this.services.monitoring.trackEvent('sync-outbound-worker.completed', {
        jobId: job.id,
        tenantId,
        integrationId,
        operation,
        duration,
        success: result.success,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.services.monitoring.trackException(error as Error, {
        context: 'SyncOutboundWorker.processOutboundSync',
        jobId: job.id,
        tenantId,
        integrationId,
        operation,
        duration,
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}




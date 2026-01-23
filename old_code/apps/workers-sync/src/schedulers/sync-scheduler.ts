/**
 * Sync Scheduler
 * 
 * Processes scheduled sync tasks hourly. Queries Cosmos DB for pending sync tasks,
 * prepares them, and enqueues them to BullMQ for worker processing.
 */

import type { SyncTask } from '@castiel/api-core/workers-sync';
import { QueueProducerService, QueueName } from '@castiel/queue';
import type { InitializedServices } from '../shared/initialize-services.js';
import type { SyncInboundScheduledMessage } from '@castiel/queue';

interface SyncSchedulerConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  containerId: string;
  keyVaultUrl: string;
  batchSize: number;
  maxRetries: number;
}

export class SyncScheduler {
  private services: InitializedServices;
  private config: SyncSchedulerConfig;
  private queueProducer: QueueProducerService;

  constructor(config: SyncSchedulerConfig, services: InitializedServices) {
    this.config = config;
    this.services = services;
    this.queueProducer = new QueueProducerService({
      redis: services.redis,
      monitoring: services.monitoring,
    });
  }

  /**
   * Main scheduler execution
   * Runs hourly to process pending sync tasks
   */
  async execute(): Promise<void> {
    const startTime = Date.now();
    const executionId = `sync-scheduler-${Date.now()}`;

    try {
      this.services.monitoring.trackEvent('sync-scheduler.started', {
        executionId,
        timestamp: new Date().toISOString(),
      });

      // Fetch pending sync tasks
      const pendingTasks = await this.fetchPendingTasks();
      this.services.monitoring.trackMetric('sync-scheduler.pending-tasks', pendingTasks.length);

      if (pendingTasks.length === 0) {
        this.services.monitoring.trackEvent('sync-scheduler.no-tasks', {
          executionId,
        });
        return;
      }

      // Group tasks by priority for fair distribution
      const groupedTasks = this.groupTasksByPriority(pendingTasks);

      // Enqueue tasks for processing
      const enqueuedCount = await this.enqueueTasks(groupedTasks, executionId);

      this.services.monitoring.trackEvent('sync-scheduler.completed', {
        executionId,
        enqueuedCount,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.services.monitoring.trackException(error as Error, {
        context: 'SyncScheduler.execute',
        executionId,
        duration,
      });
      throw error;
    }
  }

  /**
   * Fetch pending sync tasks from Cosmos DB
   */
  private async fetchPendingTasks(): Promise<SyncTask[]> {
    try {
      const container = this.services.cosmosClient
        .database(this.config.databaseId)
        .container(this.config.containerId);

      const now = new Date();

      // Query for tasks ready to be processed
      // SyncTask has: status ('active' | 'paused' | 'error' | 'disabled'), nextRunAt (Date)
      const { resources: tasks } = await container.items
        .query<SyncTask>(
          {
            query: `
              SELECT * FROM c
              WHERE c.status = 'active'
              AND (c.nextRunAt = null OR c.nextRunAt <= @now)
              ORDER BY c.createdAt ASC
              OFFSET 0 LIMIT @limit
            `,
            parameters: [
              { name: '@now', value: now.toISOString() },
              { name: '@limit', value: this.config.batchSize },
            ],
          }
        )
        .fetchAll();

      return tasks;
    } catch (error) {
      this.services.monitoring.trackException(error as Error, {
        context: 'SyncScheduler.fetchPendingTasks',
      });
      throw error;
    }
  }

  /**
   * Group tasks by priority for fair distribution
   * Since SyncTask doesn't have a priority field, we'll use a simple grouping
   */
  private groupTasksByPriority(tasks: SyncTask[]): Map<string, SyncTask[]> {
    const grouped = new Map<string, SyncTask[]>();
    // All tasks are treated as 'normal' priority since SyncTask doesn't have priority field
    grouped.set('normal', tasks);
    return grouped;
  }

  /**
   * Enqueue tasks to BullMQ for processing
   */
  private async enqueueTasks(
    groupedTasks: Map<string, SyncTask[]>,
    executionId: string
  ): Promise<number> {
    let enqueuedCount = 0;

    try {
      // Process high priority first, then normal, then low
      for (const [priority, tasks] of groupedTasks) {
        this.services.monitoring.trackEvent('sync-scheduler.processing-priority', {
          priority,
          count: tasks.length,
        });

        for (const task of tasks) {
          try {
            // Look up integration to get integrationId and connectionId
            if (!this.services.integrationRepository || !this.services.connectionRepository) {
              throw new Error('Integration repositories not available');
            }

            const integration = await this.services.integrationRepository.findById(
              task.tenantIntegrationId,
              task.tenantId
            );

            if (!integration) {
              this.services.monitoring.trackException(
                new Error(`Integration not found: ${task.tenantIntegrationId}`),
                { taskId: task.id, tenantId: task.tenantId }
              );
              continue;
            }

            // Find connection for this integration
            const connection = await this.services.connectionRepository.findByIntegration(
              integration.id,
              'tenant',
              task.tenantId
            );

            const message: SyncInboundScheduledMessage = {
              integrationId: integration.integrationId,
              tenantId: task.tenantId,
              connectionId: connection?.id || '',
              syncTaskId: task.id,
              scheduledAt: task.nextRunAt?.toISOString() || new Date().toISOString(),
            };

            // Map priority to numeric (high=8, normal=5, low=3)
            const priorityNum = priority === 'high' ? 8 : priority === 'normal' ? 5 : 3;

            await this.queueProducer.enqueueSyncInboundScheduled(message, {
              priority: priorityNum,
            });

            enqueuedCount++;

            this.services.monitoring.trackEvent('sync-scheduler.task-enqueued', {
              taskId: task.id,
              priority,
            });
          } catch (error) {
            this.services.monitoring.trackException(error as Error, {
              context: 'SyncScheduler.enqueueTasks',
              taskId: task.id,
            });
            // Continue with next task
          }
        }
      }

      return enqueuedCount;
    } catch (error) {
      this.services.monitoring.trackException(error as Error, {
        context: 'SyncScheduler.enqueueTasks',
      });
      throw error;
    }
  }
}




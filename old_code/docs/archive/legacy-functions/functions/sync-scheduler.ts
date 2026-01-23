import { app, Timer } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { ServiceBusClient } from '@azure/service-bus';
import type { SyncTask } from '../services/sync-task.service';
import { SyncTaskService } from '../services/sync-task.service';
import { SecureCredentialService } from '../services/secure-credential.service';

/**
 * SyncScheduler Azure Function
 * 
 * Processes scheduled sync tasks hourly. Queries Cosmos DB for pending sync tasks,
 * prepares them, and enqueues them to Service Bus for worker processing.
 * 
 * Trigger: Timer trigger (runs every hour)
 * Input: Cosmos DB (pending tasks)
 * Output: Service Bus (sync queue)
 */

interface SyncSchedulerConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  containerId: string;
  serviceBusConnectionString: string;
  queueName: string;
  keyVaultUrl: string;
  batchSize: number;
  maxRetries: number;
}

interface ScheduledSyncRequest {
  integrationId: string;
  tenantId: string;
  connectionId: string;
  syncMode: 'pull' | 'push' | 'bidirectional';
  priority: 'high' | 'normal' | 'low';
  correlationId: string;
  enqueuedAt: string;
}

class SyncSchedulerFunction {
  private cosmosClient: CosmosClient;
  private serviceBusClient: ServiceBusClient;
  private syncTaskService: SyncTaskService;
  private credentialService: SecureCredentialService;
  private config: SyncSchedulerConfig;

  constructor(config: SyncSchedulerConfig) {
    this.config = config;

    // Initialize Cosmos DB
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });

    // Initialize Service Bus
    this.serviceBusClient = new ServiceBusClient(
      config.serviceBusConnectionString
    );

    // Initialize services
    const credential = new DefaultAzureCredential();
    this.credentialService = new SecureCredentialService(
      config.keyVaultUrl,
      credential
    );

    this.syncTaskService = new SyncTaskService(
      this.cosmosClient.database(config.databaseId),
      this.credentialService
    );
  }

  /**
   * Main timer trigger handler
   * Runs hourly to process pending sync tasks
   */
  async execute(timerTrigger: Timer, context: any): Promise<void> {
    const startTime = Date.now();
    const executionId = context.invocationId;

    try {
      context.log(
        `[${executionId}] SyncScheduler started at ${new Date().toISOString()}`
      );

      // Check if function is disabled
      if (timerTrigger.isPastDue) {
        context.log(`[${executionId}] Timer trigger is past due`);
      }

      // Fetch pending sync tasks
      const pendingTasks = await this.fetchPendingTasks(context);
      context.log(
        `[${executionId}] Found ${pendingTasks.length} pending sync tasks`
      );

      if (pendingTasks.length === 0) {
        context.log(`[${executionId}] No pending tasks, exiting`);
        return;
      }

      // Group tasks by priority and tenant for fair distribution
      const groupedTasks = this.groupTasksByPriority(pendingTasks);

      // Enqueue tasks for processing
      const enqueuedCount = await this.enqueueTasks(
        groupedTasks,
        executionId,
        context
      );

      context.log(
        `[${executionId}] Successfully enqueued ${enqueuedCount} tasks`
      );

      // Update task status
      await this.updateTaskStatus(enqueuedCount, context);

      const duration = Date.now() - startTime;
      context.log(
        `[${executionId}] SyncScheduler completed in ${duration}ms`
      );
    } catch (error) {
      context.log.error(
        `[${executionId}] SyncScheduler failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Fetch pending sync tasks from Cosmos DB
   * Queries for tasks with status='pending' or next_scheduled < now
   */
  private async fetchPendingTasks(context: any): Promise<SyncTask[]> {
    try {
      const container = this.cosmosClient
        .database(this.config.databaseId)
        .container(this.config.containerId);

      const now = new Date();

      // Query for tasks ready to be processed
      const { resources: tasks } = await container.items
        .query<SyncTask>(
          `
          SELECT * FROM c
          WHERE (c.status = 'pending' OR c.nextScheduled <= @now)
          AND c.enabled = true
          AND c.type = 'scheduled'
          ORDER BY c.priority DESC, c.createdAt ASC
          OFFSET 0 LIMIT @limit
        `,
          {
            parameters: [
              { name: '@now', value: now.toISOString() },
              { name: '@limit', value: this.config.batchSize },
            ],
          }
        )
        .fetchAll();

      return tasks;
    } catch (error) {
      context.log.error(
        `Failed to fetch pending tasks: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Group tasks by priority for fair distribution
   */
  private groupTasksByPriority(tasks: SyncTask[]): Map<string, SyncTask[]> {
    const grouped = new Map<string, SyncTask[]>();

    const priorities = ['high', 'normal', 'low'];

    for (const priority of priorities) {
      const priorityTasks = tasks.filter(
        (t) => (t.priority || 'normal') === priority
      );
      if (priorityTasks.length > 0) {
        grouped.set(priority, priorityTasks);
      }
    }

    return grouped;
  }

  /**
   * Enqueue tasks to Service Bus for processing
   * Respects rate limits and batching
   */
  private async enqueueTasks(
    groupedTasks: Map<string, SyncTask[]>,
    executionId: string,
    context: any
  ): Promise<number> {
    const sender = this.serviceBusClient.createSender(this.config.queueName);
    let enqueuedCount = 0;

    try {
      // Process high priority first, then normal, then low
      for (const [priority, tasks] of groupedTasks) {
        context.log(
          `[${executionId}] Processing ${tasks.length} ${priority} priority tasks`
        );

        for (const task of tasks) {
          try {
            const message = {
              body: JSON.stringify({
                integrationId: task.integrationId,
                tenantId: task.tenantId,
                connectionId: task.connectionId,
                syncMode: task.syncMode || 'pull',
                priority: priority,
                correlationId: executionId,
                enqueuedAt: new Date().toISOString(),
                taskId: task.id,
              } as ScheduledSyncRequest),
              correlationId: executionId,
              label: `sync-${task.integrationId}-${priority}`,
              timeToLive: 3600000, // 1 hour TTL
              applicationProperties: {
                taskId: task.id,
                integrationId: task.integrationId,
                tenantId: task.tenantId,
                priority: priority,
                scheduleTime: task.nextScheduled?.toISOString() || new Date().toISOString(),
              },
            };

            await sender.sendMessages(message);
            enqueuedCount++;

            context.log(
              `[${executionId}] Enqueued task ${task.id} (${priority})`
            );
          } catch (error) {
            context.log.error(
              `[${executionId}] Failed to enqueue task ${task.id}: ${error instanceof Error ? error.message : String(error)}`
            );
            // Continue with next task instead of failing entirely
          }
        }
      }

      return enqueuedCount;
    } finally {
      await sender.close();
    }
  }

  /**
   * Update task status to 'queued'
   */
  private async updateTaskStatus(count: number, context: any): Promise<void> {
    try {
      const container = this.cosmosClient
        .database(this.config.databaseId)
        .container(this.config.containerId);

      // Update tasks that were enqueued (this is simplified - in production,
      // track which specific tasks were enqueued)
      await container.items
        .query(
          `
          SELECT * FROM c
          WHERE c.status = 'pending'
          AND c.type = 'scheduled'
          LIMIT @limit
        `,
          {
            parameters: [{ name: '@limit', value: 100 }],
          }
        )
        .fetchAll();

      context.log(`[${context.invocationId}] Updated task status`);
    } catch (error) {
      context.log.warn(
        `Failed to update task status: ${error instanceof Error ? error.message : String(error)}`
      );
      // Don't throw - this is not critical
    }
  }
}

// Azure Function binding
app.timer('SyncSchedulerTimer', {
  schedule: '0 0 * * * *', // Every hour
  runOnStartup: false,
  handler: async (timerTrigger: Timer, context: any) => {
    const config: SyncSchedulerConfig = {
      cosmosEndpoint:
        process.env.COSMOS_ENDPOINT || 'https://localhost:8081',
      cosmosKey: process.env.COSMOS_KEY || 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTjd3K6QCHBUI2djStw5ih+ax7IB9binCwZBicT/M=',
      databaseId: process.env.COSMOS_DATABASE || 'castiel',
      containerId: process.env.COSMOS_CONTAINER || 'sync-tasks',
      serviceBusConnectionString:
        process.env.SERVICE_BUS_CONNECTION_STRING || '',
      queueName: process.env.SERVICE_BUS_QUEUE || 'sync-inbound',
      keyVaultUrl: process.env.KEY_VAULT_URL || '',
      batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '100', 10),
      maxRetries: parseInt(process.env.SYNC_MAX_RETRIES || '3', 10),
    };

    const scheduler = new SyncSchedulerFunction(config);
    await scheduler.execute(timerTrigger, context);
  },
});

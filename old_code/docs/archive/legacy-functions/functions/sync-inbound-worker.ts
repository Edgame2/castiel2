import { app, ServiceBusQueueTrigger } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { SecureCredentialService } from '../services/secure-credential.service';
import { SyncTaskService } from '../services/sync-task.service';
import { IntegrationRateLimiter } from '../services/integration-rate-limiter.service';
import { IntegrationShardService } from '../services/integration-shard.service';
import type { SyncResult, SyncStatus } from '../services/sync-task.service';

/**
 * SyncInboundWorker Azure Function
 * 
 * Processes inbound sync tasks from the Service Bus queue.
 * Handles pull-based sync (fetching data from external systems and saving to database).
 * Respects rate limiting, implements retry logic, and tracks progress.
 * 
 * Trigger: Service Bus Queue (sync-inbound)
 * Input: Service Bus messages
 * Output: Cosmos DB (sync results, task status)
 */

interface SyncInboundConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  containerId: string;
  resultsContainerId: string;
  keyVaultUrl: string;
  redisUrl: string;
  maxRetries: number;
  batchSize: number;
}

interface InboundSyncMessage {
  integrationId: string;
  tenantId: string;
  connectionId: string;
  syncMode: 'pull' | 'bidirectional';
  priority: 'high' | 'normal' | 'low';
  correlationId: string;
  enqueuedAt: string;
  taskId?: string;
}

class SyncInboundWorker {
  private cosmosClient: CosmosClient;
  private syncTaskService: SyncTaskService;
  private credentialService: SecureCredentialService;
  private rateLimiter: IntegrationRateLimiter;
  private shardService: IntegrationShardService;
  private config: SyncInboundConfig;

  constructor(config: SyncInboundConfig) {
    this.config = config;

    // Initialize Cosmos DB
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });

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

    this.rateLimiter = new IntegrationRateLimiter(
      config.redisUrl,
      this.cosmosClient.database(config.databaseId).container('integrations')
    );

    this.shardService = new IntegrationShardService(
      this.cosmosClient.database(config.databaseId),
      this.credentialService
    );
  }

  /**
   * Main message trigger handler
   * Processes a single sync task from Service Bus
   */
  async handleMessage(
    message: ServiceBusQueueTrigger,
    context: any
  ): Promise<void> {
    const startTime = Date.now();
    const executionId = context.invocationId;

    let syncMessage: InboundSyncMessage;

    try {
      // Parse message
      syncMessage = JSON.parse(message.body || '{}') as InboundSyncMessage;

      context.log(
        `[${executionId}] Processing inbound sync for integration ${syncMessage.integrationId}`
      );

      // Check rate limits before proceeding
      const rateLimitCheck = await this.rateLimiter.checkRateLimit({
        integrationId: syncMessage.integrationId,
        tenantId: syncMessage.tenantId,
        operation: 'fetch',
      });

      if (!rateLimitCheck.allowed && !rateLimitCheck.queued) {
        context.log.warn(
          `[${executionId}] Rate limit exceeded for ${syncMessage.integrationId}, retrying in ${rateLimitCheck.retryAfterSeconds}s`
        );
        // Requeue message
        throw new Error(
          `RATE_LIMIT_EXCEEDED|${rateLimitCheck.retryAfterSeconds}`
        );
      }

      // Execute sync
      const result = await this.executePullSync(syncMessage, context);

      // Store results
      await this.storeResults(syncMessage, result, context);

      // Update adaptive rate limits based on response headers
      if (result.metadata?.rateLimitHeaders) {
        await this.rateLimiter.updateAdaptiveLimit(
          syncMessage.integrationId,
          result.metadata.rateLimitHeaders
        );
      }

      context.log(
        `[${executionId}] Sync completed in ${Date.now() - startTime}ms`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      context.log.error(
        `[${executionId}] Sync failed: ${errorMessage}`
      );

      // Handle rate limit retries
      if (errorMessage.startsWith('RATE_LIMIT_EXCEEDED')) {
        const [, retrySeconds] = errorMessage.split('|');
        const retryAfter = parseInt(retrySeconds, 10);
        throw new Error(`Retry after ${retryAfter}s`); // Service Bus will requeue
      }

      // Store error result
      if (syncMessage) {
        await this.storeFailureResult(syncMessage, errorMessage, context);
      }

      throw error;
    }
  }

  /**
   * Execute pull-based sync for an integration
   */
  private async executePullSync(
    message: InboundSyncMessage,
    context: any
  ): Promise<SyncResult> {
    const { integrationId, tenantId, connectionId, syncMode } = message;

    try {
      // Get integration connection details
      const connection = await this.credentialService.getCredential(
        connectionId
      );

      if (!connection) {
        throw new Error(`Connection ${connectionId} not found`);
      }

      // Execute the sync task
      const result = await this.syncTaskService.executeSync({
        integrationId,
        tenantId,
        connectionId,
        syncMode: syncMode as 'pull' | 'bidirectional',
        batchSize: this.config.batchSize,
        includeMetadata: true,
      });

      return result;
    } catch (error) {
      throw new Error(
        `Pull sync failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Store sync results to Cosmos DB
   */
  private async storeResults(
    message: InboundSyncMessage,
    result: SyncResult,
    context: any
  ): Promise<void> {
    try {
      const resultsContainer = this.cosmosClient
        .database(this.config.databaseId)
        .container(this.config.resultsContainerId);

      const record = {
        id: `${message.integrationId}-${Date.now()}`,
        integrationId: message.integrationId,
        tenantId: message.tenantId,
        connectionId: message.connectionId,
        taskId: message.taskId,
        correlationId: message.correlationId,
        syncMode: message.syncMode,
        status: result.status,
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsFailed: result.recordsFailed,
        conflictsDetected: result.conflictsDetected,
        conflictsResolved: result.conflictsResolved,
        duration: result.duration,
        metadata: result.metadata,
        executedAt: new Date().toISOString(),
        ttl: 2592000, // 30 days
      };

      await resultsContainer.items.create(record);

      context.log(
        `[${context.invocationId}] Stored results for ${message.integrationId}`
      );
    } catch (error) {
      context.log.error(
        `Failed to store results: ${error instanceof Error ? error.message : String(error)}`
      );
      // Don't throw - results can be reconstructed from logs
    }
  }

  /**
   * Store failure results
   */
  private async storeFailureResult(
    message: InboundSyncMessage,
    errorMessage: string,
    context: any
  ): Promise<void> {
    try {
      const resultsContainer = this.cosmosClient
        .database(this.config.databaseId)
        .container(this.config.resultsContainerId);

      const failureRecord = {
        id: `${message.integrationId}-${Date.now()}-error`,
        integrationId: message.integrationId,
        tenantId: message.tenantId,
        status: 'failed' as SyncStatus,
        errorMessage,
        executedAt: new Date().toISOString(),
        ttl: 2592000,
      };

      await resultsContainer.items.create(failureRecord);
    } catch (error) {
      context.log.warn(
        `Failed to store failure result: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// Azure Function binding
app.serviceBusQueue('SyncInboundWorker', {
  connection: 'SERVICE_BUS_CONNECTION_STRING',
  queueName: 'sync-inbound',
  cardinality: 'one',
  handler: async (message: ServiceBusQueueTrigger, context: any) => {
    const config: SyncInboundConfig = {
      cosmosEndpoint:
        process.env.COSMOS_ENDPOINT || 'https://localhost:8081',
      cosmosKey: process.env.COSMOS_KEY || 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTjd3K6QCHBUI2djStw5ih+ax7IB9binCwZBicT/M=',
      databaseId: process.env.COSMOS_DATABASE || 'castiel',
      containerId: process.env.COSMOS_CONTAINER || 'sync-tasks',
      resultsContainerId: process.env.SYNC_RESULTS_CONTAINER || 'sync-results',
      keyVaultUrl: process.env.KEY_VAULT_URL || '',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      maxRetries: parseInt(process.env.SYNC_MAX_RETRIES || '3', 10),
      batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '100', 10),
    };

    const worker = new SyncInboundWorker(config);
    await worker.handleMessage(message, context);
  },
});

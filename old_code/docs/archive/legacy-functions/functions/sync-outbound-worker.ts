import { app, ServiceBusQueueTrigger } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { SecureCredentialService } from '../services/secure-credential.service';
import { SyncTaskService } from '../services/sync-task.service';
import { IntegrationRateLimiter } from '../services/integration-rate-limiter.service';
import { BidirectionalSyncEngine } from '../services/bidirectional-sync.service';
import type { SyncResult } from '../services/sync-task.service';

/**
 * SyncOutboundWorker Azure Function
 * 
 * Processes outbound sync tasks - pushing local changes to external systems.
 * Monitors database for changes via Cosmos DB Change Feed (via Event Grid trigger).
 * Applies bidirectional sync conflict resolution and pushes changes.
 * 
 * Trigger: Service Bus Queue (sync-outbound)
 * Input: Change feed events, Service Bus messages
 * Output: External systems via adapters
 */

interface SyncOutboundConfig {
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

interface OutboundSyncMessage {
  integrationId: string;
  tenantId: string;
  connectionId: string;
  entityId: string;
  shardId: string;
  operation: 'create' | 'update' | 'delete';
  changes: Record<string, any>;
  correlationId: string;
  timestamp: string;
}

interface PushResult {
  success: boolean;
  externalId?: string;
  error?: string;
  duration: number;
  retryable: boolean;
}

class SyncOutboundWorker {
  private cosmosClient: CosmosClient;
  private syncTaskService: SyncTaskService;
  private credentialService: SecureCredentialService;
  private rateLimiter: IntegrationRateLimiter;
  private syncEngine: BidirectionalSyncEngine;
  private config: SyncOutboundConfig;

  constructor(config: SyncOutboundConfig) {
    this.config = config;

    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });

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

    this.syncEngine = new BidirectionalSyncEngine(
      this.cosmosClient.database(config.databaseId)
    );
  }

  /**
   * Main message trigger handler
   * Processes a single outbound sync message
   */
  async handleMessage(
    message: ServiceBusQueueTrigger,
    context: any
  ): Promise<void> {
    const startTime = Date.now();
    const executionId = context.invocationId;

    let syncMessage: OutboundSyncMessage;

    try {
      syncMessage = JSON.parse(message.body || '{}') as OutboundSyncMessage;

      context.log(
        `[${executionId}] Processing outbound sync: ${syncMessage.operation} ${syncMessage.entityId} to ${syncMessage.integrationId}`
      );

      // Check rate limits
      const rateLimitCheck = await this.rateLimiter.checkRateLimit({
        integrationId: syncMessage.integrationId,
        tenantId: syncMessage.tenantId,
        operation: syncMessage.operation,
      });

      if (!rateLimitCheck.allowed && !rateLimitCheck.queued) {
        context.log.warn(
          `[${executionId}] Rate limit exceeded, will retry in ${rateLimitCheck.retryAfterSeconds}s`
        );
        throw new Error(
          `RATE_LIMIT_EXCEEDED|${rateLimitCheck.retryAfterSeconds}`
        );
      }

      // Get the entity from database
      const entity = await this.getEntity(syncMessage, context);

      if (!entity) {
        context.log.warn(
          `[${executionId}] Entity ${syncMessage.entityId} not found`
        );
        return;
      }

      // Apply conflict resolution if needed
      const resolvedEntity = await this.resolveConflicts(
        syncMessage,
        entity,
        context
      );

      // Push changes to external system
      const pushResult = await this.pushChanges(
        syncMessage,
        resolvedEntity,
        context
      );

      // Store push result
      await this.storeResult(syncMessage, pushResult, context);

      if (!pushResult.success && pushResult.retryable) {
        throw new Error(
          `Push failed (retryable): ${pushResult.error}`
        );
      }

      context.log(
        `[${executionId}] Outbound sync completed in ${Date.now() - startTime}ms`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      context.log.error(`[${executionId}] Outbound sync failed: ${errorMessage}`);

      if (errorMessage.startsWith('RATE_LIMIT_EXCEEDED')) {
        const [, retrySeconds] = errorMessage.split('|');
        throw new Error(`Retry after ${retrySeconds}s`);
      }

      if (syncMessage) {
        await this.storeErrorResult(syncMessage, errorMessage, context);
      }

      throw error;
    }
  }

  /**
   * Retrieve the entity from Cosmos DB
   */
  private async getEntity(
    message: OutboundSyncMessage,
    context: any
  ): Promise<any> {
    try {
      const container = this.cosmosClient
        .database(this.config.databaseId)
        .container(this.config.containerId);

      const { resource } = await container.item(
        message.entityId,
        message.tenantId
      ).read();

      return resource;
    } catch (error) {
      context.log.warn(
        `Failed to retrieve entity: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Resolve conflicts using BidirectionalSyncEngine
   */
  private async resolveConflicts(
    message: OutboundSyncMessage,
    localEntity: any,
    context: any
  ): Promise<any> {
    try {
      // Get external version if it exists
      const externalEntity = await this.getExternalEntity(message, context);

      if (!externalEntity) {
        return localEntity; // No conflict if external doesn't exist
      }

      // Use conflict resolution strategy
      const resolved = await this.syncEngine.resolveConflict(
        localEntity,
        externalEntity,
        {
          strategy: 'local_wins', // Push mode = local always wins
          mergeStrategy: 'manual',
        }
      );

      return resolved.resolvedEntity;
    } catch (error) {
      context.log.warn(
        `Conflict resolution failed, using local: ${error instanceof Error ? error.message : String(error)}`
      );
      return localEntity;
    }
  }

  /**
   * Get external entity version (for conflict detection)
   */
  private async getExternalEntity(
    message: OutboundSyncMessage,
    context: any
  ): Promise<any> {
    try {
      const connection = await this.credentialService.getCredential(
        message.connectionId
      );

      if (!connection) {
        return null;
      }

      // Try to fetch from external system using adapter
      const adapter = await this.syncTaskService.getAdapterForIntegration(
        message.integrationId
      );

      if (!adapter) {
        return null;
      }

      // Fetch single entity by external ID
      const externalId = message.changes.externalId || message.shardId;
      const fetched = await adapter.fetch(connection, {
        filters: { id: externalId },
        limit: 1,
      });

      return fetched[0] || null;
    } catch (error) {
      // It's ok if external fetch fails - we'll push and overwrite
      context.log.debug(
        `Failed to fetch external entity for conflict check: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Push changes to external system
   */
  private async pushChanges(
    message: OutboundSyncMessage,
    entity: any,
    context: any
  ): Promise<PushResult> {
    const startTime = Date.now();

    try {
      const connection = await this.credentialService.getCredential(
        message.connectionId
      );

      if (!connection) {
        return {
          success: false,
          error: 'Connection not found',
          duration: Date.now() - startTime,
          retryable: false,
        };
      }

      const adapter = await this.syncTaskService.getAdapterForIntegration(
        message.integrationId
      );

      if (!adapter) {
        return {
          success: false,
          error: 'Adapter not found',
          duration: Date.now() - startTime,
          retryable: false,
        };
      }

      let result: any;

      // Execute operation based on message type
      switch (message.operation) {
        case 'create':
          result = await adapter.push(connection, [entity]);
          break;

        case 'update':
          result = await adapter.push(connection, [
            { ...entity, id: message.changes.externalId },
          ]);
          break;

        case 'delete':
          result = await adapter.delete(connection, [
            message.changes.externalId,
          ]);
          break;
      }

      return {
        success: result.success !== false,
        externalId: result.externalId || message.changes.externalId,
        duration: Date.now() - startTime,
        retryable: false,
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      const retryable =
        errorMsg.includes('timeout') ||
        errorMsg.includes('rate') ||
        errorMsg.includes('connection');

      return {
        success: false,
        error: errorMsg,
        duration: Date.now() - startTime,
        retryable,
      };
    }
  }

  /**
   * Store successful push result
   */
  private async storeResult(
    message: OutboundSyncMessage,
    result: PushResult,
    context: any
  ): Promise<void> {
    try {
      const resultsContainer = this.cosmosClient
        .database(this.config.databaseId)
        .container(this.config.resultsContainerId);

      const record = {
        id: `outbound-${message.entityId}-${Date.now()}`,
        integrationId: message.integrationId,
        tenantId: message.tenantId,
        entityId: message.entityId,
        externalId: result.externalId,
        operation: message.operation,
        success: result.success,
        duration: result.duration,
        error: result.error,
        executedAt: new Date().toISOString(),
        ttl: 2592000,
      };

      await resultsContainer.items.create(record);
    } catch (error) {
      context.log.warn(
        `Failed to store result: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Store error result
   */
  private async storeErrorResult(
    message: OutboundSyncMessage,
    errorMessage: string,
    context: any
  ): Promise<void> {
    try {
      const resultsContainer = this.cosmosClient
        .database(this.config.databaseId)
        .container(this.config.resultsContainerId);

      const errorRecord = {
        id: `outbound-error-${message.entityId}-${Date.now()}`,
        integrationId: message.integrationId,
        tenantId: message.tenantId,
        entityId: message.entityId,
        operation: message.operation,
        success: false,
        errorMessage,
        executedAt: new Date().toISOString(),
        ttl: 2592000,
      };

      await resultsContainer.items.create(errorRecord);
    } catch (error) {
      context.log.warn(
        `Failed to store error result: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// Azure Function binding
app.serviceBusQueue('SyncOutboundWorker', {
  connection: 'SERVICE_BUS_CONNECTION_STRING',
  queueName: 'sync-outbound',
  cardinality: 'one',
  handler: async (message: ServiceBusQueueTrigger, context: any) => {
    const config: SyncOutboundConfig = {
      cosmosEndpoint:
        process.env.COSMOS_ENDPOINT || 'https://localhost:8081',
      cosmosKey: process.env.COSMOS_KEY || 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTjd3K6QCHBUI2djStw5ih+ax7IB9binCwZBicT/M=',
      databaseId: process.env.COSMOS_DATABASE || 'castiel',
      containerId: process.env.COSMOS_CONTAINER || 'entities',
      resultsContainerId: process.env.SYNC_RESULTS_CONTAINER || 'sync-results',
      keyVaultUrl: process.env.KEY_VAULT_URL || '',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      maxRetries: parseInt(process.env.SYNC_MAX_RETRIES || '3', 10),
      batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '100', 10),
    };

    const worker = new SyncOutboundWorker(config);
    await worker.handleMessage(message, context);
  },
});

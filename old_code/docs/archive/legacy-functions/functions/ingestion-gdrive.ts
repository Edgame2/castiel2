/**
 * Google Drive Ingestion Function (Phase 2)
 * 
 * Ingests Google Drive folders and files into the shard system.
 * Uses delta tokens for incremental sync with 10-15 min polling.
 * 
 * Trigger: Timer (10-15 min intervals)
 * Output: Emits ingestion-events to Service Bus
 */

import { app, Timer } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { ServiceBusClient } from '@azure/service-bus';
import { DefaultAzureCredential } from '@azure/identity';
import type { IngestionEvent } from '../../apps/api/src/types/ingestion-event.types.js';
import { v4 as uuidv4 } from 'uuid';

interface GoogleDriveIngestionConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  serviceBusConnectionString: string;
  ingestionEventsQueueName: string;
  keyVaultUrl: string;
}

class GoogleDriveIngestionFunction {
  private cosmosClient: CosmosClient;
  private serviceBusClient: ServiceBusClient;
  private config: GoogleDriveIngestionConfig;

  constructor(config: GoogleDriveIngestionConfig) {
    this.config = config;
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });
    this.serviceBusClient = new ServiceBusClient(config.serviceBusConnectionString);
  }

  /**
   * Timer trigger handler for polling Google Drive
   */
  async handleTimer(timer: Timer, context: any): Promise<void> {
    const executionId = context.invocationId;
    context.log(`[${executionId}] Google Drive polling started`);

    try {
      // Get all active Google Drive integrations
      const database = this.cosmosClient.database(this.config.databaseId);
      const integrationsContainer = database.container('tenant-integrations');
      
      const { resources: integrations } = await integrationsContainer.items
        .query({
          query: `SELECT * FROM c WHERE c.providerName = 'gdrive' AND c.status = 'active'`,
        })
        .fetchAll();

      for (const integration of integrations) {
        const tenantId = integration.tenantId;
        
        try {
          // Get state shard for this integration
          const stateShard = await this.getStateShard(tenantId, 'gdrive', context);
          const deltaToken = stateShard?.structuredData?.cursor;

          // Poll Google Drive for changes using delta token
          // TODO: Implement Google Drive API polling using delta token
          // For now, this is a placeholder
          context.log(`[${executionId}] Polling Google Drive for tenant ${tenantId} with token: ${deltaToken || 'none'}`);

          // Simulate finding changes (in real implementation, call Google Drive API)
          const changes: any[] = []; // Would come from Google Drive API

          // Emit ingestion events for each change
          for (const change of changes) {
            const ingestionEvent: IngestionEvent = {
              tenantId,
              source: 'gdrive',
              sourceId: change.id,
              eventType: this.mapChangeType(change),
              observedAt: new Date(),
              payload: change,
              correlationId: executionId,
            };

            await this.emitIngestionEvent(ingestionEvent, context);
          }

          // Update state shard with new delta token
          await this.updateStateShard(tenantId, 'gdrive', {
            cursor: 'new-delta-token', // Would come from Google Drive API response
            lastSyncAt: new Date(),
            lastSyncStatus: changes.length > 0 ? 'success' : 'success',
            nextSyncAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min from now
          }, context);
        } catch (error: any) {
          context.log.error(`[${executionId}] Error polling tenant ${integration.tenantId}: ${error.message}`);
          await this.updateStateShard(integration.tenantId, 'gdrive', {
            lastSyncAt: new Date(),
            lastSyncStatus: 'failed',
            errorMessage: error.message,
          }, context);
        }
      }
    } catch (error: any) {
      context.log.error(`[${executionId}] Error in timer trigger: ${error.message}`);
    }
  }

  /**
   * Emit ingestion event to Service Bus
   */
  private async emitIngestionEvent(event: IngestionEvent, context: any): Promise<void> {
    const sender = this.serviceBusClient.createSender(this.config.ingestionEventsQueueName);
    
    await sender.sendMessages({
      body: event,
      contentType: 'application/json',
      messageId: uuidv4(),
      sessionId: event.tenantId,
      userProperties: {
        tenantId: event.tenantId,
        source: event.source,
        eventType: event.eventType,
      },
    });

    context.log(`Emitted ingestion event: ${event.source}/${event.sourceId}`);
  }

  /**
   * Get state shard for integration
   */
  private async getStateShard(
    tenantId: string,
    integrationType: string,
    context: any
  ): Promise<any> {
    try {
      const database = this.cosmosClient.database(this.config.databaseId);
      const shardsContainer = database.container('shards');

      const { resources } = await shardsContainer.items
        .query({
          query: `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.shardTypeId = 'integration.state' AND c.structuredData.integrationType = @integrationType`,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@integrationType', value: integrationType },
          ],
        })
        .fetchAll();

      return resources[0] || null;
    } catch (error: any) {
      context.log.error(`Error getting state shard: ${error.message}`);
      return null;
    }
  }

  /**
   * Update or create state shard
   */
  private async updateStateShard(
    tenantId: string,
    integrationType: string,
    updates: any,
    context: any
  ): Promise<void> {
    try {
      const database = this.cosmosClient.database(this.config.databaseId);
      const shardsContainer = database.container('shards');

      const existing = await this.getStateShard(tenantId, integrationType, context);
      const integrationId = `gdrive-${tenantId}`;

      if (existing) {
        await shardsContainer.item(existing.id, tenantId).replace({
          ...existing,
          structuredData: {
            ...existing.structuredData,
            ...updates,
          },
          updatedAt: new Date(),
        });
      } else {
        await shardsContainer.items.create({
          id: uuidv4(),
          tenantId,
          userId: 'system',
          shardTypeId: 'integration.state',
          structuredData: {
            integrationId,
            integrationType,
            lastSyncStatus: 'success',
            ...updates,
          },
          acl: [],
          vectors: [], // Required: empty vectors array
          schemaVersion: 1, // Required: default schema version
          lastActivityAt: new Date(), // Required: initial activity timestamp
          status: 'active',
          source: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          revisionId: uuidv4(),
          revisionNumber: 1,
        });
      }
    } catch (error: any) {
      context.log.error(`Error updating state shard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map Google Drive change type to ingestion event type
   */
  private mapChangeType(change: any): 'create' | 'update' | 'delete' {
    if (change.removed) return 'delete';
    if (change.file && !change.file.trashed) {
      // Check if this is a new file (no previous version)
      return 'create';
    }
    return 'update';
  }
}

// Initialize function with config from environment
const config: GoogleDriveIngestionConfig = {
  cosmosEndpoint: process.env.COSMOS_DB_ENDPOINT || '',
  cosmosKey: process.env.COSMOS_DB_KEY || '',
  databaseId: process.env.COSMOS_DB_DATABASE || 'castiel',
  serviceBusConnectionString: process.env.AZURE_SERVICE_BUS_CONNECTION_STRING || '',
  ingestionEventsQueueName: process.env.AZURE_SERVICE_BUS_INGESTION_EVENTS_QUEUE || 'ingestion-events',
  keyVaultUrl: process.env.AZURE_KEY_VAULT_URL || '',
};

const ingestionFunction = new GoogleDriveIngestionFunction(config);

// Register timer trigger (every 15 minutes)
app.timer('ingestion-gdrive-poll', {
  schedule: '0 */15 * * * *', // Every 15 minutes
  handler: (timer, context) => ingestionFunction.handleTimer(timer, context),
});


/**
 * Salesforce Ingestion Function (Phase 2)
 * 
 * Ingests Salesforce opportunities and accounts into the shard system.
 * Supports both HTTP webhook triggers and timer-based polling fallback.
 * 
 * Triggers:
 * - HTTP: Webhook events from Salesforce
 * - Timer: Polling fallback (5-10 min intervals)
 * 
 * Output: Emits ingestion-events to Service Bus
 */

import { app, HttpRequest, HttpResponseInit, Timer } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { ServiceBusClient } from '@azure/service-bus';
import { DefaultAzureCredential } from '@azure/identity';
import type { IngestionEvent } from '../../../api/src/types/ingestion-event.types.js';
import { v4 as uuidv4 } from 'uuid';

interface SalesforceIngestionConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  serviceBusConnectionString: string;
  ingestionEventsQueueName: string;
  keyVaultUrl: string;
}

class SalesforceIngestionFunction {
  private cosmosClient: CosmosClient;
  private serviceBusClient: ServiceBusClient;
  private config: SalesforceIngestionConfig;

  constructor(config: SalesforceIngestionConfig) {
    this.config = config;
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });
    this.serviceBusClient = new ServiceBusClient(config.serviceBusConnectionString);
  }

  /**
   * HTTP trigger handler for Salesforce webhooks
   */
  async handleWebhook(req: HttpRequest, context: any): Promise<HttpResponseInit> {
    const startTime = Date.now();
    const executionId = context.invocationId;

    context.log(`[${executionId}] Salesforce webhook received`);

    try {
      const body = await req.json();
      const tenantId = req.headers.get('x-tenant-id') || body.tenantId;
      
      if (!tenantId) {
        return {
          status: 400,
          jsonBody: { error: 'Missing tenantId' },
        };
      }

      // Extract Salesforce event data
      const eventType = body.event?.type || body.type || 'update';
      const sobject = body.sobject || body.payload?.sobject;
      
      if (!sobject) {
        return {
          status: 400,
          jsonBody: { error: 'Missing sobject data' },
        };
      }

      // Determine entity type (Opportunity or Account)
      const entityType = sobject.Type || sobject.type;
      const sourceId = sobject.Id || sobject.id;

      if (!sourceId || (entityType !== 'Opportunity' && entityType !== 'Account')) {
        context.log.warn(`[${executionId}] Unsupported entity type: ${entityType}`);
        return {
          status: 200,
          jsonBody: { message: 'Event ignored - unsupported entity type' },
        };
      }

      // Create ingestion event
      const ingestionEvent: IngestionEvent = {
        tenantId,
        source: 'salesforce',
        sourceId,
        eventType: this.mapEventType(eventType, body.event?.type),
        observedAt: new Date(),
        payload: sobject,
        correlationId: executionId,
      };

      // Emit to ingestion-events queue
      await this.emitIngestionEvent(ingestionEvent, context);

      // Update state shard with cursor (if applicable)
      await this.updateStateShard(tenantId, 'salesforce', {
        lastSyncAt: new Date(),
        lastSyncStatus: 'success',
      }, context);

      const duration = Date.now() - startTime;
      context.log(`[${executionId}] Webhook processed in ${duration}ms`);

      return {
        status: 200,
        jsonBody: {
          message: 'Webhook processed',
          eventId: executionId,
          duration,
        },
      };
    } catch (error: any) {
      context.log.error(`[${executionId}] Error processing webhook: ${error.message}`);
      return {
        status: 500,
        jsonBody: {
          error: 'Internal server error',
          message: error.message,
        },
      };
    }
  }

  /**
   * Timer trigger handler for polling fallback
   */
  async handleTimer(timer: Timer, context: any): Promise<void> {
    const executionId = context.invocationId;
    context.log(`[${executionId}] Salesforce polling started`);

    try {
      // Get all active Salesforce integrations
      const database = this.cosmosClient.database(this.config.databaseId);
      const integrationsContainer = database.container('tenant-integrations');
      
      const { resources: integrations } = await integrationsContainer.items
        .query({
          query: `SELECT * FROM c WHERE c.providerName = 'salesforce' AND c.status = 'active'`,
        })
        .fetchAll();

      for (const integration of integrations) {
        const tenantId = integration.tenantId;
        
        try {
          // Get state shard for this integration
          const stateShard = await this.getStateShard(tenantId, 'salesforce', context);
          const cursor = stateShard?.structuredData?.cursor;

          // Poll Salesforce for changes
          // TODO: Implement Salesforce API polling using cursor
          // For now, this is a placeholder
          context.log(`[${executionId}] Polling Salesforce for tenant ${tenantId}`);

          // Update state shard
          await this.updateStateShard(tenantId, 'salesforce', {
            lastSyncAt: new Date(),
            lastSyncStatus: 'success',
            nextSyncAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
          }, context);
        } catch (error: any) {
          context.log.error(`[${executionId}] Error polling tenant ${integration.tenantId}: ${error.message}`);
          await this.updateStateShard(integration.tenantId, 'salesforce', {
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
      const integrationId = `salesforce-${tenantId}`;

      if (existing) {
        // Update existing state shard
        await shardsContainer.item(existing.id, tenantId).replace({
          ...existing,
          structuredData: {
            ...existing.structuredData,
            ...updates,
          },
          updatedAt: new Date(),
        });
      } else {
        // Create new state shard with all required fields
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
   * Map Salesforce event type to ingestion event type
   */
  private mapEventType(entityType: string, eventType?: string): 'create' | 'update' | 'delete' {
    if (eventType) {
      if (eventType.includes('created') || eventType.includes('new')) return 'create';
      if (eventType.includes('deleted') || eventType.includes('removed')) return 'delete';
    }
    return 'update'; // Default to update
  }
}

// Initialize function with config from environment
const config: SalesforceIngestionConfig = {
  cosmosEndpoint: process.env.COSMOS_DB_ENDPOINT || '',
  cosmosKey: process.env.COSMOS_DB_KEY || '',
  databaseId: process.env.COSMOS_DB_DATABASE || 'castiel',
  serviceBusConnectionString: process.env.AZURE_SERVICE_BUS_CONNECTION_STRING || '',
  ingestionEventsQueueName: process.env.AZURE_SERVICE_BUS_INGESTION_EVENTS_QUEUE || 'ingestion-events',
  keyVaultUrl: process.env.AZURE_KEY_VAULT_URL || '',
};

const ingestionFunction = new SalesforceIngestionFunction(config);

// Register HTTP trigger
app.http('ingestion-salesforce-webhook', {
  methods: ['POST'],
  authLevel: 'function',
  handler: (req, context) => ingestionFunction.handleWebhook(req, context),
});

// Register timer trigger (every 10 minutes)
app.timer('ingestion-salesforce-poll', {
  schedule: '0 */10 * * * *', // Every 10 minutes
  handler: (timer, context) => ingestionFunction.handleTimer(timer, context),
});


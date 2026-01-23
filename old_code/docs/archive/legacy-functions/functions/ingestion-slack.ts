/**
 * Slack Ingestion Function (Phase 2)
 * 
 * Ingests Slack channels into the shard system.
 * Supports HTTP webhook triggers for real-time events with throttling and deduplication.
 * 
 * Trigger: HTTP (Slack events)
 * Output: Emits ingestion-events to Service Bus
 */

import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { ServiceBusClient } from '@azure/service-bus';
import type { IngestionEvent } from '../../apps/api/src/types/ingestion-event.types.js';
import { v4 as uuidv4 } from 'uuid';

interface SlackIngestionConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  serviceBusConnectionString: string;
  ingestionEventsQueueName: string;
}

class SlackIngestionFunction {
  private cosmosClient: CosmosClient;
  private serviceBusClient: ServiceBusClient;
  private config: SlackIngestionConfig;
  private processedEvents: Set<string> = new Set(); // Simple in-memory dedupe (would use Redis in production)

  constructor(config: SlackIngestionConfig) {
    this.config = config;
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });
    this.serviceBusClient = new ServiceBusClient(config.serviceBusConnectionString);
  }

  /**
   * HTTP trigger handler for Slack events
   */
  async handleWebhook(req: HttpRequest, context: any): Promise<HttpResponseInit> {
    const startTime = Date.now();
    const executionId = context.invocationId;

    context.log(`[${executionId}] Slack webhook received`);

    try {
      const body = await req.json();
      
      // Slack URL verification challenge
      if (body.type === 'url_verification') {
        return {
          status: 200,
          jsonBody: { challenge: body.challenge },
        };
      }

      const tenantId = req.headers.get('x-tenant-id') || body.tenant_id;
      
      if (!tenantId) {
        return {
          status: 400,
          jsonBody: { error: 'Missing tenantId' },
        };
      }

      // Extract Slack event data
      const event = body.event;
      if (!event) {
        return {
          status: 200,
          jsonBody: { message: 'Event ignored - no event data' },
        };
      }

      // Only process channel-related events
      if (event.type !== 'channel_created' && event.type !== 'channel_updated' && event.type !== 'channel_deleted') {
        return {
          status: 200,
          jsonBody: { message: 'Event ignored - not a channel event' },
        };
      }

      const channel = event.channel;
      if (!channel || !channel.id) {
        return {
          status: 200,
          jsonBody: { message: 'Event ignored - no channel data' },
        };
      }

      // Deduplication check
      const eventKey = `${tenantId}-${channel.id}-${event.ts || Date.now()}`;
      if (this.processedEvents.has(eventKey)) {
        context.log(`[${executionId}] Duplicate event ignored: ${eventKey}`);
        return {
          status: 200,
          jsonBody: { message: 'Event already processed' },
        };
      }
      this.processedEvents.add(eventKey);

      // Throttle: Limit processed events per tenant (simple implementation)
      // In production, use Redis-based rate limiting
      const throttleKey = `slack-${tenantId}`;
      // TODO: Implement proper throttling

      // Create ingestion event
      const ingestionEvent: IngestionEvent = {
        tenantId,
        source: 'slack',
        sourceId: channel.id,
        eventType: this.mapEventType(event.type),
        observedAt: new Date(),
        payload: channel,
        correlationId: executionId,
      };

      // Emit to ingestion-events queue
      await this.emitIngestionEvent(ingestionEvent, context);

      // Update state shard with cursor
      await this.updateStateShard(tenantId, 'slack', {
        cursor: event.ts || Date.now().toString(),
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
      const integrationId = `slack-${tenantId}`;

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
   * Map Slack event type to ingestion event type
   */
  private mapEventType(eventType: string): 'create' | 'update' | 'delete' {
    if (eventType === 'channel_created') return 'create';
    if (eventType === 'channel_deleted') return 'delete';
    return 'update';
  }
}

// Initialize function with config from environment
const config: SlackIngestionConfig = {
  cosmosEndpoint: process.env.COSMOS_DB_ENDPOINT || '',
  cosmosKey: process.env.COSMOS_DB_KEY || '',
  databaseId: process.env.COSMOS_DB_DATABASE || 'castiel',
  serviceBusConnectionString: process.env.AZURE_SERVICE_BUS_CONNECTION_STRING || '',
  ingestionEventsQueueName: process.env.AZURE_SERVICE_BUS_INGESTION_EVENTS_QUEUE || 'ingestion-events',
};

const ingestionFunction = new SlackIngestionFunction(config);

// Register HTTP trigger
app.http('ingestion-slack-webhook', {
  methods: ['POST'],
  authLevel: 'function',
  handler: (req, context) => ingestionFunction.handleWebhook(req, context),
});


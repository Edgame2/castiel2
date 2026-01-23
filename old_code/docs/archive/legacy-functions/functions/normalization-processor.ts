/**
 * Normalization Processor Function (Phase 2)
 * 
 * Consumes ingestion-events from Service Bus and normalizes vendor-specific
 * data into canonical shard type schemas. Creates source shards and populates
 * enhanced external_relationships structure.
 * 
 * Trigger: Service Bus queue (ingestion-events)
 * Output: Emits to shard-emission queue
 */

import { app, ServiceBusMessage } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { ServiceBusClient } from '@azure/service-bus';
import type { IngestionEvent } from '../../apps/api/src/types/ingestion-event.types.js';
import { SyncStatus, SyncDirection } from '../../apps/api/src/types/shard.types.js';
import { v4 as uuidv4 } from 'uuid';

interface NormalizationProcessorConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  serviceBusConnectionString: string;
  shardEmissionQueueName: string;
}

interface ShardEmissionMessage {
  shardId: string;
  tenantId: string;
  shardTypeId: string;
  normalized: boolean;
  correlationId: string;
}

class NormalizationProcessorFunction {
  private cosmosClient: CosmosClient;
  private serviceBusClient: ServiceBusClient;
  private config: NormalizationProcessorConfig;

  constructor(config: NormalizationProcessorConfig) {
    this.config = config;
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });
    this.serviceBusClient = new ServiceBusClient(config.serviceBusConnectionString);
  }

  /**
   * Service Bus trigger handler
   */
  async handleMessage(message: ServiceBusMessage, context: any): Promise<void> {
    const startTime = Date.now();
    const executionId = context.invocationId;

    try {
      const ingestionEvent: IngestionEvent = message.body as IngestionEvent;
      context.log(`[${executionId}] Processing ingestion event: ${ingestionEvent.source}/${ingestionEvent.sourceId}`);

      // Normalize based on source
      let normalizedShard: any;
      
      switch (ingestionEvent.source) {
        case 'salesforce':
          normalizedShard = await this.normalizeSalesforce(ingestionEvent, context);
          break;
        case 'gdrive':
          normalizedShard = await this.normalizeGoogleDrive(ingestionEvent, context);
          break;
        case 'slack':
          normalizedShard = await this.normalizeSlack(ingestionEvent, context);
          break;
        default:
          context.log.warn(`[${executionId}] Unsupported source: ${ingestionEvent.source}`);
          return;
      }

      if (!normalizedShard) {
        context.log.warn(`[${executionId}] Normalization returned no shard, skipping`);
        return;
      }

      // Create or update shard in Cosmos DB
      const shard = await this.createOrUpdateShard(normalizedShard, context);

      // Emit to shard-emission queue
      const emissionMessage: ShardEmissionMessage = {
        shardId: shard.id,
        tenantId: shard.tenantId,
        shardTypeId: shard.shardTypeId,
        normalized: true,
        correlationId: ingestionEvent.correlationId || executionId,
      };

      await this.emitShardEmission(emissionMessage, context);

      const duration = Date.now() - startTime;
      context.log(`[${executionId}] Normalized and created shard in ${duration}ms`);
    } catch (error: any) {
      context.log.error(`[${executionId}] Error processing message: ${error.message}`);
      throw error; // Will trigger retry/DLQ
    }
  }

  /**
   * Normalize Salesforce data
   */
  private async normalizeSalesforce(
    event: IngestionEvent,
    context: any
  ): Promise<any | null> {
    const payload = event.payload;
    if (!payload) return null;

    // Determine shard type based on entity type
    const entityType = payload.Type || payload.type;
    let shardTypeId: string;
    let structuredData: any;

    if (entityType === 'Opportunity') {
      shardTypeId = 'c_opportunity';
      structuredData = {
        name: payload.Name || payload.name,
        stage: this.mapSalesforceStage(payload.StageName || payload.stageName),
        value: payload.Amount || payload.amount || 0,
        currency: payload.CurrencyIsoCode || payload.currency || 'USD',
        accountId: payload.AccountId || payload.accountId,
        ownerId: payload.OwnerId || payload.ownerId,
        probability: payload.Probability || payload.probability || 0,
        closeDate: payload.CloseDate || payload.closeDate,
        expectedRevenue: payload.ExpectedRevenue || payload.expectedRevenue || 0,
        description: payload.Description || payload.description,
      };
    } else if (entityType === 'Account') {
      shardTypeId = 'c_account';
      structuredData = {
        name: payload.Name || payload.name,
        industry: payload.Industry || payload.industry,
        revenue: payload.AnnualRevenue || payload.annualRevenue || 0,
        employees: payload.NumberOfEmployees || payload.numberOfEmployees || 0,
        website: payload.Website || payload.website,
        description: payload.Description || payload.description,
      };
    } else {
      context.log.warn(`Unsupported Salesforce entity type: ${entityType}`);
      return null;
    }

    // Build enhanced external_relationships
    const externalRelationship = {
      id: uuidv4(),
      system: 'salesforce',
      systemType: entityType === 'Opportunity' ? 'crm' : 'crm',
      externalId: event.sourceId,
      label: structuredData.name,
      syncStatus: SyncStatus.SYNCED,
      syncDirection: SyncDirection.INBOUND,
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      createdBy: 'system',
    };

    return {
      tenantId: event.tenantId,
      userId: 'system',
      shardTypeId,
      structuredData,
      external_relationships: [externalRelationship],
      internal_relationships: [],
      acl: [],
      status: event.eventType === 'delete' ? 'archived' : 'active',
      source: 'integration',
      sourceDetails: {
        integrationName: 'salesforce',
        originalId: event.sourceId,
        syncedAt: new Date(),
      },
    };
  }

  /**
   * Normalize Google Drive data
   */
  private async normalizeGoogleDrive(
    event: IngestionEvent,
    context: any
  ): Promise<any | null> {
    const payload = event.payload;
    if (!payload) return null;

    // Determine if folder or file
    const mimeType = payload.mimeType || payload.mime_type;
    const isFolder = mimeType === 'application/vnd.google-apps.folder' || payload.kind === 'drive#folder';

    let shardTypeId: string;
    let structuredData: any;

    if (isFolder) {
      shardTypeId = 'c_folder';
      structuredData = {
        name: payload.name,
        provider: 'gdrive',
        externalId: payload.id,
        path: payload.path || payload.fullFileExtension || '',
        parentExternalId: payload.parents?.[0] || payload.parentFolderId,
        owner: payload.owners?.[0]?.emailAddress || payload.owner?.email,
        description: payload.description,
      };
    } else {
      shardTypeId = 'c_file';
      structuredData = {
        name: payload.name,
        provider: 'gdrive',
        externalId: payload.id,
        mimeType: mimeType || 'application/octet-stream',
        size: payload.size || 0,
        checksum: payload.md5Checksum || payload.md5_checksum,
        sourceUrl: payload.webViewLink || payload.web_view_link || payload.webContentLink || payload.web_content_link,
        parentFolderExternalId: payload.parents?.[0] || payload.parentFolderId,
        owner: payload.owners?.[0]?.emailAddress || payload.owner?.email,
        lastModified: payload.modifiedTime || payload.modified_time || new Date(),
      };
    }

    const externalRelationship = {
      id: uuidv4(),
      system: 'gdrive',
      systemType: isFolder ? 'storage' : 'storage',
      externalId: event.sourceId,
      label: structuredData.name,
      syncStatus: SyncStatus.SYNCED,
      syncDirection: SyncDirection.INBOUND,
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      createdBy: 'system',
    };

    return {
      tenantId: event.tenantId,
      userId: 'system',
      shardTypeId,
      structuredData,
      external_relationships: [externalRelationship],
      internal_relationships: [],
      acl: [],
      status: event.eventType === 'delete' ? 'archived' : 'active',
      source: 'integration',
      sourceDetails: {
        integrationName: 'gdrive',
        originalId: event.sourceId,
        syncedAt: new Date(),
      },
    };
  }

  /**
   * Normalize Slack data
   */
  private async normalizeSlack(
    event: IngestionEvent,
    context: any
  ): Promise<any | null> {
    const payload = event.payload;
    if (!payload) return null;

    const shardTypeId = 'c_channel';
    const structuredData = {
      platform: 'slack',
      name: payload.name,
      externalId: payload.id,
      teamExternalId: payload.team_id || payload.teamId,
      topic: payload.topic?.value || payload.topic,
      description: payload.purpose?.value || payload.purpose,
      isPrivate: payload.is_private || payload.isPrivate || false,
      members: payload.members ? JSON.stringify(payload.members) : undefined,
    };

    const externalRelationship = {
      id: uuidv4(),
      system: 'slack',
      systemType: 'messaging',
      externalId: event.sourceId,
      label: structuredData.name,
      syncStatus: SyncStatus.SYNCED,
      syncDirection: SyncDirection.INBOUND,
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      createdBy: 'system',
    };

    return {
      tenantId: event.tenantId,
      userId: 'system',
      shardTypeId,
      structuredData,
      external_relationships: [externalRelationship],
      internal_relationships: [],
      acl: [],
      status: event.eventType === 'delete' ? 'archived' : 'active',
      source: 'integration',
      sourceDetails: {
        integrationName: 'slack',
        originalId: event.sourceId,
        syncedAt: new Date(),
      },
    };
  }

  /**
   * Create or update shard in Cosmos DB
   */
  private async createOrUpdateShard(shardData: any, context: any): Promise<any> {
    const database = this.cosmosClient.database(this.config.databaseId);
    const shardsContainer = database.container('shards');

    // Check if shard already exists by external_relationships
    const externalId = shardData.external_relationships[0]?.externalId;
    const system = shardData.external_relationships[0]?.system;

    if (externalId && system) {
      const { resources: existing } = await shardsContainer.items
        .query({
          query: `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.shardTypeId = @shardTypeId AND ARRAY_CONTAINS(c.external_relationships, {externalId: @externalId, system: @system}, true)`,
          parameters: [
            { name: '@tenantId', value: shardData.tenantId },
            { name: '@shardTypeId', value: shardData.shardTypeId },
            { name: '@externalId', value: externalId },
            { name: '@system', value: system },
          ],
        })
        .fetchAll();

      if (existing.length > 0) {
        // Update existing shard
        const existingShard = existing[0];
        const updated = {
          ...existingShard,
          structuredData: shardData.structuredData,
          external_relationships: shardData.external_relationships,
          status: shardData.status,
          updatedAt: new Date(),
          revisionNumber: (existingShard.revisionNumber || 0) + 1,
          revisionId: uuidv4(),
        };

        await shardsContainer.item(existingShard.id, shardData.tenantId).replace(updated);
        return updated;
      }
    }

    // Create new shard with all required fields
    const newShard = {
      id: uuidv4(),
      ...shardData,
      vectors: [], // Required: empty vectors array
      schemaVersion: 1, // Required: default schema version
      lastActivityAt: new Date(), // Required: initial activity timestamp
      createdAt: new Date(),
      updatedAt: new Date(),
      revisionId: uuidv4(),
      revisionNumber: 1,
    };

    await shardsContainer.items.create(newShard);
    return newShard;
  }

  /**
   * Emit shard emission message to Service Bus
   */
  private async emitShardEmission(message: ShardEmissionMessage, context: any): Promise<void> {
    const sender = this.serviceBusClient.createSender(this.config.shardEmissionQueueName);
    
    await sender.sendMessages({
      body: message,
      contentType: 'application/json',
      messageId: uuidv4(),
      sessionId: message.tenantId,
      userProperties: {
        tenantId: message.tenantId,
        shardId: message.shardId,
        shardTypeId: message.shardTypeId,
      },
    });

    context.log(`Emitted shard emission: ${message.shardId}`);
  }

  /**
   * Map Salesforce stage to canonical stage
   */
  private mapSalesforceStage(stage: string): string {
    const stageMap: Record<string, string> = {
      'Prospecting': 'prospecting',
      'Qualification': 'qualification',
      'Needs Analysis': 'needs_analysis',
      'Value Proposition': 'value_proposition',
      'Id. Decision Makers': 'id_decision_makers',
      'Perception Analysis': 'perception_analysis',
      'Proposal/Price Quote': 'proposal_price_quote',
      'Negotiation/Review': 'negotiation_review',
      'Closed Won': 'closed_won',
      'Closed Lost': 'closed_lost',
    };

    return stageMap[stage] || stage.toLowerCase().replace(/\s+/g, '_');
  }
}

// Initialize function with config from environment
const config: NormalizationProcessorConfig = {
  cosmosEndpoint: process.env.COSMOS_DB_ENDPOINT || '',
  cosmosKey: process.env.COSMOS_DB_KEY || '',
  databaseId: process.env.COSMOS_DB_DATABASE || 'castiel',
  serviceBusConnectionString: process.env.AZURE_SERVICE_BUS_CONNECTION_STRING || '',
  shardEmissionQueueName: process.env.AZURE_SERVICE_BUS_SHARD_EMISSION_QUEUE || 'shard-emission',
};

const processor = new NormalizationProcessorFunction(config);

// Register Service Bus trigger
app.serviceBusQueue('normalization-processor', {
  connection: 'AZURE_SERVICE_BUS_CONNECTION_STRING',
  queueName: process.env.AZURE_SERVICE_BUS_INGESTION_EVENTS_QUEUE || 'ingestion-events',
  handler: (message, context) => processor.handleMessage(message, context),
});


import { CosmosClient, Container, ContainerDefinition } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { WebhookDelivery, ShardEventPayload, ShardEventType } from '../types/shard-event.types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Cosmos DB container configuration for Webhook Deliveries
 */
const WEBHOOK_DELIVERY_CONTAINER_CONFIG: ContainerDefinition = {
  id: config.cosmosDb.containers.webhookDeliveries,
  partitionKey: {
    paths: ['/tenantId'],
  },
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [{ path: '/*' }],
    excludedPaths: [
      { path: '/payload/*' }, // Don't index the payload
      { path: '/responseBody/*' },
    ],
    compositeIndexes: [
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/status', order: 'ascending' },
        { path: '/createdAt', order: 'descending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/webhookId', order: 'ascending' },
        { path: '/createdAt', order: 'descending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/status', order: 'ascending' },
        { path: '/nextRetryAt', order: 'ascending' },
      ],
    ],
  },
  defaultTtl: 30 * 24 * 60 * 60, // 30 days TTL for deliveries
};

export interface WebhookDeliveryListOptions {
  tenantId: string;
  webhookId?: string;
  status?: 'pending' | 'success' | 'failed' | 'retrying';
  eventType?: ShardEventType;
  limit?: number;
  continuationToken?: string;
}

export interface WebhookDeliveryListResult {
  deliveries: WebhookDelivery[];
  continuationToken?: string;
  count: number;
}

/**
 * Webhook Delivery Repository
 * Handles all Cosmos DB operations for Webhook Deliveries
 */
export class WebhookDeliveryRepository {
  private client: CosmosClient;
  private container: Container;
  private monitoring: IMonitoringProvider;

  constructor(monitoring: IMonitoringProvider) {
    this.monitoring = monitoring;
    this.client = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
    });
    this.container = this.client
      .database(config.cosmosDb.databaseId)
      .container(config.cosmosDb.containers.webhookDeliveries);
  }

  /**
   * Initialize container with proper indexing
   */
  async ensureContainer(): Promise<void> {
    try {
      const { database } = await this.client.databases.createIfNotExists({
        id: config.cosmosDb.databaseId,
      });

      await database.containers.createIfNotExists(WEBHOOK_DELIVERY_CONTAINER_CONFIG);

      this.monitoring.trackEvent('cosmosdb.container.ensured', {
        container: config.cosmosDb.containers.webhookDeliveries,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhook-delivery.repository.ensureContainer',
      });
      throw error;
    }
  }

  /**
   * Create a new delivery record
   */
  async create(
    webhookId: string,
    tenantId: string,
    payload: ShardEventPayload,
    maxAttempts: number
  ): Promise<WebhookDelivery> {
    const startTime = Date.now();

    try {
      const delivery: WebhookDelivery = {
        id: uuidv4(),
        webhookId,
        tenantId,
        eventId: payload.eventId,
        eventType: payload.eventType,
        payload,
        status: 'pending',
        attempts: 0,
        maxAttempts,
        createdAt: new Date(),
      };

      const { resource } = await this.container.items.create<WebhookDelivery>(delivery);

      this.monitoring.trackDependency(
        'cosmosdb.webhookDelivery.create',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return resource as WebhookDelivery;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhook-delivery.repository.create',
        webhookId,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Find delivery by ID
   */
  async findById(id: string, tenantId: string): Promise<WebhookDelivery | undefined> {
    const startTime = Date.now();

    try {
      const { resource } = await this.container.item(id, tenantId).read<WebhookDelivery>();

      this.monitoring.trackDependency(
        'cosmosdb.webhookDelivery.read',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return resource;
    } catch (error: any) {
      if (error.code === 404) {return undefined;}
      this.monitoring.trackException(error as Error, {
        operation: 'webhook-delivery.repository.findById',
        id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Update delivery status after attempt
   */
  async updateAfterAttempt(
    id: string,
    tenantId: string,
    update: {
      status: 'success' | 'failed' | 'retrying';
      responseStatus?: number;
      responseBody?: string;
      responseTime?: number;
      error?: string;
      nextRetryAt?: Date;
    }
  ): Promise<WebhookDelivery> {
    const startTime = Date.now();

    try {
      const existing = await this.findById(id, tenantId);
      if (!existing) {
        throw new Error(`Delivery not found: ${id}`);
      }

      const updated: WebhookDelivery = {
        ...existing,
        status: update.status,
        attempts: existing.attempts + 1,
        responseStatus: update.responseStatus,
        responseBody: update.responseBody?.substring(0, 5000), // Limit response body size
        responseTime: update.responseTime,
        error: update.error,
        nextRetryAt: update.nextRetryAt,
        completedAt: update.status === 'success' || update.status === 'failed' ? new Date() : undefined,
      };

      const { resource } = await this.container.item(id, tenantId).replace<WebhookDelivery>(updated);

      this.monitoring.trackDependency(
        'cosmosdb.webhookDelivery.updateAfterAttempt',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return resource as WebhookDelivery;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhook-delivery.repository.updateAfterAttempt',
        id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * List deliveries
   */
  async list(options: WebhookDeliveryListOptions): Promise<WebhookDeliveryListResult> {
    const startTime = Date.now();
    const { tenantId, webhookId, status, eventType, limit = 100, continuationToken } = options;

    const queryParts: string[] = ['c.tenantId = @tenantId'];
    const parameters: { name: string; value: any }[] = [{ name: '@tenantId', value: tenantId }];

    if (webhookId) {
      queryParts.push('c.webhookId = @webhookId');
      parameters.push({ name: '@webhookId', value: webhookId });
    }

    if (status) {
      queryParts.push('c.status = @status');
      parameters.push({ name: '@status', value: status });
    }

    if (eventType) {
      queryParts.push('c.eventType = @eventType');
      parameters.push({ name: '@eventType', value: eventType });
    }

    const query = `SELECT * FROM c WHERE ${queryParts.join(' AND ')} ORDER BY c.createdAt DESC`;

    try {
      const { resources, continuationToken: newContinuationToken } = await this.container.items
        .query<WebhookDelivery>(
          { query, parameters },
          { maxItemCount: limit, continuationToken }
        )
        .fetchNext();

      this.monitoring.trackDependency(
        'cosmosdb.webhookDelivery.list',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return {
        deliveries: resources,
        continuationToken: newContinuationToken,
        count: resources.length,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhook-delivery.repository.list',
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Find deliveries pending retry
   */
  async findPendingRetries(tenantId?: string, limit: number = 100): Promise<WebhookDelivery[]> {
    const startTime = Date.now();
    const now = new Date().toISOString();

    let query: string;
    let parameters: { name: string; value: any }[];

    if (tenantId) {
      query = `
        SELECT * FROM c 
        WHERE c.tenantId = @tenantId 
          AND c.status = 'retrying' 
          AND c.nextRetryAt <= @now
        ORDER BY c.nextRetryAt ASC
      `;
      parameters = [
        { name: '@tenantId', value: tenantId },
        { name: '@now', value: now },
      ];
    } else {
      // Cross-tenant query for background processing
      query = `
        SELECT * FROM c 
        WHERE c.status = 'retrying' 
          AND c.nextRetryAt <= @now
        ORDER BY c.nextRetryAt ASC
      `;
      parameters = [{ name: '@now', value: now }];
    }

    try {
      const { resources } = await this.container.items
        .query<WebhookDelivery>({ query, parameters }, { maxItemCount: limit })
        .fetchAll();

      this.monitoring.trackDependency(
        'cosmosdb.webhookDelivery.findPendingRetries',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return resources;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhook-delivery.repository.findPendingRetries',
      });
      throw error;
    }
  }

  /**
   * Get delivery statistics for a webhook
   */
  async getStats(
    tenantId: string,
    webhookId: string,
    since?: Date
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    pending: number;
    retrying: number;
    avgResponseTime: number;
  }> {
    const startTime = Date.now();
    const sinceDate = since?.toISOString() || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Default: last 24 hours

    const query = `
      SELECT 
        COUNT(1) as total,
        COUNT(c.status = 'success' ? 1 : undefined) as success,
        COUNT(c.status = 'failed' ? 1 : undefined) as failed,
        COUNT(c.status = 'pending' ? 1 : undefined) as pending,
        COUNT(c.status = 'retrying' ? 1 : undefined) as retrying,
        AVG(c.responseTime) as avgResponseTime
      FROM c 
      WHERE c.tenantId = @tenantId 
        AND c.webhookId = @webhookId
        AND c.createdAt >= @since
    `;

    try {
      const { resources } = await this.container.items
        .query({
          query,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@webhookId', value: webhookId },
            { name: '@since', value: sinceDate },
          ],
        })
        .fetchAll();

      this.monitoring.trackDependency(
        'cosmosdb.webhookDelivery.getStats',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      const stats = resources[0] || {};
      return {
        total: stats.total || 0,
        success: stats.success || 0,
        failed: stats.failed || 0,
        pending: stats.pending || 0,
        retrying: stats.retrying || 0,
        avgResponseTime: stats.avgResponseTime || 0,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhook-delivery.repository.getStats',
        tenantId,
        webhookId,
      });
      throw error;
    }
  }

  /**
   * Delete old deliveries (cleanup)
   */
  async deleteOldDeliveries(tenantId: string, olderThan: Date): Promise<number> {
    const startTime = Date.now();

    // Note: For large-scale deletion, consider using change feed or stored procedures
    const query = `
      SELECT c.id FROM c 
      WHERE c.tenantId = @tenantId 
        AND c.completedAt < @olderThan
    `;

    try {
      const { resources } = await this.container.items
        .query<{ id: string }>({
          query,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@olderThan', value: olderThan.toISOString() },
          ],
        })
        .fetchAll();

      let deletedCount = 0;
      for (const { id } of resources) {
        try {
          await this.container.item(id, tenantId).delete();
          deletedCount++;
        } catch {
          // Ignore individual delete errors
        }
      }

      this.monitoring.trackDependency(
        'cosmosdb.webhookDelivery.deleteOld',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return deletedCount;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhook-delivery.repository.deleteOldDeliveries',
        tenantId,
      });
      throw error;
    }
  }
}












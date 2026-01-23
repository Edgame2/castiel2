import { CosmosClient, Container, ContainerDefinition } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import {
  WebhookConfig,
  CreateWebhookInput,
  UpdateWebhookInput,
  ShardEventType,
} from '../types/shard-event.types.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Cosmos DB container configuration for Webhooks
 */
const WEBHOOK_CONTAINER_CONFIG: ContainerDefinition = {
  id: config.cosmosDb.containers.webhooks,
  partitionKey: {
    paths: ['/tenantId'],
  },
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [{ path: '/*' }],
    excludedPaths: [
      { path: '/headers/*' }, // Don't index headers
    ],
    compositeIndexes: [
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/isActive', order: 'ascending' },
        { path: '/name', order: 'ascending' },
      ],
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/isActive', order: 'ascending' },
        { path: '/createdAt', order: 'descending' },
      ],
    ],
  },
};

export interface WebhookListOptions {
  tenantId: string;
  isActive?: boolean;
  eventType?: ShardEventType;
  limit?: number;
  continuationToken?: string;
}

export interface WebhookListResult {
  webhooks: WebhookConfig[];
  continuationToken?: string;
  count: number;
}

/**
 * Webhook Repository
 * Handles all Cosmos DB operations for Webhooks
 */
export class WebhookRepository {
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
      .container(config.cosmosDb.containers.webhooks);
  }

  /**
   * Initialize container with proper indexing
   */
  async ensureContainer(): Promise<void> {
    try {
      const { database } = await this.client.databases.createIfNotExists({
        id: config.cosmosDb.databaseId,
      });

      await database.containers.createIfNotExists(WEBHOOK_CONTAINER_CONFIG);

      this.monitoring.trackEvent('cosmosdb.container.ensured', {
        container: config.cosmosDb.containers.webhooks,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhook.repository.ensureContainer',
      });
      throw error;
    }
  }

  /**
   * Generate a secure webhook secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new webhook
   */
  async create(tenantId: string, input: CreateWebhookInput, createdBy: string): Promise<WebhookConfig> {
    const startTime = Date.now();

    try {
      const webhook: WebhookConfig = {
        id: uuidv4(),
        tenantId,
        name: input.name,
        description: input.description,
        url: input.url,
        method: input.method || 'POST',
        headers: input.headers,
        events: input.events,
        filters: input.filters,
        retryCount: input.retryCount ?? 3,
        retryDelayMs: input.retryDelayMs ?? 1000,
        timeoutMs: input.timeoutMs ?? 30000,
        secret: this.generateSecret(),
        isActive: true,
        failureCount: 0,
        createdAt: new Date(),
        createdBy,
      };

      const { resource } = await this.container.items.create<WebhookConfig>(webhook);

      this.monitoring.trackDependency(
        'cosmosdb.webhook.create',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return resource as WebhookConfig;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhook.repository.create',
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Find webhook by ID
   */
  async findById(id: string, tenantId: string): Promise<WebhookConfig | undefined> {
    const startTime = Date.now();

    try {
      const { resource } = await this.container.item(id, tenantId).read<WebhookConfig>();

      this.monitoring.trackDependency(
        'cosmosdb.webhook.read',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return resource;
    } catch (error: any) {
      if (error.code === 404) {return undefined;}
      this.monitoring.trackException(error as Error, {
        operation: 'webhook.repository.findById',
        id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Update webhook
   */
  async update(id: string, tenantId: string, input: UpdateWebhookInput): Promise<WebhookConfig> {
    const startTime = Date.now();

    try {
      const existing = await this.findById(id, tenantId);
      if (!existing) {
        throw new Error(`Webhook not found: ${id}`);
      }

      const updated: WebhookConfig = {
        ...existing,
        ...input,
        updatedAt: new Date(),
      };

      const { resource } = await this.container.item(id, tenantId).replace<WebhookConfig>(updated);

      this.monitoring.trackDependency(
        'cosmosdb.webhook.update',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return resource as WebhookConfig;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhook.repository.update',
        id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Delete webhook
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const startTime = Date.now();

    try {
      await this.container.item(id, tenantId).delete();

      this.monitoring.trackDependency(
        'cosmosdb.webhook.delete',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhook.repository.delete',
        id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * List webhooks
   */
  async list(options: WebhookListOptions): Promise<WebhookListResult> {
    const startTime = Date.now();
    const { tenantId, isActive, eventType, limit = 100, continuationToken } = options;

    const queryParts: string[] = ['c.tenantId = @tenantId'];
    const parameters: { name: string; value: any }[] = [{ name: '@tenantId', value: tenantId }];

    if (isActive !== undefined) {
      queryParts.push('c.isActive = @isActive');
      parameters.push({ name: '@isActive', value: isActive });
    }

    if (eventType) {
      queryParts.push('ARRAY_CONTAINS(c.events, @eventType)');
      parameters.push({ name: '@eventType', value: eventType });
    }

    const query = `SELECT * FROM c WHERE ${queryParts.join(' AND ')} ORDER BY c.createdAt DESC`;

    try {
      const { resources, continuationToken: newContinuationToken } = await this.container.items
        .query<WebhookConfig>(
          { query, parameters },
          { maxItemCount: limit, continuationToken }
        )
        .fetchNext();

      this.monitoring.trackDependency(
        'cosmosdb.webhook.list',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return {
        webhooks: resources,
        continuationToken: newContinuationToken,
        count: resources.length,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhook.repository.list',
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Find all active webhooks subscribed to an event type for a tenant
   */
  async findActiveByEventType(tenantId: string, eventType: ShardEventType): Promise<WebhookConfig[]> {
    const startTime = Date.now();

    const query = `
      SELECT * FROM c 
      WHERE c.tenantId = @tenantId 
        AND c.isActive = true 
        AND ARRAY_CONTAINS(c.events, @eventType)
    `;

    try {
      const { resources } = await this.container.items
        .query<WebhookConfig>({
          query,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@eventType', value: eventType },
          ],
        })
        .fetchAll();

      this.monitoring.trackDependency(
        'cosmosdb.webhook.findByEventType',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return resources;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhook.repository.findByEventType',
        tenantId,
        eventType,
      });
      throw error;
    }
  }

  /**
   * Update webhook status (for circuit breaker pattern)
   */
  async updateStatus(
    id: string,
    tenantId: string,
    updates: { isActive?: boolean; failureCount?: number; lastError?: string; lastTriggeredAt?: Date }
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const existing = await this.findById(id, tenantId);
      if (!existing) {return;}

      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };

      await this.container.item(id, tenantId).replace<WebhookConfig>(updated);

      this.monitoring.trackDependency(
        'cosmosdb.webhook.updateStatus',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhook.repository.updateStatus',
        id,
        tenantId,
      });
      // Don't throw - status updates are best-effort
    }
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(id: string, tenantId: string): Promise<string> {
    const startTime = Date.now();

    try {
      const existing = await this.findById(id, tenantId);
      if (!existing) {
        throw new Error(`Webhook not found: ${id}`);
      }

      const newSecret = this.generateSecret();

      const updated = {
        ...existing,
        secret: newSecret,
        updatedAt: new Date(),
      };

      await this.container.item(id, tenantId).replace<WebhookConfig>(updated);

      this.monitoring.trackDependency(
        'cosmosdb.webhook.regenerateSecret',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return newSecret;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'webhook.repository.regenerateSecret',
        id,
        tenantId,
      });
      throw error;
    }
  }
}












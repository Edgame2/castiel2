import { CosmosClient } from '@azure/cosmos';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
/**
 * Cosmos DB container configuration for Webhooks
 */
const WEBHOOK_CONTAINER_CONFIG = {
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
/**
 * Webhook Repository
 * Handles all Cosmos DB operations for Webhooks
 */
export class WebhookRepository {
    client;
    container;
    monitoring;
    constructor(monitoring) {
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
    async ensureContainer() {
        try {
            const { database } = await this.client.databases.createIfNotExists({
                id: config.cosmosDb.databaseId,
            });
            await database.containers.createIfNotExists(WEBHOOK_CONTAINER_CONFIG);
            this.monitoring.trackEvent('cosmosdb.container.ensured', {
                container: config.cosmosDb.containers.webhooks,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'webhook.repository.ensureContainer',
            });
            throw error;
        }
    }
    /**
     * Generate a secure webhook secret
     */
    generateSecret() {
        return crypto.randomBytes(32).toString('hex');
    }
    /**
     * Create a new webhook
     */
    async create(tenantId, input, createdBy) {
        const startTime = Date.now();
        try {
            const webhook = {
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
            const { resource } = await this.container.items.create(webhook);
            this.monitoring.trackDependency('cosmosdb.webhook.create', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
            return resource;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'webhook.repository.create',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Find webhook by ID
     */
    async findById(id, tenantId) {
        const startTime = Date.now();
        try {
            const { resource } = await this.container.item(id, tenantId).read();
            this.monitoring.trackDependency('cosmosdb.webhook.read', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
            return resource;
        }
        catch (error) {
            if (error.code === 404) {
                return undefined;
            }
            this.monitoring.trackException(error, {
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
    async update(id, tenantId, input) {
        const startTime = Date.now();
        try {
            const existing = await this.findById(id, tenantId);
            if (!existing) {
                throw new Error(`Webhook not found: ${id}`);
            }
            const updated = {
                ...existing,
                ...input,
                updatedAt: new Date(),
            };
            const { resource } = await this.container.item(id, tenantId).replace(updated);
            this.monitoring.trackDependency('cosmosdb.webhook.update', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
            return resource;
        }
        catch (error) {
            this.monitoring.trackException(error, {
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
    async delete(id, tenantId) {
        const startTime = Date.now();
        try {
            await this.container.item(id, tenantId).delete();
            this.monitoring.trackDependency('cosmosdb.webhook.delete', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
        }
        catch (error) {
            this.monitoring.trackException(error, {
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
    async list(options) {
        const startTime = Date.now();
        const { tenantId, isActive, eventType, limit = 100, continuationToken } = options;
        const queryParts = ['c.tenantId = @tenantId'];
        const parameters = [{ name: '@tenantId', value: tenantId }];
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
                .query({ query, parameters }, { maxItemCount: limit, continuationToken })
                .fetchNext();
            this.monitoring.trackDependency('cosmosdb.webhook.list', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
            return {
                webhooks: resources,
                continuationToken: newContinuationToken,
                count: resources.length,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'webhook.repository.list',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Find all active webhooks subscribed to an event type for a tenant
     */
    async findActiveByEventType(tenantId, eventType) {
        const startTime = Date.now();
        const query = `
      SELECT * FROM c 
      WHERE c.tenantId = @tenantId 
        AND c.isActive = true 
        AND ARRAY_CONTAINS(c.events, @eventType)
    `;
        try {
            const { resources } = await this.container.items
                .query({
                query,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@eventType', value: eventType },
                ],
            })
                .fetchAll();
            this.monitoring.trackDependency('cosmosdb.webhook.findByEventType', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
            return resources;
        }
        catch (error) {
            this.monitoring.trackException(error, {
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
    async updateStatus(id, tenantId, updates) {
        const startTime = Date.now();
        try {
            const existing = await this.findById(id, tenantId);
            if (!existing) {
                return;
            }
            const updated = {
                ...existing,
                ...updates,
                updatedAt: new Date(),
            };
            await this.container.item(id, tenantId).replace(updated);
            this.monitoring.trackDependency('cosmosdb.webhook.updateStatus', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
        }
        catch (error) {
            this.monitoring.trackException(error, {
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
    async regenerateSecret(id, tenantId) {
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
            await this.container.item(id, tenantId).replace(updated);
            this.monitoring.trackDependency('cosmosdb.webhook.regenerateSecret', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
            return newSecret;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'webhook.repository.regenerateSecret',
                id,
                tenantId,
            });
            throw error;
        }
    }
}
//# sourceMappingURL=webhook.repository.js.map
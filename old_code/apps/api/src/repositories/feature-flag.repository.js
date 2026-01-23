/**
 * Feature Flag Repository
 *
 * Cosmos DB operations for Feature Flags.
 * Supports global and tenant-specific feature flags.
 */
import { CosmosClient, } from '@azure/cosmos';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
/**
 * Container configuration for Feature Flags
 */
const FEATURE_FLAG_CONTAINER_CONFIG = {
    id: config.cosmosDb.containers.featureFlags,
    partitionKey: {
        paths: ['/tenantId'], // Use tenantId as partition key ('global' for global flags)
    },
    indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
        includedPaths: [{ path: '/*' }],
        excludedPaths: [{ path: '/_etag/?' }],
        compositeIndexes: [
            [
                { path: '/tenantId', order: 'ascending' },
                { path: '/name', order: 'ascending' },
            ],
            [
                { path: '/tenantId', order: 'ascending' },
                { path: '/enabled', order: 'ascending' },
            ],
            [
                { path: '/name', order: 'ascending' },
                { path: '/enabled', order: 'ascending' },
            ],
        ],
    },
};
/**
 * Feature Flag Repository
 */
export class FeatureFlagRepository {
    client;
    container;
    monitoring;
    initialized = false;
    constructor(monitoring) {
        this.monitoring = monitoring;
        this.client = new CosmosClient({
            endpoint: config.cosmosDb.endpoint,
            key: config.cosmosDb.key,
        });
    }
    /**
     * Initialize the container
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            const database = this.client.database(config.cosmosDb.databaseId);
            // Create container if it doesn't exist
            const { container } = await database.containers.createIfNotExists(FEATURE_FLAG_CONTAINER_CONFIG);
            this.container = container;
            this.initialized = true;
            this.monitoring.trackEvent('feature-flag-repository-initialized');
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'initialize',
                repository: 'FeatureFlagRepository',
            });
            throw error;
        }
    }
    /**
     * Ensure container is initialized
     */
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
    /**
     * Create a feature flag
     */
    async create(input, userId) {
        await this.ensureInitialized();
        const now = new Date();
        const featureFlag = {
            id: uuidv4(),
            name: input.name,
            description: input.description,
            enabled: input.enabled,
            environments: input.environments,
            roles: input.roles,
            percentage: input.percentage,
            tenantId: input.tenantId || 'global', // 'global' for global flags
            createdAt: now,
            updatedAt: now,
            updatedBy: userId,
        };
        try {
            const { resource } = await this.container.items.create(featureFlag);
            this.monitoring.trackMetric('feature-flag-created', 1, {
                name: input.name,
                tenantId: input.tenantId || 'global',
                enabled: input.enabled,
            });
            return resource;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'create',
                name: input.name,
                tenantId: input.tenantId,
            });
            throw error;
        }
    }
    /**
     * Get a feature flag by name
     */
    async getByName(name, tenantId) {
        await this.ensureInitialized();
        try {
            const partitionKey = tenantId ?? 'global';
            const query = {
                query: `
          SELECT * FROM c 
          WHERE c.name = @name 
          AND (c.tenantId = @tenantId OR c.tenantId = 'global')
          ORDER BY c.tenantId DESC
        `,
                parameters: [
                    { name: '@name', value: name },
                    { name: '@tenantId', value: partitionKey },
                ],
            };
            const { resources } = await this.container.items
                .query(query)
                .fetchAll();
            // Return tenant-specific override if exists, otherwise global
            return resources[0] || null;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'getByName',
                name,
                tenantId: tenantId ?? 'global',
            });
            throw error;
        }
    }
    /**
     * Get a feature flag by ID
     */
    async getById(id, tenantId) {
        await this.ensureInitialized();
        try {
            const partitionKey = tenantId ?? 'global';
            const { resource } = await this.container
                .item(id, partitionKey)
                .read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            this.monitoring.trackException(error, {
                operation: 'getById',
                id,
                tenantId: tenantId ?? 'global',
            });
            throw error;
        }
    }
    /**
     * List all feature flags (global and tenant-specific)
     */
    async list(tenantId) {
        await this.ensureInitialized();
        try {
            const partitionKey = tenantId ?? 'global';
            const query = {
                query: `
          SELECT * FROM c 
          WHERE (c.tenantId = @tenantId OR c.tenantId = 'global')
          ORDER BY c.name ASC
        `,
                parameters: [
                    { name: '@tenantId', value: partitionKey },
                ],
            };
            const { resources } = await this.container.items
                .query(query)
                .fetchAll();
            return resources;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'list',
                tenantId: tenantId ?? 'global',
            });
            throw error;
        }
    }
    /**
     * Update a feature flag
     */
    async update(id, tenantId, input, userId) {
        await this.ensureInitialized();
        try {
            const partitionKey = tenantId ?? 'global';
            const { resource: existing } = await this.container
                .item(id, partitionKey)
                .read();
            if (!existing) {
                return null;
            }
            const updated = {
                ...existing,
                ...input,
                updatedAt: new Date(),
                updatedBy: userId,
            };
            const { resource } = await this.container
                .item(id, partitionKey)
                .replace(updated);
            this.monitoring.trackMetric('feature-flag-updated', 1, {
                id,
                tenantId: tenantId || 'global',
            });
            return resource;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            this.monitoring.trackException(error, {
                operation: 'update',
                id,
                tenantId: tenantId ?? 'global',
            });
            throw error;
        }
    }
    /**
     * Delete a feature flag
     */
    async delete(id, tenantId) {
        await this.ensureInitialized();
        try {
            const partitionKey = tenantId ?? 'global';
            await this.container.item(id, partitionKey).delete();
            this.monitoring.trackMetric('feature-flag-deleted', 1, {
                id,
                tenantId: tenantId || 'global',
            });
            return true;
        }
        catch (error) {
            if (error.code === 404) {
                return false;
            }
            this.monitoring.trackException(error, {
                operation: 'delete',
                id,
                tenantId: tenantId ?? 'global',
            });
            throw error;
        }
    }
}
//# sourceMappingURL=feature-flag.repository.js.map
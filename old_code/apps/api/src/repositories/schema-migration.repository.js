import { CosmosClient } from '@azure/cosmos';
import { config } from '../config/env.js';
import { MigrationStatus, MigrationStrategy, } from '../types/schema-migration.types.js';
import { v4 as uuidv4 } from 'uuid';
/**
 * Cosmos DB container configuration for Schema Migrations
 */
const SCHEMA_MIGRATION_CONTAINER_CONFIG = {
    id: config.cosmosDb.containers.schemaMigrations,
    partitionKey: {
        paths: ['/tenantId'],
    },
    indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
        includedPaths: [{ path: '/*' }],
        excludedPaths: [
            { path: '/fromSchema/*' },
            { path: '/toSchema/*' },
            { path: '/changes/*' },
        ],
        compositeIndexes: [
            [
                { path: '/tenantId', order: 'ascending' },
                { path: '/shardTypeId', order: 'ascending' },
                { path: '/toVersion', order: 'descending' },
            ],
            [
                { path: '/tenantId', order: 'ascending' },
                { path: '/status', order: 'ascending' },
                { path: '/createdAt', order: 'descending' },
            ],
        ],
    },
};
/**
 * Schema Migration Repository
 * Handles Cosmos DB operations for schema migrations
 */
export class SchemaMigrationRepository {
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
            .container(config.cosmosDb.containers.schemaMigrations);
    }
    /**
     * Initialize container
     */
    async ensureContainer() {
        try {
            const { database } = await this.client.databases.createIfNotExists({
                id: config.cosmosDb.databaseId,
            });
            await database.containers.createIfNotExists(SCHEMA_MIGRATION_CONTAINER_CONFIG);
            this.monitoring.trackEvent('cosmosdb.container.ensured', {
                container: config.cosmosDb.containers.schemaMigrations,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'schema-migration.repository.ensureContainer',
            });
            throw error;
        }
    }
    /**
     * Create a new schema migration
     */
    async create(tenantId, input, changes, shardTypeName) {
        const startTime = Date.now();
        try {
            const breakingChangeCount = changes.filter(c => c.isBreaking).length;
            const requiresDataMigration = changes.some(c => c.changeType !== 'added' || c.isBreaking);
            const migration = {
                id: uuidv4(),
                tenantId,
                shardTypeId: input.shardTypeId,
                shardTypeName,
                fromVersion: input.fromVersion,
                toVersion: input.toVersion,
                fromSchema: input.fromSchema,
                toSchema: input.toSchema,
                schemaFormat: input.schemaFormat,
                changes,
                breakingChangeCount,
                requiresDataMigration,
                strategy: input.strategy || (breakingChangeCount > 0 ? MigrationStrategy.LAZY : MigrationStrategy.NONE),
                status: MigrationStatus.PENDING,
                progress: {
                    totalShards: 0,
                    migratedShards: 0,
                    failedShards: 0,
                    skippedShards: 0,
                    percentComplete: 0,
                },
                createdBy: input.createdBy,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const { resource } = await this.container.items.create(migration);
            this.monitoring.trackDependency('cosmosdb.schemaMigration.create', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
            return resource;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'schema-migration.repository.create',
                tenantId,
                shardTypeId: input.shardTypeId,
            });
            throw error;
        }
    }
    /**
     * Find migration by ID
     */
    async findById(id, tenantId) {
        const startTime = Date.now();
        try {
            const { resource } = await this.container.item(id, tenantId).read();
            this.monitoring.trackDependency('cosmosdb.schemaMigration.read', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
            return resource;
        }
        catch (error) {
            if (error.code === 404) {
                return undefined;
            }
            this.monitoring.trackException(error, {
                operation: 'schema-migration.repository.findById',
                id,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Find latest migration for a ShardType
     */
    async findLatestForShardType(tenantId, shardTypeId) {
        const startTime = Date.now();
        try {
            const query = `
        SELECT TOP 1 * FROM c 
        WHERE c.tenantId = @tenantId 
          AND c.shardTypeId = @shardTypeId
        ORDER BY c.toVersion DESC
      `;
            const { resources } = await this.container.items
                .query({
                query,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@shardTypeId', value: shardTypeId },
                ],
            })
                .fetchAll();
            this.monitoring.trackDependency('cosmosdb.schemaMigration.findLatest', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
            return resources[0];
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'schema-migration.repository.findLatestForShardType',
                tenantId,
                shardTypeId,
            });
            throw error;
        }
    }
    /**
     * Find migration by version range
     */
    async findByVersionRange(tenantId, shardTypeId, fromVersion, toVersion) {
        const startTime = Date.now();
        try {
            const query = `
        SELECT * FROM c 
        WHERE c.tenantId = @tenantId 
          AND c.shardTypeId = @shardTypeId
          AND c.fromVersion = @fromVersion
          AND c.toVersion = @toVersion
      `;
            const { resources } = await this.container.items
                .query({
                query,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@shardTypeId', value: shardTypeId },
                    { name: '@fromVersion', value: fromVersion },
                    { name: '@toVersion', value: toVersion },
                ],
            })
                .fetchAll();
            this.monitoring.trackDependency('cosmosdb.schemaMigration.findByVersionRange', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
            return resources[0];
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'schema-migration.repository.findByVersionRange',
                tenantId,
                shardTypeId,
            });
            throw error;
        }
    }
    /**
     * Find all migrations for a path (from version X to version Y)
     */
    async findMigrationPath(tenantId, shardTypeId, fromVersion, toVersion) {
        const startTime = Date.now();
        try {
            const query = `
        SELECT * FROM c 
        WHERE c.tenantId = @tenantId 
          AND c.shardTypeId = @shardTypeId
          AND c.fromVersion >= @fromVersion
          AND c.toVersion <= @toVersion
        ORDER BY c.fromVersion ASC
      `;
            const { resources } = await this.container.items
                .query({
                query,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@shardTypeId', value: shardTypeId },
                    { name: '@fromVersion', value: fromVersion },
                    { name: '@toVersion', value: toVersion },
                ],
            })
                .fetchAll();
            this.monitoring.trackDependency('cosmosdb.schemaMigration.findMigrationPath', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
            return resources;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'schema-migration.repository.findMigrationPath',
                tenantId,
                shardTypeId,
            });
            throw error;
        }
    }
    /**
     * Update migration status and progress
     */
    async updateStatus(id, tenantId, status, progress, error) {
        const startTime = Date.now();
        try {
            const existing = await this.findById(id, tenantId);
            if (!existing) {
                throw new Error(`Migration not found: ${id}`);
            }
            const updates = {
                status,
                updatedAt: new Date(),
            };
            if (progress) {
                updates.progress = { ...existing.progress, ...progress };
                if (updates.progress.totalShards > 0) {
                    updates.progress.percentComplete = Math.round(((updates.progress.migratedShards + updates.progress.skippedShards) /
                        updates.progress.totalShards) * 100);
                }
            }
            if (error) {
                updates.error = error;
            }
            if (status === MigrationStatus.IN_PROGRESS && !existing.startedAt) {
                updates.startedAt = new Date();
            }
            if (status === MigrationStatus.COMPLETED || status === MigrationStatus.FAILED) {
                updates.completedAt = new Date();
            }
            const updated = { ...existing, ...updates };
            const { resource } = await this.container.item(id, tenantId).replace(updated);
            this.monitoring.trackDependency('cosmosdb.schemaMigration.updateStatus', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
            return resource;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'schema-migration.repository.updateStatus',
                id,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * List migrations
     */
    async list(options) {
        const startTime = Date.now();
        const { tenantId, shardTypeId, status, fromVersion, toVersion, limit = 50, continuationToken } = options;
        const queryParts = ['c.tenantId = @tenantId'];
        const parameters = [{ name: '@tenantId', value: tenantId }];
        if (shardTypeId) {
            queryParts.push('c.shardTypeId = @shardTypeId');
            parameters.push({ name: '@shardTypeId', value: shardTypeId });
        }
        if (status) {
            queryParts.push('c.status = @status');
            parameters.push({ name: '@status', value: status });
        }
        if (fromVersion !== undefined) {
            queryParts.push('c.fromVersion = @fromVersion');
            parameters.push({ name: '@fromVersion', value: fromVersion });
        }
        if (toVersion !== undefined) {
            queryParts.push('c.toVersion = @toVersion');
            parameters.push({ name: '@toVersion', value: toVersion });
        }
        const query = `SELECT * FROM c WHERE ${queryParts.join(' AND ')} ORDER BY c.createdAt DESC`;
        try {
            const { resources, continuationToken: newContinuationToken } = await this.container.items
                .query({ query, parameters }, { maxItemCount: limit, continuationToken })
                .fetchNext();
            this.monitoring.trackDependency('cosmosdb.schemaMigration.list', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
            return {
                migrations: resources,
                continuationToken: newContinuationToken,
                count: resources.length,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'schema-migration.repository.list',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Find pending/in-progress migrations that need processing
     */
    async findPendingMigrations(tenantId, limit = 10) {
        const startTime = Date.now();
        let query;
        let parameters;
        if (tenantId) {
            query = `
        SELECT * FROM c 
        WHERE c.tenantId = @tenantId 
          AND (c.status = 'pending' OR c.status = 'in_progress')
        ORDER BY c.createdAt ASC
      `;
            parameters = [{ name: '@tenantId', value: tenantId }];
        }
        else {
            query = `
        SELECT * FROM c 
        WHERE c.status = 'pending' OR c.status = 'in_progress'
        ORDER BY c.createdAt ASC
      `;
            parameters = [];
        }
        try {
            const { resources } = await this.container.items
                .query({ query, parameters }, { maxItemCount: limit })
                .fetchAll();
            this.monitoring.trackDependency('cosmosdb.schemaMigration.findPending', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
            return resources;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'schema-migration.repository.findPendingMigrations',
            });
            throw error;
        }
    }
    /**
     * Delete a migration (only if pending)
     */
    async delete(id, tenantId) {
        const startTime = Date.now();
        try {
            const existing = await this.findById(id, tenantId);
            if (!existing) {
                throw new Error(`Migration not found: ${id}`);
            }
            if (existing.status !== MigrationStatus.PENDING && existing.status !== MigrationStatus.CANCELLED) {
                throw new Error(`Cannot delete migration in status: ${existing.status}`);
            }
            await this.container.item(id, tenantId).delete();
            this.monitoring.trackDependency('cosmosdb.schemaMigration.delete', 'CosmosDB', config.cosmosDb.endpoint, Date.now() - startTime, true);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'schema-migration.repository.delete',
                id,
                tenantId,
            });
            throw error;
        }
    }
}
//# sourceMappingURL=schema-migration.repository.js.map
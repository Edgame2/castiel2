import { CosmosClient } from '@azure/cosmos';
import { config } from '../config/env.js';
import { ShardTypeStatus, mergeSchemas, isBuiltInShardType, } from '../types/shard-type.types.js';
import { v4 as uuidv4 } from 'uuid';
import { ShardStatus } from '../types/shard.types.js';
/**
 * Cosmos DB container configuration for ShardTypes
 * No caching - ShardTypes don't change frequently
 */
const SYSTEM_TENANT_ID = 'system';
const SHARD_TYPE_CONTAINER_CONFIG = {
    id: config.cosmosDb.containers.shardTypes,
    partitionKey: {
        paths: ['/tenantId'],
    },
    indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
        includedPaths: [
            {
                path: '/*',
            },
        ],
        excludedPaths: [
            {
                path: '/schema/*', // Don't index the schema object (can be large)
            },
        ],
        compositeIndexes: [
            [
                { path: '/tenantId', order: 'ascending' },
                { path: '/name', order: 'ascending' },
            ],
            [
                { path: '/tenantId', order: 'ascending' },
                { path: '/isCustom', order: 'ascending' },
                { path: '/createdAt', order: 'descending' },
            ],
            [
                { path: '/tenantId', order: 'ascending' },
                { path: '/category', order: 'ascending' },
                { path: '/createdAt', order: 'descending' },
            ],
            [
                { path: '/tenantId', order: 'ascending' },
                { path: '/status', order: 'ascending' },
                { path: '/updatedAt', order: 'descending' },
            ],
        ],
    },
};
/**
 * ShardType Repository
 * Handles all Cosmos DB operations for ShardTypes
 * NO CACHING - ShardTypes are read infrequently and don't change often
 */
export class ShardTypeRepository {
    client;
    container;
    shardContainer;
    monitoring;
    constructor(monitoring) {
        this.monitoring = monitoring;
        this.client = new CosmosClient({
            endpoint: config.cosmosDb.endpoint,
            key: config.cosmosDb.key,
        });
        const database = this.client.database(config.cosmosDb.databaseId);
        this.container = database.container(config.cosmosDb.containers.shardTypes);
        this.shardContainer = database.container(config.cosmosDb.containers.shards);
    }
    /**
     * Initialize container with proper indexing
     */
    async ensureContainer() {
        try {
            const { database } = await this.client.databases.createIfNotExists({
                id: config.cosmosDb.databaseId,
            });
            await database.containers.createIfNotExists(SHARD_TYPE_CONTAINER_CONFIG);
            this.monitoring.trackEvent('cosmosdb.container.ensured', {
                container: config.cosmosDb.containers.shardTypes,
            });
            this.monitoring.trackEvent('cosmosdb.container.ensured', { containerId: config.cosmosDb.containers.shardTypes });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.ensureContainer',
            });
            throw error;
        }
    }
    /**
     * Create a new shard type
     */
    async create(input) {
        const startTime = Date.now();
        const targetTenantId = input.isGlobal ? SYSTEM_TENANT_ID : input.tenantId;
        try {
            // Check if parent exists (if parentShardTypeId is provided)
            if (input.parentShardTypeId) {
                const parent = await this.findById(input.parentShardTypeId, targetTenantId);
                if (!parent) {
                    throw new Error(`Parent ShardType with ID ${input.parentShardTypeId} not found`);
                }
            }
            const shardType = {
                id: uuidv4(),
                tenantId: targetTenantId,
                name: input.name,
                displayName: input.displayName,
                description: input.description,
                category: input.category,
                schema: input.schema,
                uiSchema: input.uiSchema,
                parentShardTypeId: input.parentShardTypeId,
                isCustom: input.isCustom ?? !isBuiltInShardType(input.name),
                isBuiltIn: isBuiltInShardType(input.name),
                isGlobal: input.isGlobal ?? false,
                icon: input.icon,
                color: input.color,
                tags: input.tags ?? [],
                createdBy: input.createdBy,
                updatedBy: input.createdBy,
                version: 1,
                status: ShardTypeStatus.ACTIVE,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const { resource } = await this.container.items.create(shardType);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.create', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            this.monitoring.trackEvent('shardType.created', {
                shardTypeId: shardType.id,
                tenantId: shardType.tenantId,
                name: shardType.name,
                isCustom: shardType.isCustom,
            });
            return resource;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.create', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.create',
                tenantId: targetTenantId,
                name: input.name,
            });
            throw error;
        }
    }
    /**
     * Find shard type by ID
     * NO CACHING - always fetch from database
     */
    async findById(id, tenantId) {
        const startTime = Date.now();
        const partitions = tenantId === SYSTEM_TENANT_ID ? [SYSTEM_TENANT_ID] : [tenantId, SYSTEM_TENANT_ID];
        let resource;
        try {
            for (const partitionKey of partitions) {
                try {
                    const { resource: item } = await this.container.item(id, partitionKey).read();
                    if (item && item.status !== ShardTypeStatus.DELETED) {
                        resource = item;
                        break;
                    }
                }
                catch (error) {
                    const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
                    if (errorCode === 404) {
                        continue;
                    }
                    throw error;
                }
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.findById', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return resource ?? null;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.findById', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.findById',
                shardTypeId: id,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Find shard type by name
     */
    async findByName(name, tenantId) {
        const startTime = Date.now();
        try {
            const querySpec = {
                query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.name = @name AND c.status != @deletedStatus',
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@name', value: name },
                    { name: '@deletedStatus', value: ShardTypeStatus.DELETED },
                ],
            };
            const { resources } = await this.container.items.query(querySpec).fetchAll();
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.findByName', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return resources.length > 0 ? resources[0] : null;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.findByName', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.findByName',
                name,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Get shard type with resolved schema (includes parent inheritance)
     */
    async findByIdWithInheritance(id, tenantId) {
        try {
            const shardType = await this.findById(id, tenantId);
            if (!shardType) {
                return null;
            }
            return await this.resolveInheritance(shardType);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.findByIdWithInheritance',
                shardTypeId: id,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Resolve schema inheritance by merging parent schemas
     */
    async resolveInheritance(shardType) {
        const inheritanceChain = [shardType.id];
        let resolvedSchema = { ...shardType.schema };
        let currentType = shardType;
        // Walk up the parent chain
        while (currentType.parentShardTypeId) {
            const parent = await this.findById(currentType.parentShardTypeId, currentType.tenantId);
            if (!parent) {
                // Parent not found - break the chain
                this.monitoring.trackEvent('shardType.inheritance.brokenChain', {
                    shardTypeId: currentType.id,
                    missingParentId: currentType.parentShardTypeId,
                });
                break;
            }
            // Check for circular reference
            if (inheritanceChain.includes(parent.id)) {
                this.monitoring.trackEvent('shardType.inheritance.circularReference', {
                    shardTypeId: shardType.id,
                    circularParentId: parent.id,
                    chainDepth: inheritanceChain.length,
                });
                throw new Error(`Circular reference detected in ShardType inheritance: ${inheritanceChain.join(' -> ')} -> ${parent.id}`);
            }
            // Merge parent schema into resolved schema
            resolvedSchema = mergeSchemas(parent.schema, resolvedSchema);
            inheritanceChain.unshift(parent.id);
            currentType = parent;
            // Safety check: max depth of 10 levels
            if (inheritanceChain.length > 10) {
                this.monitoring.trackEvent('shardType.inheritance.maxDepthExceeded', {
                    shardTypeId: shardType.id,
                    depth: inheritanceChain.length,
                });
                break;
            }
        }
        return {
            ...shardType,
            resolvedSchema,
            inheritanceChain,
        };
    }
    /**
     * Update shard type (creates new version)
     */
    async update(id, tenantId, input) {
        const startTime = Date.now();
        try {
            const existing = await this.findById(id, tenantId);
            if (!existing) {
                return null;
            }
            // Increment version if schema changed
            const schemaChanged = input.schema && JSON.stringify(input.schema) !== JSON.stringify(existing.schema);
            const updated = {
                ...existing,
                name: input.name ?? existing.name,
                displayName: input.displayName ?? existing.displayName,
                description: input.description ?? existing.description,
                category: input.category ?? existing.category,
                schema: input.schema ?? existing.schema,
                status: input.status ?? existing.status,
                uiSchema: input.uiSchema ?? existing.uiSchema,
                isGlobal: input.isGlobal ?? existing.isGlobal,
                icon: input.icon ?? existing.icon,
                color: input.color ?? existing.color,
                tags: input.tags ?? existing.tags,
                parentShardTypeId: input.parentShardTypeId ?? existing.parentShardTypeId,
                embeddingTemplate: input.embeddingTemplate !== undefined ? input.embeddingTemplate : existing.embeddingTemplate,
                version: schemaChanged ? existing.version + 1 : existing.version,
                updatedAt: new Date(),
            };
            const { resource } = await this.container.item(id, existing.tenantId).replace(updated);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.update', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            this.monitoring.trackEvent('shardType.updated', {
                shardTypeId: id,
                tenantId,
                version: updated.version,
                schemaChanged,
            });
            return resource;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.update', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.update',
                shardTypeId: id,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Soft delete shard type
     */
    async delete(id, tenantId) {
        const startTime = Date.now();
        try {
            const existing = await this.findById(id, tenantId);
            if (!existing) {
                return false;
            }
            // Don't allow deleting built-in types
            if (existing.isBuiltIn) {
                throw new Error('Cannot delete built-in ShardType');
            }
            const deleted = {
                ...existing,
                status: ShardTypeStatus.DELETED,
                deletedAt: new Date(),
                updatedAt: new Date(),
            };
            await this.container.item(id, existing.tenantId).replace(deleted);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.delete', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            this.monitoring.trackEvent('shardType.deleted', {
                shardTypeId: id,
                tenantId,
            });
            return true;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
            if (errorCode === 404) {
                return false;
            }
            this.monitoring.trackDependency('cosmosdb.shardType.delete', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.delete',
                shardTypeId: id,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * List shard types with filtering and pagination
     */
    async list(options) {
        const startTime = Date.now();
        try {
            const { filter = { tenantId: SYSTEM_TENANT_ID }, limit = 50, continuationToken, orderBy = 'name', orderDirection = 'asc' } = options;
            const tenantFilterId = filter.tenantId || SYSTEM_TENANT_ID;
            // Build query
            let query = 'SELECT * FROM c WHERE (c.tenantId = @tenantId OR c.tenantId = @systemTenant) AND c.status != @deletedStatus';
            const parameters = [
                { name: '@tenantId', value: tenantFilterId },
                { name: '@systemTenant', value: SYSTEM_TENANT_ID },
                { name: '@deletedStatus', value: ShardTypeStatus.DELETED },
            ];
            if (filter.name) {
                query += ' AND CONTAINS(LOWER(c.name), LOWER(@name))';
                parameters.push({ name: '@name', value: (filter.name) });
            }
            if (filter.category) {
                query += ' AND c.category = @category';
                parameters.push({ name: '@category', value: filter.category });
            }
            if (filter.isCustom !== undefined) {
                query += ' AND c.isCustom = @isCustom';
                parameters.push({ name: '@isCustom', value: filter.isCustom });
            }
            if (filter.isBuiltIn !== undefined) {
                query += ' AND c.isBuiltIn = @isBuiltIn';
                parameters.push({ name: '@isBuiltIn', value: filter.isBuiltIn });
            }
            if (filter.status) {
                query += ' AND c.status = @status';
                parameters.push({ name: '@status', value: filter.status });
            }
            if (filter.isGlobal !== undefined) {
                query += ' AND c.isGlobal = @isGlobal';
                parameters.push({ name: '@isGlobal', value: filter.isGlobal });
            }
            if (filter.tags?.length) {
                filter.tags.forEach((tag, index) => {
                    query += ` AND ARRAY_CONTAINS(c.tags, @tag${index})`;
                    parameters.push({ name: `@tag${index}`, value: tag });
                });
            }
            if (filter.search) {
                query += ' AND (CONTAINS(LOWER(c.name), LOWER(@search)) OR CONTAINS(LOWER(c.displayName), LOWER(@search)))';
                parameters.push({ name: '@search', value: (filter.search) });
            }
            if (filter.parentShardTypeId) {
                query += ' AND c.parentShardTypeId = @parentShardTypeId';
                parameters.push({ name: '@parentShardTypeId', value: filter.parentShardTypeId });
            }
            if (filter.createdBy) {
                query += ' AND c.createdBy = @createdBy';
                parameters.push({ name: '@createdBy', value: filter.createdBy });
            }
            if (filter.createdAfter) {
                query += ' AND c.createdAt >= @createdAfter';
                parameters.push({ name: '@createdAfter', value: filter.createdAfter.toISOString() });
            }
            if (filter.createdBefore) {
                query += ' AND c.createdAt <= @createdBefore';
                parameters.push({ name: '@createdBefore', value: filter.createdBefore.toISOString() });
            }
            query += ` ORDER BY c.${orderBy} ${orderDirection.toUpperCase()}`;
            const querySpec = {
                query,
                parameters,
            };
            const { resources, continuationToken: newContinuationToken } = await this.container.items
                .query(querySpec, {
                maxItemCount: limit,
                continuationToken,
            })
                .fetchNext();
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.list', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            // Deduplicate results by name
            // Priority:
            // 1. Tenant-specific version (if matching requested tenant)
            // 2. Latest updated version
            const shardTypes = (resources || []);
            const uniqueShardTypes = new Map();
            for (const type of shardTypes) {
                const existing = uniqueShardTypes.get(type.name);
                if (!existing) {
                    uniqueShardTypes.set(type.name, type);
                    continue;
                }
                // If we already have a tenant-specific version, keep it (unless this one is also tenant-specific and newer?)
                // But we shouldn't have multiple tenant-specific versions for the same tenant ideally.
                // If we have a global version and found a tenant-specific one, replace it.
                if (existing.isGlobal && !type.isGlobal && type.tenantId === tenantFilterId) {
                    uniqueShardTypes.set(type.name, type);
                    continue;
                }
                // If both are global or both are tenant-specific, keep the newer one
                if ((existing.isGlobal === type.isGlobal) &&
                    (new Date(type.updatedAt).getTime() > new Date(existing.updatedAt).getTime())) {
                    uniqueShardTypes.set(type.name, type);
                }
            }
            return {
                shardTypes: Array.from(uniqueShardTypes.values()),
                continuationToken: newContinuationToken,
                count: uniqueShardTypes.size,
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.list', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.list',
                tenantId: options.filter?.tenantId,
            });
            throw error;
        }
    }
    async getGlobalShardTypes() {
        try {
            const querySpec = {
                query: 'SELECT * FROM c WHERE c.tenantId = @systemTenant AND c.isGlobal = true AND c.status != @deletedStatus',
                parameters: [
                    { name: '@systemTenant', value: SYSTEM_TENANT_ID },
                    { name: '@deletedStatus', value: ShardTypeStatus.DELETED },
                ],
            };
            const { resources } = await this.container.items.query(querySpec).fetchAll();
            return resources;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.getGlobalShardTypes',
            });
            throw error;
        }
    }
    async checkCircularInheritance(shardTypeId, parentShardTypeId, tenantId) {
        if (!parentShardTypeId) {
            return false;
        }
        const visited = new Set([shardTypeId]);
        let currentParentId = parentShardTypeId;
        while (currentParentId) {
            if (visited.has(currentParentId)) {
                return true;
            }
            visited.add(currentParentId);
            const parent = await this.findById(currentParentId, tenantId);
            if (!parent) {
                break;
            }
            currentParentId = parent.parentShardTypeId;
        }
        return false;
    }
    validateSchemaCompatibility(parentSchema, childSchema) {
        if (!parentSchema || !parentSchema.properties) {
            return true;
        }
        const childProperties = childSchema?.properties ?? {};
        const childRequired = new Set(childSchema?.required ?? []);
        for (const key of Object.keys(parentSchema.properties)) {
            const parentProp = parentSchema.properties[key];
            const childProp = childProperties[key];
            if (!childProp) {
                return false;
            }
            if (parentProp.type && childProp.type) {
                const parentTypes = Array.isArray(parentProp.type) ? parentProp.type : [parentProp.type];
                const childTypes = Array.isArray(childProp.type) ? childProp.type : [childProp.type];
                const matches = childTypes.some((type) => parentTypes.includes(type));
                if (!matches) {
                    return false;
                }
            }
            if (parentSchema.required?.includes(key) && !childRequired.has(key)) {
                return false;
            }
        }
        return true;
    }
    async getShardTypeUsageCount(shardTypeId, tenantId) {
        const parameters = [
            { name: '@shardTypeId', value: shardTypeId },
            { name: '@deletedStatus', value: ShardStatus.DELETED },
        ];
        let query = 'SELECT VALUE COUNT(1) FROM c WHERE c.shardTypeId = @shardTypeId AND c.status != @deletedStatus';
        if (tenantId) {
            query += ' AND c.tenantId = @tenantId';
            parameters.push({ name: '@tenantId', value: tenantId });
        }
        const { resources } = await this.shardContainer.items.query({ query, parameters }).fetchAll();
        return resources[0] ?? 0;
    }
    async checkShardTypeInUse(shardTypeId, tenantId) {
        const count = await this.getShardTypeUsageCount(shardTypeId, tenantId);
        return count > 0;
    }
    async getChildTypes(shardTypeId, tenantId) {
        const parameters = [
            { name: '@parentId', value: shardTypeId },
            { name: '@deletedStatus', value: ShardTypeStatus.DELETED },
        ];
        let query = 'SELECT * FROM c WHERE c.parentShardTypeId = @parentId AND c.status != @deletedStatus';
        if (tenantId) {
            query += ' AND c.tenantId = @tenantId';
            parameters.push({ name: '@tenantId', value: tenantId });
        }
        const { resources } = await this.container.items.query({ query, parameters }).fetchAll();
        return resources;
    }
    /**
     * Get all child types of a parent
     */
    async findChildren(parentId, tenantId) {
        try {
            return await this.getChildTypes(parentId, tenantId);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.findChildren',
                parentId,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Get tenant-specific ShardTypes (excludes global types)
     */
    async getTenantShardTypes(tenantId) {
        try {
            const querySpec = {
                query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status != @deletedStatus ORDER BY c.createdAt DESC',
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@deletedStatus', value: ShardTypeStatus.DELETED },
                ],
            };
            const { resources } = await this.container.items.query(querySpec).fetchAll();
            return resources;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.getTenantShardTypes',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Get cloneable ShardTypes (where isTemplate = true)
     */
    async getCloneableShardTypes(includeGlobalOnly = true) {
        try {
            let query = 'SELECT * FROM c WHERE c.isTemplate = true AND c.status != @deletedStatus';
            const parameters = [
                { name: '@deletedStatus', value: ShardTypeStatus.DELETED },
            ];
            if (includeGlobalOnly) {
                query += ' AND c.isGlobal = true';
            }
            query += ' ORDER BY c.displayName ASC';
            const querySpec = {
                query,
                parameters,
            };
            const { resources } = await this.container.items.query(querySpec).fetchAll();
            return resources;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.getCloneableShardTypes',
            });
            throw error;
        }
    }
    /**
     * Clone a ShardType with customizations
     */
    async cloneShardType(sourceId, targetTenantId, customizations, userId) {
        const startTime = Date.now();
        try {
            // Get the source ShardType (can be from system or another tenant)
            const source = await this.findById(sourceId, SYSTEM_TENANT_ID);
            if (!source) {
                throw new Error(`Source ShardType with ID ${sourceId} not found`);
            }
            // Verify source is cloneable
            if (!source.isTemplate) {
                throw new Error(`ShardType ${sourceId} is not marked as cloneable (isTemplate = false)`);
            }
            // Create the cloned ShardType
            const clonedType = {
                id: uuidv4(),
                tenantId: targetTenantId,
                name: customizations.name || `${source.name}-clone`,
                displayName: customizations.displayName || `${source.displayName} (Copy)`,
                description: source.description,
                category: source.category,
                schema: {
                    fields: customizations.fields || source.schema.fields,
                    allowUnstructuredData: source.schema.allowUnstructuredData,
                },
                uiSchema: source.uiSchema,
                relationships: source.relationships,
                validationRules: customizations.validationRules || source.validationRules,
                workflow: source.workflow,
                enrichment: customizations.enrichment || source.enrichment,
                fieldGroups: customizations.fieldGroups || source.fieldGroups,
                display: source.display,
                isCustom: true,
                isBuiltIn: false,
                isGlobal: false, // Clones are never global
                isTemplate: false, // Clones start as non-templates
                clonedFrom: sourceId, // Track the original
                icon: source.icon,
                color: source.color,
                tags: source.tags,
                parentShardTypeId: source.parentShardTypeId,
                createdBy: userId,
                updatedBy: userId,
                version: 1,
                status: ShardTypeStatus.ACTIVE,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const { resource } = await this.container.items.create(clonedType);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.clone', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            this.monitoring.trackEvent('shardType.cloned', {
                sourceId,
                clonedId: clonedType.id,
                tenantId: targetTenantId,
                userId,
            });
            return resource;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.clone', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.cloneShardType',
                sourceId,
                targetTenantId,
            });
            throw error;
        }
    }
    /**
     * Get ShardType by ID with relationships resolved
     * Returns the ShardType with target ShardTypes populated in relationships
     */
    async getByIdWithRelationships(id, tenantId) {
        try {
            const shardType = await this.findById(id, tenantId);
            if (!shardType || !shardType.relationships) {
                return shardType;
            }
            // Resolve relationship target types
            const resolvedRelationships = await Promise.all(shardType.relationships.map(async (rel) => {
                const targetType = await this.findById(rel.targetShardType, tenantId);
                return {
                    ...rel,
                    targetType: targetType ? {
                        id: targetType.id,
                        name: targetType.name,
                        displayName: targetType.displayName,
                        icon: targetType.icon,
                        color: targetType.color,
                    } : null,
                };
            }));
            return {
                ...shardType,
                resolvedRelationships,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.getByIdWithRelationships',
                shardTypeId: id,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Check if container is healthy
     */
    async healthCheck() {
        try {
            await this.container.read();
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Update embedding template for a shard type
     */
    async updateEmbeddingTemplate(shardTypeId, tenantId, template) {
        const startTime = Date.now();
        try {
            const shardType = await this.findById(shardTypeId, tenantId);
            if (!shardType) {
                throw new Error(`ShardType ${shardTypeId} not found`);
            }
            shardType.embeddingTemplate = template;
            shardType.updatedAt = new Date();
            // Use the shardType's actual partition key to avoid partition mismatch
            const { resource } = await this.container.item(shardTypeId, shardType.tenantId).replace(shardType);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.updateEmbeddingTemplate', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            this.monitoring.trackEvent('shardType.embeddingTemplate.updated', {
                shardTypeId,
                tenantId,
                templateVersion: template.version,
            });
            return resource;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.updateEmbeddingTemplate', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.updateEmbeddingTemplate',
                shardTypeId,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Get embedding template for a shard type
     * Returns the custom template or null if using default
     */
    async getEmbeddingTemplate(shardTypeId, tenantId) {
        try {
            const shardType = await this.findById(shardTypeId, tenantId);
            if (!shardType) {
                throw new Error(`ShardType ${shardTypeId} not found`);
            }
            return shardType.embeddingTemplate || null;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.getEmbeddingTemplate',
                shardTypeId,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * List all shard types with custom embedding templates
     */
    async listWithEmbeddingTemplates(tenantId) {
        const startTime = Date.now();
        try {
            const querySpec = {
                query: `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.embeddingTemplate != null AND c.status != @deletedStatus`,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@deletedStatus', value: ShardTypeStatus.DELETED },
                ],
            };
            const { resources } = await this.container.items.query(querySpec).fetchAll();
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.listWithEmbeddingTemplates', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return resources || [];
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.shardType.listWithEmbeddingTemplates', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            this.monitoring.trackException(error, {
                operation: 'shard-type.repository.listWithEmbeddingTemplates',
                tenantId,
            });
            throw error;
        }
    }
}
//# sourceMappingURL=shard-type.repository.js.map
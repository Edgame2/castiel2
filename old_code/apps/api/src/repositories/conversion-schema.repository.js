import { v4 as uuidv4 } from 'uuid';
/**
 * Conversion Schema Repository
 * Manages data mapping schemas for integrations
 */
export class ConversionSchemaRepository {
    container;
    constructor(client, databaseId, containerId) {
        this.container = client.database(databaseId).container(containerId);
    }
    /**
     * Ensure container exists
     */
    static async ensureContainer(client, databaseId, containerId) {
        const database = client.database(databaseId);
        const { container } = await database.containers.createIfNotExists({
            id: containerId,
            partitionKey: { paths: ['/tenantId'] },
            indexingPolicy: {
                automatic: true,
                indexingMode: 'consistent',
                includedPaths: [{ path: '/*' }],
                excludedPaths: [{ path: '/"_etag"/?' }],
                compositeIndexes: [
                    [
                        { path: '/tenantId', order: 'ascending' },
                        { path: '/tenantIntegrationId', order: 'ascending' },
                    ],
                ],
            },
        });
        return container;
    }
    /**
     * Create conversion schema
     */
    async create(input) {
        const now = new Date();
        const schema = {
            id: uuidv4(),
            tenantIntegrationId: input.tenantIntegrationId,
            tenantId: input.tenantId,
            name: input.name,
            description: input.description,
            source: input.source,
            target: input.target,
            fieldMappings: input.fieldMappings.map(m => ({
                ...m,
                id: uuidv4(),
            })),
            relationshipMappings: input.relationshipMappings,
            preserveRelationships: input.preserveRelationships ?? false,
            deduplication: input.deduplication,
            isActive: input.isActive ?? true,
            createdBy: input.createdBy,
            createdAt: now,
            updatedAt: now,
        };
        const { resource } = await this.container.items.create(schema);
        return resource;
    }
    /**
     * Update conversion schema
     */
    async update(id, tenantId, input) {
        const existing = await this.findById(id, tenantId);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...input,
            fieldMappings: input.fieldMappings
                ? input.fieldMappings.map(m => ({
                    ...m,
                    id: uuidv4(),
                }))
                : existing.fieldMappings,
            updatedAt: new Date(),
        };
        const { resource } = await this.container
            .item(id, tenantId)
            .replace(updated);
        return resource;
    }
    /**
     * Delete conversion schema
     */
    async delete(id, tenantId) {
        try {
            await this.container.item(id, tenantId).delete();
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Find by ID
     */
    async findById(id, tenantId) {
        try {
            const { resource } = await this.container.item(id, tenantId).read();
            return resource || null;
        }
        catch {
            return null;
        }
    }
    /**
     * Find by name for tenant integration
     */
    async findByName(name, tenantIntegrationId, tenantId) {
        const query = {
            query: `SELECT * FROM c WHERE c.tenantId = @tenantId 
              AND c.tenantIntegrationId = @tenantIntegrationId 
              AND c.name = @name`,
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@tenantIntegrationId', value: tenantIntegrationId },
                { name: '@name', value: name },
            ],
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources[0] || null;
    }
    /**
     * List conversion schemas
     */
    async list(options) {
        const { filter, limit = 50, offset = 0 } = options;
        const conditions = ['c.tenantId = @tenantId'];
        const parameters = [
            { name: '@tenantId', value: filter.tenantId },
        ];
        if (filter.tenantIntegrationId) {
            conditions.push('c.tenantIntegrationId = @tenantIntegrationId');
            parameters.push({ name: '@tenantIntegrationId', value: filter.tenantIntegrationId });
        }
        if (filter.isActive !== undefined) {
            conditions.push('c.isActive = @isActive');
            parameters.push({ name: '@isActive', value: filter.isActive });
        }
        const whereClause = `WHERE ${conditions.join(' AND ')}`;
        // Count query
        const countQuery = {
            query: `SELECT VALUE COUNT(1) FROM c ${whereClause}`,
            parameters,
        };
        const { resources: countResult } = await this.container.items.query(countQuery).fetchAll();
        const total = countResult[0] || 0;
        // Data query
        const dataQuery = {
            query: `SELECT * FROM c ${whereClause} ORDER BY c.name OFFSET ${offset} LIMIT ${limit}`,
            parameters,
        };
        const { resources } = await this.container.items.query(dataQuery).fetchAll();
        return {
            schemas: resources,
            total,
            hasMore: offset + resources.length < total,
        };
    }
    /**
     * Find active schemas for tenant integration
     */
    async findActiveByTenantIntegration(tenantIntegrationId, tenantId) {
        const query = {
            query: `SELECT * FROM c WHERE c.tenantId = @tenantId 
              AND c.tenantIntegrationId = @tenantIntegrationId 
              AND c.isActive = true`,
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@tenantIntegrationId', value: tenantIntegrationId },
            ],
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources;
    }
}
//# sourceMappingURL=conversion-schema.repository.js.map
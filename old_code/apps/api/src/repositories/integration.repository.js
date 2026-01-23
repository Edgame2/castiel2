import { v4 as uuidv4 } from 'uuid';
/**
 * Integration Provider Repository
 * Manages system-level integration provider definitions
 */
export class IntegrationProviderRepository {
    container;
    constructor(client, databaseId, containerId = 'integration_providers') {
        this.container = client.database(databaseId).container(containerId);
    }
    /**
     * Create integration provider
     */
    async create(input) {
        const now = new Date();
        const provider = {
            id: uuidv4(),
            ...input,
            createdAt: now,
            updatedAt: now,
        };
        const { resource } = await this.container.items.create(provider);
        return resource;
    }
    /**
     * Update integration provider
     */
    async update(id, category, input) {
        const existing = await this.findById(id, category);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...input,
            updatedAt: new Date(),
        };
        const { resource } = await this.container
            .item(id, category)
            .replace(updated);
        return resource;
    }
    /**
     * Delete integration provider
     */
    async delete(id, category) {
        try {
            await this.container.item(id, category).delete();
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Find by ID
     */
    async findById(id, category) {
        try {
            const { resource } = await this.container.item(id, category).read();
            return resource || null;
        }
        catch {
            return null;
        }
    }
    /**
     * Find by provider name and category
     */
    async findByProvider(category, provider) {
        const query = {
            query: 'SELECT * FROM c WHERE c.category = @category AND c.provider = @provider',
            parameters: [
                { name: '@category', value: category },
                { name: '@provider', value: provider },
            ],
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources[0] || null;
    }
    /**
     * Find by provider ID (searches across all categories)
     */
    async findByIdAcrossCategories(id) {
        const query = {
            query: 'SELECT * FROM c WHERE c.id = @id',
            parameters: [{ name: '@id', value: id }],
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources[0] || null;
    }
    /**
     * Find by provider name (searches across all categories)
     */
    async findByProviderName(provider) {
        const query = {
            query: 'SELECT * FROM c WHERE c.provider = @provider',
            parameters: [{ name: '@provider', value: provider }],
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources[0] || null;
    }
    /**
     * List integration providers
     */
    async list(options = {}) {
        const { category, status, audience, supportsSearch, supportsNotifications, requiresUserScoping, limit = 50, offset = 0 } = options;
        const conditions = [];
        const parameters = [];
        if (category) {
            conditions.push('c.category = @category');
            parameters.push({ name: '@category', value: category });
        }
        if (status) {
            conditions.push('c.status = @status');
            parameters.push({ name: '@status', value: status });
        }
        if (audience) {
            conditions.push('c.audience = @audience');
            parameters.push({ name: '@audience', value: audience });
        }
        if (supportsSearch !== undefined) {
            conditions.push('c.supportsSearch = @supportsSearch');
            parameters.push({ name: '@supportsSearch', value: supportsSearch });
        }
        if (supportsNotifications !== undefined) {
            conditions.push('c.supportsNotifications = @supportsNotifications');
            parameters.push({ name: '@supportsNotifications', value: supportsNotifications });
        }
        if (requiresUserScoping !== undefined) {
            conditions.push('c.requiresUserScoping = @requiresUserScoping');
            parameters.push({ name: '@requiresUserScoping', value: requiresUserScoping });
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // Count query
        const countQuery = {
            query: `SELECT VALUE COUNT(1) FROM c ${whereClause}`,
            parameters,
        };
        const { resources: countResult } = await this.container.items.query(countQuery).fetchAll();
        const total = countResult[0] || 0;
        // Data query
        const dataQuery = {
            query: `SELECT * FROM c ${whereClause} ORDER BY c.displayName OFFSET ${offset} LIMIT ${limit}`,
            parameters,
        };
        const { resources } = await this.container.items.query(dataQuery).fetchAll();
        return {
            providers: resources,
            total,
            hasMore: offset + resources.length < total,
        };
    }
}
/**
 * Integration Repository
 * Manages tenant-specific integration instances
 */
export class IntegrationRepository {
    container;
    constructor(client, databaseId, containerId = 'integrations') {
        this.container = client.database(databaseId).container(containerId);
    }
    /**
     * Create integration instance
     */
    async create(input) {
        const now = new Date();
        const integration = {
            id: uuidv4(),
            ...input,
            createdAt: now,
            updatedAt: now,
        };
        const { resource } = await this.container.items.create(integration);
        return resource;
    }
    /**
     * Update integration instance
     */
    async update(id, tenantId, input) {
        const existing = await this.findById(id, tenantId);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...input,
            updatedAt: new Date(),
        };
        const { resource } = await this.container
            .item(id, tenantId)
            .replace(updated);
        return resource;
    }
    /**
     * Delete integration instance
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
     * Find by provider name and instance name
     */
    async findByProviderAndName(tenantId, providerName, name) {
        const query = {
            query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.providerName = @providerName AND c.name = @name',
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@providerName', value: providerName },
                { name: '@name', value: name },
            ],
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources[0] || null;
    }
    /**
     * List integrations for tenant
     */
    async list(options) {
        const { tenantId, providerName, status, searchEnabled, userScoped, limit = 50, offset = 0 } = options;
        const conditions = ['c.tenantId = @tenantId'];
        const parameters = [
            { name: '@tenantId', value: tenantId },
        ];
        if (providerName) {
            conditions.push('c.providerName = @providerName');
            parameters.push({ name: '@providerName', value: providerName });
        }
        if (status) {
            conditions.push('c.status = @status');
            parameters.push({ name: '@status', value: status });
        }
        if (searchEnabled !== undefined) {
            conditions.push('c.searchEnabled = @searchEnabled');
            parameters.push({ name: '@searchEnabled', value: searchEnabled });
        }
        if (userScoped !== undefined) {
            conditions.push('c.userScoped = @userScoped');
            parameters.push({ name: '@userScoped', value: userScoped });
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
            integrations: resources,
            total,
            hasMore: offset + resources.length < total,
        };
    }
}
/**
 * Integration Connection Repository
 * Manages connection credentials (system/tenant/user-scoped)
 */
export class IntegrationConnectionRepository {
    container;
    constructor(client, databaseId, containerId = 'integration-connections') {
        this.container = client.database(databaseId).container(containerId);
    }
    /**
     * Create connection
     */
    async create(input) {
        const now = new Date();
        const connection = {
            id: input.id || uuidv4(),
            usageCount: input.usageCount ?? 0, // Initialize to 0 if not provided
            ...input,
            createdAt: now,
            updatedAt: now,
        };
        const { resource } = await this.container.items.create(connection);
        return resource;
    }
    /**
     * Update connection
     */
    async update(id, integrationId, input) {
        const existing = await this.findById(id, integrationId);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...input,
            updatedAt: new Date(),
        };
        const { resource } = await this.container
            .item(id, integrationId)
            .replace(updated);
        return resource;
    }
    /**
     * Delete connection
     */
    async delete(id, integrationId) {
        try {
            await this.container.item(id, integrationId).delete();
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Find by ID
     */
    async findById(id, integrationId) {
        try {
            const { resource } = await this.container.item(id, integrationId).read();
            return resource || null;
        }
        catch {
            return null;
        }
    }
    /**
     * Find connection for integration by scope
     */
    async findByIntegration(integrationId, scope, tenantId, userId) {
        const conditions = ['c.integrationId = @integrationId', 'c.scope = @scope'];
        const parameters = [
            { name: '@integrationId', value: integrationId },
            { name: '@scope', value: scope },
        ];
        if (scope === 'tenant' || scope === 'user') {
            if (!tenantId) {
                throw new Error('tenantId is required for tenant or user scope');
            }
            conditions.push('c.tenantId = @tenantId');
            parameters.push({ name: '@tenantId', value: tenantId });
        }
        if (scope === 'user') {
            if (!userId) {
                throw new Error('userId is required for user scope');
            }
            conditions.push('c.userId = @userId');
            parameters.push({ name: '@userId', value: userId });
        }
        const query = {
            query: `SELECT * FROM c WHERE ${conditions.join(' AND ')}`,
            parameters,
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources[0] || null;
    }
    /**
     * Find all user-scoped connections for an integration
     */
    async findUserScoped(integrationId, tenantId, userId) {
        const conditions = [
            'c.integrationId = @integrationId',
            'c.scope = @scope',
            'c.tenantId = @tenantId',
        ];
        const parameters = [
            { name: '@integrationId', value: integrationId },
            { name: '@scope', value: 'user' },
            { name: '@tenantId', value: tenantId },
        ];
        if (userId) {
            conditions.push('c.userId = @userId');
            parameters.push({ name: '@userId', value: userId });
        }
        const query = {
            query: `SELECT * FROM c WHERE ${conditions.join(' AND ')}`,
            parameters,
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources;
    }
    /**
     * Find all user-scoped connections for a tenant/user (across all integrations)
     */
    async findAllUserConnections(tenantId, userId) {
        const query = {
            query: `SELECT * FROM c WHERE c.scope = @scope AND c.tenantId = @tenantId AND c.userId = @userId`,
            parameters: [
                { name: '@scope', value: 'user' },
                { name: '@tenantId', value: tenantId },
                { name: '@userId', value: userId },
            ],
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources;
    }
    /**
     * Find system-wide connection
     */
    async findSystemConnection(integrationId) {
        return this.findByIntegration(integrationId, 'system');
    }
    /**
     * Update OAuth tokens
     */
    async updateOAuthTokens(id, integrationId, oauth) {
        return this.update(id, integrationId, { oauth, lastValidatedAt: new Date() });
    }
    /**
     * Mark connection as expired
     */
    async markExpired(id, integrationId) {
        return this.update(id, integrationId, { status: 'expired' });
    }
}
//# sourceMappingURL=integration.repository.js.map
/**
 * Integration Catalog Repository
 *
 * Manages integration catalog entries and visibility rules.
 * Stores catalog definitions managed by super admins.
 */
import { v4 as uuidv4 } from 'uuid';
/**
 * Integration Catalog Repository
 * Manages system-wide integration catalog
 */
export class IntegrationCatalogRepository {
    catalogContainer;
    visibilityContainer;
    constructor(client, databaseId, catalogContainerId = 'integration_catalog', visibilityContainerId = 'integration_visibility') {
        this.catalogContainer = client.database(databaseId).container(catalogContainerId);
        this.visibilityContainer = client.database(databaseId).container(visibilityContainerId);
    }
    /**
     * Ensure containers exist
     */
    static async ensureContainers(client, databaseId, catalogContainerId = 'integration_catalog', visibilityContainerId = 'integration_visibility') {
        const database = client.database(databaseId);
        // Catalog container
        const { container: catalogContainer } = await database.containers.createIfNotExists({
            id: catalogContainerId,
            partitionKey: { paths: ['/category'] },
            indexingPolicy: {
                automatic: true,
                indexingMode: 'consistent',
                includedPaths: [{ path: '/*' }],
                excludedPaths: [{ path: '/"_etag"/?' }],
            },
        });
        // Visibility container
        const { container: visibilityContainer } = await database.containers.createIfNotExists({
            id: visibilityContainerId,
            partitionKey: { paths: ['/tenantId'] },
            indexingPolicy: {
                automatic: true,
                indexingMode: 'consistent',
                includedPaths: [{ path: '/*' }],
                excludedPaths: [{ path: '/"_etag"/?' }],
            },
        });
        return { catalog: catalogContainer, visibility: visibilityContainer };
    }
    // ============================================
    // Catalog Entry CRUD
    // ============================================
    /**
     * Create catalog entry
     */
    async createCatalogEntry(input) {
        const now = new Date();
        const entry = {
            id: uuidv4(),
            ...input,
            icon: input.icon || 'plug',
            color: input.color || '#6b7280',
            requiresApproval: input.requiresApproval || false,
            beta: input.beta || false,
            deprecated: input.deprecated || false,
            supportsRealtime: input.supportsRealtime || false,
            supportsWebhooks: input.supportsWebhooks || false,
            rateLimit: input.rateLimit || { requestsPerMinute: 100, requestsPerHour: 5000 },
            status: input.status || 'active',
            version: input.version || '1.0.0',
            createdAt: now,
            updatedAt: now,
            createdBy: input.createdBy || 'system',
            updatedBy: input.createdBy || 'system', // Use createdBy as default for updatedBy
        };
        const { resource } = await this.catalogContainer.items.create(entry);
        return resource;
    }
    /**
     * Get catalog entry by ID
     */
    async getCatalogEntry(id, category) {
        try {
            const { resource } = await this.catalogContainer.item(id, category).read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Get catalog entry by integration ID
     */
    async getCatalogEntryByIntegrationId(integrationId) {
        const query = `
      SELECT * FROM c 
      WHERE c.integrationId = @integrationId
      LIMIT 1
    `;
        const { resources } = await this.catalogContainer.items
            .query({
            query,
            parameters: [{ name: '@integrationId', value: integrationId }],
        })
            .fetchAll();
        return resources.length > 0 ? resources[0] : null;
    }
    /**
     * List catalog entries
     */
    async listCatalogEntries(options) {
        const limit = options?.limit ?? 20;
        const offset = options?.offset ?? 0;
        const filter = options?.filter;
        let query = 'SELECT * FROM c WHERE 1=1';
        const parameters = [];
        if (filter?.category) {
            query += ' AND c.category = @category';
            parameters.push({ name: '@category', value: filter.category });
        }
        if (filter?.visibility) {
            query += ' AND c.visibility = @visibility';
            parameters.push({ name: '@visibility', value: filter.visibility });
        }
        if (filter?.status) {
            query += ' AND c.status = @status';
            parameters.push({ name: '@status', value: filter.status });
        }
        if (filter?.requiredPlan) {
            query += ' AND c.requiredPlan = @requiredPlan';
            parameters.push({ name: '@requiredPlan', value: filter.requiredPlan });
        }
        if (filter?.beta !== undefined) {
            query += ' AND c.beta = @beta';
            parameters.push({ name: '@beta', value: filter.beta });
        }
        if (filter?.deprecated !== undefined) {
            query += ' AND c.deprecated = @deprecated';
            parameters.push({ name: '@deprecated', value: filter.deprecated });
        }
        if (filter?.searchTerm) {
            const searchLower = filter.searchTerm.toLowerCase();
            query += ' AND (CONTAINS(LOWER(c.name), @searchTerm) OR CONTAINS(LOWER(c.displayName), @searchTerm))';
            parameters.push({ name: '@searchTerm', value: searchLower });
        }
        // Get total count
        const countQuery = `SELECT VALUE COUNT(1) FROM (${query.replace('SELECT *', 'SELECT 1')})`;
        const countResult = await this.catalogContainer.items
            .query({
            query: countQuery,
            parameters,
        })
            .fetchAll();
        const total = countResult.resources[0] || 0;
        // Get paginated results
        query += ' ORDER BY c.displayName ASC OFFSET @offset LIMIT @limit';
        parameters.push({ name: '@offset', value: offset }, { name: '@limit', value: limit });
        const { resources } = await this.catalogContainer.items
            .query({
            query,
            parameters,
        })
            .fetchAll();
        return {
            entries: resources,
            total,
            hasMore: offset + limit < total,
        };
    }
    /**
     * Update catalog entry
     */
    async updateCatalogEntry(id, category, input) {
        const existing = await this.getCatalogEntry(id, category);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...input,
            updatedAt: new Date(),
        };
        const { resource } = await this.catalogContainer.item(id, category).replace(updated);
        return resource;
    }
    /**
     * Delete catalog entry
     */
    async deleteCatalogEntry(id, category) {
        try {
            await this.catalogContainer.item(id, category).delete();
            return true;
        }
        catch (error) {
            if (error.code === 404) {
                return false;
            }
            throw error;
        }
    }
    /**
     * Deprecate integration (soft delete)
     */
    async deprecateCatalogEntry(id, category, updatedBy) {
        return this.updateCatalogEntry(id, category, {
            status: 'deprecated',
            deprecated: true,
            updatedBy,
        });
    }
    /**
     * Get integrations by category
     */
    async getCatalogEntriesByCategory(category) {
        const query = 'SELECT * FROM c WHERE c.category = @category AND c.status != "deprecated"';
        const { resources } = await this.catalogContainer.items
            .query({
            query,
            parameters: [{ name: '@category', value: category }],
        })
            .fetchAll();
        return resources;
    }
    // ============================================
    // Visibility Rules CRUD
    // ============================================
    /**
     * Create visibility rule
     */
    async createVisibilityRule(input) {
        const now = new Date();
        const rule = {
            id: uuidv4(),
            ...input,
            isVisible: input.isVisible ?? true,
            isEnabled: input.isEnabled ?? true,
            requiresApproval: input.requiresApproval ?? false,
            isApproved: input.isApproved ?? true,
            createdAt: now,
            updatedAt: now,
        };
        const { resource } = await this.visibilityContainer.items.create(rule);
        return resource;
    }
    /**
     * Get visibility rule
     */
    async getVisibilityRule(id, tenantId) {
        try {
            const { resource } = await this.visibilityContainer.item(id, tenantId).read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Get visibility rule by tenant and integration
     */
    async getVisibilityRuleByTenantAndIntegration(tenantId, integrationId) {
        const query = `
      SELECT * FROM c 
      WHERE c.tenantId = @tenantId AND c.integrationId = @integrationId
      LIMIT 1
    `;
        const { resources } = await this.visibilityContainer.items
            .query({
            query,
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@integrationId', value: integrationId },
            ],
        })
            .fetchAll();
        return resources.length > 0 ? resources[0] : null;
    }
    /**
     * List visibility rules for tenant
     */
    async listVisibilityRulesForTenant(tenantId) {
        const query = 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.createdAt DESC';
        const { resources } = await this.visibilityContainer.items
            .query({
            query,
            parameters: [{ name: '@tenantId', value: tenantId }],
        })
            .fetchAll();
        return resources;
    }
    /**
     * List visibility rules for integration
     */
    async listVisibilityRulesForIntegration(integrationId) {
        const query = 'SELECT * FROM c WHERE c.integrationId = @integrationId ORDER BY c.createdAt DESC';
        const { resources } = await this.visibilityContainer.items
            .query({
            query,
            parameters: [{ name: '@integrationId', value: integrationId }],
        })
            .fetchAll();
        return resources;
    }
    /**
     * Update visibility rule
     */
    async updateVisibilityRule(id, tenantId, input) {
        const existing = await this.getVisibilityRule(id, tenantId);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...input,
            updatedAt: new Date(),
        };
        const { resource } = await this.visibilityContainer.item(id, tenantId).replace(updated);
        return resource;
    }
    /**
     * Delete visibility rule
     */
    async deleteVisibilityRule(id, tenantId) {
        try {
            await this.visibilityContainer.item(id, tenantId).delete();
            return true;
        }
        catch (error) {
            if (error.code === 404) {
                return false;
            }
            throw error;
        }
    }
    /**
     * Approve integration for tenant
     */
    async approveIntegrationForTenant(id, tenantId, approvedBy) {
        const existing = await this.getVisibilityRule(id, tenantId);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            isApproved: true,
            approvedAt: new Date(),
            approvedBy,
            updatedAt: new Date(),
        };
        const { resource } = await this.visibilityContainer.item(id, tenantId).replace(updated);
        return resource;
    }
    /**
     * Deny integration for tenant
     */
    async denyIntegrationForTenant(id, tenantId, denialReason, approvedBy) {
        const existing = await this.getVisibilityRule(id, tenantId);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            isApproved: false,
            deniedAt: new Date(),
            denialReason,
            approvedBy,
            updatedAt: new Date(),
        };
        const { resource } = await this.visibilityContainer.item(id, tenantId).replace(updated);
        return resource;
    }
    /**
     * Get integrations with specific tier requirement
     */
    async getCatalogEntriesByPlan(requiredPlan) {
        const query = `
      SELECT * FROM c 
      WHERE c.requiredPlan = @requiredPlan 
      AND c.status != "deprecated"
    `;
        const { resources } = await this.catalogContainer.items
            .query({
            query,
            parameters: [{ name: '@requiredPlan', value: requiredPlan }],
        })
            .fetchAll();
        return resources;
    }
}
//# sourceMappingURL=integration-catalog.repository.js.map
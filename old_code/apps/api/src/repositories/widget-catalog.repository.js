/**
 * Widget Catalog Repository
 * Persists widget catalog entries and tenant configurations to Cosmos DB
 */
import { CosmosClient } from '@azure/cosmos';
import { config } from '../config/env.js';
export class WidgetCatalogRepository {
    client;
    catalogContainer;
    overrideContainer;
    configContainer;
    constructor() {
        this.client = new CosmosClient({
            endpoint: config.cosmosDb.endpoint,
            key: config.cosmosDb.key,
        });
        const database = this.client.database(config.cosmosDb.databaseId);
        this.catalogContainer = database.container('widgetCatalog');
        this.overrideContainer = database.container('tenantWidgetOverrides');
        this.configContainer = database.container('tenantWidgetConfigs');
    }
    // ============================================================================
    // Widget Catalog Entry Methods
    // ============================================================================
    /**
     * Create widget catalog entry
     */
    async createCatalogEntry(entry) {
        try {
            const { resource } = await this.catalogContainer.items.create(entry);
            return resource;
        }
        catch (error) {
            throw new Error(`Failed to create widget catalog entry: ${error}`);
        }
    }
    /**
     * Get widget catalog entry by ID
     */
    async getCatalogEntry(entryId) {
        try {
            const { resource } = await this.catalogContainer.item(entryId, entryId).read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw new Error(`Failed to get widget catalog entry: ${error}`);
        }
    }
    /**
     * List widget catalog entries with filtering
     */
    async listCatalogEntries(options) {
        try {
            const { page = 1, limit = 50, status, category, visibilityLevel, search } = options;
            const offset = (page - 1) * limit;
            let query = 'SELECT * FROM c WHERE c.catalogType = "system"';
            const parameters = [];
            if (status) {
                query += ' AND c.status = @status';
                parameters.push({ name: '@status', value: status });
            }
            if (category) {
                query += ' AND c.category = @category';
                parameters.push({ name: '@category', value: category });
            }
            if (visibilityLevel) {
                query += ' AND c.visibilityLevel = @visibilityLevel';
                parameters.push({ name: '@visibilityLevel', value: visibilityLevel });
            }
            if (search) {
                query += ' AND (CONTAINS(LOWER(c.displayName), @search) OR CONTAINS(LOWER(c.description), @search))';
                parameters.push({ name: '@search', value: search.toLowerCase() });
            }
            const sortMap = {
                name: 'c.displayName ASC',
                category: 'c.category ASC, c.displayName ASC',
                recent: 'c.updatedAt DESC',
                featured: 'c.isFeatured DESC, c.sortOrder ASC',
            };
            // Get total count
            const countQuery = query.replace('SELECT *', 'SELECT VALUE COUNT(1)');
            const { resources: countResult } = await this.catalogContainer.items
                .query({ query: countQuery, parameters }, { partitionKey: 'system' })
                .fetchAll();
            const total = countResult[0] || 0;
            const sortOrder = sortMap[options.sort || 'name'];
            query += ` ORDER BY ${sortOrder}`;
            // Get paginated results
            query += ` OFFSET ${offset} LIMIT ${limit}`;
            const { resources } = await this.catalogContainer.items
                .query({ query, parameters }, { partitionKey: 'system' })
                .fetchAll();
            return {
                items: resources,
                total,
                page,
                limit,
            };
        }
        catch (error) {
            throw new Error(`Failed to list widget catalog entries: ${error}`);
        }
    }
    /**
     * Update widget catalog entry
     */
    async updateCatalogEntry(entry) {
        try {
            const { resource } = await this.catalogContainer.item(entry.id, entry.id).replace(entry);
            return resource;
        }
        catch (error) {
            throw new Error(`Failed to update widget catalog entry: ${error}`);
        }
    }
    /**
     * Delete widget catalog entry
     */
    async deleteCatalogEntry(entryId) {
        try {
            await this.catalogContainer.item(entryId, entryId).delete();
        }
        catch (error) {
            throw new Error(`Failed to delete widget catalog entry: ${error}`);
        }
    }
    // ============================================================================
    // Tenant Widget Override Methods
    // ============================================================================
    /**
     * Get tenant widget override
     */
    async getTenantWidgetOverride(tenantId, widgetCatalogEntryId) {
        try {
            const partitionKey = `${tenantId}#${widgetCatalogEntryId}`;
            const { resource } = await this.overrideContainer.item(partitionKey, tenantId).read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw new Error(`Failed to get tenant widget override: ${error}`);
        }
    }
    /**
     * Update tenant widget override
     */
    async updateTenantWidgetOverride(override) {
        try {
            const partitionKey = `${override.tenantId}#${override.widgetCatalogEntryId}`;
            const document = {
                ...override,
                id: partitionKey,
                tenantId: override.tenantId,
            };
            const { resource } = await this.overrideContainer.items.upsert(document);
            return resource;
        }
        catch (error) {
            throw new Error(`Failed to update tenant widget override: ${error}`);
        }
    }
    /**
     * List tenant widget overrides
     */
    async listTenantWidgetOverrides(tenantId, page = 1, limit = 100) {
        try {
            const offset = (page - 1) * limit;
            const countQuery = 'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId';
            const { resources: countResult } = await this.overrideContainer.items
                .query({
                query: countQuery,
                parameters: [{ name: '@tenantId', value: tenantId }],
            }, { partitionKey: tenantId })
                .fetchAll();
            const total = countResult[0] || 0;
            const query = `
        SELECT * FROM c 
        WHERE c.tenantId = @tenantId 
        ORDER BY c.updatedAt DESC 
        OFFSET ${offset} LIMIT ${limit}
      `;
            const { resources } = await this.overrideContainer.items
                .query({
                query,
                parameters: [{ name: '@tenantId', value: tenantId }],
            }, { partitionKey: tenantId })
                .fetchAll();
            return {
                items: resources,
                total,
                page,
                limit,
            };
        }
        catch (error) {
            throw new Error(`Failed to list tenant widget overrides: ${error}`);
        }
    }
    /**
     * Delete tenant widget override
     */
    async deleteTenantWidgetOverride(tenantId, widgetCatalogEntryId) {
        try {
            const partitionKey = `${tenantId}#${widgetCatalogEntryId}`;
            await this.overrideContainer.item(partitionKey, tenantId).delete();
        }
        catch (error) {
            throw new Error(`Failed to delete tenant widget override: ${error}`);
        }
    }
    // ============================================================================
    // Tenant Widget Config Methods
    // ============================================================================
    /**
     * Get tenant widget catalog configuration
     */
    async getTenantWidgetConfig(tenantId) {
        try {
            const { resource } = await this.configContainer.item(tenantId, tenantId).read();
            if (resource) {
                return resource;
            }
            // Return default config if not found
            return this.getDefaultTenantConfig(tenantId);
        }
        catch (error) {
            if (error.code === 404) {
                return this.getDefaultTenantConfig(tenantId);
            }
            throw new Error(`Failed to get tenant widget config: ${error}`);
        }
    }
    /**
     * Update tenant widget catalog configuration
     */
    async updateTenantWidgetConfig(config) {
        try {
            const document = {
                ...config,
                id: config.tenantId,
            };
            const { resource } = await this.configContainer.items.upsert(document);
            return resource;
        }
        catch (error) {
            throw new Error(`Failed to update tenant widget config: ${error}`);
        }
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    /**
     * Get default tenant widget configuration
     */
    getDefaultTenantConfig(tenantId) {
        const now = new Date();
        return {
            tenantId,
            enableCustomWidgets: true,
            enableWidgetSharing: true,
            enableWidgetExport: false,
            visibleWidgetIds: [], // All widgets by default
            hiddenWidgetIds: [],
            featuredWidgetIds: [],
            roleBasedWidgetAccess: {},
            customCategoryLabels: {},
            defaultWidgetCatalogEntryIds: [],
            maxWidgetsPerDashboard: 20,
            maxCustomQueryWidgets: 5,
            version: 1,
            createdAt: now,
            updatedAt: now,
            updatedBy: 'system',
        };
    }
}
//# sourceMappingURL=widget-catalog.repository.js.map
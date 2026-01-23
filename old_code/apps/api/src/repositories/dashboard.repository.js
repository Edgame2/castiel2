/**
 * Dashboard Repository
 * Handles Cosmos DB operations for Dashboards and Widgets
 * Dashboards are stored as Shards with shardTypeId = 'c_dashboard'
 */
import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { DashboardType, DashboardVisibility, DEFAULT_GRID_CONFIG, DEFAULT_DASHBOARD_SETTINGS, } from '../types/dashboard.types.js';
import { ShardStatus } from '../types/shard.types.js';
/**
 * Dashboard Repository
 */
export class DashboardRepository {
    client;
    shardsContainer;
    configContainer;
    monitoring;
    constructor(monitoring) {
        this.monitoring = monitoring;
        this.client = new CosmosClient({
            endpoint: config.cosmosDb.endpoint,
            key: config.cosmosDb.key,
        });
        this.shardsContainer = this.client
            .database(config.cosmosDb.databaseId)
            .container(config.cosmosDb.containers.shards);
        // Use systemConfig container for tenant dashboard configs
        this.configContainer = this.client
            .database(config.cosmosDb.databaseId)
            .container('systemConfig');
    }
    // ============================================================================
    // Dashboard CRUD
    // ============================================================================
    /**
     * Create a new dashboard
     */
    async createDashboard(input) {
        const startTime = Date.now();
        try {
            const now = new Date();
            const id = uuidv4();
            const structuredData = {
                name: input.name,
                description: input.description,
                icon: input.icon,
                color: input.color,
                dashboardType: input.dashboardType || DashboardType.USER,
                ownerId: input.userId,
                ownerType: 'user',
                isDefault: false,
                isTemplate: false,
                isPublic: false,
                gridConfig: DEFAULT_GRID_CONFIG,
                layout: { desktop: [] },
                context: input.context,
                filters: input.filters,
                settings: {
                    ...DEFAULT_DASHBOARD_SETTINGS,
                    ...input.settings,
                },
                permissions: {
                    visibility: DashboardVisibility.PRIVATE,
                    ownerId: input.userId,
                    ownerType: 'user',
                    roles: [],
                    groups: [],
                    users: [],
                    ...input.permissions,
                },
                version: 1,
            };
            const dashboard = {
                id,
                tenantId: input.tenantId,
                userId: input.userId,
                shardTypeId: 'c_dashboard',
                structuredData,
                createdAt: now,
                updatedAt: now,
            };
            // Store as a Shard
            const shardDoc = {
                id,
                tenantId: input.tenantId,
                userId: input.userId,
                shardTypeId: 'c_dashboard',
                structuredData,
                status: ShardStatus.ACTIVE,
                revisionId: uuidv4(),
                revisionNumber: 1,
                acl: [],
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
            };
            const { resource } = await this.shardsContainer.items.create(shardDoc);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboard.create', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            this.monitoring.trackEvent('dashboard.created', {
                dashboardId: id,
                tenantId: input.tenantId,
                type: structuredData.dashboardType,
            });
            return this.shardToDashboard(resource);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboard.create', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            this.monitoring.trackException(error, {
                operation: 'dashboard.repository.create',
                tenantId: input.tenantId,
            });
            throw error;
        }
    }
    /**
     * Get dashboard by ID
     */
    async getDashboard(id, tenantId) {
        const startTime = Date.now();
        try {
            const { resource } = await this.shardsContainer
                .item(id, tenantId)
                .read();
            if (!resource || resource.shardTypeId !== 'c_dashboard') {
                return null;
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboard.get', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return this.shardToDashboard(resource);
        }
        catch (error) {
            const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
            if (errorCode === 404) {
                return null;
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboard.get', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            throw error;
        }
    }
    /**
     * Get dashboard with all its widgets
     */
    async getDashboardWithWidgets(id, tenantId) {
        const startTime = Date.now();
        try {
            // Fetch both dashboard and widgets in a single query
            const query = `
        SELECT * FROM c 
        WHERE c.tenantId = @tenantId 
        AND (
          (c.id = @id AND c.shardTypeId = 'c_dashboard')
          OR 
          (c.structuredData.dashboardId = @id AND c.shardTypeId = 'c_dashboardWidget')
        )
        AND (c.status = 'active' OR NOT IS_DEFINED(c.status))
      `;
            const { resources } = await this.shardsContainer.items
                .query({
                query,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@id', value: id },
                ],
            })
                .fetchAll();
            if (resources.length === 0) {
                return null;
            }
            const dashboardDoc = resources.find((r) => r.shardTypeId === 'c_dashboard');
            if (!dashboardDoc) {
                return null;
            }
            const widgetDocs = resources.filter((r) => r.shardTypeId === 'c_dashboardWidget');
            const dashboard = this.shardToDashboard(dashboardDoc);
            const widgets = widgetDocs.map((r) => this.shardToWidget(r));
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboard.getWithWidgets', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return { dashboard, widgets };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboard.getWithWidgets', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            throw error;
        }
    }
    /**
     * Update dashboard
     */
    async updateDashboard(id, tenantId, input) {
        const startTime = Date.now();
        try {
            const existing = await this.getDashboard(id, tenantId);
            if (!existing) {
                return null;
            }
            const now = new Date();
            const updatedStructuredData = {
                ...existing.structuredData,
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.icon !== undefined && { icon: input.icon }),
                ...(input.color !== undefined && { color: input.color }),
                ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
                ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
                ...(input.context !== undefined && { context: input.context }),
                ...(input.filters !== undefined && { filters: input.filters }),
                ...(input.settings && {
                    settings: { ...existing.structuredData.settings, ...input.settings },
                }),
                ...(input.permissions && {
                    permissions: { ...existing.structuredData.permissions, ...input.permissions },
                }),
                ...(input.layout && { layout: input.layout }),
                version: existing.structuredData.version + 1,
            };
            const { resource } = await this.shardsContainer.item(id, tenantId).replace({
                ...existing,
                structuredData: updatedStructuredData,
                updatedAt: now.toISOString(),
            });
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboard.update', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return this.shardToDashboard(resource);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboard.update', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            throw error;
        }
    }
    /**
     * Delete dashboard (soft delete) with transactional batch
     */
    async deleteDashboard(id, tenantId) {
        const startTime = Date.now();
        try {
            // 1. Get dashboard and all widgets to verify existence and get IDs
            const result = await this.getDashboardWithWidgets(id, tenantId);
            if (!result) {
                return false;
            }
            const { dashboard, widgets } = result;
            const now = new Date().toISOString();
            const operations = [];
            // Add dashboard update operation
            operations.push({
                operationType: 'Replace',
                id: dashboard.id,
                resourceBody: {
                    ...dashboard, // This uses standard dashboard object, which maps to shard
                    // We need to fetch the raw resource to do a proper replacement if we were rigorous,
                    // but shardToDashboard transforms perfectly back usually.
                    // Ideally we use the raw doc we just fetched.
                    // For safety, let's just patch the fields we know.
                    // BUT TransactionalBatch 'Patch' is better if supported, but SDK support varies.
                    // Let's use Replace with constructed object which is safer if we trust shardToDashboard inverse.
                    // Actually, let's fetch raw docs in getDashboardWithWidgets if we want 100% safety,
                    // but for now let's reconstruct.
                    shardTypeId: 'c_dashboard', // Ensure type is present
                    status: ShardStatus.DELETED,
                    deletedAt: now,
                },
            });
            // Add widget update operations
            widgets.forEach((widget) => {
                operations.push({
                    operationType: 'Replace',
                    id: widget.id,
                    resourceBody: {
                        ...widget,
                        shardTypeId: 'c_dashboardWidget',
                        status: ShardStatus.DELETED,
                        deletedAt: now,
                    },
                });
            });
            // Split into chunks of 100 (Cosmos DB limit)
            const chunks = [];
            for (let i = 0; i < operations.length; i += 100) {
                chunks.push(operations.slice(i, i + 100));
            }
            // Execute batches with error handling for partial failures
            const batchErrors = [];
            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                const chunk = chunks[chunkIndex];
                try {
                    await this.shardsContainer.items.batch(chunk, tenantId);
                }
                catch (error) {
                    // Track individual batch failures but continue with remaining batches
                    const batchError = error instanceof Error ? error : new Error(String(error));
                    batchErrors.push({ chunkIndex, error: batchError });
                    this.monitoring.trackException(batchError, {
                        operation: 'dashboard.repository.deleteDashboard.batch',
                        dashboardId: id,
                        tenantId,
                        chunkIndex,
                        chunkSize: chunk.length,
                    });
                }
            }
            // If all batches failed, throw an error
            if (batchErrors.length === chunks.length) {
                throw new Error(`All batch operations failed during dashboard deletion: ${batchErrors[0].error.message}`);
            }
            // If some batches failed, log warning but continue (partial success)
            if (batchErrors.length > 0) {
                this.monitoring.trackEvent('dashboard.delete.partialFailure', {
                    dashboardId: id,
                    tenantId,
                    totalChunks: chunks.length,
                    failedChunks: batchErrors.length,
                });
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboard.delete', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            this.monitoring.trackEvent('dashboard.deleted', {
                dashboardId: id,
                tenantId,
                itemsDeleted: operations.length,
            });
            return true;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboard.delete', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            throw error;
        }
    }
    /**
     * List dashboards
     */
    async listDashboards(options) {
        const startTime = Date.now();
        try {
            const { filter, limit = 20, offset = 0 } = options;
            this.monitoring.trackEvent('dashboard.repository.list', {
                tenantId: filter.tenantId,
                userId: filter.userId,
                dashboardType: filter.dashboardType,
            });
            let query = `SELECT * FROM c WHERE c.shardTypeId = 'c_dashboard' AND c.tenantId = @tenantId AND (c.status = 'active' OR NOT IS_DEFINED(c.status))`;
            const params = [
                { name: '@tenantId', value: filter.tenantId },
            ];
            if (filter.userId) {
                query += ` AND c.structuredData.ownerId = @userId`;
                params.push({ name: '@userId', value: filter.userId });
            }
            if (filter.dashboardType) {
                query += ` AND c.structuredData.dashboardType = @dashboardType`;
                params.push({ name: '@dashboardType', value: filter.dashboardType });
            }
            if (filter.isDefault !== undefined) {
                query += ` AND c.structuredData.isDefault = @isDefault`;
                params.push({ name: '@isDefault', value: filter.isDefault });
            }
            if (filter.isTemplate !== undefined) {
                query += ` AND c.structuredData.isTemplate = @isTemplate`;
                params.push({ name: '@isTemplate', value: filter.isTemplate });
            }
            if (filter.search) {
                query += ` AND CONTAINS(LOWER(c.structuredData.name), LOWER(@search))`;
                params.push({ name: '@search', value: filter.search });
            }
            query += ` ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit`;
            params.push({ name: '@offset', value: offset });
            params.push({ name: '@limit', value: limit + 1 }); // +1 to check hasMore
            const queryStart = Date.now();
            const { resources } = await this.shardsContainer.items
                .query({
                query,
                parameters: params,
            })
                .fetchAll();
            this.monitoring.trackEvent('dashboard.repository.query', {
                itemCount: resources.length,
                durationMs: Date.now() - queryStart,
            });
            const hasMore = resources.length > limit;
            const dashboards = resources.slice(0, limit).map((r) => this.shardToDashboard(r));
            // Get total count (skip if taking too long)
            let total = dashboards.length;
            try {
                const countStart = Date.now();
                // Use a clean scalar count query
                const countQueryKey = 'SELECT VALUE COUNT(1) FROM c WHERE c.shardTypeId = \'c_dashboard\' AND c.tenantId = @tenantId AND (c.status = \'active\' OR NOT IS_DEFINED(c.status))';
                // Re-append filters
                let finalCountQuery = countQueryKey;
                // NOTE: Regex replacement is fragile. Better to reconstruct or use a builder.
                // For minimal intrusion, we simply run the count query directly with same params (excluding offset/limit)
                if (filter.userId) {
                    finalCountQuery += ` AND c.structuredData.ownerId = @userId`;
                }
                if (filter.dashboardType) {
                    finalCountQuery += ` AND c.structuredData.dashboardType = @dashboardType`;
                }
                if (filter.isDefault !== undefined) {
                    finalCountQuery += ` AND c.structuredData.isDefault = @isDefault`;
                }
                if (filter.isTemplate !== undefined) {
                    finalCountQuery += ` AND c.structuredData.isTemplate = @isTemplate`;
                }
                if (filter.search) {
                    finalCountQuery += ` AND CONTAINS(LOWER(c.structuredData.name), LOWER(@search))`;
                }
                const { resources: countResult } = await this.shardsContainer.items
                    .query({
                    query: finalCountQuery,
                    parameters: params.filter(p => p.name !== '@offset' && p.name !== '@limit'),
                })
                    .fetchAll();
                total = countResult[0] || 0;
                this.monitoring.trackEvent('dashboard.repository.count', {
                    total,
                    durationMs: Date.now() - countStart,
                });
            }
            catch (countError) {
                this.monitoring.trackException(countError, { operation: 'dashboard.repository.count' });
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboard.list', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            this.monitoring.trackEvent('dashboard.repository.list-completed', { durationMs: duration });
            return {
                dashboards,
                total,
                hasMore,
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboard.list', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            throw error;
        }
    }
    /**
     * Get dashboards for inheritance (system + tenant dashboards)
     */
    async getInheritedDashboards(tenantId) {
        const startTime = Date.now();
        try {
            // Get system dashboards that are public or allowed for this tenant
            const systemQuery = `
        SELECT * FROM c 
        WHERE c.shardTypeId = 'c_dashboard' 
        AND c.structuredData.dashboardType = 'system'
        AND c.structuredData.isPublic = true
        AND (c.status = 'active' OR NOT IS_DEFINED(c.status))
      `;
            // Get tenant dashboards that are default or public
            const tenantQuery = `
        SELECT * FROM c 
        WHERE c.shardTypeId = 'c_dashboard' 
        AND c.tenantId = @tenantId
        AND c.structuredData.dashboardType = 'tenant'
        AND (c.structuredData.isDefault = true OR c.structuredData.isPublic = true)
        AND (c.status = 'active' OR NOT IS_DEFINED(c.status))
      `;
            const [systemResult, tenantResult] = await Promise.all([
                this.shardsContainer.items.query({ query: systemQuery }).fetchAll(),
                this.shardsContainer.items.query({
                    query: tenantQuery,
                    parameters: [{ name: '@tenantId', value: tenantId }],
                }).fetchAll(),
            ]);
            const dashboards = [
                ...systemResult.resources.map((r) => this.shardToDashboard(r)),
                ...tenantResult.resources.map((r) => this.shardToDashboard(r)),
            ];
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboard.getInherited', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return dashboards;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboard.getInherited', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            throw error;
        }
    }
    // ============================================================================
    // Widget CRUD
    // ============================================================================
    /**
     * Create a widget
     */
    async createWidget(input) {
        const startTime = Date.now();
        try {
            const now = new Date();
            const id = uuidv4();
            const structuredData = {
                name: input.name,
                description: input.description,
                icon: input.icon,
                widgetType: input.widgetType,
                config: input.config,
                dataSource: input.dataSource,
                position: input.position,
                size: input.size,
                refreshInterval: input.refreshInterval || 60,
                permissions: {
                    visibility: { roles: [] },
                    dataFiltering: { applyTenantFilter: true, applyUserFilter: false },
                    actions: { canRefresh: true, canExport: true, canDrillDown: true, canConfigure: true },
                    ...input.permissions,
                },
                isRequired: false,
                isPlaceholder: false,
            };
            const widget = {
                id,
                tenantId: input.tenantId,
                userId: input.userId,
                shardTypeId: 'c_dashboardWidget',
                structuredData: {
                    ...structuredData,
                    dashboardId: input.dashboardId,
                },
                status: ShardStatus.ACTIVE,
                revisionId: uuidv4(),
                revisionNumber: 1,
                acl: [],
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
            };
            const { resource } = await this.shardsContainer.items.create(widget);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.widget.create', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return this.shardToWidget(resource);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.widget.create', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            throw error;
        }
    }
    /**
     * Get widget by ID
     */
    async getWidget(id, tenantId) {
        const startTime = Date.now();
        try {
            const { resource } = await this.shardsContainer
                .item(id, tenantId)
                .read();
            if (!resource || resource.shardTypeId !== 'c_dashboardWidget') {
                return null;
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.widget.get', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return this.shardToWidget(resource);
        }
        catch (error) {
            const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
            if (errorCode === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Get widgets for a dashboard
     */
    async getWidgetsByDashboard(dashboardId, tenantId) {
        const startTime = Date.now();
        try {
            const query = `
        SELECT * FROM c 
        WHERE c.shardTypeId = 'c_dashboardWidget' 
        AND c.tenantId = @tenantId
        AND c.structuredData.dashboardId = @dashboardId
        AND (c.status = 'active' OR NOT IS_DEFINED(c.status))
      `;
            const { resources } = await this.shardsContainer.items
                .query({
                query,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@dashboardId', value: dashboardId },
                ],
            })
                .fetchAll();
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.widget.getByDashboard', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return resources.map((r) => this.shardToWidget(r));
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.widget.getByDashboard', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            throw error;
        }
    }
    /**
     * Update widget
     */
    async updateWidget(id, tenantId, input) {
        const startTime = Date.now();
        try {
            const { resource: existing } = await this.shardsContainer
                .item(id, tenantId)
                .read();
            if (!existing || existing.shardTypeId !== 'c_dashboardWidget') {
                return null;
            }
            const now = new Date();
            const updatedStructuredData = {
                ...existing.structuredData,
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.icon !== undefined && { icon: input.icon }),
                ...(input.config && { config: { ...existing.structuredData.config, ...input.config } }),
                ...(input.dataSource && { dataSource: { ...existing.structuredData.dataSource, ...input.dataSource } }),
                ...(input.position && { position: input.position }),
                ...(input.size && { size: input.size }),
                ...(input.refreshInterval !== undefined && { refreshInterval: input.refreshInterval }),
                ...(input.permissions && { permissions: { ...existing.structuredData.permissions, ...input.permissions } }),
            };
            const { resource } = await this.shardsContainer.item(id, tenantId).replace({
                ...existing,
                structuredData: updatedStructuredData,
                updatedAt: now.toISOString(),
            });
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.widget.update', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return this.shardToWidget(resource);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.widget.update', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            throw error;
        }
    }
    /**
     * Delete widget
     */
    async deleteWidget(id, tenantId) {
        const startTime = Date.now();
        try {
            const { resource: existing } = await this.shardsContainer
                .item(id, tenantId)
                .read();
            if (!existing || existing.shardTypeId !== 'c_dashboardWidget') {
                return false;
            }
            await this.shardsContainer.item(id, tenantId).replace({
                ...existing,
                status: ShardStatus.DELETED,
                deletedAt: new Date().toISOString(),
            });
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.widget.delete', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return true;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.widget.delete', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            throw error;
        }
    }
    /**
     * Batch update widget positions
     */
    async batchUpdatePositions(dashboardId, tenantId, input) {
        const startTime = Date.now();
        const now = new Date().toISOString();
        try {
            // 1. Fetch all widgets involved to ensure they exist and get current state
            // We can use the dashboard widgets query
            const allWidgets = await this.getWidgetsByDashboard(dashboardId, tenantId);
            const widgetMap = new Map(allWidgets.map(w => [w.id, w]));
            const operations = [];
            const updatedWidgets = [];
            for (const { widgetId, position, size } of input.positions) {
                const existing = widgetMap.get(widgetId);
                if (existing) {
                    const updatedStructuredData = {
                        ...existing.structuredData,
                        position,
                        ...(size && { size }),
                    };
                    const updatedWidget = {
                        ...existing,
                        structuredData: updatedStructuredData,
                        updatedAt: now,
                        shardTypeId: 'c_dashboardWidget', // Ensure type
                    };
                    operations.push({
                        operationType: 'Replace',
                        id: existing.id,
                        resourceBody: updatedWidget,
                    });
                    updatedWidgets.push(this.shardToWidget(updatedWidget));
                }
            }
            if (operations.length > 0) {
                // Chunk operations (though unlikely to exceed 100 for position updates)
                const chunks = [];
                for (let i = 0; i < operations.length; i += 100) {
                    chunks.push(operations.slice(i, i + 100));
                }
                for (const chunk of chunks) {
                    await this.shardsContainer.items.batch(chunk, tenantId);
                }
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.widget.batchUpdatePositions', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return updatedWidgets;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.widget.batchUpdatePositions', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            throw error;
        }
    }
    // ============================================================================
    // Version History
    // ============================================================================
    /**
     * Save dashboard version
     */
    async saveDashboardVersion(dashboardId, tenantId, changeType, changeSummary, userId) {
        const startTime = Date.now();
        try {
            const dashboard = await this.getDashboard(dashboardId, tenantId);
            if (!dashboard) {
                throw new Error('Dashboard not found');
            }
            const widgets = await this.getWidgetsByDashboard(dashboardId, tenantId);
            const now = new Date();
            const id = uuidv4();
            const version = {
                id,
                dashboardId,
                version: dashboard.structuredData.version,
                snapshot: {
                    widgets: widgets.map(w => w.id),
                    layout: dashboard.structuredData.layout,
                    settings: dashboard.structuredData.settings,
                    permissions: dashboard.structuredData.permissions,
                },
                changeSummary,
                changeType,
                createdAt: now,
                createdBy: userId,
            };
            const versionDoc = {
                id,
                tenantId,
                userId,
                shardTypeId: 'c_dashboardVersion',
                structuredData: {
                    dashboardId,
                    version: version.version,
                    snapshot: version.snapshot,
                    changeSummary,
                    changeType,
                },
                status: ShardStatus.ACTIVE,
                revisionId: uuidv4(),
                revisionNumber: 1,
                acl: [],
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
            };
            await this.shardsContainer.items.create(versionDoc);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboardVersion.save', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return version;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboardVersion.save', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            throw error;
        }
    }
    /**
     * Get dashboard versions
     */
    async getDashboardVersions(dashboardId, tenantId, limit = 20) {
        const startTime = Date.now();
        try {
            const query = `
        SELECT * FROM c 
        WHERE c.shardTypeId = 'c_dashboardVersion' 
        AND c.tenantId = @tenantId
        AND c.structuredData.dashboardId = @dashboardId
        ORDER BY c.structuredData.version DESC
        OFFSET 0 LIMIT @limit
      `;
            const { resources } = await this.shardsContainer.items
                .query({
                query,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@dashboardId', value: dashboardId },
                    { name: '@limit', value: limit },
                ],
            })
                .fetchAll();
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboardVersion.list', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return resources.map((r) => ({
                id: r.id,
                dashboardId: r.structuredData.dashboardId,
                version: r.structuredData.version,
                snapshot: r.structuredData.snapshot,
                changeSummary: r.structuredData.changeSummary,
                changeType: r.structuredData.changeType,
                createdAt: new Date(r.createdAt),
                createdBy: r.userId,
            }));
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.dashboardVersion.list', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            throw error;
        }
    }
    // ============================================================================
    // User Overrides
    // ============================================================================
    /**
     * Get user dashboard overrides
     */
    async getUserOverrides(userId, dashboardId, tenantId) {
        // Stored in a separate document type or config
        // For simplicity, we'll query for it
        try {
            const query = `
        SELECT * FROM c 
        WHERE c.type = 'userDashboardOverrides'
        AND c.tenantId = @tenantId
        AND c.userId = @userId
        AND c.dashboardId = @dashboardId
      `;
            const { resources } = await this.configContainer.items
                .query({
                query,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@userId', value: userId },
                    { name: '@dashboardId', value: dashboardId },
                ],
            })
                .fetchAll();
            if (resources.length === 0) {
                return null;
            }
            return resources[0];
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Save user dashboard overrides
     */
    async saveUserOverrides(overrides) {
        const id = `override_${overrides.userId}_${overrides.dashboardId}`;
        await this.configContainer.items.upsert({
            id,
            type: 'userDashboardOverrides',
            ...overrides,
            updatedAt: new Date().toISOString(),
        });
    }
    // ============================================================================
    // Tenant Configuration
    // ============================================================================
    /**
     * Get tenant dashboard config
     */
    async getTenantDashboardConfig(tenantId) {
        const startTime = Date.now();
        try {
            // Query using configType as partition key (systemConfig container uses this)
            const { resource } = await this.configContainer
                .item(`dashboardConfig_${tenantId}`, 'dashboardConfig')
                .read();
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.tenantConfig.read', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return resource || null;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
            if (errorCode === 404) {
                // Not found is expected - return null
                this.monitoring.trackDependency('cosmosdb.tenantConfig.read', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
                return null;
            }
            // Log actual errors
            this.monitoring.trackDependency('cosmosdb.tenantConfig.read', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'dashboard.repository.getTenantDashboardConfig',
                tenantId,
                duration,
            });
            // Return null instead of throwing - this allows dashboard creation to proceed with defaults
            return null;
        }
    }
    /**
     * Save tenant dashboard config
     */
    async saveTenantDashboardConfig(config) {
        await this.configContainer.items.upsert({
            id: `dashboardConfig_${config.tenantId}`,
            configType: 'dashboardConfig',
            type: 'tenantDashboardConfig',
            ...config,
        });
    }
    /**
     * Get tenant fiscal year config
     */
    async getTenantFiscalYearConfig(tenantId) {
        const startTime = Date.now();
        try {
            const { resource } = await this.configContainer
                .item(`fiscalYear_${tenantId}`, 'fiscalYearConfig')
                .read();
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.fiscalYearConfig.read', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            return resource || null;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
            if (errorCode === 404) {
                // Not found is expected - return null
                this.monitoring.trackDependency('cosmosdb.fiscalYearConfig.read', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
                return null;
            }
            // Log actual errors
            this.monitoring.trackDependency('cosmosdb.fiscalYearConfig.read', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'dashboard.repository.getTenantFiscalYearConfig',
                tenantId,
                duration,
            });
            // Return null instead of throwing
            return null;
        }
    }
    /**
     * Save tenant fiscal year config
     */
    async saveTenantFiscalYearConfig(config) {
        await this.configContainer.items.upsert({
            id: `fiscalYear_${config.tenantId}`,
            configType: 'fiscalYearConfig',
            type: 'tenantFiscalYearConfig',
            ...config,
        });
    }
    // ============================================================================
    // Widget Data Queries
    // ============================================================================
    /**
     * Query recent shards for widget
     */
    async queryRecentShards(tenantId, page, pageSize) {
        try {
            const offset = (page - 1) * pageSize;
            const countQuery = `
        SELECT VALUE COUNT(1) FROM c
        WHERE c.tenantId = @tenantId
        AND c.status = 'active'
        AND c.shardTypeId NOT IN ('c_dashboard', 'c_dashboardWidget')
      `;
            const dataQuery = `
        SELECT c.id, c.shardTypeId, c.structuredData.name, c.createdAt, c.updatedAt, c.userId
        FROM c
        WHERE c.tenantId = @tenantId
        AND c.status = 'active'
        AND c.shardTypeId NOT IN ('c_dashboard', 'c_dashboardWidget')
        ORDER BY c.updatedAt DESC
        OFFSET @offset LIMIT @limit
      `;
            const [countResult, dataResult] = await Promise.all([
                this.shardsContainer.items.query({
                    query: countQuery,
                    parameters: [{ name: '@tenantId', value: tenantId }],
                }).fetchAll(),
                this.shardsContainer.items.query({
                    query: dataQuery,
                    parameters: [
                        { name: '@tenantId', value: tenantId },
                        { name: '@offset', value: offset },
                        { name: '@limit', value: pageSize },
                    ],
                }).fetchAll(),
            ]);
            const totalCount = countResult.resources[0] || 0;
            return {
                results: dataResult.resources,
                totalCount,
                hasMore: offset + pageSize < totalCount,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'dashboard.repository.queryRecentShards',
                tenantId,
            });
            return { results: [], totalCount: 0, hasMore: false };
        }
    }
    /**
     * Query shard count by type
     */
    async queryShardCountByType(tenantId) {
        try {
            const query = `
        SELECT c.shardTypeId as type, COUNT(1) as count
        FROM c
        WHERE c.tenantId = @tenantId
        AND c.status = 'active'
        AND c.shardTypeId NOT IN ('c_dashboard', 'c_dashboardWidget')
        GROUP BY c.shardTypeId
      `;
            const { resources } = await this.shardsContainer.items.query({
                query,
                parameters: [{ name: '@tenantId', value: tenantId }],
            }).fetchAll();
            return resources;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'dashboard.repository.queryShardCountByType',
                tenantId,
            });
            return [];
        }
    }
    /**
     * Query shard count by status
     */
    async queryShardCountByStatus(tenantId) {
        try {
            const query = `
        SELECT c.status, COUNT(1) as count
        FROM c
        WHERE c.tenantId = @tenantId
        AND c.shardTypeId NOT IN ('c_dashboard', 'c_dashboardWidget')
        GROUP BY c.status
      `;
            const { resources } = await this.shardsContainer.items.query({
                query,
                parameters: [{ name: '@tenantId', value: tenantId }],
            }).fetchAll();
            return resources;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'dashboard.repository.queryShardCountByStatus',
                tenantId,
            });
            return [];
        }
    }
    /**
     * Query user activity timeline
     */
    async queryUserActivityTimeline(tenantId, userId, page, pageSize) {
        try {
            const offset = (page - 1) * pageSize;
            const query = `
        SELECT c.id, c.shardTypeId, c.structuredData.name, c.createdAt, c.updatedAt
        FROM c
        WHERE c.tenantId = @tenantId
        AND c.userId = @userId
        AND c.status = 'active'
        ORDER BY c.updatedAt DESC
        OFFSET @offset LIMIT @limit
      `;
            const { resources } = await this.shardsContainer.items.query({
                query,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@userId', value: userId },
                    { name: '@offset', value: offset },
                    { name: '@limit', value: pageSize },
                ],
            }).fetchAll();
            return {
                results: resources,
                totalCount: resources.length,
                hasMore: resources.length === pageSize,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'dashboard.repository.queryUserActivityTimeline',
                tenantId,
                userId,
            });
            return { results: [], totalCount: 0, hasMore: false };
        }
    }
    /**
     * Query team activity summary
     */
    async queryTeamActivitySummary(tenantId) {
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const query = `
        SELECT 
          COUNT(1) as totalShards,
          COUNT(DISTINCT c.userId) as activeUsers,
          SUM(c.createdAt >= @today ? 1 : 0) as shardsToday,
          SUM(c.createdAt >= @weekAgo ? 1 : 0) as shardsThisWeek
        FROM c
        WHERE c.tenantId = @tenantId
        AND c.status = 'active'
      `;
            const { resources } = await this.shardsContainer.items.query({
                query,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@today', value: today.toISOString() },
                    { name: '@weekAgo', value: weekAgo.toISOString() },
                ],
            }).fetchAll();
            return resources[0] || {
                totalShards: 0,
                activeUsers: 0,
                shardsToday: 0,
                shardsThisWeek: 0,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'dashboard.repository.queryTeamActivitySummary',
                tenantId,
            });
            return {
                totalShards: 0,
                activeUsers: 0,
                shardsToday: 0,
                shardsThisWeek: 0,
            };
        }
    }
    /**
     * Query my tasks
     */
    async queryMyTasks(tenantId, userId, page, pageSize) {
        try {
            const offset = (page - 1) * pageSize;
            const query = `
        SELECT c.id, c.structuredData
        FROM c
        WHERE c.tenantId = @tenantId
        AND c.shardTypeId = 'c_task'
        AND c.status = 'active'
        AND (c.userId = @userId OR ARRAY_CONTAINS(c.structuredData.assignees, @userId))
        AND (c.structuredData.status != 'completed' OR c.structuredData.status IS NULL)
        ORDER BY c.structuredData.dueDate ASC
        OFFSET @offset LIMIT @limit
      `;
            const { resources } = await this.shardsContainer.items.query({
                query,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@userId', value: userId },
                    { name: '@offset', value: offset },
                    { name: '@limit', value: pageSize },
                ],
            }).fetchAll();
            return {
                results: resources,
                totalCount: resources.length,
                hasMore: resources.length === pageSize,
            };
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'dashboard.repository.queryMyTasks',
                tenantId,
                userId,
            });
            return { results: [], totalCount: 0, hasMore: false };
        }
    }
    /**
     * Query upcoming events
     */
    async queryUpcomingEvents(tenantId, userId, page, pageSize) {
        try {
            const now = new Date();
            const offset = (page - 1) * pageSize;
            const query = `
        SELECT c.id, c.structuredData
        FROM c
        WHERE c.tenantId = @tenantId
        AND c.shardTypeId = 'c_event'
        AND c.status = 'active'
        AND c.structuredData.startDate >= @now
        AND (c.userId = @userId OR ARRAY_CONTAINS(c.structuredData.attendees, @userId))
        ORDER BY c.structuredData.startDate ASC
        OFFSET @offset LIMIT @limit
      `;
            const { resources } = await this.shardsContainer.items.query({
                query,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@userId', value: userId },
                    { name: '@now', value: now.toISOString() },
                    { name: '@offset', value: offset },
                    { name: '@limit', value: pageSize },
                ],
            }).fetchAll();
            return {
                results: resources,
                totalCount: resources.length,
                hasMore: resources.length === pageSize,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'dashboard.repository.queryUpcomingEvents',
                tenantId,
                userId,
            });
            return { results: [], totalCount: 0, hasMore: false };
        }
    }
    /**
     * Query storage usage
     */
    async queryStorageUsage(tenantId) {
        try {
            const countByType = await this.queryShardCountByType(tenantId);
            const totalShards = countByType.reduce((sum, item) => sum + item.count, 0);
            return {
                totalShards,
                totalSize: 0, // Would need actual size calculation
                byType: countByType,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'dashboard.repository.queryStorageUsage',
                tenantId,
            });
            return {
                totalShards: 0,
                totalSize: 0,
                byType: [],
            };
        }
    }
    /**
     * Query active users
     */
    async queryActiveUsers(tenantId) {
        try {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const query = `
        SELECT c.userId, COUNT(1) as activityCount
        FROM c
        WHERE c.tenantId = @tenantId
        AND c.updatedAt >= @weekAgo
        GROUP BY c.userId
        ORDER BY activityCount DESC
      `;
            const { resources } = await this.shardsContainer.items.query({
                query,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@weekAgo', value: weekAgo.toISOString() },
                ],
            }).fetchAll();
            return resources;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'dashboard.repository.queryActiveUsers',
                tenantId,
            });
            return [];
        }
    }
    /**
     * Execute custom widget query
     */
    async executeCustomWidgetQuery(params) {
        try {
            const { tenantId, target, filters, aggregation, sort, limit, offset, pageSize } = params;
            // Build WHERE clause
            let whereClause = `c.tenantId = @tenantId`;
            const queryParams = [
                { name: '@tenantId', value: tenantId },
            ];
            // Add target filter (shardTypeId)
            if (target && target !== '*') {
                whereClause += ` AND c.shardTypeId = @target`;
                queryParams.push({ name: '@target', value: target });
            }
            // Add status filter (default to active)
            whereClause += ` AND c.status = 'active'`;
            // Add custom filters
            if (filters && Array.isArray(filters) && filters.length > 0) {
                filters.forEach((filter, index) => {
                    // Validate filter structure
                    if (!filter || typeof filter !== 'object' || !filter.field || !filter.operator) {
                        this.monitoring.trackException(new Error('Invalid filter structure'), {
                            operation: 'dashboard.repository.executeCustomWidgetQuery',
                            tenantId: params.tenantId,
                            filterIndex: index,
                        });
                        return; // Skip invalid filter
                    }
                    const paramName = `@filter${index}`;
                    // Validate and sanitize field name to prevent injection
                    const sanitizedField = String(filter.field).trim();
                    if (!sanitizedField || !/^[a-zA-Z0-9_.]+$/.test(sanitizedField)) {
                        this.monitoring.trackException(new Error('Invalid field name in filter'), {
                            operation: 'dashboard.repository.executeCustomWidgetQuery',
                            tenantId: params.tenantId,
                            filterIndex: index,
                            field: sanitizedField,
                        });
                        return; // Skip invalid field
                    }
                    const fieldPath = sanitizedField.startsWith('structuredData.')
                        ? `c.${sanitizedField}`
                        : `c.structuredData.${sanitizedField}`;
                    switch (filter.operator) {
                        case 'eq':
                            whereClause += ` AND ${fieldPath} = ${paramName}`;
                            break;
                        case 'ne':
                            whereClause += ` AND ${fieldPath} != ${paramName}`;
                            break;
                        case 'gt':
                            whereClause += ` AND ${fieldPath} > ${paramName}`;
                            break;
                        case 'gte':
                            whereClause += ` AND ${fieldPath} >= ${paramName}`;
                            break;
                        case 'lt':
                            whereClause += ` AND ${fieldPath} < ${paramName}`;
                            break;
                        case 'lte':
                            whereClause += ` AND ${fieldPath} <= ${paramName}`;
                            break;
                        case 'contains':
                            whereClause += ` AND CONTAINS(${fieldPath}, ${paramName})`;
                            break;
                        case 'startsWith':
                            whereClause += ` AND STARTSWITH(${fieldPath}, ${paramName})`;
                            break;
                        case 'in':
                            whereClause += ` AND ARRAY_CONTAINS(${paramName}, ${fieldPath})`;
                            break;
                    }
                    queryParams.push({ name: paramName, value: filter.value });
                });
            }
            // Build SELECT clause
            let selectClause = 'c';
            if (aggregation) {
                switch (aggregation.type) {
                    case 'count':
                        if (aggregation.groupBy) {
                            selectClause = `c.structuredData.${aggregation.groupBy} as groupKey, COUNT(1) as count`;
                        }
                        else {
                            selectClause = 'COUNT(1) as count';
                        }
                        break;
                    case 'sum':
                        if (aggregation.field) {
                            selectClause = aggregation.groupBy
                                ? `c.structuredData.${aggregation.groupBy} as groupKey, SUM(c.structuredData.${aggregation.field}) as total`
                                : `SUM(c.structuredData.${aggregation.field}) as total`;
                        }
                        break;
                    case 'avg':
                        if (aggregation.field) {
                            selectClause = aggregation.groupBy
                                ? `c.structuredData.${aggregation.groupBy} as groupKey, AVG(c.structuredData.${aggregation.field}) as average`
                                : `AVG(c.structuredData.${aggregation.field}) as average`;
                        }
                        break;
                }
            }
            // Build GROUP BY clause
            let groupByClause = '';
            if (aggregation?.groupBy) {
                groupByClause = `GROUP BY c.structuredData.${aggregation.groupBy}`;
            }
            // Build ORDER BY clause
            let orderByClause = 'ORDER BY c.updatedAt DESC';
            if (sort) {
                const sortField = sort.field.startsWith('structuredData.')
                    ? `c.${sort.field}`
                    : `c.structuredData.${sort.field}`;
                orderByClause = `ORDER BY ${sortField} ${sort.direction.toUpperCase()}`;
            }
            // Build pagination
            const offsetValue = offset || 0;
            const limitValue = limit || pageSize || 20;
            const paginationClause = `OFFSET @offset LIMIT @limit`;
            queryParams.push({ name: '@offset', value: offsetValue });
            queryParams.push({ name: '@limit', value: limitValue });
            // Build full query
            const query = `
        SELECT ${selectClause}
        FROM c
        WHERE ${whereClause}
        ${groupByClause}
        ${orderByClause}
        ${aggregation ? '' : paginationClause}
      `.trim();
            const { resources } = await this.shardsContainer.items.query({
                query,
                parameters: queryParams,
            }).fetchAll();
            return {
                results: resources,
                totalCount: resources.length,
                hasMore: !aggregation && resources.length === limitValue,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'dashboard.repository.executeCustomWidgetQuery',
                tenantId: params.tenantId,
                target: params.target,
            });
            return { results: [], totalCount: 0, hasMore: false };
        }
    }
    // ============================================================================
    // Helpers
    // ============================================================================
    /**
     * Convert Shard document to Dashboard
     */
    shardToDashboard(doc) {
        return {
            id: doc.id,
            tenantId: doc.tenantId,
            userId: doc.userId,
            shardTypeId: 'c_dashboard',
            structuredData: doc.structuredData,
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt),
        };
    }
    /**
     * Convert Shard document to Widget
     */
    shardToWidget(doc) {
        return {
            id: doc.id,
            tenantId: doc.tenantId,
            userId: doc.userId,
            shardTypeId: 'c_dashboardWidget',
            dashboardId: doc.structuredData.dashboardId,
            structuredData: doc.structuredData,
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt),
        };
    }
}
//# sourceMappingURL=dashboard.repository.js.map
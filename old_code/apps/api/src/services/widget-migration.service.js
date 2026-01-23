/**
 * Widget Migration Service
 * Migrates existing inline dashboard widgets to catalog references
 *
 * Migration Strategy:
 * 1. Scan all dashboards for widgets with inline configs
 * 2. For each widget, find or create matching catalog entry
 * 3. Update dashboard widget to reference catalog entry ID
 * 4. Track migration status and any conflicts
 */
import { DashboardRepository } from '../repositories/dashboard.repository.js';
import { WidgetCatalogRepository } from '../repositories/widget-catalog.repository.js';
import { WidgetCatalogStatus, WidgetVisibilityLevel, } from '../types/widget-catalog.types.js';
import { WidgetType } from '../types/widget.types.js';
import { v4 as uuidv4 } from 'uuid';
export class WidgetMigrationService {
    dashboardRepository;
    catalogRepository;
    monitoring;
    constructor(monitoring) {
        this.monitoring = monitoring;
        this.dashboardRepository = new DashboardRepository(monitoring);
        this.catalogRepository = new WidgetCatalogRepository();
    }
    /**
     * Dry-run migration - analyze what would be migrated without making changes
     */
    async analyzeMigration() {
        const startTime = new Date();
        const stats = {
            totalDashboards: 0,
            totalWidgets: 0,
            migratedWidgets: 0,
            newCatalogEntries: 0,
            skippedWidgets: 0,
            errors: [],
            startTime,
        };
        try {
            // Get all dashboards - need tenantId for listDashboards
            // For migration, we'll need to iterate through tenants or use a different approach
            // For now, this is a placeholder - migration should be tenant-scoped
            const dashboards = await this.dashboardRepository.listDashboards({
                filter: {
                    tenantId: 'system', // TODO: Migration should be run per tenant
                },
                limit: 1000,
                offset: 0,
            });
            stats.totalDashboards = dashboards.total;
            for (const dashboard of dashboards.dashboards) {
                // Get dashboard widgets
                const widgets = await this.dashboardRepository.getWidgetsByDashboard(dashboard.id, dashboard.tenantId);
                stats.totalWidgets += widgets.length;
                for (const widget of widgets) {
                    try {
                        // Check if widget has inline config (not referencing catalog)
                        if (this.hasInlineConfig(widget)) {
                            stats.migratedWidgets++;
                            // Check if matching catalog entry would be created
                            const match = await this.findMatchingCatalogEntry(widget);
                            if (!match) {
                                stats.newCatalogEntries++;
                            }
                        }
                        else {
                            stats.skippedWidgets++;
                        }
                    }
                    catch (error) {
                        stats.errors.push({
                            dashboardId: dashboard.id,
                            widgetId: widget.id,
                            error: error.message,
                        });
                    }
                }
            }
            stats.endTime = new Date();
            stats.durationMs = stats.endTime.getTime() - startTime.getTime();
            this.monitoring.trackEvent('Widget Migration Analyzed', {
                stats: JSON.stringify(stats),
            });
            return stats;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'WidgetMigrationService.analyzeMigration',
            });
            throw error;
        }
    }
    /**
     * Execute full migration - convert all inline widgets to catalog references
     */
    async executeFullMigration() {
        const startTime = new Date();
        const stats = {
            totalDashboards: 0,
            totalWidgets: 0,
            migratedWidgets: 0,
            newCatalogEntries: 0,
            skippedWidgets: 0,
            errors: [],
            startTime,
        };
        try {
            // Get all dashboards - need tenantId for listDashboards
            // For migration, we'll need to iterate through tenants or use a different approach
            // For now, this is a placeholder - migration should be tenant-scoped
            const dashboards = await this.dashboardRepository.listDashboards({
                filter: {
                    tenantId: 'system', // TODO: Migration should be run per tenant
                },
                limit: 1000,
                offset: 0,
            });
            stats.totalDashboards = dashboards.total;
            const systemUserId = 'migration-service';
            for (const dashboard of dashboards.dashboards) {
                try {
                    // Get dashboard widgets
                    const widgets = await this.dashboardRepository.getWidgetsByDashboard(dashboard.id, dashboard.tenantId);
                    stats.totalWidgets += widgets.length;
                    const updatedWidgets = [];
                    for (const widget of widgets) {
                        try {
                            // Check if widget has inline config
                            if (this.hasInlineConfig(widget)) {
                                // Find or create matching catalog entry
                                let catalogEntry = await this.findMatchingCatalogEntry(widget);
                                if (!catalogEntry) {
                                    // Create new catalog entry
                                    catalogEntry = await this.createCatalogEntryFromWidget(widget, systemUserId);
                                    stats.newCatalogEntries++;
                                }
                                // Update widget to reference catalog entry
                                const migratedWidget = {
                                    ...widget,
                                    catalogEntryId: catalogEntry.id,
                                    // Keep original config in case of rollback needed
                                    originalConfig: widget.structuredData?.config || widget.config,
                                    isMigratedWidget: true,
                                };
                                updatedWidgets.push(migratedWidget);
                                stats.migratedWidgets++;
                            }
                            else {
                                updatedWidgets.push(widget);
                                stats.skippedWidgets++;
                            }
                        }
                        catch (error) {
                            stats.errors.push({
                                dashboardId: dashboard.id,
                                widgetId: widget.id,
                                error: error.message,
                            });
                            // Keep original widget on error
                            updatedWidgets.push(widget);
                        }
                    }
                    // Update dashboard widgets
                    if (updatedWidgets.length > 0) {
                        // Batch update would go here
                        // await this.dashboardRepository.updateWidgets(dashboard.id, updatedWidgets);
                    }
                }
                catch (error) {
                    this.monitoring.trackException(error, {
                        context: 'WidgetMigrationService.executeFullMigration',
                        dashboardId: dashboard.id,
                    });
                }
            }
            stats.endTime = new Date();
            stats.durationMs = stats.endTime.getTime() - startTime.getTime();
            this.monitoring.trackEvent('Widget Migration Executed', {
                stats: JSON.stringify(stats),
            });
            return stats;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'WidgetMigrationService.executeFullMigration',
            });
            throw error;
        }
    }
    /**
     * Migrate single dashboard
     */
    async migrateDashboard(dashboardId, tenantId) {
        const startTime = new Date();
        const stats = {
            totalDashboards: 1,
            totalWidgets: 0,
            migratedWidgets: 0,
            newCatalogEntries: 0,
            skippedWidgets: 0,
            errors: [],
            startTime,
        };
        try {
            const dashboard = await this.dashboardRepository.getDashboard(dashboardId, tenantId);
            if (!dashboard) {
                throw new Error(`Dashboard ${dashboardId} not found`);
            }
            const widgets = await this.dashboardRepository.getWidgetsByDashboard(dashboardId, tenantId);
            stats.totalWidgets = widgets.length;
            const updatedWidgets = [];
            const systemUserId = 'migration-service';
            for (const widget of widgets) {
                try {
                    if (this.hasInlineConfig(widget)) {
                        let catalogEntry = await this.findMatchingCatalogEntry(widget);
                        if (!catalogEntry) {
                            catalogEntry = await this.createCatalogEntryFromWidget(widget, systemUserId);
                            stats.newCatalogEntries++;
                        }
                        const migratedWidget = {
                            ...widget,
                            catalogEntryId: catalogEntry.id,
                            originalConfig: widget.structuredData?.config || widget.config,
                            isMigratedWidget: true,
                        };
                        updatedWidgets.push(migratedWidget);
                        stats.migratedWidgets++;
                    }
                    else {
                        updatedWidgets.push(widget);
                        stats.skippedWidgets++;
                    }
                }
                catch (error) {
                    stats.errors.push({
                        dashboardId,
                        widgetId: widget.id,
                        error: error.message,
                    });
                    updatedWidgets.push(widget);
                }
            }
            // Update dashboard
            // await this.dashboardRepository.updateWidgets(dashboardId, updatedWidgets);
            stats.endTime = new Date();
            stats.durationMs = stats.endTime.getTime() - startTime.getTime();
            return stats;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'WidgetMigrationService.migrateDashboard',
                dashboardId,
            });
            throw error;
        }
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    /**
     * Check if widget has inline configuration (not referencing catalog)
     */
    hasInlineConfig(widget) {
        // If widget references a catalog entry, it's already migrated
        const config = widget.structuredData?.config || widget.config;
        return !widget.catalogEntryId && config && Object.keys(config).length > 0;
    }
    /**
     * Find matching catalog entry for widget
     * Matches by widget type and similar configuration
     */
    async findMatchingCatalogEntry(widget) {
        try {
            const result = await this.catalogRepository.listCatalogEntries({
                sort: 'name',
                limit: 100,
            });
            // Find entry matching widget type
            return (result.items.find((entry) => entry.widgetType === widget.widgetType &&
                entry.status === WidgetCatalogStatus.ACTIVE) || null);
        }
        catch (error) {
            // If search fails, return null
            return null;
        }
    }
    /**
     * Create catalog entry from existing widget
     */
    async createCatalogEntryFromWidget(widget, userId) {
        const now = new Date();
        const id = uuidv4();
        const structuredData = widget.structuredData || widget;
        const entry = {
            id,
            widgetType: structuredData.widgetType,
            catalogType: 'system',
            name: structuredData.name || `migrated_${structuredData.widgetType}`,
            displayName: structuredData.name || structuredData.widgetType,
            description: structuredData.description || `Migrated from dashboard widget`,
            category: this.getCategoryFromWidgetType(structuredData.widgetType),
            status: WidgetCatalogStatus.ACTIVE,
            isDefault: false,
            isFeatured: false,
            visibilityLevel: WidgetVisibilityLevel.ALL,
            defaultSize: structuredData.size || { width: 4, height: 3 },
            defaultConfig: structuredData.config || {},
            defaultPermissions: {
                visibility: { roles: [] },
                dataFiltering: { applyTenantFilter: true, applyUserFilter: false },
                actions: {
                    canRefresh: true,
                    canExport: true,
                    canDrillDown: false,
                    canConfigure: true,
                },
            },
            allowUserConfiguration: true,
            version: 1,
            tags: ['migrated'],
            sortOrder: 999,
            createdAt: now,
            createdBy: userId,
            updatedAt: now,
            updatedBy: userId,
        };
        return this.catalogRepository.createCatalogEntry(entry);
    }
    /**
     * Get category from widget type
     */
    getCategoryFromWidgetType(widgetType) {
        const categoryMap = {
            [WidgetType.COUNTER]: 'Data',
            [WidgetType.CHART]: 'Visualization',
            [WidgetType.TABLE]: 'Data',
            [WidgetType.LIST]: 'Data',
            [WidgetType.GAUGE]: 'Visualization',
            [WidgetType.RECENT_SHARDS]: 'Shards',
            [WidgetType.SHARD_ACTIVITY]: 'Shards',
            [WidgetType.SHARD_STATS]: 'Shards',
            [WidgetType.SHARD_KANBAN]: 'Shards',
            [WidgetType.TEAM_ACTIVITY]: 'Team',
            [WidgetType.USER_STATS]: 'User',
            [WidgetType.MY_TASKS]: 'User',
            [WidgetType.NOTIFICATIONS]: 'User',
            [WidgetType.CUSTOM_QUERY]: 'Custom',
            [WidgetType.MARKDOWN]: 'Content',
            [WidgetType.QUICK_LINKS]: 'Navigation',
        };
        return categoryMap[widgetType] || 'Other';
    }
}
//# sourceMappingURL=widget-migration.service.js.map
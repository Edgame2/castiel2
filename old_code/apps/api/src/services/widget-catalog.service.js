/**
 * Widget Catalog Service
 * Manages widget catalog entries and tenant customizations
 *
 * Permissions:
 * - SuperAdmin: Full CRUD on widget catalog entries (system-wide)
 * - TenantAdmin: Visibility/role customization only (cannot modify base config)
 * - Regular User: Read-only access to visible widgets
 */
import { v4 as uuidv4 } from 'uuid';
import { WidgetCatalogStatus, WidgetVisibilityLevel, } from '../types/widget-catalog.types.js';
import { WidgetCatalogRepository } from '../repositories/widget-catalog.repository.js';
export class WidgetCatalogService {
    repository;
    monitoring;
    constructor(monitoring) {
        this.monitoring = monitoring;
        this.repository = new WidgetCatalogRepository();
    }
    // ============================================================================
    // SuperAdmin: Widget Catalog Entry Management
    // ============================================================================
    /**
     * Create widget catalog entry (SuperAdmin only)
     */
    async createCatalogEntry(input, userId) {
        const startTime = Date.now();
        try {
            const now = new Date();
            const id = uuidv4();
            const entry = {
                id,
                widgetType: input.widgetType,
                catalogType: 'system',
                name: input.name,
                displayName: input.displayName,
                description: input.description,
                category: input.category,
                icon: input.icon,
                thumbnail: input.thumbnail,
                status: input.status || WidgetCatalogStatus.ACTIVE,
                isDefault: input.isDefault || false,
                isFeatured: input.isFeatured || false,
                visibilityLevel: input.visibilityLevel,
                allowedRoles: input.allowedRoles,
                defaultSize: input.defaultSize,
                defaultConfig: input.defaultConfig,
                minSize: input.defaultSize, // Can be overridden
                maxSize: { width: 12, height: 8 }, // Default max
                defaultPermissions: {
                    visibility: {
                        roles: input.allowedRoles || [],
                    },
                    dataFiltering: {
                        applyTenantFilter: true,
                        applyUserFilter: false,
                    },
                    actions: {
                        canRefresh: true,
                        canExport: true,
                        canDrillDown: false,
                        canConfigure: input.visibilityLevel === WidgetVisibilityLevel.SPECIFIC_ROLES,
                    },
                },
                allowUserConfiguration: true,
                configurableFields: [],
                version: 1,
                tags: [],
                sortOrder: 999,
                createdAt: now,
                createdBy: userId,
                updatedAt: now,
                updatedBy: userId,
            };
            return await this.repository.createCatalogEntry(entry);
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                context: 'WidgetCatalogService.createCatalogEntry',
                input,
                userId,
            });
            throw error;
        }
    }
    /**
     * Get widget catalog entry by ID
     */
    async getCatalogEntry(entryId) {
        try {
            return await this.repository.getCatalogEntry(entryId);
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                context: 'WidgetCatalogService.getCatalogEntry',
                entryId,
            });
            throw error;
        }
    }
    /**
     * List widget catalog entries with filtering
     */
    async listCatalogEntries(options) {
        try {
            return await this.repository.listCatalogEntries(options);
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                context: 'WidgetCatalogService.listCatalogEntries',
                options,
            });
            throw error;
        }
    }
    /**
     * Update widget catalog entry (SuperAdmin only)
     * Immutable fields: widgetType, catalogType, name
     */
    async updateCatalogEntry(entryId, input, userId) {
        try {
            const existing = await this.repository.getCatalogEntry(entryId);
            if (!existing) {
                throw new Error(`Widget catalog entry ${entryId} not found`);
            }
            // Enforce version check for optimistic concurrency
            if (existing.version !== input.version) {
                throw new Error(`Version conflict: expected ${existing.version}, got ${input.version}`);
            }
            const updated = {
                ...existing,
                displayName: input.displayName ?? existing.displayName,
                description: input.description ?? existing.description,
                category: input.category ?? existing.category,
                icon: input.icon ?? existing.icon,
                thumbnail: input.thumbnail ?? existing.thumbnail,
                status: input.status ?? existing.status,
                isDefault: input.isDefault ?? existing.isDefault,
                isFeatured: input.isFeatured ?? existing.isFeatured,
                visibilityLevel: input.visibilityLevel ?? existing.visibilityLevel,
                allowedRoles: input.allowedRoles ?? existing.allowedRoles,
                defaultSize: input.defaultSize ?? existing.defaultSize,
                defaultConfig: input.defaultConfig ?? existing.defaultConfig,
                minSize: input.minSize ?? existing.minSize,
                maxSize: input.maxSize ?? existing.maxSize,
                version: existing.version + 1,
                updatedAt: new Date(),
                updatedBy: userId,
            };
            return await this.repository.updateCatalogEntry(updated);
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                context: 'WidgetCatalogService.updateCatalogEntry',
                entryId,
                userId,
            });
            throw error;
        }
    }
    /**
     * Delete widget catalog entry (SuperAdmin only)
     */
    async deleteCatalogEntry(entryId) {
        try {
            return await this.repository.deleteCatalogEntry(entryId);
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                context: 'WidgetCatalogService.deleteCatalogEntry',
                entryId,
            });
            throw error;
        }
    }
    // ============================================================================
    // TenantAdmin: Widget Visibility & Access Customization
    // ============================================================================
    /**
     * Update tenant widget access (visibility/roles only, TenantAdmin)
     * Cannot modify base widget configuration
     */
    async updateTenantWidgetAccess(tenantId, input, userId) {
        try {
            const existing = await this.repository.getTenantWidgetOverride(tenantId, input.widgetCatalogEntryId);
            if (existing && existing.version !== input.version) {
                throw new Error(`Version conflict: expected ${existing.version}, got ${input.version}`);
            }
            const override = {
                id: existing?.id || uuidv4(),
                tenantId,
                widgetCatalogEntryId: input.widgetCatalogEntryId,
                visibleToTenant: input.visibleToTenant ?? (existing?.visibleToTenant ?? true),
                customVisibilityLevel: input.customVisibilityLevel ?? existing?.customVisibilityLevel,
                customAllowedRoles: input.customAllowedRoles ?? existing?.customAllowedRoles,
                enableForTenant: input.enableForTenant ?? (existing?.enableForTenant ?? true),
                featuredForTenant: input.featuredForTenant ?? (existing?.featuredForTenant ?? false),
                version: (existing?.version || 0) + 1,
                createdAt: existing?.createdAt || new Date(),
                createdBy: existing?.createdBy || userId,
                updatedAt: new Date(),
                updatedBy: userId,
            };
            return await this.repository.updateTenantWidgetOverride(override);
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                context: 'WidgetCatalogService.updateTenantWidgetAccess',
                tenantId,
                widgetId: input.widgetCatalogEntryId,
            });
            throw error;
        }
    }
    /**
     * Get tenant widget catalog configuration
     */
    async getTenantWidgetConfig(tenantId) {
        try {
            return await this.repository.getTenantWidgetConfig(tenantId);
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                context: 'WidgetCatalogService.getTenantWidgetConfig',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Update tenant widget catalog configuration (TenantAdmin)
     */
    async updateTenantWidgetConfig(tenantId, input, userId) {
        try {
            const existing = await this.repository.getTenantWidgetConfig(tenantId);
            if (existing.version !== input.version) {
                throw new Error(`Version conflict: expected ${existing.version}, got ${input.version}`);
            }
            const updated = {
                ...existing,
                visibleWidgetIds: input.visibleWidgetIds ?? existing.visibleWidgetIds,
                hiddenWidgetIds: input.hiddenWidgetIds ?? existing.hiddenWidgetIds,
                featuredWidgetIds: input.featuredWidgetIds ?? existing.featuredWidgetIds,
                roleBasedWidgetAccess: input.roleBasedWidgetAccess ?? existing.roleBasedWidgetAccess,
                defaultWidgetCatalogEntryIds: input.defaultWidgetCatalogEntryIds ?? existing.defaultWidgetCatalogEntryIds,
                maxWidgetsPerDashboard: input.maxWidgetsPerDashboard ?? existing.maxWidgetsPerDashboard,
                maxCustomQueryWidgets: input.maxCustomQueryWidgets ?? existing.maxCustomQueryWidgets,
                version: existing.version + 1,
                updatedAt: new Date(),
                updatedBy: userId,
            };
            return await this.repository.updateTenantWidgetConfig(updated);
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                context: 'WidgetCatalogService.updateTenantWidgetConfig',
                tenantId,
            });
            throw error;
        }
    }
    // ============================================================================
    // User: View Widgets with Tenant Overrides Applied
    // ============================================================================
    /**
     * Get widget catalog entries for user (with tenant overrides applied)
     * Filters based on user role, tenant, and visibility settings
     */
    async getUserWidgetCatalog(tenantId, userRoles, options) {
        try {
            // Get all active catalog entries
            const allEntries = await this.repository.listCatalogEntries({
                status: WidgetCatalogStatus.ACTIVE,
                ...options,
            });
            // Get tenant overrides
            const overrides = await this.repository.listTenantWidgetOverrides(tenantId);
            const overrideMap = new Map(overrides.items.map((o) => [o.widgetCatalogEntryId, o]));
            // Get tenant config
            const config = await this.repository.getTenantWidgetConfig(tenantId);
            // Filter entries based on visibility and user role
            const filteredEntries = allEntries.items
                .filter((entry) => {
                // Check if hidden by tenant
                if (config.hiddenWidgetIds.includes(entry.id)) {
                    return false;
                }
                // Check if explicitly visible
                if (!config.visibleWidgetIds.includes(entry.id) && !entry.isDefault) {
                    return false;
                }
                // Check visibility level
                if (entry.visibilityLevel === WidgetVisibilityLevel.HIDDEN) {
                    return false;
                }
                // Check role access
                const override = overrideMap.get(entry.id);
                const allowedRoles = override?.customAllowedRoles ?? entry.allowedRoles;
                if (entry.visibilityLevel === WidgetVisibilityLevel.SPECIFIC_ROLES &&
                    allowedRoles &&
                    !userRoles.some((r) => allowedRoles.includes(r))) {
                    return false;
                }
                return true;
            })
                .map((entry) => ({
                ...entry,
                tenantOverride: overrideMap.get(entry.id),
                visibleToUser: true,
                userAllowedRoles: overrideMap.get(entry.id)?.customAllowedRoles ?? entry.allowedRoles ?? [],
            }));
            return {
                items: filteredEntries,
                total: filteredEntries.length,
                page: options?.page || 1,
                limit: options?.limit || 100,
            };
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                context: 'WidgetCatalogService.getUserWidgetCatalog',
                tenantId,
                userRoles,
            });
            throw error;
        }
    }
    // ============================================================================
    // Tenant Overrides Management
    // ============================================================================
    /**
     * Get tenant widget override
     */
    async getTenantWidgetOverride(tenantId, widgetCatalogEntryId) {
        try {
            return await this.repository.getTenantWidgetOverride(tenantId, widgetCatalogEntryId);
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                context: 'WidgetCatalogService.getTenantWidgetOverride',
                tenantId,
                widgetCatalogEntryId,
            });
            throw error;
        }
    }
    /**
     * List tenant widget overrides
     */
    async listTenantWidgetOverrides(tenantId, page = 1, limit = 100) {
        try {
            return await this.repository.listTenantWidgetOverrides(tenantId, page, limit);
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                context: 'WidgetCatalogService.listTenantWidgetOverrides',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Delete tenant widget override (reset to default)
     */
    async deleteTenantWidgetOverride(tenantId, widgetCatalogEntryId) {
        try {
            return await this.repository.deleteTenantWidgetOverride(tenantId, widgetCatalogEntryId);
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                context: 'WidgetCatalogService.deleteTenantWidgetOverride',
                tenantId,
                widgetCatalogEntryId,
            });
            throw error;
        }
    }
}
//# sourceMappingURL=widget-catalog.service.js.map
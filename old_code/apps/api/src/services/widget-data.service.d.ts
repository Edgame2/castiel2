/**
 * Widget Data Service
 * Handles widget data queries with hybrid caching strategy
 * - Caches base query results (shared)
 * - Filters per-user at runtime for permissions
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { DashboardCacheService } from './dashboard-cache.service.js';
import { DashboardRepository } from '../repositories/dashboard.repository.js';
import { IntegrationConnectionService } from './integration-connection.service.js';
import { IntegrationRepository } from '../repositories/integration.repository.js';
import { Widget, WidgetDataRequest, WidgetDataResponse } from '../types/widget.types.js';
import { DashboardContext, DateRangeValue, TenantFiscalYearConfig } from '../types/dashboard.types.js';
/**
 * Widget Data Service
 * Executes widget queries with caching and permission filtering
 */
export declare class WidgetDataService {
    private repository;
    private monitoring;
    private cacheService?;
    private connectionService?;
    private tenantIntegrationRepo?;
    constructor(repository: DashboardRepository, monitoring: IMonitoringProvider, cacheService?: DashboardCacheService, connectionService?: IntegrationConnectionService, tenantIntegrationRepo?: IntegrationRepository);
    /**
     * Set cache service (for late initialization)
     */
    setCacheService(cacheService: DashboardCacheService): void;
    /**
     * Get widget data with hybrid caching strategy
     */
    getWidgetData(widget: Widget, request: WidgetDataRequest, context: {
        tenantId: string;
        userId: string;
        userRoles: string[];
        userGroups: string[];
        fiscalYearConfig?: TenantFiscalYearConfig;
    }, dashboardContext?: DashboardContext, dashboardFilters?: {
        dateRange?: DateRangeValue;
        customFilters?: Record<string, unknown>;
    }): Promise<WidgetDataResponse>;
    /**
     * Build query parameters from widget config and request
     */
    private buildQueryParams;
    /**
     * Check if query can use shared cache
     */
    private isQueryShareable;
    /**
     * Apply user-specific filter to data
     */
    private applyUserFilter;
    /**
     * Execute the actual query
     */
    private executeQuery;
    /**
     * Execute predefined query
     */
    private executePredefinedQuery;
    /**
     * Execute custom query
     */
    private executeCustomQuery;
    /**
     * Execute integration query
     */
    private executeIntegrationQuery;
    /**
     * Execute Google Workspace widget query
     */
    private executeGoogleWorkspaceQuery;
    /**
     * Resolve date filter to actual date range
     */
    private resolveDateFilter;
    /**
     * Resolve date range value to actual dates
     */
    private resolveDateRange;
    /**
     * Get date range from preset
     */
    private getDateRangeFromPreset;
    /**
     * Get fiscal year range
     */
    private getFiscalYearRange;
    /**
     * Get fiscal quarter range
     */
    private getFiscalQuarterRange;
    /**
     * Invalidate widget data cache when shards change
     */
    invalidateOnShardChange(tenantId: string, shardTypeId?: string): Promise<void>;
    /**
     * Refresh widget data (force cache invalidation + refetch)
     */
    refreshWidgetData(widget: Widget, request: WidgetDataRequest, context: {
        tenantId: string;
        userId: string;
        userRoles: string[];
        userGroups: string[];
        fiscalYearConfig?: TenantFiscalYearConfig;
    }): Promise<WidgetDataResponse>;
}
//# sourceMappingURL=widget-data.service.d.ts.map
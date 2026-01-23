/**
 * Widget Data Service
 * Handles widget data queries with hybrid caching strategy
 * - Caches base query results (shared)
 * - Filters per-user at runtime for permissions
 */
import { adapterRegistry } from '../integrations/index.js';
import { PredefinedQuery, } from '../types/widget.types.js';
import { DEFAULT_FISCAL_YEAR_START, } from '../types/dashboard.types.js';
/**
 * Widget Data Service
 * Executes widget queries with caching and permission filtering
 */
export class WidgetDataService {
    repository;
    monitoring;
    cacheService;
    connectionService;
    tenantIntegrationRepo;
    constructor(repository, monitoring, cacheService, connectionService, tenantIntegrationRepo) {
        this.repository = repository;
        this.monitoring = monitoring;
        this.cacheService = cacheService;
        this.connectionService = connectionService;
        this.tenantIntegrationRepo = tenantIntegrationRepo;
    }
    /**
     * Set cache service (for late initialization)
     */
    setCacheService(cacheService) {
        this.cacheService = cacheService;
    }
    /**
     * Get widget data with hybrid caching strategy
     */
    async getWidgetData(widget, request, context, dashboardContext, dashboardFilters) {
        const startTime = Date.now();
        try {
            // Build query parameters including context and filters
            const queryParams = this.buildQueryParams(widget, request, context, dashboardContext, dashboardFilters);
            // Determine if this query can use shared cache
            const isSharedCacheable = this.isQueryShareable(widget, context);
            // Try cache first
            if (this.cacheService) {
                const cached = await this.cacheService.getCachedWidgetData(context.tenantId, widget.id, isSharedCacheable ? 'shared' : context.userId, queryParams);
                if (cached) {
                    // If using shared cache, apply user-specific filtering
                    if (isSharedCacheable && widget.structuredData.permissions.dataFiltering.applyUserFilter) {
                        cached.data = await this.applyUserFilter(cached.data, context);
                    }
                    return cached;
                }
            }
            // Execute the query
            const data = await this.executeQuery(widget, queryParams, context);
            // Build response
            const response = {
                widgetId: widget.id,
                data: data.results,
                metadata: {
                    totalCount: data.totalCount,
                    hasMore: data.hasMore,
                    lastRefreshedAt: new Date(),
                    cacheHit: false,
                },
            };
            // Cache the base result (before user filtering for shared cache)
            if (this.cacheService) {
                const cacheData = isSharedCacheable ? response : response;
                await this.cacheService.cacheWidgetData(context.tenantId, widget.id, context.userId, queryParams, cacheData, isSharedCacheable);
            }
            // Apply user filter if using shared cache
            if (isSharedCacheable && widget.structuredData.permissions.dataFiltering.applyUserFilter) {
                response.data = await this.applyUserFilter(response.data, context);
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackEvent('widgetData.query', {
                widgetId: widget.id,
                tenantId: context.tenantId,
                duration,
                cacheHit: false,
                isShared: isSharedCacheable,
            });
            return response;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackException(error, {
                operation: 'widgetData.query',
                widgetId: widget.id,
                tenantId: context.tenantId,
                duration,
            });
            return {
                widgetId: widget.id,
                data: null,
                metadata: {
                    lastRefreshedAt: new Date(),
                    cacheHit: false,
                },
                error: {
                    code: 'QUERY_ERROR',
                    message: error.message,
                },
            };
        }
    }
    /**
     * Build query parameters from widget config and request
     */
    buildQueryParams(widget, request, context, dashboardContext, dashboardFilters) {
        const dataSource = widget.structuredData.dataSource;
        const params = {
            tenantId: context.tenantId,
            widgetType: widget.structuredData.widgetType,
        };
        // Apply predefined query settings
        if (dataSource.type === 'predefined' && dataSource.predefinedQuery) {
            params.predefinedQuery = dataSource.predefinedQuery;
        }
        // Apply custom query settings
        if (dataSource.type === 'custom' && dataSource.customQuery) {
            params.target = dataSource.customQuery.target;
            params.filters = [...(dataSource.customQuery.filters || [])];
            params.aggregation = dataSource.customQuery.aggregation;
            params.sort = dataSource.customQuery.sort;
            params.limit = dataSource.customQuery.limit;
        }
        // Apply dashboard context if enabled
        if (dataSource.customQuery?.applyDashboardContext && dashboardContext?.shardContext?.shardId) {
            params.filters.push({
                field: 'contextShardId',
                operator: 'eq',
                value: dashboardContext.shardContext.shardId,
            });
        }
        // Apply dashboard filters if enabled
        if (dataSource.customQuery?.applyDashboardFilters && dashboardFilters?.dateRange) {
            const dateRange = this.resolveDateFilter(dashboardFilters.dateRange, context.fiscalYearConfig);
            if (dateRange) {
                params.filters.push({
                    field: 'createdAt',
                    operator: 'gte',
                    value: dateRange.start.toISOString(),
                });
                params.filters.push({
                    field: 'createdAt',
                    operator: 'lte',
                    value: dateRange.end.toISOString(),
                });
            }
        }
        // Apply request-time filters from widgetFilters
        if (request.widgetFilters) {
            Object.entries(request.widgetFilters).forEach(([field, value]) => {
                params.filters.push({
                    field,
                    operator: 'eq',
                    value,
                });
            });
        }
        // Apply date range from request dashboardFilters
        if (request.dashboardFilters?.dateRange) {
            const dateRange = this.resolveDateFilter(request.dashboardFilters.dateRange, context.fiscalYearConfig);
            if (dateRange) {
                params.filters.push({
                    field: 'createdAt',
                    operator: 'gte',
                    value: dateRange.start.toISOString(),
                });
                params.filters.push({
                    field: 'createdAt',
                    operator: 'lte',
                    value: dateRange.end.toISOString(),
                });
            }
        }
        // Pagination - use defaults if not specified
        params.page = 1;
        params.pageSize = 20;
        return params;
    }
    /**
     * Check if query can use shared cache
     */
    isQueryShareable(widget, context) {
        const dataFiltering = widget.structuredData.permissions.dataFiltering;
        // If no user-specific filtering, can share
        if (!dataFiltering.applyUserFilter) {
            return true;
        }
        // If tenant filtering only, can share within tenant
        if (dataFiltering.applyTenantFilter && !dataFiltering.applyUserFilter) {
            return true;
        }
        return false;
    }
    /**
     * Apply user-specific filter to data
     */
    async applyUserFilter(data, context) {
        if (!Array.isArray(data)) {
            return data;
        }
        // Filter data based on user's permissions
        return data.filter((item) => {
            // Check if user has access via ACL
            const acl = item.acl;
            if (!acl) {
                return true;
            }
            // Check user ID match
            if (acl.some(entry => entry.userId === context.userId)) {
                return true;
            }
            // Check group match
            if (acl.some(entry => entry.groupId && context.userGroups.includes(entry.groupId))) {
                return true;
            }
            return false;
        });
    }
    /**
     * Execute the actual query
     */
    async executeQuery(widget, params, context) {
        const dataSource = widget.structuredData.dataSource;
        // Handle predefined queries
        if (dataSource.type === 'predefined' && dataSource.predefinedQuery) {
            return this.executePredefinedQuery(dataSource.predefinedQuery, params, context);
        }
        // Handle custom queries
        if (dataSource.type === 'custom' && dataSource.customQuery) {
            return this.executeCustomQuery(params, context);
        }
        // Handle integration queries
        if (dataSource.type === 'integration' && dataSource.integrationSource) {
            return this.executeIntegrationQuery(dataSource.integrationSource, params);
        }
        return { results: [], totalCount: 0, hasMore: false };
    }
    /**
     * Execute predefined query
     */
    async executePredefinedQuery(queryType, params, context) {
        const page = params.page || 1;
        const pageSize = params.pageSize || 20;
        switch (queryType) {
            case PredefinedQuery.RECENT_SHARDS:
                return this.repository.queryRecentShards(context.tenantId, page, pageSize);
            case PredefinedQuery.SHARD_COUNT_BY_TYPE:
                const typeCounts = await this.repository.queryShardCountByType(context.tenantId);
                return { results: typeCounts, totalCount: typeCounts.length, hasMore: false };
            case PredefinedQuery.SHARD_COUNT_BY_STATUS:
                const statusCounts = await this.repository.queryShardCountByStatus(context.tenantId);
                return { results: statusCounts, totalCount: statusCounts.length, hasMore: false };
            case PredefinedQuery.USER_ACTIVITY_TIMELINE:
                return this.repository.queryUserActivityTimeline(context.tenantId, context.userId, page, pageSize);
            case PredefinedQuery.TEAM_ACTIVITY_SUMMARY:
                const teamActivity = await this.repository.queryTeamActivitySummary(context.tenantId);
                return { results: teamActivity, totalCount: 1, hasMore: false };
            case PredefinedQuery.MY_TASKS:
                return this.repository.queryMyTasks(context.tenantId, context.userId, page, pageSize);
            case PredefinedQuery.UPCOMING_EVENTS:
                return this.repository.queryUpcomingEvents(context.tenantId, context.userId, page, pageSize);
            case PredefinedQuery.STORAGE_USAGE:
                const usage = await this.repository.queryStorageUsage(context.tenantId);
                return { results: usage, totalCount: 1, hasMore: false };
            case PredefinedQuery.ACTIVE_USERS:
                const activeUsers = await this.repository.queryActiveUsers(context.tenantId);
                return { results: activeUsers, totalCount: activeUsers.length, hasMore: false };
            default:
                return { results: [], totalCount: 0, hasMore: false };
        }
    }
    /**
     * Execute custom query
     */
    async executeCustomQuery(params, context) {
        const target = params.target;
        const filters = params.filters || [];
        const aggregationConfig = params.aggregation;
        // Convert AggregationConfig to repository format
        // Repository expects simple format: { type: string; field?: string; groupBy?: string }
        // AggregationConfig has: { groupBy?: string[]; metrics: AggregationMetric[] }
        let aggregation = undefined;
        if (aggregationConfig && aggregationConfig.metrics && aggregationConfig.metrics.length > 0) {
            const firstMetric = aggregationConfig.metrics[0];
            aggregation = {
                type: firstMetric.function || 'count',
                field: firstMetric.field,
                groupBy: aggregationConfig.groupBy && aggregationConfig.groupBy.length > 0
                    ? aggregationConfig.groupBy[0]
                    : undefined,
            };
        }
        const sort = params.sort;
        const limit = params.limit || 100;
        const page = params.page || 1;
        const pageSize = params.pageSize || 20;
        // Build query for repository
        return this.repository.executeCustomWidgetQuery({
            tenantId: context.tenantId,
            target,
            filters,
            aggregation,
            sort,
            limit,
            offset: (page - 1) * pageSize,
            pageSize,
        });
    }
    /**
     * Execute integration query
     */
    async executeIntegrationQuery(source, params) {
        this.monitoring.trackEvent('widgetData.integrationQuery', {
            integrationId: source.integrationId,
            endpoint: source.endpoint,
        });
        // Handle Google Workspace widget endpoints
        if (source.integrationId === 'google-workspace' && this.connectionService && this.tenantIntegrationRepo) {
            return this.executeGoogleWorkspaceQuery(source, params);
        }
        // For other integrations, return empty for now
        return { results: [], totalCount: 0, hasMore: false };
    }
    /**
     * Execute Google Workspace widget query
     */
    async executeGoogleWorkspaceQuery(source, params) {
        if (!this.connectionService || !this.tenantIntegrationRepo) {
            return { results: [], totalCount: 0, hasMore: false };
        }
        try {
            // Get tenant integration (we need tenantId from params or context)
            const tenantId = params.tenantId;
            if (!tenantId) {
                return { results: [], totalCount: 0, hasMore: false };
            }
            // Find tenant integration by integrationId
            // Note: This assumes we have a way to get the tenant integration
            // For now, we'll need to pass tenantIntegrationId in parameters
            const tenantIntegrationId = source.parameters.tenantIntegrationId;
            if (!tenantIntegrationId) {
                return { results: [], totalCount: 0, hasMore: false };
            }
            const tenantIntegration = await this.tenantIntegrationRepo.findById(tenantIntegrationId, tenantId);
            if (!tenantIntegration) {
                return { results: [], totalCount: 0, hasMore: false };
            }
            // Get connection for this integration
            // For tenant-scoped integrations, get the tenant connection
            const connection = await this.connectionService?.getConnection(tenantIntegration.id, tenantId);
            if (!connection) {
                return { results: [], totalCount: 0, hasMore: false };
            }
            // Get adapter instance
            const adapterFactory = adapterRegistry.get(source.integrationId);
            if (!adapterFactory) {
                return { results: [], totalCount: 0, hasMore: false };
            }
            const adapter = adapterFactory.create(this.monitoring, this.connectionService, tenantId, connection.id);
            // Route to appropriate entity based on endpoint
            const endpoint = source.endpoint.toLowerCase();
            let entity;
            let filters = {};
            if (endpoint.includes('gmail') && endpoint.includes('inbox')) {
                entity = 'gmail_message';
                filters = { query: 'is:unread' };
            }
            else if (endpoint.includes('calendar') && endpoint.includes('upcoming')) {
                entity = 'calendar_event';
                const days = source.parameters.days || 7;
                const timeMin = new Date();
                const timeMax = new Date();
                timeMax.setDate(timeMax.getDate() + days);
                filters = {
                    calendarId: 'primary',
                    timeMin: timeMin.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: true,
                };
            }
            else if (endpoint.includes('drive') && endpoint.includes('recent')) {
                entity = 'drive_file';
                filters = { q: 'trashed=false' };
            }
            else if (endpoint.includes('contacts') && endpoint.includes('stats')) {
                entity = 'contact';
            }
            else if (endpoint.includes('tasks') && endpoint.includes('summary')) {
                entity = 'task';
                filters = {
                    tasklist: source.parameters.tasklistId || '@default',
                    showCompleted: false,
                };
            }
            else {
                return { results: [], totalCount: 0, hasMore: false };
            }
            const limit = source.parameters.limit || params.limit || 10;
            const result = await adapter.fetch({
                entity,
                filters,
                limit,
                orderBy: entity === 'drive_file' ? 'modifiedTime' : undefined,
                orderDirection: entity === 'drive_file' ? 'desc' : undefined,
            });
            return {
                results: result.records,
                totalCount: result.total || result.records.length,
                hasMore: result.hasMore || false,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'widgetData.googleWorkspaceQuery',
                integrationId: source.integrationId,
                endpoint: source.endpoint,
            });
            return { results: [], totalCount: 0, hasMore: false };
        }
    }
    /**
     * Resolve date filter to actual date range
     */
    resolveDateFilter(filter, fiscalConfig) {
        if (filter.preset) {
            return this.getDateRangeFromPreset(filter.preset, fiscalConfig);
        }
        if (filter.startDate && filter.endDate) {
            return {
                start: new Date(filter.startDate),
                end: new Date(filter.endDate),
            };
        }
        return null;
    }
    /**
     * Resolve date range value to actual dates
     */
    resolveDateRange(dateRange, fiscalConfig) {
        if (dateRange.preset) {
            return this.getDateRangeFromPreset(dateRange.preset, fiscalConfig);
        }
        if (dateRange.startDate && dateRange.endDate) {
            return {
                start: new Date(dateRange.startDate),
                end: new Date(dateRange.endDate),
            };
        }
        return null;
    }
    /**
     * Get date range from preset
     */
    getDateRangeFromPreset(preset, fiscalConfig) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const fiscalStart = fiscalConfig?.fiscalYearStart || DEFAULT_FISCAL_YEAR_START;
        switch (preset) {
            case 'today':
                return {
                    start: today,
                    end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
                };
            case 'yesterday':
                const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                return {
                    start: yesterday,
                    end: new Date(today.getTime() - 1),
                };
            case 'last_7_days':
                return {
                    start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
                    end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
                };
            case 'last_30_days':
                return {
                    start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
                    end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
                };
            case 'this_week':
                const dayOfWeek = today.getDay();
                const weekStart = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
                return {
                    start: weekStart,
                    end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1),
                };
            case 'this_month':
                return {
                    start: new Date(now.getFullYear(), now.getMonth(), 1),
                    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
                };
            case 'this_quarter':
                const quarterStart = Math.floor(now.getMonth() / 3) * 3;
                return {
                    start: new Date(now.getFullYear(), quarterStart, 1),
                    end: new Date(now.getFullYear(), quarterStart + 3, 0, 23, 59, 59, 999),
                };
            case 'this_year':
                return {
                    start: new Date(now.getFullYear(), 0, 1),
                    end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
                };
            case 'this_fiscal_year':
                return this.getFiscalYearRange(now, fiscalStart, 0);
            case 'last_fiscal_year':
                return this.getFiscalYearRange(now, fiscalStart, -1);
            case 'this_fiscal_quarter':
                return this.getFiscalQuarterRange(now, fiscalStart, 0);
            case 'last_fiscal_quarter':
                return this.getFiscalQuarterRange(now, fiscalStart, -1);
            default:
                // Default to last 30 days
                return {
                    start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
                    end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
                };
        }
    }
    /**
     * Get fiscal year range
     */
    getFiscalYearRange(now, fiscalStart, offset) {
        const fyStartMonth = fiscalStart.month - 1; // 0-indexed
        const fyStartDay = fiscalStart.day;
        let fyStartYear = now.getFullYear();
        const fyStartDate = new Date(fyStartYear, fyStartMonth, fyStartDay);
        // If we're before the fiscal year start, go back one year
        if (now < fyStartDate) {
            fyStartYear--;
        }
        // Apply offset
        fyStartYear += offset;
        const start = new Date(fyStartYear, fyStartMonth, fyStartDay);
        const end = new Date(fyStartYear + 1, fyStartMonth, fyStartDay - 1, 23, 59, 59, 999);
        return { start, end };
    }
    /**
     * Get fiscal quarter range
     */
    getFiscalQuarterRange(now, fiscalStart, offset) {
        const fyRange = this.getFiscalYearRange(now, fiscalStart, 0);
        const fyStartDate = fyRange.start;
        // Calculate which fiscal quarter we're in
        const monthsSinceFyStart = (now.getMonth() - fyStartDate.getMonth() + 12) % 12;
        const currentFQ = Math.floor(monthsSinceFyStart / 3);
        // Apply offset
        let targetFQ = currentFQ + offset;
        let targetYear = fyStartDate.getFullYear();
        while (targetFQ < 0) {
            targetFQ += 4;
            targetYear--;
        }
        while (targetFQ >= 4) {
            targetFQ -= 4;
            targetYear++;
        }
        // Calculate quarter start and end
        const quarterStartMonth = (fyStartDate.getMonth() + targetFQ * 3) % 12;
        const start = new Date(targetYear, quarterStartMonth, fiscalStart.day);
        const end = new Date(quarterStartMonth + 3 >= 12 ? targetYear + 1 : targetYear, (quarterStartMonth + 3) % 12, fiscalStart.day - 1, 23, 59, 59, 999);
        return { start, end };
    }
    /**
     * Invalidate widget data cache when shards change
     */
    async invalidateOnShardChange(tenantId, shardTypeId) {
        if (this.cacheService) {
            await this.cacheService.invalidateWidgetDataForTenant(tenantId);
            this.monitoring.trackEvent('widgetData.invalidated', {
                tenantId,
                shardTypeId,
                reason: 'shard_change',
            });
        }
    }
    /**
     * Refresh widget data (force cache invalidation + refetch)
     */
    async refreshWidgetData(widget, request, context) {
        // Invalidate cache for this widget
        if (this.cacheService) {
            await this.cacheService.invalidateWidget(context.tenantId, widget.id);
        }
        // Fetch fresh data
        return this.getWidgetData(widget, request, context);
    }
}
//# sourceMappingURL=widget-data.service.js.map
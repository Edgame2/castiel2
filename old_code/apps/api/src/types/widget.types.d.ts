/**
 * Widget Types
 * Types for dashboard widgets and their configurations
 */
import type { GridPosition, GridSize, DateRangeValue } from './dashboard.types.js';
/**
 * Widget types
 */
export declare enum WidgetType {
    COUNTER = "counter",
    CHART = "chart",
    TABLE = "table",
    LIST = "list",
    GAUGE = "gauge",
    RECENT_SHARDS = "recent_shards",
    SHARD_ACTIVITY = "shard_activity",
    SHARD_STATS = "shard_stats",
    SHARD_KANBAN = "shard_kanban",
    TEAM_ACTIVITY = "team_activity",
    USER_STATS = "user_stats",
    MY_TASKS = "my_tasks",
    NOTIFICATIONS = "notifications",
    EXTERNAL_DATA = "external_data",
    EMBED = "embed",
    WEBHOOK_STATUS = "webhook_status",
    GMAIL_INBOX = "gmail_inbox",
    CALENDAR_EVENTS = "calendar_events",
    DRIVE_FILES = "drive_files",
    CONTACTS_STATS = "contacts_stats",
    TASKS_SUMMARY = "tasks_summary",
    CUSTOM_QUERY = "custom_query",
    MARKDOWN = "markdown",
    QUICK_LINKS = "quick_links"
}
/**
 * Chart types
 */
export declare enum ChartType {
    LINE = "line",
    BAR = "bar",
    AREA = "area",
    PIE = "pie",
    DONUT = "donut",
    SCATTER = "scatter",
    RADAR = "radar",
    FUNNEL = "funnel"
}
/**
 * Widget state
 */
export declare enum WidgetState {
    LOADING = "loading",
    LOADED = "loaded",
    REFRESHING = "refreshing",
    ERROR = "error",
    EMPTY = "empty",
    CONFIGURING = "configuring",
    PLACEHOLDER = "placeholder"
}
/**
 * Predefined queries
 */
export declare enum PredefinedQuery {
    RECENT_SHARDS = "recent_shards",
    SHARD_COUNT = "shard_count",
    SHARD_COUNT_BY_TYPE = "shard_count_by_type",
    SHARD_COUNT_BY_STATUS = "shard_count_by_status",
    SHARD_COUNT_OVER_TIME = "shard_count_over_time",
    SHARD_ACTIVITY = "shard_activity",
    USER_ACTIVITY_TIMELINE = "user_activity_timeline",
    TEAM_ACTIVITY_SUMMARY = "team_activity_summary",
    MY_TASKS = "my_tasks",
    UPCOMING_EVENTS = "upcoming_events",
    RECENT_SEARCHES = "recent_searches",
    STORAGE_USAGE = "storage_usage",
    API_USAGE = "api_usage",
    ACTIVE_USERS = "active_users"
}
/**
 * Query filter for custom queries
 */
export interface QueryFilter {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'in' | 'notIn';
    value: unknown;
    userConfigurable?: boolean;
}
/**
 * Sort configuration
 */
export interface SortConfig {
    field: string;
    order: 'asc' | 'desc';
}
/**
 * Aggregation metric
 */
export interface AggregationMetric {
    field: string;
    function: 'count' | 'sum' | 'avg' | 'min' | 'max';
    alias: string;
}
/**
 * Aggregation configuration
 */
export interface AggregationConfig {
    groupBy?: string[];
    metrics: AggregationMetric[];
}
/**
 * Custom query configuration
 */
export interface CustomQueryConfig {
    target: string;
    filters: QueryFilter[];
    aggregation?: AggregationConfig;
    sort?: SortConfig[];
    limit?: number;
    applyDashboardContext?: boolean;
    applyDashboardFilters?: boolean;
}
/**
 * Integration source configuration
 */
export interface IntegrationSourceConfig {
    integrationId: string;
    endpoint: string;
    parameters: Record<string, unknown>;
}
/**
 * Widget data source
 */
export interface WidgetDataSource {
    type: 'predefined' | 'custom' | 'integration';
    predefinedQuery?: PredefinedQuery;
    predefinedParams?: Record<string, unknown>;
    customQuery?: CustomQueryConfig;
    integrationSource?: IntegrationSourceConfig;
    useContext: boolean;
    contextMapping?: Record<string, string>;
    useDateFilter: boolean;
    dateFilterField?: string;
    allowUserFilters: boolean;
    defaultFilters?: QueryFilter[];
}
/**
 * Widget visibility configuration
 */
export interface WidgetVisibility {
    roles: string[];
    userIds?: string[];
    groupIds?: string[];
    excludeUserIds?: string[];
}
/**
 * Widget data filtering
 */
export interface WidgetDataFiltering {
    applyTenantFilter: boolean;
    applyUserFilter: boolean;
    permissionField?: string;
}
/**
 * Widget actions configuration
 */
export interface WidgetActions {
    canRefresh: boolean;
    canExport: boolean;
    canDrillDown: boolean;
    canConfigure: boolean;
}
/**
 * Widget permissions
 */
export interface WidgetPermissions {
    visibility: WidgetVisibility;
    dataFiltering: WidgetDataFiltering;
    actions: WidgetActions;
}
/**
 * Counter widget configuration
 */
export interface CounterWidgetConfig {
    label: string;
    icon?: string;
    color?: string;
    format: 'number' | 'currency' | 'percentage' | 'duration';
    precision?: number;
    prefix?: string;
    suffix?: string;
    comparison?: {
        enabled: boolean;
        period: 'previous_day' | 'previous_week' | 'previous_month' | 'previous_year';
        showPercentage: boolean;
        showAbsolute: boolean;
        positiveColor: string;
        negativeColor: string;
    };
    thresholds?: {
        warning: number;
        critical: number;
        warningColor: string;
        criticalColor: string;
    };
    onClick?: {
        action: 'navigate' | 'filter' | 'modal';
        target: string;
    };
}
/**
 * Chart axis configuration
 */
export interface ChartAxisConfig {
    field: string;
    label?: string;
    type?: 'category' | 'time' | 'value';
    format?: string;
    min?: number;
    max?: number;
}
/**
 * Chart series configuration
 */
export interface ChartSeriesConfig {
    field: string;
    label?: string;
    color?: string;
    type?: ChartType;
}
/**
 * Chart widget configuration
 */
export interface ChartWidgetConfig {
    chartType: ChartType;
    xAxis?: ChartAxisConfig;
    yAxis?: ChartAxisConfig;
    series?: ChartSeriesConfig[];
    colors?: string[];
    showLegend: boolean;
    legendPosition: 'top' | 'bottom' | 'left' | 'right';
    showGrid: boolean;
    showTooltip: boolean;
    animate: boolean;
    enableZoom?: boolean;
    enableBrush?: boolean;
    innerRadius?: number;
    showLabels?: boolean;
    labelType?: 'name' | 'value' | 'percentage';
}
/**
 * Table column configuration
 */
export interface TableColumnConfig {
    field: string;
    header: string;
    width?: number | 'auto';
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    filterable?: boolean;
    format?: 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean' | 'badge' | 'link' | 'avatar';
    formatOptions?: Record<string, unknown>;
    conditionalFormat?: {
        condition: string;
        style: Record<string, string>;
    }[];
}
/**
 * Table row action
 */
export interface TableRowAction {
    icon: string;
    label: string;
    action: 'navigate' | 'modal' | 'api';
    target: string;
}
/**
 * Table summary field
 */
export interface TableSummaryField {
    field: string;
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
}
/**
 * Table widget configuration
 */
export interface TableWidgetConfig {
    columns: TableColumnConfig[];
    pageSize: number;
    pageSizeOptions: number[];
    showPagination: boolean;
    showSearch: boolean;
    showFilters: boolean;
    showExport: boolean;
    selectable: boolean;
    selectMode?: 'single' | 'multiple';
    rowActions?: TableRowAction[];
    onRowClick?: {
        action: 'navigate' | 'modal' | 'expand';
        target: string;
    };
    groupBy?: string;
    showSummary?: boolean;
    summaryFields?: TableSummaryField[];
}
/**
 * List item template
 */
export interface ListItemTemplate {
    title: string;
    subtitle?: string;
    description?: string;
    avatar?: string;
    badge?: string;
    timestamp?: string;
}
/**
 * List widget configuration
 */
export interface ListWidgetConfig {
    itemTemplate: ListItemTemplate;
    style: 'simple' | 'card' | 'timeline';
    showDividers: boolean;
    maxItems: number;
    emptyMessage: string;
    emptyIcon?: string;
    onItemClick?: {
        action: 'navigate' | 'modal';
        target: string;
    };
    showLoadMore: boolean;
}
/**
 * Gauge threshold
 */
export interface GaugeThreshold {
    value: number;
    color: string;
    label?: string;
}
/**
 * Gauge widget configuration
 */
export interface GaugeWidgetConfig {
    minValue: number;
    maxValue: number;
    gaugeType: 'radial' | 'linear' | 'semicircle';
    showValue: boolean;
    showMinMax: boolean;
    format: 'number' | 'percentage';
    thresholds: GaugeThreshold[];
    label?: string;
    unit?: string;
}
/**
 * Recent shards widget configuration
 */
export interface RecentShardsWidgetConfig {
    shardTypeIds?: string[];
    status?: string[];
    sortBy: 'createdAt' | 'updatedAt' | 'lastActivityAt';
    maxItems: number;
    showShardType: boolean;
    showTimestamp: boolean;
    showCreator: boolean;
    displayFields: string[];
    groupByType: boolean;
    groupByDate: boolean;
}
/**
 * Shard activity types
 */
export type ShardActivityType = 'created' | 'updated' | 'deleted' | 'restored' | 'relationship_added' | 'relationship_removed';
/**
 * Shard activity widget configuration
 */
export interface ShardActivityWidgetConfig {
    shardTypeIds?: string[];
    activityTypes: ShardActivityType[];
    dateRange: 'today' | 'week' | 'month' | 'custom';
    customDateRange?: {
        start: Date;
        end: Date;
    };
    style: 'timeline' | 'list' | 'grouped';
    maxItems: number;
    showActor: boolean;
    showShardPreview: boolean;
}
/**
 * Shard stats widget configuration
 */
export interface ShardStatsWidgetConfig {
    groupBy: 'shardType' | 'status' | 'category' | 'custom';
    customGroupField?: string;
    metrics: ('count' | 'created_today' | 'created_this_week' | 'updated_today' | 'updated_this_week')[];
    displayType: 'cards' | 'bars' | 'pie';
    showTrend: boolean;
    trendPeriod?: 'day' | 'week' | 'month';
}
/**
 * Kanban column configuration
 */
export interface KanbanColumn {
    value: string;
    label: string;
    color?: string;
    limit?: number;
}
/**
 * Shard kanban widget configuration
 */
export interface ShardKanbanWidgetConfig {
    shardTypeId: string;
    columnField: string;
    columns: KanbanColumn[];
    cardFields: string[];
    showAvatar: boolean;
    showDueDate: boolean;
    allowDragDrop: boolean;
    allowQuickEdit: boolean;
}
/**
 * Quick link configuration
 */
export interface QuickLink {
    label: string;
    icon?: string;
    url: string;
    target?: '_self' | '_blank';
    color?: string;
}
/**
 * Quick links widget configuration
 */
export interface QuickLinksWidgetConfig {
    links: QuickLink[];
    style: 'list' | 'grid' | 'buttons';
    columns?: number;
    showDescriptions: boolean;
}
/**
 * Markdown widget configuration
 */
export interface MarkdownWidgetConfig {
    content: string;
    fontSize: 'small' | 'medium' | 'large';
    textAlign: 'left' | 'center' | 'right';
    enableScroll: boolean;
    maxHeight?: number;
}
/**
 * Embed widget configuration
 */
export interface EmbedWidgetConfig {
    url: string;
    sandbox: string[];
    border: boolean;
    borderRadius: number;
    aspectRatio?: string;
}
/**
 * Union of all widget configurations
 */
export type WidgetConfig = CounterWidgetConfig | ChartWidgetConfig | TableWidgetConfig | ListWidgetConfig | GaugeWidgetConfig | RecentShardsWidgetConfig | ShardActivityWidgetConfig | ShardStatsWidgetConfig | ShardKanbanWidgetConfig | QuickLinksWidgetConfig | MarkdownWidgetConfig | EmbedWidgetConfig;
/**
 * Widget structured data (stored in Shard)
 */
export interface WidgetStructuredData {
    name: string;
    description?: string;
    icon?: string;
    widgetType: WidgetType;
    config: WidgetConfig;
    dataSource: WidgetDataSource;
    position: GridPosition;
    size: GridSize;
    minSize?: GridSize;
    maxSize?: GridSize;
    refreshInterval: number;
    permissions: WidgetPermissions;
    isRequired: boolean;
    isPlaceholder: boolean;
}
/**
 * Widget (full entity with Shard fields)
 */
export interface Widget {
    id: string;
    tenantId: string;
    userId: string;
    shardTypeId: 'c_dashboardWidget';
    dashboardId: string;
    structuredData: WidgetStructuredData;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Create widget input
 */
export interface CreateWidgetInput {
    dashboardId: string;
    tenantId: string;
    userId: string;
    name: string;
    description?: string;
    icon?: string;
    widgetType: WidgetType;
    config: WidgetConfig;
    dataSource: WidgetDataSource;
    position: GridPosition;
    size: GridSize;
    refreshInterval?: number;
    permissions?: Partial<WidgetPermissions>;
}
/**
 * Update widget input
 */
export interface UpdateWidgetInput {
    name?: string;
    description?: string;
    icon?: string;
    config?: Partial<WidgetConfig>;
    dataSource?: Partial<WidgetDataSource>;
    position?: GridPosition;
    size?: GridSize;
    refreshInterval?: number;
    permissions?: Partial<WidgetPermissions>;
}
/**
 * Batch update positions input
 */
export interface BatchUpdatePositionsInput {
    positions: {
        widgetId: string;
        position: GridPosition;
        size?: GridSize;
    }[];
}
/**
 * Widget data request
 */
export interface WidgetDataRequest {
    widgetId: string;
    context?: {
        shardId?: string;
        shardTypeId?: string;
        customParams?: Record<string, unknown>;
    };
    dashboardFilters?: {
        dateRange?: DateRangeValue;
        customFilters?: Record<string, unknown>;
    };
    widgetFilters?: Record<string, unknown>;
    forceRefresh?: boolean;
}
/**
 * Widget data response
 */
export interface WidgetDataResponse {
    widgetId: string;
    data: unknown;
    metadata?: {
        totalCount?: number;
        hasMore?: boolean;
        lastRefreshedAt: Date;
        cacheHit?: boolean;
    };
    error?: {
        code: string;
        message: string;
    };
}
/**
 * Size constraints for a widget type
 */
export interface SizeConstraints {
    default: GridSize;
    min: GridSize;
    max: GridSize;
}
/**
 * Default size constraints by widget type
 */
export declare const WIDGET_SIZE_DEFAULTS: Record<WidgetType, SizeConstraints>;
/**
 * Default refresh intervals by widget type (in seconds)
 */
export declare const DEFAULT_REFRESH_INTERVALS: Record<WidgetType, number>;
//# sourceMappingURL=widget.types.d.ts.map
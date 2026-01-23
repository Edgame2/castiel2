/**
 * Widget Types
 * Types for dashboard widgets and their configurations
 */
// ============================================================================
// Enums
// ============================================================================
/**
 * Widget types
 */
export var WidgetType;
(function (WidgetType) {
    // Data widgets
    WidgetType["COUNTER"] = "counter";
    WidgetType["CHART"] = "chart";
    WidgetType["TABLE"] = "table";
    WidgetType["LIST"] = "list";
    WidgetType["GAUGE"] = "gauge";
    // Shard widgets
    WidgetType["RECENT_SHARDS"] = "recent_shards";
    WidgetType["SHARD_ACTIVITY"] = "shard_activity";
    WidgetType["SHARD_STATS"] = "shard_stats";
    WidgetType["SHARD_KANBAN"] = "shard_kanban";
    // User widgets
    WidgetType["TEAM_ACTIVITY"] = "team_activity";
    WidgetType["USER_STATS"] = "user_stats";
    WidgetType["MY_TASKS"] = "my_tasks";
    WidgetType["NOTIFICATIONS"] = "notifications";
    // Integration widgets
    WidgetType["EXTERNAL_DATA"] = "external_data";
    WidgetType["EMBED"] = "embed";
    WidgetType["WEBHOOK_STATUS"] = "webhook_status";
    // Google Workspace widgets
    WidgetType["GMAIL_INBOX"] = "gmail_inbox";
    WidgetType["CALENDAR_EVENTS"] = "calendar_events";
    WidgetType["DRIVE_FILES"] = "drive_files";
    WidgetType["CONTACTS_STATS"] = "contacts_stats";
    WidgetType["TASKS_SUMMARY"] = "tasks_summary";
    // Custom widgets
    WidgetType["CUSTOM_QUERY"] = "custom_query";
    WidgetType["MARKDOWN"] = "markdown";
    WidgetType["QUICK_LINKS"] = "quick_links";
})(WidgetType || (WidgetType = {}));
/**
 * Chart types
 */
export var ChartType;
(function (ChartType) {
    ChartType["LINE"] = "line";
    ChartType["BAR"] = "bar";
    ChartType["AREA"] = "area";
    ChartType["PIE"] = "pie";
    ChartType["DONUT"] = "donut";
    ChartType["SCATTER"] = "scatter";
    ChartType["RADAR"] = "radar";
    ChartType["FUNNEL"] = "funnel";
})(ChartType || (ChartType = {}));
/**
 * Widget state
 */
export var WidgetState;
(function (WidgetState) {
    WidgetState["LOADING"] = "loading";
    WidgetState["LOADED"] = "loaded";
    WidgetState["REFRESHING"] = "refreshing";
    WidgetState["ERROR"] = "error";
    WidgetState["EMPTY"] = "empty";
    WidgetState["CONFIGURING"] = "configuring";
    WidgetState["PLACEHOLDER"] = "placeholder";
})(WidgetState || (WidgetState = {}));
/**
 * Predefined queries
 */
export var PredefinedQuery;
(function (PredefinedQuery) {
    PredefinedQuery["RECENT_SHARDS"] = "recent_shards";
    PredefinedQuery["SHARD_COUNT"] = "shard_count";
    PredefinedQuery["SHARD_COUNT_BY_TYPE"] = "shard_count_by_type";
    PredefinedQuery["SHARD_COUNT_BY_STATUS"] = "shard_count_by_status";
    PredefinedQuery["SHARD_COUNT_OVER_TIME"] = "shard_count_over_time";
    PredefinedQuery["SHARD_ACTIVITY"] = "shard_activity";
    PredefinedQuery["USER_ACTIVITY_TIMELINE"] = "user_activity_timeline";
    PredefinedQuery["TEAM_ACTIVITY_SUMMARY"] = "team_activity_summary";
    PredefinedQuery["MY_TASKS"] = "my_tasks";
    PredefinedQuery["UPCOMING_EVENTS"] = "upcoming_events";
    PredefinedQuery["RECENT_SEARCHES"] = "recent_searches";
    PredefinedQuery["STORAGE_USAGE"] = "storage_usage";
    PredefinedQuery["API_USAGE"] = "api_usage";
    PredefinedQuery["ACTIVE_USERS"] = "active_users";
})(PredefinedQuery || (PredefinedQuery = {}));
/**
 * Default size constraints by widget type
 */
export const WIDGET_SIZE_DEFAULTS = {
    [WidgetType.COUNTER]: {
        default: { width: 3, height: 2 },
        min: { width: 2, height: 1 },
        max: { width: 6, height: 3 },
    },
    [WidgetType.CHART]: {
        default: { width: 6, height: 4 },
        min: { width: 4, height: 3 },
        max: { width: 12, height: 8 },
    },
    [WidgetType.TABLE]: {
        default: { width: 8, height: 5 },
        min: { width: 6, height: 3 },
        max: { width: 12, height: 10 },
    },
    [WidgetType.LIST]: {
        default: { width: 4, height: 4 },
        min: { width: 3, height: 2 },
        max: { width: 6, height: 8 },
    },
    [WidgetType.GAUGE]: {
        default: { width: 3, height: 3 },
        min: { width: 2, height: 2 },
        max: { width: 4, height: 4 },
    },
    [WidgetType.RECENT_SHARDS]: {
        default: { width: 4, height: 5 },
        min: { width: 3, height: 3 },
        max: { width: 6, height: 8 },
    },
    [WidgetType.SHARD_ACTIVITY]: {
        default: { width: 6, height: 5 },
        min: { width: 4, height: 3 },
        max: { width: 8, height: 8 },
    },
    [WidgetType.SHARD_STATS]: {
        default: { width: 6, height: 4 },
        min: { width: 4, height: 3 },
        max: { width: 12, height: 6 },
    },
    [WidgetType.SHARD_KANBAN]: {
        default: { width: 12, height: 6 },
        min: { width: 8, height: 4 },
        max: { width: 12, height: 10 },
    },
    [WidgetType.TEAM_ACTIVITY]: {
        default: { width: 4, height: 5 },
        min: { width: 3, height: 3 },
        max: { width: 6, height: 8 },
    },
    [WidgetType.USER_STATS]: {
        default: { width: 6, height: 3 },
        min: { width: 4, height: 2 },
        max: { width: 8, height: 5 },
    },
    [WidgetType.MY_TASKS]: {
        default: { width: 4, height: 5 },
        min: { width: 3, height: 3 },
        max: { width: 6, height: 8 },
    },
    [WidgetType.NOTIFICATIONS]: {
        default: { width: 4, height: 4 },
        min: { width: 3, height: 3 },
        max: { width: 6, height: 6 },
    },
    [WidgetType.EXTERNAL_DATA]: {
        default: { width: 6, height: 4 },
        min: { width: 4, height: 3 },
        max: { width: 12, height: 8 },
    },
    [WidgetType.EMBED]: {
        default: { width: 6, height: 4 },
        min: { width: 4, height: 3 },
        max: { width: 12, height: 10 },
    },
    [WidgetType.WEBHOOK_STATUS]: {
        default: { width: 4, height: 3 },
        min: { width: 3, height: 2 },
        max: { width: 6, height: 5 },
    },
    [WidgetType.CUSTOM_QUERY]: {
        default: { width: 6, height: 4 },
        min: { width: 4, height: 3 },
        max: { width: 12, height: 8 },
    },
    [WidgetType.MARKDOWN]: {
        default: { width: 4, height: 3 },
        min: { width: 2, height: 2 },
        max: { width: 12, height: 10 },
    },
    [WidgetType.QUICK_LINKS]: {
        default: { width: 3, height: 3 },
        min: { width: 2, height: 2 },
        max: { width: 6, height: 6 },
    },
    [WidgetType.GMAIL_INBOX]: {
        default: { width: 6, height: 5 },
        min: { width: 4, height: 3 },
        max: { width: 12, height: 10 },
    },
    [WidgetType.CALENDAR_EVENTS]: {
        default: { width: 6, height: 5 },
        min: { width: 4, height: 3 },
        max: { width: 12, height: 10 },
    },
    [WidgetType.DRIVE_FILES]: {
        default: { width: 6, height: 5 },
        min: { width: 4, height: 3 },
        max: { width: 12, height: 10 },
    },
    [WidgetType.CONTACTS_STATS]: {
        default: { width: 4, height: 3 },
        min: { width: 2, height: 2 },
        max: { width: 8, height: 6 },
    },
    [WidgetType.TASKS_SUMMARY]: {
        default: { width: 6, height: 4 },
        min: { width: 4, height: 3 },
        max: { width: 12, height: 8 },
    },
};
/**
 * Default refresh intervals by widget type (in seconds)
 */
export const DEFAULT_REFRESH_INTERVALS = {
    [WidgetType.COUNTER]: 30,
    [WidgetType.CHART]: 60,
    [WidgetType.TABLE]: 60,
    [WidgetType.LIST]: 30,
    [WidgetType.GAUGE]: 30,
    [WidgetType.RECENT_SHARDS]: 30,
    [WidgetType.SHARD_ACTIVITY]: 15,
    [WidgetType.SHARD_STATS]: 60,
    [WidgetType.SHARD_KANBAN]: 30,
    [WidgetType.TEAM_ACTIVITY]: 30,
    [WidgetType.USER_STATS]: 60,
    [WidgetType.MY_TASKS]: 30,
    [WidgetType.NOTIFICATIONS]: 10,
    [WidgetType.EXTERNAL_DATA]: 300,
    [WidgetType.EMBED]: 0,
    [WidgetType.WEBHOOK_STATUS]: 60,
    [WidgetType.CUSTOM_QUERY]: 60,
    [WidgetType.MARKDOWN]: 0,
    [WidgetType.QUICK_LINKS]: 0,
    [WidgetType.GMAIL_INBOX]: 60,
    [WidgetType.CALENDAR_EVENTS]: 300,
    [WidgetType.DRIVE_FILES]: 120,
    [WidgetType.CONTACTS_STATS]: 300,
    [WidgetType.TASKS_SUMMARY]: 60,
};
//# sourceMappingURL=widget.types.js.map
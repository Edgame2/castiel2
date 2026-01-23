/**
 * Widget types shared across services
 */

/**
 * Widget size for grid layouts
 */
export interface GridSize {
  width: number;  // Columns (1-12)
  height: number; // Rows (1-N)
}

/**
 * Supported widget types
 */
export enum WidgetType {
  // Data widgets
  COUNTER = 'counter',
  CHART = 'chart',
  TABLE = 'table',
  LIST = 'list',
  GAUGE = 'gauge',

  // Shard widgets
  RECENT_SHARDS = 'recent_shards',
  SHARD_ACTIVITY = 'shard_activity',
  SHARD_STATS = 'shard_stats',
  SHARD_KANBAN = 'shard_kanban',

  // User widgets
  TEAM_ACTIVITY = 'team_activity',
  USER_STATS = 'user_stats',
  MY_TASKS = 'my_tasks',
  NOTIFICATIONS = 'notifications',

  // Integration widgets
  EXTERNAL_DATA = 'external_data',
  EMBED = 'embed',
  WEBHOOK_STATUS = 'webhook_status',
  INTEGRATION_STATUS = 'integration_status',
  INTEGRATION_ACTIVITY = 'integration_activity',
  INTEGRATION_SEARCH = 'integration_search',

  // Custom widgets
  CUSTOM_QUERY = 'custom_query',
  MARKDOWN = 'markdown',
  QUICK_LINKS = 'quick_links',
}

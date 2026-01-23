# 🧩 Widget Library

> Complete reference for all dashboard widget types, their configurations, and usage.

---

## Table of Contents

1. [Widget Architecture](#widget-architecture)
2. [Data Widgets](#data-widgets)
3. [Shard Widgets](#shard-widgets)
4. [User Widgets](#user-widgets)
5. [Integration Widgets](#integration-widgets)
6. [Custom Widgets](#custom-widgets)
7. [Common Configuration](#common-configuration)

---

## Widget Architecture

### Base Widget Interface

```typescript
interface BaseWidget {
  // Identity
  id: string;
  type: WidgetType;
  
  // Display
  name: string;
  description?: string;
  icon?: string;
  
  // Layout
  position: { x: number; y: number };
  size: { width: number; height: number };
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
  
  // Data
  dataSource: WidgetDataSource;
  
  // Behavior
  refreshInterval: number;  // seconds
  
  // Permissions
  permissions: WidgetPermissions;
  
  // Type-specific config
  config: WidgetConfig;
}
```

### Widget Lifecycle

```
1. INITIALIZE
   └─ Load widget configuration
   
2. FETCH DATA
   ├─ Check user permissions
   ├─ Apply tenant isolation
   ├─ Execute query/fetch
   └─ Transform response
   
3. RENDER
   ├─ Apply visualization config
   └─ Display in grid cell
   
4. REFRESH (interval or manual)
   └─ Re-fetch and re-render
   
5. INTERACT
   ├─ Filter changes
   ├─ Drill-down
   └─ Export
```

---

## Data Widgets

### Counter Widget

Single metric display with optional comparison.

```typescript
interface CounterWidgetConfig {
  type: 'counter';
  
  // Display
  label: string;
  icon?: string;
  color?: string;
  
  // Value formatting
  format: 'number' | 'currency' | 'percentage' | 'duration';
  precision?: number;
  prefix?: string;
  suffix?: string;
  
  // Comparison (optional)
  comparison?: {
    enabled: boolean;
    period: 'previous_day' | 'previous_week' | 'previous_month' | 'previous_year';
    showPercentage: boolean;
    showAbsolute: boolean;
    positiveColor: string;
    negativeColor: string;
  };
  
  // Thresholds (optional)
  thresholds?: {
    warning: number;
    critical: number;
    warningColor: string;
    criticalColor: string;
  };
  
  // Link (optional)
  onClick?: {
    action: 'navigate' | 'filter' | 'modal';
    target: string;
  };
}
```

**Size:** 2-6 columns × 1-3 rows  
**Default:** 3 columns × 2 rows

**Example:**
```json
{
  "type": "counter",
  "name": "Total Contacts",
  "config": {
    "label": "Contacts",
    "icon": "users",
    "color": "#3B82F6",
    "format": "number",
    "comparison": {
      "enabled": true,
      "period": "previous_month",
      "showPercentage": true
    }
  },
  "dataSource": {
    "type": "predefined",
    "predefinedQuery": "shard_count",
    "parameters": {
      "shardTypeId": "c_contact"
    }
  }
}
```

---

### Chart Widget

Various chart types for data visualization.

```typescript
interface ChartWidgetConfig {
  type: 'chart';
  
  // Chart type
  chartType: 'line' | 'bar' | 'area' | 'pie' | 'donut' | 
             'scatter' | 'radar' | 'funnel';
  
  // Data mapping
  xAxis?: {
    field: string;
    label?: string;
    type: 'category' | 'time' | 'value';
    format?: string;
  };
  
  yAxis?: {
    field: string;
    label?: string;
    format?: string;
    min?: number;
    max?: number;
  };
  
  // Series (for multi-series charts)
  series?: {
    field: string;
    label?: string;
    color?: string;
    type?: 'line' | 'bar' | 'area';
  }[];
  
  // Appearance
  colors?: string[];
  showLegend: boolean;
  legendPosition: 'top' | 'bottom' | 'left' | 'right';
  showGrid: boolean;
  showTooltip: boolean;
  animate: boolean;
  
  // Interactivity
  enableZoom: boolean;
  enableBrush: boolean;  // Select range
  
  // Pie/Donut specific
  innerRadius?: number;  // 0 for pie, >0 for donut
  showLabels?: boolean;
  labelType?: 'name' | 'value' | 'percentage';
}
```

**Size:** 4-12 columns × 3-8 rows  
**Default:** 6 columns × 4 rows

**Example - Line Chart:**
```json
{
  "type": "chart",
  "name": "Contacts Created Over Time",
  "config": {
    "chartType": "line",
    "xAxis": {
      "field": "date",
      "type": "time",
      "format": "MMM DD"
    },
    "yAxis": {
      "field": "count",
      "label": "Count"
    },
    "colors": ["#3B82F6"],
    "showLegend": false,
    "showGrid": true,
    "animate": true
  },
  "dataSource": {
    "type": "predefined",
    "predefinedQuery": "shard_count_over_time",
    "parameters": {
      "shardTypeId": "c_contact",
      "groupBy": "day",
      "period": "last_30_days"
    }
  }
}
```

---

### Table Widget

Tabular data display with sorting, filtering, and pagination.

```typescript
interface TableWidgetConfig {
  type: 'table';
  
  // Columns
  columns: {
    field: string;
    header: string;
    width?: number | 'auto';
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    filterable?: boolean;
    
    // Formatting
    format?: 'text' | 'number' | 'currency' | 'date' | 'datetime' | 
             'boolean' | 'badge' | 'link' | 'avatar';
    formatOptions?: Record<string, any>;
    
    // Conditional formatting
    conditionalFormat?: {
      condition: string;  // Expression
      style: Record<string, string>;
    }[];
  }[];
  
  // Behavior
  pageSize: number;
  pageSizeOptions: number[];
  showPagination: boolean;
  showSearch: boolean;
  showFilters: boolean;
  showExport: boolean;
  
  // Selection
  selectable: boolean;
  selectMode?: 'single' | 'multiple';
  
  // Row actions
  rowActions?: {
    icon: string;
    label: string;
    action: 'navigate' | 'modal' | 'api';
    target: string;
  }[];
  
  // Row click
  onRowClick?: {
    action: 'navigate' | 'modal' | 'expand';
    target: string;
  };
  
  // Grouping
  groupBy?: string;
  
  // Summary row
  showSummary?: boolean;
  summaryFields?: {
    field: string;
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  }[];
}
```

**Size:** 6-12 columns × 3-10 rows  
**Default:** 8 columns × 5 rows

**Example:**
```json
{
  "type": "table",
  "name": "Recent Contacts",
  "config": {
    "columns": [
      { "field": "name", "header": "Name", "sortable": true },
      { "field": "email", "header": "Email", "format": "link" },
      { "field": "company", "header": "Company" },
      { "field": "createdAt", "header": "Created", "format": "date" }
    ],
    "pageSize": 10,
    "showPagination": true,
    "showSearch": true,
    "onRowClick": {
      "action": "navigate",
      "target": "/shards/{id}"
    }
  },
  "dataSource": {
    "type": "custom",
    "customQuery": {
      "target": "c_contact",
      "sort": { "field": "createdAt", "order": "desc" },
      "limit": 100
    }
  }
}
```

---

### List Widget

Simple list display for items.

```typescript
interface ListWidgetConfig {
  type: 'list';
  
  // Item template
  itemTemplate: {
    title: string;       // Field or template string
    subtitle?: string;
    description?: string;
    avatar?: string;
    badge?: string;
    timestamp?: string;
  };
  
  // Appearance
  style: 'simple' | 'card' | 'timeline';
  showDividers: boolean;
  maxItems: number;
  
  // Empty state
  emptyMessage: string;
  emptyIcon?: string;
  
  // Item click
  onItemClick?: {
    action: 'navigate' | 'modal';
    target: string;
  };
  
  // Load more
  showLoadMore: boolean;
}
```

**Size:** 3-6 columns × 2-8 rows  
**Default:** 4 columns × 4 rows

---

### Gauge Widget

Progress or percentage display.

```typescript
interface GaugeWidgetConfig {
  type: 'gauge';
  
  // Value
  minValue: number;
  maxValue: number;
  
  // Display
  gaugeType: 'radial' | 'linear' | 'semicircle';
  showValue: boolean;
  showMinMax: boolean;
  format: 'number' | 'percentage';
  
  // Thresholds
  thresholds: {
    value: number;
    color: string;
    label?: string;
  }[];
  
  // Labels
  label?: string;
  unit?: string;
}
```

**Size:** 2-4 columns × 2-4 rows  
**Default:** 3 columns × 3 rows

---

## Shard Widgets

### Recent Shards Widget

Displays recently created or updated shards.

```typescript
interface RecentShardsWidgetConfig {
  type: 'recent_shards';
  
  // Filters
  shardTypeIds?: string[];  // Filter by types
  status?: string[];
  sortBy: 'createdAt' | 'updatedAt' | 'lastActivityAt';
  
  // Display
  maxItems: number;
  showShardType: boolean;
  showTimestamp: boolean;
  showCreator: boolean;
  
  // Fields to display
  displayFields: string[];
  
  // Grouping
  groupByType: boolean;
  groupByDate: boolean;
}
```

**Predefined Query:** `recent_shards`

---

### Shard Activity Widget

Activity timeline for shards.

```typescript
interface ShardActivityWidgetConfig {
  type: 'shard_activity';
  
  // Filters
  shardTypeIds?: string[];
  activityTypes: ('created' | 'updated' | 'deleted' | 'restored' | 
                  'relationship_added' | 'relationship_removed')[];
  dateRange: 'today' | 'week' | 'month' | 'custom';
  customDateRange?: { start: Date; end: Date };
  
  // Display
  style: 'timeline' | 'list' | 'grouped';
  maxItems: number;
  showActor: boolean;
  showShardPreview: boolean;
}
```

**Predefined Query:** `shard_activity`

---

### Shard Stats Widget

Aggregate statistics for shards.

```typescript
interface ShardStatsWidgetConfig {
  type: 'shard_stats';
  
  // Aggregation
  groupBy: 'shardType' | 'status' | 'category' | 'custom';
  customGroupField?: string;
  
  // Metrics
  metrics: ('count' | 'created_today' | 'created_this_week' | 
            'updated_today' | 'updated_this_week')[];
  
  // Display
  displayType: 'cards' | 'bars' | 'pie';
  showTrend: boolean;
  trendPeriod?: 'day' | 'week' | 'month';
}
```

**Predefined Query:** `shard_stats`

---

### Shard Kanban Widget

Kanban board view for shards.

```typescript
interface ShardKanbanWidgetConfig {
  type: 'shard_kanban';
  
  // Source
  shardTypeId: string;
  
  // Columns
  columnField: string;  // Field to use for columns (e.g., 'status')
  columns: {
    value: string;
    label: string;
    color?: string;
    limit?: number;  // WIP limit
  }[];
  
  // Card display
  cardFields: string[];
  showAvatar: boolean;
  showDueDate: boolean;
  
  // Interaction
  allowDragDrop: boolean;  // Move between columns
  allowQuickEdit: boolean;
}
```

**Size:** 8-12 columns × 4-8 rows  
**Default:** 12 columns × 6 rows

---

## User Widgets

### Team Activity Widget

Activity feed for team members.

```typescript
interface TeamActivityWidgetConfig {
  type: 'team_activity';
  
  // Scope
  scope: 'my_team' | 'all_users' | 'specific_users';
  userIds?: string[];
  
  // Activity types
  activityTypes: ('login' | 'shard_created' | 'shard_updated' | 
                  'comment_added' | 'task_completed')[];
  
  // Display
  style: 'timeline' | 'grouped_by_user' | 'grouped_by_type';
  maxItems: number;
  dateRange: 'today' | 'week' | 'month';
}
```

---

### User Stats Widget

User activity metrics.

```typescript
interface UserStatsWidgetConfig {
  type: 'user_stats';
  
  // Metrics
  metrics: ('logins' | 'shards_created' | 'shards_updated' | 
            'searches' | 'api_calls')[];
  
  // Period
  period: 'today' | 'week' | 'month' | 'year';
  showComparison: boolean;
  comparisonPeriod?: 'previous';
  
  // Display
  displayType: 'counters' | 'chart' | 'table';
}
```

---

### My Tasks Widget

User's assigned tasks.

```typescript
interface MyTasksWidgetConfig {
  type: 'my_tasks';
  
  // Filters
  status: ('todo' | 'in_progress' | 'blocked' | 'done')[];
  priority?: ('critical' | 'high' | 'medium' | 'low')[];
  dueDateRange?: 'overdue' | 'today' | 'this_week' | 'all';
  
  // Display
  style: 'list' | 'cards';
  maxItems: number;
  showDueDate: boolean;
  showPriority: boolean;
  showProject: boolean;
  
  // Actions
  allowComplete: boolean;
  allowSnooze: boolean;
}
```

---

### Notifications Widget

User notifications center.

```typescript
interface NotificationsWidgetConfig {
  type: 'notifications';
  
  // Filters
  types: ('mention' | 'assignment' | 'due_date' | 'system' | 'comment')[];
  showRead: boolean;
  
  // Display
  maxItems: number;
  groupByDate: boolean;
  
  // Actions
  allowMarkRead: boolean;
  allowDismiss: boolean;
}
```

---

## Integration Widgets

### External Data Widget

Data from external integrations.

```typescript
interface ExternalDataWidgetConfig {
  type: 'external_data';
  
  // Source
  integrationId: string;
  endpoint: string;
  method: 'GET' | 'POST';
  parameters?: Record<string, any>;
  
  // Data mapping
  dataPath: string;  // JSONPath to data
  mapping: {
    sourceField: string;
    targetField: string;
    transform?: string;
  }[];
  
  // Display
  displayType: 'table' | 'list' | 'chart' | 'counter';
  displayConfig: Record<string, any>;  // Type-specific config
  
  // Caching
  cacheSeconds: number;
}
```

---

### Embed Widget

IFrame embed for external content.

```typescript
interface EmbedWidgetConfig {
  type: 'embed';
  
  // Source
  url: string;
  
  // Sandbox
  sandbox: string[];  // ['allow-scripts', 'allow-same-origin', ...]
  
  // Appearance
  border: boolean;
  borderRadius: number;
  
  // Responsive
  aspectRatio?: string;  // '16:9', '4:3'
}
```

---

### Webhook Status Widget

Health status of webhooks.

```typescript
interface WebhookStatusWidgetConfig {
  type: 'webhook_status';
  
  // Filters
  webhookIds?: string[];  // Empty = all
  showInactive: boolean;
  
  // Display
  showLastTriggered: boolean;
  showSuccessRate: boolean;
  showErrors: boolean;
  
  // Alert
  alertOnFailure: boolean;
  failureThreshold: number;
}
```

---

## Custom Widgets

### Custom Query Widget

User-defined data queries with visualization.

```typescript
interface CustomQueryWidgetConfig {
  type: 'custom_query';
  
  // Query
  query: {
    // Target ShardType
    shardTypeId: string;
    
    // Filters
    filters: {
      field: string;
      operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 
               'contains' | 'startsWith' | 'in' | 'notIn';
      value: any;
      // User can override at runtime
      userConfigurable: boolean;
    }[];
    
    // Aggregation
    aggregation?: {
      groupBy: string[];
      metrics: {
        field: string;
        function: 'count' | 'sum' | 'avg' | 'min' | 'max';
        alias: string;
      }[];
    };
    
    // Sorting
    sort?: { field: string; order: 'asc' | 'desc' }[];
    
    // Limit
    limit: number;
  };
  
  // Visualization
  visualization: {
    type: 'table' | 'chart' | 'list' | 'counter';
    config: Record<string, any>;  // Type-specific
  };
}
```

---

### Markdown Widget

Static content with markdown support.

```typescript
interface MarkdownWidgetConfig {
  type: 'markdown';
  
  // Content
  content: string;
  
  // Appearance
  fontSize: 'small' | 'medium' | 'large';
  textAlign: 'left' | 'center' | 'right';
  
  // Scroll
  enableScroll: boolean;
  maxHeight?: number;
}
```

---

### Quick Links Widget

Navigation shortcuts.

```typescript
interface QuickLinksWidgetConfig {
  type: 'quick_links';
  
  // Links
  links: {
    label: string;
    icon?: string;
    url: string;
    target?: '_self' | '_blank';
    color?: string;
  }[];
  
  // Display
  style: 'list' | 'grid' | 'buttons';
  columns?: number;  // For grid
  showDescriptions: boolean;
}
```

---

## Common Configuration

### User-Configurable Filters

Allow users to customize widget filters at runtime.

```typescript
interface UserConfigurableFilter {
  field: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'search';
  
  // Options for select/multiselect
  options?: { value: string; label: string }[];
  optionsQuery?: string;  // Dynamic options
  
  // Defaults
  defaultValue?: any;
  
  // Persistence
  persistUserChoice: boolean;
}
```

### Widget Actions

Common actions available on widgets.

```typescript
interface WidgetActions {
  // Refresh
  refresh: boolean;
  
  // Export
  export: {
    enabled: boolean;
    formats: ('csv' | 'json' | 'pdf')[];
  };
  
  // Fullscreen
  fullscreen: boolean;
  
  // Settings
  configure: boolean;  // User can change filters
  
  // Custom actions
  customActions?: {
    id: string;
    label: string;
    icon?: string;
    handler: string;  // Function name
  }[];
}
```

### Widget States

```typescript
type WidgetState = 
  | 'loading'      // Initial load
  | 'loaded'       // Data displayed
  | 'refreshing'   // Updating data
  | 'error'        // Failed to load
  | 'empty'        // No data
  | 'configuring'  // User editing filters
  | 'placeholder'; // Needs configuration
```

---

## Related Documentation

- [Dashboard System](./README.md)
- [Data Sources](./data-sources.md)
- [Permissions](./permissions.md)

---

**Last Updated**: November 30, 2025  
**Version**: 1.0.0












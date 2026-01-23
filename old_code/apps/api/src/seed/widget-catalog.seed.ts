// @ts-nocheck
/**
 * Widget Catalog Seed Data
 * 
 * Defines default widget types available in the widget catalog
 */

import type {
  WidgetCatalogEntry,
  WidgetVisibilityLevel,
  WidgetCatalogStatus,
} from '../types/widget-catalog.types.js';
import { WidgetCatalogStatus as Status, WidgetVisibilityLevel as Level } from '../types/widget-catalog.types.js';

/**
 * Default System Widget Catalog Entries
 */
export const DEFAULT_WIDGET_CATALOG: Array<
  Omit<WidgetCatalogEntry, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>
> = [
  // ============================================================================
  // Counter Widgets
  // ============================================================================
  {
    widgetType: 'counter',
    catalogType: 'system',
    name: 'counter_total_shards',
    displayName: 'Total Records',
    description: 'Display total count of records',
    category: 'metrics',
    icon: 'hash',
    thumbnail: null,
    status: Status.ACTIVE,
    isDefault: true,
    isFeatured: true,
    visibilityLevel: Level.ALL_USERS,
    allowedRoles: ['admin', 'user', 'viewer'],
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 2 },
    maxSize: { width: 4, height: 3 },
    defaultConfig: {
      format: 'number',
      showTrend: true,
      trendPeriod: 'last_30_days',
    },
    defaultPermissions: {
      visibility: {
        roles: ['admin', 'user', 'viewer'],
      },
      dataFiltering: {
        applyTenantFilter: true,
        applyUserFilter: false,
      },
      actions: {
        canRefresh: true,
        canExport: true,
        canDrillDown: true,
        canConfigure: false,
      },
    },
    allowUserConfiguration: false,
    configurableFields: [],
    version: 1,
    tags: ['metrics', 'counter', 'basic'],
    sortOrder: 1,
  },
  {
    widgetType: 'counter',
    catalogType: 'system',
    name: 'counter_active_projects',
    displayName: 'Active Projects',
    description: 'Count of active projects',
    category: 'metrics',
    icon: 'folder',
    thumbnail: null,
    status: Status.ACTIVE,
    isDefault: true,
    isFeatured: false,
    visibilityLevel: Level.ALL_USERS,
    allowedRoles: ['admin', 'user', 'viewer'],
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 2 },
    maxSize: { width: 4, height: 3 },
    defaultConfig: {
      format: 'number',
      showTrend: true,
      prefix: '',
      suffix: ' projects',
    },
    defaultPermissions: {
      visibility: {
        roles: ['admin', 'user', 'viewer'],
      },
      dataFiltering: {
        applyTenantFilter: true,
        applyUserFilter: false,
      },
      actions: {
        canRefresh: true,
        canExport: true,
        canDrillDown: true,
        canConfigure: false,
      },
    },
    allowUserConfiguration: false,
    configurableFields: [],
    version: 1,
    tags: ['metrics', 'counter', 'projects'],
    sortOrder: 2,
  },
  {
    widgetType: 'counter',
    catalogType: 'system',
    name: 'counter_total_revenue',
    displayName: 'Total Revenue',
    description: 'Display total revenue amount',
    category: 'financial',
    icon: 'dollar-sign',
    thumbnail: null,
    status: Status.ACTIVE,
    isDefault: false,
    isFeatured: true,
    visibilityLevel: Level.SPECIFIC_ROLES,
    allowedRoles: ['admin', 'finance'],
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 2 },
    maxSize: { width: 4, height: 3 },
    defaultConfig: {
      format: 'currency',
      prefix: '$',
      showTrend: true,
      trendPeriod: 'last_30_days',
    },
    defaultPermissions: {
      visibility: {
        roles: ['admin', 'finance'],
      },
      dataFiltering: {
        applyTenantFilter: true,
        applyUserFilter: false,
      },
      actions: {
        canRefresh: true,
        canExport: true,
        canDrillDown: true,
        canConfigure: false,
      },
    },
    allowUserConfiguration: false,
    configurableFields: [],
    version: 1,
    tags: ['financial', 'revenue', 'metrics'],
    sortOrder: 3,
  },

  // ============================================================================
  // Chart Widgets
  // ============================================================================
  {
    widgetType: 'chart',
    catalogType: 'system',
    name: 'chart_records_by_type',
    displayName: 'Records by Type',
    description: 'Bar chart showing record distribution by type',
    category: 'analytics',
    icon: 'bar-chart',
    thumbnail: null,
    status: Status.ACTIVE,
    isDefault: true,
    isFeatured: true,
    visibilityLevel: Level.ALL_USERS,
    allowedRoles: ['admin', 'user', 'viewer'],
    defaultSize: { width: 6, height: 4 },
    minSize: { width: 4, height: 3 },
    maxSize: { width: 12, height: 8 },
    defaultConfig: {
      chartType: 'bar',
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      showLegend: true,
      showGrid: true,
      orientation: 'vertical',
    },
    defaultPermissions: {
      visibility: {
        roles: ['admin', 'user', 'viewer'],
      },
      dataFiltering: {
        applyTenantFilter: true,
        applyUserFilter: false,
      },
      actions: {
        canRefresh: true,
        canExport: true,
        canDrillDown: true,
        canConfigure: true,
      },
    },
    allowUserConfiguration: true,
    configurableFields: ['chartType', 'colors', 'showLegend', 'showGrid'],
    version: 1,
    tags: ['chart', 'bar', 'analytics'],
    sortOrder: 10,
  },
  {
    widgetType: 'chart',
    catalogType: 'system',
    name: 'chart_status_distribution',
    displayName: 'Status Distribution',
    description: 'Pie chart showing status distribution',
    category: 'analytics',
    icon: 'pie-chart',
    thumbnail: null,
    status: Status.ACTIVE,
    isDefault: true,
    isFeatured: true,
    visibilityLevel: Level.ALL_USERS,
    allowedRoles: ['admin', 'user', 'viewer'],
    defaultSize: { width: 4, height: 4 },
    minSize: { width: 3, height: 3 },
    maxSize: { width: 6, height: 6 },
    defaultConfig: {
      chartType: 'pie',
      colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
      showLegend: true,
      showLabels: true,
      showPercentage: true,
    },
    defaultPermissions: {
      visibility: {
        roles: ['admin', 'user', 'viewer'],
      },
      dataFiltering: {
        applyTenantFilter: true,
        applyUserFilter: false,
      },
      actions: {
        canRefresh: true,
        canExport: true,
        canDrillDown: false,
        canConfigure: true,
      },
    },
    allowUserConfiguration: true,
    configurableFields: ['colors', 'showLegend', 'showLabels'],
    version: 1,
    tags: ['chart', 'pie', 'analytics'],
    sortOrder: 11,
  },
  {
    widgetType: 'chart',
    catalogType: 'system',
    name: 'chart_trend_over_time',
    displayName: 'Trend Over Time',
    description: 'Line chart showing trends over time',
    category: 'analytics',
    icon: 'trending-up',
    thumbnail: null,
    status: Status.ACTIVE,
    isDefault: true,
    isFeatured: false,
    visibilityLevel: Level.ALL_USERS,
    allowedRoles: ['admin', 'user', 'viewer'],
    defaultSize: { width: 8, height: 4 },
    minSize: { width: 6, height: 3 },
    maxSize: { width: 12, height: 8 },
    defaultConfig: {
      chartType: 'line',
      colors: ['#3b82f6', '#10b981'],
      showLegend: true,
      showGrid: true,
      smooth: true,
      showPoints: true,
    },
    defaultPermissions: {
      visibility: {
        roles: ['admin', 'user', 'viewer'],
      },
      dataFiltering: {
        applyTenantFilter: true,
        applyUserFilter: false,
      },
      actions: {
        canRefresh: true,
        canExport: true,
        canDrillDown: true,
        canConfigure: true,
      },
    },
    allowUserConfiguration: true,
    configurableFields: ['colors', 'showLegend', 'showGrid', 'smooth'],
    version: 1,
    tags: ['chart', 'line', 'trend', 'time-series'],
    sortOrder: 12,
  },

  // ============================================================================
  // Table Widgets
  // ============================================================================
  {
    widgetType: 'table',
    catalogType: 'system',
    name: 'table_recent_records',
    displayName: 'Recent Records',
    description: 'Table showing recent records',
    category: 'data',
    icon: 'table',
    thumbnail: null,
    status: Status.ACTIVE,
    isDefault: true,
    isFeatured: false,
    visibilityLevel: Level.ALL_USERS,
    allowedRoles: ['admin', 'user', 'viewer'],
    defaultSize: { width: 8, height: 5 },
    minSize: { width: 6, height: 4 },
    maxSize: { width: 12, height: 8 },
    defaultConfig: {
      pageSize: 10,
      sortable: true,
      filterable: true,
      exportable: true,
      columns: [
        { field: 'name', label: 'Name', sortable: true, width: '30%' },
        { field: 'status', label: 'Status', sortable: true, width: '20%' },
        { field: 'createdAt', label: 'Created', sortable: true, width: '25%' },
        { field: 'updatedAt', label: 'Updated', sortable: true, width: '25%' },
      ],
    },
    defaultPermissions: {
      visibility: {
        roles: ['admin', 'user', 'viewer'],
      },
      dataFiltering: {
        applyTenantFilter: true,
        applyUserFilter: false,
      },
      actions: {
        canRefresh: true,
        canExport: true,
        canDrillDown: true,
        canConfigure: true,
      },
    },
    allowUserConfiguration: true,
    configurableFields: ['pageSize', 'columns'],
    version: 1,
    tags: ['table', 'list', 'data'],
    sortOrder: 20,
  },

  // ============================================================================
  // List Widgets
  // ============================================================================
  {
    widgetType: 'list',
    catalogType: 'system',
    name: 'list_top_items',
    displayName: 'Top Items',
    description: 'List of top items by a metric',
    category: 'data',
    icon: 'list',
    thumbnail: null,
    status: Status.ACTIVE,
    isDefault: true,
    isFeatured: false,
    visibilityLevel: Level.ALL_USERS,
    allowedRoles: ['admin', 'user', 'viewer'],
    defaultSize: { width: 4, height: 5 },
    minSize: { width: 3, height: 4 },
    maxSize: { width: 6, height: 8 },
    defaultConfig: {
      maxItems: 10,
      showRank: true,
      showMetric: true,
      sortOrder: 'desc',
    },
    defaultPermissions: {
      visibility: {
        roles: ['admin', 'user', 'viewer'],
      },
      dataFiltering: {
        applyTenantFilter: true,
        applyUserFilter: false,
      },
      actions: {
        canRefresh: true,
        canExport: true,
        canDrillDown: true,
        canConfigure: true,
      },
    },
    allowUserConfiguration: true,
    configurableFields: ['maxItems', 'sortOrder'],
    version: 1,
    tags: ['list', 'ranking', 'data'],
    sortOrder: 30,
  },

  // ============================================================================
  // Map Widgets
  // ============================================================================
  {
    widgetType: 'map',
    catalogType: 'system',
    name: 'map_location_distribution',
    displayName: 'Location Distribution',
    description: 'Map showing data distribution by location',
    category: 'geo',
    icon: 'map',
    thumbnail: null,
    status: Status.ACTIVE,
    isDefault: false,
    isFeatured: false,
    visibilityLevel: Level.SPECIFIC_ROLES,
    allowedRoles: ['admin', 'user'],
    defaultSize: { width: 8, height: 6 },
    minSize: { width: 6, height: 5 },
    maxSize: { width: 12, height: 8 },
    defaultConfig: {
      mapType: 'choropleth',
      showTooltip: true,
      showLegend: true,
      colorScheme: 'blue',
    },
    defaultPermissions: {
      visibility: {
        roles: ['admin', 'user'],
      },
      dataFiltering: {
        applyTenantFilter: true,
        applyUserFilter: false,
      },
      actions: {
        canRefresh: true,
        canExport: true,
        canDrillDown: true,
        canConfigure: true,
      },
    },
    allowUserConfiguration: true,
    configurableFields: ['mapType', 'colorScheme'],
    version: 1,
    tags: ['map', 'geo', 'location'],
    sortOrder: 40,
  },

  // ============================================================================
  // Custom Query Widget
  // ============================================================================
  {
    widgetType: 'custom',
    catalogType: 'system',
    name: 'custom_query_widget',
    displayName: 'Custom Query Widget',
    description: 'Widget with custom data query',
    category: 'advanced',
    icon: 'code',
    thumbnail: null,
    status: Status.ACTIVE,
    isDefault: false,
    isFeatured: false,
    visibilityLevel: Level.SPECIFIC_ROLES,
    allowedRoles: ['admin'],
    defaultSize: { width: 6, height: 4 },
    minSize: { width: 4, height: 3 },
    maxSize: { width: 12, height: 8 },
    defaultConfig: {
      displayType: 'table',
      customizable: true,
    },
    defaultPermissions: {
      visibility: {
        roles: ['admin'],
      },
      dataFiltering: {
        applyTenantFilter: true,
        applyUserFilter: false,
      },
      actions: {
        canRefresh: true,
        canExport: true,
        canDrillDown: false,
        canConfigure: true,
      },
    },
    allowUserConfiguration: true,
    configurableFields: ['displayType', 'customQuery'],
    version: 1,
    tags: ['custom', 'advanced', 'query'],
    sortOrder: 100,
  },
];

/**
 * Get widget catalog entry by name
 */
export function getWidgetCatalogEntry(name: string): typeof DEFAULT_WIDGET_CATALOG[0] | undefined {
  return DEFAULT_WIDGET_CATALOG.find((entry) => entry.name === name);
}

/**
 * Get widget catalog entries by category
 */
export function getWidgetCatalogByCategory(category: string): typeof DEFAULT_WIDGET_CATALOG {
  return DEFAULT_WIDGET_CATALOG.filter((entry) => entry.category === category);
}

/**
 * Get featured widget catalog entries
 */
export function getFeaturedWidgets(): typeof DEFAULT_WIDGET_CATALOG {
  return DEFAULT_WIDGET_CATALOG.filter((entry) => entry.isFeatured);
}

/**
 * Get default widget catalog entries
 */
export function getDefaultWidgets(): typeof DEFAULT_WIDGET_CATALOG {
  return DEFAULT_WIDGET_CATALOG.filter((entry) => entry.isDefault);
}

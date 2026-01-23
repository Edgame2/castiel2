/**
 * Dashboard Shard Types Seed Data
 *
 * Defines the shard types for dashboards, widgets, and user groups
 */
/**
 * c_dashboard - Dashboard Shard Type
 */
export const DASHBOARD_SHARD_TYPE = {
    name: 'c_dashboard',
    displayName: 'Dashboard',
    description: 'Customizable dashboards with drag-and-drop widgets',
    category: 'system',
    version: 1,
    isSystem: true,
    isGlobal: true,
    isActive: true,
    icon: 'layout-dashboard',
    color: '#6366f1', // Indigo
    tags: ['dashboard', 'widgets', 'analytics', 'system'],
    schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: ['name', 'dashboardType', 'ownerId', 'ownerType'],
        properties: {
            // Display
            name: {
                type: 'string',
                title: 'Dashboard Name',
                minLength: 1,
                maxLength: 200,
            },
            description: {
                type: 'string',
                title: 'Description',
                maxLength: 1000,
            },
            icon: {
                type: 'string',
                title: 'Icon',
                description: 'Lucide icon name',
            },
            color: {
                type: 'string',
                title: 'Color',
                description: 'Dashboard theme color',
            },
            // Type
            dashboardType: {
                type: 'string',
                title: 'Dashboard Type',
                enum: ['system', 'tenant', 'user'],
                description: 'System = Super Admin, Tenant = Tenant Admin, User = Individual',
            },
            // Ownership
            ownerId: {
                type: 'string',
                title: 'Owner ID',
                description: 'User ID, Tenant ID, or system identifier',
            },
            ownerType: {
                type: 'string',
                title: 'Owner Type',
                enum: ['user', 'tenant', 'system'],
            },
            // Flags
            isDefault: {
                type: 'boolean',
                title: 'Is Default',
                description: 'Default dashboard for the owner scope',
                default: false,
            },
            isTemplate: {
                type: 'boolean',
                title: 'Is Template',
                description: 'Can be instantiated by users',
                default: false,
            },
            isPublic: {
                type: 'boolean',
                title: 'Is Public',
                description: 'Visible to all users in scope',
                default: false,
            },
            // Grid Configuration
            gridConfig: {
                type: 'object',
                title: 'Grid Configuration',
                properties: {
                    columns: {
                        type: 'object',
                        properties: {
                            desktop: { type: 'integer', default: 12 },
                            tablet: { type: 'integer', default: 8 },
                            mobile: { type: 'integer', default: 4 },
                        },
                    },
                    rowHeight: { type: 'integer', default: 80 },
                    gap: { type: 'integer', default: 16 },
                    padding: { type: 'integer', default: 24 },
                },
            },
            // Layout
            layout: {
                type: 'object',
                title: 'Layout',
                properties: {
                    desktop: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                widgetId: { type: 'string' },
                                position: {
                                    type: 'object',
                                    properties: {
                                        x: { type: 'integer' },
                                        y: { type: 'integer' },
                                    },
                                },
                                size: {
                                    type: 'object',
                                    properties: {
                                        width: { type: 'integer' },
                                        height: { type: 'integer' },
                                    },
                                },
                            },
                        },
                    },
                    tablet: { type: 'array' },
                    mobile: { type: 'array' },
                },
            },
            // Context
            context: {
                type: 'object',
                title: 'Dashboard Context',
                properties: {
                    contextType: {
                        type: 'string',
                        enum: ['none', 'shard', 'custom'],
                        default: 'none',
                    },
                    shardContext: {
                        type: 'object',
                        properties: {
                            shardTypeId: { type: 'string' },
                            shardId: { type: 'string' },
                            required: { type: 'boolean' },
                        },
                    },
                    customContext: {
                        type: 'object',
                        properties: {
                            parameters: { type: 'array' },
                        },
                    },
                },
            },
            // Filters
            filters: {
                type: 'object',
                title: 'Dashboard Filters',
                properties: {
                    dateRange: {
                        type: 'object',
                        properties: {
                            enabled: { type: 'boolean' },
                            field: { type: 'string' },
                            presets: { type: 'array', items: { type: 'string' } },
                            allowCustomRange: { type: 'boolean' },
                            defaultPreset: { type: 'string' },
                        },
                    },
                    customFilters: { type: 'array' },
                },
            },
            // Settings
            settings: {
                type: 'object',
                title: 'Dashboard Settings',
                properties: {
                    autoRefresh: { type: 'boolean', default: false },
                    autoRefreshInterval: { type: 'integer', default: 60 },
                    theme: { type: 'string', enum: ['light', 'dark', 'system'], default: 'system' },
                    density: { type: 'string', enum: ['compact', 'normal', 'comfortable'], default: 'normal' },
                    showInheritedWidgets: { type: 'boolean', default: true },
                    allowWidgetFilters: { type: 'boolean', default: true },
                },
            },
            // Permissions
            permissions: {
                type: 'object',
                title: 'Permissions',
                properties: {
                    visibility: { type: 'string', enum: ['private', 'tenant', 'public'] },
                    roles: { type: 'array' },
                    groups: { type: 'array' },
                    users: { type: 'array' },
                    allowedTenantIds: { type: 'array', items: { type: 'string' } },
                },
            },
            // Template source
            templateId: {
                type: 'string',
                title: 'Template ID',
                description: 'Source template if created from template',
            },
            templateVersion: {
                type: 'integer',
                title: 'Template Version',
            },
            // Version
            version: {
                type: 'integer',
                title: 'Version',
                description: 'Dashboard version for change tracking',
                default: 1,
            },
        },
    },
    uiSchema: {
        description: { 'ui:widget': 'textarea', 'ui:options': { rows: 3 } },
        layout: { 'ui:widget': 'hidden' },
        gridConfig: { 'ui:widget': 'hidden' },
        permissions: { 'ui:widget': 'hidden' },
        'ui:order': ['name', 'description', 'dashboardType', 'icon', 'color', 'isDefault', 'isPublic', '*'],
    },
};
/**
 * c_dashboardWidget - Dashboard Widget Shard Type
 */
export const DASHBOARD_WIDGET_SHARD_TYPE = {
    name: 'c_dashboardWidget',
    displayName: 'Dashboard Widget',
    description: 'Widget component for dashboards',
    category: 'system',
    version: 1,
    isSystem: true,
    isGlobal: true,
    isActive: true,
    icon: 'component',
    color: '#8b5cf6', // Violet
    tags: ['widget', 'dashboard', 'component', 'system'],
    schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: ['name', 'widgetType', 'dashboardId'],
        properties: {
            // Display
            name: {
                type: 'string',
                title: 'Widget Name',
                minLength: 1,
                maxLength: 100,
            },
            description: {
                type: 'string',
                title: 'Description',
                maxLength: 500,
            },
            icon: {
                type: 'string',
                title: 'Icon',
            },
            // Parent dashboard
            dashboardId: {
                type: 'string',
                title: 'Dashboard ID',
                description: 'Parent dashboard this widget belongs to',
            },
            // Widget type
            widgetType: {
                type: 'string',
                title: 'Widget Type',
                enum: [
                    'counter', 'chart', 'table', 'list', 'gauge',
                    'recent_shards', 'shard_activity', 'shard_stats', 'shard_kanban',
                    'team_activity', 'user_stats', 'my_tasks', 'notifications',
                    'external_data', 'embed', 'webhook_status',
                    'custom_query', 'markdown', 'quick_links',
                ],
            },
            // Configuration (type-specific)
            config: {
                type: 'object',
                title: 'Widget Configuration',
                description: 'Type-specific configuration options',
            },
            // Data source
            dataSource: {
                type: 'object',
                title: 'Data Source',
                properties: {
                    type: { type: 'string', enum: ['predefined', 'custom', 'integration'] },
                    predefinedQuery: { type: 'string' },
                    predefinedParams: { type: 'object' },
                    customQuery: { type: 'object' },
                    integrationSource: { type: 'object' },
                    useContext: { type: 'boolean', default: false },
                    contextMapping: { type: 'object' },
                    useDateFilter: { type: 'boolean', default: false },
                    dateFilterField: { type: 'string' },
                    allowUserFilters: { type: 'boolean', default: true },
                    defaultFilters: { type: 'array' },
                },
            },
            // Layout
            position: {
                type: 'object',
                title: 'Position',
                properties: {
                    x: { type: 'integer', minimum: 0 },
                    y: { type: 'integer', minimum: 0 },
                },
            },
            size: {
                type: 'object',
                title: 'Size',
                properties: {
                    width: { type: 'integer', minimum: 1 },
                    height: { type: 'integer', minimum: 1 },
                },
            },
            minSize: {
                type: 'object',
                properties: {
                    width: { type: 'integer' },
                    height: { type: 'integer' },
                },
            },
            maxSize: {
                type: 'object',
                properties: {
                    width: { type: 'integer' },
                    height: { type: 'integer' },
                },
            },
            // Refresh
            refreshInterval: {
                type: 'integer',
                title: 'Refresh Interval',
                description: 'Refresh interval in seconds (0 = manual only)',
                default: 60,
                minimum: 0,
            },
            // Permissions
            permissions: {
                type: 'object',
                title: 'Widget Permissions',
                properties: {
                    visibility: {
                        type: 'object',
                        properties: {
                            roles: { type: 'array', items: { type: 'string' } },
                            userIds: { type: 'array', items: { type: 'string' } },
                            groupIds: { type: 'array', items: { type: 'string' } },
                            excludeUserIds: { type: 'array', items: { type: 'string' } },
                        },
                    },
                    dataFiltering: {
                        type: 'object',
                        properties: {
                            applyTenantFilter: { type: 'boolean', default: true },
                            applyUserFilter: { type: 'boolean', default: false },
                            permissionField: { type: 'string' },
                        },
                    },
                    actions: {
                        type: 'object',
                        properties: {
                            canRefresh: { type: 'boolean', default: true },
                            canExport: { type: 'boolean', default: true },
                            canDrillDown: { type: 'boolean', default: true },
                            canConfigure: { type: 'boolean', default: true },
                        },
                    },
                },
            },
            // Flags
            isRequired: {
                type: 'boolean',
                title: 'Is Required',
                description: 'Cannot be removed from dashboard',
                default: false,
            },
            isPlaceholder: {
                type: 'boolean',
                title: 'Is Placeholder',
                description: 'Needs configuration before use',
                default: false,
            },
        },
    },
    uiSchema: {
        config: { 'ui:widget': 'hidden' },
        dataSource: { 'ui:widget': 'hidden' },
        permissions: { 'ui:widget': 'hidden' },
        'ui:order': ['name', 'description', 'widgetType', 'position', 'size', 'refreshInterval', '*'],
    },
};
/**
 * c_userGroup - User Group Shard Type
 */
export const USER_GROUP_SHARD_TYPE = {
    name: 'c_userGroup',
    displayName: 'User Group',
    description: 'Groups for organizing users and managing permissions',
    category: 'system',
    version: 1,
    isSystem: true,
    isGlobal: true,
    isActive: true,
    icon: 'users',
    color: '#10b981', // Emerald
    tags: ['group', 'users', 'permissions', 'system'],
    schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: ['name', 'source'],
        properties: {
            // Display
            name: {
                type: 'string',
                title: 'Group Name',
                minLength: 1,
                maxLength: 100,
            },
            description: {
                type: 'string',
                title: 'Description',
                maxLength: 500,
            },
            color: {
                type: 'string',
                title: 'Color',
                description: 'Group color for UI',
            },
            icon: {
                type: 'string',
                title: 'Icon',
            },
            // Source
            source: {
                type: 'string',
                title: 'Source',
                enum: ['manual', 'sso'],
                description: 'How the group was created',
            },
            // SSO Configuration (for source = 'sso')
            ssoConfig: {
                type: 'object',
                title: 'SSO Configuration',
                properties: {
                    providerId: { type: 'string' },
                    externalGroupId: { type: 'string' },
                    claimPath: { type: 'string' },
                    syncEnabled: { type: 'boolean', default: true },
                    lastSyncAt: { type: 'string', format: 'date-time' },
                },
            },
            // Members (for source = 'manual')
            memberUserIds: {
                type: 'array',
                title: 'Member User IDs',
                items: { type: 'string' },
            },
            // Stats
            memberCount: {
                type: 'integer',
                title: 'Member Count',
                minimum: 0,
                default: 0,
            },
        },
    },
    uiSchema: {
        ssoConfig: { 'ui:widget': 'hidden' },
        memberUserIds: { 'ui:widget': 'hidden' },
        'ui:order': ['name', 'description', 'source', 'color', 'icon', 'memberCount', '*'],
    },
};
/**
 * c_dashboardVersion - Dashboard Version Shard Type
 */
export const DASHBOARD_VERSION_SHARD_TYPE = {
    name: 'c_dashboardVersion',
    displayName: 'Dashboard Version',
    description: 'Version history for dashboards',
    category: 'system',
    version: 1,
    isSystem: true,
    isGlobal: true,
    isActive: true,
    icon: 'history',
    color: '#64748b', // Slate
    tags: ['version', 'history', 'dashboard', 'system'],
    schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: ['dashboardId', 'version', 'changeType'],
        properties: {
            dashboardId: {
                type: 'string',
                title: 'Dashboard ID',
            },
            version: {
                type: 'integer',
                title: 'Version Number',
                minimum: 1,
            },
            snapshot: {
                type: 'object',
                title: 'Dashboard Snapshot',
                properties: {
                    widgets: { type: 'array', items: { type: 'string' } },
                    layout: { type: 'object' },
                    settings: { type: 'object' },
                    permissions: { type: 'object' },
                },
            },
            changeSummary: {
                type: 'string',
                title: 'Change Summary',
                maxLength: 500,
            },
            changeType: {
                type: 'string',
                title: 'Change Type',
                enum: [
                    'widget_added', 'widget_removed', 'widget_updated',
                    'layout_changed', 'settings_changed', 'permissions_changed',
                    'bulk_update', 'rollback',
                ],
            },
        },
    },
    uiSchema: {
        snapshot: { 'ui:widget': 'hidden' },
        'ui:order': ['dashboardId', 'version', 'changeType', 'changeSummary', '*'],
    },
};
/**
 * Get all dashboard-related shard types
 */
export function getDashboardShardTypes() {
    return [
        DASHBOARD_SHARD_TYPE,
        DASHBOARD_WIDGET_SHARD_TYPE,
        USER_GROUP_SHARD_TYPE,
        DASHBOARD_VERSION_SHARD_TYPE,
    ];
}
/**
 * Get dashboard shard type by name
 */
export function getDashboardShardTypeByName(name) {
    const types = getDashboardShardTypes();
    return types.find((t) => t.name === name);
}
//# sourceMappingURL=dashboard-shard-types.seed.js.map
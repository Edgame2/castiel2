# 📊 Dashboard System

> Customizable, permission-aware dashboards with drag-and-drop widgets, real-time updates, and multi-level inheritance.

---

## Table of Contents

1. [Overview](#overview)
2. [Feature Management](#feature-management)
3. [Architecture](#architecture)
4. [Dashboard Hierarchy](#dashboard-hierarchy)
5. [Dashboard Context & Filters](#dashboard-context--filters)
6. [Widget System](#widget-system)
7. [Permissions Model](#permissions-model)
8. [Groups & SSO Integration](#groups--sso-integration)
9. [Layout System](#layout-system)
10. [Templates](#templates)
11. [Versioning](#versioning)
12. [Data Model](#data-model)
13. [API Reference](#api-reference)
14. [Real-Time Updates](#real-time-updates)
15. [Implementation Roadmap](#implementation-roadmap)

---

## Overview

The Dashboard system provides customizable, real-time dashboards at three levels:

| Level | Created By | Visibility | Purpose |
|-------|------------|------------|---------|
| **System** | Super Admin | All tenants (public) or specific tenants | Platform-wide defaults, templates |
| **Tenant** | Tenant Admin | Tenant users | Organization-specific dashboards |
| **User** | Individual User | Creator + shared users | Personal workspaces |

### Key Features

- ✅ **Drag-and-drop** widget positioning
- ✅ **Resizable** widgets on a responsive grid
- ✅ **Real-time updates** via WebSocket
- ✅ **Permission-aware** at dashboard and widget level
- ✅ **Inheritance** - users see their dashboard + inherited widgets
- ✅ **Templates** - reusable dashboard blueprints
- ✅ **Version history** with rollback capability
- ✅ **Mobile responsive** layout
- ✅ **Feature flags** - Enable/disable globally and per tenant
- ✅ **Dashboard limits** - Configurable max dashboards per tenant
- ✅ **Context-aware** - Dashboard context passed to widgets
- ✅ **Date filters** - Presets including fiscal year support
- ✅ **Group permissions** - SSO-integrated group management

---

## Feature Management

### Global Feature Flags

Super Admin can control dashboard availability at the platform level.

```typescript
interface DashboardFeatureFlags {
  // Global kill switch
  dashboardsEnabled: boolean;
  
  // Feature toggles
  features: {
    customDashboards: boolean;      // Users can create dashboards
    dashboardSharing: boolean;      // Users can share dashboards
    customWidgets: boolean;         // Users can create custom query widgets
    dashboardTemplates: boolean;    // Template gallery available
    dashboardExport: boolean;       // Export/import functionality
    realTimeUpdates: boolean;       // WebSocket updates
  };
  
  // Global limits (defaults)
  limits: {
    maxDashboardsPerUser: number;     // Default: 10
    maxDashboardsPerTenant: number;   // Default: 100
    maxWidgetsPerDashboard: number;   // Default: 50
    maxCustomQueries: number;         // Default: 20
  };
}
```

### Per-Tenant Configuration

Super Admin can override settings for specific tenants.

```typescript
interface TenantDashboardConfig {
  tenantId: string;
  
  // Override global enabled flag
  dashboardsEnabled: boolean;
  
  // Override feature flags
  features?: Partial<DashboardFeatureFlags['features']>;
  
  // Override limits
  limits?: {
    maxDashboardsPerUser?: number;
    maxDashboardsPerTenant?: number;
    maxWidgetsPerDashboard?: number;
    maxCustomQueries?: number;
  };
  
  // Audit
  configuredAt: Date;
  configuredBy: string;
}
```

### Feature Check Flow

```
1. Check global dashboardsEnabled
   └─ If false → Feature disabled for everyone

2. Check tenant-specific override
   └─ If tenant has config → Use tenant's dashboardsEnabled
   └─ If no tenant config → Use global setting

3. Check specific feature flag
   └─ Tenant override > Global default

4. Check limits
   └─ Tenant override > Global default
```

### Admin API

```http
# Get global dashboard config (Super Admin)
GET /api/admin/dashboard-config

# Update global dashboard config (Super Admin)
PATCH /api/admin/dashboard-config
Body: { dashboardsEnabled, features, limits }

# Get tenant dashboard config (Super Admin)
GET /api/admin/tenants/:tenantId/dashboard-config

# Update tenant dashboard config (Super Admin)
PATCH /api/admin/tenants/:tenantId/dashboard-config
Body: { dashboardsEnabled, features, limits }

# Reset tenant to global defaults (Super Admin)
DELETE /api/admin/tenants/:tenantId/dashboard-config
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DASHBOARD RENDERING                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   System    │  │   Tenant    │  │    User     │             │
│  │  Dashboard  │  │  Dashboard  │  │  Dashboard  │             │
│  │  (inherited)│  │ (inherited) │  │  (primary)  │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                          ▼                                      │
│              ┌───────────────────────┐                          │
│              │   Merged Dashboard    │                          │
│              │   (what user sees)    │                          │
│              └───────────────────────┘                          │
│                          │                                      │
│                          ▼                                      │
│              ┌───────────────────────┐                          │
│              │  Permission Filter    │  ← Hide widgets user     │
│              │                       │    can't access          │
│              └───────────────────────┘                          │
│                          │                                      │
│                          ▼                                      │
│              ┌───────────────────────┐                          │
│              │   Rendered Grid       │                          │
│              └───────────────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dashboard Hierarchy

### Inheritance Model

When a user views their dashboard, they see a **merged view** of:

1. **System dashboards** (marked as inherited by user's tenant)
2. **Tenant default dashboard** (if configured)
3. **User's personal dashboard**

```typescript
interface DashboardMergeResult {
  // Widgets from all sources, de-duplicated
  widgets: MergedWidget[];
  
  // Source tracking for each widget
  sources: {
    system: string[];    // System dashboard IDs contributing widgets
    tenant: string[];    // Tenant dashboard IDs
    user: string[];      // User dashboard IDs
  };
  
  // User can hide inherited widgets
  hiddenWidgetIds: string[];
}

interface MergedWidget {
  widget: Widget;
  source: 'system' | 'tenant' | 'user';
  sourceDashboardId: string;
  canEdit: boolean;      // User can only edit their own widgets
  canHide: boolean;      // User can hide inherited widgets
  canReposition: boolean; // User can move within their view
}
```

### Inheritance Rules

| Widget Source | User Can Edit | User Can Hide | User Can Reposition |
|---------------|---------------|---------------|---------------------|
| System | ❌ No | ✅ Yes | ✅ Yes (local only) |
| Tenant | ❌ No | ✅ Yes | ✅ Yes (local only) |
| User | ✅ Yes | ✅ Yes | ✅ Yes |

### User Override Storage

When a user repositions or hides an inherited widget, store the override:

```typescript
interface UserDashboardOverrides {
  userId: string;
  
  // Hidden inherited widgets
  hiddenWidgets: {
    widgetId: string;
    sourceDashboardId: string;
  }[];
  
  // Repositioned inherited widgets
  positionOverrides: {
    widgetId: string;
    sourceDashboardId: string;
    position: GridPosition;
  }[];
}
```

---

## Dashboard Context & Filters

Dashboards can have **context** and **filters** that are automatically passed to widgets.

### Dashboard Context

Context binds a dashboard to a specific entity (e.g., a project, opportunity, contact).

```typescript
interface DashboardContext {
  // Context type
  contextType: 'none' | 'shard' | 'custom';
  
  // For shard context
  shardContext?: {
    shardTypeId: string;       // e.g., 'c_project', 'c_opportunity'
    shardId?: string;          // Specific shard ID (for dashboard instances)
    required: boolean;         // Dashboard requires context to load
  };
  
  // For custom context
  customContext?: {
    parameters: ContextParameter[];
  };
}

interface ContextParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'shardId';
  label: string;
  required: boolean;
  defaultValue?: any;
  
  // For shardId type
  shardTypeId?: string;        // Which ShardType to select from
}
```

### Context Usage Examples

#### Project Dashboard

```typescript
// Dashboard bound to c_project
{
  contextType: 'shard',
  shardContext: {
    shardTypeId: 'c_project',
    required: true
  }
}

// URL: /dashboards/project-overview?projectId=proj-123
// All widgets automatically filter by projectId
```

#### Opportunity Dashboard

```typescript
// Dashboard bound to c_opportunity
{
  contextType: 'shard',
  shardContext: {
    shardTypeId: 'c_opportunity',
    required: true
  }
}

// URL: /dashboards/deal-analysis?opportunityId=opp-456
```

### Dashboard Filters

Global filters that apply to all widgets on the dashboard.

```typescript
interface DashboardFilters {
  // Date range filter
  dateRange?: {
    enabled: boolean;
    field: string;              // Which field to filter on
    presets: DatePreset[];      // Available presets
    allowCustomRange: boolean;
    defaultPreset?: DatePreset;
  };
  
  // Custom filters
  customFilters?: DashboardFilter[];
}

interface DashboardFilter {
  id: string;
  name: string;
  field: string;
  type: 'select' | 'multiselect' | 'search' | 'boolean';
  
  // For select/multiselect
  options?: FilterOption[];
  optionsQuery?: string;        // Dynamic options from query
  
  // Default value
  defaultValue?: any;
  
  // Is this filter required?
  required: boolean;
}
```

### Date Presets

```typescript
type DatePreset = 
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_fiscal_quarter'      // Based on tenant fiscal year
  | 'last_fiscal_quarter'
  | 'this_year'
  | 'last_year'
  | 'this_fiscal_year'         // Based on tenant fiscal year
  | 'last_fiscal_year'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'last_365_days'
  | 'custom';                  // User picks start/end

interface DateRangeValue {
  preset: DatePreset;
  startDate?: Date;            // For custom range
  endDate?: Date;              // For custom range
}
```

### Fiscal Year Configuration

Tenant Admin configures the fiscal year start for their organization.

```typescript
interface TenantFiscalYearConfig {
  tenantId: string;
  
  // Fiscal year start
  fiscalYearStart: {
    month: number;             // 1-12 (1 = January)
    day: number;               // 1-31
  };
  
  // Examples:
  // US Standard: { month: 1, day: 1 }     → Jan 1
  // US Federal:  { month: 10, day: 1 }    → Oct 1
  // UK:          { month: 4, day: 6 }     → Apr 6
  // Australia:   { month: 7, day: 1 }     → Jul 1
  
  // Audit
  configuredAt: Date;
  configuredBy: string;
}

// Calculate fiscal periods
function getFiscalQuarter(date: Date, fiscalConfig: TenantFiscalYearConfig): number {
  const fiscalStart = new Date(date.getFullYear(), fiscalConfig.fiscalYearStart.month - 1, fiscalConfig.fiscalYearStart.day);
  
  // Adjust if date is before fiscal year start
  if (date < fiscalStart) {
    fiscalStart.setFullYear(fiscalStart.getFullYear() - 1);
  }
  
  const monthsFromStart = monthDiff(fiscalStart, date);
  return Math.floor(monthsFromStart / 3) + 1;
}

function getFiscalYear(date: Date, fiscalConfig: TenantFiscalYearConfig): number {
  const fiscalStart = new Date(date.getFullYear(), fiscalConfig.fiscalYearStart.month - 1, fiscalConfig.fiscalYearStart.day);
  
  if (date < fiscalStart) {
    return date.getFullYear();
  }
  return date.getFullYear() + (fiscalConfig.fiscalYearStart.month > 1 ? 1 : 0);
}
```

### Widget Context Integration

Widgets automatically receive dashboard context and filters.

```typescript
interface WidgetDataRequest {
  widgetId: string;
  
  // Dashboard context (if set)
  context?: {
    shardId?: string;          // From dashboard context
    shardTypeId?: string;
    customParams?: Record<string, any>;
  };
  
  // Dashboard filters (global)
  dashboardFilters?: {
    dateRange?: DateRangeValue;
    customFilters?: Record<string, any>;
  };
  
  // Widget-specific filters (override dashboard)
  widgetFilters?: Record<string, any>;
}

// Widget data source can reference context
interface WidgetDataSource {
  // ... existing fields
  
  // Use dashboard context
  useContext: boolean;
  contextMapping?: {
    // Map context values to query parameters
    // e.g., { 'projectId': 'context.shardId' }
    [queryParam: string]: string;
  };
  
  // Use dashboard date filter
  useDateFilter: boolean;
  dateFilterField?: string;    // Which field to apply date filter to
}
```

### Filter Persistence

```typescript
interface DashboardFilterState {
  dashboardId: string;
  userId: string;
  
  // Current filter values
  dateRange?: DateRangeValue;
  customFilters?: Record<string, any>;
  
  // Persistence
  persistFilters: boolean;     // Remember user's filter choices
  lastUpdated: Date;
}
```

---

## Widget System

### Widget Types

#### 1. Data Widgets

| Widget | Description | Configurable Options |
|--------|-------------|---------------------|
| **Counter** | Single metric display | Query, label, icon, color, format |
| **Chart** | Line, bar, pie, area charts | Query, chart type, colors, legend |
| **Table** | Tabular data display | Columns, sorting, pagination, filters |
| **List** | Simple item list | Query, item template, max items |
| **Gauge** | Progress/percentage display | Query, min/max, thresholds, colors |

#### 2. Shard Widgets

| Widget | Description | Configurable Options |
|--------|-------------|---------------------|
| **Recent Shards** | Latest created/updated | ShardType filter, count, fields to show |
| **Shard Activity** | Activity timeline | ShardType, date range, activity types |
| **Shard Stats** | Counts by type/status | Group by, filters, display format |
| **Shard Search** | Quick search box | Default ShardType, saved filters |
| **Shard Kanban** | Kanban board view | ShardType, status field, columns |

#### 3. User Widgets

| Widget | Description | Configurable Options |
|--------|-------------|---------------------|
| **Team Activity** | Team member actions | User filter, activity types, timeframe |
| **User Stats** | Login, actions metrics | Metrics to display, comparison period |
| **My Tasks** | User's assigned tasks | Status filter, due date range |
| **Notifications** | User notifications | Types, read/unread filter |

#### 4. Integration Widgets

| Widget | Description | Configurable Options |
|--------|-------------|---------------------|
| **External Data** | Data from integrations | Integration, endpoint, mapping |
| **Embed** | IFrame embed | URL, height, sandbox options |
| **Webhook Status** | Webhook health | Webhook IDs, show failures |

#### 5. Custom Widgets

| Widget | Description | Configurable Options |
|--------|-------------|---------------------|
| **Custom Query** | User-defined data query | Query builder, visualization type |
| **Markdown** | Static content | Markdown content |
| **Quick Links** | Navigation shortcuts | Links array, display style |

### Widget Data Source Configuration

```typescript
interface WidgetDataSource {
  // Data source type
  type: 'predefined' | 'custom' | 'integration';
  
  // For predefined queries
  predefinedQuery?: PredefinedQuery;
  
  // For custom queries
  customQuery?: {
    // Base query (ShardType, collection, etc.)
    target: string;
    
    // Filters
    filters: QueryFilter[];
    
    // Aggregation
    aggregation?: AggregationConfig;
    
    // Sorting
    sort?: SortConfig;
    
    // Limit
    limit?: number;
  };
  
  // For integrations
  integrationSource?: {
    integrationId: string;
    endpoint: string;
    parameters: Record<string, any>;
  };
  
  // User-configurable filter overrides
  allowUserFilters: boolean;
  defaultFilters?: QueryFilter[];
}

enum PredefinedQuery {
  RECENT_SHARDS = 'recent_shards',
  SHARD_COUNT_BY_TYPE = 'shard_count_by_type',
  SHARD_COUNT_BY_STATUS = 'shard_count_by_status',
  USER_ACTIVITY_TIMELINE = 'user_activity_timeline',
  TEAM_ACTIVITY_SUMMARY = 'team_activity_summary',
  MY_TASKS = 'my_tasks',
  UPCOMING_EVENTS = 'upcoming_events',
  RECENT_SEARCHES = 'recent_searches',
  STORAGE_USAGE = 'storage_usage',
  API_USAGE = 'api_usage'
}
```

### Widget Configuration Schema

```typescript
interface Widget {
  id: string;
  
  // Display
  name: string;
  description?: string;
  icon?: string;
  
  // Type
  type: WidgetType;
  
  // Data source
  dataSource: WidgetDataSource;
  
  // Visualization config (type-specific)
  config: WidgetConfig;
  
  // Layout
  position: GridPosition;
  size: GridSize;
  minSize?: GridSize;
  maxSize?: GridSize;
  
  // Refresh
  refreshInterval?: number;  // seconds, 0 = manual only
  
  // Permissions
  permissions: WidgetPermissions;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

interface GridPosition {
  x: number;  // Column (0-11 for 12-column grid)
  y: number;  // Row
}

interface GridSize {
  width: number;   // Columns (1-12)
  height: number;  // Rows (1-N)
}
```

---

## Component Standards

> 📖 **See full documentation:** [Component Standards Guide](../../guides/component-standards.md)

All widget components must follow the **Component Standards** to ensure:
- Reusability as both standalone components AND dashboard widgets
- Consistent behavior across the application
- Proper handling of loading, error, and empty states

### Key Requirements

#### 1. Widget-Compatible Interface

All components that can be used as widgets MUST implement the `WidgetCompatibleProps` interface:

```typescript
interface WidgetCompatibleProps<TData = unknown, TConfig = Record<string, unknown>> {
  data: TData;
  config?: TConfig;
  onRefresh?: () => void;
  isLoading?: boolean;
  error?: Error | null;
  widgetContext?: WidgetContext;
  className?: string;
}
```

#### 2. DataTable Standard

**All tables MUST use shadcn/ui DataTable** with the following required features:

| Feature | Required |
|---------|----------|
| Sorting | ✅ Yes |
| Filtering | ✅ Yes |
| Pagination | ✅ Yes |
| Column Visibility | ✅ Yes |
| Row Selection | ✅ Yes |
| Export (CSV/Excel) | ✅ Yes |

#### 3. Folder Structure

```
src/components/
├── widgets/           # Widget-compatible components
│   ├── data-table/   # DataTable with all features
│   ├── charts/       # Chart components
│   ├── counters/     # Counter/stat components
│   ├── lists/        # List components
│   ├── forms/        # Form components (Create/Edit/View)
│   ├── views/        # View components
│   └── search/       # Search components
├── dashboards/        # Dashboard-specific wrappers
└── ui/               # Base shadcn components
```

#### 4. Component Types

Components that MUST be widget-compatible:
- ✅ Data visualizations (charts, tables, lists)
- ✅ Activity feeds
- ✅ Statistics displays
- ✅ Task lists
- ✅ Search components
- ✅ Forms (Create/Edit)
- ✅ View components

---

## Permissions Model

### Dashboard Permissions

```typescript
interface DashboardPermissions {
  // Visibility level
  visibility: 'private' | 'tenant' | 'public';
  
  // Owner (always has full access)
  ownerId: string;
  ownerType: 'user' | 'tenant' | 'system';
  
  // Role-based access
  roles: {
    role: string;
    permission: DashboardPermissionLevel;
  }[];
  
  // User-specific access
  users: {
    userId: string;
    permission: DashboardPermissionLevel;
  }[];
  
  // Tenant restrictions (for system dashboards)
  allowedTenantIds?: string[];  // Empty = all tenants
}

enum DashboardPermissionLevel {
  VIEW = 'view',           // Can view dashboard
  INTERACT = 'interact',   // Can use filters, refresh
  CUSTOMIZE = 'customize', // Can reposition, hide widgets
  EDIT = 'edit',           // Can edit dashboard settings
  ADMIN = 'admin'          // Full control, can delete
}
```

### Widget Permissions

```typescript
interface WidgetPermissions {
  // Who can see this widget
  visibility: {
    // Role-based
    roles: string[];        // Roles that can see widget
    
    // User-specific
    userIds?: string[];     // Additional users who can see
    
    // Exclude specific users
    excludeUserIds?: string[];
  };
  
  // Data filtering based on user
  dataFiltering: {
    // Apply tenant isolation
    applyTenantFilter: boolean;
    
    // Apply user-specific data filter
    applyUserFilter: boolean;
    
    // Custom permission field
    permissionField?: string;  // e.g., 'acl.userId'
  };
  
  // Actions allowed
  actions: {
    canRefresh: boolean;
    canExport: boolean;
    canDrillDown: boolean;
    canConfigure: boolean;  // Change widget filters
  };
}
```

### Permission Resolution Flow

```
1. User requests dashboard
         │
         ▼
2. Check dashboard-level permission
         │
    ┌────┴────┐
    │ Denied  │ → 403 Forbidden
    └────┬────┘
         │ Allowed
         ▼
3. Load all widgets
         │
         ▼
4. For each widget:
   ├─ Check widget visibility (roles, users)
   │   └─ If denied → exclude from response
   │
   ├─ Apply data filtering
   │   ├─ Tenant isolation
   │   ├─ User-specific filter
   │   └─ ACL check
   │
   └─ Determine allowed actions
         │
         ▼
5. Return filtered dashboard with allowed widgets
```

---

## Groups & SSO Integration

### User Groups

Tenant Admin can create groups to organize users and assign permissions.

```typescript
interface UserGroup {
  id: string;
  tenantId: string;
  
  // Group info
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  
  // Source
  source: 'manual' | 'sso';
  
  // For SSO-synced groups
  ssoConfig?: {
    providerId: string;        // SSO provider ID
    externalGroupId: string;   // Group ID from SSO provider
    claimPath: string;         // Path to group claim (e.g., 'groups', 'roles')
    syncEnabled: boolean;      // Auto-sync membership
    lastSyncAt?: Date;
  };
  
  // Members (for manual groups)
  memberUserIds?: string[];
  
  // Audit
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}
```

### SSO Group Mapping

Tenant Admin configures how SSO groups map to platform groups.

```typescript
interface SSOGroupMappingConfig {
  tenantId: string;
  
  // SSO provider
  providerId: string;
  providerType: 'azure_ad' | 'okta' | 'google' | 'saml' | 'oidc';
  
  // Claim configuration
  groupClaim: {
    // Where to find groups in the token
    claimName: string;         // e.g., 'groups', 'roles', 'memberOf'
    claimType: 'array' | 'string';  // Array of groups or comma-separated
    separator?: string;        // For string type
  };
  
  // Mapping rules
  mappings: SSOGroupMapping[];
  
  // Auto-create groups from SSO
  autoCreateGroups: boolean;
  autoCreatePrefix?: string;   // Prefix for auto-created groups
  
  // Sync settings
  syncOnLogin: boolean;        // Sync groups on each login
  syncSchedule?: string;       // Cron for periodic sync
  
  // Audit
  configuredAt: Date;
  configuredBy: string;
}

interface SSOGroupMapping {
  // SSO group identifier
  externalGroupId: string;     // e.g., 'azure-ad-group-id' or 'Admin'
  externalGroupName?: string;  // Display name for reference
  
  // Platform group
  platformGroupId?: string;    // Existing group to map to
  createGroup?: {              // Or create new group
    name: string;
    description?: string;
  };
  
  // Mapping behavior
  addOnly: boolean;            // Only add users, never remove
}
```

### Dashboard Group Permissions

Tenant Admin assigns dashboard permissions to groups.

```typescript
interface DashboardPermissions {
  // ... existing fields
  
  // Group-based access (NEW)
  groups: {
    groupId: string;
    permission: DashboardPermissionLevel;
  }[];
}
```

### Permission Resolution with Groups

```
1. User requests dashboard
         │
         ▼
2. Get user's groups
   ├─ Manual groups (memberUserIds contains userId)
   └─ SSO groups (synced from provider)
         │
         ▼
3. Check dashboard permissions
   ├─ Direct user permission → Use highest level
   ├─ Role permission → Check user's roles
   ├─ Group permission → Check user's groups
   └─ Combine all → Use highest permission level
         │
         ▼
4. If any permission found → Access granted
   If no permission → 403 Forbidden
```

### Group Management API

```http
# List groups (Tenant Admin)
GET /api/groups
Query: ?source=manual|sso&search=...

# Create group (Tenant Admin)
POST /api/groups
Body: { name, description, memberUserIds? }

# Update group (Tenant Admin)
PATCH /api/groups/:id
Body: { name?, description?, memberUserIds? }

# Delete group (Tenant Admin)
DELETE /api/groups/:id

# Get group members
GET /api/groups/:id/members

# Add members to group
POST /api/groups/:id/members
Body: { userIds: [...] }

# Remove members from group
DELETE /api/groups/:id/members
Body: { userIds: [...] }

# Sync SSO groups (Tenant Admin)
POST /api/groups/sso/sync
```

### SSO Configuration API

```http
# Get SSO group mapping config (Tenant Admin)
GET /api/tenant/sso/group-mapping

# Update SSO group mapping config (Tenant Admin)
PATCH /api/tenant/sso/group-mapping
Body: { groupClaim, mappings, autoCreateGroups, syncOnLogin }

# Test SSO group mapping (Tenant Admin)
POST /api/tenant/sso/group-mapping/test
Body: { testToken: "..." }  // Returns extracted groups

# Sync all SSO groups now (Tenant Admin)
POST /api/tenant/sso/group-mapping/sync
```

### Example: Azure AD Group Setup

```typescript
// 1. Configure SSO group claim
const ssoConfig: SSOGroupMappingConfig = {
  tenantId: 'tenant-123',
  providerId: 'azure-ad-provider',
  providerType: 'azure_ad',
  
  groupClaim: {
    claimName: 'groups',       // Azure AD uses 'groups' claim
    claimType: 'array'
  },
  
  mappings: [
    {
      // Map Azure AD "Sales Team" to platform "Sales" group
      externalGroupId: 'azure-group-id-12345',
      externalGroupName: 'Sales Team',
      platformGroupId: 'platform-sales-group'
    },
    {
      // Auto-create group for "Engineering"
      externalGroupId: 'azure-group-id-67890',
      externalGroupName: 'Engineering',
      createGroup: {
        name: 'Engineering',
        description: 'Synced from Azure AD'
      }
    }
  ],
  
  autoCreateGroups: true,
  autoCreatePrefix: 'SSO: ',
  syncOnLogin: true
};

// 2. Assign dashboard permissions to groups
const dashboardPermissions: DashboardPermissions = {
  visibility: 'tenant',
  ownerId: 'tenant-123',
  ownerType: 'tenant',
  
  groups: [
    { groupId: 'platform-sales-group', permission: 'view' },
    { groupId: 'engineering-group', permission: 'edit' }
  ],
  
  roles: [
    { role: 'admin', permission: 'admin' }
  ],
  
  users: []
};
```

---

## Layout System

### Grid Specification

```typescript
interface GridConfig {
  // Column count (responsive)
  columns: {
    desktop: 12,    // >= 1024px
    tablet: 8,      // >= 768px
    mobile: 4       // < 768px
  };
  
  // Row height in pixels
  rowHeight: 80;
  
  // Gap between widgets
  gap: 16;
  
  // Container padding
  padding: 24;
  
  // Breakpoints
  breakpoints: {
    desktop: 1024,
    tablet: 768,
    mobile: 0
  };
}
```

### Widget Size Constraints

```typescript
// Default constraints by widget type
const widgetSizeDefaults: Record<WidgetType, SizeConstraints> = {
  counter: {
    default: { width: 3, height: 2 },
    min: { width: 2, height: 1 },
    max: { width: 6, height: 3 }
  },
  chart: {
    default: { width: 6, height: 4 },
    min: { width: 4, height: 3 },
    max: { width: 12, height: 8 }
  },
  table: {
    default: { width: 8, height: 5 },
    min: { width: 6, height: 3 },
    max: { width: 12, height: 10 }
  },
  list: {
    default: { width: 4, height: 4 },
    min: { width: 3, height: 2 },
    max: { width: 6, height: 8 }
  },
  // ... other types
};
```

### Responsive Behavior

```typescript
interface ResponsiveLayout {
  // Desktop layout (primary)
  desktop: WidgetPosition[];
  
  // Tablet layout (auto-generated or custom)
  tablet?: WidgetPosition[];
  
  // Mobile layout (auto-generated or custom)
  mobile?: WidgetPosition[];
}

// Auto-generation rules for smaller screens
const responsiveRules = {
  tablet: {
    // Widgets wider than 8 cols → full width (8)
    // Widgets 4-8 cols → keep or reduce
    // Widgets < 4 cols → keep
  },
  mobile: {
    // All widgets → full width (4)
    // Stack vertically in order
  }
};
```

### Drag and Drop Behavior

```typescript
interface DragDropConfig {
  // Snap to grid
  snapToGrid: true;
  
  // Show placement preview
  showPreview: true;
  
  // Allow overlap during drag
  allowOverlapDuringDrag: false;
  
  // Push other widgets when dropping
  pushOnDrop: true;
  
  // Compact layout (remove gaps)
  compactType: 'vertical' | 'horizontal' | null;
  
  // Prevent collision
  preventCollision: false;
}
```

---

## Templates

### Dashboard Templates

```typescript
interface DashboardTemplate {
  id: string;
  tenantId: string | null;  // null = system template
  
  // Template info
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  
  // Template content
  widgets: WidgetTemplate[];
  layout: ResponsiveLayout;
  settings: DashboardSettings;
  
  // Template metadata
  isPublic: boolean;
  isDefault: boolean;  // Auto-applied to new users/tenants
  
  // Usage tracking
  usageCount: number;
  
  // Audit
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

interface WidgetTemplate {
  // Widget config without IDs
  type: WidgetType;
  name: string;
  config: WidgetConfig;
  dataSource: WidgetDataSource;
  position: GridPosition;
  size: GridSize;
  permissions: WidgetPermissions;
  
  // Template-specific
  placeholder?: boolean;  // User must configure
  required?: boolean;     // Cannot be removed
}
```

### Template Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **General** | All-purpose dashboards | Home, Overview, Getting Started |
| **Sales** | Sales-focused | Pipeline, Forecasting, Leaderboard |
| **Projects** | Project management | Project Status, Timeline, Resources |
| **Analytics** | Data analysis | Metrics, Reports, Trends |
| **Admin** | Administration | User Management, System Health |

### Template Instantiation

```typescript
async function createDashboardFromTemplate(
  templateId: string,
  userId: string,
  tenantId: string,
  overrides?: Partial<Dashboard>
): Promise<Dashboard> {
  const template = await getTemplate(templateId);
  
  // Create new dashboard
  const dashboard: Dashboard = {
    id: generateId(),
    tenantId,
    ownerId: userId,
    ownerType: 'user',
    
    name: overrides?.name || template.name,
    description: template.description,
    
    // Copy widgets with new IDs
    widgets: template.widgets.map(w => ({
      ...w,
      id: generateId(),
      createdAt: new Date(),
      createdBy: userId
    })),
    
    layout: template.layout,
    settings: template.settings,
    
    // Source tracking
    templateId: template.id,
    templateVersion: template.version,
    
    // Initial version
    version: 1,
    
    createdAt: new Date(),
    createdBy: userId
  };
  
  return await saveDashboard(dashboard);
}
```

---

## Versioning

### Version Storage

```typescript
interface DashboardVersion {
  id: string;
  dashboardId: string;
  version: number;
  
  // Snapshot of dashboard at this version
  snapshot: {
    widgets: Widget[];
    layout: ResponsiveLayout;
    settings: DashboardSettings;
  };
  
  // Change summary
  changeSummary: string;
  changeType: 'widget_added' | 'widget_removed' | 'widget_updated' | 
              'layout_changed' | 'settings_changed' | 'bulk_update';
  
  // Audit
  createdAt: Date;
  createdBy: string;
}
```

### Version Management

```typescript
// Auto-save versions on significant changes
const versionTriggers = [
  'widget_added',
  'widget_removed',
  'widget_config_changed',
  'layout_reorganized',  // Multiple widget moves
  'settings_changed'
];

// Keep last N versions per dashboard
const maxVersionsToKeep = 50;

// Version cleanup policy
const versionRetention = {
  keepAll: '7d',           // Keep all versions for 7 days
  keepDaily: '30d',        // Then keep daily snapshots for 30 days
  keepWeekly: '90d',       // Then weekly for 90 days
  keepMonthly: 'forever'   // Then monthly forever
};
```

### Rollback Process

```typescript
async function rollbackDashboard(
  dashboardId: string,
  targetVersion: number,
  userId: string
): Promise<Dashboard> {
  // Get version snapshot
  const version = await getDashboardVersion(dashboardId, targetVersion);
  
  // Create new version with rollback
  const current = await getDashboard(dashboardId);
  
  const rolledBack: Dashboard = {
    ...current,
    widgets: version.snapshot.widgets,
    layout: version.snapshot.layout,
    settings: version.snapshot.settings,
    version: current.version + 1,
    updatedAt: new Date()
  };
  
  // Save with audit
  await saveDashboard(rolledBack);
  
  // Log to centralized audit system
  await auditLog.log({
    action: 'dashboard.rollback',
    entityType: 'dashboard',
    entityId: dashboardId,
    userId,
    details: {
      fromVersion: current.version,
      toVersion: targetVersion
    }
  });
  
  return rolledBack;
}
```

---

## Data Model

### Dashboard Shard Type (`c_dashboard`)

Dashboards are stored as Shards, following the "everything is a Shard" philosophy.

```typescript
interface DashboardStructuredData {
  // Display
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  
  // Type
  dashboardType: 'system' | 'tenant' | 'user';
  
  // Ownership
  ownerId: string;
  ownerType: 'user' | 'tenant' | 'system';
  
  // Flags
  isDefault: boolean;      // Default for owner's scope
  isTemplate: boolean;     // Can be instantiated
  isPublic: boolean;       // Visible to all in scope
  
  // Layout
  gridConfig: GridConfig;
  layout: ResponsiveLayout;
  
  // Settings
  settings: DashboardSettings;
  
  // Permissions
  permissions: DashboardPermissions;
  
  // Template source
  templateId?: string;
  templateVersion?: number;
  
  // Version
  version: number;
}

interface DashboardSettings {
  // Auto-refresh
  autoRefresh: boolean;
  autoRefreshInterval: number;  // seconds
  
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Density
  density: 'compact' | 'normal' | 'comfortable';
  
  // Show inherited widgets
  showInheritedWidgets: boolean;
  
  // Allow widget customization
  allowWidgetFilters: boolean;
}

interface DashboardStructuredData {
  // ... existing fields above
  
  // Context (NEW)
  context?: DashboardContext;
  
  // Filters (NEW)
  filters?: DashboardFilters;
}
```

### Widget Shard Type (`c_dashboardWidget`)

Widgets are stored as separate Shards with relationships to their parent dashboard.

```typescript
interface DashboardWidgetStructuredData {
  // Display
  name: string;
  description?: string;
  icon?: string;
  
  // Type
  widgetType: WidgetType;
  
  // Configuration
  config: WidgetConfig;
  
  // Data source
  dataSource: WidgetDataSource;
  
  // Layout
  position: GridPosition;
  size: GridSize;
  minSize?: GridSize;
  maxSize?: GridSize;
  
  // Refresh
  refreshInterval: number;
  
  // Permissions
  permissions: WidgetPermissions;
  
  // Flags
  isRequired: boolean;     // Cannot be removed (for templates)
  isPlaceholder: boolean;  // Needs configuration
}

// Relationship: Widget → Dashboard
// Type: 'belongs_to'
// Label: 'dashboard_widget'
```

### Cosmos DB Collections

```typescript
// Dashboards stored in 'shards' container
// Partition key: tenantId
// Type filter: shardTypeId = 'c_dashboard'

// Widgets stored in 'shards' container
// Partition key: tenantId
// Type filter: shardTypeId = 'c_dashboardWidget'
// Related via: relationships collection

// Versions stored in 'dashboard-versions' container
// Partition key: dashboardId
```

---

## API Reference

### Admin Endpoints (Super Admin)

```http
# Get global dashboard configuration
GET /api/admin/dashboard-config

# Update global dashboard configuration
PATCH /api/admin/dashboard-config
Body: { dashboardsEnabled, features, limits }

# Get tenant dashboard configuration
GET /api/admin/tenants/:tenantId/dashboard-config

# Update tenant dashboard configuration
PATCH /api/admin/tenants/:tenantId/dashboard-config
Body: { dashboardsEnabled, features, limits }

# Reset tenant to global defaults
DELETE /api/admin/tenants/:tenantId/dashboard-config
```

### Tenant Admin Endpoints

```http
# Get fiscal year configuration
GET /api/tenant/fiscal-year

# Update fiscal year configuration
PATCH /api/tenant/fiscal-year
Body: { fiscalYearStart: { month, day } }

# Get SSO group mapping
GET /api/tenant/sso/group-mapping

# Update SSO group mapping
PATCH /api/tenant/sso/group-mapping
Body: { groupClaim, mappings, autoCreateGroups, syncOnLogin }

# Sync SSO groups
POST /api/tenant/sso/group-mapping/sync
```

### Group Endpoints

```http
# List groups
GET /api/groups
Query: ?source=manual|sso&search=...

# Create group
POST /api/groups
Body: { name, description, memberUserIds? }

# Update group
PATCH /api/groups/:id
Body: { name?, description?, memberUserIds? }

# Delete group
DELETE /api/groups/:id

# Get group members
GET /api/groups/:id/members

# Add members to group
POST /api/groups/:id/members
Body: { userIds: [...] }

# Remove members from group
DELETE /api/groups/:id/members
Body: { userIds: [...] }
```

### Dashboard Endpoints

```http
# List dashboards
GET /api/dashboards
Query: ?type=user|tenant|system&includeTemplates=true&contextType=c_project

# Get merged dashboard (what user sees)
GET /api/dashboards/merged

# Get specific dashboard
GET /api/dashboards/:id

# Create dashboard
POST /api/dashboards
Body: { name, description, templateId?, widgets?, settings? }

# Update dashboard
PATCH /api/dashboards/:id
Body: { name?, description?, settings?, permissions? }

# Delete dashboard
DELETE /api/dashboards/:id

# Duplicate dashboard
POST /api/dashboards/:id/duplicate
Body: { name, copyWidgets: true }

# Set as default
POST /api/dashboards/:id/set-default
```

### Widget Endpoints

```http
# List widgets for dashboard
GET /api/dashboards/:id/widgets

# Add widget
POST /api/dashboards/:id/widgets
Body: { type, name, config, dataSource, position, size }

# Update widget
PATCH /api/dashboards/:id/widgets/:widgetId
Body: { name?, config?, dataSource?, position?, size? }

# Remove widget
DELETE /api/dashboards/:id/widgets/:widgetId

# Reorder widgets (batch update positions)
PATCH /api/dashboards/:id/widgets/reorder
Body: { positions: [{ widgetId, position }] }

# Get widget data
GET /api/dashboards/:id/widgets/:widgetId/data
Query: ?filters=...&refresh=true
```

### Template Endpoints

```http
# List templates
GET /api/dashboard-templates
Query: ?category=sales&isPublic=true

# Get template
GET /api/dashboard-templates/:id

# Create template (Super Admin / Tenant Admin)
POST /api/dashboard-templates
Body: { name, description, category, widgets, settings }

# Create dashboard from template
POST /api/dashboard-templates/:id/instantiate
Body: { name, overrides? }
```

### Version Endpoints

```http
# List versions
GET /api/dashboards/:id/versions
Query: ?limit=10&offset=0

# Get specific version
GET /api/dashboards/:id/versions/:version

# Rollback to version
POST /api/dashboards/:id/versions/:version/rollback

# Compare versions
GET /api/dashboards/:id/versions/compare
Query: ?from=5&to=8
```

---

## Real-Time Updates

### WebSocket Events

```typescript
// Subscribe to dashboard updates
ws.subscribe('dashboard:${dashboardId}');

// Events
interface DashboardWebSocketEvent {
  type: 'widget_data_updated' | 'widget_added' | 'widget_removed' |
        'layout_changed' | 'settings_changed' | 'permission_changed';
  dashboardId: string;
  widgetId?: string;
  payload: any;
  timestamp: Date;
  triggeredBy: string;
}

// Widget data update
{
  type: 'widget_data_updated',
  dashboardId: 'dash-123',
  widgetId: 'widget-456',
  payload: {
    data: [...],  // New data
    refreshedAt: '2025-11-30T12:00:00Z'
  }
}

// Layout change (another user moved widgets)
{
  type: 'layout_changed',
  dashboardId: 'dash-123',
  payload: {
    layout: {...},
    changedBy: 'user-789'
  }
}
```

### Widget Refresh Strategy

```typescript
interface WidgetRefreshConfig {
  // Per-widget interval
  interval: number;  // seconds, 0 = manual only
  
  // Smart refresh (skip if data unchanged)
  smartRefresh: boolean;
  
  // Pause when not visible
  pauseWhenHidden: boolean;
  
  // Stagger refresh (avoid thundering herd)
  staggerMs: number;
}

// Default refresh intervals by widget type
const defaultRefreshIntervals: Record<WidgetType, number> = {
  counter: 30,
  chart: 60,
  table: 60,
  list: 30,
  activity: 15,
  notifications: 10,
  // ...
};
```

---

## Implementation Roadmap

### Phase 1: Core Dashboard (MVP)

- [ ] `c_dashboard` ShardType definition
- [ ] `c_dashboardWidget` ShardType definition
- [ ] Dashboard CRUD API
- [ ] Widget CRUD API
- [ ] Basic grid layout (react-grid-layout)
- [ ] Dashboard list page
- [ ] Dashboard editor page
- [ ] Basic widgets: Counter, List, Table

### Phase 2: Feature Management & Limits

- [ ] Global dashboard feature flags
- [ ] Per-tenant configuration overrides
- [ ] Dashboard limits (per user, per tenant)
- [ ] Feature flag admin UI (Super Admin)
- [ ] Tenant config admin UI (Super Admin)

### Phase 3: Permissions & Groups

- [ ] Dashboard permissions system
- [ ] Widget-level permissions
- [ ] User groups CRUD
- [ ] Group-based dashboard permissions
- [ ] Permission resolution with groups
- [ ] Dashboard inheritance (system → tenant → user)
- [ ] User override storage

### Phase 4: SSO Group Integration

- [ ] SSO group claim parsing
- [ ] SSO group mapping configuration
- [ ] Auto-create groups from SSO
- [ ] Group sync on login
- [ ] SSO group mapping admin UI (Tenant Admin)

### Phase 5: Context & Filters

- [ ] Dashboard context (shard binding)
- [ ] Dashboard date filters
- [ ] Fiscal year configuration (Tenant Admin)
- [ ] Date preset calculations (fiscal quarters, fiscal year)
- [ ] Context passing to widgets
- [ ] Filter persistence per user

### Phase 6: Templates & Versioning

- [ ] Dashboard templates
- [ ] Template instantiation
- [ ] Version history storage
- [ ] Rollback functionality
- [ ] Version comparison UI

### Phase 7: Advanced Widgets

- [ ] Chart widgets (multiple types)
- [ ] Custom query builder
- [ ] Integration widgets
- [ ] Real-time data via WebSocket
- [ ] Widget refresh intervals
- [ ] Context-aware widget queries

### Phase 8: Polish

- [ ] Responsive layouts
- [ ] Mobile-optimized view
- [ ] Dashboard sharing UI
- [ ] Template gallery
- [ ] Dashboard import/export

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Mostly Complete** - Dashboard system implemented

#### Implemented Features (✅)

- ✅ Dashboard CRUD operations
- ✅ Widget system
- ✅ Drag-and-drop layout
- ✅ Real-time updates (WebSocket)
- ✅ Permission-aware dashboards
- ✅ Dashboard hierarchy (system, tenant, user)
- ✅ Widget catalog
- ✅ Dashboard service (1,332 lines)
- ✅ Widget data service
- ✅ Dashboard caching

#### Known Limitations

- ⚠️ **Dashboard Inheritance** - Inheritance model documented but may not be fully implemented
  - **Code Reference:**
    - `apps/api/src/services/dashboard.service.ts` - Dashboard service
  - **Recommendation:**
    1. Verify inheritance implementation
    2. Test inheritance scenarios
    3. Document inheritance behavior

- ⚠️ **Group-Based Permissions** - Group permissions may not be fully integrated
  - **Code Reference:**
    - Dashboard service may need group permission integration
  - **Recommendation:**
    1. Integrate group permissions
    2. Test group permission scenarios
    3. Document group permission behavior

- ⚠️ **Template System** - Templates documented but may not be fully implemented
  - **Code Reference:**
    - Template functionality may need completion
  - **Recommendation:**
    1. Complete template implementation
    2. Test template scenarios
    3. Document template behavior

### Code References

- **Backend Services:**
  - `apps/api/src/services/dashboard.service.ts` - Dashboard management (1,332 lines)
  - `apps/api/src/services/widget-data.service.ts` - Widget data
  - `apps/api/src/services/dashboard-cache.service.ts` - Dashboard caching

- **API Routes:**
  - `/api/v1/dashboards/*` - Dashboard management
  - `/api/v1/widget-catalog/*` - Widget catalog

- **Frontend:**
  - `apps/web/src/components/dashboards/` - Dashboard components
  - `apps/web/src/components/widgets/` - Widget components

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Component Standards](../guides/component-standards.md) - Widget-compatible components

---

## Related Documentation

- [Component Standards](../../guides/component-standards.md) - **Widget-compatible component patterns**
- [Widget Library](./widgets.md) - Available widget types
- [Shards System](../../shards/README.md) - Underlying data model
- [Permissions Model](../../guides/authentication.md) - Auth & permissions
- [User Groups](../../guides/user-groups.md) - Groups & SSO sync
- [Tenant Settings](../../guides/tenant-settings.md) - Fiscal year config
- [WebSocket Events](../../api/websocket.md) - Real-time updates

---

**Last Updated**: November 30, 2025  
**Version**: 1.0.0  
**Status**: Draft


# Component Standards Guide

> **Version:** 1.0.0  
> **Last Updated:** 2025-11-30

This guide defines the standards for building reusable, widget-compatible components in Castiel. Following these standards ensures components can be used both as standalone UI elements and as dashboard widgets.

---

## Table of Contents

- [Overview](#overview)
- [Widget-Compatible Props Interface](#widget-compatible-props-interface)
- [DataTable Standard](#datatable-standard)
- [Component Categories](#component-categories)
- [Folder Structure](#folder-structure)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)

---

## Overview

### Why Widget-Compatible Components?

Castiel's dashboard system allows users to build custom dashboards with various widgets. To enable this flexibility while maintaining code reuse, we follow a standardized component pattern where:

1. **Components are data-driven** - They receive data and configuration as props
2. **Components handle their own states** - Loading, error, and empty states
3. **Components are context-aware** - They can receive dashboard context (filters, date ranges)
4. **Components are standalone** - They work independently of the dashboard system

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Single Responsibility** | Each component does one thing well |
| **Props-Driven** | All data and config comes via props |
| **State Isolation** | Components manage their own loading/error states |
| **Composability** | Components can be nested and combined |
| **Accessibility** | All components must be keyboard accessible |

---

## Widget-Compatible Props Interface

All widget-compatible components **MUST** implement the `WidgetCompatibleProps` interface.

### Base Interface

```typescript
// Location: apps/web/src/types/widget-compatible.ts

export interface WidgetCompatibleProps<TData = unknown, TConfig = Record<string, unknown>> {
  /** Data to display in the component */
  data: TData;
  
  /** Component-specific configuration */
  config?: TConfig;
  
  /** Callback to refresh data */
  onRefresh?: () => void;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Error state */
  error?: Error | null;
  
  /** Dashboard-specific context (provided when used as a widget) */
  widgetContext?: WidgetContext;
  
  /** Optional className for styling */
  className?: string;
}
```

### Widget Context

When a component is used as a dashboard widget, it receives additional context:

```typescript
export interface WidgetContext {
  /** Current date range filter */
  dateRange?: DateRangeValue;
  
  /** Active filters from the dashboard */
  filters?: QueryFilter[];
  
  /** Dashboard context (e.g., linked shard ID) */
  dashboardContext?: {
    shardId?: string;
    shardTypeId?: string;
    customParams?: Record<string, unknown>;
  };
  
  /** Widget metadata */
  widgetId?: string;
  widgetType?: string;
  
  /** Interaction callbacks */
  onDrillDown?: (item: unknown) => void;
  onExport?: () => void;
}
```

### Specialized Interfaces

#### Form Components

```typescript
export interface WidgetFormProps<TData = unknown, TConfig = Record<string, unknown>> 
  extends WidgetCompatibleProps<TData, TConfig> {
  mode: 'create' | 'edit' | 'view';
  onSubmit?: (data: TData) => Promise<void>;
  onCancel?: () => void;
  readOnly?: boolean;
  errors?: Record<string, string>;
  isSubmitting?: boolean;
}
```

#### List Components

```typescript
export interface WidgetListProps<TItem = unknown, TConfig = Record<string, unknown>> 
  extends WidgetCompatibleProps<TItem[], TConfig> {
  emptyMessage?: string;
  onItemClick?: (item: TItem) => void;
  onItemSelect?: (items: TItem[]) => void;
  selectedItems?: TItem[];
  selectable?: boolean;
}
```

#### Chart Components

```typescript
export interface WidgetChartProps<TDataPoint = unknown, TConfig = Record<string, unknown>> 
  extends WidgetCompatibleProps<TDataPoint[], TConfig> {
  chartType?: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter';
  xAxis?: { key: string; label?: string; format?: (value: unknown) => string };
  yAxis?: { key: string; label?: string; format?: (value: unknown) => string };
  colors?: string[];
  showLegend?: boolean;
  showTooltips?: boolean;
}
```

---

## DataTable Standard

All tables in the application **MUST** be implemented using the standardized DataTable component with the following required features:

### Required Features

| Feature | Required | Description |
|---------|----------|-------------|
| Sorting | ✅ Yes | Click column headers to sort |
| Filtering | ✅ Yes | Global search + column filters |
| Pagination | ✅ Yes | Page size selection + navigation |
| Column Visibility | ✅ Yes | Toggle columns on/off |
| Row Selection | ✅ Yes | Single/multi-row selection |
| Export | ✅ Yes | CSV, Excel, JSON export |

### Usage

```tsx
import { 
  DataTable, 
  DataTableColumnHeader,
  createSelectColumn,
  type DataTableConfig 
} from '@/components/widgets/data-table'

// Define columns
const columns = [
  createSelectColumn<User>(), // Selection checkbox column
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    meta: {
      headerLabel: 'Name',
      exportable: true,
    },
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    meta: {
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  },
]

// Use the DataTable
function UsersTable({ users, isLoading }) {
  return (
    <DataTable
      data={users}
      columns={columns}
      isLoading={isLoading}
      config={{
        enableSorting: true,
        enableGlobalSearch: true,
        enableColumnFilters: true,
        enablePagination: true,
        defaultPageSize: 20,
        pageSizes: [10, 20, 50, 100],
        enableRowSelection: true,
        enableColumnVisibility: true,
        enableExport: true,
        exportFormats: ['csv', 'xlsx'],
        exportFilename: 'users-export',
      }}
      callbacks={{
        onRowClick: (row) => router.push(`/users/${row.id}`),
        onSelectionChange: (selected) => setSelectedUsers(selected),
      }}
      bulkActions={[
        {
          id: 'delete',
          label: 'Delete Selected',
          icon: Trash,
          variant: 'destructive',
          onClick: handleBulkDelete,
          confirmMessage: 'Delete selected users?',
        },
      ]}
      facetedFilters={[
        {
          columnId: 'status',
          title: 'Status',
          options: [
            { label: 'Active', value: 'active', icon: CheckCircle },
            { label: 'Inactive', value: 'inactive', icon: XCircle },
          ],
        },
      ]}
    />
  )
}
```

### Column Meta Configuration

```typescript
interface DataTableColumnMeta {
  /** Column header label (for column visibility dropdown) */
  headerLabel?: string;
  
  /** Column is filterable */
  filterable?: boolean;
  
  /** Filter type */
  filterType?: 'text' | 'select' | 'date' | 'number' | 'boolean';
  
  /** Filter options (for select type) */
  filterOptions?: { label: string; value: string; icon?: LucideIcon }[];
  
  /** Column is exportable */
  exportable?: boolean;
  
  /** Export format function */
  exportFormat?: (value: unknown) => string;
  
  /** Column alignment */
  align?: 'left' | 'center' | 'right';
}
```

---

## Component Categories

### 1. Counters/Statistics

Display numerical values with optional trends.

```tsx
import { StatCounter, StatCard } from '@/components/widgets/counters'

// Simple counter
<StatCounter
  data={{
    value: 1234,
    previousValue: 1100,
    label: "Total Users"
  }}
  config={{
    format: 'number',
    showTrend: true,
    size: 'lg',
  }}
/>

// Card-style stat
<StatCard
  data={{
    value: 1234,
    previousValue: 1100
  }}
  config={{
    title: "Total Users",
    description: "Active registered users",
    icon: Users,
    iconColorClass: "text-blue-500",
    iconBgClass: "bg-blue-100",
    format: 'compact',
    showTrend: true,
    trendLabel: "from last month",
  }}
/>
```

**Configuration Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `format` | `'number' \| 'currency' \| 'percentage' \| 'compact'` | `'number'` | Value format |
| `currency` | `string` | `'USD'` | Currency code |
| `decimals` | `number` | `0` | Decimal places |
| `showTrend` | `boolean` | `true` | Show trend indicator |
| `invertTrend` | `boolean` | `false` | Invert trend colors (lower is better) |

---

### 2. Charts

Data visualization components using pure SVG (no external library required).

```tsx
import { BarChart, PieChart, LineChart } from '@/components/widgets/charts'

// Bar Chart
<BarChart
  data={[
    { label: 'Jan', value: 100 },
    { label: 'Feb', value: 150 },
    { label: 'Mar', value: 120 },
  ]}
  config={{
    orientation: 'vertical',
    showDataLabels: true,
    showGrid: true,
    animate: true,
  }}
/>

// Pie/Donut Chart
<PieChart
  data={[
    { label: 'Category A', value: 30 },
    { label: 'Category B', value: 50 },
    { label: 'Category C', value: 20 },
  ]}
  config={{
    donut: true,
    showCenterLabel: true,
    showLegend: true,
    showPercentages: true,
  }}
/>

// Line Chart
<LineChart
  data={[
    { label: 'Jan', value: 100 },
    { label: 'Feb', value: 150 },
    { label: 'Mar', value: 120 },
    { label: 'Apr', value: 180 },
  ]}
  config={{
    curved: true,
    showArea: true,
    showPoints: true,
    showGrid: true,
  }}
/>
```

**Chart Configuration:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showLegend` | `boolean` | `true` | Show chart legend |
| `showTooltips` | `boolean` | `true` | Show hover tooltips |
| `showGrid` | `boolean` | `true` | Show grid lines |
| `colors` | `string[]` | Default palette | Custom color palette |
| `animate` | `boolean` | `true` | Enable animations |
| `valueFormatter` | `(v: number) => string` | `toLocaleString` | Value formatting |

---

### 3. Lists/Feeds

Activity feeds and generic lists with selection support.

```tsx
import { ActivityFeed, GenericList } from '@/components/widgets/lists'

// Activity Feed
<ActivityFeed
  data={[
    {
      id: '1',
      action: 'create',
      entityName: 'Project Alpha',
      entityLink: '/shards/123',
      userName: 'John Doe',
      timestamp: new Date(),
    },
  ]}
  config={{
    showAvatars: true,
    showTimestamps: true,
    timestampFormat: 'relative',
    showIcons: true,
    groupByDate: true,
    maxItems: 10,
  }}
  onItemClick={(item) => router.push(item.entityLink)}
/>

// Generic List
<GenericList
  data={[
    {
      id: '1',
      title: 'Project Alpha',
      subtitle: 'Due in 3 days',
      icon: Folder,
      badge: 'Active',
      badgeVariant: 'default',
      href: '/projects/1',
    },
  ]}
  config={{
    showAvatars: true,
    selectable: true,
    multiSelect: true,
    hoverEffect: true,
    showDividers: false,
  }}
  onSelectionChange={(selected) => setSelectedItems(selected)}
/>
```

**Activity Feed Actions:**

The following actions are supported out of the box with icons and colors:

| Action | Icon | Color |
|--------|------|-------|
| `create` | Plus | Green |
| `update` | Edit | Blue |
| `delete` | Trash | Red |
| `view` | FileText | Gray |
| `comment` | MessageSquare | Purple |
| `share` | Share2 | Orange |
| `assign` | UserPlus | Cyan |
| `complete` | CheckCircle | Emerald |
| `archive` | Archive | Amber |

---

## Folder Structure

```
apps/web/src/components/
├── widgets/                      # Widget-compatible components
│   ├── index.ts                  # Main exports
│   ├── data-table/               # DataTable component
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── data-table.tsx
│   │   ├── data-table-toolbar.tsx
│   │   ├── data-table-pagination.tsx
│   │   ├── data-table-column-header.tsx
│   │   ├── data-table-faceted-filter.tsx
│   │   ├── data-table-row-select.tsx
│   │   └── data-table-export.ts
│   ├── counters/                 # Counter/stat components
│   │   ├── index.ts
│   │   ├── stat-counter.tsx
│   │   └── stat-card.tsx
│   ├── charts/                   # Chart components
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── bar-chart.tsx
│   │   ├── pie-chart.tsx
│   │   └── line-chart.tsx
│   ├── lists/                    # List/feed components
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── activity-feed.tsx
│   │   └── generic-list.tsx
│   ├── forms/                    # Reusable form components
│   │   └── (future)
│   ├── views/                    # Detail view components
│   │   └── (future)
│   └── search/                   # Search components
│       └── (future)
├── dashboards/                   # Dashboard-specific wrappers
│   ├── widget-container.tsx      # Widget wrapper with header
│   ├── sortable-widget.tsx       # Drag-and-drop wrapper
│   └── widgets/                  # Dashboard widget adapters
│       └── ...
├── ui/                           # Base shadcn/ui primitives
│   └── ...
└── data-table/                   # Legacy (deprecated, re-exports widgets)
    └── ...
```

---

## Best Practices

### 1. Always Handle States

Every component must handle loading, error, and empty states:

```tsx
function MyComponent({ data, isLoading, error, onRefresh }: WidgetCompatibleProps<Data>) {
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-destructive text-sm">Error: {error.message}</p>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return <Skeleton className="h-full w-full" />
  }

  // Empty state
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    )
  }

  // Normal render
  return <div>...</div>
}
```

### 2. Use Skeleton Loading

Use `Skeleton` components that match the expected layout:

```tsx
if (isLoading) {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

### 3. Support className Override

Always spread `className` with `cn()`:

```tsx
function MyComponent({ className, ...props }: WidgetCompatibleProps) {
  return (
    <div className={cn("default-styles", className)}>
      ...
    </div>
  )
}
```

### 4. Export Types

Always export types alongside components:

```tsx
// index.ts
export { MyComponent } from './my-component'
export type { MyComponentProps, MyComponentConfig, MyComponentData } from './types'
```

### 5. Document with JSDoc

Use JSDoc comments for IDE support:

```tsx
/**
 * StatCard - Widget-compatible stat card with trend indicator
 * 
 * @example
 * ```tsx
 * <StatCard
 *   data={{ value: 1234, previousValue: 1100 }}
 *   config={{ title: "Users", showTrend: true }}
 * />
 * ```
 */
export function StatCard({ ... }: StatCardProps) {
  ...
}
```

---

## Migration Guide

### From Legacy DataTable

The old `@/components/data-table/data-table` is now a wrapper around the new widget DataTable. Existing code will continue to work, but you should migrate to the new API:

**Before (Legacy):**

```tsx
import { DataTable } from "@/components/data-table/data-table"

<DataTable
  columns={columns}
  data={data}
  searchKey="email"
  searchPlaceholder="Search users..."
  onRowClick={handleRowClick}
  isLoading={isLoading}
/>
```

**After (New):**

```tsx
import { DataTable } from "@/components/widgets/data-table"

<DataTable
  data={data}
  columns={columns}
  isLoading={isLoading}
  config={{
    enableGlobalSearch: true,
    enableExport: true,
    exportFormats: ['csv', 'xlsx'],
  }}
  callbacks={{
    onRowClick: handleRowClick,
  }}
/>
```

### Key Changes

| Legacy Prop | New Location |
|-------------|--------------|
| `searchKey` | Removed (uses global filter) |
| `searchPlaceholder` | Built-in "Search..." |
| `onRowClick` | `callbacks.onRowClick` |
| `isLoading` | Same |

---

## Related Documentation

- [Dashboard System](../features/dashboard/README.md) - Dashboard architecture
- [Widget Library](../features/dashboard/widgets.md) - Available widgets
- [Frontend Guide](../frontend/README.md) - Frontend development
- [Architecture](../ARCHITECTURE.md) - System architecture

---

## Changelog

### v1.0.0 (2025-11-30)

- Initial release
- DataTable with all 6 required features
- Counter/StatCard components
- Bar, Pie, Line charts
- ActivityFeed and GenericList
- Widget-compatible props interface

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Mostly Complete** - Component standards documented and implemented

#### Implemented Features (✅)

- ✅ Widget-compatible props interface
- ✅ DataTable standard with all required features
- ✅ Component categories defined
- ✅ Folder structure standards
- ✅ Best practices documented
- ✅ Migration guide provided

#### Known Limitations

- ⚠️ **Component Compliance** - Not all components may follow the widget-compatible pattern
  - **Code Reference:**
    - `apps/web/src/components/` - 388 components may need review
  - **Recommendation:**
    1. Audit all components for compliance
    2. Migrate non-compliant components
    3. Add linting rules to enforce standards

- ⚠️ **Accessibility** - Some components may lack proper accessibility features
  - **Recommendation:**
    1. Conduct accessibility audit
    2. Add ARIA labels where needed
    3. Test with screen readers

- ⚠️ **Responsive Design** - Some components may not be fully responsive
  - **Recommendation:**
    1. Test all components on mobile devices
    2. Ensure responsive design compliance
    3. Document responsive behavior

### Code References

- **Frontend Components:**
  - `apps/web/src/components/widgets/` - Widget-compatible components
  - `apps/web/src/components/dashboards/` - Dashboard components
  - `apps/web/src/types/widget-compatible.ts` - Widget-compatible types

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Frontend Documentation](../frontend/README.md) - Frontend implementation
- [Dashboard System](../features/dashboard/README.md) - Dashboard documentation

/**
 * Widget-Compatible Component Types
 * 
 * All reusable components that can be used as dashboard widgets
 * MUST implement these interfaces.
 * 
 * @see docs/guides/component-standards.md
 */

import type { DateRangeValue, QueryFilter } from './dashboard';

/**
 * Context provided to widgets by the dashboard
 */
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

/**
 * Standard props interface for widget-compatible components.
 * All components that can be used as dashboard widgets MUST implement this interface.
 * 
 * @template TData - Type of data the component displays
 * @template TConfig - Type of configuration options
 * 
 * @example
 * ```tsx
 * interface CounterData {
 *   value: number;
 *   label: string;
 * }
 * 
 * interface CounterConfig {
 *   format: 'number' | 'currency';
 * }
 * 
 * function Counter({ data, config, isLoading }: WidgetCompatibleProps<CounterData, CounterConfig>) {
 *   // ...
 * }
 * ```
 */
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

/**
 * Props for form-based widget components (Create/Edit/View modes)
 * 
 * @template TData - Type of data the form handles
 * @template TConfig - Type of configuration options
 * 
 * @example
 * ```tsx
 * function ShardForm({ data, mode, onSubmit }: WidgetFormProps<ShardData>) {
 *   if (mode === 'view') {
 *     return <ShardViewMode data={data} />;
 *   }
 *   return <ShardEditMode data={data} onSubmit={onSubmit} />;
 * }
 * ```
 */
export interface WidgetFormProps<TData = unknown, TConfig = Record<string, unknown>> 
  extends WidgetCompatibleProps<TData, TConfig> {
  /** Form mode: create, edit, or view */
  mode: 'create' | 'edit' | 'view';
  
  /** Submit handler for create/edit modes */
  onSubmit?: (data: TData) => Promise<void>;
  
  /** Cancel handler */
  onCancel?: () => void;
  
  /** Read-only mode (same as mode='view' but explicit) */
  readOnly?: boolean;
  
  /** Validation errors */
  errors?: Record<string, string>;
  
  /** Whether form is submitting */
  isSubmitting?: boolean;
}

/**
 * Props for list-based widget components
 * 
 * @template TItem - Type of items in the list
 * @template TConfig - Type of configuration options
 */
export interface WidgetListProps<TItem = unknown, TConfig = Record<string, unknown>> 
  extends WidgetCompatibleProps<TItem[], TConfig> {
  /** Empty state message */
  emptyMessage?: string;
  
  /** Item click handler */
  onItemClick?: (item: TItem) => void;
  
  /** Item selection handler */
  onItemSelect?: (items: TItem[]) => void;
  
  /** Selected items */
  selectedItems?: TItem[];
  
  /** Whether to show selection checkboxes */
  selectable?: boolean;
}

/**
 * Props for chart-based widget components
 * 
 * @template TDataPoint - Type of data points
 * @template TConfig - Type of configuration options
 */
export interface WidgetChartProps<TDataPoint = unknown, TConfig = Record<string, unknown>> 
  extends WidgetCompatibleProps<TDataPoint[], TConfig> {
  /** Chart type */
  chartType?: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter';
  
  /** X-axis configuration */
  xAxis?: {
    key: string;
    label?: string;
    format?: (value: unknown) => string;
  };
  
  /** Y-axis configuration */
  yAxis?: {
    key: string;
    label?: string;
    format?: (value: unknown) => string;
  };
  
  /** Color palette */
  colors?: string[];
  
  /** Show legend */
  showLegend?: boolean;
  
  /** Show tooltips */
  showTooltips?: boolean;
}

/**
 * DataTable configuration for widget-compatible tables
 * 
 * @see docs/guides/component-standards.md#datatable-standard
 */
export interface DataTableWidgetConfig {
  /** Columns that are sortable */
  sortableColumns?: string[];
  
  /** Columns that are filterable */
  filterableColumns?: string[];
  
  /** Default page size */
  defaultPageSize?: number;
  
  /** Available page sizes */
  pageSizes?: number[];
  
  /** Enable row selection */
  enableRowSelection?: boolean;
  
  /** Enable column visibility toggle */
  enableColumnVisibility?: boolean;
  
  /** Enable export functionality */
  enableExport?: boolean;
  
  /** Export formats */
  exportFormats?: ('csv' | 'xlsx')[];
  
  /** Enable global search */
  enableGlobalSearch?: boolean;
  
  /** Custom row actions */
  rowActions?: DataTableRowAction[];
}

/**
 * Row action for DataTable
 */
export interface DataTableRowAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: unknown) => void;
  variant?: 'default' | 'destructive';
  requiresSelection?: boolean;
  /** Show only when certain conditions are met */
  condition?: (row: unknown) => boolean;
}

/**
 * Type guard to check if component props are widget-compatible
 */
export function isWidgetCompatibleProps(props: unknown): props is WidgetCompatibleProps {
  return (
    typeof props === 'object' &&
    props !== null &&
    'data' in props
  );
}

/**
 * Type guard to check if component props are form-compatible
 */
export function isWidgetFormProps(props: unknown): props is WidgetFormProps {
  return (
    isWidgetCompatibleProps(props) &&
    'mode' in props &&
    ['create', 'edit', 'view'].includes((props as WidgetFormProps).mode)
  );
}












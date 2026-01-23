/**
 * DataTable Widget Types
 * 
 * Comprehensive type definitions for the widget-compatible DataTable
 * @see docs/guides/component-standards.md
 */

import type { ColumnDef, RowSelectionState, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import type { WidgetCompatibleProps, WidgetContext } from '@/types/widget-compatible';

/**
 * DataTable configuration
 */
export interface DataTableConfig {
  /** Enable sorting on columns */
  enableSorting?: boolean;
  
  /** Enable global search */
  enableGlobalSearch?: boolean;
  
  /** Enable column-specific filters */
  enableColumnFilters?: boolean;
  
  /** Enable pagination */
  enablePagination?: boolean;
  
  /** Default page size */
  defaultPageSize?: number;
  
  /** Available page sizes */
  pageSizes?: number[];
  
  /** Enable row selection */
  enableRowSelection?: boolean;
  
  /** Enable multi-row selection */
  enableMultiRowSelection?: boolean;
  
  /** Enable column visibility toggle */
  enableColumnVisibility?: boolean;
  
  /** Enable export functionality */
  enableExport?: boolean;
  
  /** Export formats available */
  exportFormats?: ExportFormat[];
  
  /** Export filename (without extension) */
  exportFilename?: string;
  
  /** Columns that can be hidden */
  hiddenColumns?: string[];
  
  /** Columns that are pinned */
  pinnedColumns?: { left?: string[]; right?: string[] };
  
  /** Show row numbers */
  showRowNumbers?: boolean;
  
  /** Striped rows */
  stripedRows?: boolean;
  
  /** Compact mode */
  compact?: boolean;
}

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'xlsx' | 'json';

/**
 * Row action definition
 */
export interface DataTableRowAction<TData = unknown> {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: TData) => void;
  variant?: 'default' | 'destructive';
  /** Only show when condition is met */
  condition?: (row: TData) => boolean;
  /** Requires row to be selected */
  requiresSelection?: boolean;
  /** Keyboard shortcut */
  shortcut?: string;
}

/**
 * Bulk action definition (for selected rows)
 */
export interface DataTableBulkAction<TData = unknown> {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (rows: TData[]) => void;
  variant?: 'default' | 'destructive';
  /** Minimum rows required */
  minRows?: number;
  /** Maximum rows allowed */
  maxRows?: number;
  /** Confirmation message */
  confirmMessage?: string;
}

/**
 * Faceted filter definition
 */
export interface FacetedFilter {
  columnId: string;
  title: string;
  options: FacetedFilterOption[];
}

/**
 * Faceted filter option
 */
export interface FacetedFilterOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}

/**
 * DataTable state (for controlled mode)
 */
export interface DataTableState {
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  globalFilter?: string;
  rowSelection?: RowSelectionState;
  columnVisibility?: Record<string, boolean>;
  pagination?: {
    pageIndex: number;
    pageSize: number;
  };
}

/**
 * DataTable callbacks
 */
export interface DataTableCallbacks<TData = unknown> {
  /** Row click handler */
  onRowClick?: (row: TData) => void;
  
  /** Row double-click handler */
  onRowDoubleClick?: (row: TData) => void;
  
  /** Selection change handler */
  onSelectionChange?: (selectedRows: TData[]) => void;
  
  /** Sort change handler */
  onSortingChange?: (sorting: SortingState) => void;
  
  /** Filter change handler */
  onFilterChange?: (filters: ColumnFiltersState) => void;
  
  /** Page change handler */
  onPageChange?: (page: number, pageSize: number) => void;
  
  /** Export handler (custom export logic) */
  onExport?: (format: ExportFormat, data: TData[]) => void;
}

/**
 * DataTable props - Widget Compatible
 */
export interface DataTableProps<TData = unknown>
  extends WidgetCompatibleProps<TData[], DataTableConfig> {
  /** Column definitions */
  columns: ColumnDef<TData, unknown>[];
  
  /** Row actions */
  rowActions?: DataTableRowAction<TData>[];
  
  /** Bulk actions (for selected rows) */
  bulkActions?: DataTableBulkAction<TData>[];
  
  /** Faceted filters */
  facetedFilters?: FacetedFilter[];
  
  /** Controlled state */
  state?: DataTableState;
  
  /** Callbacks */
  callbacks?: DataTableCallbacks<TData>;
  
  /** Get row ID function */
  getRowId?: (row: TData) => string;
  
  /** Total count for server-side pagination */
  totalCount?: number;
  
  /** Server-side mode */
  serverSide?: boolean;
  
  /** Toolbar slot (custom toolbar content) */
  toolbarSlot?: React.ReactNode;
  
  /** Empty state slot */
  emptySlot?: React.ReactNode;
  
  /** Loading skeleton row count */
  loadingRowCount?: number;
}

/**
 * Column meta for enhanced features
 */
export interface DataTableColumnMeta {
  /** Column header label */
  headerLabel?: string;
  
  /** Column is filterable */
  filterable?: boolean;
  
  /** Filter type */
  filterType?: 'text' | 'select' | 'date' | 'number' | 'boolean';
  
  /** Filter options (for select type) */
  filterOptions?: FacetedFilterOption[];
  
  /** Column is exportable */
  exportable?: boolean;
  
  /** Export format function */
  exportFormat?: (value: unknown) => string;
  
  /** Column alignment */
  align?: 'left' | 'center' | 'right';
  
  /** Column is sticky */
  sticky?: 'left' | 'right';
}

// Re-export useful types from tanstack
export type { ColumnDef, SortingState, ColumnFiltersState, RowSelectionState } from '@tanstack/react-table';












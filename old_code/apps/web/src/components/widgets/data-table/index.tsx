/**
 * DataTable Widget
 * 
 * A comprehensive, widget-compatible data table with all standard features:
 * - ✅ Sorting
 * - ✅ Filtering (global + column + faceted)
 * - ✅ Pagination
 * - ✅ Column visibility toggle
 * - ✅ Row selection
 * - ✅ Export (CSV/Excel/JSON)
 * 
 * @example
 * ```tsx
 * import { DataTable, DataTableColumnHeader, createSelectColumn } from '@/components/widgets/data-table'
 * 
 * const columns = [
 *   createSelectColumn<User>(),
 *   {
 *     accessorKey: 'name',
 *     header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
 *   },
 *   // ...more columns
 * ]
 * 
 * <DataTable
 *   data={users}
 *   columns={columns}
 *   config={{
 *     enableExport: true,
 *     exportFormats: ['csv', 'xlsx'],
 *   }}
 * />
 * ```
 * 
 * @see docs/guides/component-standards.md
 */

export { DataTable } from './data-table'
export { DataTableColumnHeader } from './data-table-column-header'
export { DataTablePagination } from './data-table-pagination'
export { DataTableToolbar } from './data-table-toolbar'
export { DataTableFacetedFilter } from './data-table-faceted-filter'
export { DataTableRowSelect, DataTableSelectAll } from './data-table-row-select'
export { exportToCSV, exportToExcel, exportToJSON } from './data-table-export'

// Re-export types
export * from './types'

// Helper to create a select column
import type { ColumnDef } from '@tanstack/react-table'
import { DataTableRowSelect, DataTableSelectAll } from './data-table-row-select'

/**
 * Creates a selection column for row selection
 */
export function createSelectColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: 'select',
    header: ({ table }) => <DataTableSelectAll table={table} />,
    cell: ({ row }) => <DataTableRowSelect row={row} />,
    enableSorting: false,
    enableHiding: false,
    size: 40,
    meta: {
      exportable: false,
    },
  }
}





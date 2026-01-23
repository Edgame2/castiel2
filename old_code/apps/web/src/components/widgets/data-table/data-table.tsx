"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { DataTableToolbar } from "./data-table-toolbar"
import { DataTablePagination } from "./data-table-pagination"
import type { DataTableProps } from "./types"

/**
 * DataTable Widget Component
 * 
 * A comprehensive, widget-compatible data table with:
 * - ✅ Sorting
 * - ✅ Filtering (global + column)
 * - ✅ Pagination
 * - ✅ Column visibility
 * - ✅ Row selection
 * - ✅ Export (CSV/Excel)
 * 
 * @see docs/guides/component-standards.md
 */
export function DataTable<TData>({
  // WidgetCompatibleProps
  data,
  config,
  isLoading,
  error,
  onRefresh,
  widgetContext,
  className,
  // DataTable specific
  columns,
  rowActions,
  bulkActions,
  facetedFilters,
  state: controlledState,
  callbacks,
  getRowId,
  totalCount,
  serverSide = false,
  toolbarSlot,
  emptySlot,
  loadingRowCount = 5,
}: DataTableProps<TData>) {
  // Default config
  const {
    enableSorting = true,
    enableGlobalSearch = true,
    enableColumnFilters = true,
    enablePagination = true,
    defaultPageSize = 10,
    pageSizes = [10, 20, 50, 100],
    enableRowSelection = true,
    enableMultiRowSelection = true,
    enableColumnVisibility = true,
    enableExport = true,
    exportFormats = ['csv', 'xlsx'],
    exportFilename = 'export',
    hiddenColumns = [],
    compact = false,
    stripedRows = false,
  } = config || {}

  // Internal state (used when not controlled)
  const [sorting, setSorting] = React.useState<SortingState>(
    controlledState?.sorting || []
  )
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    controlledState?.columnFilters || []
  )
  const [globalFilter, setGlobalFilter] = React.useState(
    controlledState?.globalFilter || ""
  )
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    controlledState?.columnVisibility || 
    hiddenColumns.reduce((acc, col) => ({ ...acc, [col]: false }), {})
  )
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    controlledState?.rowSelection || {}
  )
  const [pagination, setPagination] = React.useState({
    pageIndex: controlledState?.pagination?.pageIndex || 0,
    pageSize: controlledState?.pagination?.pageSize || defaultPageSize,
  })

  // Table instance
  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
      pagination,
    },
    enableRowSelection,
    enableMultiRowSelection,
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(newSorting)
      callbacks?.onSortingChange?.(newSorting)
    },
    onColumnFiltersChange: (updater) => {
      const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater
      setColumnFilters(newFilters)
      callbacks?.onFilterChange?.(newFilters)
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater
      setRowSelection(newSelection)
      // Get selected rows and call callback
      const selectedRows = Object.keys(newSelection)
        .filter(key => newSelection[key])
        .map(key => (data || [])[parseInt(key)])
        .filter(Boolean)
      callbacks?.onSelectionChange?.(selectedRows as TData[])
    },
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater
      setPagination(newPagination)
      callbacks?.onPageChange?.(newPagination.pageIndex, newPagination.pageSize)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableColumnFilters || enableGlobalSearch ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination && !serverSide ? getPaginationRowModel() : undefined,
    getRowId,
    manualPagination: serverSide,
    manualSorting: serverSide,
    manualFiltering: serverSide,
    pageCount: serverSide && totalCount ? Math.ceil(totalCount / pagination.pageSize) : undefined,
  })

  // Get selected rows for bulk actions
  const selectedRows = React.useMemo(() => {
    return table.getSelectedRowModel().rows.map(row => row.original)
  }, [table.getSelectedRowModel().rows])

  // Handle error state
  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-10 gap-4", className)}>
        <p className="text-destructive">Error loading data: {error.message}</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <DataTableToolbar
        table={table}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        enableGlobalSearch={enableGlobalSearch}
        enableColumnVisibility={enableColumnVisibility}
        enableExport={enableExport}
        exportFormats={exportFormats}
        exportFilename={exportFilename}
        facetedFilters={facetedFilters}
        bulkActions={bulkActions}
        selectedRows={selectedRows}
        onRefresh={onRefresh}
        isLoading={isLoading}
        toolbarSlot={toolbarSlot}
      />

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      compact && "py-2",
                      (header.column.columnDef.meta as any)?.align === 'center' && "text-center",
                      (header.column.columnDef.meta as any)?.align === 'right' && "text-right"
                    )}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              [...Array(loadingRowCount)].map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {columns.map((_, cellIndex) => (
                    <TableCell key={`skeleton-cell-${cellIndex}`} className={cn(compact && "py-2")}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => callbacks?.onRowClick?.(row.original)}
                  onDoubleClick={() => callbacks?.onRowDoubleClick?.(row.original)}
                  className={cn(
                    callbacks?.onRowClick && "cursor-pointer",
                    stripedRows && index % 2 === 1 && "bg-muted/50"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        compact && "py-2",
                        (cell.column.columnDef.meta as any)?.align === 'center' && "text-center",
                        (cell.column.columnDef.meta as any)?.align === 'right' && "text-right"
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              // Empty state
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptySlot || "No results found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <DataTablePagination
          table={table}
          pageSizes={pageSizes}
          totalCount={serverSide ? totalCount : undefined}
        />
      )}
    </div>
  )
}












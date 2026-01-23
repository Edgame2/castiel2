"use client"

import * as React from "react"
import { Table } from "@tanstack/react-table"
import {
  Search,
  X,
  SlidersHorizontal,
  Download,
  RefreshCw,
  ChevronDown,
  Check,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

import { DataTableFacetedFilter } from "./data-table-faceted-filter"
import { exportToCSV, exportToExcel, exportToJSON } from "./data-table-export"
import type { DataTableBulkAction, FacetedFilter, ExportFormat } from "./types"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  globalFilter: string
  setGlobalFilter: (value: string) => void
  enableGlobalSearch?: boolean
  enableColumnVisibility?: boolean
  enableExport?: boolean
  exportFormats?: ExportFormat[]
  exportFilename?: string
  facetedFilters?: FacetedFilter[]
  bulkActions?: DataTableBulkAction<TData>[]
  selectedRows: TData[]
  onRefresh?: () => void
  isLoading?: boolean
  toolbarSlot?: React.ReactNode
}

export function DataTableToolbar<TData>({
  table,
  globalFilter,
  setGlobalFilter,
  enableGlobalSearch = true,
  enableColumnVisibility = true,
  enableExport = true,
  exportFormats = ['csv', 'xlsx'],
  exportFilename = 'export',
  facetedFilters,
  bulkActions,
  selectedRows,
  onRefresh,
  isLoading,
  toolbarSlot,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter.length > 0
  const hasSelectedRows = selectedRows.length > 0

  // Handle export
  const handleExport = (format: ExportFormat) => {
    const rows = table.getFilteredRowModel().rows.map(row => row.original)
    const columns = table.getAllColumns()
      .filter(col => col.getIsVisible() && (col.columnDef.meta as any)?.exportable !== false)
      .map(col => ({
        id: col.id,
        header: typeof col.columnDef.header === 'string' 
          ? col.columnDef.header 
          : (col.columnDef.meta as any)?.headerLabel || col.id,
        accessor: (row: TData) => {
          const value = (row as Record<string, unknown>)[col.id]
          return (col.columnDef.meta as any)?.exportFormat 
            ? (col.columnDef.meta as any).exportFormat(value)
            : value
        },
      }))

    switch (format) {
      case 'csv':
        exportToCSV(rows, columns, exportFilename)
        break
      case 'xlsx':
        exportToExcel(rows, columns, exportFilename)
        break
      case 'json':
        exportToJSON(rows, exportFilename)
        break
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          {/* Global Search */}
          {enableGlobalSearch && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="h-9 w-[200px] lg:w-[300px] pl-8"
              />
              {globalFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => setGlobalFilter("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Faceted Filters */}
          {facetedFilters?.map((filter) => {
            const column = table.getColumn(filter.columnId)
            if (!column) return null
            return (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={column}
                title={filter.title}
                options={filter.options}
              />
            )
          })}

          {/* Reset Filters */}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => {
                table.resetColumnFilters()
                setGlobalFilter("")
              }}
              className="h-9 px-2 lg:px-3"
            >
              Reset
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Custom toolbar slot */}
          {toolbarSlot}

          {/* Refresh button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-9"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          )}

          {/* Export dropdown */}
          {enableExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {exportFormats.includes('csv') && (
                  <DropdownMenuItem onClick={() => handleExport('csv' as any)}>
                    CSV (.csv)
                  </DropdownMenuItem>
                )}
                {exportFormats.includes('xlsx') && (
                  <DropdownMenuItem onClick={() => handleExport('xlsx' as any)}>
                    Excel (.xlsx)
                  </DropdownMenuItem>
                )}
                {exportFormats.includes('json') && (
                  <DropdownMenuItem onClick={() => handleExport('json' as any)}>
                    JSON (.json)
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Column visibility */}
          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Columns
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter(
                    (column) =>
                      typeof column.accessorFn !== "undefined" && column.getCanHide()
                  )
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {(column.columnDef.meta as any)?.headerLabel || column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Bulk actions bar (shown when rows are selected) */}
      {hasSelectedRows && bulkActions && bulkActions.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
          <Badge variant="secondary">
            {selectedRows.length} selected
          </Badge>
          <Separator orientation="vertical" className="h-6" />
          {bulkActions.map((action) => {
            const isDisabled = !!(
              (action.minRows && selectedRows.length < action.minRows) ||
              (action.maxRows && selectedRows.length > action.maxRows)
            )

            return (
              <Button
                key={action.id}
                variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => {
                  if (action.confirmMessage) {
                    if (window.confirm(action.confirmMessage)) {
                      action.onClick(selectedRows)
                    }
                  } else {
                    action.onClick(selectedRows)
                  }
                }}
                disabled={isDisabled}
              >
                {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                {action.label}
              </Button>
            )
          })}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.toggleAllRowsSelected(false)}
          >
            Clear selection
          </Button>
        </div>
      )}
    </div>
  )
}












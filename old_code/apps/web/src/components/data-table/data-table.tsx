"use client"

/**
 * Legacy DataTable Component
 * 
 * This is a backward-compatible wrapper around the new widget DataTable.
 * For new code, prefer importing from '@/components/widgets/data-table'.
 * 
 * @deprecated Use `DataTable` from '@/components/widgets/data-table' instead
 */

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable as WidgetDataTable } from "@/components/widgets/data-table"
import type { DataTableBulkAction } from "@/components/widgets/data-table"

export type { DataTableBulkAction }

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  onRowClick?: (row: TData) => void
  isLoading?: boolean
  bulkActions?: DataTableBulkAction<TData>[]
}

/**
 * @deprecated Use `DataTable` from '@/components/widgets/data-table' instead.
 * This component is maintained for backward compatibility.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  onRowClick,
  isLoading = false,
  bulkActions,
}: DataTableProps<TData, TValue>) {
  return (
    <WidgetDataTable
      data={data}
      columns={columns as ColumnDef<TData, unknown>[]}
      isLoading={isLoading}
      config={{
        enableGlobalSearch: !!searchKey,
        enableRowSelection: true,
        enableColumnVisibility: true,
        enableExport: true,
        exportFormats: ['csv', 'xlsx'],
      }}
      callbacks={{
        onRowClick,
      }}
      bulkActions={bulkActions as DataTableBulkAction<TData>[]}
    />
  )
}

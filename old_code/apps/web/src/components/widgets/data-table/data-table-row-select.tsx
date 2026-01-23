"use client"

import { Row, Table } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"

interface DataTableRowSelectProps<TData> {
  row: Row<TData>
}

interface DataTableSelectAllProps<TData> {
  table: Table<TData>
}

/**
 * Checkbox for individual row selection
 */
export function DataTableRowSelect<TData>({
  row,
}: DataTableRowSelectProps<TData>) {
  return (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
      aria-label="Select row"
      className="translate-y-[2px]"
    />
  )
}

/**
 * Checkbox for selecting all rows (header)
 */
export function DataTableSelectAll<TData>({
  table,
}: DataTableSelectAllProps<TData>) {
  return (
    <Checkbox
      checked={
        table.getIsAllPageRowsSelected() ||
        (table.getIsSomePageRowsSelected() && "indeterminate")
      }
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
      className="translate-y-[2px]"
    />
  )
}












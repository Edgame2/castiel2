"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Widget } from "@/types/dashboard"

interface TableWidgetProps {
  widget: Widget
  data: unknown
}

interface TableConfig {
  columns: Array<{
    key: string
    label: string
    type?: 'text' | 'number' | 'date' | 'badge' | 'link'
    format?: string
  }>
}

export function TableWidget({ widget, data }: TableWidgetProps) {
  const config = widget.config as unknown as unknown as TableConfig
  const rows = Array.isArray(data) ? data : []
  const columns = config?.columns || []

  // Auto-detect columns if not configured
  const displayColumns = columns.length > 0 
    ? columns 
    : rows.length > 0 
      ? Object.keys(rows[0]).slice(0, 5).map(key => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          type: 'text' as const,
        }))
      : []

  const formatCell = (value: unknown, column: typeof displayColumns[0]): React.ReactNode => {
    if (value === null || value === undefined) return '-'

    switch (column.type) {
      case 'number':
        return typeof value === 'number' 
          ? new Intl.NumberFormat().format(value) 
          : String(value)
      case 'date':
        return value instanceof Date || typeof value === 'string'
          ? new Date(value as string).toLocaleDateString()
          : String(value)
      case 'badge':
        return <Badge variant="outline">{String(value)}</Badge>
      case 'link':
        return (
          <a 
            href={String(value)} 
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {String(value)}
          </a>
        )
      default:
        return String(value)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <Table>
        <TableHeader>
          <TableRow>
            {displayColumns.map((column) => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              {displayColumns.map((column) => (
                <TableCell key={column.key}>
                  {formatCell((row as Record<string, unknown>)[column.key], column)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}












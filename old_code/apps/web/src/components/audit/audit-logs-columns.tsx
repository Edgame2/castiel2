'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/widgets/data-table/data-table-column-header'
import {
  Eye,
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  User,
  Key,
  Users,
  Building,
  Database,
  Edit,
  Settings,
  Globe,
} from 'lucide-react'
import type { AuditLogEntry } from '@/hooks/use-audit-logs'
import type { FacetedFilter, FacetedFilterOption } from '@/components/widgets/data-table/types'

// Re-export type for convenience
export type { AuditLogEntry }

// Severity configuration
export const severityConfig: Record<string, { color: string; icon: typeof Info }> = {
  info: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: Info },
  warning: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: AlertTriangle },
  error: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: AlertCircle },
  critical: { color: 'bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-200', icon: Shield },
}

// Outcome configuration
export const outcomeConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
  success: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: CheckCircle },
  failure: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: XCircle },
  partial: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: AlertTriangle },
}

// Category icons
export const categoryIcons: Record<string, typeof User> = {
  authentication: Key,
  authorization: Shield,
  user_management: Users,
  tenant_management: Building,
  data_access: Database,
  data_modification: Edit,
  system: Settings,
  security: Shield,
  api: Globe,
}

// Labels
export const severityLabels: Record<string, string> = {
  info: 'Info',
  warning: 'Warning',
  error: 'Error',
  critical: 'Critical',
}

export const outcomeLabels: Record<string, string> = {
  success: 'Success',
  failure: 'Failure',
  partial: 'Partial',
}

export const categoryLabels: Record<string, string> = {
  authentication: 'Authentication',
  authorization: 'Authorization',
  user_management: 'User Management',
  tenant_management: 'Tenant Management',
  data_access: 'Data Access',
  data_modification: 'Data Modification',
  system: 'System',
  security: 'Security',
  api: 'API',
}

// Format event type for display
export const formatEventType = (type: string) =>
  type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

// Faceted filter options
export const categoryFilterOptions: FacetedFilterOption[] = Object.entries(categoryLabels).map(
  ([value, label]) => ({
    value,
    label,
    icon: categoryIcons[value],
  })
)

export const severityFilterOptions: FacetedFilterOption[] = Object.entries(severityLabels).map(
  ([value, label]) => ({
    value,
    label,
    icon: severityConfig[value]?.icon,
  })
)

export const outcomeFilterOptions: FacetedFilterOption[] = Object.entries(outcomeLabels).map(
  ([value, label]) => ({
    value,
    label,
    icon: outcomeConfig[value]?.icon,
  })
)

// Faceted filters configuration
export const auditLogFacetedFilters: FacetedFilter[] = [
  {
    columnId: 'category',
    title: 'Category',
    options: categoryFilterOptions,
  },
  {
    columnId: 'severity',
    title: 'Severity',
    options: severityFilterOptions,
  },
  {
    columnId: 'outcome',
    title: 'Outcome',
    options: outcomeFilterOptions,
  },
]

// Column options interface
export interface ColumnOptions {
  onViewDetails: (log: AuditLogEntry) => void
}

/**
 * Create audit log columns for the DataTable widget
 */
export function createAuditLogColumns({
  onViewDetails,
}: ColumnOptions): ColumnDef<AuditLogEntry>[] {
  return [
    // Selection column
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
      meta: {
        exportable: false,
      },
    },
    // Timestamp column
    {
      accessorKey: 'timestamp',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Timestamp" />
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue('timestamp'))
        return (
          <div className="flex flex-col">
            <span className="font-mono text-sm">
              {date.toLocaleDateString()}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {date.toLocaleTimeString()}
            </span>
          </div>
        )
      },
      meta: {
        headerLabel: 'Timestamp',
        exportable: true,
        exportFormat: (value: unknown) => {
          if (typeof value === 'string') {
            return new Date(value).toISOString()
          }
          return ''
        },
      },
    },
    // Event Type column
    {
      accessorKey: 'eventType',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Event" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col max-w-[300px]">
          <span className="font-medium truncate">
            {formatEventType(row.getValue('eventType'))}
          </span>
          <span className="text-sm text-muted-foreground truncate">
            {row.original.message}
          </span>
        </div>
      ),
      meta: {
        headerLabel: 'Event',
        exportable: true,
      },
    },
    // Actor column
    {
      accessorKey: 'actorEmail',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Actor" />
      ),
      cell: ({ row }) => {
        const email = row.original.actorEmail
        const actorType = row.original.actorType
        return (
          <div className="flex flex-col">
            <span className="truncate max-w-[180px]">
              {email || 'System'}
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              {actorType}
            </span>
          </div>
        )
      },
      meta: {
        headerLabel: 'Actor',
        exportable: true,
        filterable: true,
        filterType: 'text',
      },
    },
    // Category column
    {
      accessorKey: 'category',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) => {
        const category = row.getValue('category') as string
        const CategoryIcon = categoryIcons[category] || Settings
        return (
          <Badge variant="outline" className="gap-1">
            <CategoryIcon className="h-3 w-3" />
            {categoryLabels[category] || category}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      meta: {
        headerLabel: 'Category',
        exportable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: categoryFilterOptions,
      },
    },
    // Severity column
    {
      accessorKey: 'severity',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Severity" />
      ),
      cell: ({ row }) => {
        const severity = row.getValue('severity') as keyof typeof severityConfig
        const config = severityConfig[severity]
        const SeverityIcon = config?.icon || Info
        return (
          <Badge className={config?.color}>
            <SeverityIcon className="mr-1 h-3 w-3" />
            {severityLabels[severity] || severity}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      meta: {
        headerLabel: 'Severity',
        exportable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: severityFilterOptions,
      },
    },
    // Outcome column
    {
      accessorKey: 'outcome',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Outcome" />
      ),
      cell: ({ row }) => {
        const outcome = row.getValue('outcome') as keyof typeof outcomeConfig
        const config = outcomeConfig[outcome]
        const OutcomeIcon = config?.icon || Info
        return (
          <Badge className={config?.color}>
            <OutcomeIcon className="mr-1 h-3 w-3" />
            {outcomeLabels[outcome] || outcome}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      meta: {
        headerLabel: 'Outcome',
        exportable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: outcomeFilterOptions,
      },
    },
    // IP Address column (hidden by default)
    {
      accessorKey: 'ipAddress',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="IP Address" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.ipAddress || '-'}
        </span>
      ),
      meta: {
        headerLabel: 'IP Address',
        exportable: true,
      },
    },
    // Actions column
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onViewDetails(row.original)
          }}
          title="View details"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">View details</span>
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 50,
      meta: {
        exportable: false,
      },
    },
  ]
}

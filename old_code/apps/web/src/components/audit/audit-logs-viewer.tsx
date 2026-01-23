'use client'

import { useState, useMemo, useCallback } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import {
	Shield,
	AlertTriangle,
	CheckCircle,
	Activity,
	CalendarIcon,
	Trash2,
	FileText,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { DataTable } from '@/components/widgets/data-table'
import {
	useAuditLogs,
	useAuditLogStats,
	useExportAuditLogs,
	type AuditLogEntry,
} from '@/hooks/use-audit-logs'
import {
	createAuditLogColumns,
	auditLogFacetedFilters,
	severityConfig,
	outcomeConfig,
	categoryLabels,
	severityLabels,
	outcomeLabels,
	formatEventType,
} from './audit-logs-columns'
import type { SortingState, ColumnFiltersState } from '@tanstack/react-table'
import type { DataTableBulkAction } from '@/components/widgets/data-table/types'

export type { AuditLogEntry }

interface DateRange {
	from: Date | undefined
	to: Date | undefined
}

interface AuditLogsViewProps {
	/** Compact mode for dashboard widget */
	compact?: boolean
	/** Initial page size */
	defaultPageSize?: number
	/** Hide stats cards */
	hideStats?: boolean
}

export function AuditLogsView({
	compact = false,
	defaultPageSize = 20,
	hideStats = false,
}: AuditLogsViewProps) {
	// State
	const [page, setPage] = useState(0)
	const [pageSize, setPageSize] = useState(defaultPageSize)
	const [sorting, setSorting] = useState<SortingState>([
		{ id: 'timestamp', desc: true },
	])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
	const [dateRange, setDateRange] = useState<DateRange>({
		from: undefined,
		to: undefined,
	})
	const [selectedRows, setSelectedRows] = useState<AuditLogEntry[]>([])

	// Build filters from date range
	const filters = useMemo(() => ({
		startDate: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
		endDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
	}), [dateRange])

	// Queries
	const { data: logsData, isLoading, refetch, error } = useAuditLogs({
		page,
		pageSize,
		sorting,
		columnFilters,
		filters,
	})

	const { data: stats } = useAuditLogStats()
	const exportMutation = useExportAuditLogs()

	// Columns
	const columns = useMemo(
		() => createAuditLogColumns({ onViewDetails: setSelectedLog }),
		[]
	)

	// Bulk actions
	const bulkActions: DataTableBulkAction<AuditLogEntry>[] = useMemo(() => [
		{
			id: 'export-selected',
			label: 'Export Selected',
			icon: FileText,
			onClick: (rows) => {
				// Export selected rows as JSON
				const data = JSON.stringify(rows, null, 2)
				const blob = new Blob([data], { type: 'application/json' })
				const url = window.URL.createObjectURL(blob)
				const a = document.createElement('a' as any)
				a.href = url
				a.download = `audit-logs-selected-${new Date().toISOString().split('T' as any)[0]}.json`
				document.body.appendChild(a)
				a.click()
				window.URL.revokeObjectURL(url)
				document.body.removeChild(a)
			},
			minRows: 1,
		},
	], [])

	// Callbacks
	const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
		setPage(newPage)
		setPageSize(newPageSize)
	}, [])

	const handleSortingChange = useCallback((newSorting: SortingState) => {
		setSorting(newSorting)
		setPage(0) // Reset to first page on sort
	}, [])

	const handleFilterChange = useCallback((newFilters: ColumnFiltersState) => {
		setColumnFilters(newFilters)
		setPage(0) // Reset to first page on filter
	}, [])

	const handleSelectionChange = useCallback((rows: AuditLogEntry[]) => {
		setSelectedRows(rows)
	}, [])

	// Date range picker toolbar slot
	const dateRangeSlot = (
		<div className="flex items-center gap-2">
			<div className="flex items-center gap-1.5">
				<CalendarIcon className="h-4 w-4 text-muted-foreground" />
				<Input
					type="date"
					className="h-9 w-[130px]"
					value={dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
					onChange={(e) => {
						const newFrom = e.target.value ? new Date(e.target.value) : undefined
						setDateRange(prev => ({ ...prev, from: newFrom }))
						setPage(0)
					}}
					placeholder="From"
				/>
				<span className="text-muted-foreground">to</span>
				<Input
					type="date"
					className="h-9 w-[130px]"
					value={dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
					onChange={(e) => {
						const newTo = e.target.value ? new Date(e.target.value) : undefined
						setDateRange(prev => ({ ...prev, to: newTo }))
						setPage(0)
					}}
					placeholder="To"
				/>
			</div>
			{(dateRange.from || dateRange.to) && (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => {
						setDateRange({ from: undefined, to: undefined })
						setPage(0)
					}}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			)}
		</div>
	)

	// Compact mode for dashboard widget
	if (compact) {
		return (
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
						<Badge variant="secondary">
							{logsData?.total || 0} events
						</Badge>
					</div>
				</CardHeader>
				<CardContent>
					<DataTable
						data={logsData?.logs || []}
						columns={columns}
						isLoading={isLoading}
						error={error instanceof Error ? error : undefined}
						onRefresh={refetch}
						config={{
							enableGlobalSearch: false,
							enableColumnVisibility: false,
							enableExport: false,
							enableRowSelection: false,
							enablePagination: true,
							defaultPageSize: 5,
							compact: true,
						}}
						callbacks={{
							onRowClick: setSelectedLog,
						}}
					/>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			{/* Stats Cards */}
			{!hideStats && stats && (
				<div className="grid gap-4 md:grid-cols-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Total Events</CardTitle>
							<Activity className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</div>
							<p className="text-xs text-muted-foreground">Last 30 days</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Success Rate</CardTitle>
							<CheckCircle className="h-4 w-4 text-green-500" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{stats.totalEvents > 0
									? Math.round(((stats.eventsByOutcome.success || 0) / stats.totalEvents) * 100)
									: 0}%
							</div>
							<p className="text-xs text-muted-foreground">
								{stats.eventsByOutcome.success || 0} successful events
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Warnings</CardTitle>
							<AlertTriangle className="h-4 w-4 text-yellow-500" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{(stats.eventsBySeverity.warning || 0).toLocaleString()}
							</div>
							<p className="text-xs text-muted-foreground">Events requiring attention</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Critical</CardTitle>
							<Shield className="h-4 w-4 text-red-500" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{((stats.eventsBySeverity.critical || 0) + (stats.eventsBySeverity.error || 0)).toLocaleString()}
							</div>
							<p className="text-xs text-muted-foreground">Critical & error events</p>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Main DataTable */}
			<Card>
				<CardHeader>
					<CardTitle>Activity Log</CardTitle>
					<CardDescription>
						{logsData?.total || 0} total events
						{selectedRows.length > 0 && (
							<span className="ml-2">
								• {selectedRows.length} selected
							</span>
						)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						data={logsData?.logs || []}
						columns={columns}
						isLoading={isLoading}
						error={error instanceof Error ? error : undefined}
						onRefresh={refetch}
						totalCount={logsData?.total}
						serverSide
						facetedFilters={auditLogFacetedFilters}
						bulkActions={bulkActions}
						config={{
							enableSorting: true,
							enableGlobalSearch: true,
							enableColumnFilters: true,
							enablePagination: true,
							defaultPageSize: pageSize,
							pageSizes: [10, 20, 50, 100],
							enableRowSelection: true,
							enableMultiRowSelection: true,
							enableColumnVisibility: true,
							enableExport: true,
							exportFormats: ['csv', 'xlsx', 'json'],
							exportFilename: 'audit-logs',
							hiddenColumns: ['ipAddress'],
							stripedRows: true,
						}}
						state={{
							sorting,
							columnFilters,
							pagination: { pageIndex: page, pageSize },
						}}
						callbacks={{
							onRowClick: setSelectedLog,
							onSortingChange: handleSortingChange,
							onFilterChange: handleFilterChange,
							onPageChange: handlePageChange,
							onSelectionChange: handleSelectionChange,
						}}
						toolbarSlot={dateRangeSlot}
						emptySlot={
							<div className="flex flex-col items-center gap-2 py-8">
								<Activity className="h-8 w-8 text-muted-foreground" />
								<p className="text-muted-foreground">No audit logs found</p>
								<p className="text-sm text-muted-foreground">
									Try adjusting your filters or date range
								</p>
							</div>
						}
					/>
				</CardContent>
			</Card>

			{/* Details Sheet */}
			<Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
				<SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Event Details</SheetTitle>
						<SheetDescription>
							{selectedLog && formatEventType(selectedLog.eventType)}
						</SheetDescription>
					</SheetHeader>
					{selectedLog && (
						<div className="mt-6 space-y-6">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label className="text-muted-foreground">Timestamp</Label>
									<p className="font-mono text-sm">{new Date(selectedLog.timestamp).toLocaleString()}</p>
								</div>
								<div>
									<Label className="text-muted-foreground">Event ID</Label>
									<p className="font-mono text-sm truncate">{selectedLog.id}</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label className="text-muted-foreground">Category</Label>
									<p>{categoryLabels[selectedLog.category] || selectedLog.category}</p>
								</div>
								<div>
									<Label className="text-muted-foreground">Event Type</Label>
									<p>{formatEventType(selectedLog.eventType)}</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label className="text-muted-foreground">Severity</Label>
									<Badge className={severityConfig[selectedLog.severity]?.color}>
										{severityLabels[selectedLog.severity]}
									</Badge>
								</div>
								<div>
									<Label className="text-muted-foreground">Outcome</Label>
									<Badge className={outcomeConfig[selectedLog.outcome]?.color}>
										{outcomeLabels[selectedLog.outcome]}
									</Badge>
								</div>
							</div>

							<Separator />

							<div>
								<Label className="text-muted-foreground">Message</Label>
								<p className="mt-1">{selectedLog.message}</p>
							</div>

							{selectedLog.actorEmail && (
								<div>
									<Label className="text-muted-foreground">Actor</Label>
									<p>{selectedLog.actorEmail}</p>
									<p className="text-sm text-muted-foreground">Type: {selectedLog.actorType}</p>
								</div>
							)}

							{selectedLog.targetId && (
								<div>
									<Label className="text-muted-foreground">Target</Label>
									<p>{selectedLog.targetName || selectedLog.targetId}</p>
									{selectedLog.targetType && (
										<p className="text-sm text-muted-foreground">Type: {selectedLog.targetType}</p>
									)}
								</div>
							)}

							{selectedLog.ipAddress && (
								<div>
									<Label className="text-muted-foreground">IP Address</Label>
									<p className="font-mono text-sm">{selectedLog.ipAddress}</p>
								</div>
							)}

							{selectedLog.userAgent && (
								<div>
									<Label className="text-muted-foreground">User Agent</Label>
									<p className="text-sm break-all">{selectedLog.userAgent}</p>
								</div>
							)}

							{selectedLog.errorMessage && (
								<div>
									<Label className="text-muted-foreground text-red-500">Error Message</Label>
									<p className="text-red-600">{selectedLog.errorMessage}</p>
								</div>
							)}

							{selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
								<div>
									<Label className="text-muted-foreground">Additional Details</Label>
									<pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-auto max-h-[200px]">
										{JSON.stringify(selectedLog.details, null, 2)}
									</pre>
								</div>
							)}
						</div>
					)}
				</SheetContent>
			</Sheet>
		</div>
	)
}

export default AuditLogsView

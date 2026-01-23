'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	MoreHorizontal,
	Eye,
	Pencil,
	Trash2,
	RefreshCw,
	Send,
	AlertCircle,
	CheckCircle,
} from 'lucide-react'
import { WebhookConfig, eventTypeLabels } from './webhook-types'

export interface WebhookColumnOptions {
	onViewDetails: (webhook: WebhookConfig) => void
	onEdit: (webhook: WebhookConfig) => void
	onDelete: (webhook: WebhookConfig) => void
	onToggleActive: (webhook: WebhookConfig) => void
	onRegenerateSecret: (webhook: WebhookConfig) => void
	onTest: (webhook: WebhookConfig) => void
}

export const createWebhookColumns = ({
	onViewDetails,
	onEdit,
	onDelete,
	onToggleActive,
	onRegenerateSecret,
	onTest,
}: WebhookColumnOptions): ColumnDef<WebhookConfig>[] => [
	{
		accessorKey: 'name',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Name" />
		),
		cell: ({ row }) => (
			<div className="flex flex-col">
				<span className="font-medium">{row.getValue('name')}</span>
				{row.original.description && (
					<span className="text-sm text-muted-foreground truncate max-w-[250px]">
						{row.original.description}
					</span>
				)}
			</div>
		),
	},
	{
		accessorKey: 'url',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="URL" />
		),
		cell: ({ row }) => (
			<div className="flex items-center gap-2">
				<Badge variant="outline" className="font-mono text-xs">
					{row.original.method}
				</Badge>
				<span className="font-mono text-sm truncate max-w-[200px]">
					{row.getValue('url')}
				</span>
			</div>
		),
	},
	{
		accessorKey: 'events',
		header: 'Events',
		cell: ({ row }) => {
			const events = row.getValue('events') as string[]
			const displayCount = 2
			const remaining = events.length - displayCount
			return (
				<div className="flex flex-wrap gap-1">
					{events.slice(0, displayCount).map((event) => (
						<Badge key={event} variant="secondary" className="text-xs">
							{eventTypeLabels[event as keyof typeof eventTypeLabels] || event}
						</Badge>
					))}
					{remaining > 0 && (
						<Badge variant="outline" className="text-xs">
							+{remaining} more
						</Badge>
					)}
				</div>
			)
		},
	},
	{
		accessorKey: 'isActive',
		header: 'Status',
		cell: ({ row }) => {
			const isActive = row.getValue('isActive') as boolean
			const failureCount = row.original.failureCount
			return (
				<div className="flex items-center gap-2">
					<Switch
						checked={isActive}
						onCheckedChange={() => onToggleActive(row.original)}
						aria-label="Toggle webhook active state"
					/>
					{failureCount > 0 && (
						<Badge variant="destructive" className="text-xs">
							<AlertCircle className="mr-1 h-3 w-3" />
							{failureCount} failures
						</Badge>
					)}
					{failureCount === 0 && isActive && (
						<CheckCircle className="h-4 w-4 text-green-500" />
					)}
				</div>
			)
		},
	},
	{
		accessorKey: 'lastTriggeredAt',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Last Triggered" />
		),
		cell: ({ row }) => {
			const lastTriggered = row.getValue('lastTriggeredAt') as string | undefined
			if (!lastTriggered) {
				return <span className="text-muted-foreground">Never</span>
			}
			return (
				<span className="font-mono text-sm">
					{new Date(lastTriggered).toLocaleString()}
				</span>
			)
		},
	},
	{
		id: 'actions',
		cell: ({ row }) => (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon">
						<MoreHorizontal className="h-4 w-4" />
						<span className="sr-only">Open menu</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => onViewDetails(row.original)}>
						<Eye className="mr-2 h-4 w-4" />
						View Details
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onEdit(row.original)}>
						<Pencil className="mr-2 h-4 w-4" />
						Edit
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onTest(row.original)}>
						<Send className="mr-2 h-4 w-4" />
						Test Webhook
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={() => onRegenerateSecret(row.original)}>
						<RefreshCw className="mr-2 h-4 w-4" />
						Regenerate Secret
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={() => onDelete(row.original)}
						className="text-red-600"
					>
						<Trash2 className="mr-2 h-4 w-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
]

'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Play, Eye, ArrowUpDown, RotateCcw } from 'lucide-react'
import {
	SchemaMigration,
	MigrationStatus,
	migrationStatusConfig,
	migrationStrategyLabels,
} from './schema-migration-types'
import { formatDistanceToNow } from 'date-fns'

interface ColumnActions {
	onViewDetails: (migration: SchemaMigration) => void
	onExecute: (migration: SchemaMigration) => void
	onRollback: (migration: SchemaMigration) => void
}

export function createMigrationColumns({
	onViewDetails,
	onExecute,
	onRollback,
}: ColumnActions): ColumnDef<SchemaMigration>[] {
	return [
		{
			accessorKey: 'description',
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Description
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="max-w-[300px]">
					<p className="font-medium truncate">{row.original.description}</p>
					<p className="text-xs text-muted-foreground">
						{row.original.transformations.length} transformation(s)
					</p>
				</div>
			),
		},
		{
			accessorKey: 'version',
			header: 'Version',
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<Badge variant="outline">v{row.original.fromVersion}</Badge>
					<span className="text-muted-foreground">→</span>
					<Badge variant="outline">v{row.original.toVersion}</Badge>
				</div>
			),
		},
		{
			accessorKey: 'strategy',
			header: 'Strategy',
			cell: ({ row }) => (
				<Badge variant="secondary">
					{migrationStrategyLabels[row.original.strategy]}
				</Badge>
			),
		},
		{
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => {
				const config = migrationStatusConfig[row.original.status]
				return (
					<Badge variant={config.variant}>
						{config.label}
					</Badge>
				)
			},
			filterFn: (row, id, value) => {
				return value.includes(row.getValue(id))
			},
		},
		{
			accessorKey: 'reversible',
			header: 'Reversible',
			cell: ({ row }) => (
				<Badge variant={row.original.reversible ? 'default' : 'secondary'}>
					{row.original.reversible ? 'Yes' : 'No'}
				</Badge>
			),
		},
		{
			accessorKey: 'createdAt',
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Created
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => {
				const date = new Date(row.original.createdAt)
				return (
					<span className="text-muted-foreground">
						{formatDistanceToNow(date, { addSuffix: true })}
					</span>
				)
			},
		},
		{
			accessorKey: 'executedAt',
			header: 'Executed',
			cell: ({ row }) => {
				if (!row.original.executedAt) {
					return <span className="text-muted-foreground">Not executed</span>
				}
				const date = new Date(row.original.executedAt)
				return (
					<span className="text-muted-foreground">
						{formatDistanceToNow(date, { addSuffix: true })}
					</span>
				)
			},
		},
		{
			id: 'actions',
			cell: ({ row }) => {
				const migration = row.original
				const canExecute = migration.status === MigrationStatus.PENDING
				const canRollback = migration.status === MigrationStatus.COMPLETED && migration.reversible

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuItem onClick={() => onViewDetails(migration)}>
								<Eye className="mr-2 h-4 w-4" />
								View Details
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							{canExecute && (
								<DropdownMenuItem onClick={() => onExecute(migration)}>
									<Play className="mr-2 h-4 w-4" />
									Execute Migration
								</DropdownMenuItem>
							)}
							{canRollback && (
								<DropdownMenuItem 
									onClick={() => onRollback(migration)}
									className="text-yellow-600"
								>
									<RotateCcw className="mr-2 h-4 w-4" />
									Rollback
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				)
			},
		},
	]
}

'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Database, RefreshCw, ArrowRight } from 'lucide-react'
import { DataTable } from '@/components/data-table/data-table'
import { createMigrationColumns } from './schema-migration-columns'
import { MigrationForm } from './migration-form'
import { MigrationDetailsSheet } from './migration-details-sheet'
import {
	SchemaMigration,
	SchemaVersionInfo,
	CreateMigrationInput,
	MigrationResult,
	MigrationExecutionOptions,
	MigrationStatus,
} from './schema-migration-types'

interface ShardType {
	id: string
	name: string
	currentVersion: number
}

interface MigrationsResponse {
	migrations: SchemaMigration[]
}

interface VersionInfoResponse {
	versionInfo: SchemaVersionInfo
}

interface MigrationListProps {
	/** Optional: Pre-select a shard type */
	initialShardTypeId?: string
	/** Optional: Compact mode for dashboard widget */
	compact?: boolean
}

export function MigrationList({ initialShardTypeId, compact = false }: MigrationListProps) {
	const queryClient = useQueryClient()
	const [selectedShardTypeId, setSelectedShardTypeId] = useState<string>(initialShardTypeId || '')
	const [selectedMigration, setSelectedMigration] = useState<SchemaMigration | null>(null)
	const [showCreateDialog, setShowCreateDialog] = useState(false)
	const [showDetailsSheet, setShowDetailsSheet] = useState(false)
	const [showExecuteConfirm, setShowExecuteConfirm] = useState(false)
	const [migrationToExecute, setMigrationToExecute] = useState<SchemaMigration | null>(null)

	// Fetch shard types
	const { data: shardTypesData } = useQuery<{ shardTypes: ShardType[] }>({
		queryKey: ['shard-types'],
		queryFn: async () => {
			const response = await fetch('/api/v1/shard-types')
			if (!response.ok) throw new Error('Failed to fetch shard types')
			return response.json()
		},
	})

	const shardTypes = useMemo(() => {
		return (shardTypesData?.shardTypes || []).map(st => ({
			id: st.id,
			name: st.name,
			currentVersion: (st as any).version || 1,
		}))
	}, [shardTypesData])

	// Fetch migrations for selected shard type
	const { data: migrationsData, isLoading: migrationsLoading, refetch: refetchMigrations } = useQuery<MigrationsResponse>({
		queryKey: ['schema-migrations', selectedShardTypeId],
		queryFn: async () => {
			const response = await fetch(`/api/v1/schema-migrations/${selectedShardTypeId}`)
			if (!response.ok) throw new Error('Failed to fetch migrations')
			return response.json()
		},
		enabled: !!selectedShardTypeId,
	})

	// Fetch version info
	const { data: versionInfoData } = useQuery<VersionInfoResponse>({
		queryKey: ['schema-migrations-version-info', selectedShardTypeId],
		queryFn: async () => {
			const response = await fetch(`/api/v1/schema-migrations/${selectedShardTypeId}/version-info`)
			if (!response.ok) throw new Error('Failed to fetch version info')
			return response.json()
		},
		enabled: !!selectedShardTypeId,
	})

	const migrations = migrationsData?.migrations || []
	const versionInfo = versionInfoData?.versionInfo

	// Create migration mutation
	const createMutation = useMutation({
		mutationFn: async (input: CreateMigrationInput) => {
			const response = await fetch('/api/v1/schema-migrations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input),
			})
			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to create migration')
			}
			return response.json()
		},
		onSuccess: () => {
			toast.success('Migration created successfully')
			setShowCreateDialog(false)
			queryClient.invalidateQueries({ queryKey: ['schema-migrations', selectedShardTypeId] })
			queryClient.invalidateQueries({ queryKey: ['schema-migrations-version-info', selectedShardTypeId] })
		},
		onError: (error) => {
			toast.error(`Failed to create migration: ${error instanceof Error ? error.message : 'Unknown error'}`)
		},
	})

	// Execute migration
	const handleExecuteMigration = useCallback(async (
		migrationId: string,
		options: MigrationExecutionOptions
	): Promise<MigrationResult> => {
		const response = await fetch(
			`/api/v1/schema-migrations/${selectedShardTypeId}/${migrationId}/execute`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(options),
			}
		)
		if (!response.ok) {
			const error = await response.json()
			throw new Error(error.error || 'Failed to execute migration')
		}
		const data = await response.json()
		
		// Refresh data
		queryClient.invalidateQueries({ queryKey: ['schema-migrations', selectedShardTypeId] })
		queryClient.invalidateQueries({ queryKey: ['schema-migrations-version-info', selectedShardTypeId] })
		
		return data.result
	}, [selectedShardTypeId, queryClient])

	// Column actions
	const handleViewDetails = useCallback((migration: SchemaMigration) => {
		setSelectedMigration(migration)
		setShowDetailsSheet(true)
	}, [])

	const handleExecute = useCallback((migration: SchemaMigration) => {
		setMigrationToExecute(migration)
		setShowExecuteConfirm(true)
	}, [])

	const handleRollback = useCallback((migration: SchemaMigration) => {
		// For now, show details sheet with rollback option
		setSelectedMigration(migration)
		setShowDetailsSheet(true)
	}, [])

	const columns = useMemo(
		() =>
			createMigrationColumns({
				onViewDetails: handleViewDetails,
				onExecute: handleExecute,
				onRollback: handleRollback,
			}),
		[handleViewDetails, handleExecute, handleRollback]
	)

	const selectedShardType = shardTypes.find(st => st.id === selectedShardTypeId)

	// Compact mode for dashboard widget
	if (compact) {
		return (
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm font-medium">Schema Migrations</CardTitle>
						<Badge variant="secondary">
							{migrations.filter(m => m.status === MigrationStatus.PENDING).length} pending
						</Badge>
					</div>
				</CardHeader>
				<CardContent>
					{!selectedShardTypeId ? (
						<Select value={selectedShardTypeId} onValueChange={setSelectedShardTypeId}>
							<SelectTrigger>
								<SelectValue placeholder="Select shard type" />
							</SelectTrigger>
							<SelectContent>
								{shardTypes.map((st) => (
									<SelectItem key={st.id} value={st.id}>
										{st.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : (
						<div className="space-y-2">
							{migrations.slice(0, 3).map((migration) => (
								<div
									key={migration.id}
									className="flex items-center justify-between p-2 rounded-lg border cursor-pointer hover:bg-muted/50"
									onClick={() => handleViewDetails(migration)}
								>
									<div className="flex items-center gap-2">
										<Badge variant="outline" className="text-xs">
											v{migration.fromVersion}→v{migration.toVersion}
										</Badge>
										<span className="text-sm truncate max-w-[150px]">
											{migration.description}
										</span>
									</div>
									<Badge variant={migration.status === MigrationStatus.PENDING ? 'secondary' : 'default'}>
										{migration.status}
									</Badge>
								</div>
							))}
							{migrations.length > 3 && (
								<p className="text-sm text-muted-foreground text-center">
									+{migrations.length - 3} more migrations
								</p>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			{/* Shard Type Selector & Version Info */}
			<div className="flex flex-col md:flex-row gap-4">
				<Card className="flex-1">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium">Select Shard Type</CardTitle>
					</CardHeader>
					<CardContent>
						<Select value={selectedShardTypeId} onValueChange={setSelectedShardTypeId}>
							<SelectTrigger>
								<SelectValue placeholder="Select a shard type to manage migrations" />
							</SelectTrigger>
							<SelectContent>
								{shardTypes.map((st) => (
									<SelectItem key={st.id} value={st.id}>
										{st.name} (v{st.currentVersion})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</CardContent>
				</Card>

				{versionInfo && (
					<Card className="flex-1">
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-medium">Version Info</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-4">
								<div className="flex items-center gap-2">
									<Badge variant="outline" className="text-lg px-3 py-1">
										v{versionInfo.currentVersion}
									</Badge>
									<ArrowRight className="h-4 w-4 text-muted-foreground" />
									<Badge className="text-lg px-3 py-1">
										v{versionInfo.latestVersion}
									</Badge>
								</div>
								<div className="text-sm text-muted-foreground">
									{Object.entries(versionInfo.shardsPerVersion).map(([version, count]) => (
										<span key={version} className="mr-3">
											v{version}: {count} shards
										</span>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Migrations Table */}
			{selectedShardTypeId && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Database className="h-5 w-5" />
									Migrations for {selectedShardType?.name}
								</CardTitle>
								<CardDescription>
									Manage schema migrations and transformations
								</CardDescription>
							</div>
							<div className="flex gap-2">
								<Button variant="outline" size="sm" onClick={() => refetchMigrations()}>
									<RefreshCw className="mr-2 h-4 w-4" />
									Refresh
								</Button>
								<Button size="sm" onClick={() => setShowCreateDialog(true)}>
									<Plus className="mr-2 h-4 w-4" />
									Create Migration
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<DataTable
							columns={columns}
							data={migrations}
							searchKey="description"
							searchPlaceholder="Search migrations..."
							isLoading={migrationsLoading}
						/>
					</CardContent>
				</Card>
			)}

			{/* Create Migration Dialog */}
			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Create Migration</DialogTitle>
						<DialogDescription>
							Define a new schema migration with field transformations
						</DialogDescription>
					</DialogHeader>
					<MigrationForm
						shardTypes={shardTypes}
						onSubmit={(data) => createMutation.mutate(data)}
						onCancel={() => setShowCreateDialog(false)}
						isLoading={createMutation.isPending}
						defaultValues={selectedShardTypeId ? { shardTypeId: selectedShardTypeId } : undefined}
					/>
				</DialogContent>
			</Dialog>

			{/* Execute Confirmation Dialog */}
			<Dialog open={showExecuteConfirm} onOpenChange={setShowExecuteConfirm}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Execute Migration</DialogTitle>
						<DialogDescription>
							Are you sure you want to execute this migration? This will modify shards from
							version {migrationToExecute?.fromVersion} to version {migrationToExecute?.toVersion}.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<p className="text-sm text-muted-foreground">
							<strong>Description:</strong> {migrationToExecute?.description}
						</p>
						<p className="text-sm text-muted-foreground mt-2">
							<strong>Transformations:</strong> {migrationToExecute?.transformations.length}
						</p>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowExecuteConfirm(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => {
								if (migrationToExecute) {
									setShowExecuteConfirm(false)
									setSelectedMigration(migrationToExecute)
									setShowDetailsSheet(true)
								}
							}}
						>
							Continue to Execute
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Details Sheet */}
			<MigrationDetailsSheet
				migration={selectedMigration}
				open={showDetailsSheet}
				onOpenChange={setShowDetailsSheet}
				onExecute={handleExecuteMigration}
			/>
		</div>
	)
}

'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
	Play,
	RotateCcw,
	Clock,
	CheckCircle,
	XCircle,
	AlertTriangle,
	ArrowRight,
	Loader2,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import {
	SchemaMigration,
	MigrationResult,
	MigrationStatus,
	MigrationExecutionOptions,
	migrationStatusConfig,
	migrationStrategyLabels,
	transformationTypeLabels,
} from './schema-migration-types'

interface MigrationDetailsSheetProps {
	migration: SchemaMigration | null
	open: boolean
	onOpenChange: (open: boolean) => void
	onExecute: (migrationId: string, options: MigrationExecutionOptions) => Promise<MigrationResult>
	onRollback?: (migrationId: string) => Promise<void>
}

export function MigrationDetailsSheet({
	migration,
	open,
	onOpenChange,
	onExecute,
	onRollback,
}: MigrationDetailsSheetProps) {
	const [executionOptions, setExecutionOptions] = useState<MigrationExecutionOptions>({
		dryRun: true,
		batchSize: 100,
		continueOnError: false,
		notifyOnCompletion: true,
	})
	const [lastResult, setLastResult] = useState<MigrationResult | null>(null)

	const executeMutation = useMutation({
		mutationFn: async () => {
			if (!migration) throw new Error('No migration selected')
			return onExecute(migration.id, executionOptions)
		},
		onSuccess: (result) => {
			setLastResult(result)
			if (result.success) {
				toast.success(
					executionOptions.dryRun
						? `Dry run completed: ${result.shardsProcessed} shards would be processed`
						: `Migration completed: ${result.shardsSucceeded}/${result.shardsProcessed} shards migrated`
				)
			} else {
				toast.error(`Migration failed: ${result.shardsFailed} shards failed`)
			}
		},
		onError: (error) => {
			toast.error(`Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
		},
	})

	const rollbackMutation = useMutation({
		mutationFn: async () => {
			if (!migration || !onRollback) throw new Error('Rollback not available')
			return onRollback(migration.id)
		},
		onSuccess: () => {
			toast.success('Migration rolled back successfully')
		},
		onError: (error) => {
			toast.error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
		},
	})

	if (!migration) return null

	const statusConfig = migrationStatusConfig[migration.status]
	const canExecute = migration.status === MigrationStatus.PENDING
	const canRollback = migration.status === MigrationStatus.COMPLETED && migration.reversible && onRollback

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						Migration Details
						<Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
					</SheetTitle>
					<SheetDescription>{migration.description}</SheetDescription>
				</SheetHeader>

				<Tabs defaultValue="overview" className="mt-6">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="transformations">Transformations</TabsTrigger>
						<TabsTrigger value="execute">Execute</TabsTrigger>
					</TabsList>

					<TabsContent value="overview" className="space-y-4 mt-4">
						{/* Version Info */}
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-sm">Version Change</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex items-center justify-center gap-4 text-lg">
									<Badge variant="outline" className="text-lg px-4 py-2">
										v{migration.fromVersion}
									</Badge>
									<ArrowRight className="h-5 w-5 text-muted-foreground" />
									<Badge variant="outline" className="text-lg px-4 py-2">
										v{migration.toVersion}
									</Badge>
								</div>
							</CardContent>
						</Card>

						{/* Details Grid */}
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-1">
								<Label className="text-muted-foreground">Strategy</Label>
								<p className="font-medium">{migrationStrategyLabels[migration.strategy]}</p>
							</div>
							<div className="space-y-1">
								<Label className="text-muted-foreground">Batch Size</Label>
								<p className="font-medium">{migration.batchSize || 'Default'}</p>
							</div>
							<div className="space-y-1">
								<Label className="text-muted-foreground">Reversible</Label>
								<p className="font-medium">{migration.reversible ? 'Yes' : 'No'}</p>
							</div>
							<div className="space-y-1">
								<Label className="text-muted-foreground">Transformations</Label>
								<p className="font-medium">{migration.transformations.length}</p>
							</div>
						</div>

						<Separator />

						{/* Metadata */}
						<div className="space-y-3">
							<div className="flex items-center gap-2 text-sm">
								<Clock className="h-4 w-4 text-muted-foreground" />
								<span className="text-muted-foreground">Created:</span>
								<span>{format(new Date(migration.createdAt), 'PPpp')}</span>
							</div>
							{migration.executedAt && (
								<div className="flex items-center gap-2 text-sm">
									<CheckCircle className="h-4 w-4 text-green-500" />
									<span className="text-muted-foreground">Executed:</span>
									<span>{format(new Date(migration.executedAt), 'PPpp')}</span>
								</div>
							)}
							<div className="flex items-center gap-2 text-sm">
								<span className="text-muted-foreground">Created by:</span>
								<span>{migration.createdBy}</span>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="transformations" className="mt-4">
						<ScrollArea className="h-[400px]">
							<div className="space-y-3">
								{migration.transformations.map((transformation, index) => (
									<Card key={index}>
										<CardHeader className="pb-2">
											<CardTitle className="text-sm flex items-center gap-2">
												<Badge variant="secondary">{index + 1}</Badge>
												{transformationTypeLabels[transformation.type]}
											</CardTitle>
										</CardHeader>
										<CardContent className="space-y-2 text-sm">
											{transformation.sourcePath && (
												<div className="flex gap-2">
													<span className="text-muted-foreground">Source:</span>
													<code className="bg-muted px-2 py-0.5 rounded">
														{transformation.sourcePath}
													</code>
												</div>
											)}
											{transformation.targetPath && (
												<div className="flex gap-2">
													<span className="text-muted-foreground">Target:</span>
													<code className="bg-muted px-2 py-0.5 rounded">
														{transformation.targetPath}
													</code>
												</div>
											)}
											{transformation.defaultValue !== undefined && (
												<div className="flex gap-2">
													<span className="text-muted-foreground">Default:</span>
													<code className="bg-muted px-2 py-0.5 rounded">
														{JSON.stringify(transformation.defaultValue)}
													</code>
												</div>
											)}
											{transformation.transformer && (
												<div className="flex gap-2">
													<span className="text-muted-foreground">Transformer:</span>
													<code className="bg-muted px-2 py-0.5 rounded">
														{transformation.transformer}
													</code>
												</div>
											)}
										</CardContent>
									</Card>
								))}
							</div>

							{migration.rollbackTransformations && migration.rollbackTransformations.length > 0 && (
								<>
									<Separator className="my-4" />
									<h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
										<RotateCcw className="h-4 w-4" />
										Rollback Transformations
									</h4>
									<div className="space-y-3">
										{migration.rollbackTransformations.map((transformation, index) => (
											<Card key={index} className="border-yellow-200 dark:border-yellow-800">
												<CardHeader className="pb-2">
													<CardTitle className="text-sm flex items-center gap-2">
														<Badge variant="outline">{index + 1}</Badge>
														{transformationTypeLabels[transformation.type]}
													</CardTitle>
												</CardHeader>
												<CardContent className="space-y-2 text-sm">
													{transformation.sourcePath && (
														<div className="flex gap-2">
															<span className="text-muted-foreground">Source:</span>
															<code className="bg-muted px-2 py-0.5 rounded">
																{transformation.sourcePath}
															</code>
														</div>
													)}
													{transformation.targetPath && (
														<div className="flex gap-2">
															<span className="text-muted-foreground">Target:</span>
															<code className="bg-muted px-2 py-0.5 rounded">
																{transformation.targetPath}
															</code>
														</div>
													)}
												</CardContent>
											</Card>
										))}
									</div>
								</>
							)}
						</ScrollArea>
					</TabsContent>

					<TabsContent value="execute" className="space-y-4 mt-4">
						{canExecute ? (
							<>
								<Card>
									<CardHeader>
										<CardTitle className="text-sm">Execution Options</CardTitle>
										<CardDescription>
											Configure how the migration should be executed
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="flex items-center justify-between">
											<div className="space-y-0.5">
												<Label>Dry Run</Label>
												<p className="text-sm text-muted-foreground">
													Simulate without making changes
												</p>
											</div>
											<Switch
												checked={executionOptions.dryRun}
												onCheckedChange={(checked) =>
													setExecutionOptions((prev) => ({ ...prev, dryRun: checked }))
												}
											/>
										</div>

										<div className="flex items-center justify-between">
											<div className="space-y-0.5">
												<Label>Continue on Error</Label>
												<p className="text-sm text-muted-foreground">
													Don&apos;t stop if a shard fails
												</p>
											</div>
											<Switch
												checked={executionOptions.continueOnError}
												onCheckedChange={(checked) =>
													setExecutionOptions((prev) => ({ ...prev, continueOnError: checked }))
												}
											/>
										</div>

										<div className="flex items-center justify-between">
											<div className="space-y-0.5">
												<Label>Notify on Completion</Label>
												<p className="text-sm text-muted-foreground">
													Send notification when done
												</p>
											</div>
											<Switch
												checked={executionOptions.notifyOnCompletion}
												onCheckedChange={(checked) =>
													setExecutionOptions((prev) => ({ ...prev, notifyOnCompletion: checked }))
												}
											/>
										</div>

										<div className="space-y-2">
											<Label>Batch Size</Label>
											<Input
												type="number"
												min={1}
												max={1000}
												value={executionOptions.batchSize}
												onChange={(e) =>
													setExecutionOptions((prev) => ({
														...prev,
														batchSize: parseInt(e.target.value) || 100,
													}))
												}
											/>
										</div>
									</CardContent>
								</Card>

								<Button
									onClick={() => executeMutation.mutate()}
									disabled={executeMutation.isPending}
									className="w-full"
								>
									{executeMutation.isPending ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											{executionOptions.dryRun ? 'Running Dry Run...' : 'Executing...'}
										</>
									) : (
										<>
											<Play className="mr-2 h-4 w-4" />
											{executionOptions.dryRun ? 'Start Dry Run' : 'Execute Migration'}
										</>
									)}
								</Button>
							</>
						) : migration.status === MigrationStatus.COMPLETED ? (
							<Card>
								<CardContent className="pt-6">
									<div className="flex flex-col items-center gap-4 text-center">
										<CheckCircle className="h-12 w-12 text-green-500" />
										<div>
											<p className="font-medium">Migration Completed</p>
											<p className="text-sm text-muted-foreground">
												Executed {formatDistanceToNow(new Date(migration.executedAt!), { addSuffix: true })}
											</p>
										</div>
										{canRollback && (
											<Button
												variant="outline"
												onClick={() => rollbackMutation.mutate()}
												disabled={rollbackMutation.isPending}
												className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
											>
												{rollbackMutation.isPending ? (
													<>
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														Rolling Back...
													</>
												) : (
													<>
														<RotateCcw className="mr-2 h-4 w-4" />
														Rollback Migration
													</>
												)}
											</Button>
										)}
									</div>
								</CardContent>
							</Card>
						) : migration.status === MigrationStatus.IN_PROGRESS ? (
							<Card>
								<CardContent className="pt-6">
									<div className="flex flex-col items-center gap-4 text-center">
										<Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
										<div>
											<p className="font-medium">Migration In Progress</p>
											<p className="text-sm text-muted-foreground">
												Please wait for the migration to complete
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						) : migration.status === MigrationStatus.FAILED ? (
							<Card className="border-red-200 dark:border-red-800">
								<CardContent className="pt-6">
									<div className="flex flex-col items-center gap-4 text-center">
										<XCircle className="h-12 w-12 text-red-500" />
										<div>
											<p className="font-medium">Migration Failed</p>
											<p className="text-sm text-muted-foreground">
												The migration encountered errors and was stopped
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						) : null}

						{/* Last Result */}
						{lastResult && (
							<Card className={lastResult.success ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}>
								<CardHeader>
									<CardTitle className="text-sm flex items-center gap-2">
										{lastResult.success ? (
											<CheckCircle className="h-4 w-4 text-green-500" />
										) : (
											<XCircle className="h-4 w-4 text-red-500" />
										)}
										Last Execution Result
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2 text-sm">
									<div className="grid grid-cols-3 gap-4">
										<div>
											<p className="text-muted-foreground">Processed</p>
											<p className="font-medium">{lastResult.shardsProcessed}</p>
										</div>
										<div>
											<p className="text-muted-foreground">Succeeded</p>
											<p className="font-medium text-green-600">{lastResult.shardsSucceeded}</p>
										</div>
										<div>
											<p className="text-muted-foreground">Failed</p>
											<p className="font-medium text-red-600">{lastResult.shardsFailed}</p>
										</div>
									</div>
									{lastResult.duration && (
										<p className="text-muted-foreground">
											Duration: {(lastResult.duration / 1000).toFixed(2)}s
										</p>
									)}
									{lastResult.errors.length > 0 && (
										<div className="mt-4">
											<p className="font-medium mb-2">Errors:</p>
											<ScrollArea className="h-[100px]">
												{lastResult.errors.slice(0, 5).map((error, index) => (
													<div key={index} className="flex gap-2 text-red-600 mb-1">
														<span className="font-mono">{error.shardId}:</span>
														<span>{error.error}</span>
													</div>
												))}
												{lastResult.errors.length > 5 && (
													<p className="text-muted-foreground">
														...and {lastResult.errors.length - 5} more errors
													</p>
												)}
											</ScrollArea>
										</div>
									)}
								</CardContent>
							</Card>
						)}
					</TabsContent>
				</Tabs>
			</SheetContent>
		</Sheet>
	)
}

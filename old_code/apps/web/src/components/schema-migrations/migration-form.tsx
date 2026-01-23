'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, ChevronDown, GripVertical } from 'lucide-react'
import {
	CreateMigrationInput,
	MigrationStrategy,
	TransformationType,
	FieldTransformation,
	migrationStrategyLabels,
	transformationTypeLabels,
} from './schema-migration-types'

const transformationSchema = z.object({
	type: z.nativeEnum(TransformationType),
	sourcePath: z.string().optional(),
	targetPath: z.string().optional(),
	defaultValue: z.any().optional(),
	transformer: z.string().optional(),
	config: z.record(z.string(), z.any()).optional(),
})

const migrationFormSchema = z.object({
	shardTypeId: z.string().min(1, 'Shard type is required'),
	fromVersion: z.number().min(1, 'From version must be at least 1'),
	toVersion: z.number().min(1, 'To version must be at least 1'),
	description: z.string().min(1, 'Description is required').max(500),
	transformations: z.array(transformationSchema).min(1, 'At least one transformation is required'),
	strategy: z.nativeEnum(MigrationStrategy).optional(),
	batchSize: z.number().min(1).max(1000).optional(),
	reversible: z.boolean().optional(),
	rollbackTransformations: z.array(transformationSchema).optional(),
})

type MigrationFormValues = z.infer<typeof migrationFormSchema>

interface ShardType {
	id: string
	name: string
	currentVersion: number
}

interface MigrationFormProps {
	shardTypes: ShardType[]
	onSubmit: (data: CreateMigrationInput) => void
	onCancel: () => void
	isLoading?: boolean
	defaultValues?: Partial<MigrationFormValues>
}

export function MigrationForm({
	shardTypes,
	onSubmit,
	onCancel,
	isLoading = false,
	defaultValues,
}: MigrationFormProps) {
	const [advancedOpen, setAdvancedOpen] = useState(false)
	const [rollbackOpen, setRollbackOpen] = useState(false)

	const form = useForm<MigrationFormValues>({
		resolver: zodResolver(migrationFormSchema),
		defaultValues: {
			shardTypeId: defaultValues?.shardTypeId || '',
			fromVersion: defaultValues?.fromVersion || 1,
			toVersion: defaultValues?.toVersion || 2,
			description: defaultValues?.description || '',
			transformations: defaultValues?.transformations || [
				{ type: TransformationType.ADD, sourcePath: '', targetPath: '' },
			],
			strategy: defaultValues?.strategy || MigrationStrategy.LAZY,
			batchSize: defaultValues?.batchSize || 100,
			reversible: defaultValues?.reversible ?? true,
			rollbackTransformations: defaultValues?.rollbackTransformations || [],
		},
	})

	const {
		fields: transformationFields,
		append: appendTransformation,
		remove: removeTransformation,
	} = useFieldArray({
		control: form.control,
		name: 'transformations',
	})

	const {
		fields: rollbackFields,
		append: appendRollback,
		remove: removeRollback,
	} = useFieldArray({
		control: form.control,
		name: 'rollbackTransformations',
	})

	const handleSubmit = (values: MigrationFormValues) => {
		onSubmit(values as CreateMigrationInput)
	}

	const selectedShardType = shardTypes.find(st => st.id === form.watch('shardTypeId'))

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
				{/* Basic Information */}
				<div className="grid gap-4 md:grid-cols-2">
					<FormField
						control={form.control}
						name="shardTypeId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Shard Type</FormLabel>
								<Select onValueChange={field.onChange} value={field.value}>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select shard type" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{shardTypes.map((st) => (
											<SelectItem key={st.id} value={st.id}>
												{st.name} (v{st.currentVersion})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="grid grid-cols-2 gap-2">
						<FormField
							control={form.control}
							name="fromVersion"
							render={({ field }) => (
								<FormItem>
									<FormLabel>From Version</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={1}
											{...field}
											onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="toVersion"
							render={({ field }) => (
								<FormItem>
									<FormLabel>To Version</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={1}
											{...field}
											onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>

				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Textarea
									placeholder="Describe what this migration does..."
									className="resize-none"
									{...field}
								/>
							</FormControl>
							<FormDescription>
								Max 500 characters. Explain the changes being made.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Transformations */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<Label className="text-base font-semibold">Transformations</Label>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => appendTransformation({ type: TransformationType.ADD })}
						>
							<Plus className="mr-2 h-4 w-4" />
							Add Transformation
						</Button>
					</div>

					<div className="space-y-3">
						{transformationFields.map((field, index) => (
							<TransformationRow
								key={field.id}
								index={index}
								form={form}
								fieldPath={`transformations.${index}`}
								onRemove={() => removeTransformation(index)}
								canRemove={transformationFields.length > 1}
							/>
						))}
					</div>
					{form.formState.errors.transformations && (
						<p className="text-sm text-red-500">
							{form.formState.errors.transformations.message}
						</p>
					)}
				</div>

				{/* Advanced Settings */}
				<Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
					<CollapsibleTrigger asChild>
						<Button variant="ghost" className="w-full justify-between">
							Advanced Settings
							<ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="space-y-4 pt-4">
						<div className="grid gap-4 md:grid-cols-2">
							<FormField
								control={form.control}
								name="strategy"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Migration Strategy</FormLabel>
										<Select onValueChange={field.onChange} value={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select strategy" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{Object.values(MigrationStrategy).map((strategy) => (
													<SelectItem key={strategy} value={strategy}>
														{migrationStrategyLabels[strategy]}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormDescription>
											How the migration should be applied
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="batchSize"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Batch Size</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={1}
												max={1000}
												{...field}
												onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
											/>
										</FormControl>
										<FormDescription>
											Number of shards per batch (1-1000)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="reversible"
							render={({ field }) => (
								<FormItem className="flex items-center justify-between rounded-lg border p-4">
									<div className="space-y-0.5">
										<FormLabel className="text-base">Reversible</FormLabel>
										<FormDescription>
											Allow this migration to be rolled back
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
					</CollapsibleContent>
				</Collapsible>

				{/* Rollback Transformations */}
				{form.watch('reversible') && (
					<Collapsible open={rollbackOpen} onOpenChange={setRollbackOpen}>
						<CollapsibleTrigger asChild>
							<Button variant="ghost" className="w-full justify-between">
								Rollback Transformations (Optional)
								<ChevronDown className={`h-4 w-4 transition-transform ${rollbackOpen ? 'rotate-180' : ''}`} />
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="space-y-4 pt-4">
							<div className="flex items-center justify-between">
								<p className="text-sm text-muted-foreground">
									Define transformations to reverse this migration
								</p>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => appendRollback({ type: TransformationType.DELETE })}
								>
									<Plus className="mr-2 h-4 w-4" />
									Add Rollback
								</Button>
							</div>

							<div className="space-y-3">
								{rollbackFields.map((field, index) => (
									<TransformationRow
										key={field.id}
										index={index}
										form={form}
										fieldPath={`rollbackTransformations.${index}`}
										onRemove={() => removeRollback(index)}
										canRemove={true}
									/>
								))}
							</div>
						</CollapsibleContent>
					</Collapsible>
				)}

				{/* Form Actions */}
				<div className="flex justify-end gap-3 pt-4">
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button type="submit" disabled={isLoading}>
						{isLoading ? 'Creating...' : 'Create Migration'}
					</Button>
				</div>
			</form>
		</Form>
	)
}

interface TransformationRowProps {
	index: number
	form: ReturnType<typeof useForm<MigrationFormValues>>
	fieldPath: string
	onRemove: () => void
	canRemove: boolean
}

function TransformationRow({ index, form, fieldPath, onRemove, canRemove }: TransformationRowProps) {
	const transformationType = form.watch(`${fieldPath}.type` as any)

	const showSourcePath = [
		TransformationType.RENAME,
		TransformationType.DELETE,
		TransformationType.CHANGE_TYPE,
		TransformationType.MOVE,
		TransformationType.MERGE,
		TransformationType.SPLIT,
		TransformationType.COMPUTE,
	].includes(transformationType)

	const showTargetPath = [
		TransformationType.RENAME,
		TransformationType.ADD,
		TransformationType.CHANGE_TYPE,
		TransformationType.MOVE,
		TransformationType.MERGE,
		TransformationType.SPLIT,
		TransformationType.COMPUTE,
	].includes(transformationType)

	const showDefaultValue = [
		TransformationType.ADD,
		TransformationType.CHANGE_TYPE,
	].includes(transformationType)

	return (
		<Card>
			<CardContent className="pt-4">
				<div className="flex items-start gap-3">
					<div className="flex items-center pt-2 text-muted-foreground">
						<GripVertical className="h-4 w-4" />
					</div>

					<div className="flex-1 grid gap-3 md:grid-cols-4">
						<FormField
							control={form.control}
							name={`${fieldPath}.type` as any}
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-xs">Type</FormLabel>
									<Select onValueChange={field.onChange} value={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select type" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{Object.values(TransformationType).map((type) => (
												<SelectItem key={type} value={type}>
													{transformationTypeLabels[type]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FormItem>
							)}
						/>

						{showSourcePath && (
							<FormField
								control={form.control}
								name={`${fieldPath}.sourcePath` as any}
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-xs">Source Path</FormLabel>
										<FormControl>
											<Input placeholder="e.g., data.oldField" {...field} />
										</FormControl>
									</FormItem>
								)}
							/>
						)}

						{showTargetPath && (
							<FormField
								control={form.control}
								name={`${fieldPath}.targetPath` as any}
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-xs">Target Path</FormLabel>
										<FormControl>
											<Input placeholder="e.g., data.newField" {...field} />
										</FormControl>
									</FormItem>
								)}
							/>
						)}

						{showDefaultValue && (
							<FormField
								control={form.control}
								name={`${fieldPath}.defaultValue` as any}
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-xs">Default Value</FormLabel>
										<FormControl>
											<Input 
												placeholder="Default value" 
												{...field} 
												value={field.value || ''}
												onChange={(e) => {
													// Try to parse as JSON, otherwise use string
													try {
														field.onChange(JSON.parse(e.target.value))
													} catch {
														field.onChange(e.target.value)
													}
												}}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
						)}
					</div>

					{canRemove && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={onRemove}
							className="text-red-500 hover:text-red-600"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

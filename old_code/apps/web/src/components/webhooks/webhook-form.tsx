'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, X, ChevronDown } from 'lucide-react'
import {
	WebhookConfig,
	CreateWebhookInput,
	UpdateWebhookInput,
	ShardEventType,
	eventTypeLabels,
} from './webhook-types'

const webhookFormSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
	description: z.string().max(500, 'Description must be 500 characters or less').optional(),
	url: z.string().url('Must be a valid URL'),
	method: z.enum(['POST', 'PUT']),
	events: z.array(z.nativeEnum(ShardEventType)).min(1, 'At least one event is required'),
	retryCount: z.number().min(0).max(10),
	retryDelayMs: z.number().min(1000).max(300000),
	timeoutMs: z.number().min(5000).max(60000),
	isActive: z.boolean().optional(),
})

type WebhookFormValues = z.infer<typeof webhookFormSchema>

interface WebhookFormProps {
	webhook?: WebhookConfig
	onSubmit: (data: CreateWebhookInput | UpdateWebhookInput) => Promise<void>
	onCancel: () => void
	isLoading?: boolean
}

export function WebhookForm({ webhook, onSubmit, onCancel, isLoading }: WebhookFormProps) {
	const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>(
		webhook?.headers
			? Object.entries(webhook.headers).map(([key, value]) => ({ key, value }))
			: []
	)

	const form = useForm<WebhookFormValues>({
		resolver: zodResolver(webhookFormSchema),
		defaultValues: {
			name: webhook?.name || '',
			description: webhook?.description || '',
			url: webhook?.url || '',
			method: webhook?.method || 'POST',
			events: webhook?.events || [],
			retryCount: webhook?.retryCount ?? 3,
			retryDelayMs: webhook?.retryDelayMs ?? 5000,
			timeoutMs: webhook?.timeoutMs ?? 30000,
			isActive: webhook?.isActive ?? true,
		},
	})

	const handleSubmit = async (values: WebhookFormValues) => {
		const headers: Record<string, string> = {}
		customHeaders.forEach(({ key, value }) => {
			if (key.trim() && value.trim()) {
				headers[key.trim()] = value.trim()
			}
		})

		const data: CreateWebhookInput | UpdateWebhookInput = {
			...values,
			headers: Object.keys(headers).length > 0 ? headers : undefined,
		}

		await onSubmit(data)
	}

	const addHeader = () => {
		setCustomHeaders([...customHeaders, { key: '', value: '' }])
	}

	const removeHeader = (index: number) => {
		setCustomHeaders(customHeaders.filter((_, i) => i !== index))
	}

	const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
		const updated = [...customHeaders]
		updated[index][field] = value
		setCustomHeaders(updated)
	}

	const allEvents = Object.values(ShardEventType)

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<Input placeholder="My Webhook" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="method"
						render={({ field }) => (
							<FormItem>
								<FormLabel>HTTP Method</FormLabel>
								<Select onValueChange={field.onChange} defaultValue={field.value}>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select method" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="POST">POST</SelectItem>
										<SelectItem value="PUT">PUT</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="url"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Webhook URL</FormLabel>
							<FormControl>
								<Input placeholder="https://api.example.com/webhooks" {...field} />
							</FormControl>
							<FormDescription>
								The URL that will receive webhook payloads
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description (Optional)</FormLabel>
							<FormControl>
								<Textarea
									placeholder="Describe what this webhook is used for..."
									className="resize-none"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="events"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Events</FormLabel>
							<FormDescription>
								Select which events should trigger this webhook
							</FormDescription>
							<div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 mt-2">
								{allEvents.map((event) => (
									<div key={event} className="flex items-center space-x-2">
										<Checkbox
											id={event}
											checked={field.value?.includes(event)}
											onCheckedChange={(checked) => {
												const newValue = checked
													? [...(field.value || []), event]
													: field.value?.filter((e) => e !== event) || []
												field.onChange(newValue)
											}}
										/>
										<Label htmlFor={event} className="text-sm font-normal cursor-pointer">
											{eventTypeLabels[event]}
										</Label>
									</div>
								))}
							</div>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Collapsible>
					<CollapsibleTrigger asChild>
						<Button variant="ghost" type="button" className="flex w-full justify-between p-4 font-medium">
							Custom Headers
							<ChevronDown className="h-4 w-4" />
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="px-4 pb-4">
						<div className="space-y-3">
							{customHeaders.map((header, index) => (
								<div key={index} className="flex gap-2 items-start">
									<Input
										placeholder="Header name"
										value={header.key}
										onChange={(e) => updateHeader(index, 'key', e.target.value)}
										className="flex-1"
									/>
									<Input
										placeholder="Header value"
										value={header.value}
										onChange={(e) => updateHeader(index, 'value', e.target.value)}
										className="flex-1"
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => removeHeader(index)}
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							))}
							<Button type="button" variant="outline" size="sm" onClick={addHeader}>
								<Plus className="mr-2 h-4 w-4" />
								Add Header
							</Button>
						</div>
					</CollapsibleContent>
				</Collapsible>

				<Collapsible>
					<CollapsibleTrigger asChild>
						<Button variant="ghost" type="button" className="flex w-full justify-between p-4 font-medium">
							Advanced Settings
							<ChevronDown className="h-4 w-4" />
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="px-4 pb-4">
						<div className="grid gap-4 md:grid-cols-3">
							<FormField
								control={form.control}
								name="retryCount"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Retry Count</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={0}
												max={10}
												{...field}
												onChange={(e) => field.onChange(parseInt(e.target.value))}
											/>
										</FormControl>
										<FormDescription>0-10 retries</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="retryDelayMs"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Retry Delay (ms)</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={1000}
												max={300000}
												step={1000}
												{...field}
												onChange={(e) => field.onChange(parseInt(e.target.value))}
											/>
										</FormControl>
										<FormDescription>1s - 5min</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="timeoutMs"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Timeout (ms)</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={5000}
												max={60000}
												step={1000}
												{...field}
												onChange={(e) => field.onChange(parseInt(e.target.value))}
											/>
										</FormControl>
										<FormDescription>5s - 60s</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</CollapsibleContent>
				</Collapsible>

				<div className="flex justify-end gap-2 pt-4 border-t">
					<Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
						Cancel
					</Button>
					<Button type="submit" disabled={isLoading}>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{webhook ? 'Update Webhook' : 'Create Webhook'}
					</Button>
				</div>
			</form>
		</Form>
	)
}

'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Copy,
	Eye,
	EyeOff,
	RefreshCw,
	CheckCircle,
	XCircle,
	Clock,
	AlertCircle,
} from 'lucide-react'
import {
	WebhookConfig,
	WebhookDelivery,
	eventTypeLabels,
	deliveryStatusConfig,
} from './webhook-types'
import { toast } from 'sonner'

interface WebhookDetailsSheetProps {
	webhook: WebhookConfig | null
	open: boolean
	onOpenChange: (open: boolean) => void
	onRegenerateSecret: (webhook: WebhookConfig) => Promise<string | null>
}

export function WebhookDetailsSheet({
	webhook,
	open,
	onOpenChange,
	onRegenerateSecret,
}: WebhookDetailsSheetProps) {
	const [showSecret, setShowSecret] = useState(false)
	const [newSecret, setNewSecret] = useState<string | null>(null)
	const [regenerating, setRegenerating] = useState(false)

	const { data: deliveriesData, isLoading: loadingDeliveries } = useQuery<{
		deliveries: WebhookDelivery[]
	}>({
		queryKey: ['webhook-deliveries', webhook?.id],
		queryFn: async () => {
			const response = await fetch(`/api/v1/webhooks/${webhook?.id}/deliveries?limit=50`)
			if (!response.ok) throw new Error('Failed to fetch deliveries')
			return response.json()
		},
		enabled: !!webhook && open,
	})

	const handleCopySecret = () => {
		const secretToCopy = newSecret || webhook?.secret || ''
		navigator.clipboard.writeText(secretToCopy)
		toast.success('Secret copied to clipboard')
	}

	const handleRegenerateSecret = async () => {
		if (!webhook) return
		setRegenerating(true)
		try {
			const secret = await onRegenerateSecret(webhook)
			if (secret) {
				setNewSecret(secret)
				setShowSecret(true)
				toast.success('New secret generated. Make sure to update your integration.')
			}
		} finally {
			setRegenerating(false)
		}
	}

	if (!webhook) return null

	const displaySecret = newSecret || webhook.secret

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-[600px] sm:w-[700px] overflow-hidden flex flex-col">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						{webhook.name}
						<Badge variant={webhook.isActive ? 'default' : 'secondary'}>
							{webhook.isActive ? 'Active' : 'Inactive'}
						</Badge>
					</SheetTitle>
					<SheetDescription>{webhook.description || 'No description'}</SheetDescription>
				</SheetHeader>

				<Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="details">Details</TabsTrigger>
						<TabsTrigger value="deliveries">
							Delivery History
							{webhook.failureCount > 0 && (
								<Badge variant="destructive" className="ml-2 text-xs">
									{webhook.failureCount}
								</Badge>
							)}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="details" className="flex-1 overflow-auto mt-4 space-y-6">
						<div className="space-y-4">
							<div>
								<Label className="text-muted-foreground">Endpoint</Label>
								<div className="flex items-center gap-2 mt-1">
									<Badge variant="outline" className="font-mono">
										{webhook.method}
									</Badge>
									<code className="text-sm bg-muted px-2 py-1 rounded flex-1 truncate">
										{webhook.url}
									</code>
								</div>
							</div>

							<div>
								<Label className="text-muted-foreground">Signing Secret</Label>
								<div className="flex items-center gap-2 mt-1">
									<code className="text-sm bg-muted px-2 py-1 rounded flex-1 font-mono">
										{showSecret ? displaySecret : '••••••••••••••••••••••••'}
									</code>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setShowSecret(!showSecret)}
									>
										{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
									</Button>
									<Button variant="ghost" size="icon" onClick={handleCopySecret}>
										<Copy className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onClick={handleRegenerateSecret}
										disabled={regenerating}
									>
										<RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
									</Button>
								</div>
								{newSecret && (
									<p className="text-xs text-yellow-600 mt-1">
										This is your new secret. It will only be shown once.
									</p>
								)}
							</div>

							<div>
								<Label className="text-muted-foreground">Subscribed Events</Label>
								<div className="flex flex-wrap gap-1 mt-1">
									{webhook.events.map((event) => (
										<Badge key={event} variant="secondary">
											{eventTypeLabels[event] || event}
										</Badge>
									))}
								</div>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<div>
									<Label className="text-muted-foreground">Retry Count</Label>
									<p className="mt-1">{webhook.retryCount}</p>
								</div>
								<div>
									<Label className="text-muted-foreground">Retry Delay</Label>
									<p className="mt-1">{webhook.retryDelayMs / 1000}s</p>
								</div>
								<div>
									<Label className="text-muted-foreground">Timeout</Label>
									<p className="mt-1">{webhook.timeoutMs / 1000}s</p>
								</div>
							</div>

							{webhook.headers && Object.keys(webhook.headers).length > 0 && (
								<div>
									<Label className="text-muted-foreground">Custom Headers</Label>
									<div className="mt-1 space-y-1">
										{Object.entries(webhook.headers).map(([key, value]) => (
											<div key={key} className="font-mono text-sm">
												<span className="text-muted-foreground">{key}:</span> {value}
											</div>
										))}
									</div>
								</div>
							)}

							{webhook.lastError && (
								<div>
									<Label className="text-muted-foreground text-red-500">Last Error</Label>
									<p className="mt-1 text-red-600 text-sm">{webhook.lastError}</p>
								</div>
							)}

							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<Label className="text-muted-foreground">Created</Label>
									<p className="mt-1">{new Date(webhook.createdAt).toLocaleString()}</p>
								</div>
								{webhook.lastTriggeredAt && (
									<div>
										<Label className="text-muted-foreground">Last Triggered</Label>
										<p className="mt-1">{new Date(webhook.lastTriggeredAt).toLocaleString()}</p>
									</div>
								)}
							</div>
						</div>
					</TabsContent>

					<TabsContent value="deliveries" className="flex-1 overflow-hidden mt-4">
						<ScrollArea className="h-[calc(100vh-280px)]">
							{loadingDeliveries ? (
								<div className="space-y-3">
									{[1, 2, 3].map((i) => (
										<Skeleton key={i} className="h-20 w-full" />
									))}
								</div>
							) : deliveriesData?.deliveries?.length === 0 ? (
								<div className="text-center text-muted-foreground py-8">
									No delivery history yet
								</div>
							) : (
								<div className="space-y-3 pr-4">
									{deliveriesData?.deliveries?.map((delivery) => (
										<DeliveryCard key={delivery.id} delivery={delivery} />
									))}
								</div>
							)}
						</ScrollArea>
					</TabsContent>
				</Tabs>
			</SheetContent>
		</Sheet>
	)
}

function DeliveryCard({ delivery }: { delivery: WebhookDelivery }) {
	const [expanded, setExpanded] = useState(false)
	const statusConfig = deliveryStatusConfig[delivery.status]
	const StatusIcon = {
		pending: Clock,
		success: CheckCircle,
		failed: XCircle,
		retrying: RefreshCw,
	}[delivery.status]

	return (
		<div className="border rounded-lg p-3 space-y-2">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Badge className={statusConfig.color}>
						<StatusIcon className="mr-1 h-3 w-3" />
						{statusConfig.label}
					</Badge>
					<Badge variant="outline">
						{eventTypeLabels[delivery.eventType] || delivery.eventType}
					</Badge>
				</div>
				<span className="text-xs text-muted-foreground">
					{new Date(delivery.createdAt).toLocaleString()}
				</span>
			</div>

			<div className="flex items-center justify-between text-sm">
				<div className="flex items-center gap-4">
					{delivery.responseStatus && (
						<span className="font-mono">
							Status: {delivery.responseStatus}
						</span>
					)}
					{delivery.responseTime && (
						<span className="text-muted-foreground">
							{delivery.responseTime}ms
						</span>
					)}
					<span className="text-muted-foreground">
						Attempt {delivery.attempts}/{delivery.maxAttempts}
					</span>
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setExpanded(!expanded)}
				>
					{expanded ? 'Hide' : 'Show'} Details
				</Button>
			</div>

			{expanded && (
				<div className="space-y-2 pt-2 border-t">
					{delivery.error && (
						<div>
							<Label className="text-xs text-red-500">Error</Label>
							<p className="text-sm text-red-600">{delivery.error}</p>
						</div>
					)}
					{delivery.responseBody && (
						<div>
							<Label className="text-xs text-muted-foreground">Response Body</Label>
							<pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
								{delivery.responseBody}
							</pre>
						</div>
					)}
					<div>
						<Label className="text-xs text-muted-foreground">Event ID</Label>
						<p className="font-mono text-xs">{delivery.eventId}</p>
					</div>
				</div>
			)}
		</div>
	)
}

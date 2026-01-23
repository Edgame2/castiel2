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
import { Plus, Webhook, RefreshCw } from 'lucide-react'
import { DataTable } from '@/components/data-table/data-table'
import { createWebhookColumns } from './webhook-columns'
import { WebhookForm } from './webhook-form'
import { WebhookDetailsSheet } from './webhook-details-sheet'
import {
	WebhookConfig,
	CreateWebhookInput,
	UpdateWebhookInput,
} from './webhook-types'

interface WebhooksResponse {
	webhooks: WebhookConfig[]
}

export function WebhookList() {
	const queryClient = useQueryClient()
	const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null)
	const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null)
	const [deletingWebhook, setDeletingWebhook] = useState<WebhookConfig | null>(null)
	const [showCreateDialog, setShowCreateDialog] = useState(false)
	const [showDetailsSheet, setShowDetailsSheet] = useState(false)

	// Fetch webhooks
	const { data, isLoading, refetch } = useQuery<WebhooksResponse>({
		queryKey: ['webhooks'],
		queryFn: async () => {
			const response = await fetch('/api/v1/webhooks')
			if (!response.ok) throw new Error('Failed to fetch webhooks')
			return response.json()
		},
	})

	// Create webhook mutation
	const createMutation = useMutation({
		mutationFn: async (input: CreateWebhookInput) => {
			const response = await fetch('/api/v1/webhooks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input),
			})
			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to create webhook')
			}
			return response.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhooks'] })
			setShowCreateDialog(false)
			toast.success('Webhook created successfully')
		},
		onError: (error: Error) => {
			toast.error(error.message)
		},
	})

	// Update webhook mutation
	const updateMutation = useMutation({
		mutationFn: async ({ id, input }: { id: string; input: UpdateWebhookInput }) => {
			const response = await fetch(`/api/v1/webhooks/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input),
			})
			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to update webhook')
			}
			return response.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhooks'] })
			setEditingWebhook(null)
			toast.success('Webhook updated successfully')
		},
		onError: (error: Error) => {
			toast.error(error.message)
		},
	})

	// Delete webhook mutation
	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const response = await fetch(`/api/v1/webhooks/${id}`, {
				method: 'DELETE',
			})
			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to delete webhook')
			}
			return response.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhooks'] })
			setDeletingWebhook(null)
			toast.success('Webhook deleted successfully')
		},
		onError: (error: Error) => {
			toast.error(error.message)
		},
	})

	// Toggle active mutation
	const toggleActiveMutation = useMutation({
		mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
			const response = await fetch(`/api/v1/webhooks/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive }),
			})
			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to update webhook')
			}
			return response.json()
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['webhooks'] })
			toast.success(`Webhook ${variables.isActive ? 'activated' : 'deactivated'}`)
		},
		onError: (error: Error) => {
			toast.error(error.message)
		},
	})

	// Regenerate secret mutation
	const regenerateSecretMutation = useMutation({
		mutationFn: async (id: string) => {
			const response = await fetch(`/api/v1/webhooks/${id}/regenerate-secret`, {
				method: 'POST',
			})
			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to regenerate secret')
			}
			return response.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhooks'] })
		},
		onError: (error: Error) => {
			toast.error(error.message)
		},
	})

	// Test webhook mutation
	const testMutation = useMutation({
		mutationFn: async (id: string) => {
			const response = await fetch(`/api/v1/webhooks/${id}/test`, {
				method: 'POST',
			})
			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to test webhook')
			}
			return response.json()
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['webhooks'] })
			if (data.delivery?.status === 'success') {
				toast.success('Test webhook sent successfully')
			} else {
				toast.warning('Test webhook sent but may have failed. Check delivery history.')
			}
		},
		onError: (error: Error) => {
			toast.error(error.message)
		},
	})

	const handleToggleActive = useCallback((webhook: WebhookConfig) => {
		toggleActiveMutation.mutate({ id: webhook.id, isActive: !webhook.isActive })
	}, [toggleActiveMutation])

	const handleRegenerateSecret = useCallback(async (webhook: WebhookConfig): Promise<string | null> => {
		try {
			const result = await regenerateSecretMutation.mutateAsync(webhook.id)
			return result.secret
		} catch {
			return null
		}
	}, [regenerateSecretMutation])

	const handleTest = useCallback((webhook: WebhookConfig) => {
		testMutation.mutate(webhook.id)
	}, [testMutation])

	const handleViewDetails = useCallback((webhook: WebhookConfig) => {
		setSelectedWebhook(webhook)
		setShowDetailsSheet(true)
	}, [])

	const columns = useMemo(
		() =>
			createWebhookColumns({
				onViewDetails: handleViewDetails,
				onEdit: setEditingWebhook,
				onDelete: setDeletingWebhook,
				onToggleActive: handleToggleActive,
				onRegenerateSecret: (webhook) => {
					handleRegenerateSecret(webhook)
				},
				onTest: handleTest,
			}),
		[handleViewDetails, handleToggleActive, handleRegenerateSecret, handleTest]
	)

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
					<p className="text-muted-foreground">
						Configure webhooks to receive real-time notifications about shard events
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => refetch()}>
						<RefreshCw className="mr-2 h-4 w-4" />
						Refresh
					</Button>
					<Button onClick={() => setShowCreateDialog(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Create Webhook
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Webhook className="h-5 w-5" />
						Configured Webhooks
					</CardTitle>
					<CardDescription>
						{data?.webhooks?.length || 0} webhook{(data?.webhooks?.length || 0) !== 1 ? 's' : ''} configured
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={columns}
						data={data?.webhooks || []}
						searchKey="name"
						searchPlaceholder="Search webhooks..."
						isLoading={isLoading}
					/>
				</CardContent>
			</Card>

			{/* Create Dialog */}
			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Create Webhook</DialogTitle>
						<DialogDescription>
							Configure a new webhook to receive event notifications
						</DialogDescription>
					</DialogHeader>
					<WebhookForm
						onSubmit={async (data) => {
							await createMutation.mutateAsync(data as CreateWebhookInput)
						}}
						onCancel={() => setShowCreateDialog(false)}
						isLoading={createMutation.isPending}
					/>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog open={!!editingWebhook} onOpenChange={(open) => !open && setEditingWebhook(null)}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit Webhook</DialogTitle>
						<DialogDescription>
							Update webhook configuration
						</DialogDescription>
					</DialogHeader>
					{editingWebhook && (
						<WebhookForm
							webhook={editingWebhook}
							onSubmit={async (data) => {
								await updateMutation.mutateAsync({
									id: editingWebhook.id,
									input: data as UpdateWebhookInput,
								})
							}}
							onCancel={() => setEditingWebhook(null)}
							isLoading={updateMutation.isPending}
						/>
					)}
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation */}
			<Dialog open={!!deletingWebhook} onOpenChange={(open) => !open && setDeletingWebhook(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Webhook</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete the webhook &quot;{deletingWebhook?.name}&quot;? 
							This action cannot be undone and all delivery history will be lost.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeletingWebhook(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => deletingWebhook && deleteMutation.mutate(deletingWebhook.id)}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Details Sheet */}
			<WebhookDetailsSheet
				webhook={selectedWebhook}
				open={showDetailsSheet}
				onOpenChange={setShowDetailsSheet}
				onRegenerateSecret={handleRegenerateSecret}
			/>
		</div>
	)
}

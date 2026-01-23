/**
 * Webhook Types for Frontend
 */

export enum ShardEventType {
	CREATED = 'shard.created',
	UPDATED = 'shard.updated',
	DELETED = 'shard.deleted',
	RESTORED = 'shard.restored',
	ARCHIVED = 'shard.archived',
	RELATIONSHIP_ADDED = 'shard.relationship.added',
	RELATIONSHIP_REMOVED = 'shard.relationship.removed',
	ENRICHED = 'shard.enriched',
	STATUS_CHANGED = 'shard.status.changed',
	ACL_CHANGED = 'shard.acl.changed',
}

export interface WebhookConfig {
	id: string
	tenantId: string
	name: string
	description?: string
	url: string
	method: 'POST' | 'PUT'
	headers?: Record<string, string>
	events: ShardEventType[]
	filters?: {
		shardTypeIds?: string[]
		status?: string[]
	}
	retryCount: number
	retryDelayMs: number
	timeoutMs: number
	secret: string
	isActive: boolean
	lastTriggeredAt?: string
	failureCount: number
	lastError?: string
	createdAt: string
	createdBy: string
	updatedAt?: string
}

export interface WebhookDelivery {
	id: string
	webhookId: string
	tenantId: string
	eventId: string
	eventType: ShardEventType
	payload: Record<string, unknown>
	status: 'pending' | 'success' | 'failed' | 'retrying'
	attempts: number
	maxAttempts: number
	responseStatus?: number
	responseBody?: string
	responseTime?: number
	error?: string
	createdAt: string
	nextRetryAt?: string
	completedAt?: string
}

export interface CreateWebhookInput {
	name: string
	description?: string
	url: string
	method?: 'POST' | 'PUT'
	headers?: Record<string, string>
	events: ShardEventType[]
	filters?: {
		shardTypeIds?: string[]
		status?: string[]
	}
	retryCount?: number
	retryDelayMs?: number
	timeoutMs?: number
}

export interface UpdateWebhookInput {
	name?: string
	description?: string
	url?: string
	method?: 'POST' | 'PUT'
	headers?: Record<string, string>
	events?: ShardEventType[]
	filters?: {
		shardTypeIds?: string[]
		status?: string[]
	}
	retryCount?: number
	retryDelayMs?: number
	timeoutMs?: number
	isActive?: boolean
}

export const eventTypeLabels: Record<ShardEventType, string> = {
	[ShardEventType.CREATED]: 'Shard Created',
	[ShardEventType.UPDATED]: 'Shard Updated',
	[ShardEventType.DELETED]: 'Shard Deleted',
	[ShardEventType.RESTORED]: 'Shard Restored',
	[ShardEventType.ARCHIVED]: 'Shard Archived',
	[ShardEventType.RELATIONSHIP_ADDED]: 'Relationship Added',
	[ShardEventType.RELATIONSHIP_REMOVED]: 'Relationship Removed',
	[ShardEventType.ENRICHED]: 'Shard Enriched',
	[ShardEventType.STATUS_CHANGED]: 'Status Changed',
	[ShardEventType.ACL_CHANGED]: 'ACL Changed',
}

export const deliveryStatusConfig = {
	pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
	success: { color: 'bg-green-100 text-green-800', label: 'Success' },
	failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
	retrying: { color: 'bg-blue-100 text-blue-800', label: 'Retrying' },
}

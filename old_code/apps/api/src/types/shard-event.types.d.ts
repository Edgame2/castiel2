/**
 * Shard Event Types for webhooks and real-time updates
 */
/**
 * Types of shard events
 */
export declare enum ShardEventType {
    CREATED = "shard.created",
    UPDATED = "shard.updated",
    DELETED = "shard.deleted",
    RESTORED = "shard.restored",
    ARCHIVED = "shard.archived",
    RELATIONSHIP_ADDED = "shard.relationship.added",
    RELATIONSHIP_REMOVED = "shard.relationship.removed",
    ENRICHED = "shard.enriched",
    STATUS_CHANGED = "shard.status.changed",
    ACL_CHANGED = "shard.acl.changed"
}
/**
 * Source of the event trigger
 */
export type EventTriggerSource = 'ui' | 'api' | 'import' | 'integration' | 'system';
/**
 * Field change details
 */
export interface FieldChange {
    field: string;
    oldValue: any;
    newValue: any;
}
/**
 * Shard event payload
 */
export interface ShardEventPayload {
    eventId: string;
    eventType: ShardEventType;
    timestamp: Date;
    tenantId: string;
    shardId: string;
    shardTypeId: string;
    shardTypeName?: string;
    changes?: FieldChange[];
    triggeredBy: string;
    triggerSource: EventTriggerSource;
    shardSnapshot?: Record<string, any>;
    previousState?: Record<string, any>;
}
/**
 * Webhook configuration
 */
export interface WebhookConfig {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    url: string;
    method: 'POST' | 'PUT';
    headers?: Record<string, string>;
    events: ShardEventType[];
    filters?: {
        shardTypeIds?: string[];
        status?: string[];
    };
    retryCount: number;
    retryDelayMs: number;
    timeoutMs: number;
    secret: string;
    isActive: boolean;
    lastTriggeredAt?: Date;
    failureCount: number;
    lastError?: string;
    createdAt: Date;
    createdBy: string;
    updatedAt?: Date;
}
/**
 * Webhook delivery attempt
 */
export interface WebhookDelivery {
    id: string;
    webhookId: string;
    tenantId: string;
    eventId: string;
    eventType: ShardEventType;
    payload: ShardEventPayload;
    status: 'pending' | 'success' | 'failed' | 'retrying';
    attempts: number;
    maxAttempts: number;
    responseStatus?: number;
    responseBody?: string;
    responseTime?: number;
    error?: string;
    createdAt: Date;
    nextRetryAt?: Date;
    completedAt?: Date;
}
/**
 * Event subscription for SSE/WebSocket
 */
export interface EventSubscription {
    id: string;
    tenantId: string;
    userId: string;
    connectionId: string;
    events?: ShardEventType[];
    shardTypeIds?: string[];
    shardIds?: string[];
    connectedAt: Date;
    lastHeartbeat: Date;
}
/**
 * Create webhook input
 */
export interface CreateWebhookInput {
    name: string;
    description?: string;
    url: string;
    method?: 'POST' | 'PUT';
    headers?: Record<string, string>;
    events: ShardEventType[];
    filters?: {
        shardTypeIds?: string[];
        status?: string[];
    };
    retryCount?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
}
/**
 * Update webhook input
 */
export interface UpdateWebhookInput {
    name?: string;
    description?: string;
    url?: string;
    method?: 'POST' | 'PUT';
    headers?: Record<string, string>;
    events?: ShardEventType[];
    filters?: {
        shardTypeIds?: string[];
        status?: string[];
    };
    retryCount?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
    isActive?: boolean;
}
//# sourceMappingURL=shard-event.types.d.ts.map
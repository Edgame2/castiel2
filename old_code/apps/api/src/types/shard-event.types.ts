/**
 * Shard Event Types for webhooks and real-time updates
 */

/**
 * Types of shard events
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
  // Event metadata
  eventId: string;
  eventType: ShardEventType;
  timestamp: Date;

  // Tenant context
  tenantId: string;

  // Shard identity
  shardId: string;
  shardTypeId: string;
  shardTypeName?: string;

  // Change details
  changes?: FieldChange[];

  // Trigger info
  triggeredBy: string; // User ID
  triggerSource: EventTriggerSource;

  // Related data (optional, for convenience)
  shardSnapshot?: Record<string, any>;

  // Previous state (for updates/deletes)
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

  // Target
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;

  // Events to subscribe
  events: ShardEventType[];

  // Filters (optional)
  filters?: {
    shardTypeIds?: string[];
    status?: string[];
  };

  // Retry config
  retryCount: number;
  retryDelayMs: number;
  timeoutMs: number;

  // Security
  secret: string; // For HMAC signature verification

  // Status
  isActive: boolean;
  lastTriggeredAt?: Date;
  failureCount: number;
  lastError?: string;

  // Audit
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

  // Delivery status
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  maxAttempts: number;

  // Response details
  responseStatus?: number;
  responseBody?: string;
  responseTime?: number;
  error?: string;

  // Timestamps
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

  // Subscribe to specific events
  events?: ShardEventType[];

  // Filter by shard types
  shardTypeIds?: string[];

  // Filter by specific shards
  shardIds?: string[];

  // Connection info
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


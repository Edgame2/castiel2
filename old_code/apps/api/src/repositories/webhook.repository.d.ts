import { IMonitoringProvider } from '@castiel/monitoring';
import { WebhookConfig, CreateWebhookInput, UpdateWebhookInput, ShardEventType } from '../types/shard-event.types.js';
export interface WebhookListOptions {
    tenantId: string;
    isActive?: boolean;
    eventType?: ShardEventType;
    limit?: number;
    continuationToken?: string;
}
export interface WebhookListResult {
    webhooks: WebhookConfig[];
    continuationToken?: string;
    count: number;
}
/**
 * Webhook Repository
 * Handles all Cosmos DB operations for Webhooks
 */
export declare class WebhookRepository {
    private client;
    private container;
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Initialize container with proper indexing
     */
    ensureContainer(): Promise<void>;
    /**
     * Generate a secure webhook secret
     */
    private generateSecret;
    /**
     * Create a new webhook
     */
    create(tenantId: string, input: CreateWebhookInput, createdBy: string): Promise<WebhookConfig>;
    /**
     * Find webhook by ID
     */
    findById(id: string, tenantId: string): Promise<WebhookConfig | undefined>;
    /**
     * Update webhook
     */
    update(id: string, tenantId: string, input: UpdateWebhookInput): Promise<WebhookConfig>;
    /**
     * Delete webhook
     */
    delete(id: string, tenantId: string): Promise<void>;
    /**
     * List webhooks
     */
    list(options: WebhookListOptions): Promise<WebhookListResult>;
    /**
     * Find all active webhooks subscribed to an event type for a tenant
     */
    findActiveByEventType(tenantId: string, eventType: ShardEventType): Promise<WebhookConfig[]>;
    /**
     * Update webhook status (for circuit breaker pattern)
     */
    updateStatus(id: string, tenantId: string, updates: {
        isActive?: boolean;
        failureCount?: number;
        lastError?: string;
        lastTriggeredAt?: Date;
    }): Promise<void>;
    /**
     * Regenerate webhook secret
     */
    regenerateSecret(id: string, tenantId: string): Promise<string>;
}
//# sourceMappingURL=webhook.repository.d.ts.map
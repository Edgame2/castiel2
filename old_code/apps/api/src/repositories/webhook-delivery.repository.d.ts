import { IMonitoringProvider } from '@castiel/monitoring';
import { WebhookDelivery, ShardEventPayload, ShardEventType } from '../types/shard-event.types.js';
export interface WebhookDeliveryListOptions {
    tenantId: string;
    webhookId?: string;
    status?: 'pending' | 'success' | 'failed' | 'retrying';
    eventType?: ShardEventType;
    limit?: number;
    continuationToken?: string;
}
export interface WebhookDeliveryListResult {
    deliveries: WebhookDelivery[];
    continuationToken?: string;
    count: number;
}
/**
 * Webhook Delivery Repository
 * Handles all Cosmos DB operations for Webhook Deliveries
 */
export declare class WebhookDeliveryRepository {
    private client;
    private container;
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Initialize container with proper indexing
     */
    ensureContainer(): Promise<void>;
    /**
     * Create a new delivery record
     */
    create(webhookId: string, tenantId: string, payload: ShardEventPayload, maxAttempts: number): Promise<WebhookDelivery>;
    /**
     * Find delivery by ID
     */
    findById(id: string, tenantId: string): Promise<WebhookDelivery | undefined>;
    /**
     * Update delivery status after attempt
     */
    updateAfterAttempt(id: string, tenantId: string, update: {
        status: 'success' | 'failed' | 'retrying';
        responseStatus?: number;
        responseBody?: string;
        responseTime?: number;
        error?: string;
        nextRetryAt?: Date;
    }): Promise<WebhookDelivery>;
    /**
     * List deliveries
     */
    list(options: WebhookDeliveryListOptions): Promise<WebhookDeliveryListResult>;
    /**
     * Find deliveries pending retry
     */
    findPendingRetries(tenantId?: string, limit?: number): Promise<WebhookDelivery[]>;
    /**
     * Get delivery statistics for a webhook
     */
    getStats(tenantId: string, webhookId: string, since?: Date): Promise<{
        total: number;
        success: number;
        failed: number;
        pending: number;
        retrying: number;
        avgResponseTime: number;
    }>;
    /**
     * Delete old deliveries (cleanup)
     */
    deleteOldDeliveries(tenantId: string, olderThan: Date): Promise<number>;
}
//# sourceMappingURL=webhook-delivery.repository.d.ts.map
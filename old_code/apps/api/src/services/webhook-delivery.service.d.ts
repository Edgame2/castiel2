import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardEventPayload, WebhookDelivery } from '../types/shard-event.types.js';
import { WebhookRepository } from '../repositories/webhook.repository.js';
import { WebhookDeliveryRepository } from '../repositories/webhook-delivery.repository.js';
import { ShardEventService } from './shard-event.service.js';
/**
 * Webhook Delivery Service
 * Handles webhook delivery with retry logic, circuit breaker, and signature verification
 */
export declare class WebhookDeliveryService {
    private redis;
    private monitoring;
    private webhookRepository;
    private deliveryRepository;
    private eventService;
    private processingInterval;
    private retryInterval;
    private isProcessing;
    constructor(redis: Redis, monitoring: IMonitoringProvider, eventService: ShardEventService);
    /**
     * Initialize the delivery service
     */
    initialize(): Promise<void>;
    /**
     * Shutdown the delivery service
     */
    shutdown(): void;
    /**
     * Start background processing of webhook queue
     */
    private startProcessing;
    /**
     * Start retry processing
     */
    private startRetryProcessing;
    /**
     * Process events from the Redis queue
     */
    private processQueue;
    /**
     * Process a single event - find matching webhooks and queue deliveries
     */
    private processEvent;
    /**
     * Process a single audit event - find matching webhooks and queue deliveries
     */
    private processAuditEvent;
    /**
     * Check if event matches webhook filters
     */
    private matchesFilters;
    /**
     * Attempt to deliver a webhook
     */
    private attemptDelivery;
    /**
     * Handle delivery failure - schedule retry or mark as failed
     */
    private handleDeliveryFailure;
    /**
     * Process pending retries
     */
    private processRetries;
    /**
     * Generate HMAC-SHA256 signature for payload
     */
    private generateSignature;
    /**
     * Verify webhook signature (utility for webhook consumers)
     */
    static verifySignature(payload: string, signature: string, secret: string): boolean;
    /**
     * Manually trigger a webhook delivery (for testing)
     */
    triggerManual(webhookId: string, tenantId: string, payload: ShardEventPayload): Promise<WebhookDelivery>;
    /**
     * Retry a specific failed delivery
     */
    retryDelivery(deliveryId: string, tenantId: string): Promise<WebhookDelivery>;
    /**
     * Get webhook repository (for controller access)
     */
    getWebhookRepository(): WebhookRepository;
    /**
     * Get delivery repository (for controller access)
     */
    getDeliveryRepository(): WebhookDeliveryRepository;
}
//# sourceMappingURL=webhook-delivery.service.d.ts.map
/**
 * Audit Webhook Emitter Service
 * Emits audit events to configured webhooks
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { DocumentAuditEventType } from '../types/document-audit.types.js';
/**
 * Audit webhook event payload
 */
export interface AuditWebhookPayload {
    id: string;
    tenantId: string;
    userId: string;
    action: DocumentAuditEventType;
    timestamp: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    documentId?: string;
    collectionId?: string;
    metadata: Record<string, any>;
    status: 'success' | 'error';
    error?: string;
}
/**
 * Audit Webhook Emitter
 * Sends audit events to tenant-configured webhooks via Redis queue
 */
export declare class AuditWebhookEmitter {
    private redis;
    private monitoring;
    constructor(redis: Redis, monitoring: IMonitoringProvider);
    /**
     * Emit audit event to webhooks
     * Pushes to Redis queue for async processing by WebhookDeliveryService
     */
    emitAuditEvent(payload: AuditWebhookPayload): Promise<void>;
    /**
     * Emit multiple audit events (batch)
     */
    emitBatch(payloads: AuditWebhookPayload[]): Promise<void>;
    /**
     * Get audit webhook queue stats
     */
    getQueueStats(tenantId: string): Promise<{
        queueLength: number;
        estimatedDeliveryCount: number;
    }>;
    /**
     * Clear audit webhook queue for tenant
     */
    clearQueue(tenantId: string): Promise<void>;
}
//# sourceMappingURL=audit-webhook-emitter.service.d.ts.map
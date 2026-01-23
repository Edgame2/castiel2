/**
 * Audit Webhook Emitter Service
 * Emits audit events to configured webhooks
 */
/**
 * Audit Webhook Emitter
 * Sends audit events to tenant-configured webhooks via Redis queue
 */
export class AuditWebhookEmitter {
    redis;
    monitoring;
    constructor(redis, monitoring) {
        this.redis = redis;
        this.monitoring = monitoring;
    }
    /**
     * Emit audit event to webhooks
     * Pushes to Redis queue for async processing by WebhookDeliveryService
     */
    async emitAuditEvent(payload) {
        try {
            const { tenantId, action } = payload;
            // Create queue key for this tenant
            const queueKey = `webhook:audit:queue:${tenantId}`;
            // Push event to queue
            await this.redis.lpush(queueKey, JSON.stringify({
                ...payload,
                // Add metadata for webhook filtering
                eventType: action,
                eventCategory: 'audit',
                deliveryMetadata: {
                    emittedAt: new Date().toISOString(),
                    retryAttempt: 1,
                    maxRetries: 3,
                },
            }));
            // Set queue expiration (24 hours)
            await this.redis.expire(queueKey, 24 * 60 * 60);
            this.monitoring.trackEvent('auditWebhook.emitted', {
                tenantId,
                action,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'auditWebhookEmitter.emitAuditEvent',
                tenantId: payload.tenantId,
                action: payload.action,
            });
            // Don't throw - audit webhook failure shouldn't break audit logging
            this.monitoring.trackMetric('auditWebhook.emission.error', 1, {
                tenantId: payload.tenantId,
                action: payload.action,
            });
        }
    }
    /**
     * Emit multiple audit events (batch)
     */
    async emitBatch(payloads) {
        const results = await Promise.allSettled(payloads.map(payload => this.emitAuditEvent(payload)));
        const failures = results.filter(r => r.status === 'rejected').length;
        if (failures > 0) {
            this.monitoring.trackMetric('auditWebhook.batch.failures', failures);
        }
    }
    /**
     * Get audit webhook queue stats
     */
    async getQueueStats(tenantId) {
        try {
            const queueKey = `webhook:audit:queue:${tenantId}`;
            const length = await this.redis.llen(queueKey);
            return {
                queueLength: length,
                estimatedDeliveryCount: length, // Estimated based on pending events
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'auditWebhookEmitter.getQueueStats',
                tenantId,
            });
            return { queueLength: 0, estimatedDeliveryCount: 0 };
        }
    }
    /**
     * Clear audit webhook queue for tenant
     */
    async clearQueue(tenantId) {
        try {
            const queueKey = `webhook:audit:queue:${tenantId}`;
            await this.redis.del(queueKey);
            this.monitoring.trackEvent('auditWebhook.queue.cleared', { tenantId });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'auditWebhookEmitter.clearQueue',
                tenantId,
            });
        }
    }
}
//# sourceMappingURL=audit-webhook-emitter.service.js.map
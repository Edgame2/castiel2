import { ShardEventType, } from '../types/shard-event.types.js';
import { v4 as uuidv4 } from 'uuid';
// AuthContext declaration moved to types/fastify.d.ts
/**
 * Webhook Controller
 * Handles webhook CRUD operations and delivery management
 */
export class WebhookController {
    deliveryService;
    monitoring;
    constructor(monitoring, deliveryService) {
        this.monitoring = monitoring;
        this.deliveryService = deliveryService;
    }
    /**
     * Create a new webhook
     * POST /api/v1/webhooks
     */
    createWebhook = async (req, reply) => {
        const startTime = Date.now();
        try {
            const auth = req.auth;
            if (!auth || !auth.tenantId || !(auth).userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { tenantId, userId } = auth;
            if (!tenantId || !userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const webhook = await this.deliveryService
                .getWebhookRepository()
                .create(tenantId, req.body, userId);
            // Don't expose the secret in the response
            const response = { ...webhook, secret: undefined, secretMasked: '********' };
            this.monitoring.trackMetric('api.webhook.create.duration', Date.now() - startTime);
            return reply.status(201).send(response);
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'webhook.create' });
            return reply.status(500).send({ error: 'Failed to create webhook', details: error.message });
        }
    };
    /**
     * List webhooks
     * GET /api/v1/webhooks
     */
    listWebhooks = async (req, reply) => {
        const startTime = Date.now();
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { isActive, eventType, limit, continuationToken } = req.query;
            const result = await this.deliveryService.getWebhookRepository().list({
                tenantId,
                isActive,
                eventType,
                limit,
                continuationToken,
            });
            // Don't expose secrets
            const webhooks = result.webhooks.map(w => ({ ...w, secret: undefined, secretMasked: '********' }));
            this.monitoring.trackMetric('api.webhook.list.duration', Date.now() - startTime);
            return reply.status(200).send({ ...result, webhooks });
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'webhook.list' });
            return reply.status(500).send({ error: 'Failed to list webhooks', details: error.message });
        }
    };
    /**
     * Get webhook by ID
     * GET /api/v1/webhooks/:id
     */
    getWebhook = async (req, reply) => {
        const startTime = Date.now();
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { id } = req.params;
            const webhook = await this.deliveryService.getWebhookRepository().findById(id, tenantId);
            if (!webhook) {
                return reply.status(404).send({ error: 'Webhook not found' });
            }
            // Don't expose the secret
            const response = { ...webhook, secret: undefined, secretMasked: '********' };
            this.monitoring.trackMetric('api.webhook.get.duration', Date.now() - startTime);
            return reply.status(200).send(response);
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'webhook.get' });
            return reply.status(500).send({ error: 'Failed to get webhook', details: error.message });
        }
    };
    /**
     * Update webhook
     * PATCH /api/v1/webhooks/:id
     */
    updateWebhook = async (req, reply) => {
        const startTime = Date.now();
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { id } = req.params;
            const webhook = await this.deliveryService.getWebhookRepository().update(id, tenantId, req.body);
            // Don't expose the secret
            const response = { ...webhook, secret: undefined, secretMasked: '********' };
            this.monitoring.trackMetric('api.webhook.update.duration', Date.now() - startTime);
            return reply.status(200).send(response);
        }
        catch (error) {
            if (error.message?.includes('not found')) {
                return reply.status(404).send({ error: 'Webhook not found' });
            }
            this.monitoring.trackException(error, { operation: 'webhook.update' });
            return reply.status(500).send({ error: 'Failed to update webhook', details: error.message });
        }
    };
    /**
     * Delete webhook
     * DELETE /api/v1/webhooks/:id
     */
    deleteWebhook = async (req, reply) => {
        const startTime = Date.now();
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { id } = req.params;
            await this.deliveryService.getWebhookRepository().delete(id, tenantId);
            this.monitoring.trackMetric('api.webhook.delete.duration', Date.now() - startTime);
            return reply.status(204).send();
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'webhook.delete' });
            return reply.status(500).send({ error: 'Failed to delete webhook', details: error.message });
        }
    };
    /**
     * Regenerate webhook secret
     * POST /api/v1/webhooks/:id/regenerate-secret
     */
    regenerateSecret = async (req, reply) => {
        const startTime = Date.now();
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { id } = req.params;
            const newSecret = await this.deliveryService.getWebhookRepository().regenerateSecret(id, tenantId);
            this.monitoring.trackMetric('api.webhook.regenerateSecret.duration', Date.now() - startTime);
            return reply.status(200).send({ secret: newSecret });
        }
        catch (error) {
            if (error.message?.includes('not found')) {
                return reply.status(404).send({ error: 'Webhook not found' });
            }
            this.monitoring.trackException(error, { operation: 'webhook.regenerateSecret' });
            return reply.status(500).send({ error: 'Failed to regenerate secret', details: error.message });
        }
    };
    /**
     * Test webhook (send a test event)
     * POST /api/v1/webhooks/:id/test
     */
    testWebhook = async (req, reply) => {
        const startTime = Date.now();
        try {
            const auth = req.auth;
            if (!auth || !auth.tenantId || !(auth).userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { tenantId, userId } = auth;
            if (!tenantId || !userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { id } = req.params;
            // Create a test event payload
            const testPayload = {
                eventId: uuidv4(),
                eventType: ShardEventType.CREATED,
                timestamp: new Date(),
                tenantId,
                shardId: 'test-shard-id',
                shardTypeId: 'test-shard-type-id',
                shardTypeName: 'Test Shard Type',
                triggeredBy: userId,
                triggerSource: 'api',
                shardSnapshot: {
                    id: 'test-shard-id',
                    tenantId,
                    shardTypeId: 'test-shard-type-id',
                    shardTypeName: 'Test Shard Type',
                    title: 'Test Shard',
                    status: 'active',
                    structuredData: { testField: 'testValue' },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            };
            const delivery = await this.deliveryService.triggerManual(id, tenantId, testPayload);
            this.monitoring.trackMetric('api.webhook.test.duration', Date.now() - startTime);
            return reply.status(200).send({
                message: 'Test webhook sent',
                delivery: {
                    id: delivery.id,
                    status: delivery.status,
                    responseStatus: delivery.responseStatus,
                    responseTime: delivery.responseTime,
                    error: delivery.error,
                },
            });
        }
        catch (error) {
            if (error.message?.includes('not found')) {
                return reply.status(404).send({ error: 'Webhook not found' });
            }
            this.monitoring.trackException(error, { operation: 'webhook.test' });
            return reply.status(500).send({ error: 'Failed to test webhook', details: error.message });
        }
    };
    /**
     * List webhook deliveries
     * GET /api/v1/webhooks/:id/deliveries
     */
    listDeliveries = async (req, reply) => {
        const startTime = Date.now();
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { id } = req.params;
            const { status, limit, continuationToken } = req.query;
            const result = await this.deliveryService.getDeliveryRepository().list({
                tenantId,
                webhookId: id,
                status,
                limit,
                continuationToken,
            });
            this.monitoring.trackMetric('api.webhook.listDeliveries.duration', Date.now() - startTime);
            return reply.status(200).send(result);
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'webhook.listDeliveries' });
            return reply.status(500).send({ error: 'Failed to list deliveries', details: error.message });
        }
    };
    /**
     * Get delivery by ID
     * GET /api/v1/webhooks/deliveries/:deliveryId
     */
    getDelivery = async (req, reply) => {
        const startTime = Date.now();
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { deliveryId } = req.params;
            const delivery = await this.deliveryService.getDeliveryRepository().findById(deliveryId, tenantId);
            if (!delivery) {
                return reply.status(404).send({ error: 'Delivery not found' });
            }
            this.monitoring.trackMetric('api.webhook.getDelivery.duration', Date.now() - startTime);
            return reply.status(200).send(delivery);
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'webhook.getDelivery' });
            return reply.status(500).send({ error: 'Failed to get delivery', details: error.message });
        }
    };
    /**
     * Retry a failed delivery
     * POST /api/v1/webhooks/deliveries/:deliveryId/retry
     */
    retryDelivery = async (req, reply) => {
        const startTime = Date.now();
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { deliveryId } = req.params;
            const delivery = await this.deliveryService.retryDelivery(deliveryId, tenantId);
            this.monitoring.trackMetric('api.webhook.retryDelivery.duration', Date.now() - startTime);
            return reply.status(200).send({
                message: 'Delivery retry initiated',
                delivery: {
                    id: delivery.id,
                    status: delivery.status,
                    responseStatus: delivery.responseStatus,
                    responseTime: delivery.responseTime,
                    error: delivery.error,
                },
            });
        }
        catch (error) {
            if (error.message?.includes('not found')) {
                return reply.status(404).send({ error: 'Delivery not found' });
            }
            if (error.message?.includes('Cannot retry')) {
                return reply.status(400).send({ error: error.message });
            }
            this.monitoring.trackException(error, { operation: 'webhook.retryDelivery' });
            return reply.status(500).send({ error: 'Failed to retry delivery', details: error.message });
        }
    };
    /**
     * Get webhook statistics
     * GET /api/v1/webhooks/:id/stats
     */
    getWebhookStats = async (req, reply) => {
        const startTime = Date.now();
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { id } = req.params;
            const { since } = req.query;
            const sinceDate = since ? new Date(since) : undefined;
            const stats = await this.deliveryService.getDeliveryRepository().getStats(tenantId, id, sinceDate);
            this.monitoring.trackMetric('api.webhook.getStats.duration', Date.now() - startTime);
            return reply.status(200).send(stats);
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'webhook.getStats' });
            return reply.status(500).send({ error: 'Failed to get webhook stats', details: error.message });
        }
    };
}
//# sourceMappingURL=webhook.controller.js.map
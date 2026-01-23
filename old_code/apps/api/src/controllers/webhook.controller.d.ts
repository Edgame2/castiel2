import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { WebhookDeliveryService } from '../services/webhook-delivery.service.js';
import { CreateWebhookInput, UpdateWebhookInput, ShardEventType } from '../types/shard-event.types.js';
/**
 * Webhook Controller
 * Handles webhook CRUD operations and delivery management
 */
export declare class WebhookController {
    private deliveryService;
    private monitoring;
    constructor(monitoring: IMonitoringProvider, deliveryService: WebhookDeliveryService);
    /**
     * Create a new webhook
     * POST /api/v1/webhooks
     */
    createWebhook: (req: FastifyRequest<{
        Body: CreateWebhookInput;
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * List webhooks
     * GET /api/v1/webhooks
     */
    listWebhooks: (req: FastifyRequest<{
        Querystring: {
            isActive?: boolean;
            eventType?: ShardEventType;
            limit?: number;
            continuationToken?: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * Get webhook by ID
     * GET /api/v1/webhooks/:id
     */
    getWebhook: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * Update webhook
     * PATCH /api/v1/webhooks/:id
     */
    updateWebhook: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: UpdateWebhookInput;
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * Delete webhook
     * DELETE /api/v1/webhooks/:id
     */
    deleteWebhook: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * Regenerate webhook secret
     * POST /api/v1/webhooks/:id/regenerate-secret
     */
    regenerateSecret: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * Test webhook (send a test event)
     * POST /api/v1/webhooks/:id/test
     */
    testWebhook: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * List webhook deliveries
     * GET /api/v1/webhooks/:id/deliveries
     */
    listDeliveries: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Querystring: {
            status?: "pending" | "success" | "failed" | "retrying";
            limit?: number;
            continuationToken?: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * Get delivery by ID
     * GET /api/v1/webhooks/deliveries/:deliveryId
     */
    getDelivery: (req: FastifyRequest<{
        Params: {
            deliveryId: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * Retry a failed delivery
     * POST /api/v1/webhooks/deliveries/:deliveryId/retry
     */
    retryDelivery: (req: FastifyRequest<{
        Params: {
            deliveryId: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * Get webhook statistics
     * GET /api/v1/webhooks/:id/stats
     */
    getWebhookStats: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Querystring: {
            since?: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
}
//# sourceMappingURL=webhook.controller.d.ts.map
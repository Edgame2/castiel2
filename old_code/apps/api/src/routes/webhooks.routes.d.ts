import { WebhookManagementService } from '../services/webhook-management.service.js';
/**
 * Webhook Routes
 *
 * Endpoints:
 * POST   /webhooks/:registrationId  - Receive webhook events
 * POST   /integrations/:id/webhooks - Register webhook
 * DELETE /webhooks/:registrationId   - Unregister webhook
 * GET    /webhooks/:registrationId   - Get webhook details
 * GET    /webhooks                   - List webhooks
 * GET    /webhooks/:registrationId/health - Check webhook health
 */
export declare function registerWebhookRoutes(app: any, // FastifyInstance
webhookService: WebhookManagementService): void;
//# sourceMappingURL=webhooks.routes.d.ts.map
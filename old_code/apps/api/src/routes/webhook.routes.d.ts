import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { WebhookDeliveryService } from '../services/webhook-delivery.service.js';
interface WebhookRoutesOptions extends FastifyPluginOptions {
    monitoring: IMonitoringProvider;
    deliveryService: WebhookDeliveryService;
}
/**
 * Register webhook routes
 */
export declare function webhookRoutes(server: FastifyInstance, options: WebhookRoutesOptions): Promise<void>;
export {};
//# sourceMappingURL=webhook.routes.d.ts.map
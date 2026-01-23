/**
 * AI Models Management Routes (Super Admin Only)
 *
 * Manages the catalog of available AI models
 */
import { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
export declare function aiModelsRoutes(fastify: FastifyInstance, options: {
    monitoring: IMonitoringProvider;
}): Promise<void>;
//# sourceMappingURL=ai-models.routes.d.ts.map
/**
 * Revisions Routes
 *
 * Registers all revision management endpoints for shards.
 */
import { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Register revision routes
 */
export declare function registerRevisionsRoutes(server: FastifyInstance, monitoring: IMonitoringProvider, cacheService?: any, cacheSubscriber?: any): Promise<void>;
//# sourceMappingURL=revisions.routes.d.ts.map
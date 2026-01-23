/**
 * Vector Search Routes
 * REST API endpoints for vector search
 */
import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Register vector search routes
 */
export declare function registerVectorSearchRoutes(server: FastifyInstance, monitoring: IMonitoringProvider, cacheService?: any, cacheSubscriber?: any): Promise<void>;
//# sourceMappingURL=vector-search.routes.d.ts.map
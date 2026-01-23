/**
 * Vectorization Routes
 * API endpoints for shard vectorization
 */
import { FastifyPluginAsync } from 'fastify';
import { VectorizationService } from '../services/vectorization.service.js';
/**
 * Vectorization routes plugin
 */
export declare const vectorizationRoutes: FastifyPluginAsync;
declare module 'fastify' {
    interface FastifyInstance {
        vectorizationService?: VectorizationService;
    }
}
//# sourceMappingURL=vectorization.routes.d.ts.map
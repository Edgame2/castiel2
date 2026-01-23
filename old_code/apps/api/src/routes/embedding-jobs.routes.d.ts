import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Register embedding job routes
 * Provides API endpoints for tracking embedding job status and statistics
 */
export declare function registerEmbeddingJobRoutes(server: FastifyInstance, monitoring: IMonitoringProvider): Promise<void>;
//# sourceMappingURL=embedding-jobs.routes.d.ts.map
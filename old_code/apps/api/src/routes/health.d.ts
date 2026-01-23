import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Health check routes
 */
export declare function registerHealthRoutes(server: FastifyInstance, redis: Redis | null, monitoring?: IMonitoringProvider): Promise<void>;
//# sourceMappingURL=health.d.ts.map
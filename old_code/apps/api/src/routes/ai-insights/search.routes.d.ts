import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
export declare function registerInsightsSearchRoutes(fastify: FastifyInstance, options: {
    prefix?: string;
    monitoring: IMonitoringProvider;
}): Promise<void>;
//# sourceMappingURL=search.routes.d.ts.map
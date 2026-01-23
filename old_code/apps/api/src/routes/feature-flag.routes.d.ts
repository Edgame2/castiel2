/**
 * Feature Flag Routes
 *
 * REST API routes for managing feature flags.
 */
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Register feature flag routes
 */
export declare function registerFeatureFlagRoutes(fastify: FastifyInstance, options: FastifyPluginOptions & {
    monitoring: IMonitoringProvider;
}): Promise<void>;
//# sourceMappingURL=feature-flag.routes.d.ts.map
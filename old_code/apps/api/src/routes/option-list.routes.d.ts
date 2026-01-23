/**
 * Option List Routes
 *
 * REST API routes for managing reusable option lists.
 */
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Register option list routes
 */
export declare function optionListRoutes(fastify: FastifyInstance, options: FastifyPluginOptions & {
    monitoring: IMonitoringProvider;
}): Promise<void>;
export default optionListRoutes;
//# sourceMappingURL=option-list.routes.d.ts.map
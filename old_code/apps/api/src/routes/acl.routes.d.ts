/**
 * ACL Routes
 *
 * Registers all ACL management endpoints for access control operations.
 */
import { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Register ACL routes
 */
export declare function registerACLRoutes(server: FastifyInstance, monitoring: IMonitoringProvider, cacheService?: any, cacheSubscriber?: any): Promise<void>;
//# sourceMappingURL=acl.routes.d.ts.map
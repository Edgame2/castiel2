/**
 * Admin Dashboard API Routes
 *
 * Provides REST endpoints for admin dashboard operations:
 * - Provider management
 * - Fallback chain configuration
 * - Provider health monitoring
 * - Usage analytics
 * - Quota management
 * - Tenant configuration
 *
 * @author AI Insights Team
 * @version 1.0.0
 */
import { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Register admin dashboard routes
 */
export declare function adminDashboardRoutes(fastify: FastifyInstance, options: {
    monitoring: IMonitoringProvider;
}): Promise<void>;
//# sourceMappingURL=admin-dashboard.routes.d.ts.map
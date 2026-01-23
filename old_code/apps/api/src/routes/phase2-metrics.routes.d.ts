/**
 * Phase 2 Metrics Routes
 *
 * Provides REST endpoints for querying system metrics stored as shards:
 * - GET /api/v1/metrics - Query metrics
 * - GET /api/v1/metrics/aggregated - Get aggregated metrics (P50, P95, P99)
 */
import { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Register Phase 2 Metrics routes
 */
export declare function registerPhase2MetricsRoutes(server: FastifyInstance, monitoring: IMonitoringProvider): Promise<void>;
//# sourceMappingURL=phase2-metrics.routes.d.ts.map
/**
 * Redaction Configuration Routes (Phase 2)
 *
 * Provides REST endpoints for configuring PII redaction policies:
 * - GET /api/v1/redaction/config - Get redaction configuration
 * - PUT /api/v1/redaction/config - Configure redaction
 * - DELETE /api/v1/redaction/config - Disable redaction
 */
import { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Register Redaction Configuration routes
 */
export declare function registerRedactionRoutes(server: FastifyInstance, monitoring: IMonitoringProvider): Promise<void>;
//# sourceMappingURL=redaction.routes.d.ts.map
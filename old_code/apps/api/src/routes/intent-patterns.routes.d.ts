/**
 * Intent Pattern Management Routes (Super Admin Only)
 * API endpoints for managing intent classification patterns
 */
import { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { IntentPatternService } from '../services/intent-pattern.service.js';
/**
 * Register intent pattern routes
 */
export declare function registerIntentPatternRoutes(server: FastifyInstance, service: IntentPatternService, monitoring: IMonitoringProvider): Promise<void>;
//# sourceMappingURL=intent-patterns.routes.d.ts.map
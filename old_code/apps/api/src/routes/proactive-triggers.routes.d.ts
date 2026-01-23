/**
 * Proactive Triggers API Routes
 * Provides endpoints for managing proactive trigger configurations
 */
import type { FastifyInstance } from 'fastify';
import { ProactiveTriggersRepository } from '../repositories/proactive-triggers.repository.js';
/**
 * Register proactive triggers routes
 */
export declare function registerProactiveTriggersRoutes(server: FastifyInstance, repository: ProactiveTriggersRepository, proactiveInsightService?: any): Promise<void>;
//# sourceMappingURL=proactive-triggers.routes.d.ts.map
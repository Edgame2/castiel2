/**
 * Opportunity API Routes
 * REST endpoints for opportunity management, pipeline, and forecasting
 */
import type { FastifyInstance } from 'fastify';
import { OpportunityService } from '../services/opportunity.service.js';
interface OpportunityRoutesOptions {
    opportunityService: OpportunityService;
}
/**
 * Register opportunity routes
 */
export declare function registerOpportunityRoutes(server: FastifyInstance, options: OpportunityRoutesOptions): Promise<void>;
export {};
//# sourceMappingURL=opportunity.routes.d.ts.map
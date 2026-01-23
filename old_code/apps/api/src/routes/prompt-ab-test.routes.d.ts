/**
 * Prompt A/B Testing Routes
 * API endpoints for managing prompt A/B test experiments
 */
import { FastifyInstance } from 'fastify';
import { PromptABTestService } from '../services/prompt-ab-test.service.js';
export declare function promptABTestRoutes(fastify: FastifyInstance, options: {
    abTestService: PromptABTestService;
}): Promise<void>;
//# sourceMappingURL=prompt-ab-test.routes.d.ts.map
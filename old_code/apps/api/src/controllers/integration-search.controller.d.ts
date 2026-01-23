/**
 * Integration Search Controller
 * Handles HTTP requests for integration search
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { IntegrationSearchService } from '../services/integration-search.service.js';
import { IntegrationService } from '../services/integration.service.js';
export declare class IntegrationSearchController {
    private searchService;
    private integrationService?;
    constructor(searchService: IntegrationSearchService, integrationService?: IntegrationService);
    /**
     * POST /api/integrations/search
     * Global search across all enabled integrations
     */
    search(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/integrations/:id/search
     * Search single integration
     */
    searchIntegration(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/integrations/searchable
     * Get searchable integrations for tenant
     */
    getSearchableIntegrations(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=integration-search.controller.d.ts.map
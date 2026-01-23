/**
 * Integration Provider Controller
 * Handles HTTP requests for integration provider management (Super Admin only)
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { IntegrationProviderService } from '../services/integration-provider.service.js';
export declare class IntegrationProviderController {
    private service;
    constructor(service: IntegrationProviderService);
    /**
     * POST /api/admin/integrations
     * Create integration provider
     */
    createProvider(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/admin/integrations
     * List integration providers
     */
    listProviders(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/admin/integrations/:category/:id
     * Get integration provider
     */
    getProvider(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/admin/integrations/by-name/:providerName
     * Get integration provider by provider name (searches across all categories)
     */
    getProviderByName(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PATCH /api/admin/integrations/:category/:id
     * Update integration provider
     */
    updateProvider(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/admin/integrations/:category/:id
     * Delete integration provider
     */
    deleteProvider(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PATCH /api/admin/integrations/:category/:id/status
     * Change provider status
     */
    changeStatus(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PATCH /api/admin/integrations/:category/:id/audience
     * Change provider audience
     */
    changeAudience(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=integration-provider.controller.d.ts.map
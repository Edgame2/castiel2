/**
 * Integration Controller
 * Handles HTTP requests for tenant integration management
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { IntegrationService } from '../services/integration.service.js';
export declare class IntegrationController {
    private service;
    constructor(service: IntegrationService);
    /**
     * GET /api/integrations
     * List available providers and enabled integrations
     */
    list(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/integrations
     * Create integration instance
     */
    create(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/integrations/:id
     * Get integration
     */
    get(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PATCH /api/integrations/:id
     * Update integration
     */
    update(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/integrations/:id
     * Delete integration
     */
    delete(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/integrations/:id/activate
     * Activate integration
     */
    activate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/integrations/:id/deactivate
     * Deactivate integration
     */
    deactivate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/integrations/:id/test-connection
     * Test connection
     */
    testConnection(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PATCH /api/integrations/:id/data-access
     * Update data access
     */
    updateDataAccess(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PATCH /api/integrations/:id/search-config
     * Update search configuration
     */
    updateSearchConfig(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/integrations/:id/oauth/authorize
     * Start OAuth authorization flow
     */
    startOAuth(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/integrations/:id/oauth/callback
     * Handle OAuth callback
     */
    handleOAuthCallback(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/integrations/:id/connections
     * Get user connections for an integration
     */
    getUserConnections(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/integrations/:id/connections
     * Create a user connection for an integration
     */
    createUserConnection(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PATCH /api/integrations/:id/connections/:connectionId
     * Update a user connection
     */
    updateUserConnection(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/integrations/:id/connections/:connectionId
     * Delete a user connection
     */
    deleteUserConnection(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/integrations/:id/connections/:connectionId/test
     * Test a user connection
     */
    testUserConnection(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/integrations/:id/connections/stats
     * Get connection usage statistics for an integration (or all integrations if id is 'all')
     */
    getConnectionUsageStats(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/integrations/:id/connections/bulk/delete
     * Bulk delete user connections
     */
    bulkDeleteUserConnections(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/integrations/:id/connections/bulk/test
     * Bulk test user connections
     */
    bulkTestUserConnections(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=integration.controller.d.ts.map
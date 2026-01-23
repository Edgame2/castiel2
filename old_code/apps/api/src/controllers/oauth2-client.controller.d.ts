/**
 * OAuth2 Client Controller
 * HTTP handlers for OAuth2 client management endpoints
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { OAuth2ClientService } from '../services/auth/oauth2-client.service.js';
/**
 * OAuth2 Client Controller
 */
export declare class OAuth2ClientController {
    private readonly oauth2ClientService;
    constructor(oauth2ClientService: OAuth2ClientService);
    /**
     * POST /api/tenants/:tenantId/oauth2/clients
     * Create a new OAuth2 client
     */
    createClient(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/tenants/:tenantId/oauth2/clients
     * List OAuth2 clients for a tenant
     */
    listClients(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/tenants/:tenantId/oauth2/clients/:clientId
     * Get OAuth2 client details
     */
    getClient(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * PATCH /api/tenants/:tenantId/oauth2/clients/:clientId
     * Update OAuth2 client
     */
    updateClient(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * DELETE /api/tenants/:tenantId/oauth2/clients/:clientId
     * Delete OAuth2 client
     */
    deleteClient(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/tenants/:tenantId/oauth2/clients/:clientId/rotate-secret
     * Rotate OAuth2 client secret
     */
    rotateSecret(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/oauth2/scopes
     * List available OAuth2 scopes
     */
    listScopes(request: FastifyRequest, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=oauth2-client.controller.d.ts.map
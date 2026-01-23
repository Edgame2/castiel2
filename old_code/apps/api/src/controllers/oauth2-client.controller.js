/**
 * OAuth2 Client Controller
 * HTTP handlers for OAuth2 client management endpoints
 */
/**
 * OAuth2 Client Controller
 */
export class OAuth2ClientController {
    oauth2ClientService;
    constructor(oauth2ClientService) {
        this.oauth2ClientService = oauth2ClientService;
    }
    /**
     * POST /api/tenants/:tenantId/oauth2/clients
     * Create a new OAuth2 client
     */
    async createClient(request, reply) {
        try {
            const user = request.user;
            if (!user || !user.tenantId) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const { tenantId } = request.params;
            // Check authorization - user must be tenant admin or global admin
            if (user.tenantId !== tenantId && !user.roles?.includes('global_admin')) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Access denied',
                });
            }
            const clientData = request.body;
            const client = await this.oauth2ClientService.createClient(clientData, tenantId, user.id);
            return reply.code(201).send(client);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to create OAuth2 client');
            return reply.code(400).send({
                error: 'BadRequest',
                message: error.message || 'Failed to create OAuth2 client',
            });
        }
    }
    /**
     * GET /api/tenants/:tenantId/oauth2/clients
     * List OAuth2 clients for a tenant
     */
    async listClients(request, reply) {
        try {
            const user = request.user;
            if (!user || !user.tenantId) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const { tenantId } = request.params;
            // Check authorization
            if (user.tenantId !== tenantId && !user.roles?.includes('global_admin')) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Access denied',
                });
            }
            const query = request.query;
            const limit = query.limit ? parseInt(String(query.limit), 10) : 100;
            const clients = await this.oauth2ClientService.listClients(tenantId, limit);
            return reply.code(200).send({
                clients,
                total: clients.length,
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list OAuth2 clients');
            return reply.code(500).send({
                error: 'InternalError',
                message: error.message || 'Failed to list OAuth2 clients',
            });
        }
    }
    /**
     * GET /api/tenants/:tenantId/oauth2/clients/:clientId
     * Get OAuth2 client details
     */
    async getClient(request, reply) {
        try {
            const user = request.user;
            if (!user || !user.tenantId) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const { tenantId, clientId } = request.params;
            // Check authorization
            if (user.tenantId !== tenantId && !user.roles?.includes('global_admin')) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Access denied',
                });
            }
            const client = await this.oauth2ClientService.getClientResponseById(clientId, tenantId);
            if (!client) {
                return reply.code(404).send({
                    error: 'NotFound',
                    message: 'OAuth2 client not found',
                });
            }
            return reply.code(200).send(client);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get OAuth2 client');
            return reply.code(500).send({
                error: 'InternalError',
                message: error.message || 'Failed to get OAuth2 client',
            });
        }
    }
    /**
     * PATCH /api/tenants/:tenantId/oauth2/clients/:clientId
     * Update OAuth2 client
     */
    async updateClient(request, reply) {
        try {
            const user = request.user;
            if (!user || !user.tenantId) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const { tenantId, clientId } = request.params;
            // Check authorization
            if (user.tenantId !== tenantId && !user.roles?.includes('global_admin')) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Access denied',
                });
            }
            const updates = request.body;
            const client = await this.oauth2ClientService.updateClient(clientId, tenantId, updates);
            return reply.code(200).send(client);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to update OAuth2 client');
            if (error.message === 'OAuth2 client not found') {
                return reply.code(404).send({
                    error: 'NotFound',
                    message: error.message,
                });
            }
            return reply.code(400).send({
                error: 'BadRequest',
                message: error.message || 'Failed to update OAuth2 client',
            });
        }
    }
    /**
     * DELETE /api/tenants/:tenantId/oauth2/clients/:clientId
     * Delete OAuth2 client
     */
    async deleteClient(request, reply) {
        try {
            const user = request.user;
            if (!user || !user.tenantId) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const { tenantId, clientId } = request.params;
            // Check authorization
            if (user.tenantId !== tenantId && !user.roles?.includes('global_admin')) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Access denied',
                });
            }
            // Check if client exists
            const client = await this.oauth2ClientService.getClientById(clientId, tenantId);
            if (!client) {
                return reply.code(404).send({
                    error: 'NotFound',
                    message: 'OAuth2 client not found',
                });
            }
            await this.oauth2ClientService.deleteClient(clientId, tenantId);
            return reply.code(204).send();
        }
        catch (error) {
            request.log.error({ error }, 'Failed to delete OAuth2 client');
            return reply.code(500).send({
                error: 'InternalError',
                message: error.message || 'Failed to delete OAuth2 client',
            });
        }
    }
    /**
     * POST /api/tenants/:tenantId/oauth2/clients/:clientId/rotate-secret
     * Rotate OAuth2 client secret
     */
    async rotateSecret(request, reply) {
        try {
            const user = request.user;
            if (!user || !user.tenantId) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const { tenantId, clientId } = request.params;
            // Check authorization
            if (user.tenantId !== tenantId && !user.roles?.includes('global_admin')) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Access denied',
                });
            }
            const client = await this.oauth2ClientService.regenerateSecret(clientId, tenantId);
            return reply.code(200).send(client);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to rotate OAuth2 client secret');
            if (error.message === 'OAuth2 client not found') {
                return reply.code(404).send({
                    error: 'NotFound',
                    message: error.message,
                });
            }
            if (error.message === 'Cannot regenerate secret for public clients') {
                return reply.code(400).send({
                    error: 'BadRequest',
                    message: error.message,
                });
            }
            return reply.code(500).send({
                error: 'InternalError',
                message: error.message || 'Failed to rotate OAuth2 client secret',
            });
        }
    }
    /**
     * GET /api/oauth2/scopes
     * List available OAuth2 scopes
     */
    async listScopes(request, reply) {
        try {
            // Public endpoint - just returns available scopes
            const scopes = [
                { name: 'read:profile', description: 'Read user profile information' },
                { name: 'write:profile', description: 'Update user profile information' },
                { name: 'read:shards', description: 'Read shards and content' },
                { name: 'write:shards', description: 'Create and update shards' },
                { name: 'read:integrations', description: 'Read integration configurations' },
                { name: 'write:integrations', description: 'Manage integration configurations' },
                { name: 'read:analytics', description: 'Read analytics and insights' },
                { name: 'admin', description: 'Full administrative access' },
            ];
            return reply.code(200).send({
                scopes,
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list OAuth2 scopes');
            return reply.code(500).send({
                error: 'InternalError',
                message: error.message || 'Failed to list OAuth2 scopes',
            });
        }
    }
}
//# sourceMappingURL=oauth2-client.controller.js.map
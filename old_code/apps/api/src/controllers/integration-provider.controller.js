/**
 * Integration Provider Controller
 * Handles HTTP requests for integration provider management (Super Admin only)
 */
function getUser(request) {
    const req = request;
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    return req.user;
}
export class IntegrationProviderController {
    service;
    constructor(service) {
        this.service = service;
    }
    /**
     * POST /api/admin/integrations
     * Create integration provider
     */
    async createProvider(request, reply) {
        try {
            const user = getUser(request);
            const input = request.body;
            const provider = await this.service.createProvider(input, user);
            reply.status(201).send(provider);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to create provider');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to create provider',
            });
        }
    }
    /**
     * GET /api/admin/integrations
     * List integration providers
     */
    async listProviders(request, reply) {
        try {
            const query = request.query;
            const result = await this.service.listProviders({
                category: query.category,
                status: query.status,
                audience: query.audience,
                supportsSearch: query.supportsSearch !== undefined ? query.supportsSearch === 'true' : undefined,
                supportsNotifications: query.supportsNotifications !== undefined ? query.supportsNotifications === 'true' : undefined,
                requiresUserScoping: query.requiresUserScoping !== undefined ? query.requiresUserScoping === 'true' : undefined,
                limit: query.limit ? parseInt(query.limit) : undefined,
                offset: query.offset ? parseInt(query.offset) : undefined,
            });
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list providers');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to list providers',
            });
        }
    }
    /**
     * GET /api/admin/integrations/:category/:id
     * Get integration provider
     */
    async getProvider(request, reply) {
        try {
            const params = request.params;
            const provider = await this.service.getProvider(params.id, params.category);
            if (!provider) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Provider not found',
                });
                return;
            }
            reply.status(200).send(provider);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get provider');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to get provider',
            });
        }
    }
    /**
     * GET /api/admin/integrations/by-name/:providerName
     * Get integration provider by provider name (searches across all categories)
     */
    async getProviderByName(request, reply) {
        try {
            const params = request.params;
            const provider = await this.service.getProviderByName(params.providerName);
            if (!provider) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Provider not found',
                });
                return;
            }
            reply.status(200).send(provider);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get provider by name');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to get provider by name',
            });
        }
    }
    /**
     * PATCH /api/admin/integrations/:category/:id
     * Update integration provider
     */
    async updateProvider(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const input = request.body;
            const provider = await this.service.updateProvider(params.id, params.category, input, user);
            reply.status(200).send(provider);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to update provider');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to update provider',
            });
        }
    }
    /**
     * DELETE /api/admin/integrations/:category/:id
     * Delete integration provider
     */
    async deleteProvider(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const deleted = await this.service.deleteProvider(params.id, params.category, user);
            if (!deleted) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Provider not found',
                });
                return;
            }
            reply.status(204).send();
        }
        catch (error) {
            request.log.error({ error }, 'Failed to delete provider');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to delete provider',
            });
        }
    }
    /**
     * PATCH /api/admin/integrations/:category/:id/status
     * Change provider status
     */
    async changeStatus(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const body = request.body;
            if (!body.status) {
                reply.status(400).send({
                    error: 'Bad Request',
                    message: 'status is required',
                });
                return;
            }
            const provider = await this.service.changeStatus(params.id, params.category, body.status, user);
            reply.status(200).send(provider);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to change provider status');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to change provider status',
            });
        }
    }
    /**
     * PATCH /api/admin/integrations/:category/:id/audience
     * Change provider audience
     */
    async changeAudience(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const body = request.body;
            if (!body.audience) {
                reply.status(400).send({
                    error: 'Bad Request',
                    message: 'audience is required',
                });
                return;
            }
            const provider = await this.service.changeAudience(params.id, params.category, body.audience, user);
            reply.status(200).send(provider);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to change provider audience');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to change provider audience',
            });
        }
    }
}
//# sourceMappingURL=integration-provider.controller.js.map
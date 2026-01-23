/**
 * Integration Search Controller
 * Handles HTTP requests for integration search
 */
function getUser(request) {
    const req = request;
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    return req.user;
}
export class IntegrationSearchController {
    searchService;
    integrationService;
    constructor(searchService, integrationService) {
        this.searchService = searchService;
        this.integrationService = integrationService;
    }
    /**
     * POST /api/integrations/search
     * Global search across all enabled integrations
     */
    async search(request, reply) {
        try {
            const user = getUser(request);
            const body = request.body;
            if (!body.query) {
                reply.status(400).send({
                    error: 'Bad Request',
                    message: 'query is required',
                });
                return;
            }
            const result = await this.searchService.search(user.tenantId, user.id, body.query, {
                query: body.query,
                entities: body.entities,
                filters: body.filters,
                limit: body.limit,
                offset: body.offset,
                integrationIds: body.integrationIds,
            });
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to search integrations');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to search integrations',
            });
        }
    }
    /**
     * POST /api/integrations/:id/search
     * Search single integration
     */
    async searchIntegration(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const body = request.body;
            if (!body.query || body.query.trim().length === 0) {
                reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Search query is required',
                });
                return;
            }
            // Get integration to verify access
            if (!this.integrationService) {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Integration service not available',
                });
                return;
            }
            const integration = await this.integrationService.getIntegration(params.id, user.tenantId);
            if (!integration) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Integration not found',
                });
                return;
            }
            if (!integration.searchEnabled) {
                reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Search is not enabled for this integration',
                });
                return;
            }
            // Perform search
            const result = await this.searchService.searchIntegration(integration, body.query.trim(), user.id, {
                query: body.query.trim(),
                entities: body.entities,
                filters: body.filters,
                limit: body.limit || 20,
                offset: body.offset || 0,
            });
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to search integration');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to search integration',
            });
        }
    }
    /**
     * GET /api/integrations/searchable
     * Get searchable integrations for tenant
     */
    async getSearchableIntegrations(request, reply) {
        try {
            const user = getUser(request);
            const integrations = await this.searchService.getSearchableIntegrations(user.tenantId);
            reply.status(200).send({ integrations });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get searchable integrations');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to get searchable integrations',
            });
        }
    }
}
//# sourceMappingURL=integration-search.controller.js.map
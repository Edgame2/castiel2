/**
 * Vector Search UI Controller
 *
 * Handles HTTP requests for vector search UI features:
 * - Search history
 * - Saved searches
 * - Autocomplete
 */
import { getUser } from '../middleware/authenticate.js';
export class VectorSearchUIController {
    uiService;
    constructor(uiService) {
        this.uiService = uiService;
    }
    /**
     * GET /api/v1/search/history
     * Get search history
     */
    async getHistory(request, reply) {
        try {
            const user = getUser(request);
            const query = request.query;
            const result = await this.uiService.getSearchHistory(user.id, user.tenantId, {
                limit: query.limit ? parseInt(query.limit, 10) : undefined,
                offset: query.offset ? parseInt(query.offset, 10) : undefined,
                shardTypeId: query.shardTypeId,
            });
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get search history');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to get search history',
            });
        }
    }
    /**
     * DELETE /api/v1/search/history
     * Clear search history
     */
    async clearHistory(request, reply) {
        try {
            const user = getUser(request);
            await this.uiService.clearSearchHistory(user.id, user.tenantId);
            reply.status(200).send({
                success: true,
                message: 'Search history cleared',
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to clear search history');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to clear search history',
            });
        }
    }
    /**
     * POST /api/v1/search/saved
     * Create a saved search
     */
    async createSavedSearch(request, reply) {
        try {
            const user = getUser(request);
            const body = request.body;
            if (!body.name || !body.query) {
                reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Name and query are required',
                });
                return;
            }
            const savedSearch = await this.uiService.createSavedSearch(user.id, user.tenantId, body);
            reply.status(201).send(savedSearch);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to create saved search');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to create saved search',
            });
        }
    }
    /**
     * GET /api/v1/search/saved
     * List saved searches
     */
    async listSavedSearches(request, reply) {
        try {
            const user = getUser(request);
            const query = request.query;
            const savedSearches = await this.uiService.getSavedSearches(user.id, user.tenantId, {
                includeShared: query.includeShared === 'true',
                visibility: query.visibility,
            });
            reply.status(200).send({
                searches: savedSearches,
                count: savedSearches.length,
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list saved searches');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to list saved searches',
            });
        }
    }
    /**
     * GET /api/v1/search/saved/:id
     * Get a saved search
     */
    async getSavedSearch(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const savedSearch = await this.uiService.getSavedSearch(params.id, user.id, user.tenantId);
            if (!savedSearch) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Saved search not found',
                });
                return;
            }
            reply.status(200).send(savedSearch);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get saved search');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to get saved search',
            });
        }
    }
    /**
     * PATCH /api/v1/search/saved/:id
     * Update a saved search
     */
    async updateSavedSearch(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const body = request.body;
            const updated = await this.uiService.updateSavedSearch(params.id, user.id, user.tenantId, body);
            if (!updated) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Saved search not found',
                });
                return;
            }
            reply.status(200).send(updated);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to update saved search');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to update saved search',
            });
        }
    }
    /**
     * DELETE /api/v1/search/saved/:id
     * Delete a saved search
     */
    async deleteSavedSearch(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const deleted = await this.uiService.deleteSavedSearch(params.id, user.id, user.tenantId);
            if (!deleted) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Saved search not found',
                });
                return;
            }
            reply.status(200).send({
                success: true,
                message: 'Saved search deleted',
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to delete saved search');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to delete saved search',
            });
        }
    }
    /**
     * GET /api/v1/search/autocomplete
     * Get autocomplete suggestions
     */
    async getAutocomplete(request, reply) {
        try {
            const user = getUser(request);
            const query = request.query;
            if (!query.q || query.q.trim().length === 0) {
                reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Query parameter "q" is required',
                });
                return;
            }
            const autocompleteRequest = {
                partialQuery: query.q,
                limit: query.limit ? parseInt(query.limit, 10) : undefined,
                includeHistory: query.includeHistory !== 'false',
                includePopular: query.includePopular !== 'false',
                includeSuggestions: query.includeSuggestions !== 'false',
                shardTypeId: query.shardTypeId,
            };
            const result = await this.uiService.getAutocompleteSuggestions(user.id, user.tenantId, autocompleteRequest);
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get autocomplete suggestions');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to get autocomplete suggestions',
            });
        }
    }
}
//# sourceMappingURL=vector-search-ui.controller.js.map
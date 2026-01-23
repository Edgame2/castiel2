/**
 * Vector Search UI Controller
 *
 * Handles HTTP requests for vector search UI features:
 * - Search history
 * - Saved searches
 * - Autocomplete
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { VectorSearchUIService } from '../services/vector-search-ui.service.js';
export declare class VectorSearchUIController {
    private readonly uiService;
    constructor(uiService: VectorSearchUIService);
    /**
     * GET /api/v1/search/history
     * Get search history
     */
    getHistory(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/v1/search/history
     * Clear search history
     */
    clearHistory(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/search/saved
     * Create a saved search
     */
    createSavedSearch(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/search/saved
     * List saved searches
     */
    listSavedSearches(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/search/saved/:id
     * Get a saved search
     */
    getSavedSearch(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PATCH /api/v1/search/saved/:id
     * Update a saved search
     */
    updateSavedSearch(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/v1/search/saved/:id
     * Delete a saved search
     */
    deleteSavedSearch(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/search/autocomplete
     * Get autocomplete suggestions
     */
    getAutocomplete(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=vector-search-ui.controller.d.ts.map
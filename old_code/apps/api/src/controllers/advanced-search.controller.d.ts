import { FastifyRequest, FastifyReply } from 'fastify';
import { AdvancedSearchService } from '../services/advanced-search.service.js';
import { AdvancedSearchQuery, CreateSavedSearchInput, UpdateSavedSearchInput } from '../types/advanced-search.types.js';
/**
 * Advanced Search Controller
 */
export declare class AdvancedSearchController {
    private searchService;
    constructor(searchService: AdvancedSearchService);
    /**
     * Execute advanced search
     * POST /api/search
     */
    search(request: FastifyRequest<{
        Body: Partial<AdvancedSearchQuery>;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Quick search (simplified search endpoint)
     * GET /api/search/quick
     */
    quickSearch(request: FastifyRequest<{
        Querystring: {
            q: string;
            type?: string;
            limit?: number;
            offset?: number;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Get search facets
     * POST /api/search/facets
     */
    getFacets(request: FastifyRequest<{
        Body: {
            shardTypeIds?: string[];
            facets: Array<{
                field: string;
                size?: number;
            }>;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Create saved search
     * POST /api/search/saved
     */
    createSavedSearch(request: FastifyRequest<{
        Body: Omit<CreateSavedSearchInput, 'tenantId' | 'createdBy'>;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * List saved searches
     * GET /api/search/saved
     */
    listSavedSearches(request: FastifyRequest<{
        Querystring: {
            visibility?: 'private' | 'team' | 'tenant';
            limit?: number;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Get saved search
     * GET /api/search/saved/:id
     */
    getSavedSearch(request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Update saved search
     * PATCH /api/search/saved/:id
     */
    updateSavedSearch(request: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: UpdateSavedSearchInput;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Delete saved search
     * DELETE /api/search/saved/:id
     */
    deleteSavedSearch(request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Execute saved search
     * POST /api/search/saved/:id/execute
     */
    executeSavedSearch(request: FastifyRequest<{
        Params: {
            id: string;
        };
        Body?: {
            limit?: number;
            offset?: number;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Get popular search terms
     * GET /api/search/popular
     */
    getPopularTerms(request: FastifyRequest<{
        Querystring: {
            limit?: number;
        };
    }>, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=advanced-search.controller.d.ts.map
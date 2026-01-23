import { FastifyRequest, FastifyReply } from 'fastify';
import { AdvancedSearchService } from '../services/advanced-search.service.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import {
  AdvancedSearchQuery,
  CreateSavedSearchInput,
  UpdateSavedSearchInput,
} from '../types/advanced-search.types.js';

/**
 * Advanced Search Controller
 */
export class AdvancedSearchController {
  private searchService: AdvancedSearchService;

  constructor(searchService: AdvancedSearchService) {
    this.searchService = searchService;
  }

  /**
   * Execute advanced search
   * POST /api/search
   */
  async search(
    request: FastifyRequest<{ Body: Partial<AdvancedSearchQuery> }>,
    reply: FastifyReply
  ): Promise<void> {
    const auth = (request as AuthenticatedRequest).user || (request as any).auth;
    if (!auth) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    
    const query: AdvancedSearchQuery = {
      ...request.body,
      tenantId: auth.tenantId,
      createdBy: auth.id,
    };

    const result = await this.searchService.search(query);
    reply.send(result);
  }

  /**
   * Quick search (simplified search endpoint)
   * GET /api/search/quick
   */
  async quickSearch(
    request: FastifyRequest<{
      Querystring: {
        q: string;
        type?: string;
        limit?: number;
        offset?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const auth = (request as AuthenticatedRequest).user || (request as any).auth;
    if (!auth) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    const { q, type, limit, offset } = request.query;

    const query: AdvancedSearchQuery = {
      tenantId: auth.tenantId,
      query: q,
      shardTypeIds: type ? [type] : undefined,
      limit: limit || 20,
      offset: offset || 0,
      includeTotal: true,
    };

    const result = await this.searchService.search(query);
    reply.send(result);
  }

  /**
   * Get search facets
   * POST /api/search/facets
   */
  async getFacets(
    request: FastifyRequest<{
      Body: {
        shardTypeIds?: string[];
        facets: Array<{ field: string; size?: number }>;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const auth = (request as AuthenticatedRequest).user || (request as any).auth;
    if (!auth) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    const { shardTypeIds, facets } = request.body;

    const query: AdvancedSearchQuery = {
      tenantId: auth.tenantId,
      shardTypeIds,
      facets: facets.map(f => ({
        field: f.field,
        type: 'terms' as const,
        size: f.size || 20,
      })),
      limit: 0, // Only get facets, no results
    };

    const result = await this.searchService.search(query);
    reply.send({ facets: result.facets });
  }

  // =====================
  // Saved Searches
  // =====================

  /**
   * Create saved search
   * POST /api/search/saved
   */
  async createSavedSearch(
    request: FastifyRequest<{ Body: Omit<CreateSavedSearchInput, 'tenantId' | 'createdBy'> }>,
    reply: FastifyReply
  ): Promise<void> {
    const auth = (request as AuthenticatedRequest).user || (request as any).auth;
    if (!auth) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const input: CreateSavedSearchInput = {
      ...request.body,
      tenantId: auth.tenantId,
      createdBy: auth.id,
    };

    const savedSearch = await this.searchService.createSavedSearch(input);
    reply.code(201).send(savedSearch);
  }

  /**
   * List saved searches
   * GET /api/search/saved
   */
  async listSavedSearches(
    request: FastifyRequest<{
      Querystring: { visibility?: 'private' | 'team' | 'tenant'; limit?: number };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const auth = (request as AuthenticatedRequest).user || (request as any).auth;
    if (!auth) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    const { visibility, limit } = request.query;

    const searches = await this.searchService.listSavedSearches(
      auth.tenantId,
      auth.id,
      { visibility, limit }
    );

    reply.send({ savedSearches: searches });
  }

  /**
   * Get saved search
   * GET /api/search/saved/:id
   */
  async getSavedSearch(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const auth = (request as AuthenticatedRequest).user || (request as any).auth;
    if (!auth) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    const { id } = request.params;

    const savedSearch = await this.searchService.getSavedSearch(id, auth.tenantId);
    
    if (!savedSearch) {
      reply.code(404).send({ error: 'Saved search not found' });
      return;
    }

    // Check access
    if (
      savedSearch.visibility === 'private' &&
      savedSearch.createdBy !== auth.id
    ) {
      reply.code(403).send({ error: 'Access denied' });
      return;
    }

    reply.send(savedSearch);
  }

  /**
   * Update saved search
   * PATCH /api/search/saved/:id
   */
  async updateSavedSearch(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateSavedSearchInput;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const auth = (request as AuthenticatedRequest).user || (request as any).auth;
    if (!auth) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    const { id } = request.params;

    // Check ownership
    const existing = await this.searchService.getSavedSearch(id, auth.tenantId);
    if (!existing) {
      reply.code(404).send({ error: 'Saved search not found' });
      return;
    }

    if (existing.createdBy !== auth.id && !auth.roles.includes('admin')) {
      reply.code(403).send({ error: 'Only the owner can update this search' });
      return;
    }

    const updated = await this.searchService.updateSavedSearch(
      id,
      auth.tenantId,
      request.body
    );

    reply.send(updated);
  }

  /**
   * Delete saved search
   * DELETE /api/search/saved/:id
   */
  async deleteSavedSearch(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const auth = (request as AuthenticatedRequest).user || (request as any).auth;
    if (!auth) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    const { id } = request.params;

    // Check ownership
    const existing = await this.searchService.getSavedSearch(id, auth.tenantId);
    if (!existing) {
      reply.code(404).send({ error: 'Saved search not found' });
      return;
    }

    if (existing.createdBy !== auth.id && !auth.roles.includes('admin')) {
      reply.code(403).send({ error: 'Only the owner can delete this search' });
      return;
    }

    await this.searchService.deleteSavedSearch(id, auth.tenantId);
    reply.code(204).send();
  }

  /**
   * Execute saved search
   * POST /api/search/saved/:id/execute
   */
  async executeSavedSearch(
    request: FastifyRequest<{
      Params: { id: string };
      Body?: { limit?: number; offset?: number };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const auth = (request as AuthenticatedRequest).user || (request as any).auth;
    if (!auth) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    const { id } = request.params;

    try {
      const result = await this.searchService.executeSavedSearch(
        id,
        auth.tenantId,
        request.body
      );
      reply.send(result);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        reply.code(404).send({ error: 'Saved search not found' });
        return;
      }
      throw error;
    }
  }

  // =====================
  // Analytics
  // =====================

  /**
   * Get popular search terms
   * GET /api/search/popular
   */
  async getPopularTerms(
    request: FastifyRequest<{ Querystring: { limit?: number } }>,
    reply: FastifyReply
  ): Promise<void> {
    const auth = (request as AuthenticatedRequest).user || (request as any).auth;
    if (!auth) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    const { limit } = request.query;

    const terms = await this.searchService.getPopularSearchTerms(
      auth.tenantId,
      limit || 10
    );

    reply.send({ terms });
  }
}












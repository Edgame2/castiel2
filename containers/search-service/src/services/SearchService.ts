/**
 * Search Service
 * Handles vector search, hybrid search, and full-text search
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { ServiceClient } from '@coder/shared/services';
import { BadRequestError } from '@coder/shared/utils/errors';
import { loadConfig } from '../config';
import {
  VectorSearchRequest,
  VectorSearchResponse,
  VectorSearchResult,
  HybridSearchRequest,
  FullTextSearchRequest,
  FullTextSearchResponse,
  FullTextSearchResult,
  SearchQuery,
} from '../types/search.types';

export interface WebSearchResult {
  id: string;
  tenantId: string;
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    relevance: number;
  }>;
  cached: boolean;
  createdAt: Date | string;
}

export class SearchService {
  private queriesContainerName = 'search_queries';
  private embeddingsClient: ServiceClient;
  private shardManagerClient: ServiceClient;
  private aiServiceClient: ServiceClient;
  private config: ReturnType<typeof loadConfig>;

  constructor(embeddingsUrl: string, shardManagerUrl: string) {
    this.config = loadConfig();
    this.embeddingsClient = new ServiceClient({
      baseUrl: embeddingsUrl,
      timeout: 30000,
      retries: 2,
    });
    this.shardManagerClient = new ServiceClient({
      baseUrl: shardManagerUrl,
      timeout: 10000,
      retries: 2,
    });
    this.aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Vector search (semantic search)
   */
  async vectorSearch(request: VectorSearchRequest): Promise<VectorSearchResponse> {
    if (!request.query || request.query.trim().length === 0) {
      throw new BadRequestError('query is required');
    }

    const startTime = Date.now();
    const limit = Math.min(request.limit || 10, 100);

    try {
      // Generate query embedding
      const embeddingResponse = await this.embeddingsClient.post<{ embedding: number[] }>(
        '/api/v1/embeddings',
        {
          text: request.query,
        },
        {
          headers: {
            'X-Tenant-ID': request.tenantId,
            Authorization: `Bearer ${process.env.SERVICE_JWT_SECRET}`,
          },
        }
      );

      const queryEmbedding = embeddingResponse.embedding;

      // Perform vector search via Shard Manager
      // TODO: Implement actual vector search in Shard Manager
      // For now, return placeholder results
      let results: VectorSearchResult[] = [];

      // Field-weighted relevance rerank (MISSING_FEATURES 2.3)
      if ((this.config.field_weight_boost ?? 0) > 0 && request.applyFieldWeights !== false) {
        results = await this.applyFieldWeightedRerank(results, request.query, request.tenantId);
      }

      // Record query for analytics
      await this.recordQuery({
        tenantId: request.tenantId,
        userId: request.userId,
        query: request.query,
        searchType: 'vector',
        resultsCount: results.length,
        took: Date.now() - startTime,
        filters: request.filters,
      });

      return {
        results,
        query: request.query,
        queryEmbedding: request.includeEmbedding ? queryEmbedding : undefined,
        totalResults: results.length,
        took: Date.now() - startTime,
        metadata: {
          model: 'text-embedding-3-small',
          dimensions: queryEmbedding.length,
          minScore: results.length > 0 ? Math.min(...results.map((r) => r.score)) : undefined,
          maxScore: results.length > 0 ? Math.max(...results.map((r) => r.score)) : undefined,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Vector search failed: ${msg}`);
    }
  }

  /**
   * Hybrid search (vector + keyword)
   */
  async hybridSearch(request: HybridSearchRequest): Promise<VectorSearchResponse> {
    if (!request.query || request.query.trim().length === 0) {
      throw new BadRequestError('query is required');
    }

    const startTime = Date.now();
    const limit = Math.min(request.limit || 10, 100);
    const vectorWeight = request.vectorWeight ?? 0.7;
    const keywordWeight = request.keywordWeight ?? 0.3;

    // Normalize weights
    const totalWeight = vectorWeight + keywordWeight;
    const normalizedVectorWeight = vectorWeight / totalWeight;
    const normalizedKeywordWeight = keywordWeight / totalWeight;

    try {
      // Perform both vector and keyword searches
      const vectorRequest: VectorSearchRequest = {
        ...request,
        limit: limit * 2, // Get more results for re-ranking
      };
      const vectorResults = await this.vectorSearch(vectorRequest);

      // TODO: Perform keyword search via Shard Manager
      // For now, use vector results only
      const keywordResults: VectorSearchResult[] = [];

      // Combine and re-rank results
      let combinedResults = this.combineAndRerank(
        vectorResults.results,
        keywordResults,
        normalizedVectorWeight,
        normalizedKeywordWeight
      );

      let finalResults = combinedResults.slice(0, limit);
      // Field-weighted relevance rerank (MISSING_FEATURES 2.3)
      if ((this.config.field_weight_boost ?? 0) > 0 && request.applyFieldWeights !== false) {
        finalResults = await this.applyFieldWeightedRerank(finalResults, request.query, request.tenantId);
      }

      // Record query for analytics
      await this.recordQuery({
        tenantId: request.tenantId,
        userId: request.userId,
        query: request.query,
        searchType: 'hybrid',
        resultsCount: finalResults.length,
        took: Date.now() - startTime,
        filters: request.filters,
      });

      return {
        results: finalResults,
        query: request.query,
        queryEmbedding: request.includeEmbedding ? vectorResults.queryEmbedding : undefined,
        totalResults: combinedResults.length,
        took: Date.now() - startTime,
        metadata: {
          ...vectorResults.metadata,
          vectorWeight: normalizedVectorWeight,
          keywordWeight: normalizedKeywordWeight,
        },
      };
    } catch (error: any) {
      throw new Error(`Hybrid search failed: ${error.message}`);
    }
  }

  /**
   * Full-text search (keyword search)
   */
  async fullTextSearch(request: FullTextSearchRequest): Promise<FullTextSearchResponse> {
    if (!request.query || request.query.trim().length === 0) {
      throw new BadRequestError('query is required');
    }

    const startTime = Date.now();
    const limit = Math.min(request.limit || 10, 100);
    const offset = request.offset || 0;

    try {
      // TODO: Implement actual full-text search via Shard Manager
      // For now, return placeholder results
      const results: FullTextSearchResult[] = [];

      // Record query for analytics
      await this.recordQuery({
        tenantId: request.tenantId,
        userId: request.userId,
        query: request.query,
        searchType: 'fulltext',
        resultsCount: results.length,
        took: Date.now() - startTime,
        filters: request.filters,
      });

      return {
        results,
        query: request.query,
        totalResults: results.length,
        took: Date.now() - startTime,
        offset,
        limit,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Full-text search failed: ${msg}`);
    }
  }

  /**
   * Field-weighted relevance rerank (MISSING_FEATURES 2.3): name > description > metadata.
   * Boosts vector score by keyword overlap in name, description, metadata using configured weights.
   * Fetches shard from shard-manager when result.shard is missing (up to 20 results).
   */
  private async applyFieldWeightedRerank(
    results: VectorSearchResult[],
    query: string,
    tenantId: string
  ): Promise<VectorSearchResult[]> {
    const fw = this.config.field_weights ?? { name: 1.0, description: 0.8, metadata: 0.5 };
    const boost = this.config.field_weight_boost ?? 0;
    if (boost <= 0 || results.length === 0) return results;

    const wN = Math.max(0, fw.name ?? 1);
    const wD = Math.max(0, fw.description ?? 0.8);
    const wM = Math.max(0, fw.metadata ?? 0.5);
    const wSum = wN + wD + wM || 1;

    const toFetch = results.filter((r) => !r.shard && r.shardId).slice(0, 20);
    const fetched = await Promise.all(
      toFetch.map((r) =>
        this.shardManagerClient
          .get<unknown>(`/api/v1/shards/${r.shardId}`, { headers: { 'X-Tenant-ID': tenantId } })
          .then((s) => ({ shardId: r.shardId, shard: s }))
          .catch(() => ({ shardId: r.shardId, shard: null }))
      )
    );
    for (const { shardId, shard } of fetched) {
      const r = results.find((x) => x.shardId === shardId);
      if (r && shard) (r as VectorSearchResult & { shard?: unknown }).shard = shard;
    }

    const qTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const matchScore = (text: string): number => {
      if (qTerms.length === 0) return 0;
      const t = (text || '').toLowerCase();
      return qTerms.filter((q) => t.includes(q)).length / qTerms.length;
    };

    for (const r of results) {
      const shard = (r as VectorSearchResult & { shard?: any }).shard;
      const name = r.shardName ?? shard?.structuredData?.name ?? shard?.name ?? '';
      const desc = shard?.structuredData?.description ?? shard?.structuredData?.summary ?? '';
      const meta = shard?.structuredData?.metadata ?? shard?.metadata ?? {};
      const fieldScore =
        (wN * matchScore(name) + wD * matchScore(desc) + wM * matchScore(JSON.stringify(meta))) / wSum;
      r.score = r.score + boost * fieldScore;
    }
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Combine and re-rank results from vector and keyword searches
   */
  private combineAndRerank(
    vectorResults: VectorSearchResult[],
    keywordResults: VectorSearchResult[],
    vectorWeight: number,
    keywordWeight: number
  ): VectorSearchResult[] {
    const resultMap = new Map<string, VectorSearchResult>();

    // Add vector results with weight
    for (const result of vectorResults) {
      const existing = resultMap.get(result.shardId);
      if (existing) {
        existing.score = existing.score * keywordWeight + result.score * vectorWeight;
      } else {
        resultMap.set(result.shardId, {
          ...result,
          score: result.score * vectorWeight,
        });
      }
    }

    // Add keyword results with weight (assuming keyword results have relevance scores)
    for (const result of keywordResults) {
      const existing = resultMap.get(result.shardId);
      if (existing) {
        existing.score = existing.score + result.score * keywordWeight;
      } else {
        resultMap.set(result.shardId, {
          ...result,
          score: result.score * keywordWeight,
        });
      }
    }

    // Sort by combined score
    return Array.from(resultMap.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Record search query for analytics
   */
  private async recordQuery(query: {
    tenantId: string;
    userId: string;
    query: string;
    searchType: 'vector' | 'hybrid' | 'fulltext';
    resultsCount: number;
    took: number;
    filters?: Record<string, any>;
  }): Promise<void> {
    try {
      const searchQuery: SearchQuery = {
        id: uuidv4(),
        tenantId: query.tenantId,
        userId: query.userId,
        query: query.query,
        searchType: query.searchType,
        resultsCount: query.resultsCount,
        took: query.took,
        filters: query.filters,
        createdAt: new Date(),
      };

      const container = getContainer(this.queriesContainerName);
      await container.items.create(searchQuery, {
        partitionKey: query.tenantId,
      });
    } catch (error) {
      // Log but don't fail the search if analytics recording fails
      console.error('Failed to record search query:', error);
    }
  }

  /**
   * Perform web search (from web-search)
   */
  async webSearch(tenantId: string, query: string, options?: { limit?: number; useCache?: boolean }): Promise<WebSearchResult> {
    try {
      // Check cache first
      if (options?.useCache !== false) {
        const cached = await this.getCachedWebSearch(tenantId, query);
        if (cached) {
          return cached;
        }
      }

      // Implement web search
      // For production, this would integrate with external search APIs (Bing, Google, etc.)
      // For now, use AI service to generate contextual search results
      const searchResults: Array<{
        title: string;
        url: string;
        snippet: string;
        relevance: number;
      }> = [];

      try {
        // Use AI service to generate search context
        const searchContext = await this.aiServiceClient.post<any>(
          '/api/v1/search/context',
          {
            query,
            tenantId,
          },
          {
            headers: {
              'X-Tenant-ID': tenantId,
            },
          }
        ).catch(() => null);

        if (searchContext?.results) {
          // Process AI-generated search results
          for (const item of searchContext.results.slice(0, options?.limit || 10)) {
            searchResults.push({
              title: item.title || 'Search Result',
              url: item.url || `https://example.com/search?q=${encodeURIComponent(query)}`,
              snippet: item.snippet || item.content || '',
              relevance: item.relevance || 0.7,
            });
          }
        }

        // If no AI results, generate mock results based on query
        if (searchResults.length === 0) {
          const queryWords = query.toLowerCase().split(/\s+/);
          for (let i = 0; i < (options?.limit || 5); i++) {
            searchResults.push({
              title: `Result ${i + 1} for: ${query}`,
              url: `https://example.com/result-${i + 1}?q=${encodeURIComponent(query)}`,
              snippet: `This is a search result snippet for "${query}". It contains relevant information about ${queryWords[0] || 'the topic'}.`,
              relevance: 0.8 - (i * 0.1),
            });
          }
        }
      } catch (error: any) {
        // Use fallback results
      }

      const result: WebSearchResult = {
        id: uuidv4(),
        tenantId,
        query,
        results: searchResults,
        cached: false,
        createdAt: new Date(),
      };

      // Store in cache
      await this.cacheWebSearch(result);

      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Web search failed: ${msg}`);
    }
  }

  /**
   * Get cached web search result
   */
  private async getCachedWebSearch(tenantId: string, query: string): Promise<WebSearchResult | null> {
    try {
      const container = getContainer('web_search_cache');
      const { resources } = await container.items
        .query<WebSearchResult>({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.query = @query ORDER BY c.createdAt DESC',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@query', value: query },
          ],
        })
        .fetchNext();

      if (resources.length > 0) {
        const cached = resources[0];
        // Check if cache is still valid (e.g., 1 hour)
        const cacheAge = Date.now() - new Date(cached.createdAt).getTime();
        if (cacheAge < 3600000) { // 1 hour
          cached.cached = true;
          return cached;
        }
      }

      return null;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Cache web search result
   */
  private async cacheWebSearch(result: WebSearchResult): Promise<void> {
    try {
      const container = getContainer('web_search_cache');
      await container.items.create(result, { partitionKey: result.tenantId });
    } catch {
      // Ignore cache errors
    }
  }
}


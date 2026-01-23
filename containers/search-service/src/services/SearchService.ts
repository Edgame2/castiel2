/**
 * Search Service
 * Handles vector search, hybrid search, and full-text search
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { ServiceClient } from '@coder/shared/services';
import { BadRequestError } from '@coder/shared/utils/errors';
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

export class SearchService {
  private queriesContainerName = 'search_queries';
  private embeddingsClient: ServiceClient;
  private shardManagerClient: ServiceClient;

  constructor(embeddingsUrl: string, shardManagerUrl: string) {
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
      const results: VectorSearchResult[] = [];

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
    } catch (error: any) {
      throw new Error(`Vector search failed: ${error.message}`);
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
      const combinedResults = this.combineAndRerank(
        vectorResults.results,
        keywordResults,
        normalizedVectorWeight,
        normalizedKeywordWeight
      );

      const finalResults = combinedResults.slice(0, limit);

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
    } catch (error: any) {
      throw new Error(`Full-text search failed: ${error.message}`);
    }
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
}


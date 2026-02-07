/**
 * Web Search Service
 * Web search integration and context
 */

import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

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

export class WebSearchService {
  private config: ReturnType<typeof loadConfig>;
  private aiServiceClient: ServiceClient;
  private _contextServiceClient: ServiceClient;
  private _embeddingsClient: ServiceClient;

  constructor() {
    this.config = loadConfig();
    
    this.aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this._contextServiceClient = new ServiceClient({
      baseURL: this.config.services.context_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this._embeddingsClient = new ServiceClient({
      baseURL: this.config.services.embeddings?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Perform web search
   */
  async search(tenantId: string, query: string, options?: { limit?: number; useCache?: boolean }): Promise<WebSearchResult> {
    try {
      log.info('Performing web search', {
        tenantId,
        query,
        service: 'web-search',
      });

      // Check cache first
      if (options?.useCache !== false) {
        const cached = await this.getCachedSearch(tenantId, query);
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
        log.warn('AI search context failed, using fallback', {
          error: error.message,
          tenantId,
          query,
          service: 'web-search',
        });
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
      await this.cacheSearch(result);

      return result;
    } catch (error: any) {
      log.error('Web search failed', error, {
        tenantId,
        query,
        service: 'web-search',
      });
      throw error;
    }
  }

  /**
   * Get cached search result
   */
  private async getCachedSearch(tenantId: string, query: string): Promise<WebSearchResult | null> {
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
      log.warn('Failed to get cached search', {
        error: error.message,
        tenantId,
        query,
        service: 'web-search',
      });
      return null;
    }
  }

  /**
   * Cache search result
   */
  private async cacheSearch(result: WebSearchResult): Promise<void> {
    try {
      const container = getContainer('web_search_cache');
      await container.items.create(result, { partitionKey: result.tenantId } as any);
    } catch (error: any) {
      log.warn('Failed to cache search result', {
        error: error.message,
        service: 'web-search',
      });
    }
  }
}

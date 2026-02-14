/**
 * Web Search Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSearchService } from '../../../src/services/WebSearchService';
import { getContainer } from '@coder/shared/database';

const mockClients = vi.hoisted(() => ({
  ai: { post: vi.fn() },
  context: { post: vi.fn() },
  embeddings: { post: vi.fn() },
  shardManager: { post: vi.fn() },
}));

const mockLoadConfig = vi.hoisted(() =>
  vi.fn(() => ({
    services: {
      ai_service: { url: 'http://ai-service:3000' },
      context_service: { url: 'http://context-service:3000' },
      embeddings: { url: 'http://embeddings:3000' },
      shard_manager: { url: '' },
    },
    database: {
      containers: {
        web_search_results: 'web_search_results',
      },
    },
  }))
);

vi.mock('uuid', () => ({ v4: vi.fn(() => 'test-uuid') }));
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: unknown, config: { baseURL?: string }) {
    if (config?.baseURL?.includes('ai-service')) return mockClients.ai;
    if (config?.baseURL?.includes('context-service')) return mockClients.context;
    if (config?.baseURL?.includes('embeddings')) return mockClients.embeddings;
    if (config?.baseURL?.includes('shard')) return mockClients.shardManager;
    return { post: vi.fn() };
  }),
  generateServiceToken: vi.fn(() => 'mock-token'),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: mockLoadConfig,
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('WebSearchService', () => {
  let service: WebSearchService;
  let mockContainer: ReturnType<typeof createMockContainer>;

  function createMockContainer() {
    return {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        })),
      },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockContainer = createMockContainer();
    (getContainer as ReturnType<typeof vi.fn>).mockReturnValue(mockContainer);
    service = new WebSearchService();
  });

  describe('search', () => {
    it('should perform web search successfully', async () => {
      const tenantId = 'tenant-123';
      const query = 'test query';

      // Mock no cached result
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [],
        }),
      });

      mockClients.ai.post.mockResolvedValue({
        results: [
          {
            title: 'Test Result',
            url: 'https://example.com',
            snippet: 'Test snippet',
            relevance: 0.9,
          },
        ],
      });

      // Mock result storage
      mockContainer.items.create.mockResolvedValue({
        resource: {
          id: 'result-123',
          tenantId,
          query,
          results: [],
          cached: false,
        },
      });

      const result = await service.search(tenantId, query);

      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('results');
      expect(mockClients.ai.post).toHaveBeenCalled();
    });

    it('should return cached result when available', async () => {
      const tenantId = 'tenant-123';
      const query = 'test query';

      const cachedResult = {
        id: 'result-123',
        tenantId,
        query,
        results: [
          { title: 'Cached Result', url: 'https://example.com', snippet: 'Cached snippet', relevance: 0.9 },
        ],
        cached: false,
        createdAt: new Date(),
      };

      (getContainer as ReturnType<typeof vi.fn>).mockImplementation((name: string) => {
        if (name === 'web_search_cache') {
          return {
            items: {
              query: vi.fn().mockReturnValue({
                fetchNext: vi.fn().mockResolvedValue({ resources: [cachedResult] }),
              }),
            },
          };
        }
        return mockContainer;
      });

      const result = await service.search(tenantId, query, { useCache: true });

      expect(result.cached).toBe(true);
      expect(result.results.length).toBe(1);
      expect(mockClients.ai.post).not.toHaveBeenCalled();
    });

    it('should create c_search shard via Shard Manager when shard_manager.url is set (dataflow Phase 3.1)', async () => {
      mockLoadConfig.mockReturnValueOnce({
        services: {
          ai_service: { url: 'http://ai-service:3000' },
          context_service: { url: 'http://context-service:3000' },
          embeddings: { url: 'http://embeddings:3000' },
          shard_manager: { url: 'http://shard-manager:3002' },
        },
        database: {
          containers: {
            web_search_results: 'web_search_results',
          },
        },
      });
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      });
      mockClients.ai.post.mockResolvedValue({
        results: [
          { title: 'Result', url: 'https://example.com', snippet: 'Snippet', relevance: 0.9 },
        ],
      });
      mockContainer.items.create.mockResolvedValue({
        resource: { id: 'result-1', tenantId: 't1', query: 'q', results: [], cached: false },
      });
      mockClients.shardManager.post.mockResolvedValue({ id: 'shard-1' });

      const svc = new WebSearchService();
      await svc.search('t1', 'test query');

      expect(mockClients.shardManager.post).toHaveBeenCalledWith(
        '/api/v1/shards',
        expect.objectContaining({
          tenantId: 't1',
          shardTypeId: 'c_search',
          shardTypeName: 'c_search',
          structuredData: expect.objectContaining({
            tenantId: 't1',
            query: 'test query',
            searchType: 'web',
            resultCount: 1,
          }),
          unstructuredData: expect.objectContaining({ rawQuery: 'test query' }),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-ID': 't1',
          }),
        })
      );
    });
  });
});

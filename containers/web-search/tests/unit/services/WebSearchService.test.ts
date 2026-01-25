/**
 * Web Search Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSearchService } from '../../../src/services/WebSearchService';
import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';

// Mock dependencies
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      ai_service: { url: 'http://ai-service:3000' },
      context_service: { url: 'http://context-service:3000' },
      embeddings: { url: 'http://embeddings:3000' },
    },
    database: {
      containers: {
        web_search_results: 'web_search_results',
      },
    },
  })),
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
  let mockContainer: any;
  let mockAiServiceClient: any;
  let mockContextServiceClient: any;
  let mockEmbeddingsClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchAll: vi.fn(),
        })),
      },
    };
    (getContainer as any).mockReturnValue(mockContainer);

    mockAiServiceClient = {
      post: vi.fn(),
    };
    mockContextServiceClient = {
      post: vi.fn(),
    };
    mockEmbeddingsClient = {
      post: vi.fn(),
    };

    (ServiceClient as any).mockImplementation((config: any) => {
      if (config.baseURL?.includes('ai-service')) {
        return mockAiServiceClient;
      }
      if (config.baseURL?.includes('context-service')) {
        return mockContextServiceClient;
      }
      if (config.baseURL?.includes('embeddings')) {
        return mockEmbeddingsClient;
      }
      return {};
    });

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

      // Mock AI service response
      mockAiServiceClient.post.mockResolvedValue({
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
      expect(mockAiServiceClient.post).toHaveBeenCalled();
    });

    it('should return cached result when available', async () => {
      const tenantId = 'tenant-123';
      const query = 'test query';

      const cachedResult = {
        id: 'result-123',
        tenantId,
        query,
        results: [
          {
            title: 'Cached Result',
            url: 'https://example.com',
            snippet: 'Cached snippet',
            relevance: 0.9,
          },
        ],
        cached: true,
        createdAt: new Date(),
      };

      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [cachedResult],
        }),
      });

      const result = await service.search(tenantId, query, { useCache: true });

      expect(result.cached).toBe(true);
      expect(mockAiServiceClient.post).not.toHaveBeenCalled();
    });
  });
});

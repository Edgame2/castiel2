/**
 * SearchService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceClient } from '@coder/shared/services';
import { getContainer } from '@coder/shared/database';
import { SearchService } from '../../../src/services/SearchService';

describe('SearchService', () => {
  let service: SearchService;
  let mockPost: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  let mockContainerCreate: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseRequest = {
    tenantId: 't1',
    userId: 'u1',
    query: 'test query',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPost = vi.fn().mockResolvedValue({ embedding: [0.1, 0.2] });
    mockGet = vi.fn().mockResolvedValue({});
    mockContainerCreate = vi.fn().mockResolvedValue(undefined);
    mockFetchNext = vi.fn().mockResolvedValue({ resources: [] });
    vi.mocked(ServiceClient).mockImplementation(function (this: unknown) {
      return { post: mockPost, get: mockGet };
    });
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: mockContainerCreate,
        query: vi.fn(() => ({ fetchNext: mockFetchNext })),
      },
    } as unknown as ReturnType<typeof getContainer>);
    service = new SearchService('http://embeddings', 'http://shard-manager');
  });

  describe('vectorSearch', () => {
    it('throws when query is missing or empty', async () => {
      await expect(
        service.vectorSearch({ ...baseRequest, query: '' })
      ).rejects.toThrow(/query is required/);
      await expect(
        service.vectorSearch({ ...baseRequest, query: '   ' })
      ).rejects.toThrow(/query is required/);
    });

    it('returns results and metadata', async () => {
      const result = await service.vectorSearch(baseRequest);
      expect(result.query).toBe('test query');
      expect(result.results).toEqual([]);
      expect(result.totalResults).toBe(0);
      expect(result.took).toBeGreaterThanOrEqual(0);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.model).toBe('text-embedding-3-small');
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/embeddings',
        expect.objectContaining({ text: 'test query' }),
        expect.any(Object)
      );
      expect(mockContainerCreate).toHaveBeenCalled();
    });

    it('includes queryEmbedding when includeEmbedding is true', async () => {
      const result = await service.vectorSearch({
        ...baseRequest,
        includeEmbedding: true,
      });
      expect(result.queryEmbedding).toEqual([0.1, 0.2]);
    });

    it('throws on embedding post failure', async () => {
      mockPost.mockRejectedValueOnce(new Error('embedding failed'));
      await expect(service.vectorSearch(baseRequest)).rejects.toThrow(
        /Vector search failed/
      );
    });
  });

  describe('hybridSearch', () => {
    it('throws when query is missing or empty', async () => {
      await expect(
        service.hybridSearch({ ...baseRequest, query: '' })
      ).rejects.toThrow(/query is required/);
    });

    it('returns combined response', async () => {
      const result = await service.hybridSearch(baseRequest);
      expect(result.query).toBe('test query');
      expect(result.results).toBeDefined();
      expect(result.totalResults).toBeDefined();
      expect(result.took).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.vectorWeight).toBeDefined();
      expect(result.metadata?.keywordWeight).toBeDefined();
    });
  });

  describe('fullTextSearch', () => {
    it('throws when query is missing or empty', async () => {
      await expect(
        service.fullTextSearch({ ...baseRequest, query: '' })
      ).rejects.toThrow(/query is required/);
    });

    it('returns results with offset and limit', async () => {
      const result = await service.fullTextSearch({
        ...baseRequest,
        limit: 5,
        offset: 0,
      });
      expect(result.query).toBe('test query');
      expect(result.results).toEqual([]);
      expect(result.totalResults).toBe(0);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(5);
      expect(result.took).toBeGreaterThanOrEqual(0);
    });
  });

  describe('webSearch', () => {
    it('returns result with results array', async () => {
      mockPost.mockResolvedValue({});
      const result = await service.webSearch('t1', 'test query');
      expect(result.tenantId).toBe('t1');
      expect(result.query).toBe('test query');
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.cached).toBe(false);
      expect(result.createdAt).toBeDefined();
    });

    it('returns cached result when cache hit', async () => {
      const cached = {
        id: 'c1',
        tenantId: 't1',
        query: 'test query',
        results: [],
        cached: true,
        createdAt: new Date(Date.now() - 1000),
      };
      mockFetchNext.mockResolvedValue({ resources: [cached] });
      const result = await service.webSearch('t1', 'test query', { useCache: true });
      expect(result.cached).toBe(true);
      expect(result.query).toBe('test query');
    });

    it('returns result even when cache write fails', async () => {
      mockContainerCreate.mockRejectedValueOnce(new Error('create failed'));
      const result = await service.webSearch('t1', 'q');
      expect(result.tenantId).toBe('t1');
      expect(result.query).toBe('q');
      expect(result.results).toBeDefined();
    });
  });
});

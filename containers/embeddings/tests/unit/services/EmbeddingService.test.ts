/**
 * EmbeddingService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { EmbeddingService } from '../../../src/services/EmbeddingService';

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockUpsert: ReturnType<typeof vi.fn>;
  let mockFindUnique: ReturnType<typeof vi.fn>;
  let mockFindMany: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockDeleteMany: ReturnType<typeof vi.fn>;

  const baseDoc = {
    id: 'doc1',
    projectId: 'p1',
    filePath: '/src/a.ts',
    content: 'code',
    vector: [0.1, 0.2],
    metadata: {},
    embeddingModel: 'model1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert = vi.fn();
    mockFindUnique = vi.fn().mockResolvedValue(null);
    mockFindMany = vi.fn().mockResolvedValue([]);
    mockDelete = vi.fn().mockResolvedValue(undefined);
    mockDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
    vi.mocked(getDatabaseClient).mockReturnValue({
      emb_documents: {
        upsert: mockUpsert,
        findUnique: mockFindUnique,
        findMany: mockFindMany,
        delete: mockDelete,
        deleteMany: mockDeleteMany,
      },
    });
    service = new EmbeddingService();
  });

  describe('storeEmbedding', () => {
    it('upserts by projectId and filePath when both provided', async () => {
      mockUpsert.mockResolvedValue(baseDoc);
      const result = await service.storeEmbedding(
        'p1',
        '/src/a.ts',
        'content',
        [0.1, 0.2],
        undefined,
        'model1'
      );
      expect(result.id).toBe('doc1');
      expect(result.content).toBe('code');
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { projectId_filePath: { projectId: 'p1', filePath: '/src/a.ts' } },
        update: expect.objectContaining({
          content: 'content',
          vector: [0.1, 0.2],
          embeddingModel: 'model1',
        }),
        create: expect.objectContaining({
          projectId: 'p1',
          filePath: '/src/a.ts',
          content: 'content',
          vector: [0.1, 0.2],
        }),
      });
    });

    it('upserts by id when projectId or filePath missing', async () => {
      mockUpsert.mockResolvedValue({ ...baseDoc, id: 'new-id' });
      await service.storeEmbedding(undefined, undefined, 'content', [0.1]);
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { id: 'new' },
        update: expect.any(Object),
        create: expect.any(Object),
      });
    });

    it('returns mapped CodeEmbeddingData', async () => {
      mockUpsert.mockResolvedValue(baseDoc);
      const result = await service.storeEmbedding('p1', '/a', 'c', [1, 2]);
      expect(result).toMatchObject({
        id: 'doc1',
        projectId: 'p1',
        filePath: '/src/a.ts',
        content: 'code',
        vector: [0.1, 0.2],
        embeddingModel: 'model1',
      });
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('storeEmbeddingsBatch', () => {
    it('calls storeEmbedding for each item and returns array', async () => {
      mockUpsert
        .mockResolvedValueOnce({ ...baseDoc, id: '1' })
        .mockResolvedValueOnce({ ...baseDoc, id: '2' });
      const result = await service.storeEmbeddingsBatch([
        { content: 'c1', vector: [1] },
        { content: 'c2', vector: [2] },
      ]);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
      expect(mockUpsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('getEmbedding', () => {
    it('returns null when not found', async () => {
      mockFindUnique.mockResolvedValue(null);
      const result = await service.getEmbedding('id1');
      expect(result).toBeNull();
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'id1' } });
    });

    it('returns mapped CodeEmbeddingData when found', async () => {
      mockFindUnique.mockResolvedValue(baseDoc);
      const result = await service.getEmbedding('doc1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('doc1');
      expect(result!.content).toBe('code');
      expect(result!.vector).toEqual([0.1, 0.2]);
    });
  });

  describe('searchSimilar', () => {
    it('returns empty array when no embeddings', async () => {
      mockFindMany.mockResolvedValue([]);
      const result = await service.searchSimilar([1, 0], undefined, 10, 0.7);
      expect(result).toEqual([]);
      expect(mockFindMany).toHaveBeenCalledWith({ where: {} });
    });

    it('filters by projectId when provided', async () => {
      mockFindMany.mockResolvedValue([]);
      await service.searchSimilar([1, 0], 'p1', 10, 0.7);
      expect(mockFindMany).toHaveBeenCalledWith({ where: { projectId: 'p1' } });
    });

    it('returns results above threshold, sorted by similarity, limited', async () => {
      const docA = { ...baseDoc, id: 'a', vector: [1, 0] };
      const docB = { ...baseDoc, id: 'b', vector: [0.9, 0.1] };
      mockFindMany.mockResolvedValue([docA, docB]);
      const result = await service.searchSimilar([1, 0], undefined, 1, 0.5);
      expect(result).toHaveLength(1);
      expect(result[0].embedding.id).toBe('a');
      expect(result[0].similarity).toBe(1);
    });

    it('excludes vectors below threshold', async () => {
      const docLow = { ...baseDoc, id: 'low', vector: [0, 1] };
      mockFindMany.mockResolvedValue([docLow]);
      const result = await service.searchSimilar([1, 0], undefined, 10, 0.9);
      expect(result).toEqual([]);
    });
  });

  describe('deleteEmbedding', () => {
    it('calls delete with id', async () => {
      await service.deleteEmbedding('id1');
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'id1' } });
    });
  });

  describe('deleteEmbeddingsByProject', () => {
    it('calls deleteMany and returns count', async () => {
      mockDeleteMany.mockResolvedValue({ count: 3 });
      const count = await service.deleteEmbeddingsByProject('p1');
      expect(count).toBe(3);
      expect(mockDeleteMany).toHaveBeenCalledWith({ where: { projectId: 'p1' } });
    });

    it('returns 0 when no documents deleted', async () => {
      mockDeleteMany.mockResolvedValue({ count: 0 });
      const count = await service.deleteEmbeddingsByProject('p1');
      expect(count).toBe(0);
    });
  });
});

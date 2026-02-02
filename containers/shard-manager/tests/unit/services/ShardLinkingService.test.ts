/**
 * ShardLinkingService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShardLinkingService } from '../../../src/services/ShardLinkingService';
import { ShardService } from '../../../src/services/ShardService';
import { getContainer } from '@coder/shared/database';

describe('ShardLinkingService', () => {
  let service: ShardLinkingService;
  let mockFindById: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById = vi.fn().mockResolvedValue({ id: 's1', tenantId: 't1' });
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        })),
      },
      item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
    } as unknown as ReturnType<typeof getContainer>);
    const shardService = { findById: mockFindById } as unknown as ShardService;
    service = new ShardLinkingService(shardService);
  });

  describe('validateLink', () => {
    it('adds error when fromShard not found', async () => {
      mockFindById.mockImplementation((id: string) => (id === 'from1' ? Promise.resolve(null) : Promise.resolve({ id })));
      const result = await service.validateLink('t1', 'p1', {
        fromShardId: 'from1',
        toShardId: 'to1',
        relationshipType: 'related',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'fromShardId', message: 'Source shard not found' }));
    });
    it('adds error when toShard not found', async () => {
      mockFindById.mockImplementation((id: string) => (id === 'to1' ? Promise.resolve(null) : Promise.resolve({ id })));
      const result = await service.validateLink('t1', 'p1', {
        fromShardId: 'from1',
        toShardId: 'to1',
        relationshipType: 'related',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'toShardId')).toBe(true);
    });
    it('adds error when fromShardId equals toShardId', async () => {
      mockFindById.mockResolvedValue({ id: 's1' });
      const result = await service.validateLink('t1', 'p1', {
        fromShardId: 's1',
        toShardId: 's1',
        relationshipType: 'related',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'toShardId', message: 'Cannot link shard to itself' }));
    });
    it('returns valid when shards exist and not self-link', async () => {
      mockFindById.mockResolvedValue({ id: 's1' });
      const result = await service.validateLink('t1', 'p1', {
        fromShardId: 'from1',
        toShardId: 'to1',
        relationshipType: 'related',
      });
      expect(result.errors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });
});

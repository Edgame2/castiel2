/**
 * ShardRelationshipService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShardRelationshipService } from '../../../src/services/ShardRelationshipService';
import { ShardService } from '../../../src/services/ShardService';
import { ShardEdgeRepository } from '../../../src/repositories/ShardEdgeRepository';
import { NotFoundError, BadRequestError } from '@coder/shared/utils/errors';

describe('ShardRelationshipService', () => {
  let service: ShardRelationshipService;
  let mockFindById: ReturnType<typeof vi.fn>;
  let mockFindBetween: ReturnType<typeof vi.fn>;
  let mockCreate: ReturnType<typeof vi.fn>;

  const shard = {
    id: 's1',
    tenantId: 't1',
    shardTypeId: 'opportunity',
    shardTypeName: 'opportunity',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById = vi.fn().mockResolvedValue(shard);
    mockFindBetween = vi.fn().mockResolvedValue(undefined);
    mockCreate = vi.fn().mockResolvedValue({
      id: 'e1',
      tenantId: 't1',
      sourceShardId: 's1',
      targetShardId: 's2',
      relationshipType: 'related',
    });
    const shardService = { findById: mockFindById } as unknown as ShardService;
    vi.spyOn(ShardEdgeRepository.prototype, 'findBetween').mockImplementation(mockFindBetween);
    vi.spyOn(ShardEdgeRepository.prototype, 'create').mockImplementation(mockCreate);
    vi.spyOn(ShardEdgeRepository.prototype, 'ensureContainer').mockResolvedValue(undefined);
    service = new ShardRelationshipService(shardService);
  });

  describe('createRelationship', () => {
    it('throws NotFoundError when source shard not found', async () => {
      mockFindById.mockImplementation((id: string) => (id === 's1' ? Promise.resolve(null) : Promise.resolve(shard)));
      await expect(
        service.createRelationship({
          tenantId: 't1',
          sourceShardId: 's1',
          targetShardId: 's2',
          relationshipType: 'related',
        })
      ).rejects.toThrow(NotFoundError);
    });
    it('throws NotFoundError when target shard not found', async () => {
      mockFindById.mockImplementation((id: string) => (id === 's2' ? Promise.resolve(null) : Promise.resolve(shard)));
      await expect(
        service.createRelationship({
          tenantId: 't1',
          sourceShardId: 's1',
          targetShardId: 's2',
          relationshipType: 'related',
        })
      ).rejects.toThrow(NotFoundError);
    });
    it('throws BadRequestError when relationship already exists', async () => {
      mockFindBetween.mockResolvedValue({ id: 'existing' });
      await expect(
        service.createRelationship({
          tenantId: 't1',
          sourceShardId: 's1',
          targetShardId: 's2',
          relationshipType: 'related',
        })
      ).rejects.toThrow(BadRequestError);
    });
    it('creates relationship and returns edge', async () => {
      const result = await service.createRelationship({
        tenantId: 't1',
        sourceShardId: 's1',
        targetShardId: 's2',
        relationshipType: 'related',
      });
      expect(result.id).toBe('e1');
      expect(result.sourceShardId).toBe('s1');
      expect(result.targetShardId).toBe('s2');
      expect(mockCreate).toHaveBeenCalled();
    });
  });
});

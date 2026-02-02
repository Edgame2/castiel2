/**
 * ShardService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShardService } from '../../../src/services/ShardService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '@coder/shared/utils/errors';
import { ShardStatus, ShardSource } from '../../../src/types/shard.types';

vi.mock('../../../src/events/publishers/ShardEventPublisher', () => ({
  publishShardEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('ShardService', () => {
  let service: ShardService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseCreateInput = {
    tenantId: 't1',
    userId: 'u1',
    shardTypeId: 'opportunity',
    structuredData: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: { ...doc, id: doc?.id || 'shard-1' } }));
    mockRead = vi.fn().mockResolvedValue({ resource: null });
    mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
    mockFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });
    vi.mocked(getContainer).mockReturnValue({
      items: { create: mockCreate, query: vi.fn(() => ({ fetchNext: mockFetchNext })) },
      item: vi.fn(() => ({ read: mockRead, replace: mockReplace, delete: vi.fn().mockResolvedValue(undefined) })),
    } as unknown as ReturnType<typeof getContainer>);
    service = new ShardService();
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId or shardTypeId is missing', async () => {
      await expect(service.create({ ...baseCreateInput, tenantId: '' })).rejects.toThrow(BadRequestError);
      await expect(service.create({ ...baseCreateInput, shardTypeId: '' })).rejects.toThrow(BadRequestError);
    });
    it('creates shard and returns resource', async () => {
      const result = await service.create(baseCreateInput);
      expect(result.tenantId).toBe('t1');
      expect(result.shardTypeId).toBe('opportunity');
      expect(result.status).toBe(ShardStatus.ACTIVE);
      expect(result.source).toBe(ShardSource.API);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', shardTypeId: 'opportunity' }),
        { partitionKey: 't1' }
      );
    });
    it('throws BadRequestError on 409', async () => {
      mockCreate.mockRejectedValueOnce({ code: 409 });
      await expect(service.create(baseCreateInput)).rejects.toThrow(/already exists/);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when shardId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('s1', '')).rejects.toThrow(BadRequestError);
    });
    it('returns shard when found', async () => {
      const shard = { id: 's1', tenantId: 't1', shardTypeId: 'opportunity', status: ShardStatus.ACTIVE };
      mockRead.mockResolvedValue({ resource: shard });
      const result = await service.getById('s1', 't1');
      expect(result.id).toBe('s1');
      expect(result.shardTypeId).toBe('opportunity');
    });
    it('throws NotFoundError when resource has deletedAt', async () => {
      mockRead.mockResolvedValue({ resource: { id: 's1', tenantId: 't1', deletedAt: new Date() } });
      await expect(service.getById('s1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findById', () => {
    it('returns null when shard not found', async () => {
      mockRead.mockResolvedValue({ resource: null });
      const result = await service.findById('s1', 't1');
      expect(result).toBeNull();
    });
    it('returns shard when found', async () => {
      const shard = { id: 's1', tenantId: 't1' };
      mockRead.mockResolvedValue({ resource: shard });
      const result = await service.findById('s1', 't1');
      expect(result).toEqual(shard);
    });
  });

  describe('update', () => {
    it('throws ForbiddenError when shard is ARCHIVED', async () => {
      mockRead.mockResolvedValue({ resource: { id: 's1', tenantId: 't1', status: ShardStatus.ARCHIVED } });
      await expect(service.update('s1', 't1', { userId: 'u1' } as any)).rejects.toThrow(ForbiddenError);
    });
    it('updates and returns resource', async () => {
      const existing = { id: 's1', tenantId: 't1', status: ShardStatus.ACTIVE, revisionNumber: 1, updatedAt: new Date() };
      const updated = { ...existing, structuredData: { x: 1 }, revisionNumber: 2, updatedAt: new Date() };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.update('s1', 't1', { structuredData: { x: 1 }, userId: 'u1' } as any);
      expect(result.revisionNumber).toBe(2);
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });
    it('returns items and continuationToken', async () => {
      const items = [{ id: 's1', tenantId: 't1', shardTypeId: 'opportunity' }];
      mockFetchNext.mockResolvedValue({ resources: items, continuationToken: 'tok' });
      const result = await service.list('t1', { limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.continuationToken).toBe('tok');
    });
  });
});

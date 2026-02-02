/**
 * ShardTypeService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShardTypeService } from '../../../src/services/ShardTypeService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';

describe('ShardTypeService', () => {
  let service: ShardTypeService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockFetchAll: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseCreateInput = {
    tenantId: 't1',
    createdBy: 'u1',
    name: 'opportunity',
    schema: { type: 'object', properties: {} },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: { ...doc, id: doc?.id || 'st1' } }));
    mockRead = vi.fn().mockResolvedValue({ resource: null });
    mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
    mockFetchAll = vi.fn().mockResolvedValue({ resources: [] });
    mockFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: mockCreate,
        query: vi.fn(() => ({ fetchAll: mockFetchAll, fetchNext: mockFetchNext })),
      },
      item: vi.fn(() => ({ read: mockRead, replace: mockReplace, delete: vi.fn() })),
    } as unknown as ReturnType<typeof getContainer>);
    service = new ShardTypeService();
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId, name, or schema is missing', async () => {
      await expect(service.create({ ...baseCreateInput, tenantId: '' })).rejects.toThrow(BadRequestError);
      await expect(service.create({ ...baseCreateInput, name: '' })).rejects.toThrow(BadRequestError);
      await expect(service.create({ ...baseCreateInput, schema: undefined! })).rejects.toThrow(BadRequestError);
    });
    it('creates shard type and returns resource', async () => {
      const result = await service.create(baseCreateInput);
      expect(result.tenantId).toBe('t1');
      expect(result.name).toBe('opportunity');
      expect(result.isActive).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', name: 'opportunity', schema: baseCreateInput.schema }),
        { partitionKey: 't1' }
      );
    });
    it('throws BadRequestError on 409', async () => {
      mockCreate.mockRejectedValueOnce({ code: 409 });
      await expect(service.create(baseCreateInput)).rejects.toThrow(/already exists/);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when shardTypeId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('st1', '')).rejects.toThrow(BadRequestError);
    });
    it('returns shard type when found', async () => {
      const st = { id: 'st1', tenantId: 't1', name: 'opportunity', isActive: true };
      mockRead.mockResolvedValue({ resource: st });
      const result = await service.getById('st1', 't1');
      expect(result.id).toBe('st1');
      expect(result.name).toBe('opportunity');
    });
    it('throws NotFoundError when not found', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('st1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getByName', () => {
    it('throws BadRequestError when name or tenantId is missing', async () => {
      await expect(service.getByName('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getByName('opp', '')).rejects.toThrow(BadRequestError);
    });
    it('returns first resource when found', async () => {
      const st = { id: 'st1', tenantId: 't1', name: 'opportunity' };
      mockFetchAll.mockResolvedValue({ resources: [st] });
      const result = await service.getByName('opportunity', 't1');
      expect(result).toEqual(st);
    });
    it('returns null when no resources', async () => {
      mockFetchAll.mockResolvedValue({ resources: [] });
      const result = await service.getByName('missing', 't1');
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });
    it('returns resources from fetchNext', async () => {
      const items = [{ id: 'st1', tenantId: 't1', name: 'opportunity' }];
      mockFetchNext.mockResolvedValue({ resources: items });
      const result = await service.list('t1', { limit: 10 });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('opportunity');
    });
  });

  describe('delete', () => {
    it('throws BadRequestError when shard type is system', async () => {
      mockRead.mockResolvedValue({ resource: { id: 'st1', tenantId: 't1', isSystem: true } });
      await expect(service.delete('st1', 't1')).rejects.toThrow(/Cannot delete system/);
    });
  });
});

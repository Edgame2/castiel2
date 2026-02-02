/**
 * SkillService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillService } from '../../../src/services/SkillService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { SkillLevel } from '../../../src/types/learning.types';

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

describe('SkillService', () => {
  let service: SkillService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockItemRead: ReturnType<typeof vi.fn>;
  let mockItemReplace: ReturnType<typeof vi.fn>;
  let mockItemDelete: ReturnType<typeof vi.fn>;
  let mockQueryFetchNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn().mockResolvedValue({ resource: { id: 's1', tenantId: 't1', name: 'Skill' } });
    mockItemRead = vi.fn().mockResolvedValue({ resource: null });
    mockItemReplace = vi.fn().mockResolvedValue({ resource: {} });
    mockItemDelete = vi.fn().mockResolvedValue(undefined);
    mockQueryFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });

    (getContainer as ReturnType<typeof vi.fn>).mockReturnValue({
      items: {
        create: mockCreate,
        query: vi.fn(() => ({ fetchNext: () => mockQueryFetchNext() })),
      },
      item: (_id: string, _pk: string) => ({
        read: mockItemRead,
        replace: mockItemReplace,
        delete: mockItemDelete,
      }),
    });
    service = new SkillService();
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId or name missing', async () => {
      await expect(service.create({ tenantId: '', userId: 'u1', name: 'S', level: SkillLevel.BEGINNER })).rejects.toThrow(BadRequestError);
      await expect(service.create({ tenantId: 't1', userId: 'u1', name: '', level: SkillLevel.BEGINNER })).rejects.toThrow(BadRequestError);
    });

    it('creates skill and returns resource', async () => {
      const input = { tenantId: 't1', userId: 'u1', name: 'TypeScript', level: SkillLevel.INTERMEDIATE };
      const created = { id: 's1', tenantId: 't1', name: 'TypeScript', level: SkillLevel.INTERMEDIATE };
      mockCreate.mockResolvedValue({ resource: created });
      const result = await service.create(input);
      expect(result).toEqual(created);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't1', name: 'TypeScript' }), expect.any(Object));
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when skillId or tenantId missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('s1', '')).rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError when resource is null', async () => {
      mockItemRead.mockResolvedValue({ resource: null });
      await expect(service.getById('s1', 't1')).rejects.toThrow(NotFoundError);
    });

    it('returns skill when found', async () => {
      const doc = { id: 's1', tenantId: 't1', name: 'S', level: SkillLevel.BEGINNER };
      mockItemRead.mockResolvedValue({ resource: doc });
      const result = await service.getById('s1', 't1');
      expect(result).toEqual(doc);
    });
  });

  describe('update', () => {
    it('replaces and returns resource', async () => {
      const existing = { id: 's1', tenantId: 't1', name: 'S', level: SkillLevel.BEGINNER };
      mockItemRead.mockResolvedValue({ resource: existing });
      const updated = { ...existing, name: 'Updated', updatedAt: new Date() };
      mockItemReplace.mockResolvedValue({ resource: updated });
      const result = await service.update('s1', 't1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
      expect(mockItemReplace).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('calls getById then container.item().delete', async () => {
      mockItemRead.mockResolvedValue({ resource: { id: 's1', tenantId: 't1' } });
      await service.delete('s1', 't1');
      expect(mockItemDelete).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken', async () => {
      const items = [{ id: 's1', tenantId: 't1', name: 'S', level: SkillLevel.BEGINNER }];
      mockQueryFetchNext.mockResolvedValue({ resources: items, continuationToken: 'tok' });
      const result = await service.list('t1');
      expect(result.items).toEqual(items);
      expect(result.continuationToken).toBe('tok');
    });
  });
});

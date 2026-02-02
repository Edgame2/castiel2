/**
 * Unit tests for PatternService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { PatternService } from '../../../src/services/PatternService';
import { PatternType, PatternCategory, PatternMatchSeverity } from '../../../src/types/pattern.types';

describe('PatternService', () => {
  let service: PatternService;

  beforeEach(() => {
    service = new PatternService();
  });

  describe('create', () => {
    it('creates a pattern with required fields', async () => {
      const input = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        name: 'Pattern 1',
        type: PatternType.DESIGN_PATTERN,
        patternDefinition: { regex: 'test' },
      };
      const created = { ...input, id: 'pattern-id', createdAt: new Date(), updatedAt: new Date() };
      const mockCreate = vi.fn().mockResolvedValue({ resource: created });
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: mockCreate,
          query: vi.fn(() => ({
            fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
            fetchNext: vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined }),
          })),
        },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.create(input);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: input.tenantId,
          name: input.name,
          type: input.type,
          patternDefinition: input.patternDefinition,
        }),
        { partitionKey: input.tenantId }
      );
      expect(result).toEqual(created);
    });

    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.create({
          tenantId: '',
          userId: 'user-1',
          name: 'P',
          type: PatternType.DESIGN_PATTERN,
          patternDefinition: {},
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when name is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'user-1',
          name: '',
          type: PatternType.DESIGN_PATTERN,
          patternDefinition: {},
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when patternDefinition is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'user-1',
          name: 'P',
          type: PatternType.DESIGN_PATTERN,
          patternDefinition: undefined as any,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError on 409 conflict', async () => {
      const mockCreate = vi.fn().mockRejectedValue({ code: 409 });
      vi.mocked(getContainer).mockReturnValue({
        items: { create: mockCreate, query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          name: 'P',
          type: PatternType.DESIGN_PATTERN,
          patternDefinition: {},
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when patternId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('p1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns pattern when found', async () => {
      const pattern = {
        id: 'p1',
        tenantId: 't1',
        name: 'Pattern 1',
        type: PatternType.DESIGN_PATTERN,
        patternDefinition: {},
        enforcement: { enabled: true, severity: PatternMatchSeverity.MEDIUM },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: pattern }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.getById('p1', 't1');

      expect(result).toEqual(pattern);
    });

    it('throws NotFoundError when pattern not found', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.getById('p1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates pattern and returns updated resource', async () => {
      const existing = {
        id: 'p1',
        tenantId: 't1',
        name: 'Old',
        type: PatternType.DESIGN_PATTERN,
        patternDefinition: {},
        enforcement: { enabled: true, severity: PatternMatchSeverity.MEDIUM },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      const mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: existing }),
          replace: mockReplace,
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.update('p1', 't1', { name: 'New' });

      expect(mockReplace).toHaveBeenCalled();
      expect(result.name).toBe('New');
    });
  });

  describe('delete', () => {
    it('deletes pattern when found', async () => {
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: { id: 'p1', tenantId: 't1' } }),
          replace: vi.fn(),
          delete: mockDelete,
        })),
      } as any);

      await service.delete('p1', 't1');

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken from fetchNext', async () => {
      const items = [
        {
          id: 'p1',
          tenantId: 't1',
          name: 'P1',
          type: PatternType.DESIGN_PATTERN,
          patternDefinition: {},
          enforcement: { enabled: true, severity: PatternMatchSeverity.MEDIUM },
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'u1',
        },
      ];
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: items, continuationToken: 'token' }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const result = await service.list('t1');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('P1');
      expect(result.continuationToken).toBe('token');
    });
  });

  describe('getEnabledPatterns', () => {
    it('returns enabled patterns filtered by pattern types', async () => {
      const designPattern = {
        id: 'p1',
        tenantId: 't1',
        name: 'Design',
        type: PatternType.DESIGN_PATTERN,
        patternDefinition: {},
        enforcement: { enabled: true, severity: PatternMatchSeverity.MEDIUM },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({
              resources: [designPattern],
              continuationToken: undefined,
            }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const result = await service.getEnabledPatterns('t1', [PatternType.DESIGN_PATTERN]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(PatternType.DESIGN_PATTERN);
    });
  });
});

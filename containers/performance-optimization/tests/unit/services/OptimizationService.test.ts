/**
 * Unit tests for OptimizationService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { OptimizationService } from '../../../src/services/OptimizationService';
import {
  OptimizationType,
  OptimizationStatus,
  OptimizationPriority,
} from '../../../src/types/optimization.types';

describe('OptimizationService', () => {
  let service: OptimizationService;

  beforeEach(() => {
    service = new OptimizationService();
  });

  describe('create', () => {
    it('creates an optimization with required fields', async () => {
      const input = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        type: OptimizationType.CODE,
        target: { type: 'file' as const, path: '/app/src' },
      };
      const created = {
        ...input,
        id: 'opt-id',
        status: OptimizationStatus.PENDING,
        baseline: { metrics: {}, measuredAt: new Date() },
        priority: OptimizationPriority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockCreate = vi.fn().mockResolvedValue({ resource: created });
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: mockCreate,
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined }),
            fetchAll: vi.fn(),
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
          type: input.type,
          target: input.target,
        }),
        { partitionKey: input.tenantId }
      );
      expect(result).toEqual(created);
    });

    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.create({
          tenantId: '',
          userId: 'u1',
          type: OptimizationType.CODE,
          target: { type: 'file', path: '/p' },
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when type is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          type: undefined as any,
          target: { type: 'file', path: '/p' },
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when target is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          type: OptimizationType.CODE,
          target: undefined as any,
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
          type: OptimizationType.CODE,
          target: { type: 'file', path: '/p' },
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when optimizationId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('o1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns optimization when found', async () => {
      const opt = {
        id: 'o1',
        tenantId: 't1',
        type: OptimizationType.CODE,
        status: OptimizationStatus.PENDING,
        target: { type: 'file' as const, path: '/p' },
        baseline: { metrics: {}, measuredAt: new Date() },
        priority: OptimizationPriority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: opt }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.getById('o1', 't1');

      expect(result).toEqual(opt);
    });

    it('throws NotFoundError when optimization not found', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.getById('o1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates optimization and returns updated resource', async () => {
      const existing = {
        id: 'o1',
        tenantId: 't1',
        type: OptimizationType.CODE,
        status: OptimizationStatus.PENDING,
        target: { type: 'file' as const, path: '/p' },
        baseline: { metrics: {}, measuredAt: new Date() },
        priority: OptimizationPriority.MEDIUM,
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

      const result = await service.update('o1', 't1', { status: OptimizationStatus.COMPLETED });

      expect(mockReplace).toHaveBeenCalled();
      expect(result.status).toBe(OptimizationStatus.COMPLETED);
    });
  });

  describe('delete', () => {
    it('deletes optimization when status allows', async () => {
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({
            resource: {
              id: 'o1',
              tenantId: 't1',
              status: OptimizationStatus.PENDING,
            },
          }),
          replace: vi.fn(),
          delete: mockDelete,
        })),
      } as any);

      await service.delete('o1', 't1');

      expect(mockDelete).toHaveBeenCalled();
    });

    it('throws BadRequestError when optimization is OPTIMIZING', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({
            resource: {
              id: 'o1',
              tenantId: 't1',
              status: OptimizationStatus.OPTIMIZING,
            },
          }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.delete('o1', 't1')).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when optimization is ANALYZING', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({
            resource: {
              id: 'o1',
              tenantId: 't1',
              status: OptimizationStatus.ANALYZING,
            },
          }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.delete('o1', 't1')).rejects.toThrow(BadRequestError);
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken from fetchNext', async () => {
      const items = [
        {
          id: 'o1',
          tenantId: 't1',
          type: OptimizationType.CODE,
          status: OptimizationStatus.PENDING,
          target: { type: 'file' as const, path: '/p' },
          baseline: { metrics: {}, measuredAt: new Date() },
          priority: OptimizationPriority.MEDIUM,
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
      expect(result.items[0].type).toBe(OptimizationType.CODE);
      expect(result.continuationToken).toBe('token');
    });
  });
});

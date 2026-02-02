/**
 * Unit tests for PipelineViewService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { PipelineViewService } from '../../../src/services/PipelineViewService';
import { SalesStage } from '../../../src/types/pipeline.types';

describe('PipelineViewService', () => {
  let service: PipelineViewService;

  beforeEach(() => {
    service = new PipelineViewService();
  });

  const defaultStages = [
    { stage: SalesStage.PROSPECTING, name: 'Prospecting', order: 1, isActive: true },
    { stage: SalesStage.QUALIFICATION, name: 'Qualification', order: 2, isActive: true },
  ];

  describe('create', () => {
    it('creates pipeline view with required fields', async () => {
      const input = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        name: 'My View',
        stages: defaultStages,
      };
      const mockCreate = vi.fn().mockImplementation((doc: unknown) =>
        Promise.resolve({ resource: { ...(doc as object), id: (doc as { id?: string }).id || 'view-id' } })
      );
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: mockCreate,
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
            fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
          })),
        },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as unknown as ReturnType<typeof getContainer>);

      const result = await service.create(input);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: input.tenantId,
          name: input.name,
          stages: input.stages,
        }),
        { partitionKey: input.tenantId }
      );
      expect(result.tenantId).toBe(input.tenantId);
      expect(result.name).toBe(input.name);
    });

    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.create({
          tenantId: '',
          userId: 'u1',
          name: 'View',
          stages: defaultStages,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when name is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          name: '',
          stages: defaultStages,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when stages are missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          name: 'View',
          stages: [],
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError on 409 conflict', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn().mockRejectedValue({ code: 409 }),
          query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn().mockResolvedValue({ resources: [] }) })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as unknown as ReturnType<typeof getContainer>);

      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          name: 'View',
          stages: defaultStages,
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when viewId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('v1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns view when found', async () => {
      const view = {
        id: 'v1',
        tenantId: 't1',
        userId: 'u1',
        name: 'My View',
        stages: defaultStages,
        isDefault: false,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: view }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as unknown as ReturnType<typeof getContainer>);

      const result = await service.getById('v1', 't1');
      expect(result).toEqual(view);
    });

    it('throws NotFoundError when view not found', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as unknown as ReturnType<typeof getContainer>);

      await expect(service.getById('v1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('throws BadRequestError when updating system view', async () => {
      const systemView = {
        id: 'v1',
        tenantId: 't1',
        userId: 'u1',
        name: 'System View',
        stages: defaultStages,
        isDefault: false,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: systemView }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as unknown as ReturnType<typeof getContainer>);

      await expect(service.update('v1', 't1', { name: 'New Name' })).rejects.toThrow(BadRequestError);
    });

    it('updates view and returns updated resource', async () => {
      const existing = {
        id: 'v1',
        tenantId: 't1',
        userId: 'u1',
        name: 'Old Name',
        stages: defaultStages,
        isDefault: false,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      const mockReplace = vi.fn().mockImplementation((doc: unknown) => Promise.resolve({ resource: doc }));
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn().mockResolvedValue({ resources: [] }) })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: existing }),
          replace: mockReplace,
          delete: vi.fn(),
        })),
      } as unknown as ReturnType<typeof getContainer>);

      const result = await service.update('v1', 't1', { name: 'New Name' });
      expect(mockReplace).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });
  });

  describe('delete', () => {
    it('throws BadRequestError when deleting system view', async () => {
      const systemView = {
        id: 'v1',
        tenantId: 't1',
        userId: 'u1',
        name: 'System View',
        stages: defaultStages,
        isDefault: false,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: systemView }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as unknown as ReturnType<typeof getContainer>);

      await expect(service.delete('v1', 't1')).rejects.toThrow(BadRequestError);
    });

    it('deletes view when not system', async () => {
      const existing = {
        id: 'v1',
        tenantId: 't1',
        userId: 'u1',
        name: 'My View',
        stages: defaultStages,
        isDefault: false,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: existing }),
          replace: vi.fn(),
          delete: mockDelete,
        })),
      } as unknown as ReturnType<typeof getContainer>);

      await service.delete('v1', 't1');
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns list of views', async () => {
      const views = [
        {
          id: 'v1',
          tenantId: 't1',
          userId: 'u1',
          name: 'View 1',
          stages: defaultStages,
          isDefault: true,
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'u1',
        },
      ];
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: views }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as unknown as ReturnType<typeof getContainer>);

      const result = await service.list('t1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('View 1');
    });
  });
});

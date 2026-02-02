/**
 * Unit tests for ContentTemplateService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ContentTemplateService } from '../../../src/services/ContentTemplateService';

describe('ContentTemplateService', () => {
  let service: ContentTemplateService;

  beforeEach(() => {
    service = new ContentTemplateService();
  });

  describe('create', () => {
    it('creates a template with required fields', async () => {
      const input = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        name: 'Template 1',
        templateContent: 'Hello {{name}}',
      };
      const created = {
        ...input,
        id: 'tpl-id',
        isActive: true,
        version: '1.0.0',
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
          name: input.name,
          templateContent: input.templateContent,
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
          name: 'T',
          templateContent: 'x',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when name is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          name: '',
          templateContent: 'x',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when templateContent is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          name: 'T',
          templateContent: undefined as any,
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
          name: 'T',
          templateContent: 'x',
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when templateId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('t1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns template when found', async () => {
      const template = {
        id: 't1',
        tenantId: 't1',
        name: 'T1',
        templateContent: 'x',
        isActive: true,
        version: '1.0.0',
        isSystemTemplate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: template }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.getById('t1', 't1');

      expect(result).toEqual(template);
    });

    it('throws NotFoundError when template not found', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.getById('t1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('throws BadRequestError when template is system template', async () => {
      const existing = {
        id: 't1',
        tenantId: 't1',
        name: 'T1',
        templateContent: 'x',
        isActive: true,
        version: '1.0.0',
        isSystemTemplate: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: existing }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.update('t1', 't1', { name: 'New' })).rejects.toThrow(BadRequestError);
    });

    it('updates template and returns updated resource', async () => {
      const existing = {
        id: 't1',
        tenantId: 't1',
        name: 'Old',
        templateContent: 'x',
        isActive: true,
        version: '1.0.0',
        isSystemTemplate: false,
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

      const result = await service.update('t1', 't1', { name: 'New' });

      expect(mockReplace).toHaveBeenCalled();
      expect(result.name).toBe('New');
    });
  });

  describe('delete', () => {
    it('throws BadRequestError when template is system template', async () => {
      const existing = {
        id: 't1',
        tenantId: 't1',
        name: 'T1',
        templateContent: 'x',
        isActive: true,
        isSystemTemplate: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: existing }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.delete('t1', 't1')).rejects.toThrow(BadRequestError);
    });

    it('deletes template when not system template', async () => {
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({
            resource: {
              id: 't1',
              tenantId: 't1',
              isSystemTemplate: false,
            },
          }),
          replace: vi.fn(),
          delete: mockDelete,
        })),
      } as any);

      await service.delete('t1', 't1');

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns templates from fetchNext', async () => {
      const items = [
        {
          id: 't1',
          tenantId: 't1',
          name: 'T1',
          templateContent: 'x',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'u1',
        },
      ];
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: items }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const result = await service.list('t1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('T1');
    });
  });
});

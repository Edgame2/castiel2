/**
 * Unit tests for CollectionService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { CollectionService } from '../../../src/services/CollectionService';
import { CollectionType } from '../../../src/types/document.types';

describe('CollectionService', () => {
  let service: CollectionService;

  beforeEach(() => {
    service = new CollectionService();
  });

  describe('create', () => {
    it('creates a collection with required fields', async () => {
      const input = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        name: 'My Collection',
        type: CollectionType.FOLDER,
      };
      const created = {
        ...input,
        id: 'col-id',
        documentIds: [],
        isSystem: false,
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
          replace: vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc })),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.create(input);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: input.tenantId,
          name: input.name,
          type: input.type,
        }),
        { partitionKey: input.tenantId }
      );
      expect(result.name).toBe(input.name);
    });

    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.create({
          tenantId: '',
          userId: 'u1',
          name: 'C',
          type: CollectionType.FOLDER,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when name is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          name: '',
          type: CollectionType.FOLDER,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when type is SMART and filterCriteria is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          name: 'C',
          type: CollectionType.SMART,
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
          name: 'C',
          type: CollectionType.FOLDER,
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when collectionId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('c1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns collection when found', async () => {
      const collection = {
        id: 'c1',
        tenantId: 't1',
        name: 'C1',
        type: CollectionType.FOLDER,
        documentIds: [],
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: collection }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.getById('c1', 't1');
      expect(result).toEqual(collection);
    });

    it('throws NotFoundError when collection not found', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.getById('c1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('throws BadRequestError when collection is system', async () => {
      const existing = {
        id: 'c1',
        tenantId: 't1',
        name: 'C1',
        type: CollectionType.FOLDER,
        documentIds: [],
        isSystem: true,
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

      await expect(service.update('c1', 't1', { name: 'New' })).rejects.toThrow(BadRequestError);
    });
  });

  describe('delete', () => {
    it('throws BadRequestError when collection is system', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({
            resource: { id: 'c1', tenantId: 't1', isSystem: true },
          }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.delete('c1', 't1')).rejects.toThrow(BadRequestError);
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns collections from fetchNext', async () => {
      const items = [
        {
          id: 'c1',
          tenantId: 't1',
          name: 'C1',
          type: CollectionType.FOLDER,
          documentIds: [],
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
      expect(result[0].name).toBe('C1');
    });
  });

  describe('addDocument', () => {
    it('appends documentId and returns updated collection', async () => {
      const collection = {
        id: 'c1',
        tenantId: 't1',
        name: 'C1',
        documentIds: [] as string[],
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      const mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: collection }),
          replace: mockReplace,
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.addDocument('c1', 't1', 'doc1');
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({ documentIds: ['doc1'] })
      );
      expect(result.documentIds).toContain('doc1');
    });
  });

  describe('removeDocument', () => {
    it('removes documentId and returns updated collection', async () => {
      const collection = {
        id: 'c1',
        tenantId: 't1',
        name: 'C1',
        documentIds: ['doc1', 'doc2'],
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      const mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: collection }),
          replace: mockReplace,
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.removeDocument('c1', 't1', 'doc1');
      expect(result.documentIds).not.toContain('doc1');
      expect(result.documentIds).toContain('doc2');
    });
  });
});

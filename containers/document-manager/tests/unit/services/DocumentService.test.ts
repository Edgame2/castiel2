/**
 * Unit tests for DocumentService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '@coder/shared/utils/errors';
import { BlobStorageService } from '../../../src/services/BlobStorageService';
import { DocumentService } from '../../../src/services/DocumentService';
import { DocumentStatus, StorageProvider, VisibilityLevel } from '../../../src/types/document.types';

const blobStorageConfig = {
  provider: StorageProvider.AZURE as const,
  azure: { accountName: 'a', accountKey: 'k', containerName: 'c' },
};

describe('DocumentService', () => {
  let blobStorage: BlobStorageService;
  let service: DocumentService;

  beforeEach(() => {
    blobStorage = new BlobStorageService(blobStorageConfig);
    service = new DocumentService(blobStorage);
  });

  const createInput = {
    tenantId: 't1',
    userId: 'u1',
    name: 'doc.pdf',
    mimeType: 'application/pdf',
    fileSize: 100,
    storagePath: 't1/doc.pdf',
    storageProvider: StorageProvider.AZURE,
  };

  describe('create', () => {
    it('creates a document with required fields', async () => {
      const created = {
        id: 'doc-id',
        tenantId: createInput.tenantId,
        userId: createInput.userId,
        structuredData: {
          name: createInput.name,
          mimeType: createInput.mimeType,
          fileSize: createInput.fileSize,
          storagePath: createInput.storagePath,
          storageProvider: createInput.storageProvider,
          visibility: VisibilityLevel.INTERNAL,
          version: 1,
          tags: [],
          versionHistory: [],
          uploadedBy: createInput.userId,
          uploadedAt: new Date(),
        },
        status: DocumentStatus.ACTIVE,
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
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const result = await service.create(createInput);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: createInput.tenantId,
          userId: createInput.userId,
        }),
        { partitionKey: createInput.tenantId }
      );
      expect(result.tenantId).toBe(createInput.tenantId);
    });

    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.create({
          ...createInput,
          tenantId: '',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when name is missing', async () => {
      await expect(
        service.create({
          ...createInput,
          name: '',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when mimeType is missing', async () => {
      await expect(
        service.create({
          ...createInput,
          mimeType: undefined as any,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when fileSize is invalid', async () => {
      await expect(
        service.create({
          ...createInput,
          fileSize: 0,
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when documentId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('d1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns document when found', async () => {
      const doc = {
        id: 'd1',
        tenantId: 't1',
        userId: 'u1',
        structuredData: {
          name: 'doc',
          mimeType: 'application/pdf',
          fileSize: 100,
          storagePath: '/p',
          storageProvider: StorageProvider.AZURE,
          visibility: VisibilityLevel.INTERNAL,
          version: 1,
          tags: [],
          versionHistory: [],
          uploadedBy: 'u1',
          uploadedAt: new Date(),
        },
        status: DocumentStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: doc }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.getById('d1', 't1');
      expect(result).toEqual(doc);
    });

    it('throws NotFoundError when document has status DELETED', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({
            resource: {
              id: 'd1',
              tenantId: 't1',
              status: DocumentStatus.DELETED,
              structuredData: {},
            },
          }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.getById('d1', 't1')).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when document not found', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.getById('d1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('throws ForbiddenError when document is ARCHIVED', async () => {
      const existing = {
        id: 'd1',
        tenantId: 't1',
        userId: 'u1',
        structuredData: { name: 'd', tags: [] },
        status: DocumentStatus.ARCHIVED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: existing }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.update('d1', 't1', { name: 'New' })).rejects.toThrow(ForbiddenError);
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken', async () => {
      const items = [
        {
          id: 'd1',
          tenantId: 't1',
          userId: 'u1',
          structuredData: { name: 'd', tags: [] },
          status: DocumentStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: items, continuationToken: 'tok' }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const result = await service.list('t1');
      expect(result.items).toHaveLength(1);
      expect(result.continuationToken).toBe('tok');
    });
  });

  describe('generateDownloadUrl', () => {
    it('returns download response with url and metadata', async () => {
      const doc = {
        id: 'd1',
        tenantId: 't1',
        userId: 'u1',
        status: DocumentStatus.ACTIVE,
        structuredData: {
          name: 'doc.pdf',
          mimeType: 'application/pdf',
          fileSize: 100,
          storagePath: 't1/doc.pdf',
          tags: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: doc }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.generateDownloadUrl('d1', 't1', 15);
      expect(result.downloadUrl).toContain('sas=token');
      expect(result.fileName).toBe('doc.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.fileSize).toBe(100);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });
});

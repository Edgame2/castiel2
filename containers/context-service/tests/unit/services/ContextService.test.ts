/**
 * Unit tests for ContextService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextService } from '../../../src/services/ContextService';
import { ContextType, ContextScope } from '../../../src/types/context.types';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';

vi.mock('@coder/shared/database');

const mockGetContainer = vi.mocked(getContainer);

describe('ContextService', () => {
  let service: ContextService;
  const tenantId = 'tenant-1';
  const mockContext = {
    id: 'ctx-1',
    tenantId,
    type: ContextType.FILE,
    scope: ContextScope.PROJECT,
    path: '/src/foo.ts',
    name: 'foo.ts',
    content: 'const x = 1;',
    tokenCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContextService();
    const mockItem = {
      read: vi.fn().mockResolvedValue({ resource: null }),
      replace: vi.fn().mockResolvedValue({ resource: mockContext }),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const mockItems = {
      create: vi.fn().mockResolvedValue({ resource: mockContext }),
      query: vi.fn().mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [mockContext] }),
        fetchNext: vi.fn().mockResolvedValue({ resources: [mockContext], continuationToken: undefined }),
      }),
    };
    mockGetContainer.mockReturnValue({
      items: mockItems,
      item: vi.fn(() => mockItem),
    } as any);
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.create({
          tenantId: '',
          userId: 'u1',
          type: ContextType.FILE,
          scope: ContextScope.PROJECT,
          path: '/p',
          name: 'n',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when type or path or name is missing', async () => {
      await expect(
        service.create({
          tenantId,
          userId: 'u1',
          type: ContextType.FILE,
          scope: ContextScope.PROJECT,
          path: '',
          name: 'n',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('creates context and returns resource', async () => {
      const input = {
        tenantId,
        userId: 'u1',
        type: ContextType.FILE,
        scope: ContextScope.PROJECT,
        path: '/src/foo.ts',
        name: 'foo.ts',
        content: 'hello',
      };
      const result = await service.create(input);
      expect(result).toBeDefined();
      expect(mockGetContainer().items.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          type: ContextType.FILE,
          path: '/src/foo.ts',
          name: 'foo.ts',
        }),
        { partitionKey: tenantId }
      );
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when contextId or tenantId is missing', async () => {
      await expect(service.getById('', tenantId)).rejects.toThrow(BadRequestError);
      await expect(service.getById('ctx-1', '')).rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError when resource is null', async () => {
      await expect(service.getById('ctx-1', tenantId)).rejects.toThrow(NotFoundError);
    });

    it('returns context when found', async () => {
      const container = mockGetContainer();
      (container.item as ReturnType<typeof vi.fn>)()
        .read = vi.fn().mockResolvedValue({ resource: mockContext });
      const result = await service.getById('ctx-1', tenantId);
      expect(result).toEqual(mockContext);
    });
  });

  describe('getByPath', () => {
    it('throws BadRequestError when path or tenantId is missing', async () => {
      await expect(service.getByPath('', tenantId)).rejects.toThrow(BadRequestError);
      await expect(service.getByPath('/p', '')).rejects.toThrow(BadRequestError);
    });

    it('returns first resource from query', async () => {
      const result = await service.getByPath('/src/foo.ts', tenantId);
      expect(result).toEqual(mockContext);
    });
  });

  describe('update', () => {
    it('calls getById then replace', async () => {
      const container = mockGetContainer();
      (container.item as ReturnType<typeof vi.fn>)()
        .read = vi.fn().mockResolvedValue({ resource: mockContext });
      const result = await service.update('ctx-1', tenantId, { content: 'updated' });
      expect(result).toBeDefined();
      expect(container.item('ctx-1', tenantId).replace).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('calls getById then delete', async () => {
      const container = mockGetContainer();
      (container.item as ReturnType<typeof vi.fn>)()
        .read = vi.fn().mockResolvedValue({ resource: mockContext });
      await service.delete('ctx-1', tenantId);
      expect(container.item('ctx-1', tenantId).delete).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken from fetchNext', async () => {
      const { items, continuationToken } = await service.list(tenantId);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(mockContext);
      expect(continuationToken).toBeUndefined();
    });
  });
});

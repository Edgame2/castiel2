/**
 * Unit tests for DependencyService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DependencyService } from '../../../src/services/DependencyService';
import { ContextService } from '../../../src/services/ContextService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';

vi.mock('@coder/shared/database');

const mockGetContainer = vi.mocked(getContainer);

describe('DependencyService', () => {
  let service: DependencyService;
  let contextService: ContextService;
  const tenantId = 'tenant-1';
  const mockTree = {
    id: 'tree-1',
    tenantId,
    rootPath: '/src/foo.ts',
    tree: { path: '/src/foo.ts', type: 'file', dependencies: [] },
    depth: 1,
    totalNodes: 1,
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    contextService = new ContextService();
    service = new DependencyService(contextService);
    const mockItem = {
      read: vi.fn().mockResolvedValue({ resource: null }),
    };
    const mockItems = {
      create: vi.fn().mockResolvedValue({ resource: mockTree }),
    };
    mockGetContainer.mockReturnValue({
      items: mockItems,
      item: vi.fn(() => mockItem),
    } as any);
  });

  describe('buildTree', () => {
    it('throws BadRequestError when rootPath or tenantId is missing', async () => {
      await expect(service.buildTree('', tenantId)).rejects.toThrow(BadRequestError);
      await expect(service.buildTree('/p', '')).rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError when context not found for path', async () => {
      vi.spyOn(contextService, 'getByPath').mockResolvedValue(undefined);
      await expect(service.buildTree('/missing', tenantId)).rejects.toThrow(NotFoundError);
    });

    it('builds tree and persists when context exists', async () => {
      const rootContext = {
        id: 'ctx-1',
        tenantId,
        path: '/src/foo.ts',
        type: 'file',
        name: 'foo.ts',
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
      vi.spyOn(contextService, 'getByPath').mockResolvedValue(rootContext);
      vi.spyOn(contextService, 'getById').mockResolvedValue(rootContext);
      const result = await service.buildTree('/src/foo.ts', tenantId);
      expect(result).toBeDefined();
      expect(result.rootPath).toBe('/src/foo.ts');
      expect(mockGetContainer().items.create).toHaveBeenCalledWith(
        expect.objectContaining({ rootPath: '/src/foo.ts', tenantId }),
        { partitionKey: tenantId }
      );
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when treeId or tenantId is missing', async () => {
      await expect(service.getById('', tenantId)).rejects.toThrow(BadRequestError);
      await expect(service.getById('tree-1', '')).rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError when resource is null', async () => {
      await expect(service.getById('tree-1', tenantId)).rejects.toThrow(NotFoundError);
    });

    it('returns tree when found', async () => {
      const container = mockGetContainer();
      (container.item as ReturnType<typeof vi.fn>)()
        .read = vi.fn().mockResolvedValue({ resource: mockTree });
      const result = await service.getById('tree-1', tenantId);
      expect(result).toEqual(mockTree);
    });
  });
});

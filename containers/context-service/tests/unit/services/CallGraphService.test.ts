/**
 * Unit tests for CallGraphService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CallGraphService } from '../../../src/services/CallGraphService';
import { ContextService } from '../../../src/services/ContextService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ContextScope } from '../../../src/types/context.types';

vi.mock('@coder/shared/database');

const mockGetContainer = vi.mocked(getContainer);

describe('CallGraphService', () => {
  let service: CallGraphService;
  let contextService: ContextService;
  const tenantId = 'tenant-1';
  const mockGraph = {
    id: 'graph-1',
    tenantId,
    scope: ContextScope.PROJECT,
    nodes: [],
    edges: [],
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    contextService = new ContextService();
    service = new CallGraphService(contextService);
    const mockItem = {
      read: vi.fn().mockResolvedValue({ resource: null }),
    };
    const mockItems = {
      create: vi.fn().mockResolvedValue({ resource: mockGraph }),
    };
    mockGetContainer.mockReturnValue({
      items: mockItems,
      item: vi.fn(() => mockItem),
    } as any);
  });

  describe('buildGraph', () => {
    it('throws BadRequestError when scope or tenantId is missing', async () => {
      await expect(
        service.buildGraph(undefined as any, tenantId)
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.buildGraph(ContextScope.PROJECT, '')
      ).rejects.toThrow(BadRequestError);
    });

    it('builds graph from context list and persists', async () => {
      vi.spyOn(contextService, 'list').mockResolvedValue({
        items: [
          {
            id: 'c1',
            tenantId,
            type: 'function',
            scope: ContextScope.PROJECT,
            path: '/a',
            name: 'a',
            callers: [],
            callees: ['c2'],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'c2',
            tenantId,
            type: 'function',
            scope: ContextScope.PROJECT,
            path: '/b',
            name: 'b',
            callers: ['c1'],
            callees: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ] as any,
        continuationToken: undefined,
      });
      const result = await service.buildGraph(ContextScope.PROJECT, tenantId);
      expect(result).toBeDefined();
      expect(mockGetContainer().items.create).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when graphId or tenantId is missing', async () => {
      await expect(service.getById('', tenantId)).rejects.toThrow(BadRequestError);
      await expect(service.getById('graph-1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns graph when found', async () => {
      const container = mockGetContainer();
      (container.item as ReturnType<typeof vi.fn>)()
        .read = vi.fn().mockResolvedValue({ resource: mockGraph });
      const result = await service.getById('graph-1', tenantId);
      expect(result).toEqual(mockGraph);
    });
  });

  describe('getCallers', () => {
    it('returns empty array when context has no callers', async () => {
      vi.spyOn(contextService, 'getByPath').mockResolvedValue({
        id: 'c1',
        callers: undefined,
      } as any);
      const result = await service.getCallers('/foo', tenantId);
      expect(result).toEqual([]);
    });

    it('returns callers when context has callers', async () => {
      const caller = { id: 'caller-1', name: 'caller' };
      vi.spyOn(contextService, 'getByPath').mockResolvedValue({
        id: 'c1',
        callers: ['caller-1'],
      } as any);
      vi.spyOn(contextService, 'getById').mockResolvedValue(caller as any);
      const result = await service.getCallers('/foo', tenantId);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(caller);
    });
  });

  describe('getCallees', () => {
    it('returns empty array when context has no callees', async () => {
      vi.spyOn(contextService, 'getByPath').mockResolvedValue({
        id: 'c1',
        callees: undefined,
      } as any);
      const result = await service.getCallees('/foo', tenantId);
      expect(result).toEqual([]);
    });
  });
});

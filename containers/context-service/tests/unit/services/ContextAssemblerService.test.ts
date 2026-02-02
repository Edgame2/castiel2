/**
 * Unit tests for ContextAssemblerService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextAssemblerService } from '../../../src/services/ContextAssemblerService';
import { ContextService } from '../../../src/services/ContextService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ContextScope } from '../../../src/types/context.types';
import { loadConfig } from '../../../src/config';

vi.mock('@coder/shared/database');
vi.mock('../../../src/config', () => ({ loadConfig: vi.fn() }));

const mockGetContainer = vi.mocked(getContainer);

describe('ContextAssemblerService', () => {
  let service: ContextAssemblerService;
  let contextService: ContextService;
  const tenantId = 'tenant-1';
  const mockAssembly = {
    id: 'asm-1',
    tenantId,
    requestId: 'req-1',
    contexts: [],
    totalTokens: 0,
    assembledAt: new Date(),
    expiresAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadConfig).mockReturnValue({
      services: {
        shard_manager: { url: 'http://shard' },
        search_service: { url: 'http://search' },
        embeddings: { url: 'http://emb' },
        ai_service: { url: 'http://ai' },
      },
    } as any);
    contextService = new ContextService();
    service = new ContextAssemblerService(contextService);
    const mockItem = {
      read: vi.fn().mockResolvedValue({ resource: null }),
    };
    const mockItems = {
      create: vi.fn().mockResolvedValue({ resource: mockAssembly }),
    };
    mockGetContainer.mockReturnValue({
      items: mockItems,
      item: vi.fn(() => mockItem),
    } as any);
  });

  describe('assemble', () => {
    it('throws BadRequestError when task or scope is missing', async () => {
      await expect(
        service.assemble({ task: '', scope: ContextScope.PROJECT }, tenantId, 'u1')
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.assemble({ task: 't', scope: undefined as any }, tenantId, 'u1')
      ).rejects.toThrow(BadRequestError);
    });

    it('assembles and persists when context list returns items', async () => {
      const ctx = {
        id: 'c1',
        tenantId,
        type: 'file',
        scope: ContextScope.PROJECT,
        path: '/a',
        name: 'a',
        content: 'hello',
        tokenCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
      vi.spyOn(contextService, 'list').mockResolvedValue({
        items: [ctx],
        continuationToken: undefined,
      });
      const result = await service.assemble(
        { task: 'fix bug', scope: ContextScope.PROJECT },
        tenantId,
        'u1'
      );
      expect(result).toBeDefined();
      expect(result.totalTokens).toBeGreaterThanOrEqual(0);
      expect(mockGetContainer().items.create).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when assemblyId or tenantId is missing', async () => {
      await expect(service.getById('', tenantId)).rejects.toThrow(BadRequestError);
      await expect(service.getById('asm-1', '')).rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError when resource is null', async () => {
      await expect(service.getById('asm-1', tenantId)).rejects.toThrow(NotFoundError);
    });

    it('returns assembly when found', async () => {
      const container = mockGetContainer();
      (container.item as ReturnType<typeof vi.fn>)()
        .read = vi.fn().mockResolvedValue({ resource: mockAssembly });
      const result = await service.getById('asm-1', tenantId);
      expect(result).toEqual(mockAssembly);
    });
  });

  describe('extractTopics', () => {
    it('returns topics filtered by minRelevance', async () => {
      const result = await service.extractTopics(tenantId, {
        content: 'hello world code function business',
        maxTopics: 5,
        minRelevance: 0.3,
      });
      expect(Array.isArray(result)).toBe(true);
      result.forEach((t) => {
        expect(t.name).toBeDefined();
        expect(t.relevanceScore).toBeGreaterThanOrEqual(0.3);
      });
    });

    it('returns empty array when content is empty', async () => {
      const result = await service.extractTopics(tenantId, {
        content: '',
        maxTopics: 5,
      });
      expect(result).toEqual([]);
    });
  });
});

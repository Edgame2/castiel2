/**
 * Unit tests for PromptService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { PromptService } from '../../../src/services/PromptService';
import { PromptStatus } from '../../../src/types/prompt.types';

describe('PromptService', () => {
  let service: PromptService;

  beforeEach(() => {
    service = new PromptService();
  });

  describe('create', () => {
    it('creates a prompt template when slug does not exist', async () => {
      const input = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        slug: 'my-prompt',
        content: 'Hello {{name}}',
      };
      const mockCreate = vi.fn().mockImplementation((doc: any) =>
        Promise.resolve({ resource: { ...doc, id: doc.id || 'prompt-id', version: doc.version ?? 1 } })
      );
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: mockCreate,
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn((id: string, pk: string) => ({
          read: vi.fn().mockResolvedValue({
            resource: { id, tenantId: pk, content: '', variables: [], slug: 'my-prompt', version: 1 },
          }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.create(input);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: input.tenantId,
          slug: input.slug,
          content: input.content,
        }),
        { partitionKey: input.tenantId }
      );
      expect(result.slug).toBe(input.slug);
    });

    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.create({
          tenantId: '',
          userId: 'u1',
          slug: 's',
          content: 'x',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when slug is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          slug: '',
          content: 'x',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when content is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          slug: 's',
          content: undefined as any,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when slug already exists', async () => {
      const existing = {
        id: 'p1',
        tenantId: 't1',
        slug: 'existing',
        content: 'x',
        version: 1,
        status: PromptStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: [existing] }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          slug: 'existing',
          content: 'x',
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when promptId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('p1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns prompt when found', async () => {
      const prompt = {
        id: 'p1',
        tenantId: 't1',
        slug: 's1',
        content: 'x',
        version: 1,
        status: PromptStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: prompt }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.getById('p1', 't1');
      expect(result).toEqual(prompt);
    });

    it('throws NotFoundError when prompt not found', async () => {
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

  describe('getBySlug', () => {
    it('throws BadRequestError when tenantId or slug is missing', async () => {
      await expect(service.getBySlug('', 's')).rejects.toThrow(BadRequestError);
      await expect(service.getBySlug('t1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns prompt when found by slug', async () => {
      const prompt = {
        id: 'p1',
        tenantId: 't1',
        slug: 'my-slug',
        content: 'x',
        version: 1,
        status: PromptStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: [prompt] }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const result = await service.getBySlug('t1', 'my-slug');
      expect(result.slug).toBe('my-slug');
    });
  });

  describe('render', () => {
    it('renders prompt with variable substitution', async () => {
      const prompt = {
        id: 'p1',
        tenantId: 't1',
        slug: 'greet',
        content: 'Hello {{name}}',
        variables: [],
        version: 1,
        status: PromptStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: [prompt] }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const result = await service.render({
        tenantId: 't1',
        slug: 'greet',
        variables: { name: 'World' },
      });
      expect(result).toBe('Hello World');
    });

    it('throws BadRequestError when required variable is missing', async () => {
      const prompt = {
        id: 'p1',
        tenantId: 't1',
        slug: 'greet',
        content: 'Hello {{name}}',
        variables: [{ name: 'name', type: 'string', required: true }],
        version: 1,
        status: PromptStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: [prompt] }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      await expect(
        service.render({
          tenantId: 't1',
          slug: 'greet',
          variables: {},
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getAnalytics', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.getAnalytics('')).rejects.toThrow(BadRequestError);
    });

    it('returns totalPrompts, byStatus, and byCategory from tenant prompts', async () => {
      const resources = [
        { status: 'active', category: 'sales' },
        { status: 'active', category: 'support' },
        { status: 'draft', category: 'sales' },
        { status: undefined, category: undefined },
      ];
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn(),
            fetchAll: vi.fn().mockResolvedValue({ resources }),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const result = await service.getAnalytics('tenant-1');

      expect(result.totalPrompts).toBe(4);
      expect(result.byStatus).toEqual({ active: 2, draft: 2 });
      expect(result.byCategory).toEqual({ sales: 2, support: 1, uncategorized: 1 });
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken', async () => {
      const items = [
        {
          id: 'p1',
          tenantId: 't1',
          slug: 's1',
          content: 'x',
          version: 1,
          status: PromptStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'u1',
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
});

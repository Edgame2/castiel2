/**
 * Template Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared';
import { TemplateService } from '../../../src/services/TemplateService';

describe('TemplateService', () => {
  let service: TemplateService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockItemRead: ReturnType<typeof vi.fn>;
  let mockQueryFetchNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn().mockResolvedValue({ resource: { id: 'tpl-1', tenantId: 't1', content: 'Hello {{name}}', variables: [] } });
    mockItemRead = vi.fn().mockResolvedValue({ resource: null });
    mockQueryFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });
    vi.mocked(getContainer).mockImplementation((name: string) => {
      if (name === 'template_templates') {
        return {
          items: {
            create: mockCreate,
            query: vi.fn(() => ({ fetchNext: mockQueryFetchNext })),
          },
          item: vi.fn(() => ({ read: mockItemRead, replace: vi.fn(), delete: vi.fn() })),
        } as any;
      }
      return {
        items: { create: vi.fn().mockResolvedValue({ resource: {} }), query: vi.fn(() => ({ fetchNext: vi.fn().mockResolvedValue({ resources: [] }) })) },
        item: vi.fn(() => ({ read: mockItemRead })),
      } as any;
    });
    service = new TemplateService();
  });

  describe('create', () => {
    it('should throw when tenantId missing', async () => {
      await expect(
        service.create({ name: 'T', content: 'x', userId: 'u1' } as any)
      ).rejects.toThrow(/tenantId.*required/);
    });

    it('should throw when name or content missing', async () => {
      await expect(
        service.create({ tenantId: 't1', content: 'x', userId: 'u1' } as any)
      ).rejects.toThrow(/name/);
      await expect(
        service.create({ tenantId: 't1', name: 'T', userId: 'u1' } as any)
      ).rejects.toThrow(/content/);
    });

    it('should create and return template', async () => {
      const created = { id: 'tpl-1', tenantId: 't1', name: 'T', content: 'Hello', variables: [] };
      mockCreate.mockResolvedValueOnce({ resource: created });
      mockItemRead.mockResolvedValueOnce({ resource: created });
      const input = { tenantId: 't1', name: 'T', content: 'Hello', userId: 'u1' };
      const result = await service.create(input);
      expect(mockCreate).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('tpl-1');
    });
  });

  describe('getById', () => {
    it('should throw when templateId or tenantId missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(/required/);
      await expect(service.getById('id', '')).rejects.toThrow(/required/);
    });

    it('should throw when not found', async () => {
      await expect(service.getById('id', 't1')).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('should throw when tenantId missing', async () => {
      await expect(service.list('')).rejects.toThrow(/tenantId is required/);
    });

    it('should return items', async () => {
      mockQueryFetchNext.mockResolvedValue({ resources: [], continuationToken: undefined });
      const result = await service.list('t1');
      expect(result.items).toEqual([]);
    });
  });

  describe('render', () => {
    it('should throw when template not found', async () => {
      await expect(service.render({ tenantId: 't1', templateId: 'id', variables: {} })).rejects.toThrow();
    });

    it('should render template with variables when template found', async () => {
      const template = { id: 't1', tenantId: 't1', content: 'Hello {{name}}', variables: [{ name: 'name', required: true }] };
      mockItemRead.mockResolvedValue({ resource: template });
      const result = await service.render({ tenantId: 't1', templateId: 't1', variables: { name: 'World' } });
      expect(result).toBe('Hello World');
    });
  });
});

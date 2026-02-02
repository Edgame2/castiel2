/**
 * TemplateService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateService } from '../../../src/services/TemplateService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  TemplateStatus,
  TemplateType,
} from '../../../src/types/template.types';

describe('TemplateService', () => {
  let service: TemplateService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseTemplate = {
    id: 't1',
    tenantId: 'tenant1',
    name: 'Test Template',
    content: 'Hello {{name}}',
    type: TemplateType.CODE,
    version: 1,
    status: TemplateStatus.DRAFT,
    isDefault: true,
    variables: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'u1',
  };

  const createInput = {
    tenantId: 'tenant1',
    userId: 'u1',
    name: 'Test Template',
    content: 'Hello {{name}}',
    type: TemplateType.CODE,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn();
    mockRead = vi.fn().mockResolvedValue({ resource: null });
    mockReplace = vi.fn();
    mockDelete = vi.fn();
    mockFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: mockCreate,
        query: vi.fn(() => ({ fetchNext: mockFetchNext })),
      },
      item: vi.fn(() => ({ read: mockRead, replace: mockReplace, delete: mockDelete })),
    } as unknown as ReturnType<typeof getContainer>);
    service = new TemplateService();
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId, name, or content is missing', async () => {
      await expect(
        service.create({ ...createInput, tenantId: '' })
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.create({ ...createInput, name: '' })
      ).rejects.toThrow(/tenantId, name, and content are required/);
      await expect(
        service.create({ ...createInput, content: '' })
      ).rejects.toThrow(BadRequestError);
    });

    it('creates template and initial version, returns resource', async () => {
      mockCreate
        .mockResolvedValueOnce({ resource: baseTemplate })
        .mockResolvedValueOnce({ resource: { id: 'v1', templateId: 't1', version: 1 } });
      mockRead.mockResolvedValue({ resource: baseTemplate });
      mockFetchNext.mockResolvedValue({ resources: [] });
      const result = await service.create(createInput);
      expect(result.tenantId).toBe('tenant1');
      expect(result.name).toBe('Test Template');
      expect(result.status).toBe(TemplateStatus.DRAFT);
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockCreate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          tenantId: 'tenant1',
          name: 'Test Template',
          content: 'Hello {{name}}',
          type: TemplateType.CODE,
        }),
        { partitionKey: 'tenant1' }
      );
    });

    it('throws when create returns no resource', async () => {
      mockCreate.mockResolvedValue({ resource: null });
      await expect(service.create(createInput)).rejects.toThrow(/Failed to create template/);
    });

    it('throws BadRequestError on 409 conflict', async () => {
      mockCreate.mockRejectedValue({ code: 409 });
      await expect(service.create(createInput)).rejects.toThrow(/already exists/);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when templateId or tenantId is missing', async () => {
      await expect(service.getById('', 'tenant1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('t1', '')).rejects.toThrow(/templateId and tenantId are required/);
    });

    it('returns template when found', async () => {
      mockRead.mockResolvedValue({ resource: baseTemplate });
      const result = await service.getById('t1', 'tenant1');
      expect(result).toEqual(baseTemplate);
      expect(mockRead).toHaveBeenCalled();
    });

    it('throws NotFoundError when resource is null', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('t1', 'tenant1')).rejects.toThrow(NotFoundError);
      await expect(service.getById('t1', 'tenant1')).rejects.toThrow(/not found/);
    });

    it('throws NotFoundError on 404', async () => {
      mockRead.mockRejectedValue({ code: 404 });
      await expect(service.getById('t1', 'tenant1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates template and returns resource', async () => {
      const existing = { ...baseTemplate };
      const updated = { ...existing, name: 'Updated', updatedAt: new Date() };
      mockRead.mockResolvedValue({ resource: existing });
      mockFetchNext.mockResolvedValue({ resources: [{ version: 1 }] });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.update('t1', 'tenant1', 'u1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
      expect(mockReplace).toHaveBeenCalled();
    });

    it('throws NotFoundError on 404 from replace', async () => {
      mockRead.mockResolvedValue({ resource: baseTemplate });
      mockFetchNext.mockResolvedValue({ resources: [] });
      mockReplace.mockRejectedValue({ code: 404 });
      await expect(service.update('t1', 'tenant1', 'u1', { name: 'x' })).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('delete', () => {
    it('deletes template after getById', async () => {
      mockRead.mockResolvedValue({ resource: baseTemplate });
      await service.delete('t1', 'tenant1');
      expect(mockRead).toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken', async () => {
      const items = [baseTemplate];
      mockFetchNext.mockResolvedValue({ resources: items, continuationToken: 'token1' });
      const result = await service.list('tenant1');
      expect(result.items).toEqual(items);
      expect(result.continuationToken).toBe('token1');
    });

    it('throws on list failure', async () => {
      mockFetchNext.mockRejectedValue(new Error('db error'));
      await expect(service.list('tenant1')).rejects.toThrow(/Failed to list templates/);
    });
  });

  describe('render', () => {
    it('renders template with variable substitution', async () => {
      mockRead.mockResolvedValue({ resource: baseTemplate });
      const result = await service.render({
        tenantId: 'tenant1',
        templateId: 't1',
        variables: { name: 'World' },
      });
      expect(result).toBe('Hello World');
    });

    it('throws when required variable is missing', async () => {
      mockRead.mockResolvedValue({
        resource: {
          ...baseTemplate,
          content: 'Hello {{name}}',
          variables: [{ name: 'name', type: 'string', required: true }],
        },
      });
      await expect(
        service.render({ tenantId: 'tenant1', templateId: 't1', variables: {} })
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.render({ tenantId: 'tenant1', templateId: 't1', variables: {} })
      ).rejects.toThrow(/required variable .* is missing|Variable .* is missing/i);
    });

    it('does not throw when required variable has defaultValue', async () => {
      mockRead.mockResolvedValue({
        resource: {
          ...baseTemplate,
          content: 'Hello {{name}}',
          variables: [
            { name: 'name', type: 'string', required: true, defaultValue: 'Default' },
          ],
        },
      });
      const result = await service.render({
        tenantId: 'tenant1',
        templateId: 't1',
        variables: {},
      });
      expect(result).toBe('Hello {{name}}');
    });
  });

  describe('createVersion', () => {
    it('creates version and returns resource', async () => {
      mockRead
        .mockResolvedValueOnce({ resource: baseTemplate })
        .mockResolvedValueOnce({ resource: baseTemplate });
      mockFetchNext.mockResolvedValue({ resources: [] });
      mockCreate.mockResolvedValue({
        resource: {
          id: 'v1',
          tenantId: 'tenant1',
          templateId: 't1',
          version: 1,
          content: 'content',
          createdAt: new Date(),
          createdBy: 'u1',
        },
      });
      const result = await service.createVersion('tenant1', 't1', 'u1', {
        content: 'content',
      });
      expect(result.templateId).toBe('t1');
      expect(result.version).toBe(1);
      expect(result.content).toBe('content');
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe('getVersion', () => {
    it('returns version when found', async () => {
      const version = {
        id: 'v1',
        tenantId: 'tenant1',
        templateId: 't1',
        version: 1,
        content: 'content',
        createdAt: new Date(),
        createdBy: 'u1',
      };
      mockFetchNext.mockResolvedValue({ resources: [version] });
      const result = await service.getVersion('tenant1', 't1', 1);
      expect(result).toEqual(version);
    });

    it('throws NotFoundError when version not found', async () => {
      mockFetchNext.mockResolvedValue({ resources: [] });
      await expect(service.getVersion('tenant1', 't1', 1)).rejects.toThrow(
        NotFoundError
      );
      await expect(service.getVersion('tenant1', 't1', 1)).rejects.toThrow(
        /Template version .* not found/
      );
    });
  });

  describe('getVersions', () => {
    it('returns versions for template', async () => {
      const versions = [
        {
          id: 'v1',
          tenantId: 'tenant1',
          templateId: 't1',
          version: 2,
          content: 'c2',
          createdAt: new Date(),
          createdBy: 'u1',
        },
        {
          id: 'v0',
          tenantId: 'tenant1',
          templateId: 't1',
          version: 1,
          content: 'c1',
          createdAt: new Date(),
          createdBy: 'u1',
        },
      ];
      mockFetchNext.mockResolvedValue({ resources: versions });
      const result = await service.getVersions('tenant1', 't1');
      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2);
      expect(result[1].version).toBe(1);
    });
  });
});

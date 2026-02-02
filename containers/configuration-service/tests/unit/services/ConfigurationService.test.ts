/**
 * ConfigurationService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigurationService } from '../../../src/services/ConfigurationService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ConfigurationScope, ConfigurationValueType } from '../../../src/types/configuration.types';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseCreateInput = {
    tenantId: 't1',
    userId: 'u1',
    key: 'app.timeout',
    value: 30,
    scope: ConfigurationScope.GLOBAL,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn();
    mockRead = vi.fn().mockResolvedValue({ resource: null });
    mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
    mockDelete = vi.fn().mockResolvedValue(undefined);
    mockFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: mockCreate,
        query: vi.fn(() => ({ fetchNext: mockFetchNext })),
      },
      item: vi.fn(() => ({ read: mockRead, replace: mockReplace, delete: mockDelete })),
    } as unknown as ReturnType<typeof getContainer>);
    service = new ConfigurationService();
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId or key is missing', async () => {
      await expect(service.create({ ...baseCreateInput, tenantId: '' })).rejects.toThrow(BadRequestError);
      await expect(service.create({ ...baseCreateInput, key: '' })).rejects.toThrow(BadRequestError);
    });
    it('throws when key already exists for scope', async () => {
      mockFetchNext.mockResolvedValueOnce({ resources: [{ id: 'existing', key: 'app.timeout' }] });
      await expect(service.create(baseCreateInput)).rejects.toThrow(/already exists/);
    });
    it('creates setting and returns resource', async () => {
      mockFetchNext.mockResolvedValue({ resources: [] });
      const created = {
        id: 's1',
        tenantId: 't1',
        key: 'app.timeout',
        value: 30,
        valueType: ConfigurationValueType.NUMBER,
        scope: ConfigurationScope.GLOBAL,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      mockCreate.mockResolvedValue({ resource: created });
      const result = await service.create(baseCreateInput);
      expect(result.key).toBe('app.timeout');
      expect(result.value).toBe(30);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', key: 'app.timeout', value: 30 }),
        { partitionKey: 't1' }
      );
    });
    it('throws BadRequestError on 409', async () => {
      mockFetchNext.mockResolvedValue({ resources: [] });
      mockCreate.mockRejectedValue({ code: 409 });
      await expect(service.create(baseCreateInput)).rejects.toThrow(/already exists/);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when settingId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('s1', '')).rejects.toThrow(BadRequestError);
    });
    it('returns setting when found', async () => {
      const setting = { id: 's1', tenantId: 't1', key: 'app.timeout', value: 30 };
      mockRead.mockResolvedValue({ resource: setting });
      const result = await service.getById('s1', 't1');
      expect(result.id).toBe('s1');
      expect(result.key).toBe('app.timeout');
    });
    it('throws NotFoundError when not found', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('s1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getByKey', () => {
    it('throws BadRequestError when tenantId or key is missing', async () => {
      await expect(service.getByKey('', 'key')).rejects.toThrow(BadRequestError);
      await expect(service.getByKey('t1', '')).rejects.toThrow(BadRequestError);
    });
    it('returns first resource when found', async () => {
      const setting = { id: 's1', tenantId: 't1', key: 'app.timeout', value: 30 };
      mockFetchNext.mockResolvedValue({ resources: [setting] });
      const result = await service.getByKey('t1', 'app.timeout');
      expect(result.key).toBe('app.timeout');
      expect(result.value).toBe(30);
    });
    it('throws NotFoundError when no resources', async () => {
      mockFetchNext.mockResolvedValue({ resources: [] });
      await expect(service.getByKey('t1', 'missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates and returns resource', async () => {
      const existing = {
        id: 's1',
        tenantId: 't1',
        key: 'app.timeout',
        value: 30,
        valueType: ConfigurationValueType.NUMBER,
        scope: ConfigurationScope.GLOBAL,
        updatedAt: new Date(),
      };
      const updated = { ...existing, value: 60, updatedAt: new Date(), updatedBy: 'u1' };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.update('s1', 't1', 'u1', { value: 60 });
      expect(result.value).toBe(60);
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes when setting exists', async () => {
      mockRead.mockResolvedValue({ resource: { id: 's1', tenantId: 't1' } });
      await expect(service.delete('s1', 't1')).resolves.toBeUndefined();
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });
    it('returns items and continuationToken', async () => {
      const items = [{ id: 's1', tenantId: 't1', key: 'app.timeout', value: 30 }];
      mockFetchNext.mockResolvedValue({ resources: items, continuationToken: 'tok' });
      const result = await service.list('t1', { limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.continuationToken).toBe('tok');
    });
  });
});

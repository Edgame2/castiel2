/**
 * ApiKeyService unit tests
 */

import { createHash } from 'crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { ApiKeyService } from '../../../src/services/ApiKeyService';

vi.mock('@coder/shared/database', () => ({ getContainer: vi.fn() }));
vi.mock('../../../src/config/index.js', () => ({
  loadConfig: vi.fn(() => ({
    cosmos_db: { containers: { api_keys: 'auth_api_keys' } },
  })),
}));
vi.mock('../../../src/utils/logger.js', () => ({ log: { info: vi.fn() } }));

function hashSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

describe('ApiKeyService', () => {
  let mockContainer: {
    item: ReturnType<typeof vi.fn>;
    items: {
      create: ReturnType<typeof vi.fn>;
      query: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const mockItem = {
      read: vi.fn(),
      delete: vi.fn(),
    };
    mockContainer = {
      item: vi.fn(() => mockItem),
      items: {
        create: vi.fn().mockResolvedValue(undefined),
        query: vi.fn().mockReturnValue({ fetchAll: vi.fn().mockResolvedValue({ resources: [] }) }),
      },
    };
    vi.mocked(getContainer).mockReturnValue(mockContainer as any);
  });

  describe('create', () => {
    it('returns key with prefix ak_ and stores doc with userId, tenantId, name, keyHash', async () => {
      const service = new ApiKeyService();
      const result = await service.create('user-1', 'tenant-1', 'My key');

      expect(result.id).toBeDefined();
      expect(result.name).toBe('My key');
      expect(result.key).toMatch(/^ak_[a-f0-9-]+_[a-f0-9]+$/);
      expect(result.createdAt).toBeDefined();
      expect(result.expiresAt).toBeNull();

      expect(mockContainer.items.create).toHaveBeenCalledTimes(1);
      const [doc] = mockContainer.items.create.mock.calls[0];
      expect(doc.userId).toBe('user-1');
      expect(doc.tenantId).toBe('tenant-1');
      expect(doc.name).toBe('My key');
      expect(doc.keyHash).toBeDefined();
      expect(doc.id).toBe(result.id);
      const secret = result.key.slice(`ak_${doc.id}_`.length);
      expect(hashSecret(secret)).toBe(doc.keyHash);
    });

    it('sets expiresAt when expiresInDays provided', async () => {
      const service = new ApiKeyService();
      const result = await service.create('user-1', 't', 'Key', 30);
      expect(result.expiresAt).toBeDefined();
      const [, options] = mockContainer.items.create.mock.calls[0];
      expect(options.partitionKey).toBe(result.id);
      const doc = mockContainer.items.create.mock.calls[0][0];
      expect(doc.expiresAt).toBe(result.expiresAt);
    });
  });

  describe('validate', () => {
    it('returns null for empty or non-ak_ key', async () => {
      const service = new ApiKeyService();
      expect(await service.validate('')).toBeNull();
      expect(await service.validate('bearer_xxx')).toBeNull();
      expect(await service.validate('ak_')).toBeNull();
      expect(mockContainer.item().read).not.toHaveBeenCalled();
    });

    it('returns null when key format missing secret part', async () => {
      const service = new ApiKeyService();
      expect(await service.validate('ak_idonly')).toBeNull();
      expect(mockContainer.item().read).not.toHaveBeenCalled();
    });

    it('returns userId and tenantId when key and hash match', async () => {
      const id = 'key-123';
      const secret = 'testsecret';
      const keyHash = hashSecret(secret);
      mockContainer.item().read.mockResolvedValueOnce({
        resource: {
          id,
          userId: 'u1',
          tenantId: 't1',
          name: 'Test',
          keyHash,
          createdAt: new Date().toISOString(),
          expiresAt: null,
        },
      });
      const service = new ApiKeyService();
      const result = await service.validate(`ak_${id}_${secret}`);
      expect(result).toEqual({ userId: 'u1', tenantId: 't1' });
      expect(mockContainer.item).toHaveBeenCalledWith(id, id);
    });

    it('returns null when secret hash does not match', async () => {
      mockContainer.item().read.mockResolvedValueOnce({
        resource: {
          id: 'key-1',
          userId: 'u1',
          tenantId: 't1',
          name: 'Test',
          keyHash: hashSecret('other'),
          createdAt: new Date().toISOString(),
          expiresAt: null,
        },
      });
      const service = new ApiKeyService();
      const result = await service.validate('ak_key-1_testsecret');
      expect(result).toBeNull();
    });

    it('returns null when doc is expired', async () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      mockContainer.item().read.mockResolvedValueOnce({
        resource: {
          id: 'key-1',
          userId: 'u1',
          tenantId: 't1',
          name: 'Test',
          keyHash: hashSecret('s'),
          createdAt: past,
          expiresAt: past,
        },
      });
      const service = new ApiKeyService();
      const result = await service.validate('ak_key-1_s');
      expect(result).toBeNull();
    });

    it('returns null when doc not found', async () => {
      mockContainer.item().read.mockResolvedValueOnce({ resource: null });
      const service = new ApiKeyService();
      const result = await service.validate('ak_key-1_anysecret');
      expect(result).toBeNull();
    });

    it('returns null when read throws', async () => {
      mockContainer.item().read.mockRejectedValueOnce(new Error('Cosmos error'));
      const service = new ApiKeyService();
      const result = await service.validate('ak_key-1_anysecret');
      expect(result).toBeNull();
    });
  });

  describe('listByUser', () => {
    it('returns keys from query resources', async () => {
      const resources = [
        { id: 'k1', name: 'Key 1', createdAt: '2025-01-01T00:00:00Z', expiresAt: null },
        { id: 'k2', name: 'Key 2', createdAt: '2025-01-02T00:00:00Z', expiresAt: '2025-12-31T00:00:00Z' },
      ];
      mockContainer.items.query.mockReturnValueOnce({
        fetchAll: vi.fn().mockResolvedValue({ resources }),
      });
      const service = new ApiKeyService();
      const result = await service.listByUser('user-1');
      expect(result).toEqual(resources);
      expect(mockContainer.items.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('c.userId = @userId'),
          parameters: [{ name: '@userId', value: 'user-1' }],
        }),
        expect.objectContaining({ enableCrossPartitionQuery: true })
      );
    });

    it('returns empty array when no resources', async () => {
      mockContainer.items.query.mockReturnValueOnce({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      });
      const service = new ApiKeyService();
      const result = await service.listByUser('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('revoke', () => {
    it('returns true and calls delete when doc belongs to user', async () => {
      const mockItem = mockContainer.item();
      mockItem.read.mockResolvedValueOnce({
        resource: { id: 'key-1', userId: 'user-1', tenantId: 't1', name: 'K', keyHash: 'h', createdAt: '', expiresAt: null },
      });
      mockItem.delete.mockResolvedValueOnce(undefined);
      const service = new ApiKeyService();
      const result = await service.revoke('key-1', 'user-1');
      expect(result).toBe(true);
      expect(mockContainer.item).toHaveBeenCalledWith('key-1', 'key-1');
      expect(mockItem.delete).toHaveBeenCalled();
    });

    it('returns false when doc belongs to different user', async () => {
      const mockItem = mockContainer.item();
      mockItem.read.mockResolvedValueOnce({
        resource: { id: 'key-1', userId: 'other-user', tenantId: 't1', name: 'K', keyHash: 'h', createdAt: '', expiresAt: null },
      });
      const service = new ApiKeyService();
      const result = await service.revoke('key-1', 'user-1');
      expect(result).toBe(false);
      expect(mockItem.delete).not.toHaveBeenCalled();
    });

    it('returns false when doc not found', async () => {
      const mockItem = mockContainer.item();
      mockItem.read.mockResolvedValueOnce({ resource: null });
      const service = new ApiKeyService();
      const result = await service.revoke('key-1', 'user-1');
      expect(result).toBe(false);
      expect(mockItem.delete).not.toHaveBeenCalled();
    });

    it('returns false when read throws', async () => {
      const mockItem = mockContainer.item();
      mockItem.read.mockRejectedValueOnce(new Error('Cosmos error'));
      const service = new ApiKeyService();
      const result = await service.revoke('key-1', 'user-1');
      expect(result).toBe(false);
    });
  });
});

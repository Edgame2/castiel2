/**
 * CacheService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheService } from '../../../src/services/CacheService';
import { getRedisClient } from '@coder/shared/cache';
import { getContainer } from '@coder/shared/database';
import { BadRequestError } from '@coder/shared/utils/errors';

const createMockRedis = () => ({
  set: vi.fn().mockResolvedValue(undefined),
  setEx: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  keys: vi.fn().mockResolvedValue([]),
  ping: vi.fn().mockResolvedValue('PONG'),
  info: vi.fn().mockResolvedValue('used_memory:1024\nmaxmemory:2048'),
});

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = createMockRedis();
    vi.mocked(getRedisClient).mockReturnValue({
      getClient: vi.fn().mockResolvedValue(mockRedis),
    });
    service = new CacheService();
  });

  describe('set', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.set({ tenantId: '', key: 'k', value: 'v' })
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.set({ tenantId: undefined as unknown as string, key: 'k', value: 'v' })
      ).rejects.toThrow(/tenantId and key are required/);
    });

    it('throws BadRequestError when key is missing', async () => {
      await expect(
        service.set({ tenantId: 't1', key: '', value: 'v' })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws when Redis client is not available', async () => {
      vi.mocked(getRedisClient).mockReturnValue({
        getClient: vi.fn().mockResolvedValue(null),
      });
      service = new CacheService();
      await expect(
        service.set({ tenantId: 't1', key: 'k', value: 'v' })
      ).rejects.toThrow(/Redis client not available/);
    });

    it('sets entry without TTL and returns CacheEntry', async () => {
      const result = await service.set({
        tenantId: 't1',
        key: 'mykey',
        value: { foo: 'bar' },
      });
      expect(result.key).toBe('tenant:t1:mykey');
      expect(result.value).toEqual({ foo: 'bar' });
      expect(result.tenantId).toBe('t1');
      expect(mockRedis.set).toHaveBeenCalledWith('tenant:t1:mykey', JSON.stringify({ foo: 'bar' }));
      expect(mockRedis.setEx).not.toHaveBeenCalled();
    });

    it('sets entry with TTL and namespace', async () => {
      const result = await service.set({
        tenantId: 't1',
        key: 'k',
        value: 'v',
        ttl: 60,
        namespace: 'ns1',
      });
      expect(result.key).toBe('tenant:t1:ns1:k');
      expect(result.ttl).toBe(60);
      expect(result.namespace).toBe('ns1');
      expect(mockRedis.setEx).toHaveBeenCalledWith('tenant:t1:ns1:k', 60, JSON.stringify('v'));
    });

    it('throws on Redis set failure', async () => {
      mockRedis.set.mockRejectedValueOnce(new Error('redis down'));
      await expect(
        service.set({ tenantId: 't1', key: 'k', value: 'v' })
      ).rejects.toThrow(/Failed to set cache entry/);
    });
  });

  describe('get', () => {
    it('throws BadRequestError when tenantId or key is missing', async () => {
      await expect(service.get({ tenantId: '', key: 'k' })).rejects.toThrow(BadRequestError);
      await expect(service.get({ tenantId: 't1', key: '' })).rejects.toThrow(BadRequestError);
    });

    it('returns null on miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await service.get({ tenantId: 't1', key: 'k' });
      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith('tenant:t1:k');
    });

    it('returns parsed value on hit', async () => {
      const value = { a: 1 };
      mockRedis.get.mockResolvedValue(JSON.stringify(value));
      const result = await service.get<{ a: number }>({ tenantId: 't1', key: 'k' });
      expect(result).toEqual(value);
    });

    it('throws when Redis get fails', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('get failed'));
      await expect(service.get({ tenantId: 't1', key: 'k' })).rejects.toThrow(
        /Failed to get cache entry/
      );
    });
  });

  describe('delete', () => {
    it('throws BadRequestError when tenantId or key is missing', async () => {
      await expect(service.delete({ tenantId: '', key: 'k' })).rejects.toThrow(BadRequestError);
      await expect(service.delete({ tenantId: 't1', key: '' })).rejects.toThrow(BadRequestError);
    });

    it('deletes entry', async () => {
      await service.delete({ tenantId: 't1', key: 'k' });
      expect(mockRedis.del).toHaveBeenCalledWith('tenant:t1:k');
    });

    it('throws on Redis del failure', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('del failed'));
      await expect(service.delete({ tenantId: 't1', key: 'k' })).rejects.toThrow(
        /Failed to delete cache entry/
      );
    });
  });

  describe('invalidatePattern', () => {
    it('throws BadRequestError when tenantId or pattern is missing', async () => {
      await expect(
        service.invalidatePattern({ tenantId: '', pattern: '*' })
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.invalidatePattern({ tenantId: 't1', pattern: '' })
      ).rejects.toThrow(BadRequestError);
    });

    it('returns 0 when no keys match', async () => {
      mockRedis.keys.mockResolvedValue([]);
      const count = await service.invalidatePattern({ tenantId: 't1', pattern: 'foo:*' });
      expect(count).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('deletes matching keys and returns count', async () => {
      mockRedis.keys.mockResolvedValue(['tenant:t1:k1', 'tenant:t1:k2']);
      mockRedis.del.mockResolvedValue(2);
      const count = await service.invalidatePattern({ tenantId: 't1', pattern: '*' });
      expect(count).toBe(2);
      expect(mockRedis.keys).toHaveBeenCalledWith('tenant:t1:*');
    });
  });

  describe('clear', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.clear('')).rejects.toThrow(BadRequestError);
    });

    it('invalidates tenant pattern', async () => {
      mockRedis.keys.mockResolvedValue(['tenant:t1:tenant:t1:a']);
      mockRedis.del.mockResolvedValue(1);
      const count = await service.clear('t1');
      expect(count).toBe(1);
      expect(mockRedis.keys).toHaveBeenCalledWith('tenant:t1:tenant:t1:*');
    });

    it('uses namespace in pattern when provided', async () => {
      mockRedis.keys.mockResolvedValue([]);
      await service.clear('t1', 'ns1');
      expect(mockRedis.keys).toHaveBeenCalledWith('tenant:t1:tenant:t1:ns1:*');
    });
  });

  describe('getStats', () => {
    it('returns default stats when none recorded', async () => {
      const stats = await service.getStats('t1');
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.totalKeys).toBeDefined();
    });

    it('includes totalKeys from Redis when available', async () => {
      mockRedis.keys.mockResolvedValue(['k1', 'k2']);
      const stats = await service.getStats('t1');
      expect(stats.totalKeys).toBe(2);
    });
  });

  describe('resetStats', () => {
    it('clears stats for tenant', async () => {
      await service.set({ tenantId: 't1', key: 'k', value: 'v' });
      await service.resetStats('t1');
      const stats = await service.getStats('t1');
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('healthCheck', () => {
    it('returns healthy when Redis is connected', async () => {
      const result = await service.healthCheck();
      expect(result.status).toBe('healthy');
      expect(result.redis.connected).toBe(true);
      expect(result.redis.latency).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('returns unhealthy when Redis client is null', async () => {
      vi.mocked(getRedisClient).mockReturnValue({
        getClient: vi.fn().mockResolvedValue(null),
      });
      service = new CacheService();
      const result = await service.healthCheck();
      expect(result.status).toBe('unhealthy');
      expect(result.redis.connected).toBe(false);
      expect(result.redis.error).toBe('Redis client not initialized');
    });

    it('returns unhealthy when ping throws', async () => {
      mockRedis.ping.mockRejectedValueOnce(new Error('connection refused'));
      const result = await service.healthCheck();
      expect(result.status).toBe('unhealthy');
      expect(result.redis.error).toBeDefined();
    });
  });

  describe('optimize', () => {
    it('returns report with no recommendations when hit rate and keys are normal', async () => {
      await service.set({ tenantId: 't1', key: 'k', value: 'v' });
      const report = await service.optimize('t1');
      expect(report.tenantId).toBe('t1');
      expect(report.recommendations).toEqual([]);
      expect(report.id).toBeDefined();
      expect(report.createdBy).toBe('system');
    });

    it('adds ttl_adjustment recommendation when hit rate is low', async () => {
      await service.get({ tenantId: 't1', key: 'k' });
      await service.get({ tenantId: 't1', key: 'k2' });
      await service.get({ tenantId: 't1', key: 'k3' });
      const report = await service.optimize('t1');
      const ttlRec = report.recommendations.find((r) => r.type === 'ttl_adjustment');
      expect(ttlRec).toBeDefined();
      expect(ttlRec?.priority).toBe('high');
    });

    it('adds key_cleanup recommendation when totalKeys > 10000', async () => {
      mockRedis.keys.mockResolvedValue(Array(10001).fill('x'));
      const report = await service.optimize('t1');
      const cleanupRec = report.recommendations.find((r) => r.type === 'key_cleanup');
      expect(cleanupRec).toBeDefined();
      expect(cleanupRec?.priority).toBe('medium');
    });
  });

  describe('getCacheMetrics', () => {
    it('returns metrics from container', async () => {
      const metrics = [
        {
          id: 'm1',
          tenantId: 't1',
          cacheKey: 'k1',
          hitCount: 1,
          missCount: 0,
          hitRate: 1,
          averageResponseTime: 1,
          lastAccessed: new Date(),
          createdAt: new Date(),
        },
      ];
      const mockFetchNext = vi.fn().mockResolvedValue({ resources: metrics });
      vi.mocked(getContainer).mockReturnValue({
        items: {
          query: vi.fn(() => ({ fetchNext: mockFetchNext })),
        },
        item: vi.fn(),
      } as unknown as ReturnType<typeof getContainer>);
      service = new CacheService();
      const result = await service.getCacheMetrics('t1');
      expect(result).toEqual(metrics);
    });

    it('throws on container query failure', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: {
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockRejectedValue(new Error('cosmos error')),
          })),
        },
        item: vi.fn(),
      } as unknown as ReturnType<typeof getContainer>);
      service = new CacheService();
      await expect(service.getCacheMetrics('t1')).rejects.toThrow(/Failed to get cache metrics/);
    });
  });

  describe('upsertCacheStrategy', () => {
    it('creates new strategy when none exists', async () => {
      const mockCreate = vi.fn().mockResolvedValue(undefined);
      const mockFetchNext = vi.fn().mockResolvedValue({ resources: [] });
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: mockCreate,
          query: vi.fn(() => ({ fetchNext: mockFetchNext })),
        },
        item: vi.fn(),
      } as unknown as ReturnType<typeof getContainer>);
      service = new CacheService();
      const result = await service.upsertCacheStrategy('t1', 'user:*', 300, 1);
      expect(result.tenantId).toBe('t1');
      expect(result.pattern).toBe('user:*');
      expect(result.ttl).toBe(300);
      expect(result.priority).toBe(1);
      expect(mockCreate).toHaveBeenCalled();
    });

    it('updates existing strategy', async () => {
      const existing = {
        id: 's1',
        tenantId: 't1',
        pattern: 'user:*',
        ttl: 100,
        priority: 0,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockReplace = vi.fn().mockResolvedValue(undefined);
      const mockFetchNext = vi.fn().mockResolvedValue({ resources: [existing] });
      const mockItem = vi.fn(() => ({ replace: mockReplace }));
      vi.mocked(getContainer).mockReturnValue({
        items: {
          query: vi.fn(() => ({ fetchNext: mockFetchNext })),
        },
        item: mockItem,
      } as unknown as ReturnType<typeof getContainer>);
      service = new CacheService();
      const result = await service.upsertCacheStrategy('t1', 'user:*', 600, 2);
      expect(result.ttl).toBe(600);
      expect(result.priority).toBe(2);
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('optimizeCache', () => {
    it('returns optimized and freed counts', async () => {
      const mockFetchNext = vi.fn().mockResolvedValue({ resources: [] });
      const mockFetchAll = vi.fn().mockResolvedValue({ resources: [] });
      vi.mocked(getContainer).mockReturnValue({
        items: {
          query: vi.fn((q: unknown, opts?: { partitionKey?: string }) =>
            opts?.partitionKey ? { fetchAll: mockFetchAll } : { fetchNext: mockFetchNext }
          ),
        },
        item: vi.fn(() => ({ replace: vi.fn() })),
      } as unknown as ReturnType<typeof getContainer>);
      service = new CacheService();
      const result = await service.optimizeCache('t1');
      expect(result).toEqual({ optimized: expect.any(Number), freed: expect.any(Number) });
    });

    it('throws on failure', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: {
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockRejectedValue(new Error('db error')),
          })),
        },
        item: vi.fn(),
      } as unknown as ReturnType<typeof getContainer>);
      service = new CacheService();
      await expect(service.optimizeCache('t1')).rejects.toThrow(/Failed to optimize cache/);
    });
  });
});

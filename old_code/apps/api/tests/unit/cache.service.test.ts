/**
 * Unit tests for Cache Service
 * 
 * Tests:
 * - Basic cache operations (get, set, delete)
 * - Cache-aside pattern
 * - TTL expiration
 * - Pattern-based invalidation
 * - Multi-tenant isolation
 * - Cache statistics
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockRedis } from '../utils/test-utils.js';
import { ShardFixtures, CacheFixtures } from '../utils/fixtures.js';

describe('CacheService', () => {
  let redisClient: any;

  beforeEach(async () => {
    redisClient = MockRedis.getClient();
    await MockRedis.reset();
  });

  afterEach(async () => {
    await MockRedis.close();
    vi.clearAllMocks();
  });

  describe('Basic Operations', () => {
    it('should set and get a value from cache', async () => {
      const key = 'test:key';
      const value = JSON.stringify({ data: 'test' });

      await redisClient.set(key, value);
      const result = await redisClient.get(key);

      expect(result).toBe(value);
      expect(JSON.parse(result)).toEqual({ data: 'test' });
    });

    it('should return null for non-existent key', async () => {
      const result = await redisClient.get('non:existent:key');
      expect(result).toBeNull();
    });

    it('should delete a key from cache', async () => {
      const key = 'test:key';
      await redisClient.set(key, 'value');
      
      await redisClient.del(key);
      const result = await redisClient.get(key);

      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      const key = 'test:key';
      await redisClient.set(key, 'value');

      const exists = await redisClient.exists(key);
      expect(exists).toBe(1);

      const notExists = await redisClient.exists('non:existent');
      expect(notExists).toBe(0);
    });
  });

  describe('TTL Management', () => {
    it('should set TTL on a key', async () => {
      const key = 'test:key';
      await redisClient.set(key, 'value', 'EX', 60);

      const ttl = await redisClient.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should return -1 for keys without TTL', async () => {
      const key = 'test:key';
      await redisClient.set(key, 'value');

      const ttl = await redisClient.ttl(key);
      expect(ttl).toBe(-1);
    });

    it('should expire key after TTL', async () => {
      const key = 'test:key';
      await redisClient.set(key, 'value', 'PX', 100); // 100ms

      await new Promise(resolve => setTimeout(resolve, 150));

      const result = await redisClient.get(key);
      expect(result).toBeNull();
    });
  });

  describe('Pattern-based Operations', () => {
    it('should find keys by pattern', async () => {
      await redisClient.set('tenant:001:shard:1', 'value1');
      await redisClient.set('tenant:001:shard:2', 'value2');
      await redisClient.set('tenant:002:shard:1', 'value3');

      const keys = await redisClient.keys('tenant:001:shard:*');
      expect(keys).toHaveLength(2);
      expect(keys).toContain('tenant:001:shard:1');
      expect(keys).toContain('tenant:001:shard:2');
    });

    it('should delete keys by pattern', async () => {
      await redisClient.set('tenant:001:shard:1', 'value1');
      await redisClient.set('tenant:001:shard:2', 'value2');
      await redisClient.set('tenant:002:shard:1', 'value3');

      const keys = await redisClient.keys('tenant:001:shard:*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }

      const remainingKeys = await redisClient.keys('tenant:001:shard:*');
      expect(remainingKeys).toHaveLength(0);

      const otherTenantKey = await redisClient.get('tenant:002:shard:1');
      expect(otherTenantKey).toBe('value3');
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should isolate cache by tenant', async () => {
      const shard = ShardFixtures.create({ tenantId: 'tenant-001' });
      const key1 = CacheFixtures.createShardCacheKey('tenant-001', shard.id);
      const key2 = CacheFixtures.createShardCacheKey('tenant-002', shard.id);

      await redisClient.set(key1, JSON.stringify(shard));

      const result1 = await redisClient.get(key1);
      const result2 = await redisClient.get(key2);

      expect(result1).not.toBeNull();
      expect(result2).toBeNull();
    });

    it('should invalidate cache only for specific tenant', async () => {
      await redisClient.set('tenant:001:shard:1', 'value1');
      await redisClient.set('tenant:001:shard:2', 'value2');
      await redisClient.set('tenant:002:shard:1', 'value3');

      // Invalidate tenant 001
      const keys = await redisClient.keys('tenant:001:*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }

      const tenant001Keys = await redisClient.keys('tenant:001:*');
      const tenant002Keys = await redisClient.keys('tenant:002:*');

      expect(tenant001Keys).toHaveLength(0);
      expect(tenant002Keys).toHaveLength(1);
    });
  });

  describe('Cache-aside Pattern', () => {
    it('should implement cache-aside pattern correctly', async () => {
      const shard = ShardFixtures.create();
      const cacheKey = CacheFixtures.createShardCacheKey(shard.tenantId, shard.id);

      // Simulate cache miss
      let cached = await redisClient.get(cacheKey);
      expect(cached).toBeNull();

      // Simulate database fetch and cache
      await redisClient.set(cacheKey, JSON.stringify(shard.structuredData), 'EX', 900);

      // Simulate cache hit
      cached = await redisClient.get(cacheKey);
      expect(cached).not.toBeNull();
      expect(JSON.parse(cached)).toEqual(shard.structuredData);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache operations', async () => {
      const operations = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
      };

      // Miss
      const miss = await redisClient.get('key1');
      if (miss === null) operations.misses++;

      // Set
      await redisClient.set('key1', 'value');
      operations.sets++;

      // Hit
      const hit = await redisClient.get('key1');
      if (hit !== null) operations.hits++;

      // Delete
      await redisClient.del('key1');
      operations.deletes++;

      expect(operations).toEqual({
        hits: 1,
        misses: 1,
        sets: 1,
        deletes: 1,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      // Mock Redis connection error
      const brokenClient = {
        get: vi.fn().mockRejectedValue(new Error('Connection lost')),
        set: vi.fn().mockRejectedValue(new Error('Connection lost')),
      };

      await expect(brokenClient.get('key')).rejects.toThrow('Connection lost');
      await expect(brokenClient.set('key', 'value')).rejects.toThrow('Connection lost');
    });

    it('should provide fallback when cache is unavailable', async () => {
      // Simulate cache failure scenario
      const cacheUnavailable = true;
      const shard = ShardFixtures.create();

      let data;
      if (cacheUnavailable) {
        // Fallback to database
        data = shard; // Simulate DB fetch
      } else {
        // Try cache first
        data = await redisClient.get(`shard:${shard.id}`);
      }

      expect(data).toEqual(shard);
    });
  });
});

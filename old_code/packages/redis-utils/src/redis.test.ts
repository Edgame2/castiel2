import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RedisConnectionManager, RedisCacheService, RedisPubSubService } from '../src/index.js';

// Mock Redis configuration for testing
const testConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true',
  db: 15, // Use a test database
};

describe('Redis Integration', () => {
  let connectionManager: RedisConnectionManager;
  let cacheService: RedisCacheService;
  let pubSubService: RedisPubSubService;

  beforeAll(async () => {
    connectionManager = new RedisConnectionManager(testConfig);
    cacheService = new RedisCacheService(connectionManager);
    pubSubService = new RedisPubSubService(connectionManager);

    // Ensure connected
    await connectionManager.getClient();
  });

  afterAll(async () => {
    await pubSubService.disconnect();
    await connectionManager.disconnect();
  });

  describe('Connection Manager', () => {
    it('should connect to Redis', async () => {
      const client = await connectionManager.getClient();
      expect(client).toBeDefined();
      expect(connectionManager.isConnected()).toBe(true);
    });

    it('should perform health check', async () => {
      const health = await connectionManager.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
      expect(health.latency).toBeDefined();
    });

    it('should return connection status', () => {
      const status = connectionManager.getStatus();
      expect(status).toBe('ready');
    });
  });

  describe('Cache Service', () => {
    const testKey = 'test:key';
    const testValue = { message: 'Hello, Redis!' };

    it('should set and get a value', async () => {
      await cacheService.set(testKey, testValue, 60);
      const retrieved = await cacheService.get(testKey);
      expect(retrieved).toEqual(testValue);
    });

    it('should delete a key', async () => {
      await cacheService.set(testKey, testValue);
      const deleted = await cacheService.delete(testKey);
      expect(deleted).toBe(true);

      const retrieved = await cacheService.get(testKey);
      expect(retrieved).toBeNull();
    });

    it('should check if key exists', async () => {
      await cacheService.set(testKey, testValue);
      const exists = await cacheService.exists(testKey);
      expect(exists).toBe(true);

      await cacheService.delete(testKey);
      const notExists = await cacheService.exists(testKey);
      expect(notExists).toBe(false);
    });

    it('should handle multiple keys', async () => {
      const keys = ['test:1', 'test:2', 'test:3'];
      const values = ['value1', 'value2', 'value3'];

      await cacheService.mset(
        keys.map((key, i) => ({ key, value: values[i], ttl: 60 }))
      );

      const retrieved = await cacheService.mget<string>(keys);
      expect(retrieved).toEqual(values);

      // Cleanup
      for (const key of keys) {
        await cacheService.delete(key);
      }
    });

    it('should increment and decrement counters', async () => {
      const counterKey = 'test:counter';
      
      await cacheService.delete(counterKey);
      const inc1 = await cacheService.increment(counterKey, 5);
      expect(inc1).toBe(5);

      const inc2 = await cacheService.increment(counterKey, 3);
      expect(inc2).toBe(8);

      const dec = await cacheService.decrement(counterKey, 2);
      expect(dec).toBe(6);

      await cacheService.delete(counterKey);
    });

    it('should handle TTL', async () => {
      await cacheService.set(testKey, testValue, 10);
      const ttl = await cacheService.ttl(testKey);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(10);

      await cacheService.delete(testKey);
    });

    it('should delete by pattern', async () => {
      await cacheService.set('pattern:test:1', 'value1');
      await cacheService.set('pattern:test:2', 'value2');
      await cacheService.set('pattern:other:1', 'value3');

      const deleted = await cacheService.deletePattern('pattern:test:*');
      expect(deleted).toBe(2);

      await cacheService.delete('pattern:other:1');
    });

    it('should get cache stats', async () => {
      const stats = await cacheService.getStats();
      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('memory');
    });
  });

  describe('Pub/Sub Service', () => {
    it('should initialize pub/sub', async () => {
      await pubSubService.initialize();
      expect(pubSubService.getSubscriptions()).toEqual([]);
    });

    it('should subscribe and receive messages', async () => {
      return new Promise<void>(async (resolve) => {
        const channel = 'test:channel';
        const message = 'test message';

        const handler = (ch: string, msg: string) => {
          expect(ch).toBe(channel);
          expect(msg).toBe(message);
          resolve();
        };

        await pubSubService.subscribe(channel, handler);
        await pubSubService.publish(channel, message);

        // Cleanup
        setTimeout(async () => {
          await pubSubService.unsubscribe(channel);
        }, 100);
      });
    });

    it('should handle pattern subscriptions', async () => {
      return new Promise<void>(async (resolve) => {
        const pattern = 'test:*';
        const channel = 'test:pattern:message';
        const message = 'pattern test';

        const handler = (ch: string, msg: string) => {
          if (ch === channel) {
            expect(msg).toBe(message);
            resolve();
          }
        };

        await pubSubService.subscribe(pattern, handler);
        await pubSubService.publish(channel, message);

        // Cleanup
        setTimeout(async () => {
          await pubSubService.unsubscribe(pattern);
        }, 100);
      });
    });

    it('should publish cache invalidation', async () => {
      await pubSubService.invalidate('tenant123', 'shard', 'shard456');
      // If no error, it's successful
    });

    it('should list subscriptions', async () => {
      const channel = 'test:subscription';
      await pubSubService.subscribe(channel, () => {});
      
      const subs = pubSubService.getSubscriptions();
      expect(subs).toContain(channel);

      await pubSubService.unsubscribe(channel);
    });
  });
});

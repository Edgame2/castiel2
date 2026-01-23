/**
 * Hierarchical Memory Service Tests
 * Tests for multi-tiered memory system
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HierarchicalMemoryService } from '../../../src/services/hierarchical-memory.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';

// Mock dependencies
const mockMonitoring: IMonitoringProvider = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  trackMetric: vi.fn(),
  trackTrace: vi.fn(),
} as any;

const mockCosmosClient = {
  database: vi.fn().mockReturnValue({
    container: vi.fn().mockReturnValue({
      items: {
        query: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
      },
      item: vi.fn().mockReturnValue({
        read: vi.fn(),
        replace: vi.fn(),
      }),
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  lpush: vi.fn(),
  lrange: vi.fn(),
} as unknown as Redis;

describe('HierarchicalMemoryService', () => {
  let service: HierarchicalMemoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new HierarchicalMemoryService(mockCosmosClient, mockRedis, mockMonitoring);
  });

  describe('storeMemory', () => {
    it('should store memory in immediate tier', async () => {
      const tenantId = 'tenant-1';
      const tier = 'immediate';
      const content = { key: 'value' };
      const contextKey = 'context-1';
      const tags = ['tag1', 'tag2'];

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'memory-1',
          tenantId,
          tier,
          content,
          contextKey,
          tags,
        },
      });

      const result = await service.storeMemory(tenantId, tier, content, contextKey, tags);

      expect(result).toBeDefined();
      expect(result.tier).toBe(tier);
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalled(); // Should cache
    });

    it('should store memory in global tier with longer TTL', async () => {
      const tenantId = 'tenant-1';
      const tier = 'global';
      const content = { key: 'value' };
      const contextKey = 'context-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'memory-1',
          tenantId,
          tier,
          content,
          contextKey,
        },
      });

      await service.storeMemory(tenantId, tier, content, contextKey);

      expect(mockContainer.items.create).toHaveBeenCalled();
    });
  });

  describe('retrieveMemory', () => {
    it('should retrieve from cache first', async () => {
      const tenantId = 'tenant-1';
      const contextKey = 'context-1';
      const limit = 10;

      const cachedMemories = [
        { id: 'memory-1', relevanceScore: 0.9 },
        { id: 'memory-2', relevanceScore: 0.8 },
      ];

      (mockRedis.get as any).mockResolvedValue(JSON.stringify(cachedMemories));

      const result = await service.retrieveMemory(tenantId, contextKey, undefined, limit);

      expect(result.records).toEqual(cachedMemories);
      expect(mockRedis.get).toHaveBeenCalled();
    });

    it('should fall back to Cosmos when cache miss', async () => {
      const tenantId = 'tenant-1';
      const contextKey = 'context-1';
      const limit = 10;

      (mockRedis.get as any).mockResolvedValue(null);
      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            { id: 'memory-1', relevanceScore: 0.9 },
            { id: 'memory-2', relevanceScore: 0.8 },
          ],
        }),
      });

      const result = await service.retrieveMemory(tenantId, contextKey, undefined, limit);

      expect(result.records).toBeDefined();
      expect(result.records.length).toBeGreaterThan(0);
      expect(mockRedis.setex).toHaveBeenCalled(); // Should cache result
    });

    it('should filter by tier when specified', async () => {
      const tenantId = 'tenant-1';
      const tier = 'session';
      const limit = 10;

      (mockRedis.get as any).mockResolvedValue(null);
      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [{ id: 'memory-1', tier, relevanceScore: 0.9 }],
        }),
      });

      const result = await service.retrieveMemory(tenantId, undefined, tier, limit);

      expect(result.tier).toBe(tier);
    });
  });

  describe('updateAccess', () => {
    it('should update access count and timestamp', async () => {
      const memory = {
        id: 'memory-1',
        tenantId: 'tenant-1',
        accessCount: 5,
        accessedAt: new Date('2024-01-01'),
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      const mockItem = mockContainer.item();
      (mockItem.read as any).mockResolvedValue({ resource: memory });
      (mockItem.replace as any).mockResolvedValue({ resource: { ...memory, accessCount: 6 } });

      await service.updateAccess(memory);

      expect(mockItem.replace).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });
  });

  describe('archiveMemory', () => {
    it('should move memory to archive', async () => {
      const memory = {
        id: 'memory-1',
        tenantId: 'tenant-1',
        tier: 'immediate',
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      const mockItem = mockContainer.item();
      (mockItem.read as any).mockResolvedValue({ resource: memory });
      (mockItem.replace as any).mockResolvedValue({
        resource: { ...memory, archivedAt: new Date() },
      });

      await service.archiveMemory(memory);

      expect(mockItem.replace).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled(); // Should invalidate cache
    });
  });
});

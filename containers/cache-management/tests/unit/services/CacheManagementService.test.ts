/**
 * Cache Management Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheManagementService } from '../../../src/services/CacheManagementService';
import { getContainer } from '@coder/shared/database';

const { mockCacheServiceClient } = vi.hoisted(() => ({
  mockCacheServiceClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: any) {
    return mockCacheServiceClient;
  }),
}));
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      cache_service: { url: 'http://cache-service:3000' },
      embeddings: { url: 'http://embeddings:3000' },
    },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('CacheManagementService', () => {
  let service: CacheManagementService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CacheManagementService();
  });

  describe('getCacheMetrics', () => {
    it('should retrieve cache metrics successfully', async () => {
      const tenantId = 'tenant-123';
      const mockResources = [
        {
          id: 'm1',
          tenantId,
          cacheKey: 'k1',
          hitCount: 10,
          missCount: 2,
          hitRate: 0.83,
          averageResponseTime: 1,
          lastAccessed: new Date(),
          createdAt: new Date(),
        },
      ];
      const mockContainer = {
        items: {
          query: vi.fn().mockReturnValue({
            fetchNext: vi.fn().mockResolvedValue({ resources: mockResources }),
          }),
        },
      };
      (getContainer as any).mockReturnValue(mockContainer);

      const result = await service.getCacheMetrics(tenantId);

      expect(result).toEqual(mockResources);
      expect(getContainer).toHaveBeenCalledWith('cache_metrics');
    });
  });

  describe('optimizeCache', () => {
    it('should optimize cache successfully', async () => {
      const tenantId = 'tenant-123';
      const mockMetrics = [
        {
          id: 'm1',
          tenantId,
          cacheKey: 'k1',
          hitCount: 1,
          missCount: 9,
          hitRate: 0.1,
          averageResponseTime: 100,
          lastAccessed: new Date(),
          createdAt: new Date(),
        },
      ];
      const metricsContainer = {
        items: {
          query: vi.fn().mockReturnValue({
            fetchNext: vi.fn().mockResolvedValue({ resources: mockMetrics }),
          }),
        },
      };
      const strategiesContainer = {
        items: {
          query: vi.fn().mockReturnValue({
            fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
          }),
        },
        item: vi.fn().mockReturnValue({ replace: vi.fn().mockResolvedValue({}) }),
      };
      (getContainer as any).mockImplementation((name: string) =>
        name === 'cache_metrics' ? metricsContainer : strategiesContainer
      );

      const result = await service.optimizeCache(tenantId);

      expect(result).toHaveProperty('optimized');
      expect(result).toHaveProperty('freed');
    });
  });
});

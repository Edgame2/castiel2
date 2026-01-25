/**
 * Cache Management Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheManagementService } from '../../../src/services/CacheManagementService';
import { ServiceClient } from '@coder/shared';

// Mock dependencies
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      cache_service: { url: 'http://cache-service:3000' },
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
  let mockCacheServiceClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCacheServiceClient = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    };

    (ServiceClient as any).mockImplementation(() => mockCacheServiceClient);

    service = new CacheManagementService();
  });

  describe('getCacheMetrics', () => {
    it('should retrieve cache metrics successfully', async () => {
      const tenantId = 'tenant-123';

      const mockMetrics = {
        hitRate: 0.85,
        missRate: 0.15,
        totalRequests: 1000,
        totalHits: 850,
        totalMisses: 150,
      };

      mockCacheServiceClient.get.mockResolvedValue(mockMetrics);

      const result = await service.getCacheMetrics(tenantId);

      expect(result).toEqual(mockMetrics);
      expect(mockCacheServiceClient.get).toHaveBeenCalled();
    });
  });

  describe('optimizeCache', () => {
    it('should optimize cache successfully', async () => {
      const tenantId = 'tenant-123';
      const strategy = 'lru' as const;

      const mockOptimization = {
        strategy,
        evictedKeys: 50,
        remainingKeys: 950,
        memorySaved: 1024 * 1024, // 1MB
      };

      mockCacheServiceClient.post.mockResolvedValue(mockOptimization);

      const result = await service.optimizeCache(tenantId, strategy);

      expect(result).toEqual(mockOptimization);
      expect(mockCacheServiceClient.post).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear cache successfully', async () => {
      const tenantId = 'tenant-123';
      const pattern = 'user:*';

      mockCacheServiceClient.delete.mockResolvedValue({
        clearedKeys: 100,
      });

      const result = await service.clearCache(tenantId, pattern);

      expect(result).toHaveProperty('clearedKeys');
      expect(mockCacheServiceClient.delete).toHaveBeenCalled();
    });
  });
});

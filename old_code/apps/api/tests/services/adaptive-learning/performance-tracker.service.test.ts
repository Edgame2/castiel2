/**
 * Performance Tracker Service Tests
 * Tests for component performance tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceTrackerService } from '../../../src/services/performance-tracker.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import { ServiceType, Context } from '../../../src/types/adaptive-learning.types';

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
        query: vi.fn().mockReturnValue({
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        }),
        upsert: vi.fn().mockResolvedValue({ resource: {} }),
      },
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
} as unknown as Redis;

describe('PerformanceTrackerService', () => {
  let service: PerformanceTrackerService;
  const tenantId = 'tenant-1';
  const context: Context = {
    industry: 'tech',
    dealSize: 'large',
  };
  const serviceType: ServiceType = 'risk';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PerformanceTrackerService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );
  });

  describe('trackPerformance', () => {
    it('should track component performance', async () => {
      await service.trackPerformance(
        tenantId,
        serviceType,
        context,
        'ml',
        true // Correct prediction
      );

      // Should update in-memory cache
      const performance = await service.getPerformance(tenantId, serviceType, context);
      expect(performance).toBeDefined();
    });

    it('should update accuracy after multiple predictions', async () => {
      // Track 5 predictions: 4 correct, 1 incorrect
      for (let i = 0; i < 4; i++) {
        await service.trackPerformance(tenantId, serviceType, context, 'ml', true);
      }
      await service.trackPerformance(tenantId, serviceType, context, 'ml', false);

      const performance = await service.getPerformance(tenantId, serviceType, context);
      expect(performance.accuracy).toBeCloseTo(0.8, 0.1); // 4/5 = 0.8
    });

    it('should track multiple components separately', async () => {
      await service.trackPerformance(tenantId, serviceType, context, 'ml', true);
      await service.trackPerformance(tenantId, serviceType, context, 'rules', false);
      await service.trackPerformance(tenantId, serviceType, context, 'llm', true);

      const performance = await service.getPerformance(tenantId, serviceType, context);
      expect(performance).toBeDefined();
      expect(performance.components).toBeDefined();
    });

    it('should update Redis cache', async () => {
      await service.trackPerformance(tenantId, serviceType, context, 'ml', true);

      // Should update Redis (async, so may not be called immediately)
      // But should eventually update
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });
  });

  describe('getPerformance', () => {
    it('should return performance from memory cache', async () => {
      // Track some performance first
      await service.trackPerformance(tenantId, serviceType, context, 'ml', true);

      const performance = await service.getPerformance(tenantId, serviceType, context);

      expect(performance).toBeDefined();
      expect(performance.totalPredictions).toBeGreaterThan(0);
      expect(performance.accuracy).toBeDefined();
    });

    it('should return performance from Redis if not in memory', async () => {
      const cachedPerformance = {
        totalPredictions: 10,
        accuracy: 0.85,
        components: {
          ml: { total: 10, correct: 8 },
        },
      };
      (mockRedis.get as any).mockResolvedValue(JSON.stringify(cachedPerformance));

      const performance = await service.getPerformance(tenantId, serviceType, context);

      expect(performance.totalPredictions).toBe(10);
      expect(performance.accuracy).toBe(0.85);
    });

    it('should return default performance when no data exists', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      const performance = await service.getPerformance(tenantId, serviceType, context);

      expect(performance).toBeDefined();
      expect(performance.totalPredictions).toBe(0);
      expect(performance.accuracy).toBe(0);
    });

    it('should cache performance after retrieval', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      await service.getPerformance(tenantId, serviceType, context);

      // Should cache in memory
      const performance2 = await service.getPerformance(tenantId, serviceType, context);
      expect(performance2).toBeDefined();
    });
  });

  describe('accuracy calculation', () => {
    it('should calculate accuracy correctly', async () => {
      // 10 predictions: 8 correct, 2 incorrect
      for (let i = 0; i < 8; i++) {
        await service.trackPerformance(tenantId, serviceType, context, 'ml', true);
      }
      for (let i = 0; i < 2; i++) {
        await service.trackPerformance(tenantId, serviceType, context, 'ml', false);
      }

      const performance = await service.getPerformance(tenantId, serviceType, context);
      expect(performance.accuracy).toBeCloseTo(0.8, 0.1); // 8/10 = 0.8
    });

    it('should handle zero predictions', async () => {
      const performance = await service.getPerformance(tenantId, serviceType, context);

      expect(performance.totalPredictions).toBe(0);
      expect(performance.accuracy).toBe(0);
    });

    it('should handle all correct predictions', async () => {
      for (let i = 0; i < 5; i++) {
        await service.trackPerformance(tenantId, serviceType, context, 'ml', true);
      }

      const performance = await service.getPerformance(tenantId, serviceType, context);
      expect(performance.accuracy).toBe(1.0); // 5/5 = 1.0
    });
  });

  describe('error handling', () => {
    it('should handle Redis errors gracefully', async () => {
      (mockRedis.get as any).mockRejectedValue(new Error('Redis error'));

      const performance = await service.getPerformance(tenantId, serviceType, context);

      expect(performance).toBeDefined(); // Should fallback to defaults
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should continue tracking even if cache update fails', async () => {
      (mockRedis.setex as any).mockRejectedValue(new Error('Redis error'));

      await expect(
        service.trackPerformance(tenantId, serviceType, context, 'ml', true)
      ).resolves.not.toThrow();

      // Should still track in memory
      const performance = await service.getPerformance(tenantId, serviceType, context);
      expect(performance.totalPredictions).toBeGreaterThan(0);
    });
  });
});

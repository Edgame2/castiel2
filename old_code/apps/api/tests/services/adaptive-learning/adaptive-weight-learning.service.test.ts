/**
 * Adaptive Weight Learning Service Tests
 * Tests for Thompson Sampling weight learning functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdaptiveWeightLearningService } from '../../../src/services/adaptive-weight-learning.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import { ServiceType, Context } from '../../../src/types/adaptive-learning.types';

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
        query: vi.fn().mockReturnValue({
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        }),
        create: vi.fn().mockResolvedValue({ resource: {} }),
        upsert: vi.fn().mockResolvedValue({ resource: {} }),
      },
      item: vi.fn().mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: null }),
      }),
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
} as unknown as Redis;

describe('AdaptiveWeightLearningService', () => {
  let service: AdaptiveWeightLearningService;
  const tenantId = 'tenant-1';
  const contextKey = 'tech:large:proposal';
  const serviceType: ServiceType = 'risk';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdaptiveWeightLearningService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );
  });

  describe('getWeights', () => {
    it('should return default weights when no learning data exists', async () => {
      (mockRedis.get as any).mockResolvedValue(null);
      
      const weights = await service.getWeights(tenantId, contextKey, serviceType);

      expect(weights).toBeDefined();
      expect(weights.ml).toBe(0.9);
      expect(weights.rules).toBe(1.0);
      expect(weights.llm).toBe(0.8);
      expect(weights.historical).toBe(0.9);
    });

    it('should return cached weights when available in Redis', async () => {
      const cachedWeights = {
        ml: 0.95,
        rules: 0.98,
        llm: 0.85,
        historical: 0.92,
      };
      (mockRedis.get as any).mockResolvedValue(JSON.stringify(cachedWeights));

      const weights = await service.getWeights(tenantId, contextKey, serviceType);

      expect(weights).toEqual(cachedWeights);
      expect(mockCosmosClient.database).not.toHaveBeenCalled();
    });

    it('should fallback to defaults on Redis error', async () => {
      (mockRedis.get as any).mockRejectedValue(new Error('Redis error'));

      const weights = await service.getWeights(tenantId, contextKey, serviceType);

      expect(weights).toBeDefined();
      expect(weights.ml).toBe(0.9);
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });

  describe('learnFromOutcome', () => {
    it('should update Thompson Sampling bandit with outcome', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      await service.learnFromOutcome(
        tenantId,
        contextKey,
        serviceType,
        'ml',
        0.8 // Success outcome
      );

      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled(); // Cache invalidation
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should handle negative outcomes correctly', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      await service.learnFromOutcome(
        tenantId,
        contextKey,
        serviceType,
        'ml',
        0.2 // Low outcome (failure)
      );

      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
    });

    it('should update learning rate based on examples', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      // First outcome
      await service.learnFromOutcome(tenantId, contextKey, serviceType, 'ml', 0.8);

      // Second outcome (should have different learning rate)
      await service.learnFromOutcome(tenantId, contextKey, serviceType, 'ml', 0.9);

      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('blendWeights', () => {
    it('should blend learned and default weights based on examples', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      // Bootstrap stage (0-100 examples): 100% default
      const weights1 = await service.getWeights(tenantId, contextKey, serviceType);
      expect(weights1.ml).toBe(0.9); // Default

      // After learning some outcomes
      for (let i = 0; i < 50; i++) {
        await service.learnFromOutcome(tenantId, contextKey, serviceType, 'ml', 0.8);
      }

      // Should still be mostly default in bootstrap stage
      const weights2 = await service.getWeights(tenantId, contextKey, serviceType);
      expect(weights2.ml).toBeCloseTo(0.9, 0.1); // Close to default
    });
  });

  describe('learning curve stages', () => {
    it('should use 100% defaults in bootstrap stage (0-100 examples)', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      const weights = await service.getWeights(tenantId, contextKey, serviceType);
      
      // Should be defaults
      expect(weights.ml).toBe(0.9);
    });

    it('should blend 30% learned in initial stage (100-500 examples)', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      // Simulate 150 examples
      for (let i = 0; i < 150; i++) {
        await service.learnFromOutcome(tenantId, contextKey, serviceType, 'ml', 0.95);
      }

      const weights = await service.getWeights(tenantId, contextKey, serviceType);
      
      // Should be blended (30% learned, 70% default)
      expect(weights.ml).toBeGreaterThan(0.9); // Learned should increase it
      expect(weights.ml).toBeLessThan(0.95); // But not fully learned yet
    });
  });

  describe('error handling', () => {
    it('should handle Cosmos DB errors gracefully', async () => {
      (mockRedis.get as any).mockResolvedValue(null);
      (mockCosmosClient.database().container().items.upsert as any).mockRejectedValue(
        new Error('Cosmos DB error')
      );

      await expect(
        service.learnFromOutcome(tenantId, contextKey, serviceType, 'ml', 0.8)
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should handle invalid context keys', async () => {
      const weights = await service.getWeights(tenantId, '', serviceType);
      
      expect(weights).toBeDefined();
      expect(weights.ml).toBe(0.9); // Should fallback to defaults
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate cache after learning', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      await service.learnFromOutcome(tenantId, contextKey, serviceType, 'ml', 0.8);

      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should cache weights after retrieval', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      await service.getWeights(tenantId, contextKey, serviceType);

      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });
});

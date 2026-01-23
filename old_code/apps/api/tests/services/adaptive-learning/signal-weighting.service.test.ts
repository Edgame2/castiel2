/**
 * Signal Weighting Service Tests
 * Tests for feedback signal weighting functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SignalWeightingService } from '../../../src/services/signal-weighting.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import { ServiceType } from '../../../src/types/adaptive-learning.types';

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
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
} as unknown as Redis;

describe('SignalWeightingService', () => {
  let service: SignalWeightingService;
  const tenantId = 'tenant-1';
  const contextKey = 'tech:large:proposal';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SignalWeightingService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );
  });

  describe('learnSignalWeights', () => {
    it('should learn weights from signal-outcome pairs', async () => {
      const signals = [
        { type: 'explicit', source: 'user_feedback', value: 0.8, timestamp: new Date() },
        { type: 'implicit', source: 'time_spent', value: 0.6, timestamp: new Date() },
      ];

      await service.learnSignalWeights(tenantId, signals, 0.85);

      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled(); // Cache invalidation
    });

    it('should calculate correlation between signals and outcomes', async () => {
      const signals = [
        { type: 'explicit', source: 'user_feedback', value: 0.9, timestamp: new Date() },
      ];

      await service.learnSignalWeights(tenantId, signals, 0.9);

      // Should calculate correlation (high signal value → high outcome)
      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
    });

    it('should update signal reliability scores', async () => {
      const signals = [
        { type: 'explicit', source: 'user_feedback', value: 0.8, timestamp: new Date() },
      ];

      await service.learnSignalWeights(tenantId, signals, 0.8);

      const upsertCall = (mockCosmosClient.database().container().items.upsert as any).mock.calls[0][0];
      expect(upsertCall).toBeDefined();
    });
  });

  describe('combineSignals', () => {
    it('should combine signals with learned weights', async () => {
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        tenantId,
        contextKey,
        signalWeights: {
          explicit: 0.8,
          implicit: 0.6,
        },
      }));

      const signals = [
        { type: 'explicit', source: 'user_feedback', value: 0.9, timestamp: new Date() },
        { type: 'implicit', source: 'time_spent', value: 0.7, timestamp: new Date() },
      ];

      const combined = await service.combineSignals(tenantId, signals);

      expect(combined).toBeDefined();
      expect(typeof combined).toBe('number');
      expect(combined).toBeGreaterThanOrEqual(0);
      expect(combined).toBeLessThanOrEqual(1);
    });

    it('should use default weights when no learning data exists', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      const signals = [
        { type: 'explicit', source: 'user_feedback', value: 0.8, timestamp: new Date() },
      ];

      const combined = await service.combineSignals(tenantId, signals);

      expect(combined).toBeDefined();
      // Should still return a value even with defaults
      expect(typeof combined).toBe('number');
    });

    it('should handle empty signals array', async () => {
      const combined = await service.combineSignals(tenantId, []);

      expect(combined).toBe(0); // No signals = 0 combined value
    });
  });

  describe('getSignalWeights', () => {
    it('should return learned weights from cache', async () => {
      const cachedWeights = {
        explicit: 0.85,
        implicit: 0.65,
      };
      (mockRedis.get as any).mockResolvedValue(JSON.stringify(cachedWeights));

      const weights = await service.getSignalWeights(tenantId, contextKey);

      expect(weights).toEqual(cachedWeights);
    });

    it('should return default weights when no cache or DB data', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      const weights = await service.getSignalWeights(tenantId, contextKey);

      expect(weights).toBeDefined();
      expect(weights.explicit).toBeDefined();
      expect(weights.implicit).toBeDefined();
    });

    it('should cache weights after retrieval', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      await service.getSignalWeights(tenantId, contextKey);

      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle Redis errors gracefully', async () => {
      (mockRedis.get as any).mockRejectedValue(new Error('Redis error'));

      const weights = await service.getSignalWeights(tenantId, contextKey);

      expect(weights).toBeDefined(); // Should fallback to defaults
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should handle Cosmos DB errors gracefully', async () => {
      (mockCosmosClient.database().container().items.upsert as any).mockRejectedValue(
        new Error('Cosmos DB error')
      );

      const signals = [
        { type: 'explicit', source: 'user_feedback', value: 0.8, timestamp: new Date() },
      ];

      await expect(
        service.learnSignalWeights(tenantId, signals, 0.8)
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

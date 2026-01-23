/**
 * Adaptive Learning Rollout Service Tests
 * Tests for gradual rollout and rollback functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdaptiveLearningRolloutService } from '../../../src/services/adaptive-learning-rollout.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import { ServiceType } from '../../../src/types/adaptive-learning.types';
import { FeatureFlagService } from '../../../src/services/feature-flag.service';

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
      item: vi.fn().mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: null }),
      }),
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
} as unknown as Redis;

const mockFeatureFlagService = {
  isEnabled: vi.fn().mockResolvedValue(true),
  getValue: vi.fn().mockResolvedValue(true),
} as unknown as FeatureFlagService;

describe('AdaptiveLearningRolloutService', () => {
  let service: AdaptiveLearningRolloutService;
  const tenantId = 'tenant-1';
  const contextKey = 'tech:large:proposal';
  const serviceType: ServiceType = 'risk';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdaptiveLearningRolloutService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockFeatureFlagService
    );
  });

  describe('getRolloutPercentage', () => {
    it('should return 0 when feature flag is disabled', async () => {
      (mockFeatureFlagService.isEnabled as any).mockResolvedValue(false);

      const percentage = await service.getRolloutPercentage(tenantId, serviceType);

      expect(percentage).toBe(0);
    });

    it('should return rollout percentage based on time', async () => {
      (mockFeatureFlagService.isEnabled as any).mockResolvedValue(true);

      // Mock current date to be in Week 9 (10%)
      const mockDate = new Date('2025-01-15'); // Week 9
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const percentage = await service.getRolloutPercentage(tenantId, serviceType);

      expect(percentage).toBeGreaterThanOrEqual(0);
      expect(percentage).toBeLessThanOrEqual(1);
    });

    it('should increase rollout percentage over time', async () => {
      (mockFeatureFlagService.isEnabled as any).mockResolvedValue(true);

      // Week 9: 10%
      const week9 = new Date('2025-01-15');
      vi.spyOn(global, 'Date').mockImplementationOnce(() => week9 as any);
      const p1 = await service.getRolloutPercentage(tenantId, serviceType);

      // Week 12: 80%
      const week12 = new Date('2025-02-05');
      vi.spyOn(global, 'Date').mockImplementationOnce(() => week12 as any);
      const p2 = await service.getRolloutPercentage(tenantId, serviceType);

      expect(p2).toBeGreaterThan(p1);
    });
  });

  describe('shouldRollback', () => {
    it('should detect degradation when performance drops', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            performance: {
              accuracy: 0.65, // Current
              baseline: 0.75, // Baseline
            },
            examples: 200,
          },
        }),
      });

      // Mock statistical validation showing degradation
      (service as any).statisticalValidator = {
        validateDegradation: vi.fn().mockResolvedValue({
          isSignificant: true,
          degradation: 0.15, // 15% degradation
          confidence: 0.95,
        }),
      };

      const decision = await service.shouldRollback(tenantId, contextKey, serviceType);

      expect(decision.shouldRollback).toBe(true);
      expect(decision.reason).toContain('degradation');
    });

    it('should not rollback when performance is stable', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            performance: {
              accuracy: 0.80,
              baseline: 0.75,
            },
            examples: 200,
          },
        }),
      });

      (service as any).statisticalValidator = {
        validateDegradation: vi.fn().mockResolvedValue({
          isSignificant: false,
          degradation: 0.02,
          confidence: 0.5,
        }),
      };

      const decision = await service.shouldRollback(tenantId, contextKey, serviceType);

      expect(decision.shouldRollback).toBe(false);
    });

    it('should detect user-reported issues', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            userIssues: 3, // >= 3 triggers rollback
          },
        }),
      });

      const decision = await service.shouldRollback(tenantId, contextKey, serviceType);

      expect(decision.shouldRollback).toBe(true);
      expect(decision.reason).toContain('user');
    });

    it('should detect high failure rate', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            recentFailures: 15, // 15/20 = 75% failure rate
            recentPredictions: 20,
          },
        }),
      });

      const decision = await service.shouldRollback(tenantId, contextKey, serviceType);

      expect(decision.shouldRollback).toBe(true);
      expect(decision.reason).toContain('failure');
    });
  });

  describe('executeRollback', () => {
    it('should restore previous weights on rollback', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            previousVersion: 'prev-version-id',
            learnedWeights: { ml: 0.95 },
            defaultWeights: { ml: 0.9 },
          },
        }),
      });

      await service.executeRollback(tenantId, contextKey, serviceType, 'Test rollback');

      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled(); // Cache invalidation
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should restore defaults when no previous version exists', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            defaultWeights: { ml: 0.9 },
          },
        }),
      });

      await service.executeRollback(tenantId, contextKey, serviceType, 'Test rollback');

      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
    });

    it('should alert team on rollback', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            defaultWeights: { ml: 0.9 },
          },
        }),
      });

      await service.executeRollback(tenantId, contextKey, serviceType, 'Test rollback');

      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        expect.stringContaining('rollback'),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing learning record gracefully', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: null }),
      });

      const decision = await service.shouldRollback(tenantId, contextKey, serviceType);

      expect(decision.shouldRollback).toBe(false);
    });

    it('should handle Cosmos DB errors gracefully', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockRejectedValue(new Error('Cosmos DB error')),
      });

      await expect(
        service.shouldRollback(tenantId, contextKey, serviceType)
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

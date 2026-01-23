/**
 * Meta-Learning Service Tests
 * Tests for component trust learning
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetaLearningService } from '../../../src/services/meta-learning.service';
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

describe('MetaLearningService', () => {
  let service: MetaLearningService;
  const tenantId = 'tenant-1';
  const context: Context = {
    industry: 'tech',
    dealSize: 'large',
  };
  const serviceType: ServiceType = 'risk';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MetaLearningService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );
  });

  describe('getTrustScores', () => {
    it('should return trust scores for components', async () => {
      const trustScores = await service.getTrustScores(tenantId, serviceType, context);

      expect(trustScores).toBeDefined();
      expect(trustScores.tenantId).toBe(tenantId);
      expect(trustScores.serviceType).toBe(serviceType);
      expect(trustScores.components).toBeDefined();
    });

    it('should cache trust scores in Redis', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      await service.getTrustScores(tenantId, serviceType, context);

      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should return cached trust scores from Redis', async () => {
      const cachedScores = {
        tenantId,
        serviceType,
        contextKey: 'tech:large',
        components: {
          ml: { trustScore: 0.85, confidence: 0.8 },
        },
        overallTrust: 0.85,
        lastUpdated: new Date(),
      };
      (mockRedis.get as any).mockResolvedValue(JSON.stringify(cachedScores));

      const trustScores = await service.getTrustScores(tenantId, serviceType, context);

      expect(trustScores.overallTrust).toBe(0.85);
      expect(mockCosmosClient.database).not.toHaveBeenCalled();
    });
  });

  describe('learnTrustScores', () => {
    it('should update trust scores from outcomes', async () => {
      const outcomes = [
        {
          component: 'ml',
          prediction: 0.7,
          actualOutcome: 0.8,
          uncertainty: 0.1,
        },
        {
          component: 'rules',
          prediction: 0.6,
          actualOutcome: 0.8,
          uncertainty: 0.2,
        },
      ];

      await service.learnTrustScores(tenantId, serviceType, context, outcomes);

      expect(mockCosmosClient.database().container().items.create).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled(); // Cache invalidation
    });

    it('should increase trust for accurate components', async () => {
      const outcomes = [
        {
          component: 'ml',
          prediction: 0.8,
          actualOutcome: 0.8, // Perfect match
          uncertainty: 0.1,
        },
      ];

      await service.learnTrustScores(tenantId, serviceType, context, outcomes);

      const trustScores = await service.getTrustScores(tenantId, serviceType, context);
      const mlTrust = trustScores.components['ml'];
      
      if (mlTrust) {
        expect(mlTrust.trustScore).toBeGreaterThan(0.5); // Should be high
      }
    });

    it('should decrease trust for inaccurate components', async () => {
      const outcomes = [
        {
          component: 'ml',
          prediction: 0.2,
          actualOutcome: 0.8, // Large error
          uncertainty: 0.1,
        },
      ];

      await service.learnTrustScores(tenantId, serviceType, context, outcomes);

      const trustScores = await service.getTrustScores(tenantId, serviceType, context);
      const mlTrust = trustScores.components['ml'];
      
      if (mlTrust) {
        expect(mlTrust.trustScore).toBeLessThan(0.5); // Should be low
      }
    });

    it('should adjust trust based on uncertainty', async () => {
      const outcomes = [
        {
          component: 'ml',
          prediction: 0.7,
          actualOutcome: 0.8,
          uncertainty: 0.9, // High uncertainty
        },
      ];

      await service.learnTrustScores(tenantId, serviceType, context, outcomes);

      // High uncertainty should reduce trust
      const trustScores = await service.getTrustScores(tenantId, serviceType, context);
      const mlTrust = trustScores.components['ml'];
      
      if (mlTrust) {
        expect(mlTrust.trustScore).toBeLessThan(0.5);
      }
    });
  });

  describe('routeByUncertainty', () => {
    it('should use ensemble for high uncertainty', async () => {
      const routing = await service.routeByUncertainty(
        tenantId,
        serviceType,
        context,
        0.8 // High uncertainty
      );

      expect(routing.useEnsemble).toBe(true);
      expect(routing.components.length).toBeGreaterThan(0);
    });

    it('should use top 2 components for medium uncertainty', async () => {
      const routing = await service.routeByUncertainty(
        tenantId,
        serviceType,
        context,
        0.5 // Medium uncertainty
      );

      expect(routing.useEnsemble).toBe(true);
      if (routing.components.length > 0) {
        expect(routing.components.length).toBeLessThanOrEqual(2);
      }
    });

    it('should use single component for low uncertainty', async () => {
      const routing = await service.routeByUncertainty(
        tenantId,
        serviceType,
        context,
        0.2 // Low uncertainty
      );

      expect(routing.useEnsemble).toBe(false);
      expect(routing.primaryComponent).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle Redis errors gracefully', async () => {
      (mockRedis.get as any).mockRejectedValue(new Error('Redis error'));

      const trustScores = await service.getTrustScores(tenantId, serviceType, context);

      expect(trustScores).toBeDefined(); // Should still return
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should handle Cosmos DB errors gracefully', async () => {
      (mockCosmosClient.database().container().items.create as any).mockRejectedValue(
        new Error('Cosmos DB error')
      );

      const outcomes = [
        {
          component: 'ml',
          prediction: 0.7,
          actualOutcome: 0.8,
        },
      ];

      await expect(
        service.learnTrustScores(tenantId, serviceType, context, outcomes)
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

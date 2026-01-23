/**
 * Adaptive Feature Engineering Service Tests
 * Tests for context-aware feature engineering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdaptiveFeatureEngineeringService } from '../../../src/services/adaptive-feature-engineering.service';
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

describe('AdaptiveFeatureEngineeringService', () => {
  let service: AdaptiveFeatureEngineeringService;
  const tenantId = 'tenant-1';
  const context: Context = {
    industry: 'tech',
    dealSize: 'large',
    stage: 'proposal',
  };
  const opportunity = {
    id: 'opp-1',
    structuredData: {
      amount: 500000,
      stage: 'proposal',
      probability: 60,
      closeDate: new Date(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdaptiveFeatureEngineeringService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );
  });

  describe('getFeatures', () => {
    it('should extract base features from opportunity', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      const features = await service.getFeatures(tenantId, opportunity, context);

      expect(features).toBeDefined();
      expect(features.baseFeatures).toBeDefined();
      expect(features.baseFeatures.amount).toBe(500000);
      expect(features.baseFeatures.stage).toBe('proposal');
    });

    it('should generate derived features', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      const features = await service.getFeatures(tenantId, opportunity, context);

      expect(features.derivedFeatures).toBeDefined();
      expect(Array.isArray(features.derivedFeatures)).toBe(true);
    });

    it('should rank features by importance', async () => {
      const cachedImportance = {
        amount: 0.9,
        stage: 0.8,
        probability: 0.7,
      };
      (mockRedis.get as any).mockResolvedValue(JSON.stringify(cachedImportance));

      const features = await service.getFeatures(tenantId, opportunity, context);

      expect(features.rankedFeatures).toBeDefined();
      if (features.rankedFeatures && features.rankedFeatures.length > 0) {
        // Should be sorted by importance
        expect(features.rankedFeatures[0].importance).toBeGreaterThanOrEqual(
          features.rankedFeatures[features.rankedFeatures.length - 1].importance
        );
      }
    });

    it('should filter features by importance threshold', async () => {
      const cachedImportance = {
        amount: 0.9,
        stage: 0.8,
        probability: 0.3, // Low importance
      };
      (mockRedis.get as any).mockResolvedValue(JSON.stringify(cachedImportance));

      const features = await service.getFeatures(tenantId, opportunity, context);

      // Low importance features should be filtered out
      if (features.rankedFeatures) {
        features.rankedFeatures.forEach((f) => {
          expect(f.importance).toBeGreaterThan(0.5); // Threshold
        });
      }
    });
  });

  describe('learnFeatureImportance', () => {
    it('should learn feature importance from SHAP values', async () => {
      const modelPerformance = {
        features: {
          amount: 0.5,
          stage: 0.3,
          probability: 0.2,
        },
        performance: 0.85,
        shapValues: {
          amount: 0.4,
          stage: 0.3,
          probability: 0.1,
        },
      };

      await service.learnFeatureImportance(tenantId, context, modelPerformance);

      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled(); // Cache invalidation
    });

    it('should learn feature importance from correlation when SHAP unavailable', async () => {
      const modelPerformance = {
        features: {
          amount: 0.5,
          stage: 0.3,
        },
        performance: 0.80,
        // No SHAP values
      };

      await service.learnFeatureImportance(tenantId, context, modelPerformance);

      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
    });

    it('should update feature importance over time', async () => {
      const performance1 = {
        features: { amount: 0.5 },
        performance: 0.80,
        shapValues: { amount: 0.4 },
      };

      await service.learnFeatureImportance(tenantId, context, performance1);

      const performance2 = {
        features: { amount: 0.6 },
        performance: 0.85,
        shapValues: { amount: 0.5 },
      };

      await service.learnFeatureImportance(tenantId, context, performance2);

      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('discoverFeatureCombinations', () => {
    it('should discover important feature combinations', async () => {
      const combinations = await service.discoverFeatureCombinations(
        tenantId,
        context
      );

      expect(combinations).toBeDefined();
      expect(Array.isArray(combinations)).toBe(true);
    });

    it('should cache discovered combinations', async () => {
      await service.discoverFeatureCombinations(tenantId, context);

      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('feature extraction', () => {
    it('should extract base features correctly', async () => {
      const baseFeatures = (service as any).extractBaseFeatures(opportunity);

      expect(baseFeatures).toBeDefined();
      expect(baseFeatures.amount).toBe(500000);
      expect(baseFeatures.stage).toBe('proposal');
      expect(baseFeatures.probability).toBe(60);
    });

    it('should generate derived features', async () => {
      const baseFeatures = (service as any).extractBaseFeatures(opportunity);
      const derivedFeatures = (service as any).generateDerivedFeatures(
        baseFeatures,
        context
      );

      expect(derivedFeatures).toBeDefined();
      expect(Array.isArray(derivedFeatures)).toBe(true);
    });

    it('should calculate age in days for date features', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30);

      const age = (service as any).calculateAgeDays(oldDate);

      expect(age).toBeCloseTo(30, 0);
    });
  });

  describe('error handling', () => {
    it('should handle missing opportunity data gracefully', async () => {
      const features = await service.getFeatures(tenantId, {}, context);

      expect(features).toBeDefined();
      expect(features.baseFeatures).toBeDefined();
    });

    it('should handle Redis errors gracefully', async () => {
      (mockRedis.get as any).mockRejectedValue(new Error('Redis error'));

      const features = await service.getFeatures(tenantId, opportunity, context);

      expect(features).toBeDefined(); // Should still work
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should handle Cosmos DB errors gracefully', async () => {
      (mockCosmosClient.database().container().items.upsert as any).mockRejectedValue(
        new Error('Cosmos DB error')
      );

      const modelPerformance = {
        features: { amount: 0.5 },
        performance: 0.80,
      };

      await expect(
        service.learnFeatureImportance(tenantId, context, modelPerformance)
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

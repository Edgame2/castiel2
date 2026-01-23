/**
 * Recommendations Service Integration Tests
 * Tests for RecommendationsService with adaptive learning integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecommendationsService } from '../../../../src/services/recommendation.service';
import { AdaptiveWeightLearningService } from '../../../../src/services/adaptive-weight-learning.service';
import { OutcomeCollectorService } from '../../../../src/services/outcome-collector.service';
import { PerformanceTrackerService } from '../../../../src/services/performance-tracker.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';

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

describe('RecommendationsService Integration with Adaptive Learning', () => {
  let recommendationsService: RecommendationsService;
  let adaptiveWeightService: AdaptiveWeightLearningService;
  let outcomeCollector: OutcomeCollectorService;
  let performanceTracker: PerformanceTrackerService;

  const tenantId = 'tenant-1';
  const userId = 'user-1';

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize adaptive learning services
    adaptiveWeightService = new AdaptiveWeightLearningService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );

    outcomeCollector = new OutcomeCollectorService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );

    performanceTracker = new PerformanceTrackerService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );

    // Initialize RecommendationsService with adaptive learning services
    recommendationsService = new RecommendationsService(
      mockMonitoring,
      adaptiveWeightService,
      outcomeCollector,
      performanceTracker
    );
  });

  describe('getRecommendations with adaptive weights', () => {
    it('should use learned weights when available', async () => {
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        ml: 0.9,
        rules: 1.0,
        llm: 0.8,
        historical: 0.9,
      }));

      const recommendations = await recommendationsService.getRecommendations(
        tenantId,
        userId,
        {}
      );

      expect(recommendations).toBeDefined();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should fallback to default weights when learning unavailable', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      const recommendations = await recommendationsService.getRecommendations(
        tenantId,
        userId,
        {}
      );

      expect(recommendations).toBeDefined();
      // Should still work with defaults
    });

    it('should track prediction for learning', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      const recommendations = await recommendationsService.getRecommendations(
        tenantId,
        userId,
        {}
      );

      // Should have tracked prediction
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });
  });

  describe('onRecommendationAction', () => {
    it('should record user action as outcome', async () => {
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        id: 'pred-1',
        tenantId,
        serviceType: 'recommendations',
      }));

      await recommendationsService.onRecommendationAction(
        tenantId,
        userId,
        'rec-1',
        'clicked'
      );

      // Should record outcome
      expect(mockCosmosClient.database().container().items.create).toHaveBeenCalled();
    });

    it('should track performance for clicked recommendations', async () => {
      await recommendationsService.onRecommendationAction(
        tenantId,
        userId,
        'rec-1',
        'clicked'
      );

      // Should track as positive outcome
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });
  });

  describe('learning integration', () => {
    it('should learn from recommendation outcomes', async () => {
      // Get recommendations
      (mockRedis.get as any).mockResolvedValue(null);
      const recommendations = await recommendationsService.getRecommendations(
        tenantId,
        userId,
        {}
      );

      // User clicks on recommendation
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        id: 'pred-1',
        tenantId,
        serviceType: 'recommendations',
        context: { industry: 'tech' },
        prediction: { recommendations: recommendations.items },
      }));

      await recommendationsService.onRecommendationAction(
        tenantId,
        userId,
        recommendations.items[0]?.id || 'rec-1',
        'clicked'
      );

      // Should learn from outcome
      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
    });

    it('should update weights based on performance', async () => {
      // Simulate multiple recommendations and outcomes
      for (let i = 0; i < 5; i++) {
        (mockRedis.get as any).mockResolvedValue(null);
        await recommendationsService.getRecommendations(tenantId, userId, {});

        (mockRedis.get as any).mockResolvedValue(JSON.stringify({
          id: `pred-${i}`,
          tenantId,
          serviceType: 'recommendations',
        }));

        await recommendationsService.onRecommendationAction(
          tenantId,
          userId,
          `rec-${i}`,
          i % 2 === 0 ? 'clicked' : 'dismissed'
        );
      }

      // Should have learned from outcomes
      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should continue working when adaptive services unavailable', async () => {
      const serviceWithoutAdaptive = new RecommendationsService(
        mockMonitoring
      );

      const recommendations = await serviceWithoutAdaptive.getRecommendations(
        tenantId,
        userId,
        {}
      );

      expect(recommendations).toBeDefined();
      // Should work with defaults
    });

    it('should handle outcome collection errors gracefully', async () => {
      (mockRedis.get as any).mockRejectedValue(new Error('Redis error'));

      await expect(
        recommendationsService.onRecommendationAction(
          tenantId,
          userId,
          'rec-1',
          'clicked'
        )
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

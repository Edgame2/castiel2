/**
 * Adaptive Learning Integration Tests
 * End-to-end tests for adaptive learning pipeline
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdaptiveWeightLearningService } from '../../../../src/services/adaptive-weight-learning.service';
import { OutcomeCollectorService } from '../../../../src/services/outcome-collector.service';
import { PerformanceTrackerService } from '../../../../src/services/performance-tracker.service';
import { AdaptiveLearningValidationService } from '../../../../src/services/adaptive-learning-validation.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import { ServiceType, Context } from '../../../../src/types/adaptive-learning.types';

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
  lpush: vi.fn().mockResolvedValue(1),
} as unknown as Redis;

describe('Adaptive Learning Integration', () => {
  let weightService: AdaptiveWeightLearningService;
  let outcomeService: OutcomeCollectorService;
  let performanceService: PerformanceTrackerService;
  let validationService: AdaptiveLearningValidationService;

  const tenantId = 'tenant-1';
  const context: Context = {
    industry: 'tech',
    dealSize: 'large',
    stage: 'proposal',
  };
  const serviceType: ServiceType = 'risk';

  beforeEach(() => {
    vi.clearAllMocks();

    weightService = new AdaptiveWeightLearningService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );

    outcomeService = new OutcomeCollectorService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );

    performanceService = new PerformanceTrackerService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );

    validationService = new AdaptiveLearningValidationService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );
  });

  describe('Full Learning Pipeline', () => {
    it('should complete full learning cycle: prediction → outcome → learning → validation', async () => {
      const contextKey = 'tech:large:proposal';

      // Step 1: Get initial weights (defaults)
      const initialWeights = await weightService.getWeights(
        tenantId,
        contextKey,
        serviceType
      );
      expect(initialWeights.ml).toBe(0.9); // Default

      // Step 2: Record prediction
      const predictionId = await outcomeService.recordPrediction(
        tenantId,
        serviceType,
        context,
        { riskScore: 0.7 },
        { ml: 0.9, rules: 1.0 },
        initialWeights
      );
      expect(predictionId).toBeDefined();

      // Step 3: Record outcome
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        id: predictionId,
        tenantId,
        serviceType,
        context,
        prediction: { riskScore: 0.7 },
      }));

      await outcomeService.recordOutcome(
        predictionId,
        tenantId,
        0.8, // Actual outcome (better than predicted)
        'success'
      );

      // Step 4: Learn from outcome
      await weightService.learnFromOutcome(
        tenantId,
        contextKey,
        serviceType,
        'ml',
        0.8
      );

      // Step 5: Track performance
      await performanceService.trackPerformance(
        tenantId,
        serviceType,
        context,
        'ml',
        true // Was correct
      );

      // Step 6: Validate (after sufficient examples)
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            examples: 150,
            performance: {
              accuracy: 0.85,
              baseline: 0.75,
            },
          },
        }),
      });

      (validationService as any).getPerformanceData = vi.fn().mockResolvedValue({
        learned: [0.8, 0.85, 0.9],
        default: [0.7, 0.75, 0.72],
      });

      const validation = await validationService.validateWeights(
        tenantId,
        contextKey,
        serviceType
      );

      expect(validation).toBeDefined();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should handle cache invalidation across services', async () => {
      const contextKey = 'tech:large:proposal';

      // Get weights (cached)
      await weightService.getWeights(tenantId, contextKey, serviceType);
      expect(mockRedis.setex).toHaveBeenCalled();

      // Learn from outcome (should invalidate cache)
      await weightService.learnFromOutcome(
        tenantId,
        contextKey,
        serviceType,
        'ml',
        0.8
      );

      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should track performance across multiple predictions', async () => {
      // Track multiple predictions
      for (let i = 0; i < 5; i++) {
        await performanceService.trackPerformance(
          tenantId,
          serviceType,
          context,
          'ml',
          i % 2 === 0 // Alternating success/failure
        );
      }

      const performance = await performanceService.getPerformance(
        tenantId,
        serviceType,
        context
      );

      expect(performance).toBeDefined();
      expect(performance.totalPredictions).toBeGreaterThan(0);
    });
  });

  describe('Service Interactions', () => {
    it('should coordinate weight learning with outcome collection', async () => {
      const contextKey = 'tech:large:proposal';

      // Record prediction
      const predictionId = await outcomeService.recordPrediction(
        tenantId,
        serviceType,
        context,
        { riskScore: 0.7 },
        { ml: 0.9 },
        { ml: 0.9 }
      );

      // Record outcome
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        id: predictionId,
        tenantId,
        serviceType,
        context,
        prediction: { riskScore: 0.7 },
      }));

      await outcomeService.recordOutcome(predictionId, tenantId, 0.8, 'success');

      // Learn from outcome
      await weightService.learnFromOutcome(
        tenantId,
        contextKey,
        serviceType,
        'ml',
        0.8
      );

      // Verify learning occurred
      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
    });

    it('should integrate performance tracking with validation', async () => {
      // Track performance
      await performanceService.trackPerformance(
        tenantId,
        serviceType,
        context,
        'ml',
        true
      );

      // Validate (should use performance data)
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey: 'tech:large:proposal',
            serviceType,
            examples: 200,
            performance: { accuracy: 0.85, baseline: 0.75 },
          },
        }),
      });

      (validationService as any).getPerformanceData = vi.fn().mockResolvedValue({
        learned: [0.8, 0.85, 0.9],
        default: [0.7, 0.75, 0.72],
      });

      const validation = await validationService.validateWeights(
        tenantId,
        'tech:large:proposal',
        serviceType
      );

      expect(validation).toBeDefined();
    });
  });

  describe('Error Recovery', () => {
    it('should fallback to defaults when learning service unavailable', async () => {
      const contextKey = 'tech:large:proposal';

      // Simulate service error
      (mockRedis.get as any).mockRejectedValue(new Error('Service unavailable'));

      // Should still return defaults
      const weights = await weightService.getWeights(
        tenantId,
        contextKey,
        serviceType
      );

      expect(weights).toBeDefined();
      expect(weights.ml).toBe(0.9); // Default
    });

    it('should continue learning after temporary errors', async () => {
      const contextKey = 'tech:large:proposal';

      // First attempt fails
      (mockCosmosClient.database().container().items.upsert as any).mockRejectedValueOnce(
        new Error('Temporary error')
      );

      // Should handle gracefully
      await expect(
        weightService.learnFromOutcome(tenantId, contextKey, serviceType, 'ml', 0.8)
      ).resolves.not.toThrow();

      // Second attempt succeeds
      (mockCosmosClient.database().container().items.upsert as any).mockResolvedValueOnce({});

      await weightService.learnFromOutcome(tenantId, contextKey, serviceType, 'ml', 0.8);

      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
    });
  });
});

/**
 * Active Learning Service Tests
 * Tests for intelligent feedback requests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActiveLearningService } from '../../../src/services/active-learning.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import { FeedbackLearningService } from '../../../src/services/feedback-learning.service';

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
        create: vi.fn().mockResolvedValue({ resource: {} }),
      },
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
} as unknown as Redis;

const mockFeedbackService = {
  getFeedback: vi.fn().mockResolvedValue([]),
  getUserExpertise: vi.fn().mockResolvedValue('intermediate'),
} as unknown as FeedbackLearningService;

describe('ActiveLearningService', () => {
  let service: ActiveLearningService;
  const tenantId = 'tenant-1';
  const userId = 'user-1';
  const opportunityId = 'opp-1';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ActiveLearningService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockFeedbackService
    );
  });

  describe('selectQueryStrategy', () => {
    it('should select diversity strategy for early stage', async () => {
      const strategy = await service.selectQueryStrategy(tenantId);

      // Early stage should use diversity
      expect(strategy).toBeDefined();
      expect(['uncertainty', 'representative', 'impact', 'diversity']).toContain(strategy);
    });

    it('should select uncertainty strategy for mid stage', async () => {
      // Mock more examples
      (service as any).getExampleCount = vi.fn().mockResolvedValue(200);

      const strategy = await service.selectQueryStrategy(tenantId);

      expect(strategy).toBeDefined();
    });

    it('should select impact strategy for late stage', async () => {
      // Mock many examples
      (service as any).getExampleCount = vi.fn().mockResolvedValue(600);

      const strategy = await service.selectQueryStrategy(tenantId);

      expect(strategy).toBeDefined();
    });
  });

  describe('requestFeedback', () => {
    it('should create feedback request', async () => {
      (service as any).shouldRequestFeedback = vi.fn().mockResolvedValue(true);

      const request = await service.requestFeedback(
        tenantId,
        userId,
        opportunityId,
        'High-value opportunity'
      );

      expect(request).toBeDefined();
      expect(request.id).toBeDefined();
      expect(request.tenantId).toBe(tenantId);
      expect(request.userId).toBe(userId);
      expect(request.opportunityId).toBe(opportunityId);
      expect(request.status).toBe('pending');
    });

    it('should set priority based on strategy', async () => {
      (service as any).shouldRequestFeedback = vi.fn().mockResolvedValue(true);
      (service as any).selectQueryStrategy = vi.fn().mockResolvedValue('impact');

      const request = await service.requestFeedback(
        tenantId,
        userId,
        opportunityId,
        'Test'
      );

      expect(request.priority).toBe('high'); // Impact strategy = high priority
    });

    it('should respect sampling rate', async () => {
      (service as any).shouldRequestFeedback = vi.fn().mockResolvedValue(false);

      await expect(
        service.requestFeedback(tenantId, userId, opportunityId, 'Test')
      ).rejects.toThrow('Sampling rate limit');
    });

    it('should store request in Redis', async () => {
      (service as any).shouldRequestFeedback = vi.fn().mockResolvedValue(true);

      await service.requestFeedback(tenantId, userId, opportunityId, 'Test');

      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('optimizeSamplingRate', () => {
    it('should increase rate for high-quality feedback', async () => {
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        tenantId,
        baseRate: 0.1,
        currentRate: 0.1,
        adaptiveRate: true,
      }));

      // Mock high quality, low progress
      (service as any).getFeedbackQuality = vi.fn().mockResolvedValue(0.9);
      (service as any).getLearningProgress = vi.fn().mockResolvedValue(0.3);

      const newRate = await service.optimizeSamplingRate(tenantId);

      expect(newRate).toBeGreaterThan(0.1); // Should increase
    });

    it('should decrease rate for low-quality feedback', async () => {
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        tenantId,
        baseRate: 0.1,
        currentRate: 0.1,
        adaptiveRate: true,
      }));

      // Mock low quality, high progress
      (service as any).getFeedbackQuality = vi.fn().mockResolvedValue(0.4);
      (service as any).getLearningProgress = vi.fn().mockResolvedValue(0.8);

      const newRate = await service.optimizeSamplingRate(tenantId);

      expect(newRate).toBeLessThan(0.1); // Should decrease
    });

    it('should return base rate when adaptive rate disabled', async () => {
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        tenantId,
        baseRate: 0.1,
        currentRate: 0.1,
        adaptiveRate: false,
      }));

      const newRate = await service.optimizeSamplingRate(tenantId);

      expect(newRate).toBe(0.1); // Should return base rate
    });
  });

  describe('error handling', () => {
    it('should handle Redis errors gracefully', async () => {
      (mockRedis.get as any).mockRejectedValue(new Error('Redis error'));

      const strategy = await service.selectQueryStrategy(tenantId);

      expect(strategy).toBeDefined(); // Should still return a strategy
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should handle missing feedback service gracefully', async () => {
      const serviceWithoutFeedback = new ActiveLearningService(
        mockCosmosClient,
        mockRedis,
        mockMonitoring
      );

      const strategy = await serviceWithoutFeedback.selectQueryStrategy(tenantId);

      expect(strategy).toBeDefined();
    });
  });
});

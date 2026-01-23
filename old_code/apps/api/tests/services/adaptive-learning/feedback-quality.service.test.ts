/**
 * Feedback Quality Service Tests
 * Tests for feedback quality assessment and user reliability
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedbackQualityService } from '../../../src/services/feedback-quality.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import { FeedbackLearningService, FeedbackEntry } from '../../../src/services/feedback-learning.service';

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
        upsert: vi.fn().mockResolvedValue({ resource: {} }),
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

describe('FeedbackQualityService', () => {
  let service: FeedbackQualityService;
  const tenantId = 'tenant-1';
  const userId = 'user-1';
  const feedbackId = 'fb-1';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FeedbackQualityService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockFeedbackService
    );
  });

  describe('assessQuality', () => {
    it('should assess feedback quality', async () => {
      const feedback: FeedbackEntry = {
        id: feedbackId,
        tenantId,
        userId,
        rating: 'positive',
        score: 4,
        comment: 'Very helpful insight',
        modelId: 'model-1',
        insightType: 'risk',
        createdAt: new Date(),
      };

      const assessment = await service.assessQuality(feedbackId, tenantId, feedback);

      expect(assessment).toBeDefined();
      expect(assessment.feedbackId).toBe(feedbackId);
      expect(assessment.qualityScore).toBeGreaterThanOrEqual(0);
      expect(assessment.qualityScore).toBeLessThanOrEqual(1);
      expect(assessment.reliability).toBeDefined();
      expect(assessment.bias).toBeDefined();
      expect(assessment.trainingWeight).toBeDefined();
    });

    it('should calculate quality based on multiple factors', async () => {
      const feedback: FeedbackEntry = {
        id: feedbackId,
        tenantId,
        userId,
        rating: 'positive',
        score: 5,
        comment: 'This is a very detailed and helpful comment that provides excellent context',
        modelId: 'model-1',
        insightType: 'risk',
        createdAt: new Date(),
      };

      const assessment = await service.assessQuality(feedbackId, tenantId, feedback);

      expect(assessment.factors.consistency).toBeDefined();
      expect(assessment.factors.detail).toBeGreaterThan(0.5); // Long comment = high detail
      expect(assessment.factors.timeliness).toBeDefined();
      expect(assessment.factors.expertise).toBeDefined();
    });

    it('should detect bias in feedback', async () => {
      const feedback: FeedbackEntry = {
        id: feedbackId,
        tenantId,
        userId,
        rating: 'positive',
        score: 5,
        comment: 'Great',
        modelId: 'model-1',
        insightType: 'risk',
        createdAt: new Date(),
      };

      // Mock user with all positive feedback (bias)
      (mockFeedbackService.getFeedback as any).mockResolvedValue([
        { userId, rating: 'positive', score: 5 },
        { userId, rating: 'positive', score: 5 },
        { userId, rating: 'positive', score: 5 },
        { userId, rating: 'positive', score: 5 },
        { userId, rating: 'positive', score: 5 },
      ]);

      const assessment = await service.assessQuality(feedbackId, tenantId, feedback);

      expect(assessment.bias).toBeGreaterThan(0); // Should detect bias
    });

    it('should adjust training weight based on quality', async () => {
      const feedback: FeedbackEntry = {
        id: feedbackId,
        tenantId,
        userId,
        rating: 'positive',
        score: 5,
        comment: 'Detailed feedback with good context',
        modelId: 'model-1',
        insightType: 'risk',
        createdAt: new Date(),
      };

      const assessment = await service.assessQuality(feedbackId, tenantId, feedback);

      expect(assessment.trainingWeight).toBeGreaterThanOrEqual(0.1);
      expect(assessment.trainingWeight).toBeLessThanOrEqual(1.0);
      
      // High quality should have higher weight
      if (assessment.qualityScore > 0.8) {
        expect(assessment.trainingWeight).toBeGreaterThan(0.5);
      }
    });
  });

  describe('getUserReliability', () => {
    it('should return user reliability score', async () => {
      const reliability = await service.getUserReliability(userId, tenantId);

      expect(reliability).toBeDefined();
      expect(reliability.userId).toBe(userId);
      expect(reliability.tenantId).toBe(tenantId);
      expect(reliability.reliabilityScore).toBeGreaterThanOrEqual(0);
      expect(reliability.reliabilityScore).toBeLessThanOrEqual(1);
    });

    it('should cache user reliability', async () => {
      await service.getUserReliability(userId, tenantId);

      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should return cached reliability from Redis', async () => {
      const cachedReliability = {
        userId,
        tenantId,
        reliabilityScore: 0.85,
        totalFeedback: 20,
        consistentFeedback: 18,
        averageQuality: 0.82,
        lastUpdated: new Date(),
      };
      (mockRedis.get as any).mockResolvedValue(JSON.stringify(cachedReliability));

      const reliability = await service.getUserReliability(userId, tenantId);

      expect(reliability.reliabilityScore).toBe(0.85);
    });

    it('should use feedback service expertise when available', async () => {
      (mockFeedbackService.getUserExpertise as any).mockResolvedValue('expert');
      (mockRedis.get as any).mockResolvedValue(null);

      const reliability = await service.getUserReliability(userId, tenantId);

      expect(reliability.reliabilityScore).toBeGreaterThan(0.5); // Expert = high reliability
    });
  });

  describe('detectBias', () => {
    it('should detect all-positive bias', async () => {
      (mockFeedbackService.getFeedback as any).mockResolvedValue([
        { userId, rating: 'positive' },
        { userId, rating: 'positive' },
        { userId, rating: 'positive' },
        { userId, rating: 'positive' },
        { userId, rating: 'positive' },
      ]);

      const feedback: FeedbackEntry = {
        id: feedbackId,
        tenantId,
        userId,
        rating: 'positive',
        score: 5,
        modelId: 'model-1',
        insightType: 'risk',
        createdAt: new Date(),
      };

      const bias = await (service as any).detectBias(feedback, tenantId);

      expect(bias).toBeGreaterThan(0.5); // High bias
    });

    it('should detect all-negative bias', async () => {
      (mockFeedbackService.getFeedback as any).mockResolvedValue([
        { userId, rating: 'negative' },
        { userId, rating: 'negative' },
        { userId, rating: 'negative' },
        { userId, rating: 'negative' },
        { userId, rating: 'negative' },
      ]);

      const feedback: FeedbackEntry = {
        id: feedbackId,
        tenantId,
        userId,
        rating: 'negative',
        score: 1,
        modelId: 'model-1',
        insightType: 'risk',
        createdAt: new Date(),
      };

      const bias = await (service as any).detectBias(feedback, tenantId);

      expect(bias).toBeGreaterThan(0.5); // High bias
    });

    it('should detect extreme score bias', async () => {
      (mockFeedbackService.getFeedback as any).mockResolvedValue([
        { userId, score: 1 },
        { userId, score: 5 },
        { userId, score: 1 },
        { userId, score: 5 },
        { userId, score: 1 },
      ]);

      const feedback: FeedbackEntry = {
        id: feedbackId,
        tenantId,
        userId,
        rating: 'positive',
        score: 5,
        modelId: 'model-1',
        insightType: 'risk',
        createdAt: new Date(),
      };

      const bias = await (service as any).detectBias(feedback, tenantId);

      expect(bias).toBeGreaterThan(0); // Some bias detected
    });

    it('should return low bias for diverse feedback', async () => {
      (mockFeedbackService.getFeedback as any).mockResolvedValue([
        { userId, rating: 'positive', score: 4 },
        { userId, rating: 'negative', score: 2 },
        { userId, rating: 'positive', score: 5 },
        { userId, rating: 'neutral', score: 3 },
        { userId, rating: 'positive', score: 4 },
      ]);

      const feedback: FeedbackEntry = {
        id: feedbackId,
        tenantId,
        userId,
        rating: 'positive',
        score: 4,
        modelId: 'model-1',
        insightType: 'risk',
        createdAt: new Date(),
      };

      const bias = await (service as any).detectBias(feedback, tenantId);

      expect(bias).toBeLessThan(0.5); // Low bias
    });
  });

  describe('adjustTrainingWeight', () => {
    it('should return higher weight for higher quality', () => {
      const weight1 = (service as any).adjustTrainingWeight('fb-1', 0.9);
      const weight2 = (service as any).adjustTrainingWeight('fb-2', 0.5);

      expect(weight1).toBeGreaterThan(weight2);
    });

    it('should cap weight at 1.0', () => {
      const weight = (service as any).adjustTrainingWeight('fb-1', 1.5);

      expect(weight).toBeLessThanOrEqual(1.0);
    });

    it('should floor weight at 0.1', () => {
      const weight = (service as any).adjustTrainingWeight('fb-1', 0.0);

      expect(weight).toBeGreaterThanOrEqual(0.1);
    });
  });

  describe('error handling', () => {
    it('should handle missing feedback service gracefully', async () => {
      const serviceWithoutFeedback = new FeedbackQualityService(
        mockCosmosClient,
        mockRedis,
        mockMonitoring
      );

      const feedback: FeedbackEntry = {
        id: feedbackId,
        tenantId,
        userId,
        rating: 'positive',
        score: 4,
        modelId: 'model-1',
        insightType: 'risk',
        createdAt: new Date(),
      };

      const assessment = await serviceWithoutFeedback.assessQuality(
        feedbackId,
        tenantId,
        feedback
      );

      expect(assessment).toBeDefined();
    });

    it('should handle Redis errors gracefully', async () => {
      (mockRedis.get as any).mockRejectedValue(new Error('Redis error'));

      const reliability = await service.getUserReliability(userId, tenantId);

      expect(reliability).toBeDefined(); // Should still return
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

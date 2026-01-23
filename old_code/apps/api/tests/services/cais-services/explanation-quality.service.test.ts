/**
 * Explanation Quality Service Tests
 * Tests for explanation quality assessment
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ExplanationQualityService } from '../../../src/services/explanation-quality.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { ExplainableAIService, Explanation } from '../../../src/services/explainable-ai.service.js';
import type { FeedbackLearningService } from '../../../src/services/feedback-learning.service.js';

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
        query: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
      },
      item: vi.fn().mockReturnValue({
        read: vi.fn(),
        replace: vi.fn(),
      }),
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
} as unknown as Redis;

const mockExplainableAIService = {
  generateExplanation: vi.fn(),
} as unknown as ExplainableAIService;

const mockFeedbackLearningService = {
  recordFeedback: vi.fn(),
} as unknown as FeedbackLearningService;

const mockExplanation: Explanation = {
  id: 'exp-1',
  responseId: 'resp-1',
  summary: 'Test explanation summary',
  reasoningSteps: [
    {
      stepNumber: 1,
      type: 'understanding',
      description: 'Parsed the query',
      confidence: 0.9,
    },
  ],
  sourceAttribution: [],
  confidenceBreakdown: {
    overall: 0.8,
    factors: {
      sourceQuality: 0.8,
      sourceCoverage: 0.7,
      queryClarity: 0.9,
      responseCoherence: 0.8,
      groundingStrength: 0.7,
    },
    explanation: 'High confidence based on quality sources',
  },
  keyFactors: [],
  limitations: [],
};

describe('ExplanationQualityService', () => {
  let service: ExplanationQualityService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ExplanationQualityService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockExplainableAIService,
      mockFeedbackLearningService
    );
  });

  describe('assessQuality', () => {
    it('should assess explanation quality', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'quality-1',
          tenantId,
          userId,
          explanationId: mockExplanation.id,
          scores: {
            clarity: 0.8,
            completeness: 0.7,
            actionability: 0.6,
            relevance: 0.9,
            trustworthiness: 0.8,
            overall: 0.76,
          },
        },
      });

      const result = await service.assessQuality(tenantId, mockExplanation, userId);

      expect(result).toBeDefined();
      expect(result.scores.overall).toBeGreaterThan(0);
      expect(result.scores.clarity).toBeDefined();
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should calculate quality scores correctly', async () => {
      const tenantId = 'tenant-1';
      const explanation: Explanation = {
        ...mockExplanation,
        summary: 'Clear and detailed explanation',
        reasoningSteps: [
          {
            stepNumber: 1,
            type: 'understanding',
            description: 'Detailed step',
            confidence: 0.9,
          },
          {
            stepNumber: 2,
            type: 'analysis',
            description: 'In-depth analysis',
            confidence: 0.8,
          },
        ],
        keyFactors: [
          {
            factor: 'Factor 1',
            influence: 'positive',
            weight: 0.8,
            description: 'Important factor',
          },
        ],
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'quality-1',
          tenantId,
          scores: {
            clarity: 0.9,
            completeness: 0.85,
            actionability: 0.7,
            relevance: 0.9,
            trustworthiness: 0.85,
            overall: 0.84,
          },
        },
      });

      const result = await service.assessQuality(tenantId, explanation);

      expect(result).toBeDefined();
      expect(result.scores.overall).toBeGreaterThan(0.7);
    });

    it('should detect explanation style', async () => {
      const tenantId = 'tenant-1';
      const explanation: Explanation = {
        ...mockExplanation,
        summary: 'Brief summary',
        reasoningSteps: [
          {
            stepNumber: 1,
            type: 'understanding',
            description: 'Short description',
            confidence: 0.8,
          },
        ],
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'quality-1',
          tenantId,
          style: 'concise',
          scores: { overall: 0.7 },
        },
      });

      const result = await service.assessQuality(tenantId, explanation);

      expect(result).toBeDefined();
      expect(result.style).toBeDefined();
    });
  });

  describe('recordFeedback', () => {
    it('should record user feedback on explanation', async () => {
      const tenantId = 'tenant-1';
      const explanationId = 'exp-1';
      const feedback = {
        helpful: true,
        rating: 5,
        comments: 'Very helpful explanation',
        suggestedImprovements: [],
      };
      const userId = 'user-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'quality-1',
              explanationId,
              tenantId,
            },
          ],
        }),
      });
      (mockContainer.item as any).mockReturnValue({
        replace: vi.fn().mockResolvedValue({
          resource: {
            id: 'quality-1',
            feedback,
          },
        }),
      });

      await service.recordFeedback(tenantId, explanationId, feedback, userId);

      expect(mockContainer.items.query).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should handle negative feedback', async () => {
      const tenantId = 'tenant-1';
      const explanationId = 'exp-1';
      const feedback = {
        helpful: false,
        rating: 2,
        comments: 'Not clear enough',
        suggestedImprovements: ['Add more examples', 'Simplify language'],
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'quality-1',
              explanationId,
              tenantId,
            },
          ],
        }),
      });
      (mockContainer.item as any).mockReturnValue({
        replace: vi.fn().mockResolvedValue({
          resource: {
            id: 'quality-1',
            feedback,
          },
        }),
      });

      await service.recordFeedback(tenantId, explanationId, feedback);

      expect(mockContainer.items.query).toHaveBeenCalled();
    });
  });

  describe('getQualityMetrics', () => {
    it('should retrieve quality metrics for time range', async () => {
      const tenantId = 'tenant-1';
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };
      const userId = 'user-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'quality-1',
              scores: { overall: 0.8, clarity: 0.85, completeness: 0.75 },
              feedback: { helpful: true, rating: 5 },
            },
            {
              id: 'quality-2',
              scores: { overall: 0.7, clarity: 0.7, completeness: 0.7 },
              feedback: { helpful: true, rating: 4 },
            },
          ],
        }),
      });

      const result = await service.getQualityMetrics(tenantId, timeRange, userId);

      expect(result).toBeDefined();
      expect(result.metrics.avgQuality).toBeGreaterThan(0);
      expect(result.metrics.helpfulRate).toBeGreaterThan(0);
    });
  });
});

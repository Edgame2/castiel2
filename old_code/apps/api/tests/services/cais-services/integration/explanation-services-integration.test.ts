/**
 * Explanation Services Integration Tests
 * Tests integration between ExplainableAIService, ExplanationQualityService,
 * and ExplanationMonitoringService
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ExplainableAIService } from '../../../../src/services/explainable-ai.service.js';
import { ExplanationQualityService } from '../../../../src/services/explanation-quality.service.js';
import { ExplanationMonitoringService } from '../../../../src/services/explanation-monitoring.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { FeedbackLearningService } from '../../../../src/services/feedback-learning.service.js';

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

const mockFeedbackLearningService = {
  recordFeedback: vi.fn(),
} as unknown as FeedbackLearningService;

describe('Explanation Services Integration', () => {
  let explainableAIService: ExplainableAIService;
  let explanationQualityService: ExplanationQualityService;
  let explanationMonitoringService: ExplanationMonitoringService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize services
    explanationQualityService = new ExplanationQualityService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      undefined, // explainableAIService (circular)
      mockFeedbackLearningService
    );

    explanationMonitoringService = new ExplanationMonitoringService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      explanationQualityService,
      undefined // explainableAIService (circular)
    );

    explainableAIService = new ExplainableAIService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      explanationQualityService
    );
  });

  describe('End-to-End Explanation Generation with Quality Assessment', () => {
    it('should generate explanation with quality assessment and monitoring', async () => {
      const tenantId = 'tenant-1';
      const explanationRequest = {
        decisionId: 'decision-1',
        decisionType: 'risk_evaluation',
        context: {
          opportunityId: 'opp-1',
          riskScore: 0.7,
        },
      };

      // Mock quality assessment
      const mockQualityContainer = (mockCosmosClient.database as any)().container();
      (mockQualityContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'quality-1',
          tenantId,
          explanationId: 'explanation-1',
          qualityScore: 0.85,
          factors: [
            {
              factor: 'completeness',
              score: 0.9,
              impact: 'positive',
            },
            {
              factor: 'clarity',
              score: 0.8,
              impact: 'positive',
            },
          ],
        },
      });

      // Mock explanation creation
      const mockExplanationContainer = (mockCosmosClient.database as any)().container();
      (mockExplanationContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'explanation-1',
          tenantId,
          decisionId: explanationRequest.decisionId,
          decisionType: explanationRequest.decisionType,
          explanation: {
            summary: 'High risk due to multiple factors',
            factors: [
              {
                factor: 'Competitive pressure',
                impact: 0.3,
                confidence: 0.8,
              },
            ],
            reasoning: 'The opportunity faces significant competitive pressure',
          },
          quality: {
            qualityId: 'quality-1',
            score: 0.85,
          },
        },
      });

      // Mock monitoring tracking
      const mockMonitoringContainer = (mockCosmosClient.database as any)().container();
      (mockMonitoringContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'view-1',
          tenantId,
          explanationId: 'explanation-1',
          userId: 'user-1',
          viewedAt: new Date(),
        },
      });

      const explanation = await explainableAIService.generateExplanation(
        tenantId,
        explanationRequest
      );

      expect(explanation).toBeDefined();
      expect(explanation.explanation).toBeDefined();
      expect(explanation.quality).toBeDefined();
      expect(explanation.quality.score).toBeGreaterThan(0);

      // Verify quality service was called
      expect(mockQualityContainer.items.create).toHaveBeenCalled();
    });

    it('should track explanation usage and update quality metrics', async () => {
      const tenantId = 'tenant-1';
      const explanationId = 'explanation-1';
      const userId = 'user-1';

      // Track view
      const mockMonitoringContainer = (mockCosmosClient.database as any)().container();
      (mockMonitoringContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'view-1',
          tenantId,
          explanationId,
          userId,
          viewedAt: new Date(),
        },
      });

      await explanationMonitoringService.trackView(
        tenantId,
        explanationId,
        userId
      );

      // Record feedback
      const mockQualityContainer = (mockCosmosClient.database as any)().container();
      (mockQualityContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'quality-1',
              explanationId,
              qualityScore: 0.85,
            },
          ],
        }),
      });

      (mockQualityContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'feedback-1',
          tenantId,
          explanationId,
          feedback: {
            helpful: true,
            clarity: 0.9,
            completeness: 0.8,
          },
        },
      });

      await explanationQualityService.recordFeedback(
        tenantId,
        explanationId,
        {
          helpful: true,
          clarity: 0.9,
          completeness: 0.8,
        }
      );

      // Get usage metrics
      (mockMonitoringContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'view-1',
              userId: 'user-1',
              viewedAt: new Date(),
            },
            {
              id: 'view-2',
              userId: 'user-2',
              viewedAt: new Date(),
            },
          ],
        }),
      });

      const metrics = await explanationMonitoringService.getUsageMetrics(
        tenantId,
        explanationId
      );

      expect(metrics).toBeDefined();
      expect(metrics.viewCount).toBeGreaterThan(0);
      expect(mockMonitoringContainer.items.create).toHaveBeenCalled();
      expect(mockQualityContainer.items.create).toHaveBeenCalled();
    });

    it('should identify gaps in explanation quality', async () => {
      const tenantId = 'tenant-1';
      const explanationId = 'explanation-1';

      const mockMonitoringContainer = (mockCosmosClient.database as any)().container();
      (mockMonitoringContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'view-1',
              userId: 'user-1',
              engagement: {
                timeSpent: 5, // Low engagement
                interactions: 0,
              },
            },
          ],
        }),
      });

      const mockQualityContainer = (mockCosmosClient.database as any)().container();
      (mockQualityContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'quality-1',
              qualityScore: 0.5, // Low quality
              factors: [
                {
                  factor: 'clarity',
                  score: 0.4,
                },
              ],
            },
          ],
        }),
      });

      (mockMonitoringContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'gap-1',
          tenantId,
          explanationId,
          gapType: 'clarity',
          severity: 'high',
          description: 'Explanation lacks clarity',
        },
      });

      const gap = await explanationMonitoringService.identifyGap(
        tenantId,
        explanationId
      );

      expect(gap).toBeDefined();
      expect(gap.gapType).toBeDefined();
      expect(gap.severity).toBeDefined();
    });
  });
});

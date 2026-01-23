/**
 * Explanation Monitoring Service Tests
 * Tests for explanation usage monitoring
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ExplanationMonitoringService } from '../../../src/services/explanation-monitoring.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { ExplanationQualityService } from '../../../src/services/explanation-quality.service.js';
import type { ExplainableAIService } from '../../../src/services/explainable-ai.service.js';

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

const mockExplanationQualityService = {
  getQualityMetrics: vi.fn(),
} as unknown as ExplanationQualityService;

const mockExplainableAIService = {
  generateExplanation: vi.fn(),
} as unknown as ExplainableAIService;

describe('ExplanationMonitoringService', () => {
  let service: ExplanationMonitoringService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ExplanationMonitoringService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockExplanationQualityService,
      mockExplainableAIService
    );
  });

  describe('trackView', () => {
    it('should track explanation view', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';
      const explanationId = 'exp-1';
      const responseId = 'resp-1';
      const metadata = { source: 'risk_analysis' };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'view-1',
          tenantId,
          userId,
          explanationId,
          responseId,
          viewedAt: new Date(),
          metadata,
        },
      });

      const result = await service.trackView(
        tenantId,
        userId,
        explanationId,
        responseId,
        metadata
      );

      expect(result).toBeDefined();
      expect(result.explanationId).toBe(explanationId);
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should track view without metadata', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';
      const explanationId = 'exp-1';
      const responseId = 'resp-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'view-1',
          tenantId,
          userId,
          explanationId,
          responseId,
          viewedAt: new Date(),
        },
      });

      const result = await service.trackView(tenantId, userId, explanationId, responseId);

      expect(result).toBeDefined();
      expect(result.explanationId).toBe(explanationId);
    });
  });

  describe('updateView', () => {
    it('should update view with duration and interactions', async () => {
      const viewId = 'view-1';
      const tenantId = 'tenant-1';
      const updates = {
        viewDuration: 120, // 2 minutes
        sectionsViewed: ['reasoning', 'sources'],
        interactions: [
          {
            type: 'expand' as const,
            timestamp: new Date(),
            section: 'reasoning',
          },
        ],
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            id: viewId,
            tenantId,
            explanationId: 'exp-1',
            viewedAt: new Date(),
          },
        }),
        replace: vi.fn().mockResolvedValue({
          resource: {
            id: viewId,
            ...updates,
          },
        }),
      });

      await service.updateView(viewId, tenantId, updates);

      expect(mockContainer.item).toHaveBeenCalled();
    });

    it('should handle missing view gracefully', async () => {
      const viewId = 'view-1';
      const tenantId = 'tenant-1';
      const updates = { viewDuration: 60 };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: null }),
      });

      await service.updateView(viewId, tenantId, updates);

      // Should not throw, just return
      expect(mockContainer.item).toHaveBeenCalled();
    });
  });

  describe('recordInteraction', () => {
    it('should record user interaction with explanation', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';
      const explanationId = 'exp-1';
      const interactionType = 'expand';
      const section = 'reasoning';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'view-1',
              tenantId,
              userId,
              explanationId,
              viewedAt: new Date(),
            },
          ],
        }),
      });
      (mockContainer.item as any).mockReturnValue({
        replace: vi.fn().mockResolvedValue({
          resource: {
            id: 'view-1',
            interactions: [
              {
                type: interactionType,
                timestamp: new Date(),
                section,
              },
            ],
          },
        }),
      });

      await service.recordInteraction(
        tenantId,
        userId,
        explanationId,
        interactionType,
        section
      );

      expect(mockContainer.items.query).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });
  });

  describe('getUsageMetrics', () => {
    it('should retrieve usage metrics for time range', async () => {
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
              id: 'view-1',
              explanationId: 'exp-1',
              viewDuration: 120,
              interactions: [
                { type: 'expand', timestamp: new Date(), section: 'reasoning' },
              ],
            },
            {
              id: 'view-2',
              explanationId: 'exp-2',
              viewDuration: 60,
              interactions: [],
            },
          ],
        }),
      });

      (mockExplanationQualityService.getQualityMetrics as any).mockResolvedValue({
        metrics: {
          avgQualityScore: 0.8,
          helpfulRate: 0.9,
        },
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'metrics-1',
          tenantId,
          userId,
          timeRange,
          usage: {
            totalViews: 2,
            uniqueExplanations: 2,
            avgViewDuration: 90,
            avgInteractionsPerView: 0.5,
          },
        },
      });

      const result = await service.getUsageMetrics(tenantId, timeRange, userId);

      expect(result).toBeDefined();
      expect(result.usage.totalViews).toBe(2);
      expect(result.usage.uniqueExplanations).toBe(2);
      expect(mockContainer.items.create).toHaveBeenCalled();
    });

    it('should calculate engagement metrics', async () => {
      const tenantId = 'tenant-1';
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'view-1',
              viewDuration: 300, // 5 minutes - deep engagement
              interactions: [
                { type: 'expand', timestamp: new Date() },
                { type: 'click_source', timestamp: new Date() },
              ],
            },
          ],
        }),
      });

      (mockExplanationQualityService.getQualityMetrics as any).mockResolvedValue({
        metrics: {
          avgQualityScore: 0.85,
          helpfulRate: 1.0,
        },
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'metrics-1',
          tenantId,
          engagement: {
            engagementScore: 0.9,
            deepEngagementRate: 1.0,
            bounceRate: 0.0,
          },
        },
      });

      const result = await service.getUsageMetrics(tenantId, timeRange);

      expect(result).toBeDefined();
      expect(result.engagement.engagementScore).toBeGreaterThan(0.5);
    });
  });

  describe('identifyGaps', () => {
    it('should identify explanation gaps', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';
      const query = 'What is the risk score?';
      const gapType = 'missing_explanation';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'gap-1',
          tenantId,
          userId,
          gapType,
          context: {
            query,
            requestedAt: new Date(),
          },
          frequency: 1,
          priority: 'medium',
        },
      });

      const result = await service.identifyGap(
        tenantId,
        userId,
        gapType,
        { query, requestedAt: new Date() }
      );

      expect(result).toBeDefined();
      expect(result.gapType).toBe(gapType);
      expect(mockContainer.items.create).toHaveBeenCalled();
    });
  });
});

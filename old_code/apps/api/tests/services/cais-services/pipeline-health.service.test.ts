/**
 * Pipeline Health Service Tests
 * Tests for comprehensive pipeline health scoring
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PipelineHealthService } from '../../../src/services/pipeline-health.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { PipelineAnalyticsService } from '../../../src/services/pipeline-analytics.service.js';
import type { RiskEvaluationService } from '../../../src/services/risk-evaluation.service.js';
import type { OpportunityService } from '../../../src/services/opportunity.service.js';

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

const mockPipelineAnalyticsService = {
  calculatePipelineMetrics: vi.fn(),
  organizeByRiskLevel: vi.fn(),
} as unknown as PipelineAnalyticsService;

const mockRiskEvaluationService = {
  evaluateRisk: vi.fn(),
} as unknown as RiskEvaluationService;

const mockOpportunityService = {
  listOwnedOpportunities: vi.fn(),
} as unknown as OpportunityService;

describe('PipelineHealthService', () => {
  let service: PipelineHealthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PipelineHealthService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockPipelineAnalyticsService,
      mockRiskEvaluationService,
      mockOpportunityService
    );
  });

  describe('calculateHealth', () => {
    it('should calculate comprehensive pipeline health score', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';

      (mockPipelineAnalyticsService.calculatePipelineMetrics as any).mockResolvedValue({
        totalValue: 2000000,
        opportunityCount: 20,
        avgStageDuration: 30,
      });

      (mockPipelineAnalyticsService.organizeByRiskLevel as any).mockResolvedValue({
        high: { count: 2, value: 200000 },
        medium: { count: 5, value: 500000 },
        low: { count: 13, value: 1300000 },
      });

      (mockOpportunityService.listOwnedOpportunities as any).mockResolvedValue({
        opportunities: [
          {
            id: 'opp-1',
            structuredData: {
              stage: 'proposal',
              amount: 100000,
              riskEvaluation: { overallRisk: 0.3 },
            },
          },
        ],
      });

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'health-1',
          tenantId,
          userId,
          overallScore: 75,
          status: 'healthy',
          scoreBreakdown: {
            stage: 80,
            velocity: 70,
            coverage: 75,
            quality: 80,
            risk: 70,
          },
        },
      });

      const result = await service.calculateHealth(tenantId, userId);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.status).toBeDefined();
      expect(result.scoreBreakdown).toBeDefined();
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should identify critical health issues', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';

      (mockPipelineAnalyticsService.calculatePipelineMetrics as any).mockResolvedValue({
        totalValue: 500000,
        opportunityCount: 5,
        avgStageDuration: 120, // Very long
      });

      (mockPipelineAnalyticsService.organizeByRiskLevel as any).mockResolvedValue({
        high: { count: 4, value: 400000 },
        medium: { count: 1, value: 100000 },
        low: { count: 0, value: 0 },
      });

      (mockOpportunityService.listOwnedOpportunities as any).mockResolvedValue({
        opportunities: [],
      });

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'health-1',
          tenantId,
          userId,
          overallScore: 30,
          status: 'critical',
          scoreBreakdown: {
            stage: 20,
            velocity: 10,
            coverage: 40,
            quality: 30,
            risk: 50,
          },
          recommendations: [
            {
              type: 'velocity',
              priority: 'high',
              description: 'Address velocity bottlenecks',
              expectedImpact: 'Improve velocity score by 30%',
            },
          ],
        },
      });

      const result = await service.calculateHealth(tenantId, userId);

      expect(result).toBeDefined();
      expect(result.status).toBe('critical');
      expect(result.overallScore).toBeLessThan(50);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate stage health breakdown', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';

      (mockPipelineAnalyticsService.calculatePipelineMetrics as any).mockResolvedValue({
        totalValue: 2000000,
        opportunityCount: 20,
      });

      (mockPipelineAnalyticsService.organizeByRiskLevel as any).mockResolvedValue({
        high: { count: 2, value: 200000 },
        medium: { count: 5, value: 500000 },
        low: { count: 13, value: 1300000 },
      });

      (mockOpportunityService.listOwnedOpportunities as any).mockResolvedValue({
        opportunities: [
          {
            id: 'opp-1',
            structuredData: {
              stage: 'proposal',
              amount: 100000,
              createdAt: new Date('2024-01-01'),
            },
          },
          {
            id: 'opp-2',
            structuredData: {
              stage: 'negotiation',
              amount: 150000,
              createdAt: new Date('2024-01-15'),
            },
          },
        ],
      });

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'health-1',
          tenantId,
          userId,
          overallScore: 75,
          stageHealth: [
            {
              stage: 'proposal',
              score: 80,
              opportunities: 1,
              value: 100000,
              averageAge: 30,
              issues: [],
            },
            {
              stage: 'negotiation',
              score: 70,
              opportunities: 1,
              value: 150000,
              averageAge: 15,
              issues: ['long_duration'],
            },
          ],
        },
      });

      const result = await service.calculateHealth(tenantId, userId);

      expect(result).toBeDefined();
      expect(result.stageHealth).toBeDefined();
      expect(result.stageHealth.length).toBeGreaterThan(0);
    });

    it('should calculate coverage health', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';

      (mockPipelineAnalyticsService.calculatePipelineMetrics as any).mockResolvedValue({
        totalValue: 2000000,
        opportunityCount: 20,
      });

      (mockPipelineAnalyticsService.organizeByRiskLevel as any).mockResolvedValue({
        high: { count: 2, value: 200000 },
        medium: { count: 5, value: 500000 },
        low: { count: 13, value: 1300000 },
      });

      (mockOpportunityService.listOwnedOpportunities as any).mockResolvedValue({
        opportunities: [],
      });

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'health-1',
          tenantId,
          userId,
          overallScore: 75,
          coverageHealth: {
            coverageRatio: 2.0, // 2x quota
            monthsCoverage: 6,
            score: 85,
            recommendations: ['Maintain current pipeline coverage'],
          },
        },
      });

      const result = await service.calculateHealth(tenantId, userId);

      expect(result).toBeDefined();
      expect(result.coverageHealth).toBeDefined();
      expect(result.coverageHealth.coverageRatio).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';

      (mockPipelineAnalyticsService.calculatePipelineMetrics as any).mockRejectedValue(
        new Error('Service error')
      );

      await expect(
        service.calculateHealth(tenantId, userId)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

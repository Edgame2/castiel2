/**
 * Pipeline Health Integration Tests
 * Tests integration between PipelineAnalyticsService and PipelineHealthService
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PipelineAnalyticsService } from '../../../../src/services/pipeline-analytics.service.js';
import { PipelineHealthService } from '../../../../src/services/pipeline-health.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { RiskEvaluationService } from '../../../../src/services/risk-evaluation.service.js';
import type { OpportunityService } from '../../../../src/services/opportunity.service.js';

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

const mockRiskEvaluationService = {
  evaluateRisk: vi.fn(),
} as unknown as RiskEvaluationService;

const mockOpportunityService = {
  listOwnedOpportunities: vi.fn(),
} as unknown as OpportunityService;

describe('Pipeline Health Integration', () => {
  let pipelineAnalyticsService: PipelineAnalyticsService;
  let pipelineHealthService: PipelineHealthService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize services
    pipelineAnalyticsService = new PipelineAnalyticsService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockRiskEvaluationService,
      mockOpportunityService
    );

    pipelineHealthService = new PipelineHealthService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      pipelineAnalyticsService,
      mockRiskEvaluationService,
      mockOpportunityService
    );
  });

  describe('Pipeline Health Calculation with Analytics', () => {
    it('should calculate health using pipeline analytics', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';

      // Mock pipeline metrics
      (pipelineAnalyticsService.calculatePipelineMetrics as any).mockResolvedValue({
        totalValue: 2000000,
        opportunityCount: 20,
        avgStageDuration: 30,
        byStage: [
          {
            stage: 'proposal',
            count: 5,
            value: 500000,
            avgAge: 20,
          },
          {
            stage: 'negotiation',
            count: 3,
            value: 300000,
            avgAge: 15,
          },
        ],
      });

      (pipelineAnalyticsService.organizeByRiskLevel as any).mockResolvedValue({
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

      const mockHealthContainer = (mockCosmosClient.database as any)().container();
      (mockHealthContainer.items.create as any).mockResolvedValue({
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
          stageHealth: [
            {
              stage: 'proposal',
              score: 80,
              opportunities: 5,
              value: 500000,
              averageAge: 20,
              issues: [],
            },
          ],
        },
      });

      const health = await pipelineHealthService.calculateHealth(tenantId, userId);

      expect(health).toBeDefined();
      expect(health.overallScore).toBeGreaterThan(0);
      expect(health.scoreBreakdown).toBeDefined();
      expect(health.stageHealth).toBeDefined();
      expect(pipelineAnalyticsService.calculatePipelineMetrics).toHaveBeenCalled();
      expect(pipelineAnalyticsService.organizeByRiskLevel).toHaveBeenCalled();
    });

    it('should identify critical health issues', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';

      // Mock poor pipeline metrics
      (pipelineAnalyticsService.calculatePipelineMetrics as any).mockResolvedValue({
        totalValue: 500000,
        opportunityCount: 5,
        avgStageDuration: 120, // Very long
      });

      (pipelineAnalyticsService.organizeByRiskLevel as any).mockResolvedValue({
        high: { count: 4, value: 400000 },
        medium: { count: 1, value: 100000 },
        low: { count: 0, value: 0 },
      });

      (mockOpportunityService.listOwnedOpportunities as any).mockResolvedValue({
        opportunities: [],
      });

      const mockHealthContainer = (mockCosmosClient.database as any)().container();
      (mockHealthContainer.items.create as any).mockResolvedValue({
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
            },
          ],
        },
      });

      const health = await pipelineHealthService.calculateHealth(tenantId, userId);

      expect(health).toBeDefined();
      expect(health.status).toBe('critical');
      expect(health.overallScore).toBeLessThan(50);
      expect(health.recommendations.length).toBeGreaterThan(0);
    });
  });
});

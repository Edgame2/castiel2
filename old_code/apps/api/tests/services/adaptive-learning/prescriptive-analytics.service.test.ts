/**
 * Prescriptive Analytics Service Tests
 * Tests for actionable recommendation generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrescriptiveAnalyticsService } from '../../../src/services/prescriptive-analytics.service';
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
} as unknown as Redis;

const mockRiskEvaluationService = {
  evaluateOpportunity: vi.fn().mockResolvedValue({
    riskScore: 0.7,
    risks: [
      {
        id: 'risk-1',
        category: 'financial',
        confidence: 0.8,
        description: 'High financial risk',
      },
    ],
  }),
} as any;

const mockCausalInferenceService = {
  analyzeOpportunity: vi.fn().mockResolvedValue({
    opportunityId: 'opp-1',
    tenantId: 'tenant-1',
    factors: [
      {
        factor: 'stage',
        value: 'proposal',
        causalImpact: 0.6,
        confidence: 0.8,
      },
    ],
    recommendations: [
      {
        action: 'Advance to negotiation',
        expectedImpact: 0.7,
        priority: 'high',
        rationale: 'Proposal stage has positive impact',
      },
    ],
  }),
} as any;

const mockRecommendationsService = {
  getRecommendations: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'rec-1',
        title: 'Follow best practice',
        description: 'Recommended approach',
        score: 0.8,
      },
    ],
  }),
} as any;

describe('PrescriptiveAnalyticsService', () => {
  let service: PrescriptiveAnalyticsService;
  const tenantId = 'tenant-1';
  const opportunityId = 'opp-1';
  const userId = 'user-1';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PrescriptiveAnalyticsService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockRiskEvaluationService,
      mockCausalInferenceService,
      mockRecommendationsService
    );
  });

  describe('generateActionPlan', () => {
    it('should generate comprehensive action plan', async () => {
      const plan = await service.generateActionPlan(opportunityId, tenantId, userId);

      expect(plan).toBeDefined();
      expect(plan.planId).toBeDefined();
      expect(plan.tenantId).toBe(tenantId);
      expect(plan.opportunityId).toBe(opportunityId);
      expect(plan.actions).toBeDefined();
      expect(Array.isArray(plan.actions)).toBe(true);
      expect(plan.overallImpact).toBeDefined();
    });

    it('should include risk-based actions', async () => {
      const plan = await service.generateActionPlan(opportunityId, tenantId, userId);

      const riskActions = plan.actions.filter((a) => a.category === 'risk_mitigation');
      expect(riskActions.length).toBeGreaterThan(0);
    });

    it('should include causal-based actions', async () => {
      const plan = await service.generateActionPlan(opportunityId, tenantId, userId);

      const causalActions = plan.actions.filter(
        (a) => a.category === 'opportunity_optimization'
      );
      expect(causalActions.length).toBeGreaterThan(0);
    });

    it('should include recommendation-based actions', async () => {
      const plan = await service.generateActionPlan(opportunityId, tenantId, userId);

      const recActions = plan.actions.filter(
        (a) => a.category === 'opportunity_optimization'
      );
      expect(recActions.length).toBeGreaterThan(0);
    });

    it('should sort actions by priority and impact', async () => {
      const plan = await service.generateActionPlan(opportunityId, tenantId, userId);

      if (plan.actions.length > 1) {
        const priorities = ['critical', 'high', 'medium', 'low'];
        for (let i = 0; i < plan.actions.length - 1; i++) {
          const currentPriority = priorities.indexOf(plan.actions[i].priority);
          const nextPriority = priorities.indexOf(plan.actions[i + 1].priority);
          
          if (currentPriority === nextPriority) {
            // If same priority, should be sorted by impact
            expect(plan.actions[i].expectedImpact.improvement).toBeGreaterThanOrEqual(
              plan.actions[i + 1].expectedImpact.improvement
            );
          } else {
            expect(currentPriority).toBeLessThanOrEqual(nextPriority);
          }
        }
      }
    });

    it('should calculate overall impact', async () => {
      const plan = await service.generateActionPlan(opportunityId, tenantId, userId);

      expect(plan.overallImpact.expectedImprovement).toBeGreaterThanOrEqual(0);
      expect(plan.overallImpact.expectedImprovement).toBeLessThanOrEqual(1);
      expect(plan.overallImpact.confidence).toBeDefined();
      expect(plan.overallImpact.timeToValue).toBeDefined();
    });

    it('should save plan to Cosmos DB', async () => {
      await service.generateActionPlan(opportunityId, tenantId, userId);

      expect(mockCosmosClient.database().container().items.create).toHaveBeenCalled();
    });
  });

  describe('getActionPlan', () => {
    it('should retrieve existing action plan', async () => {
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              planId: 'plan-1',
              tenantId,
              opportunityId,
              actions: [],
              overallImpact: {
                expectedImprovement: 0.7,
                confidence: 0.8,
                timeToValue: '2 weeks',
              },
              generatedAt: new Date(),
            },
          ],
        }),
      });

      const plan = await service.getActionPlan(opportunityId, tenantId);

      expect(plan).toBeDefined();
      expect(plan?.planId).toBe('plan-1');
      expect(plan?.opportunityId).toBe(opportunityId);
    });

    it('should return null when no plan exists', async () => {
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      });

      const plan = await service.getActionPlan(opportunityId, tenantId);

      expect(plan).toBeNull();
    });
  });

  describe('action generation', () => {
    it('should generate high-priority actions for critical risks', async () => {
      (mockRiskEvaluationService.evaluateOpportunity as any).mockResolvedValue({
        riskScore: 0.9,
        risks: [
          {
            id: 'risk-1',
            category: 'financial',
            confidence: 0.95, // Very high confidence
            description: 'Critical financial risk',
          },
        ],
      });

      const plan = await service.generateActionPlan(opportunityId, tenantId, userId);

      const criticalActions = plan.actions.filter((a) => a.priority === 'critical');
      expect(criticalActions.length).toBeGreaterThan(0);
    });

    it('should include steps for each action', async () => {
      const plan = await service.generateActionPlan(opportunityId, tenantId, userId);

      if (plan.actions.length > 0) {
        expect(plan.actions[0].steps).toBeDefined();
        expect(Array.isArray(plan.actions[0].steps)).toBe(true);
        expect(plan.actions[0].steps.length).toBeGreaterThan(0);
      }
    });

    it('should include expected impact for each action', async () => {
      const plan = await service.generateActionPlan(opportunityId, tenantId, userId);

      plan.actions.forEach((action) => {
        expect(action.expectedImpact).toBeDefined();
        expect(action.expectedImpact.metric).toBeDefined();
        expect(action.expectedImpact.improvement).toBeGreaterThanOrEqual(0);
        expect(action.expectedImpact.improvement).toBeLessThanOrEqual(1);
        expect(action.expectedImpact.confidence).toBeDefined();
      });
    });
  });

  describe('error handling', () => {
    it('should handle missing risk evaluation service gracefully', async () => {
      const serviceWithoutRisk = new PrescriptiveAnalyticsService(
        mockCosmosClient,
        mockRedis,
        mockMonitoring,
        undefined, // No risk service
        mockCausalInferenceService,
        mockRecommendationsService
      );

      const plan = await serviceWithoutRisk.generateActionPlan(
        opportunityId,
        tenantId,
        userId
      );

      expect(plan).toBeDefined();
      // Should still generate plan without risk actions
    });

    it('should handle missing causal inference service gracefully', async () => {
      const serviceWithoutCausal = new PrescriptiveAnalyticsService(
        mockCosmosClient,
        mockRedis,
        mockMonitoring,
        mockRiskEvaluationService,
        undefined, // No causal service
        mockRecommendationsService
      );

      const plan = await serviceWithoutCausal.generateActionPlan(
        opportunityId,
        tenantId,
        userId
      );

      expect(plan).toBeDefined();
      // Should still generate plan without causal actions
    });

    it('should handle Cosmos DB errors gracefully', async () => {
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockRejectedValue(new Error('Cosmos DB error')),
      });

      const plan = await service.getActionPlan(opportunityId, tenantId);

      expect(plan).toBeNull();
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

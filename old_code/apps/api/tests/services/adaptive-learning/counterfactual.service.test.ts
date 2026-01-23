/**
 * Counterfactual Service Tests
 * Tests for what-if scenario generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CounterfactualService } from '../../../src/services/counterfactual.service';
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
      item: vi.fn().mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: null }),
      }),
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
    risks: [],
  }),
} as any;

describe('CounterfactualService', () => {
  let service: CounterfactualService;
  const tenantId = 'tenant-1';
  const opportunityId = 'opp-1';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CounterfactualService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockRiskEvaluationService
    );
  });

  describe('generateCounterfactual', () => {
    it('should generate counterfactual scenario', async () => {
      const request = {
        opportunityId,
        tenantId,
        changes: {
          stage: 'negotiation',
          amount: 600000,
        },
        includeRiskAnalysis: true,
      };

      const scenario = await service.generateCounterfactual(request);

      expect(scenario).toBeDefined();
      expect(scenario.scenarioId).toBeDefined();
      expect(scenario.tenantId).toBe(tenantId);
      expect(scenario.opportunityId).toBe(opportunityId);
      expect(scenario.changes).toEqual(request.changes);
      expect(scenario.predictedOutcome).toBeDefined();
      expect(scenario.feasibility).toBeDefined();
      expect(scenario.confidence).toBeDefined();
    });

    it('should estimate feasibility of changes', async () => {
      const request = {
        opportunityId,
        tenantId,
        changes: {
          stage: 'negotiation', // Forward progression
          amount: 600000, // Increase
        },
      };

      const scenario = await service.generateCounterfactual(request);

      expect(scenario.feasibility).toBeGreaterThan(0);
      expect(scenario.feasibility).toBeLessThanOrEqual(1);
    });

    it('should predict outcome with changes', async () => {
      const request = {
        opportunityId,
        tenantId,
        changes: {
          stage: 'negotiation',
        },
        includeRiskAnalysis: true,
      };

      const scenario = await service.generateCounterfactual(request);

      expect(scenario.predictedOutcome).toBeDefined();
      expect(scenario.predictedOutcome.riskScore).toBeDefined();
      expect(scenario.predictedOutcome.winProbability).toBeDefined();
      expect(scenario.predictedOutcome.revenue).toBeDefined();
    });

    it('should save scenario to Cosmos DB', async () => {
      const request = {
        opportunityId,
        tenantId,
        changes: { stage: 'negotiation' },
      };

      await service.generateCounterfactual(request);

      expect(mockCosmosClient.database().container().items.create).toHaveBeenCalled();
    });

    it('should cache scenario in Redis', async () => {
      const request = {
        opportunityId,
        tenantId,
        changes: { stage: 'negotiation' },
      };

      await service.generateCounterfactual(request);

      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('estimateFeasibility', () => {
    it('should estimate lower feasibility for large amount increases', async () => {
      const feasibility = await (service as any).estimateFeasibility(
        { amount: 1000000 }, // Large increase
        opportunityId
      );

      expect(feasibility).toBeLessThan(1.0);
    });

    it('should estimate lower feasibility for timeline shortening', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() + 30);
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 7);

      const feasibility = await (service as any).estimateFeasibility(
        { closeDate: newDate },
        opportunityId
      );

      expect(feasibility).toBeLessThan(1.0);
    });

    it('should return feasibility between 0.1 and 1.0', async () => {
      const feasibility = await (service as any).estimateFeasibility(
        { stage: 'proposal' },
        opportunityId
      );

      expect(feasibility).toBeGreaterThanOrEqual(0.1);
      expect(feasibility).toBeLessThanOrEqual(1.0);
    });
  });

  describe('validateCounterfactual', () => {
    it('should validate scenario against actual outcome', async () => {
      const scenarioId = 'scenario-1';
      
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            scenarioId,
            tenantId,
            opportunityId,
            predictedOutcome: {
              winProbability: 0.8,
            },
          },
        }),
      });

      const validation = await service.validateCounterfactual(
        scenarioId,
        tenantId,
        'won' // Actual outcome
      );

      expect(validation).toBeDefined();
      expect(validation.validated).toBe(true);
      expect(validation.accuracy).toBeDefined();
      expect(validation.error).toBeDefined();
    });

    it('should calculate accuracy correctly', async () => {
      const scenarioId = 'scenario-1';
      
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            scenarioId,
            tenantId,
            opportunityId,
            predictedOutcome: {
              winProbability: 0.8, // Predicted win
            },
          },
        }),
      });

      // Actual outcome: won (matches prediction)
      const validation1 = await service.validateCounterfactual(
        scenarioId,
        tenantId,
        'won'
      );
      expect(validation1.accuracy).toBe(1.0); // Perfect match

      // Actual outcome: lost (doesn't match)
      const validation2 = await service.validateCounterfactual(
        scenarioId,
        tenantId,
        'lost'
      );
      expect(validation2.accuracy).toBe(0.0); // No match
    });

    it('should calculate prediction error', async () => {
      const scenarioId = 'scenario-1';
      
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            scenarioId,
            tenantId,
            opportunityId,
            predictedOutcome: {
              winProbability: 0.7, // 70% chance of win
            },
          },
        }),
      });

      const validation = await service.validateCounterfactual(
        scenarioId,
        tenantId,
        'won' // Actual: won (100%)
      );

      // Error = |0.7 - 1.0| = 0.3
      expect(validation.error).toBeCloseTo(0.3, 1);
    });

    it('should update scenario with validation results', async () => {
      const scenarioId = 'scenario-1';
      
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            scenarioId,
            tenantId,
            opportunityId,
            predictedOutcome: { winProbability: 0.8 },
          },
        }),
      });

      await service.validateCounterfactual(scenarioId, tenantId, 'won');

      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle missing scenario gracefully', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: null }),
      });

      const validation = await service.validateCounterfactual(
        'missing-scenario',
        tenantId,
        'won'
      );

      expect(validation.validated).toBe(false);
      expect(validation.accuracy).toBe(0);
    });

    it('should handle Cosmos DB errors gracefully', async () => {
      (mockCosmosClient.database().container().items.create as any).mockRejectedValue(
        new Error('Cosmos DB error')
      );

      const request = {
        opportunityId,
        tenantId,
        changes: { stage: 'negotiation' },
      };

      await expect(
        service.generateCounterfactual(request)
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should handle risk evaluation service errors gracefully', async () => {
      (mockRiskEvaluationService.evaluateOpportunity as any).mockRejectedValue(
        new Error('Risk evaluation error')
      );

      const request = {
        opportunityId,
        tenantId,
        changes: { stage: 'negotiation' },
        includeRiskAnalysis: true,
      };

      const scenario = await service.generateCounterfactual(request);

      expect(scenario).toBeDefined();
      // Should still generate scenario with default predictions
      expect(scenario.predictedOutcome).toBeDefined();
    });
  });
});

/**
 * Neuro-Symbolic Service Tests
 * Tests for hybrid neural-symbolic reasoning
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NeuroSymbolicService, NeuralPrediction } from '../../../src/services/neuro-symbolic.service';
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
        create: vi.fn().mockResolvedValue({ resource: {} }),
      },
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
} as unknown as Redis;

describe('NeuroSymbolicService', () => {
  let service: NeuroSymbolicService;
  const tenantId = 'tenant-1';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NeuroSymbolicService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );
  });

  describe('constrainedOptimization', () => {
    it('should apply constraints to neural predictions', async () => {
      const neuralPrediction: NeuralPrediction = {
        predictionId: 'pred-1',
        model: 'ml',
        value: 1.2, // Exceeds 1.0 (should be constrained)
        confidence: 0.9,
      };

      const context = {
        riskScore: 1.2,
      };

      const constrained = await service.constrainedOptimization(
        neuralPrediction,
        context,
        tenantId
      );

      expect(constrained).toBeDefined();
      expect(constrained.neuralPrediction).toEqual(neuralPrediction);
      expect(constrained.constraints).toBeDefined();
      expect(constrained.adjustedValue).toBeLessThanOrEqual(1.0); // Should be constrained
      expect(constrained.explanation).toBeDefined();
    });

    it('should apply multiple constraints', async () => {
      const neuralPrediction: NeuralPrediction = {
        predictionId: 'pred-1',
        model: 'ml',
        value: 0.8,
        confidence: 0.9,
      };

      const context = {
        riskScore: 0.8,
        winProbability: -0.1, // Below 0 (should be constrained)
      };

      const constrained = await service.constrainedOptimization(
        neuralPrediction,
        context,
        tenantId
      );

      expect(constrained.constraints.length).toBeGreaterThan(0);
      expect(constrained.adjustedValue).toBeGreaterThanOrEqual(0);
    });

    it('should reduce confidence when constraints violated', async () => {
      const neuralPrediction: NeuralPrediction = {
        predictionId: 'pred-1',
        model: 'ml',
        value: 1.2,
        confidence: 0.9,
      };

      const constrained = await service.constrainedOptimization(
        neuralPrediction,
        { riskScore: 1.2 },
        tenantId
      );

      // Confidence should be reduced due to constraint violations
      expect(constrained.confidence).toBeLessThan(neuralPrediction.confidence);
    });

    it('should generate symbolic explanation', async () => {
      const neuralPrediction: NeuralPrediction = {
        predictionId: 'pred-1',
        model: 'ml',
        value: 0.8,
        confidence: 0.9,
      };

      const constrained = await service.constrainedOptimization(
        neuralPrediction,
        { riskScore: 0.8 },
        tenantId
      );

      expect(constrained.explanation).toBeDefined();
      expect(typeof constrained.explanation).toBe('string');
      expect(constrained.explanation.length).toBeGreaterThan(0);
    });
  });

  describe('symbolicExplanation', () => {
    it('should generate explanation for neural prediction', async () => {
      const neuralPrediction: NeuralPrediction = {
        predictionId: 'pred-1',
        model: 'llm',
        value: 0.75,
        confidence: 0.85,
      };

      const context = {
        amount: 500000,
      };

      const explanation = await service.symbolicExplanation(neuralPrediction, context);

      expect(explanation).toBeDefined();
      expect(typeof explanation).toBe('string');
      expect(explanation.length).toBeGreaterThan(0);
    });

    it('should include rule names in explanation when applicable', async () => {
      const neuralPrediction: NeuralPrediction = {
        predictionId: 'pred-1',
        model: 'ml',
        value: 0.8,
        confidence: 0.9,
      };

      const context = {
        amount: 600000, // High value (should trigger explanation rule)
      };

      const explanation = await service.symbolicExplanation(neuralPrediction, context);

      expect(explanation).toBeDefined();
    });
  });

  describe('integrateKnowledge', () => {
    it('should integrate neural and symbolic knowledge', async () => {
      const neuralKnowledge = {
        patterns: {
          'high_value_risk': 0.8,
          'early_stage_nurture': 0.7,
        },
        weights: {
          'amount': 0.9,
          'stage': 0.8,
        },
      };

      const symbolicKnowledge = {
        rules: [
          {
            ruleId: 'rule-1',
            name: 'High Value Risk Explanation',
            condition: (ctx: any) => ctx.amount > 500000,
            action: (ctx: any) => ({ explanation: 'High value increases risk' }),
            priority: 5,
            category: 'explanation' as const,
          },
        ],
        domainFacts: {
          'default_probability': 0.5,
        },
      };

      const integration = await service.integrateKnowledge(
        tenantId,
        neuralKnowledge,
        symbolicKnowledge
      );

      expect(integration).toBeDefined();
      expect(integration.integrationId).toBeDefined();
      expect(integration.tenantId).toBe(tenantId);
      expect(integration.neuralKnowledge).toEqual(neuralKnowledge);
      expect(integration.symbolicKnowledge).toEqual(symbolicKnowledge);
      expect(integration.integrated.hybridRules).toBeDefined();
    });

    it('should create hybrid rules from neural patterns and symbolic rules', async () => {
      const neuralKnowledge = {
        patterns: {
          'high_value': 0.8,
        },
        weights: {},
      };

      const symbolicKnowledge = {
        rules: [
          {
            ruleId: 'rule-1',
            name: 'High Value Risk Explanation',
            condition: (ctx: any) => ctx.amount > 500000,
            action: (ctx: any) => ({}),
            priority: 5,
            category: 'explanation' as const,
          },
        ],
        domainFacts: {},
      };

      const integration = await service.integrateKnowledge(
        tenantId,
        neuralKnowledge,
        symbolicKnowledge
      );

      expect(integration.integrated.hybridRules.length).toBeGreaterThan(0);
      expect(integration.integrated.hybridRules[0].neuralComponent).toBeDefined();
      expect(integration.integrated.hybridRules[0].symbolicComponent).toBeDefined();
      expect(integration.integrated.hybridRules[0].confidence).toBeDefined();
    });

    it('should save integration to Cosmos DB', async () => {
      const integration = await service.integrateKnowledge(
        tenantId,
        { patterns: {}, weights: {} },
        { rules: [], domainFacts: {} }
      );

      expect(mockCosmosClient.database().container().items.create).toHaveBeenCalled();
    });
  });

  describe('default rules', () => {
    it('should have default constraint rules', () => {
      const rules = (service as any).rules;

      expect(rules.length).toBeGreaterThan(0);
      
      const constraintRules = rules.filter((r: any) => r.category === 'constraint');
      expect(constraintRules.length).toBeGreaterThan(0);
    });

    it('should have default explanation rules', () => {
      const rules = (service as any).rules;

      const explanationRules = rules.filter((r: any) => r.category === 'explanation');
      expect(explanationRules.length).toBeGreaterThan(0);
    });

    it('should apply maximum risk constraint', async () => {
      const neuralPrediction: NeuralPrediction = {
        predictionId: 'pred-1',
        model: 'ml',
        value: 1.5, // Exceeds 1.0
        confidence: 0.9,
      };

      const constrained = await service.constrainedOptimization(
        neuralPrediction,
        { riskScore: 1.5 },
        tenantId
      );

      expect(constrained.adjustedValue).toBeLessThanOrEqual(1.0);
    });

    it('should apply probability range constraint', async () => {
      const neuralPrediction: NeuralPrediction = {
        predictionId: 'pred-1',
        model: 'ml',
        value: 0.5,
        confidence: 0.9,
      };

      const constrained = await service.constrainedOptimization(
        neuralPrediction,
        { winProbability: -0.1 }, // Below 0
        tenantId
      );

      // Should adjust to valid range
      expect(constrained.adjustedValue).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle rule evaluation errors gracefully', async () => {
      const neuralPrediction: NeuralPrediction = {
        predictionId: 'pred-1',
        model: 'ml',
        value: 0.8,
        confidence: 0.9,
      };

      const context = {
        invalid: undefined, // May cause rule evaluation error
      };

      await expect(
        service.constrainedOptimization(neuralPrediction, context, tenantId)
      ).resolves.not.toThrow();
    });

    it('should handle Cosmos DB errors gracefully', async () => {
      (mockCosmosClient.database().container().items.create as any).mockRejectedValue(
        new Error('Cosmos DB error')
      );

      await expect(
        service.integrateKnowledge(
          tenantId,
          { patterns: {}, weights: {} },
          { rules: [], domainFacts: {} }
        )
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

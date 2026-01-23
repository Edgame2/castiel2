/**
 * Causal Inference Service Tests
 * Tests for causal relationship discovery
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CausalInferenceService } from '../../../src/services/causal-inference.service';
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

describe('CausalInferenceService', () => {
  let service: CausalInferenceService;
  const tenantId = 'tenant-1';
  const opportunityId = 'opp-1';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CausalInferenceService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );
  });

  describe('discoverCausalRelationships', () => {
    it('should discover causal relationships from historical data', async () => {
      const relationships = await service.discoverCausalRelationships(tenantId);

      expect(relationships).toBeDefined();
      expect(Array.isArray(relationships)).toBe(true);
    });

    it('should discover relationships for specific factors', async () => {
      const relationships = await service.discoverCausalRelationships(tenantId, {
        factors: ['stage', 'amount'],
      });

      expect(relationships).toBeDefined();
      relationships.forEach((rel) => {
        expect(['stage', 'amount']).toContain(rel.cause.factor);
      });
    });

    it('should include statistical evidence', async () => {
      const relationships = await service.discoverCausalRelationships(tenantId);

      if (relationships.length > 0) {
        const rel = relationships[0];
        expect(rel.evidence).toBeDefined();
        expect(rel.evidence.sampleSize).toBeGreaterThan(0);
        expect(rel.evidence.correlation).toBeDefined();
        expect(rel.confidence).toBeDefined();
      }
    });

    it('should save discovered relationships', async () => {
      await service.discoverCausalRelationships(tenantId);

      expect(mockCosmosClient.database().container().items.create).toHaveBeenCalled();
    });
  });

  describe('analyzeOpportunity', () => {
    it('should analyze causal factors for opportunity', async () => {
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              relationshipId: 'rel-1',
              cause: { factor: 'stage', value: 'proposal' },
              effect: { outcome: 'win_probability', direction: 'positive', strength: 0.6 },
              confidence: 0.8,
            },
          ],
        }),
      });

      const analysis = await service.analyzeOpportunity(opportunityId, tenantId);

      expect(analysis).toBeDefined();
      expect(analysis.opportunityId).toBe(opportunityId);
      expect(analysis.tenantId).toBe(tenantId);
      expect(analysis.factors).toBeDefined();
      expect(Array.isArray(analysis.factors)).toBe(true);
      expect(analysis.recommendations).toBeDefined();
    });

    it('should calculate causal impact for each factor', async () => {
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              relationshipId: 'rel-1',
              cause: { factor: 'stage', value: 'proposal' },
              effect: { outcome: 'win_probability', direction: 'positive', strength: 0.6 },
              confidence: 0.8,
            },
          ],
        }),
      });

      const analysis = await service.analyzeOpportunity(opportunityId, tenantId);

      if (analysis.factors.length > 0) {
        expect(analysis.factors[0].causalImpact).toBeDefined();
        expect(analysis.factors[0].confidence).toBeDefined();
      }
    });

    it('should generate recommendations based on negative impacts', async () => {
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              relationshipId: 'rel-1',
              cause: { factor: 'risk_score', value: 'high' },
              effect: { outcome: 'win_probability', direction: 'negative', strength: 0.7 },
              confidence: 0.9,
            },
          ],
        }),
      });

      const analysis = await service.analyzeOpportunity(opportunityId, tenantId);

      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.recommendations[0].priority).toBe('high'); // High strength = high priority
    });
  });

  describe('validateRelationship', () => {
    it('should validate relationship with counterfactual evidence', async () => {
      const relationshipId = 'rel-1';
      
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            relationshipId,
            tenantId,
            cause: { factor: 'stage' },
            effect: { outcome: 'win_probability', direction: 'positive', strength: 0.6 },
            confidence: 0.7,
            evidence: {
              sampleSize: 100,
              correlation: 0.65,
              pValue: 0.01,
            },
          },
        }),
      });

      const validated = await service.validateRelationship(
        relationshipId,
        tenantId,
        0.8 // Counterfactual support
      );

      expect(validated).toBeDefined();
      if (validated) {
        expect(validated.validatedAt).toBeDefined();
        expect(validated.evidence.counterfactualSupport).toBe(0.8);
        expect(validated.confidence).toBeGreaterThan(0.7); // Should increase with counterfactual support
      }
    });

    it('should recalculate confidence with counterfactual support', async () => {
      const relationshipId = 'rel-1';
      
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            relationshipId,
            tenantId,
            confidence: 0.7,
            evidence: {
              correlation: 0.65,
              pValue: 0.01,
            },
          },
        }),
      });

      const validated = await service.validateRelationship(
        relationshipId,
        tenantId,
        0.9 // High counterfactual support
      );

      if (validated) {
        // Confidence should increase with high counterfactual support
        expect(validated.confidence).toBeGreaterThan(0.7);
      }
    });
  });

  describe('error handling', () => {
    it('should handle missing relationships gracefully', async () => {
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      });

      const analysis = await service.analyzeOpportunity(opportunityId, tenantId);

      expect(analysis).toBeDefined();
      expect(analysis.factors).toEqual([]);
      expect(analysis.recommendations).toEqual([]);
    });

    it('should handle Cosmos DB errors gracefully', async () => {
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockRejectedValue(new Error('Cosmos DB error')),
      });

      const relationships = await service.discoverCausalRelationships(tenantId);

      expect(relationships).toBeDefined();
      // Should return placeholder relationships on error
      expect(Array.isArray(relationships)).toBe(true);
    });

    it('should handle missing relationship for validation', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: null }),
      });

      const validated = await service.validateRelationship(
        'missing-rel',
        tenantId,
        0.8
      );

      expect(validated).toBeNull();
    });
  });
});

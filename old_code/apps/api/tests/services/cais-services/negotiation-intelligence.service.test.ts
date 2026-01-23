/**
 * Negotiation Intelligence Service Tests
 * Tests for negotiation support and intelligence
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NegotiationIntelligenceService } from '../../../src/services/negotiation-intelligence.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { RiskEvaluationService } from '../../../src/services/risk-evaluation.service.js';
import type { CommunicationAnalysisService } from '../../../src/services/communication-analysis.service.js';

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

const mockCommunicationAnalysisService = {
  analyzeEmail: vi.fn(),
} as unknown as CommunicationAnalysisService;

describe('NegotiationIntelligenceService', () => {
  let service: NegotiationIntelligenceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NegotiationIntelligenceService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockRiskEvaluationService,
      mockCommunicationAnalysisService
    );
  });

  describe('analyzeNegotiation', () => {
    it('should analyze negotiation and recommend strategy', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const negotiationData = {
        currentProposal: {
          value: 100000,
          terms: { duration: 12, paymentTerms: 'annual' },
          structure: 'annual_contract',
        },
        competitorProposals: [
          {
            competitor: 'Competitor A',
            value: 95000,
            terms: { duration: 12 },
          },
        ],
        customerBudget: 120000,
        timeline: 'urgent',
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'analysis-1',
          tenantId,
          opportunityId,
          strategy: {
            recommended: 'collaborative',
            confidence: 0.8,
            reasoning: 'Customer has budget flexibility, collaborative approach recommended',
            alternatives: [
              {
                strategy: 'competitive',
                score: 0.6,
                pros: ['Faster closure'],
                cons: ['May damage relationship'],
              },
            ],
          },
          counterProposal: {
            suggested: {
              value: 105000,
              terms: { duration: 12, paymentTerms: 'annual' },
              rationale: 'Slight increase maintains competitive position',
            },
            alternatives: [
              {
                value: 110000,
                terms: { duration: 24 },
                winProbability: 0.7,
                risk: 0.3,
              },
            ],
          },
        },
      });

      const result = await service.analyzeNegotiation(tenantId, opportunityId, negotiationData);

      expect(result).toBeDefined();
      expect(result.strategy.recommended).toBeDefined();
      expect(result.counterProposal).toBeDefined();
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should recommend competitive strategy for urgent deals', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const negotiationData = {
        currentProposal: {
          value: 100000,
          terms: {},
          structure: 'annual_contract',
        },
        timeline: 'urgent',
        competitorProposals: [
          {
            competitor: 'Competitor A',
            value: 90000,
            terms: {},
          },
        ],
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'analysis-1',
          tenantId,
          opportunityId,
          strategy: {
            recommended: 'competitive',
            confidence: 0.85,
            reasoning: 'Urgent timeline requires competitive approach',
          },
        },
      });

      const result = await service.analyzeNegotiation(tenantId, opportunityId, negotiationData);

      expect(result).toBeDefined();
      expect(result.strategy.recommended).toBe('competitive');
    });

    it('should analyze deal structure optimization', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const negotiationData = {
        currentProposal: {
          value: 100000,
          terms: { duration: 12 },
          structure: 'annual_contract',
        },
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'analysis-1',
          tenantId,
          opportunityId,
          dealStructure: {
            optimal: {
              structure: 'multi_year_contract',
              value: 280000, // 3-year contract
              terms: { duration: 36 },
              benefits: ['Higher total value', 'Long-term commitment'],
            },
            alternatives: [
              {
                structure: 'annual_contract',
                value: 100000,
                terms: { duration: 12 },
                score: 0.7,
              },
            ],
          },
        },
      });

      const result = await service.analyzeNegotiation(tenantId, opportunityId, negotiationData);

      expect(result).toBeDefined();
      expect(result.dealStructure.optimal).toBeDefined();
      expect(result.dealStructure.optimal.value).toBeGreaterThan(100000);
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const negotiationData = {
        currentProposal: {
          value: 100000,
          terms: {},
          structure: 'annual_contract',
        },
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockRejectedValue(new Error('Database error'));

      await expect(
        service.analyzeNegotiation(tenantId, opportunityId, negotiationData)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });

  describe('recordOutcome', () => {
    it('should record negotiation outcome for learning', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const outcome = {
        strategy: 'collaborative' as const,
        initialProposal: {
          value: 100000,
          terms: { duration: 12 },
        },
        finalProposal: {
          value: 105000,
          terms: { duration: 12 },
        },
        outcome: 'won' as const,
        finalValue: 105000,
        negotiationDuration: 14, // days
        keyFactors: ['Price flexibility', 'Relationship strength'],
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'outcome-1',
          tenantId,
          opportunityId,
          ...outcome,
          recordedAt: new Date(),
        },
      });

      const result = await service.recordOutcome(tenantId, opportunityId, outcome);

      expect(result).toBeDefined();
      expect(result.outcome).toBe('won');
      expect(mockContainer.items.create).toHaveBeenCalled();
    });
  });
});

/**
 * Competitive Intelligence Service Tests
 * Tests for competitive intelligence and analysis
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CompetitiveIntelligenceService } from '../../../src/services/competitive-intelligence.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { SocialSignalService } from '../../../src/services/social-signal.service.js';
import type { RiskEvaluationService } from '../../../src/services/risk-evaluation.service.js';

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

const mockSocialSignalService = {
  getOpportunitySignals: vi.fn(),
} as unknown as SocialSignalService;

const mockRiskEvaluationService = {
  evaluateRisk: vi.fn(),
} as unknown as RiskEvaluationService;

describe('CompetitiveIntelligenceService', () => {
  let service: CompetitiveIntelligenceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CompetitiveIntelligenceService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockSocialSignalService,
      mockRiskEvaluationService
    );
  });

  describe('analyzeCompetition', () => {
    it('should analyze competitive intelligence', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const competitorData = {
        competitor: 'Competitor A',
        position: 'leading' as const,
        strengths: ['Lower price', 'Faster implementation'],
        weaknesses: ['Limited features', 'Poor support'],
        differentiators: ['Price advantage'],
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              opportunityId: 'opp-2',
              outcome: 'lost',
              competitor: 'Competitor A',
              finalValue: 90000,
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'intelligence-1',
          tenantId,
          opportunityId,
          competitor: {
            name: 'Competitor A',
            position: 'leading',
            strengths: competitorData.strengths,
            weaknesses: competitorData.weaknesses,
            differentiators: competitorData.differentiators,
          },
          analysis: {
            winProbability: 0.4,
            threatLevel: 'high',
            keyFactors: [
              {
                factor: 'price_advantage',
                impact: 'negative',
                score: 0.8,
              },
            ],
          },
          winLoss: {
            historical: {
              wins: 2,
              losses: 5,
              winRate: 0.29,
            },
            patterns: [
              {
                pattern: 'Price-sensitive deals',
                frequency: 3,
                impact: 'negative',
              },
            ],
          },
        },
      });

      const result = await service.analyzeCompetition(tenantId, opportunityId, competitorData);

      expect(result).toBeDefined();
      expect(result.competitor.name).toBe('Competitor A');
      expect(result.analysis.winProbability).toBeLessThan(0.5);
      expect(result.analysis.threatLevel).toBe('high');
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should detect competitive threats', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const competitorData = {
        competitor: 'Competitor B',
        position: 'competitive' as const,
        strengths: ['Strong brand', 'Market leader'],
        weaknesses: [],
        differentiators: [],
      };

      (mockSocialSignalService.getOpportunitySignals as any).mockResolvedValue([
        {
          id: 'signal-1',
          source: 'news',
          signalType: 'risk',
          content: {
            title: 'Competitor announces new product',
            description: 'Competitor B launches competitive product',
            publishedAt: new Date(),
          },
          impact: {
            level: 'high',
            description: 'New competitive threat',
          },
        },
      ]);

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'intelligence-1',
          tenantId,
          opportunityId,
          competitor: competitorData,
          analysis: {
            winProbability: 0.5,
            threatLevel: 'high',
          },
        },
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'threat-1',
          tenantId,
          opportunityId,
          competitor: 'Competitor B',
          threatLevel: 'high',
          description: 'New product launch increases competitive threat',
          indicators: ['recent_product_launch', 'market_leader'],
          recommendedActions: [
            'Emphasize unique differentiators',
            'Highlight customer success stories',
          ],
        },
      });

      const result = await service.analyzeCompetition(tenantId, opportunityId, competitorData);

      expect(result).toBeDefined();
      expect(result.analysis.threatLevel).toBe('high');
    });

    it('should analyze win/loss patterns', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const competitorData = {
        competitor: 'Competitor C',
        position: 'trailing' as const,
        strengths: [],
        weaknesses: ['Limited features'],
        differentiators: [],
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              opportunityId: 'opp-3',
              outcome: 'won',
              competitor: 'Competitor C',
              finalValue: 100000,
            },
            {
              opportunityId: 'opp-4',
              outcome: 'won',
              competitor: 'Competitor C',
              finalValue: 120000,
            },
            {
              opportunityId: 'opp-5',
              outcome: 'won',
              competitor: 'Competitor C',
              finalValue: 95000,
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'intelligence-1',
          tenantId,
          opportunityId,
          competitor: competitorData,
          winLoss: {
            historical: {
              wins: 3,
              losses: 0,
              winRate: 1.0,
            },
            patterns: [
              {
                pattern: 'Feature advantage',
                frequency: 3,
                impact: 'positive',
              },
            ],
          },
        },
      });

      const result = await service.analyzeCompetition(tenantId, opportunityId, competitorData);

      expect(result).toBeDefined();
      expect(result.winLoss.historical.winRate).toBe(1.0);
    });

    it('should generate competitive recommendations', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const competitorData = {
        competitor: 'Competitor A',
        position: 'leading' as const,
        strengths: ['Lower price'],
        weaknesses: ['Limited features'],
        differentiators: [],
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'intelligence-1',
          tenantId,
          opportunityId,
          competitor: competitorData,
          recommendations: [
            {
              type: 'differentiate',
              priority: 'high',
              description: 'Emphasize feature advantages',
              expectedImpact: 'Increase win probability by 20%',
            },
            {
              type: 'price',
              priority: 'medium',
              description: 'Consider flexible pricing',
              expectedImpact: 'Match competitive pressure',
            },
          ],
        },
      });

      const result = await service.analyzeCompetition(tenantId, opportunityId, competitorData);

      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const competitorData = {
        competitor: 'Competitor A',
        position: 'leading' as const,
        strengths: [],
        weaknesses: [],
        differentiators: [],
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockRejectedValue(new Error('Database error'));

      await expect(
        service.analyzeCompetition(tenantId, opportunityId, competitorData)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

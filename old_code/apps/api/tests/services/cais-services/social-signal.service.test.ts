/**
 * Social Signal Service Tests
 * Tests for social media and external signal monitoring
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SocialSignalService } from '../../../src/services/social-signal.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { MultiModalIntelligenceService } from '../../../src/services/multimodal-intelligence.service.js';

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

const mockMultiModalIntelligenceService = {
  analyzeText: vi.fn(),
  extractEntities: vi.fn(),
} as unknown as MultiModalIntelligenceService;

describe('SocialSignalService', () => {
  let service: SocialSignalService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SocialSignalService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockMultiModalIntelligenceService
    );
  });

  describe('recordSignal', () => {
    it('should record a positive social signal', async () => {
      const tenantId = 'tenant-1';
      const source = 'social_media';
      const signalType = 'positive';
      const content = {
        title: 'Customer announces expansion',
        description: 'Company announces 50% growth and expansion plans',
        url: 'https://example.com/news',
        publishedAt: new Date(),
        platform: 'LinkedIn',
      };
      const opportunityId = 'opp-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'signal-1',
          tenantId,
          source,
          signalType,
          content,
          relevance: { score: 0.9, factors: ['company_match'] },
          sentiment: { overall: 'positive', confidence: 0.8 },
        },
      });

      (mockMultiModalIntelligenceService.analyzeText as any).mockResolvedValue({
        sentiment: { score: 0.8, label: 'positive' },
        entities: [{ type: 'organization', value: 'Customer Corp' }],
      });

      const result = await service.recordSignal(
        tenantId,
        source,
        signalType,
        content,
        opportunityId
      );

      expect(result).toBeDefined();
      expect(result.source).toBe(source);
      expect(result.signalType).toBe(signalType);
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should record a risk signal', async () => {
      const tenantId = 'tenant-1';
      const source = 'news';
      const signalType = 'risk';
      const content = {
        title: 'Company announces layoffs',
        description: 'Company announces 20% workforce reduction',
        url: 'https://example.com/news',
        publishedAt: new Date(),
      };
      const accountId = 'account-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'signal-1',
          tenantId,
          source,
          signalType,
          content,
          relevance: { score: 0.95, factors: ['company_match', 'financial_impact'] },
          sentiment: { overall: 'negative', confidence: 0.9 },
          impact: {
            level: 'high',
            description: 'Potential budget constraints',
            potentialActions: ['review_pipeline', 'assess_risk'],
          },
        },
      });

      (mockMultiModalIntelligenceService.analyzeText as any).mockResolvedValue({
        sentiment: { score: 0.1, label: 'negative' },
        entities: [],
      });

      const result = await service.recordSignal(
        tenantId,
        source,
        signalType,
        content,
        undefined,
        accountId
      );

      expect(result).toBeDefined();
      expect(result.signalType).toBe('risk');
      expect(result.impact.level).toBe('high');
    });

    it('should analyze signal relevance', async () => {
      const tenantId = 'tenant-1';
      const source = 'press_release';
      const signalType = 'opportunity';
      const content = {
        title: 'Company launches new product line',
        description: 'Company announces new enterprise product suite',
        url: 'https://example.com/press',
        publishedAt: new Date(),
      };
      const opportunityId = 'opp-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'signal-1',
          tenantId,
          relevance: { score: 0.85, factors: ['product_match', 'timing'] },
        },
      });

      (mockMultiModalIntelligenceService.analyzeText as any).mockResolvedValue({
        sentiment: { score: 0.7, label: 'positive' },
        entities: [],
      });

      const result = await service.recordSignal(
        tenantId,
        source,
        signalType,
        content,
        opportunityId
      );

      expect(result).toBeDefined();
      expect(result.relevance.score).toBeGreaterThan(0.5);
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const source = 'social_media';
      const signalType = 'positive';
      const content = {
        title: 'Test',
        description: 'Test content',
        publishedAt: new Date(),
      };

      (mockMultiModalIntelligenceService.analyzeText as any).mockRejectedValue(
        new Error('Analysis failed')
      );

      await expect(
        service.recordSignal(tenantId, source, signalType, content)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });

  describe('getOpportunitySignals', () => {
    it('should retrieve signals for an opportunity', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const limit = 10;

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'signal-1',
              source: 'social_media',
              signalType: 'positive',
              createdAt: new Date(),
            },
            {
              id: 'signal-2',
              source: 'news',
              signalType: 'opportunity',
              createdAt: new Date(),
            },
          ],
        }),
      });

      const result = await service.getOpportunitySignals(tenantId, opportunityId, limit);

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(mockContainer.items.query).toHaveBeenCalled();
    });

    it('should return empty array when no signals found', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      });

      const result = await service.getOpportunitySignals(tenantId, opportunityId);

      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });
  });

  describe('generateSummary', () => {
    it('should generate signal summary', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'signal-1',
              source: 'social_media',
              signalType: 'positive',
              sentiment: { overall: 'positive' },
            },
            {
              id: 'signal-2',
              source: 'news',
              signalType: 'opportunity',
              sentiment: { overall: 'positive' },
            },
          ],
        }),
      });
      
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'summary-1',
          tenantId,
          opportunityId,
          signals: {
            total: 2,
            bySource: { social_media: 1, news: 1 },
            byType: { positive: 1, opportunity: 1 },
            bySentiment: { positive: 2, neutral: 0, negative: 0 },
          },
        },
      });

      const result = await service.generateSummary(tenantId, opportunityId, timeRange);

      expect(result).toBeDefined();
      expect(result.signals.total).toBe(2);
      expect(mockContainer.items.create).toHaveBeenCalled();
    });
  });
});

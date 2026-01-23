/**
 * Product Usage Service Tests
 * Tests for product usage integration and analysis
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProductUsageService } from '../../../src/services/product-usage.service.js';
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
} as unknown as MultiModalIntelligenceService;

describe('ProductUsageService', () => {
  let service: ProductUsageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductUsageService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockMultiModalIntelligenceService
    );
  });

  describe('recordEvent', () => {
    it('should record a product usage event', async () => {
      const tenantId = 'tenant-1';
      const accountId = 'account-1';
      const eventType = 'feature_used';
      const eventData = {
        feature: 'analytics_dashboard',
        userId: 'user-1',
        sessionId: 'session-1',
      };
      const opportunityId = 'opp-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'event-1',
          tenantId,
          accountId,
          eventType,
          feature: eventData.feature,
          timestamp: new Date(),
        },
      });

      const result = await service.recordEvent(
        tenantId,
        accountId,
        eventType,
        eventData,
        opportunityId
      );

      expect(result).toBeDefined();
      expect(result.eventType).toBe(eventType);
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should record feature adoption event', async () => {
      const tenantId = 'tenant-1';
      const accountId = 'account-1';
      const eventType = 'feature_adopted';
      const eventData = {
        feature: 'advanced_reporting',
        userId: 'user-1',
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'event-1',
          tenantId,
          accountId,
          eventType,
          feature: eventData.feature,
        },
      });

      const result = await service.recordEvent(tenantId, accountId, eventType, eventData);

      expect(result).toBeDefined();
      expect(result.eventType).toBe('feature_adopted');
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const accountId = 'account-1';
      const eventType = 'feature_used';
      const eventData = { feature: 'test' };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockRejectedValue(new Error('Database error'));

      await expect(
        service.recordEvent(tenantId, accountId, eventType, eventData)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });

  describe('analyzeUsage', () => {
    it('should analyze product usage patterns', async () => {
      const tenantId = 'tenant-1';
      const accountId = 'account-1';
      const opportunityId = 'opp-1';

      // Mock events retrieval
      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'event-1',
              eventType: 'feature_used',
              feature: 'analytics_dashboard',
              timestamp: new Date(),
            },
            {
              id: 'event-2',
              eventType: 'feature_used',
              feature: 'reporting',
              timestamp: new Date(),
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'intelligence-1',
          tenantId,
          accountId,
          opportunityId,
          summary: {
            totalEvents: 2,
            uniqueUsers: 1,
            activeFeatures: 2,
            adoptionRate: 0.8,
            engagementScore: 0.7,
          },
          health: {
            score: 0.75,
            level: 'healthy',
            factors: ['high_adoption', 'active_usage'],
          },
        },
      });

      const result = await service.analyzeUsage(tenantId, accountId, opportunityId);

      expect(result).toBeDefined();
      expect(result.summary.totalEvents).toBe(2);
      expect(result.health.level).toBe('healthy');
      expect(mockContainer.items.create).toHaveBeenCalled();
    });

    it('should detect low adoption patterns', async () => {
      const tenantId = 'tenant-1';
      const accountId = 'account-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'event-1',
              eventType: 'login',
              timestamp: new Date('2024-01-01'),
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'intelligence-1',
          tenantId,
          accountId,
          summary: {
            totalEvents: 1,
            adoptionRate: 0.1,
            engagementScore: 0.2,
          },
          health: {
            score: 0.3,
            level: 'at_risk',
            factors: ['low_adoption', 'low_engagement'],
          },
        },
      });

      const result = await service.analyzeUsage(tenantId, accountId);

      expect(result).toBeDefined();
      expect(result.health.level).toBe('at_risk');
      expect(result.health.factors).toContain('low_adoption');
    });
  });

  describe('detectChurnRisk', () => {
    it('should detect high churn risk', async () => {
      const tenantId = 'tenant-1';
      const accountId = 'account-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'event-1',
              eventType: 'login',
              timestamp: new Date('2024-01-01'), // Old event
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'pattern-1',
          tenantId,
          accountId,
          patternType: 'churn_risk',
          pattern: {
            churnRiskScore: 0.85,
          },
        },
      });

      const result = await service.detectChurnRisk(tenantId, accountId);

      expect(result).toBeDefined();
      expect(result.pattern.churnRiskScore).toBeGreaterThan(0.7);
    });

    it('should detect low churn risk for active accounts', async () => {
      const tenantId = 'tenant-1';
      const accountId = 'account-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'event-1',
              eventType: 'feature_used',
              timestamp: new Date(), // Recent event
            },
            {
              id: 'event-2',
              eventType: 'feature_used',
              timestamp: new Date(),
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'pattern-1',
          tenantId,
          accountId,
          patternType: 'churn_risk',
          pattern: {
            churnRiskScore: 0.2,
          },
        },
      });

      const result = await service.detectChurnRisk(tenantId, accountId);

      expect(result).toBeDefined();
      expect(result.pattern.churnRiskScore).toBeLessThan(0.3);
    });
  });

  describe('detectExpansionOpportunities', () => {
    it('should detect expansion opportunities', async () => {
      const tenantId = 'tenant-1';
      const accountId = 'account-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'event-1',
              eventType: 'feature_used',
              feature: 'basic_reporting',
              timestamp: new Date(),
            },
            {
              id: 'event-2',
              eventType: 'feature_used',
              feature: 'basic_reporting',
              timestamp: new Date(),
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'pattern-1',
          tenantId,
          accountId,
          patternType: 'expansion',
          pattern: {
            expansionOpportunityScore: 0.75,
          },
        },
      });

      const result = await service.detectExpansionOpportunities(tenantId, accountId);

      expect(result).toBeDefined();
      expect(result.pattern.expansionOpportunityScore).toBeGreaterThan(0.5);
    });
  });
});

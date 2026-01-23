/**
 * Customer Success Integration Service Tests
 * Tests for CS integration and health tracking
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CustomerSuccessIntegrationService } from '../../../src/services/customer-success-integration.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { ProductUsageService } from '../../../src/services/product-usage.service.js';
import type { RelationshipEvolutionService } from '../../../src/services/relationship-evolution.service.js';

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

const mockProductUsageService = {
  analyzeUsage: vi.fn(),
  detectExpansionOpportunities: vi.fn(),
} as unknown as ProductUsageService;

const mockRelationshipEvolutionService = {
  trackEvolution: vi.fn(),
} as unknown as RelationshipEvolutionService;

describe('CustomerSuccessIntegrationService', () => {
  let service: CustomerSuccessIntegrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CustomerSuccessIntegrationService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockProductUsageService,
      mockRelationshipEvolutionService
    );
  });

  describe('integrateCSData', () => {
    it('should integrate customer success data', async () => {
      const tenantId = 'tenant-1';
      const accountId = 'account-1';
      const opportunityId = 'opp-1';

      (mockProductUsageService.analyzeUsage as any).mockResolvedValue({
        summary: {
          adoptionRate: 0.9,
          engagementScore: 0.85,
        },
        health: {
          score: 0.85,
          level: 'healthy',
        },
      });

      (mockProductUsageService.detectExpansionOpportunities as any).mockResolvedValue({
        pattern: {
          expansionOpportunityScore: 0.7,
        },
      });

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'integration-1',
          tenantId,
          accountId,
          opportunityId,
          csHealth: {
            score: 85,
            level: 'healthy',
            factors: [
              {
                factor: 'product_adoption',
                score: 0.9,
                impact: 'positive',
              },
            ],
            lastUpdated: new Date(),
          },
          signals: {
            expansion: {
              detected: true,
              opportunities: [
                {
                  type: 'upsell',
                  description: 'Upgrade to enterprise tier',
                  value: 50000,
                  probability: 0.7,
                },
              ],
              score: 0.7,
            },
            renewal: {
              riskLevel: 'low',
              riskScore: 0.2,
              indicators: [],
            },
            churn: {
              riskLevel: 'low',
              riskScore: 0.1,
              indicators: [],
            },
          },
        },
      });

      const result = await service.integrateCSData(tenantId, accountId, opportunityId);

      expect(result).toBeDefined();
      expect(result.csHealth.score).toBe(85);
      expect(result.signals.expansion.detected).toBe(true);
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should detect expansion opportunities', async () => {
      const tenantId = 'tenant-1';
      const accountId = 'account-1';

      (mockProductUsageService.analyzeUsage as any).mockResolvedValue({
        summary: {
          adoptionRate: 0.95,
          engagementScore: 0.9,
        },
      });

      (mockProductUsageService.detectExpansionOpportunities as any).mockResolvedValue({
        pattern: {
          expansionOpportunityScore: 0.85,
        },
      });

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'integration-1',
          tenantId,
          accountId,
          signals: {
            expansion: {
              detected: true,
              opportunities: [
                {
                  type: 'upsell',
                  description: 'Add-on features',
                  value: 30000,
                  probability: 0.85,
                },
              ],
              score: 0.85,
            },
          },
        },
      });

      const result = await service.integrateCSData(tenantId, accountId);

      expect(result).toBeDefined();
      expect(result.signals.expansion.detected).toBe(true);
      expect(result.signals.expansion.opportunities.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const accountId = 'account-1';

      (mockProductUsageService.analyzeUsage as any).mockRejectedValue(
        new Error('Service error')
      );

      await expect(
        service.integrateCSData(tenantId, accountId)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

/**
 * Forecast Decomposition Service Tests
 * Tests for forecast breakdown analysis
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ForecastDecompositionService } from '../../../src/services/forecast-decomposition.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { RevenueForecastService, RevenueForecast } from '../../../src/services/revenue-forecast.service.js';
import type { QuotaService } from '../../../src/services/quota.service.js';

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

const mockRevenueForecastService = {
  generateForecast: vi.fn(),
} as unknown as RevenueForecastService;

const mockQuotaService = {
  getQuota: vi.fn(),
} as unknown as QuotaService;

const mockForecast: RevenueForecast = {
  period: 'quarter',
  range: {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
  },
  scenarios: {
    base: 1000000,
    best: 1200000,
    worst: 800000,
    'risk-adjusted': 950000,
  },
  byPeriod: [],
  calculatedAt: new Date(),
};

describe('ForecastDecompositionService', () => {
  let service: ForecastDecompositionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ForecastDecompositionService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockRevenueForecastService,
      mockQuotaService
    );
  });

  describe('decomposeForecast', () => {
    it('should decompose forecast into components', async () => {
      const tenantId = 'tenant-1';
      const forecast = {
        forecastId: 'forecast-1',
        period: '2024-Q1',
        total: 1000000,
        scenarios: mockForecast.scenarios,
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'decomp-1',
          tenantId,
          forecastId: forecast.forecastId,
          timeDecomposition: {
            trend: 900000,
            seasonality: 50000,
            irregular: 50000,
            trendDirection: 'increasing',
          },
          sourceDecomposition: {
            pipeline: 600000,
            newBusiness: 200000,
            expansions: 150000,
            renewals: 50000,
            percentages: {
              pipeline: 0.6,
              newBusiness: 0.2,
              expansions: 0.15,
              renewals: 0.05,
            },
          },
          confidenceDecomposition: {
            commit: 800000,
            bestCase: 1200000,
            upside: 200000,
            risk: 200000,
            confidenceDistribution: {
              high: 0.8,
              medium: 0.15,
              low: 0.05,
            },
          },
          driverDecomposition: {
            dealQuality: 400000,
            velocity: 300000,
            conversion: 200000,
            newBusiness: 100000,
            driverScores: {
              dealQuality: 0.8,
              velocity: 0.7,
              conversion: 0.6,
              newBusiness: 0.5,
            },
          },
        },
      });

      const result = await service.decomposeForecast(tenantId, forecast);

      expect(result).toBeDefined();
      expect(result.timeDecomposition).toBeDefined();
      expect(result.sourceDecomposition).toBeDefined();
      expect(result.confidenceDecomposition).toBeDefined();
      expect(result.driverDecomposition).toBeDefined();
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should identify time-based trends', async () => {
      const tenantId = 'tenant-1';
      const forecast = {
        forecastId: 'forecast-1',
        period: '2024-Q1',
        total: 1000000,
        scenarios: mockForecast.scenarios,
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'decomp-1',
          tenantId,
          timeDecomposition: {
            trend: 950000,
            seasonality: 30000,
            irregular: 20000,
            trendDirection: 'increasing',
            seasonalityPattern: 'Q1_peak',
          },
        },
      });

      const result = await service.decomposeForecast(tenantId, forecast);

      expect(result).toBeDefined();
      expect(result.timeDecomposition.trendDirection).toBe('increasing');
    });

    it('should decompose by source', async () => {
      const tenantId = 'tenant-1';
      const forecast = {
        forecastId: 'forecast-1',
        period: '2024-Q1',
        total: 1000000,
        scenarios: mockForecast.scenarios,
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'decomp-1',
          tenantId,
          sourceDecomposition: {
            pipeline: 700000,
            newBusiness: 150000,
            expansions: 100000,
            renewals: 50000,
            percentages: {
              pipeline: 0.7,
              newBusiness: 0.15,
              expansions: 0.1,
              renewals: 0.05,
            },
          },
        },
      });

      const result = await service.decomposeForecast(tenantId, forecast);

      expect(result).toBeDefined();
      expect(result.sourceDecomposition.percentages.pipeline).toBe(0.7);
    });

    it('should generate recommendations based on decomposition', async () => {
      const tenantId = 'tenant-1';
      const forecast = {
        forecastId: 'forecast-1',
        period: '2024-Q1',
        total: 1000000,
        scenarios: mockForecast.scenarios,
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'decomp-1',
          tenantId,
          driverDecomposition: {
            dealQuality: 300000,
            velocity: 200000,
            conversion: 200000,
            newBusiness: 300000,
            driverScores: {
              dealQuality: 0.5, // Low
              velocity: 0.6,
              conversion: 0.6,
              newBusiness: 0.7,
            },
          },
          recommendations: [
            {
              type: 'improve_quality',
              priority: 'high',
              description: 'Improve deal quality to increase forecast',
              expectedImpact: 'Increase forecast by 20%',
            },
          ],
        },
      });

      const result = await service.decomposeForecast(tenantId, forecast);

      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const forecast = {
        forecastId: 'forecast-1',
        period: '2024-Q1',
        total: 1000000,
        scenarios: mockForecast.scenarios,
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockRejectedValue(new Error('Database error'));

      await expect(
        service.decomposeForecast(tenantId, forecast)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

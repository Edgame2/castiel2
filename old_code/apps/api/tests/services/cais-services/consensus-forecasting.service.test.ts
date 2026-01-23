/**
 * Consensus Forecasting Service Tests
 * Tests for multi-source forecast consensus
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConsensusForecastingService, ForecastSourceData } from '../../../src/services/consensus-forecasting.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { ForecastDecompositionService } from '../../../src/services/forecast-decomposition.service.js';
import type { RevenueForecastService } from '../../../src/services/revenue-forecast.service.js';

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

const mockForecastDecompositionService = {
  decomposeForecast: vi.fn(),
} as unknown as ForecastDecompositionService;

const mockRevenueForecastService = {
  generateForecast: vi.fn(),
} as unknown as RevenueForecastService;

describe('ConsensusForecastingService', () => {
  let service: ConsensusForecastingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ConsensusForecastingService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockForecastDecompositionService,
      mockRevenueForecastService
    );
  });

  describe('generateConsensus', () => {
    it('should generate consensus from multiple sources', async () => {
      const tenantId = 'tenant-1';
      const period = '2024-Q1';
      const sources: ForecastSourceData[] = [
        {
          source: 'rep',
          forecast: 1000000,
          confidence: 0.7,
          timestamp: new Date(),
          metadata: { userId: 'user-1' },
        },
        {
          source: 'manager',
          forecast: 1100000,
          confidence: 0.8,
          timestamp: new Date(),
          metadata: { userId: 'manager-1' },
        },
        {
          source: 'ai_model',
          forecast: 1050000,
          confidence: 0.9,
          timestamp: new Date(),
        },
      ];

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'consensus-1',
          tenantId,
          period,
          consensus: {
            value: 1050000,
            confidence: 0.8,
            confidenceInterval: {
              lower: 1000000,
              upper: 1100000,
              level: 0.95,
            },
          },
          sources: sources.map(s => ({
            source: s.source,
            forecast: s.forecast,
            weight: 0.33,
            reliability: 0.8,
            contribution: s.forecast * 0.33,
          })),
          disagreement: {
            level: 'low',
            score: 0.1,
            maxDeviation: 100000,
          },
        },
      });

      const result = await service.generateConsensus(tenantId, period, sources);

      expect(result).toBeDefined();
      expect(result.consensus.value).toBeGreaterThan(0);
      expect(result.consensus.confidence).toBeGreaterThan(0);
      expect(result.sources.length).toBe(3);
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should weight sources by reliability', async () => {
      const tenantId = 'tenant-1';
      const period = '2024-Q1';
      const sources: ForecastSourceData[] = [
        {
          source: 'rep',
          forecast: 1000000,
          confidence: 0.6, // Lower confidence
          timestamp: new Date(),
        },
        {
          source: 'ai_model',
          forecast: 1100000,
          confidence: 0.9, // Higher confidence
          timestamp: new Date(),
        },
      ];

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'consensus-1',
          tenantId,
          period,
          consensus: {
            value: 1080000, // Weighted toward AI model
            confidence: 0.75,
            confidenceInterval: {
              lower: 1000000,
              upper: 1100000,
              level: 0.95,
            },
          },
          sources: [
            {
              source: 'rep',
              forecast: 1000000,
              weight: 0.4, // Lower weight
              reliability: 0.6,
            },
            {
              source: 'ai_model',
              forecast: 1100000,
              weight: 0.6, // Higher weight
              reliability: 0.9,
            },
          ],
        },
      });

      const result = await service.generateConsensus(tenantId, period, sources);

      expect(result).toBeDefined();
      // AI model should have higher weight
      const aiSource = result.sources.find(s => s.source === 'ai_model');
      expect(aiSource?.weight).toBeGreaterThan(0.5);
    });

    it('should detect high disagreement', async () => {
      const tenantId = 'tenant-1';
      const period = '2024-Q1';
      const sources: ForecastSourceData[] = [
        {
          source: 'rep',
          forecast: 500000,
          confidence: 0.8,
          timestamp: new Date(),
        },
        {
          source: 'manager',
          forecast: 1500000,
          confidence: 0.8,
          timestamp: new Date(),
        },
      ];

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'consensus-1',
          tenantId,
          period,
          consensus: {
            value: 1000000,
            confidence: 0.5, // Lower confidence due to disagreement
          },
          disagreement: {
            level: 'high',
            score: 0.8,
            maxDeviation: 500000,
            sources: [
              {
                source: 'rep',
                deviation: -500000,
                reason: 'Conservative estimate',
              },
              {
                source: 'manager',
                deviation: 500000,
                reason: 'Optimistic estimate',
              },
            ],
          },
        },
      });

      const result = await service.generateConsensus(tenantId, period, sources);

      expect(result).toBeDefined();
      expect(result.disagreement.level).toBe('high');
      expect(result.disagreement.score).toBeGreaterThan(0.5);
    });

    it('should handle single source', async () => {
      const tenantId = 'tenant-1';
      const period = '2024-Q1';
      const sources: ForecastSourceData[] = [
        {
          source: 'rep',
          forecast: 1000000,
          confidence: 0.8,
          timestamp: new Date(),
        },
      ];

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'consensus-1',
          tenantId,
          period,
          consensus: {
            value: 1000000,
            confidence: 0.8,
          },
          sources: [
            {
              source: 'rep',
              forecast: 1000000,
              weight: 1.0,
              reliability: 0.8,
            },
          ],
          disagreement: {
            level: 'low',
            score: 0.0,
            maxDeviation: 0,
          },
        },
      });

      const result = await service.generateConsensus(tenantId, period, sources);

      expect(result).toBeDefined();
      expect(result.consensus.value).toBe(1000000);
      expect(result.sources.length).toBe(1);
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const period = '2024-Q1';
      const sources: ForecastSourceData[] = [
        {
          source: 'rep',
          forecast: 1000000,
          confidence: 0.8,
          timestamp: new Date(),
        },
      ];

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockRejectedValue(new Error('Database error'));

      await expect(
        service.generateConsensus(tenantId, period, sources)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

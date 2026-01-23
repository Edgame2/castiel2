/**
 * Forecast Services Integration Tests
 * Tests integration between RevenueForecastService, ForecastDecompositionService,
 * ConsensusForecastingService, and ForecastCommitmentService
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RevenueForecastService } from '../../../../src/services/revenue-forecast.service.js';
import { ForecastDecompositionService } from '../../../../src/services/forecast-decomposition.service.js';
import { ConsensusForecastingService } from '../../../../src/services/consensus-forecasting.service.js';
import { ForecastCommitmentService } from '../../../../src/services/forecast-commitment.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { QuotaService } from '../../../../src/services/quota.service.js';
import type { PipelineAnalyticsService } from '../../../../src/services/pipeline-analytics.service.js';

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

const mockQuotaService = {
  getQuota: vi.fn(),
} as unknown as QuotaService;

const mockPipelineAnalyticsService = {
  calculatePipelineMetrics: vi.fn(),
} as unknown as PipelineAnalyticsService;

describe('Forecast Services Integration', () => {
  let revenueForecastService: RevenueForecastService;
  let forecastDecompositionService: ForecastDecompositionService;
  let consensusForecastingService: ConsensusForecastingService;
  let forecastCommitmentService: ForecastCommitmentService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize services with dependencies
    forecastDecompositionService = new ForecastDecompositionService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      undefined, // revenueForecastService (circular)
      mockQuotaService
    );

    consensusForecastingService = new ConsensusForecastingService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      forecastDecompositionService,
      undefined // revenueForecastService (circular)
    );

    forecastCommitmentService = new ForecastCommitmentService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      consensusForecastingService,
      undefined // riskEvaluationService
    );

    revenueForecastService = new RevenueForecastService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockQuotaService,
      mockPipelineAnalyticsService,
      forecastDecompositionService,
      consensusForecastingService,
      forecastCommitmentService
    );
  });

  describe('End-to-End Forecast Generation with Enhancements', () => {
    it('should generate forecast with decomposition, consensus, and commitment analysis', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';
      const period = '2024-Q1';

      // Mock quota
      (mockQuotaService.getQuota as any).mockResolvedValue({
        quota: 1000000,
        period: 'quarter',
      });

      // Mock pipeline metrics
      (mockPipelineAnalyticsService.calculatePipelineMetrics as any).mockResolvedValue({
        totalValue: 1200000,
        opportunityCount: 15,
      });

      // Mock decomposition
      const mockDecompContainer = (mockCosmosClient.database as any)().container();
      (mockDecompContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'decomp-1',
          tenantId,
          timeDecomposition: {
            trend: 1000000,
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
              pipeline: 0.5,
              newBusiness: 0.17,
              expansions: 0.125,
              renewals: 0.042,
            },
          },
        },
      });

      // Mock consensus
      const mockConsensusContainer = (mockCosmosClient.database as any)().container();
      (mockConsensusContainer.items.create as any).mockResolvedValue({
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
          sources: [
            {
              source: 'rep',
              forecast: 1000000,
              weight: 0.4,
              reliability: 0.7,
            },
            {
              source: 'ai_model',
              forecast: 1100000,
              weight: 0.6,
              reliability: 0.9,
            },
          ],
        },
      });

      // Mock commitment analysis
      const mockCommitmentContainer = (mockCosmosClient.database as any)().container();
      (mockCommitmentContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'commitment-1',
          tenantId,
          period,
          scoring: {
            commitmentScore: 0.8,
            sandbaggingScore: 0.2,
            happyEarsScore: 0.1,
            accuracyPrediction: 0.85,
          },
          detection: {
            sandbagging: { detected: false, confidence: 0.2 },
            happyEars: { detected: false, confidence: 0.1 },
          },
        },
      });

      // Mock forecast creation
      const mockForecastContainer = (mockCosmosClient.database as any)().container();
      (mockForecastContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'forecast-1',
          tenantId,
          period,
          scenarios: {
            base: 1050000,
            best: 1200000,
            worst: 900000,
            'risk-adjusted': 1000000,
          },
          metadata: {
            decomposition: { decompositionId: 'decomp-1' },
            consensus: { consensusId: 'consensus-1' },
            commitment: { analysisId: 'commitment-1' },
          },
        },
      });

      const forecast = await revenueForecastService.generateForecast(
        tenantId,
        userId,
        period
      );

      expect(forecast).toBeDefined();
      expect(forecast.scenarios).toBeDefined();
      expect(forecast.metadata).toBeDefined();
      expect(forecast.metadata.decomposition).toBeDefined();
      expect(forecast.metadata.consensus).toBeDefined();
      expect(forecast.metadata.commitment).toBeDefined();

      // Verify all services were called
      expect(mockDecompContainer.items.create).toHaveBeenCalled();
      expect(mockConsensusContainer.items.create).toHaveBeenCalled();
      expect(mockCommitmentContainer.items.create).toHaveBeenCalled();
      expect(mockForecastContainer.items.create).toHaveBeenCalled();
    });

    it('should handle missing optional services gracefully', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';
      const period = '2024-Q1';

      // Create service without optional dependencies
      const serviceWithoutEnhancements = new RevenueForecastService(
        mockCosmosClient,
        mockRedis,
        mockMonitoring,
        mockQuotaService,
        mockPipelineAnalyticsService
        // No forecast enhancement services
      );

      (mockQuotaService.getQuota as any).mockResolvedValue({
        quota: 1000000,
        period: 'quarter',
      });

      (mockPipelineAnalyticsService.calculatePipelineMetrics as any).mockResolvedValue({
        totalValue: 1200000,
        opportunityCount: 15,
      });

      const mockForecastContainer = (mockCosmosClient.database as any)().container();
      (mockForecastContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'forecast-1',
          tenantId,
          period,
          scenarios: {
            base: 1000000,
            best: 1200000,
            worst: 800000,
            'risk-adjusted': 950000,
          },
        },
      });

      const forecast = await serviceWithoutEnhancements.generateForecast(
        tenantId,
        userId,
        period
      );

      expect(forecast).toBeDefined();
      expect(forecast.scenarios).toBeDefined();
      // Should still work without enhancements
    });
  });

  describe('Consensus with Multiple Sources', () => {
    it('should generate consensus from multiple forecast sources', async () => {
      const tenantId = 'tenant-1';
      const period = '2024-Q1';
      const sources = [
        {
          source: 'rep',
          forecast: 1000000,
          confidence: 0.7,
          timestamp: new Date(),
        },
        {
          source: 'manager',
          forecast: 1100000,
          confidence: 0.8,
          timestamp: new Date(),
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
          },
          sources: sources.map(s => ({
            source: s.source,
            forecast: s.forecast,
            weight: 0.33,
            reliability: s.confidence,
          })),
        },
      });

      const consensus = await consensusForecastingService.generateConsensus(
        tenantId,
        period,
        sources
      );

      expect(consensus).toBeDefined();
      expect(consensus.sources.length).toBe(3);
      expect(consensus.consensus.value).toBeGreaterThan(0);
    });
  });

  describe('Commitment Analysis Integration', () => {
    it('should analyze commitment and detect sandbagging', async () => {
      const tenantId = 'tenant-1';
      const period = '2024-Q1';
      const forecast = {
        commit: 500000,
        bestCase: 1500000,
        upside: 1000000,
        risk: 0,
        total: 1000000,
      };
      const userId = 'user-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              period: '2023-Q4',
              forecasted: 500000,
              actual: 800000,
              accuracy: 0.625,
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'commitment-1',
          tenantId,
          period,
          scoring: {
            commitmentScore: 0.5,
            sandbaggingScore: 0.85,
            happyEarsScore: 0.1,
            accuracyPrediction: 0.6,
          },
          detection: {
            sandbagging: {
              detected: true,
              confidence: 0.85,
              indicators: ['low_commit_ratio', 'historical_under_forecast'],
            },
            happyEars: {
              detected: false,
              confidence: 0.1,
            },
          },
        },
      });

      const analysis = await forecastCommitmentService.analyzeCommitment(
        tenantId,
        period,
        forecast,
        userId
      );

      expect(analysis).toBeDefined();
      expect(analysis.detection.sandbagging.detected).toBe(true);
      expect(analysis.scoring.sandbaggingScore).toBeGreaterThan(0.7);
    });
  });
});

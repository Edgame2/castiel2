/**
 * Forecast Commitment Service Tests
 * Tests for commitment intelligence and analysis
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ForecastCommitmentService } from '../../../src/services/forecast-commitment.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { ConsensusForecastingService } from '../../../src/services/consensus-forecasting.service.js';
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

const mockConsensusForecastingService = {
  generateConsensus: vi.fn(),
} as unknown as ConsensusForecastingService;

const mockRiskEvaluationService = {
  evaluateRisk: vi.fn(),
} as unknown as RiskEvaluationService;

describe('ForecastCommitmentService', () => {
  let service: ForecastCommitmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ForecastCommitmentService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockConsensusForecastingService,
      mockRiskEvaluationService
    );
  });

  describe('analyzeCommitment', () => {
    it('should analyze forecast commitment levels', async () => {
      const tenantId = 'tenant-1';
      const period = '2024-Q1';
      const forecast = {
        commit: 800000,
        bestCase: 1200000,
        upside: 400000,
        risk: 200000,
        total: 1000000,
      };
      const userId = 'user-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'analysis-1',
          tenantId,
          period,
          commitment: forecast,
          scoring: {
            commitmentScore: 0.8,
            sandbaggingScore: 0.2,
            happyEarsScore: 0.1,
            accuracyPrediction: 0.85,
            factors: [
              {
                factor: 'commit_to_total_ratio',
                impact: 'positive',
                score: 0.8,
              },
            ],
          },
          detection: {
            sandbagging: {
              detected: false,
              confidence: 0.2,
              indicators: [],
            },
            happyEars: {
              detected: false,
              confidence: 0.1,
              indicators: [],
            },
          },
        },
      });

      const result = await service.analyzeCommitment(tenantId, period, forecast, userId);

      expect(result).toBeDefined();
      expect(result.scoring.commitmentScore).toBeGreaterThan(0);
      expect(result.detection.sandbagging.detected).toBe(false);
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should detect sandbagging', async () => {
      const tenantId = 'tenant-1';
      const period = '2024-Q1';
      const forecast = {
        commit: 500000, // Low commit relative to best case
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
              actual: 800000, // Consistently beats forecast
              accuracy: 0.625,
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'analysis-1',
          tenantId,
          period,
          scoring: {
            commitmentScore: 0.5,
            sandbaggingScore: 0.85, // High sandbagging score
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
              indicators: [],
            },
          },
        },
      });

      const result = await service.analyzeCommitment(tenantId, period, forecast, userId);

      expect(result).toBeDefined();
      expect(result.detection.sandbagging.detected).toBe(true);
      expect(result.detection.sandbagging.confidence).toBeGreaterThan(0.7);
    });

    it('should detect happy ears', async () => {
      const tenantId = 'tenant-1';
      const period = '2024-Q1';
      const forecast = {
        commit: 1000000,
        bestCase: 2000000, // Very optimistic
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
              forecasted: 1000000,
              actual: 600000, // Consistently misses forecast
              accuracy: 0.6,
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'analysis-1',
          tenantId,
          period,
          scoring: {
            commitmentScore: 0.4,
            sandbaggingScore: 0.1,
            happyEarsScore: 0.9, // High happy ears score
            accuracyPrediction: 0.5,
          },
          detection: {
            sandbagging: {
              detected: false,
              confidence: 0.1,
              indicators: [],
            },
            happyEars: {
              detected: true,
              confidence: 0.9,
              indicators: ['high_best_case_ratio', 'historical_over_forecast'],
            },
          },
        },
      });

      const result = await service.analyzeCommitment(tenantId, period, forecast, userId);

      expect(result).toBeDefined();
      expect(result.detection.happyEars.detected).toBe(true);
      expect(result.detection.happyEars.confidence).toBeGreaterThan(0.7);
    });

    it('should predict forecast accuracy', async () => {
      const tenantId = 'tenant-1';
      const period = '2024-Q1';
      const forecast = {
        commit: 800000,
        bestCase: 1000000,
        upside: 200000,
        risk: 100000,
        total: 900000,
      };
      const userId = 'user-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              period: '2023-Q4',
              forecasted: 800000,
              actual: 820000,
              accuracy: 0.975, // High historical accuracy
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'analysis-1',
          tenantId,
          period,
          scoring: {
            commitmentScore: 0.85,
            sandbaggingScore: 0.1,
            happyEarsScore: 0.1,
            accuracyPrediction: 0.9, // High predicted accuracy
          },
        },
      });

      const result = await service.analyzeCommitment(tenantId, period, forecast, userId);

      expect(result).toBeDefined();
      expect(result.scoring.accuracyPrediction).toBeGreaterThan(0.8);
    });

    it('should generate recommendations', async () => {
      const tenantId = 'tenant-1';
      const period = '2024-Q1';
      const forecast = {
        commit: 600000,
        bestCase: 1200000,
        upside: 600000,
        risk: 200000,
        total: 1000000,
      };
      const userId = 'user-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'analysis-1',
          tenantId,
          period,
          scoring: {
            commitmentScore: 0.6,
            sandbaggingScore: 0.3,
            happyEarsScore: 0.2,
            accuracyPrediction: 0.7,
          },
          recommendations: [
            {
              type: 'increase_commitment',
              priority: 'high',
              description: 'Increase commitment level to improve forecast reliability',
              expectedImpact: 'Improve commitment score by 20%',
            },
          ],
        },
      });

      const result = await service.analyzeCommitment(tenantId, period, forecast, userId);

      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const period = '2024-Q1';
      const forecast = {
        commit: 800000,
        bestCase: 1000000,
        upside: 200000,
        risk: 100000,
        total: 900000,
      };
      const userId = 'user-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockRejectedValue(new Error('Database error'));

      await expect(
        service.analyzeCommitment(tenantId, period, forecast, userId)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });

  describe('recordOutcome', () => {
    it('should record forecast outcome for learning', async () => {
      const tenantId = 'tenant-1';
      const period = '2024-Q1';
      const forecasted = 1000000;
      const actual = 950000;
      const commitmentLevel = 'commit' as const;
      const userId = 'user-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'history-1',
          tenantId,
          userId,
          period,
          forecasted,
          actual,
          accuracy: 0.95,
          commitmentLevel,
          timestamp: new Date(),
        },
      });

      const result = await service.recordOutcome(
        tenantId,
        period,
        forecasted,
        actual,
        commitmentLevel,
        userId
      );

      expect(result).toBeDefined();
      expect(result.accuracy).toBeGreaterThan(0);
      expect(mockContainer.items.create).toHaveBeenCalled();
    });
  });
});

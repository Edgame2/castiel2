/**
 * Forecasting Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForecastingService } from '../../../src/services/ForecastingService';
import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';

// Mock dependencies
const mockClients = vi.hoisted(() => ({
  adaptive: { get: vi.fn() },
  ml: { post: vi.fn() },
  analytics: { get: vi.fn(), post: vi.fn() },
  risk: { get: vi.fn(), post: vi.fn() },
  shard: { get: vi.fn() },
}));
vi.mock('uuid', () => ({ v4: vi.fn(() => 'test-uuid') }));
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: unknown, config: { baseURL?: string }) {
    if (config?.baseURL?.includes('adaptive-learning')) return mockClients.adaptive;
    if (config?.baseURL?.includes('ml-service')) return mockClients.ml;
    if (config?.baseURL?.includes('analytics-service')) return mockClients.analytics;
    if (config?.baseURL?.includes('risk-analytics')) return mockClients.risk;
    if (config?.baseURL?.includes('shard-manager')) return mockClients.shard;
    return {};
  }),
  generateServiceToken: vi.fn(() => 'mock-token'),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      adaptive_learning: { url: 'http://adaptive-learning:3000' },
      ml_service: { url: 'http://ml-service:3000' },
      analytics_service: { url: 'http://analytics-service:3000' },
      risk_analytics: { url: 'http://risk-analytics:3000' },
      shard_manager: { url: 'http://shard-manager:3000' },
    },
    cosmos_db: {
      containers: {
        decompositions: 'forecasting_decompositions',
        consensus: 'forecasting_consensus',
        commitments: 'forecasting_commitments',
        pipeline_health: 'forecasting_pipeline_health',
        predictions: 'forecasting_predictions',
      },
    },
    database: {
      containers: {
        forecasting_forecasts: 'forecasting_forecasts',
      },
    },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../src/events/publishers/ForecastingEventPublisher', () => ({
  publishForecastEvent: vi.fn(),
}));

describe('ForecastingService', () => {
  let service: ForecastingService;
  let mockContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        })),
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn() })),
      },
    };
    (getContainer as any).mockReturnValue(mockContainer);

    service = new ForecastingService();
  });

  describe('getLearnedWeights', () => {
    it('should get learned weights successfully', async () => {
      const tenantId = 'tenant-123';

      const mockWeights = {
        decomposition: 0.3,
        consensus: 0.4,
        commitment: 0.3,
        ml: 0.2,
      };

      mockClients.adaptive.get.mockResolvedValue(mockWeights);

      const result = await service.getLearnedWeights(tenantId);

      expect(result).toEqual(mockWeights);
      expect(mockClients.adaptive.get).toHaveBeenCalled();
    });

    it('should return default weights on error', async () => {
      const tenantId = 'tenant-123';

      mockClients.adaptive.get.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.getLearnedWeights(tenantId);

      expect(result).toBeDefined();
      expect(result.decomposition).toBeDefined();
    });
  });

  describe('generateForecast', () => {
    it('should generate forecast successfully', async () => {
      const tenantId = 'tenant-123';
      const request = {
        tenantId,
        opportunityId: 'opp-123',
        timeframe: 'quarter',
        includeDecomposition: true,
        includeConsensus: true,
        includeCommitment: true,
      };

      mockClients.adaptive.get.mockResolvedValue({
        decomposition: 0.3,
        consensus: 0.4,
        commitment: 0.3,
        ml: 0.2,
      });

      mockClients.shard.get.mockResolvedValue({
        id: 'opp-123',
        tenantId,
        structuredData: { amount: 100000, stage: 'negotiation', probability: 0.5 },
      });

      (getContainer as any).mockImplementation(() => ({
        items: {
          create: vi.fn().mockResolvedValue({}),
          query: vi.fn().mockReturnValue({
            fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
            fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
          }),
          item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn() })),
        },
      }));

      const result = await service.generateForecast(request);

      expect(result).toHaveProperty('opportunityId');
      expect(result).toHaveProperty('revenueForecast');
      expect(mockClients.adaptive.get).toHaveBeenCalled();
    });

    it('should handle missing opportunity', async () => {
      const tenantId = 'tenant-123';
      const request = {
        tenantId,
        opportunityId: 'non-existent',
        timeframe: 'quarter',
      };

      mockClients.adaptive.get.mockResolvedValue({
        decomposition: 0.3,
        consensus: 0.4,
        commitment: 0.3,
        ml: 0.2,
      });

      mockClients.shard.get.mockRejectedValue(new Error('Not found'));

      (getContainer as any).mockImplementation(() => ({
        items: {
          create: vi.fn().mockResolvedValue({}),
          query: vi.fn().mockReturnValue({
            fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
            fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
          }),
          item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn() })),
        },
      }));

      await expect(service.generateForecast(request)).rejects.toThrow();
    });
  });
});

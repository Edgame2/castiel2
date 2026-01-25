/**
 * Forecasting Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForecastingService } from '../../../src/services/ForecastingService';
import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';

// Mock dependencies
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
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
  },
}));

vi.mock('../../../src/events/publishers/ForecastingEventPublisher', () => ({
  publishForecastEvent: vi.fn(),
}));

describe('ForecastingService', () => {
  let service: ForecastingService;
  let mockAdaptiveLearningClient: any;
  let mockMlServiceClient: any;
  let mockAnalyticsServiceClient: any;
  let mockRiskAnalyticsClient: any;
  let mockShardManagerClient: any;
  let mockContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock container
    mockContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchAll: vi.fn(),
        })),
        read: vi.fn(),
        replace: vi.fn(),
      },
    };
    (getContainer as any).mockReturnValue(mockContainer);

    // Mock service clients
    mockAdaptiveLearningClient = {
      get: vi.fn(),
    };
    mockMlServiceClient = {
      post: vi.fn(),
    };
    mockAnalyticsServiceClient = {
      get: vi.fn(),
      post: vi.fn(),
    };
    mockRiskAnalyticsClient = {
      post: vi.fn(),
    };
    mockShardManagerClient = {
      get: vi.fn(),
    };

    (ServiceClient as any).mockImplementation((config: any) => {
      if (config.baseURL?.includes('adaptive-learning')) {
        return mockAdaptiveLearningClient;
      }
      if (config.baseURL?.includes('ml-service')) {
        return mockMlServiceClient;
      }
      if (config.baseURL?.includes('analytics-service')) {
        return mockAnalyticsServiceClient;
      }
      if (config.baseURL?.includes('risk-analytics')) {
        return mockRiskAnalyticsClient;
      }
      if (config.baseURL?.includes('shard-manager')) {
        return mockShardManagerClient;
      }
      return {};
    });

    service = new ForecastingService();
  });

  describe('getLearnedWeights', () => {
    it('should get learned weights successfully', async () => {
      const tenantId = 'tenant-123';

      const mockWeights = {
        decomposition: 0.3,
        consensus: 0.4,
        commitment: 0.3,
      };

      mockAdaptiveLearningClient.get.mockResolvedValue(mockWeights);

      const result = await service.getLearnedWeights(tenantId);

      expect(result).toEqual(mockWeights);
      expect(mockAdaptiveLearningClient.get).toHaveBeenCalled();
    });

    it('should return default weights on error', async () => {
      const tenantId = 'tenant-123';

      mockAdaptiveLearningClient.get.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.getLearnedWeights(tenantId);

      expect(result).toBeDefined();
      expect(result.decomposition).toBeDefined();
    });
  });

  describe('generateForecast', () => {
    it('should generate forecast successfully', async () => {
      const tenantId = 'tenant-123';
      const request = {
        opportunityId: 'opp-123',
        timeframe: 'quarter',
        includeDecomposition: true,
        includeConsensus: true,
        includeCommitment: true,
      };

      // Mock learned weights
      mockAdaptiveLearningClient.get.mockResolvedValueOnce({
        decomposition: 0.3,
        consensus: 0.4,
        commitment: 0.3,
      });

      // Mock opportunity data
      mockShardManagerClient.get.mockResolvedValueOnce({
        id: 'opp-123',
        tenantId,
        data: {
          amount: 100000,
          stage: 'negotiation',
        },
      });

      // Mock analytics data
      mockAnalyticsServiceClient.get.mockResolvedValueOnce({
        historicalData: [
          { period: '2024-Q1', revenue: 50000 },
          { period: '2024-Q2', revenue: 60000 },
        ],
      });

      // Mock ML forecast
      mockMlServiceClient.post.mockResolvedValueOnce({
        forecast: {
          baseForecast: 70000,
          confidence: 0.85,
        },
      });

      const result = await service.generateForecast(tenantId, request);

      expect(result).toHaveProperty('opportunityId');
      expect(result).toHaveProperty('forecast');
      expect(mockAdaptiveLearningClient.get).toHaveBeenCalled();
    });

    it('should handle missing opportunity', async () => {
      const tenantId = 'tenant-123';
      const request = {
        opportunityId: 'non-existent',
        timeframe: 'quarter',
      };

      mockAdaptiveLearningClient.get.mockResolvedValueOnce({
        decomposition: 0.3,
        consensus: 0.4,
        commitment: 0.3,
      });

      mockShardManagerClient.get.mockRejectedValue(new Error('Not found'));

      await expect(
        service.generateForecast(tenantId, request)
      ).rejects.toThrow();
    });
  });

  describe('getForecast', () => {
    it('should retrieve a forecast successfully', async () => {
      const tenantId = 'tenant-123';
      const forecastId = 'forecast-123';

      const mockForecast = {
        id: forecastId,
        tenantId,
        opportunityId: 'opp-123',
        forecast: {
          baseForecast: 70000,
          confidence: 0.85,
        },
        createdAt: new Date(),
      };

      mockContainer.items.read.mockResolvedValue({
        resource: mockForecast,
      });

      const result = await service.getForecast(tenantId, forecastId);

      expect(result).toEqual(mockForecast);
      expect(mockContainer.items.read).toHaveBeenCalledWith(
        forecastId,
        { partitionKey: tenantId }
      );
    });
  });
});

/**
 * Recommendations Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationsService } from '../../../src/services/RecommendationsService';
import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared';

// Mock dependencies
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
  generateServiceToken: vi.fn(() => 'mock-token'),
  getContainer: vi.fn(),
  PolicyResolver: vi.fn().mockImplementation(function (this: { getShardTypeAnalysisPolicy: ReturnType<typeof vi.fn> }) {
    this.getShardTypeAnalysisPolicy = vi.fn().mockResolvedValue({});
  }),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      adaptive_learning: { url: 'http://adaptive-learning:3000' },
      ml_service: { url: 'http://ml-service:3000' },
      embeddings: { url: 'http://embeddings:3000' },
      shard_manager: { url: 'http://shard-manager:3000' },
      analytics_service: { url: 'http://analytics-service:3000' },
    },
    cosmos_db: {
      containers: {
        recommendations: 'recommendation_recommendations',
        feedback: 'recommendation_feedback',
        feedback_aggregation: 'recommendation_feedback_aggregation',
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

vi.mock('../../../src/events/publishers/RecommendationEventPublisher', () => ({
  publishRecommendationEvent: vi.fn(),
}));

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let mockAdaptiveLearningClient: any;
  let mockMlServiceClient: any;
  let mockEmbeddingsClient: any;
  let mockShardManagerClient: any;
  let mockAnalyticsServiceClient: any;
  let mockContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock container: item(id, partitionKey) returns { read(), replace() }
    const mockItem = {
      read: vi.fn(),
      replace: vi.fn(),
    };
    mockContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchAll: vi.fn(),
        })),
      },
      item: vi.fn(() => mockItem),
    };
    (getContainer as ReturnType<typeof vi.fn>).mockReturnValue(mockContainer);

    // Mock service clients
    mockAdaptiveLearningClient = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue(undefined),
    };
    mockMlServiceClient = {
      post: vi.fn(),
    };
    mockEmbeddingsClient = {
      post: vi.fn(),
    };
    mockShardManagerClient = {
      get: vi.fn(),
      post: vi.fn(),
    };
    mockAnalyticsServiceClient = {
      post: vi.fn(),
    };

    (ServiceClient as ReturnType<typeof vi.fn>).mockImplementation(function (this: unknown, config: { baseURL?: string }) {
      if (config.baseURL?.includes('adaptive-learning')) {
        return mockAdaptiveLearningClient;
      }
      if (config.baseURL?.includes('ml-service')) {
        return mockMlServiceClient;
      }
      if (config.baseURL?.includes('embeddings')) {
        return mockEmbeddingsClient;
      }
      if (config.baseURL?.includes('shard-manager')) {
        return mockShardManagerClient;
      }
      if (config.baseURL?.includes('analytics-service')) {
        return mockAnalyticsServiceClient;
      }
      return {};
    });

    service = new RecommendationsService();
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations successfully', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const request = {
        context: {
          opportunityId: 'opp-123',
          userId,
        },
        limit: 10,
      };

      // Mock learned weights
      mockAdaptiveLearningClient.get.mockResolvedValueOnce({
        vectorSearch: 0.4,
        collaborative: 0.3,
        temporal: 0.2,
        content: 0.1,
        ml: 0.0,
      });

      // Mock vector search
      mockEmbeddingsClient.post.mockResolvedValueOnce({
        results: [
          { id: 'rec-1', score: 0.9, type: 'vector' },
          { id: 'rec-2', score: 0.8, type: 'vector' },
        ],
      });

      // Mock collaborative filtering
      mockMlServiceClient.post.mockResolvedValueOnce({
        recommendations: [
          { id: 'rec-3', score: 0.85, type: 'collaborative' },
        ],
      });

      const result = await service.generateRecommendations(tenantId, request);

      expect(result).toHaveProperty('recommendations');
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(mockAdaptiveLearningClient.get).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-123';
      const request = {
        context: {
          userId: 'user-123',
        },
        limit: 10,
      };

      mockAdaptiveLearningClient.get.mockRejectedValue(new Error('Service unavailable'));

      // Should use default weights and continue
      const result = await service.generateRecommendations(tenantId, request);

      expect(result).toHaveProperty('recommendations');
    });
  });

  describe('recordFeedback', () => {
    it('should record feedback successfully', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const recommendationId = 'rec-123';
      const feedback = {
        recommendationId,
        userId,
        tenantId,
        action: 'accept' as const,
        timestamp: new Date(),
      };

      mockContainer.item().read.mockResolvedValue({
        resource: {
          id: recommendationId,
          tenantId,
          userId,
          status: 'active',
        },
      });
      mockContainer.item().replace.mockResolvedValue({});

      const result = await service.recordFeedback(feedback);

      expect(result).toHaveProperty('id');
      expect(mockContainer.item().replace).toHaveBeenCalled();
    });

    it('should handle recommendation not found', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const recommendationId = 'non-existent';
      const feedback = {
        recommendationId,
        userId,
        tenantId,
        action: 'accept' as const,
        timestamp: new Date(),
      };

      mockContainer.item().read.mockResolvedValue({ resource: null });

      await expect(service.recordFeedback(feedback)).resolves.toBeDefined();
    });

    it('calls adaptive-learning record-outcome with correct predictionId and outcomeValue', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const recommendationId = 'rec-456';
      const feedback = {
        recommendationId,
        userId,
        tenantId,
        action: 'accept' as const,
        timestamp: new Date(),
      };

      mockContainer.item().read.mockResolvedValue({
        resource: { id: recommendationId, tenantId, status: 'active' },
      });
      mockContainer.item().replace.mockResolvedValue({});
      mockContainer.items.create.mockResolvedValue({ resource: {} });

      await service.recordFeedback(feedback);

      const postCalls = mockAdaptiveLearningClient.post.mock.calls;
      const recordOutcomeCall = postCalls.find((c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('record-outcome'));
      expect(recordOutcomeCall).toBeDefined();
      expect(recordOutcomeCall![0]).toContain('/api/v1/adaptive-learning/outcomes/record-outcome');
      expect(recordOutcomeCall![1]).toMatchObject({
        predictionId: recommendationId,
        outcomeValue: 1,
        outcomeType: 'success',
      });
    });
  });

  describe('getLearnedWeights', () => {
    it('should get learned weights successfully', async () => {
      const tenantId = 'tenant-123';

      const mockWeights = {
        vectorSearch: 0.4,
        collaborative: 0.3,
        temporal: 0.2,
        content: 0.1,
        ml: 0.0,
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
      expect(result.vectorSearch).toBeDefined();
    });
  });
});

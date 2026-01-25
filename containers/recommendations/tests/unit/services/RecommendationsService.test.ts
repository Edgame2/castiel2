/**
 * Recommendations Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationsService } from '../../../src/services/RecommendationsService';
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
      embeddings: { url: 'http://embeddings:3000' },
      shard_manager: { url: 'http://shard-manager:3000' },
      analytics_service: { url: 'http://analytics-service:3000' },
    },
    database: {
      containers: {
        recommendation_recommendations: 'recommendation_recommendations',
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

    (ServiceClient as any).mockImplementation((config: any) => {
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
      expect(result.recommendations.length).toBeGreaterThan(0);
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

  describe('submitFeedback', () => {
    it('should submit feedback successfully', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const recommendationId = 'rec-123';
      const feedback = {
        action: 'accept' as const,
        rating: 5,
      };

      // Mock existing recommendation
      mockContainer.items.read.mockResolvedValue({
        resource: {
          id: recommendationId,
          tenantId,
          userId,
          status: 'active',
        },
      });

      // Mock update
      mockContainer.items.replace.mockResolvedValue({
        resource: {
          id: recommendationId,
          tenantId,
          feedback,
          updatedAt: new Date(),
        },
      });

      const result = await service.submitFeedback(tenantId, userId, recommendationId, feedback);

      expect(result).toHaveProperty('id');
      expect(mockContainer.items.replace).toHaveBeenCalled();
    });

    it('should handle recommendation not found', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const recommendationId = 'non-existent';
      const feedback = {
        action: 'accept' as const,
      };

      mockContainer.items.read.mockResolvedValue({
        resource: null,
      });

      await expect(
        service.submitFeedback(tenantId, userId, recommendationId, feedback)
      ).rejects.toThrow();
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

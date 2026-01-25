/**
 * Risk Evaluation Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RiskEvaluationService } from '../../../src/services/RiskEvaluationService';
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
      risk_catalog: { url: 'http://risk-catalog:3000' },
      adaptive_learning: { url: 'http://adaptive-learning:3000' },
      ml_service: { url: 'http://ml-service:3000' },
      ai_insights: { url: 'http://ai-insights:3000' },
      shard_manager: { url: 'http://shard-manager:3000' },
      embeddings: { url: 'http://embeddings:3000' },
      search_service: { url: 'http://search-service:3029' },
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

vi.mock('../../../src/events/publishers/RiskAnalyticsEventPublisher', () => ({
  publishRiskAnalyticsEvent: vi.fn(),
}));

describe('RiskEvaluationService', () => {
  let service: RiskEvaluationService;
  let mockRiskCatalogClient: any;
  let mockAdaptiveLearningClient: any;
  let mockMlServiceClient: any;
  let mockAiInsightsClient: any;
  let mockShardManagerClient: any;
  let mockEmbeddingsClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock service clients
    mockRiskCatalogClient = {
      get: vi.fn(),
    };
    mockAdaptiveLearningClient = {
      get: vi.fn(),
    };
    mockMlServiceClient = {
      post: vi.fn(),
    };
    mockAiInsightsClient = {
      post: vi.fn(),
    };
    mockShardManagerClient = {
      get: vi.fn(),
    };
    mockEmbeddingsClient = {
      post: vi.fn(),
    };

    (ServiceClient as any).mockImplementation((config: any) => {
      if (config.baseURL?.includes('risk-catalog')) {
        return mockRiskCatalogClient;
      }
      if (config.baseURL?.includes('adaptive-learning')) {
        return mockAdaptiveLearningClient;
      }
      if (config.baseURL?.includes('ml-service')) {
        return mockMlServiceClient;
      }
      if (config.baseURL?.includes('ai-insights')) {
        return mockAiInsightsClient;
      }
      if (config.baseURL?.includes('shard-manager')) {
        return mockShardManagerClient;
      }
      if (config.baseURL?.includes('embeddings')) {
        return mockEmbeddingsClient;
      }
      if (config.baseURL?.includes('search-service')) {
        return { post: vi.fn().mockResolvedValue({ results: [] }) };
      }
      return {};
    });

    service = new RiskEvaluationService();
  });

  describe('getModelSelection', () => {
    it('should get model selection successfully', async () => {
      const tenantId = 'tenant-123';
      const context = 'risk-scoring';

      const mockSelection = {
        modelId: 'model-123',
        modelName: 'risk-scoring-v1',
        confidence: 0.95,
      };

      mockAdaptiveLearningClient.get.mockResolvedValue(mockSelection);

      const result = await service.getModelSelection(tenantId, context);

      expect(result).toEqual(mockSelection);
      expect(mockAdaptiveLearningClient.get).toHaveBeenCalledWith(
        `/api/v1/adaptive-learning/model-selection/${tenantId}?context=${context}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-ID': tenantId,
          }),
        })
      );
    });

    it('should handle errors and return default', async () => {
      const tenantId = 'tenant-123';

      mockAdaptiveLearningClient.get.mockRejectedValue(new Error('Service unavailable'));

      // Should not throw, but return a default or handle gracefully
      await expect(
        service.getModelSelection(tenantId)
      ).resolves.toBeDefined();
    });
  });

  describe('evaluateRisk', () => {
    it('should evaluate risk successfully', async () => {
      const tenantId = 'tenant-123';
      const request = {
        opportunityId: 'opp-123',
        tenantId,
        industryId: 'industry-123',
      };

      // Mock learned weights
      mockAdaptiveLearningClient.get.mockResolvedValueOnce({
        ruleBased: 1.0,
        ml: 0.9,
        ai: 0.8,
        historical: 0.9,
      });

      // Mock risk catalog
      mockRiskCatalogClient.get.mockResolvedValueOnce({
        risks: [
          {
            id: 'risk-1',
            name: 'Test Risk',
            category: 'financial',
            enabled: true,
          },
        ],
      });

      // Mock opportunity shard
      mockShardManagerClient.get.mockResolvedValueOnce({
        id: 'opp-123',
        tenantId,
        data: {
          amount: 100000,
          stage: 'negotiation',
        },
      });

      // Mock ML service
      mockMlServiceClient.post.mockResolvedValueOnce({
        score: 0.75,
        risks: [
          {
            riskId: 'risk-1',
            probability: 0.75,
            impact: 'high',
          },
        ],
      });

      const result = await service.evaluateRisk(request);

      expect(result).toHaveProperty('opportunityId');
      expect(result).toHaveProperty('detectedRisks');
      expect(mockAdaptiveLearningClient.get).toHaveBeenCalled();
      expect(mockRiskCatalogClient.get).toHaveBeenCalled();
    });

    it('should handle missing opportunity', async () => {
      const tenantId = 'tenant-123';
      const request = {
        opportunityId: 'non-existent',
        tenantId,
      };

      mockAdaptiveLearningClient.get.mockResolvedValueOnce({
        ruleBased: 1.0,
        ml: 0.9,
        ai: 0.8,
        historical: 0.9,
      });

      mockShardManagerClient.get.mockRejectedValue(new Error('Not found'));

      await expect(
        service.evaluateRisk(request)
      ).rejects.toThrow();
    });
  });

  describe('calculateRevenueAtRisk', () => {
    it('should calculate revenue at risk successfully', async () => {
      const tenantId = 'tenant-123';
      const opportunityId = 'opp-123';

      // Mock opportunity
      mockShardManagerClient.get.mockResolvedValueOnce({
        id: opportunityId,
        tenantId,
        data: {
          amount: 100000,
          probability: 0.8,
        },
      });

      // Mock risk evaluation
      const mockEvaluation = {
        opportunityId,
        detectedRisks: [
          {
            riskId: 'risk-1',
            probability: 0.3,
            impact: 'high',
            revenueImpact: 0.2,
          },
        ],
        overallRiskScore: 0.6,
      };

      // This would typically be called internally, but we can test the calculation logic
      const result = await service.calculateRevenueAtRisk(tenantId, opportunityId, mockEvaluation);

      expect(result).toHaveProperty('opportunityId');
      expect(result).toHaveProperty('revenueAtRisk');
      expect(result.revenueAtRisk).toBeGreaterThanOrEqual(0);
    });
  });
});

/**
 * Federated Learning Service Tests
 * Tests for privacy-preserving learning
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FederatedLearningService } from '../../../src/services/federated-learning.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { AdaptiveWeightLearningService } from '../../../src/services/adaptive-weight-learning.service.js';
import type { MetaLearningService } from '../../../src/services/meta-learning.service.js';

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

const mockAdaptiveWeightLearningService = {
  getWeights: vi.fn(),
} as unknown as AdaptiveWeightLearningService;

const mockMetaLearningService = {
  learnComponentTrust: vi.fn(),
} as unknown as MetaLearningService;

describe('FederatedLearningService', () => {
  let service: FederatedLearningService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FederatedLearningService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockAdaptiveWeightLearningService,
      mockMetaLearningService
    );
  });

  describe('startRound', () => {
    it('should start a federated learning round', async () => {
      const tenantId = 'tenant-1';
      const modelType = 'weights';
      const participants = ['tenant-1', 'tenant-2', 'tenant-3'];
      const aggregationMethod = 'weighted_average' as const;

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'round-1',
          roundId: 'round-1',
          tenantId,
          modelType,
          status: 'collecting',
          participants: participants.map(p => ({
            tenantId: p,
            contributionId: '',
            contributionHash: '',
          })),
          aggregation: {
            method: aggregationMethod,
            aggregatedModel: {},
            privacyBudget: 0,
          },
          startedAt: new Date(),
        },
      });

      const result = await service.startRound(tenantId, modelType, participants, aggregationMethod);

      expect(result).toBeDefined();
      expect(result.modelType).toBe(modelType);
      expect(result.status).toBe('collecting');
      expect(result.participants.length).toBe(3);
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should handle different model types', async () => {
      const tenantId = 'tenant-1';
      const modelType = 'patterns';
      const participants = ['tenant-1', 'tenant-2'];

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'round-1',
          roundId: 'round-1',
          tenantId,
          modelType,
          status: 'collecting',
        },
      });

      const result = await service.startRound(tenantId, modelType, participants);

      expect(result).toBeDefined();
      expect(result.modelType).toBe('patterns');
    });
  });

  describe('submitContribution', () => {
    it('should submit a federated learning contribution', async () => {
      const tenantId = 'tenant-1';
      const roundId = 'round-1';
      const contribution = {
        parameters: {
          weight1: 0.5,
          weight2: 0.3,
          weight3: 0.2,
        },
        sampleCount: 1000,
        metadata: { modelVersion: '1.0' },
      };
      const privacyConfig = {
        differentialPrivacy: true,
        epsilon: 1.0,
        delta: 0.0001,
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'contribution-1',
          contributionId: 'contribution-1',
          tenantId,
          roundId,
          modelType: 'weights',
          contribution,
          privacy: {
            differentialPrivacy: true,
            epsilon: privacyConfig.epsilon,
            delta: privacyConfig.delta,
            noiseAdded: 0.01,
          },
          submittedAt: new Date(),
        },
      });

      const result = await service.submitContribution(
        tenantId,
        roundId,
        contribution,
        privacyConfig
      );

      expect(result).toBeDefined();
      expect(result.contribution.parameters).toBeDefined();
      expect(result.privacy.differentialPrivacy).toBe(true);
      expect(mockContainer.items.create).toHaveBeenCalled();
    });

    it('should add noise for differential privacy', async () => {
      const tenantId = 'tenant-1';
      const roundId = 'round-1';
      const contribution = {
        parameters: { weight1: 0.5 },
        sampleCount: 1000,
      };
      const privacyConfig = {
        differentialPrivacy: true,
        epsilon: 0.5, // Lower epsilon = more noise
        delta: 0.0001,
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'contribution-1',
          tenantId,
          roundId,
          contribution,
          privacy: {
            differentialPrivacy: true,
            epsilon: privacyConfig.epsilon,
            delta: privacyConfig.delta,
            noiseAdded: 0.05, // Higher noise for lower epsilon
          },
        },
      });

      const result = await service.submitContribution(
        tenantId,
        roundId,
        contribution,
        privacyConfig
      );

      expect(result).toBeDefined();
      expect(result.privacy.noiseAdded).toBeGreaterThan(0);
    });
  });

  describe('aggregateAndComplete', () => {
    it('should aggregate contributions and complete round', async () => {
      const tenantId = 'tenant-1';
      const roundId = 'round-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            id: 'round-1',
            roundId,
            tenantId,
            status: 'collecting',
            participants: [
              { tenantId: 'tenant-1', contributionId: 'contribution-1' },
              { tenantId: 'tenant-2', contributionId: 'contribution-2' },
            ],
          },
        }),
        replace: vi.fn().mockResolvedValue({
          resource: {
            id: 'round-1',
            status: 'completed',
            aggregation: {
              method: 'weighted_average',
              aggregatedModel: {
                weight1: 0.5,
                weight2: 0.3,
              },
              privacyBudget: 0.8,
            },
            completedAt: new Date(),
          },
        }),
      });

      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'contribution-1',
              contribution: {
                parameters: { weight1: 0.5, weight2: 0.3 },
                sampleCount: 1000,
              },
            },
            {
              id: 'contribution-2',
              contribution: {
                parameters: { weight1: 0.6, weight2: 0.2 },
                sampleCount: 2000,
              },
            },
          ],
        }),
      });

      const result = await service.aggregateAndComplete(tenantId, roundId);

      expect(result).toBeDefined();
      expect(result.aggregation.aggregatedModel).toBeDefined();
      expect(result.status).toBe('completed');
    });
  });

  describe('getGlobalModel', () => {
    it('should retrieve global federated model', async () => {
      const tenantId = 'tenant-1';
      const modelType = 'weights';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'model-1',
              tenantId,
              modelType,
              globalModel: {
                weight1: 0.5,
                weight2: 0.3,
                weight3: 0.2,
              },
              roundCount: 5,
              performance: {
                accuracy: 0.85,
                improvement: 0.1,
              },
            },
          ],
        }),
      });

      const result = await service.getGlobalModel(tenantId, modelType);

      expect(result).toBeDefined();
      expect(result.globalModel).toBeDefined();
      expect(result.roundCount).toBeGreaterThan(0);
      expect(result.performance.accuracy).toBeGreaterThan(0);
    });

    it('should return null if no global model exists', async () => {
      const tenantId = 'tenant-1';
      const modelType = 'weights';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      });

      const result = await service.getGlobalModel(tenantId, modelType);

      expect(result).toBeNull();
    });
  });

  describe('privacy budget management', () => {
    it('should track privacy budget consumption', async () => {
      const tenantId = 'tenant-1';
      const roundId = 'round-1';
      const contribution = {
        parameters: { weight1: 0.5 },
        sampleCount: 1000,
      };
      const privacyConfig = {
        differentialPrivacy: true,
        epsilon: 0.5,
        delta: 0.0001,
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            id: 'round-1',
            roundId,
            tenantId,
            aggregation: {
              privacyBudget: 1.0,
            },
          },
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'contribution-1',
          tenantId,
          roundId,
          contribution,
          privacy: {
            differentialPrivacy: true,
            epsilon: privacyConfig.epsilon,
            delta: privacyConfig.delta,
          },
        },
      });

      const result = await service.submitContribution(
        tenantId,
        roundId,
        contribution,
        privacyConfig
      );

      expect(result).toBeDefined();
      expect(result.privacy.epsilon).toBe(privacyConfig.epsilon);
    });
  });
});

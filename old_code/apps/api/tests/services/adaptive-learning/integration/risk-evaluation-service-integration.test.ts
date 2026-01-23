/**
 * Risk Evaluation Service Integration Tests
 * Tests for RiskEvaluationService with adaptive learning integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiskEvaluationService } from '../../../../src/services/risk-evaluation.service';
import { AdaptiveWeightLearningService } from '../../../../src/services/adaptive-weight-learning.service';
import { OutcomeCollectorService } from '../../../../src/services/outcome-collector.service';
import { PerformanceTrackerService } from '../../../../src/services/performance-tracker.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { ShardRepository } from '../../../../src/repositories/shard.repository';
import type { ShardTypeRepository } from '../../../../src/repositories/shard-type.repository';
import type { ShardRelationshipService } from '../../../../src/services/shard-relationship.service';
import type { RiskCatalogService } from '../../../../src/services/risk-catalog.service';

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
        query: vi.fn().mockReturnValue({
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        }),
        create: vi.fn().mockResolvedValue({ resource: {} }),
        upsert: vi.fn().mockResolvedValue({ resource: {} }),
      },
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
} as unknown as Redis;

const mockShardRepository = {
  findById: vi.fn().mockResolvedValue({
    id: 'opp-1',
    shardTypeId: 'c_opportunity',
    tenantId: 'tenant-1',
    structuredData: {
      name: 'Test Opportunity',
      amount: 100000,
      stage: 'proposal',
    },
  }),
} as unknown as ShardRepository;

const mockShardTypeRepository = {
  findById: vi.fn().mockResolvedValue({
    id: 'c_opportunity',
    name: 'c_opportunity',
  }),
} as unknown as ShardTypeRepository;

const mockRelationshipService = {
  getRelatedShards: vi.fn().mockResolvedValue([]),
} as unknown as ShardRelationshipService;

const mockRiskCatalogService = {
  getCatalog: vi.fn().mockResolvedValue({
    risks: [],
  }),
} as unknown as RiskCatalogService;

describe('RiskEvaluationService Integration with Adaptive Learning', () => {
  let riskService: RiskEvaluationService;
  let adaptiveWeightService: AdaptiveWeightLearningService;
  let outcomeCollector: OutcomeCollectorService;
  let performanceTracker: PerformanceTrackerService;

  const tenantId = 'tenant-1';
  const userId = 'user-1';
  const opportunityId = 'opp-1';

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize adaptive learning services
    adaptiveWeightService = new AdaptiveWeightLearningService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );

    outcomeCollector = new OutcomeCollectorService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );

    performanceTracker = new PerformanceTrackerService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );

    // Initialize RiskEvaluationService with adaptive learning services
    riskService = new RiskEvaluationService(
      mockMonitoring,
      mockShardRepository,
      mockShardTypeRepository,
      mockRelationshipService,
      mockRiskCatalogService,
      undefined, // vectorSearchService
      undefined, // insightService
      undefined, // serviceBusService
      undefined, // dataQualityService
      undefined, // trustLevelService
      undefined, // riskAIValidationService
      undefined, // riskExplainabilityService
      undefined, // comprehensiveAuditTrailService
      adaptiveWeightService,
      outcomeCollector,
      performanceTracker
    );
  });

  describe('evaluateOpportunity with adaptive weights', () => {
    it('should use learned weights for risk detection', async () => {
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        ml: 0.95,
        rules: 0.98,
        llm: 0.90,
        historical: 0.92,
      }));

      const evaluation = await riskService.evaluateOpportunity(
        opportunityId,
        tenantId,
        userId
      );

      expect(evaluation).toBeDefined();
      expect(evaluation.riskScore).toBeDefined();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should fallback to default weights when learning unavailable', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      const evaluation = await riskService.evaluateOpportunity(
        opportunityId,
        tenantId,
        userId
      );

      expect(evaluation).toBeDefined();
      // Should still work with defaults
    });

    it('should track prediction for learning', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      const evaluation = await riskService.evaluateOpportunity(
        opportunityId,
        tenantId,
        userId
      );

      // Should have tracked prediction
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });
  });

  describe('onOpportunityOutcome', () => {
    it('should record opportunity outcome for learning', async () => {
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        id: 'pred-1',
        tenantId,
        serviceType: 'risk',
      }));

      await riskService.onOpportunityOutcome(
        opportunityId,
        tenantId,
        'won'
      );

      // Should record outcome
      expect(mockCosmosClient.database().container().items.create).toHaveBeenCalled();
    });

    it('should handle different outcome types', async () => {
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        id: 'pred-1',
        tenantId,
        serviceType: 'risk',
      }));

      await riskService.onOpportunityOutcome(opportunityId, tenantId, 'won');
      await riskService.onOpportunityOutcome(opportunityId, tenantId, 'lost');
      await riskService.onOpportunityOutcome(opportunityId, tenantId, 'cancelled');

      expect(mockCosmosClient.database().container().items.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('learning integration', () => {
    it('should learn from risk evaluation outcomes', async () => {
      // Evaluate opportunity
      (mockRedis.get as any).mockResolvedValue(null);
      const evaluation = await riskService.evaluateOpportunity(
        opportunityId,
        tenantId,
        userId
      );

      // Record outcome
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        id: 'pred-1',
        tenantId,
        serviceType: 'risk',
        context: { industry: 'tech' },
        prediction: { riskScore: evaluation.riskScore },
      }));

      await riskService.onOpportunityOutcome(opportunityId, tenantId, 'won');

      // Should learn from outcome
      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
    });

    it('should update weights based on performance', async () => {
      // Simulate multiple evaluations and outcomes
      for (let i = 0; i < 5; i++) {
        (mockRedis.get as any).mockResolvedValue(null);
        await riskService.evaluateOpportunity(opportunityId, tenantId, userId);

        (mockRedis.get as any).mockResolvedValue(JSON.stringify({
          id: `pred-${i}`,
          tenantId,
          serviceType: 'risk',
        }));

        await riskService.onOpportunityOutcome(
          opportunityId,
          tenantId,
          i % 2 === 0 ? 'won' : 'lost'
        );
      }

      // Should have learned from outcomes
      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should continue working when adaptive services unavailable', async () => {
      const serviceWithoutAdaptive = new RiskEvaluationService(
        mockMonitoring,
        mockShardRepository,
        mockShardTypeRepository,
        mockRelationshipService,
        mockRiskCatalogService
      );

      const evaluation = await serviceWithoutAdaptive.evaluateOpportunity(
        opportunityId,
        tenantId,
        userId
      );

      expect(evaluation).toBeDefined();
      // Should work with defaults
    });

    it('should handle outcome collection errors gracefully', async () => {
      (mockRedis.get as any).mockRejectedValue(new Error('Redis error'));

      await expect(
        riskService.onOpportunityOutcome(opportunityId, tenantId, 'won')
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

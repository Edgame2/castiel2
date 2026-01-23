/**
 * Risk Evaluation Flow Integration Tests
 * End-to-end tests for risk evaluation with assumption tracking
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiskEvaluationService } from '../../src/services/risk-evaluation.service';
import { RiskCatalogService } from '../../src/services/risk-catalog.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { ShardRepository } from '../../src/repositories/shard.repository';
import type { ShardTypeRepository } from '../../src/repositories/shard-type.repository';
import type { ShardRelationshipService } from '../../src/services/shard-relationship.service';

// Mock dependencies
const mockMonitoring: IMonitoringProvider = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  trackMetric: vi.fn(),
  trackTrace: vi.fn(),
} as any;

const mockShardRepository = {
  findById: vi.fn(),
  update: vi.fn(),
} as unknown as ShardRepository;

const mockShardTypeRepository = {
  findById: vi.fn(),
} as unknown as ShardTypeRepository;

const mockRelationshipService = {
  getRelatedShards: vi.fn(),
} as unknown as ShardRelationshipService;

const mockRiskCatalogService = {
  getCatalog: vi.fn(),
} as unknown as RiskCatalogService;

describe('Risk Evaluation Flow - Integration', () => {
  let service: RiskEvaluationService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    service = new RiskEvaluationService(
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
      undefined  // comprehensiveAuditTrailService
    );

    // Setup default mocks
    (mockShardRepository.findById as any).mockResolvedValue({
      id: 'opp-1',
      shardTypeId: 'c_opportunity',
      tenantId: 'tenant-1',
      structuredData: {
        name: 'Test Opportunity',
        amount: 100000,
      },
    });

    (mockShardTypeRepository.findById as any).mockResolvedValue({
      id: 'c_opportunity',
      name: 'Opportunity',
    });

    (mockRelationshipService.getRelatedShards as any).mockResolvedValue([]);
    (mockRiskCatalogService.getCatalog as any).mockResolvedValue({
      risks: [],
    });
  });

  describe('End-to-End Risk Evaluation', () => {
    it('should complete full evaluation flow with assumptions', async () => {
      // Mock the detectRisks method to return empty risks
      (service as any).detectRisks = vi.fn().mockResolvedValue({
        risks: [],
        detectionMethods: [],
      });

      (service as any).calculateRiskScore = vi.fn().mockResolvedValue({
        globalScore: 0.5,
        categoryScores: {},
      });

      (service as any).calculateRevenueAtRisk = vi.fn().mockReturnValue(50000);
      (service as any).createRiskSnapshot = vi.fn().mockResolvedValue(undefined);

      const evaluation = await service.evaluateOpportunity(
        'opp-1',
        'tenant-1',
        'user-1'
      );

      // Verify evaluation structure
      expect(evaluation).toBeDefined();
      expect(evaluation.riskScore).toBeDefined();
      expect(evaluation.assumptions).toBeDefined();
      expect(evaluation.assumptions).toHaveProperty('dataCompleteness');
      expect(evaluation.assumptions).toHaveProperty('dataStaleness');
      expect(evaluation.assumptions).toHaveProperty('serviceAvailability');
      
      // Verify assumptions are populated
      expect(evaluation.assumptions.dataCompleteness).toBeGreaterThanOrEqual(0);
      expect(evaluation.assumptions.dataCompleteness).toBeLessThanOrEqual(1);
    });

    it('should include assumptions in cached evaluation', async () => {
      // First evaluation
      (service as any).detectRisks = vi.fn().mockResolvedValue({
        risks: [],
        detectionMethods: [],
      });

      (service as any).calculateRiskScore = vi.fn().mockResolvedValue({
        globalScore: 0.5,
        categoryScores: {},
      });

      (service as any).calculateRevenueAtRisk = vi.fn().mockReturnValue(50000);
      (service as any).createRiskSnapshot = vi.fn().mockResolvedValue(undefined);

      const evaluation1 = await service.evaluateOpportunity(
        'opp-1',
        'tenant-1',
        'user-1'
      );

      expect(evaluation1.assumptions).toBeDefined();

      // Second evaluation (should use cache)
      const evaluation2 = await service.evaluateOpportunity(
        'opp-1',
        'tenant-1',
        'user-1'
      );

      // Cached evaluation should also include assumptions
      expect(evaluation2.assumptions).toBeDefined();
      expect(evaluation2.assumptions).toEqual(evaluation1.assumptions);
    });
  });

  describe('Assumption Tracking Integration', () => {
    it('should track data quality in assumptions', async () => {
      const mockDataQualityService = {
        validateOpportunityDataQuality: vi.fn().mockResolvedValue({
          completeness: 0.8,
          staleness: 5,
          missingRelationships: [],
          issues: [],
          qualityScore: 0.75,
        }),
        checkQualityGate: vi.fn().mockReturnValue({
          shouldProceed: true,
          action: 'proceed',
        }),
      };

      const serviceWithDQ = new RiskEvaluationService(
        mockMonitoring,
        mockShardRepository,
        mockShardTypeRepository,
        mockRelationshipService,
        mockRiskCatalogService,
        undefined,
        undefined,
        undefined,
        mockDataQualityService as any,
        undefined,
        undefined,
        undefined,
        undefined
      );

      (serviceWithDQ as any).detectRisks = vi.fn().mockResolvedValue({
        risks: [],
        detectionMethods: [],
      });

      (serviceWithDQ as any).calculateRiskScore = vi.fn().mockResolvedValue({
        globalScore: 0.5,
        categoryScores: {},
      });

      (serviceWithDQ as any).calculateRevenueAtRisk = vi.fn().mockReturnValue(50000);
      (serviceWithDQ as any).createRiskSnapshot = vi.fn().mockResolvedValue(undefined);

      const evaluation = await serviceWithDQ.evaluateOpportunity(
        'opp-1',
        'tenant-1',
        'user-1'
      );

      expect(evaluation.assumptions.dataCompleteness).toBe(0.8);
      expect(evaluation.assumptions.dataStaleness).toBe(5);
      expect(evaluation.assumptions.dataQualityScore).toBe(0.75);
    });
  });
});

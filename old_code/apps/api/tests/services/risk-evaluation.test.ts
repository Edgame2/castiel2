/**
 * Risk Evaluation Service Tests
 * Tests for assumption tracking and risk evaluation functionality
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiskEvaluationService } from '../../src/services/risk-evaluation.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { ShardRepository } from '../../src/repositories/shard.repository';
import type { ShardTypeRepository } from '../../src/repositories/shard-type.repository';
import type { ShardRelationshipService } from '../../src/services/shard-relationship.service';
import type { RiskCatalogService } from '../../src/services/risk-catalog.service';
import { CORE_SHARD_TYPE_NAMES } from '../../src/types/core-shard-types';

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

describe('RiskEvaluationService - Assumption Tracking', () => {
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
      name: CORE_SHARD_TYPE_NAMES.OPPORTUNITY,
    });

    (mockRelationshipService.getRelatedShards as any).mockResolvedValue([]);
    (mockRiskCatalogService.getCatalog as any).mockResolvedValue({
      risks: [],
    });
  });

  describe('assumption population', () => {
    it('should always populate assumptions in evaluation result', async () => {
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

      expect(evaluation).toBeDefined();
      expect(evaluation.assumptions).toBeDefined();
      expect(evaluation.assumptions).toHaveProperty('dataCompleteness');
      expect(evaluation.assumptions).toHaveProperty('dataStaleness');
      expect(evaluation.assumptions).toHaveProperty('missingRelatedShards');
      expect(evaluation.assumptions).toHaveProperty('missingRequiredFields');
      expect(evaluation.assumptions).toHaveProperty('dataQualityScore');
      expect(evaluation.assumptions).toHaveProperty('serviceAvailability');
      expect(evaluation.assumptions).toHaveProperty('contextTokenCount');
      expect(evaluation.assumptions).toHaveProperty('contextTruncated');
      expect(evaluation.assumptions).toHaveProperty('aiModelAvailable');
    });

    it('should populate assumptions with defaults when dataQualityService is unavailable', async () => {
      // Service without dataQualityService
      const serviceWithoutDQ = new RiskEvaluationService(
        mockMonitoring,
        mockShardRepository,
        mockShardTypeRepository,
        mockRelationshipService,
        mockRiskCatalogService,
        undefined,
        undefined,
        undefined,
        undefined, // No dataQualityService
        undefined,
        undefined,
        undefined,
        undefined
      );

      (serviceWithoutDQ as any).detectRisks = vi.fn().mockResolvedValue({
        risks: [],
        detectionMethods: [],
      });

      (serviceWithoutDQ as any).calculateRiskScore = vi.fn().mockResolvedValue({
        globalScore: 0.5,
        categoryScores: {},
      });

      (serviceWithoutDQ as any).calculateRevenueAtRisk = vi.fn().mockReturnValue(50000);
      (serviceWithoutDQ as any).createRiskSnapshot = vi.fn().mockResolvedValue(undefined);

      const evaluation = await serviceWithoutDQ.evaluateOpportunity(
        'opp-1',
        'tenant-1',
        'user-1'
      );

      expect(evaluation.assumptions).toBeDefined();
      expect(evaluation.assumptions.dataCompleteness).toBe(0.5); // Default value
      expect(evaluation.assumptions.dataStaleness).toBe(0); // Default value
      expect(evaluation.assumptions.dataQualityScore).toBe(0.5); // Default value
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

      expect(evaluation2.assumptions).toBeDefined();
      expect(evaluation2.assumptions).toEqual(evaluation1.assumptions);
    });
  });

  describe('assumption data quality integration', () => {
    it('should populate assumptions from dataQualityService when available', async () => {
      const mockDataQualityService = {
        validateOpportunityDataQuality: vi.fn().mockResolvedValue({
          completeness: 0.8,
          staleness: 5,
          missingRelationships: ['c_contact'],
          issues: [
            { type: 'missing_field', field: 'closeDate', severity: 'high' },
          ],
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
      expect(evaluation.assumptions.missingRelatedShards).toContain('c_contact');
      expect(evaluation.assumptions.missingRequiredFields).toContain('closeDate');
      expect(evaluation.assumptions.dataQualityScore).toBe(0.75);
    });
  });
});

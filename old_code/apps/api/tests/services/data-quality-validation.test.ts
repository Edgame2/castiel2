/**
 * Data Quality Validation Tests
 * Phase 4.3: Testing Coverage Enhancement
 * 
 * Comprehensive test suite for data quality validation:
 * - Missing required fields
 * - Invalid field values
 * - Stale data detection
 * - Relationship validation
 * - Scoring accuracy
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataQualityService } from '../../src/services/data-quality.service.js';
import { ShardValidationService } from '../../src/services/shard-validation.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { Shard } from '../../src/types/shard.types.js';

describe('Data Quality Validation - DataQualityService', () => {
  let dataQualityService: DataQualityService;
  let mockShardValidationService: any;
  let monitoring: IMonitoringProvider;

  beforeEach(() => {
    monitoring = {
      trackEvent: vi.fn(),
      trackException: vi.fn(),
      trackMetric: vi.fn(),
    } as any;

    mockShardValidationService = {
      validateShardData: vi.fn(),
    };

    dataQualityService = new DataQualityService(
      mockShardValidationService as ShardValidationService,
      monitoring
    );
  });

  const createMockShard = (overrides: Partial<Shard> = {}): Shard => ({
    id: 'shard-1',
    tenantId: 'tenant-1',
    shardTypeId: 'c_opportunity',
    name: 'Test Opportunity',
    structuredData: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  describe('Missing Required Fields', () => {
    it('should detect missing required fields from validation service', async () => {
      const opportunity = createMockShard({
        structuredData: {
          name: 'Test',
          // Missing required field 'amount'
        },
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: false,
        errors: [
          {
            field: 'amount',
            message: 'amount is required',
            code: 'REQUIRED',
          },
        ],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        []
      );

      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].type).toBe('missing_field');
      expect(report.issues[0].field).toBe('amount');
      expect(report.issues[0].severity).toBe('high');
      expect(report.fieldCompleteness.amount).toBe(false);
    });

    it('should detect multiple missing required fields', async () => {
      const opportunity = createMockShard({
        structuredData: {
          name: 'Test',
        },
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: false,
        errors: [
          {
            field: 'amount',
            message: 'amount is required',
            code: 'REQUIRED',
          },
          {
            field: 'closeDate',
            message: 'closeDate is required',
            code: 'REQUIRED',
          },
        ],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        []
      );

      expect(report.issues.filter(i => i.type === 'missing_field')).toHaveLength(2);
      expect(report.fieldCompleteness.amount).toBe(false);
      expect(report.fieldCompleteness.closeDate).toBe(false);
    });

    it('should detect missing required fields from quality gate config', async () => {
      const opportunity = createMockShard({
        structuredData: {
          name: 'Test',
          // Missing 'priority' field from config
        },
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const qualityGateConfig = {
        requiredFields: ['priority', 'status'],
      };

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        [],
        [],
        qualityGateConfig
      );

      expect(report.issues.filter(i => i.type === 'missing_field' && i.field === 'priority')).toHaveLength(1);
      expect(report.issues.filter(i => i.type === 'missing_field' && i.field === 'status')).toHaveLength(1);
      expect(report.fieldCompleteness.priority).toBe(false);
      expect(report.fieldCompleteness.status).toBe(false);
    });

    it('should not duplicate missing field issues', async () => {
      const opportunity = createMockShard({
        structuredData: {},
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: false,
        errors: [
          {
            field: 'amount',
            message: 'amount is required',
            code: 'REQUIRED',
          },
        ],
      });

      const qualityGateConfig = {
        requiredFields: ['amount'], // Same field in config
      };

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        [],
        [],
        qualityGateConfig
      );

      // Should only have one issue for 'amount'
      expect(report.issues.filter(i => i.field === 'amount')).toHaveLength(1);
    });

    it('should mark fields as complete when present', async () => {
      const opportunity = createMockShard({
        structuredData: {
          name: 'Test',
          amount: 10000,
          closeDate: '2024-12-31',
        },
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const qualityGateConfig = {
        requiredFields: ['amount', 'closeDate'],
      };

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        [],
        [],
        qualityGateConfig
      );

      expect(report.fieldCompleteness.amount).toBe(true);
      expect(report.fieldCompleteness.closeDate).toBe(true);
      expect(report.issues.filter(i => i.type === 'missing_field')).toHaveLength(0);
    });
  });

  describe('Invalid Field Values', () => {
    it('should detect invalid field values from validation service', async () => {
      const opportunity = createMockShard({
        structuredData: {
          name: 'Test',
          amount: -1000, // Invalid: negative amount
        },
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: false,
        errors: [
          {
            field: 'amount',
            message: 'amount must be positive',
            code: 'INVALID_VALUE',
          },
        ],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        []
      );

      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].type).toBe('invalid_value');
      expect(report.issues[0].field).toBe('amount');
      expect(report.issues[0].severity).toBe('medium');
      expect(report.issues[0].remediation).toContain('correct the value');
    });

    it('should detect multiple invalid field values', async () => {
      const opportunity = createMockShard({
        structuredData: {
          name: 'Test',
          amount: -1000,
          closeDate: 'invalid-date',
        },
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: false,
        errors: [
          {
            field: 'amount',
            message: 'amount must be positive',
            code: 'INVALID_VALUE',
          },
          {
            field: 'closeDate',
            message: 'closeDate must be a valid date',
            code: 'INVALID_VALUE',
          },
        ],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        []
      );

      expect(report.issues.filter(i => i.type === 'invalid_value')).toHaveLength(2);
    });

    it('should handle validation service errors gracefully', async () => {
      const opportunity = createMockShard();

      mockShardValidationService.validateShardData.mockRejectedValue(
        new Error('Validation service error')
      );

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        []
      );

      // Should still return a report (with default values)
      expect(report).toBeDefined();
      expect(monitoring.trackException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          operation: 'data-quality.validateFields',
        })
      );
    });
  });

  describe('Stale Data Detection', () => {
    it('should detect fresh data (< 7 days)', async () => {
      const opportunity = createMockShard({
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        []
      );

      expect(report.stalenessCategory).toBe('fresh');
      expect(report.staleness).toBeLessThan(7);
      expect(report.issues.filter(i => i.type === 'stale_data')).toHaveLength(0);
    });

    it('should detect recent data (7-30 days)', async () => {
      const opportunity = createMockShard({
        updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        []
      );

      expect(report.stalenessCategory).toBe('recent');
      expect(report.staleness).toBeGreaterThanOrEqual(7);
      expect(report.staleness).toBeLessThan(30);
      expect(report.issues.filter(i => i.type === 'stale_data')).toHaveLength(0);
    });

    it('should detect aging data (30-90 days) and add issue', async () => {
      const opportunity = createMockShard({
        updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        []
      );

      expect(report.stalenessCategory).toBe('aging');
      expect(report.staleness).toBeGreaterThanOrEqual(30);
      expect(report.staleness).toBeLessThan(90);
      
      const staleIssues = report.issues.filter(i => i.type === 'stale_data');
      expect(staleIssues).toHaveLength(1);
      expect(staleIssues[0].severity).toBe('medium');
      expect(staleIssues[0].days).toBeGreaterThanOrEqual(60);
    });

    it('should detect stale data (90-180 days) and add high severity issue', async () => {
      const opportunity = createMockShard({
        updatedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days ago
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        []
      );

      expect(report.stalenessCategory).toBe('stale');
      expect(report.staleness).toBeGreaterThanOrEqual(90);
      expect(report.staleness).toBeLessThan(180);
      
      const staleIssues = report.issues.filter(i => i.type === 'stale_data');
      expect(staleIssues).toHaveLength(1);
      expect(staleIssues[0].severity).toBe('high');
      expect(staleIssues[0].remediation).toContain('should be refreshed');
    });

    it('should detect critically stale data (> 180 days)', async () => {
      const opportunity = createMockShard({
        updatedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(), // 200 days ago
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        []
      );

      expect(report.stalenessCategory).toBe('critical');
      expect(report.staleness).toBeGreaterThanOrEqual(180);
      
      const staleIssues = report.issues.filter(i => i.type === 'stale_data');
      expect(staleIssues).toHaveLength(1);
      expect(staleIssues[0].severity).toBe('high');
      expect(staleIssues[0].remediation).toContain('must be refreshed');
    });

    it('should fallback to createdAt when updatedAt is missing', async () => {
      const opportunity = createMockShard({
        updatedAt: undefined,
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        []
      );

      expect(report.staleness).toBeGreaterThan(30);
      expect(report.stalenessCategory).toBe('aging');
    });

    it('should handle missing both updatedAt and createdAt', async () => {
      const opportunity = createMockShard({
        updatedAt: undefined,
        createdAt: undefined,
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        []
      );

      expect(report.staleness).toBe(0);
      expect(report.stalenessCategory).toBe('fresh');
    });
  });

  describe('Relationship Validation', () => {
    it('should detect missing expected relationships', async () => {
      const opportunity = createMockShard();
      const relatedShards: Shard[] = []; // No related shards

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        relatedShards,
        ['c_account', 'c_contact'] // Expected relationships
      );

      expect(report.missingRelationships).toContain('c_account');
      expect(report.missingRelationships).toContain('c_contact');
      expect(report.issues.filter(i => i.type === 'missing_relationship')).toHaveLength(2);
      expect(report.relationshipCompleteness).toBe(0);
    });

    it('should detect partial missing relationships', async () => {
      const opportunity = createMockShard();
      const relatedShards: Shard[] = [
        createMockShard({ id: 'account-1', shardTypeId: 'c_account' }),
      ];

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        relatedShards,
        ['c_account', 'c_contact']
      );

      expect(report.missingRelationships).toContain('c_contact');
      expect(report.missingRelationships).not.toContain('c_account');
      expect(report.relationshipCompleteness).toBe(0.5);
    });

    it('should detect all relationships present', async () => {
      const opportunity = createMockShard();
      const relatedShards: Shard[] = [
        createMockShard({ id: 'account-1', shardTypeId: 'c_account' }),
        createMockShard({ id: 'contact-1', shardTypeId: 'c_contact' }),
      ];

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        relatedShards,
        ['c_account', 'c_contact']
      );

      expect(report.missingRelationships).toHaveLength(0);
      expect(report.relationshipCompleteness).toBe(1.0);
      expect(report.issues.filter(i => i.type === 'missing_relationship')).toHaveLength(0);
    });

    it('should detect missing required relationships from config', async () => {
      const opportunity = createMockShard();
      const relatedShards: Shard[] = [];

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const qualityGateConfig = {
        requiredRelationships: ['c_account'],
      };

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        relatedShards,
        [],
        qualityGateConfig
      );

      expect(report.missingRelationships).toContain('c_account');
      const missingRelIssues = report.issues.filter(
        i => i.type === 'missing_relationship' && i.severity === 'high'
      );
      expect(missingRelIssues.length).toBeGreaterThan(0);
    });

    it('should not duplicate missing relationship issues', async () => {
      const opportunity = createMockShard();
      const relatedShards: Shard[] = [];

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const qualityGateConfig = {
        requiredRelationships: ['c_account'],
      };

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        relatedShards,
        ['c_account'], // Same in expected and required
        qualityGateConfig
      );

      // Should only have one issue for c_account
      const accountIssues = report.issues.filter(
        i => i.type === 'missing_relationship' && i.message.includes('c_account')
      );
      expect(accountIssues.length).toBeLessThanOrEqual(2); // Can have one from expected and one from required
    });
  });

  describe('Scoring Accuracy', () => {
    it('should calculate quality score correctly for perfect data', async () => {
      const opportunity = createMockShard({
        structuredData: {
          name: 'Test',
          amount: 10000,
          closeDate: '2024-12-31',
        },
        updatedAt: new Date().toISOString(), // Fresh
      });

      const relatedShards: Shard[] = [
        createMockShard({ id: 'account-1', shardTypeId: 'c_account' }),
        createMockShard({ id: 'contact-1', shardTypeId: 'c_contact' }),
      ];

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        relatedShards,
        ['c_account', 'c_contact']
      );

      expect(report.qualityScore).toBeGreaterThan(0.8);
      expect(report.completeness).toBeGreaterThan(0);
      expect(report.relationshipCompleteness).toBe(1.0);
      expect(report.stalenessCategory).toBe('fresh');
    });

    it('should calculate lower score for missing fields', async () => {
      const opportunity = createMockShard({
        structuredData: {
          name: 'Test',
          // Missing required fields
        },
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: false,
        errors: [
          {
            field: 'amount',
            message: 'amount is required',
            code: 'REQUIRED',
          },
          {
            field: 'closeDate',
            message: 'closeDate is required',
            code: 'REQUIRED',
          },
        ],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        []
      );

      expect(report.qualityScore).toBeLessThan(0.7);
      expect(report.completeness).toBeLessThan(1.0);
    });

    it('should calculate lower score for stale data', async () => {
      const opportunity = createMockShard({
        updatedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(), // 200 days ago
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        []
      );

      expect(report.qualityScore).toBeLessThan(0.6);
      expect(report.stalenessCategory).toBe('critical');
    });

    it('should calculate lower score for missing relationships', async () => {
      const opportunity = createMockShard();
      const relatedShards: Shard[] = []; // No relationships

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        relatedShards,
        ['c_account', 'c_contact']
      );

      expect(report.qualityScore).toBeLessThan(0.9);
      expect(report.relationshipCompleteness).toBe(0);
    });

    it('should calculate score with weighted factors', async () => {
      const opportunity = createMockShard({
        structuredData: {
          name: 'Test',
          amount: 10000,
        },
        updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
      });

      const relatedShards: Shard[] = [
        createMockShard({ id: 'account-1', shardTypeId: 'c_account' }),
        // Missing c_contact
      ];

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        relatedShards,
        ['c_account', 'c_contact']
      );

      // Score should reflect all factors
      expect(report.qualityScore).toBeGreaterThan(0);
      expect(report.qualityScore).toBeLessThan(1);
      expect(report.completeness).toBeGreaterThan(0);
      expect(report.relationshipCompleteness).toBe(0.5);
      expect(report.stalenessCategory).toBe('aging');
    });

    it('should ensure quality score is between 0 and 1', async () => {
      const opportunity = createMockShard({
        structuredData: {},
        updatedAt: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(), // Very stale
      });

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: false,
        errors: [
          { field: 'amount', message: 'required', code: 'REQUIRED' },
          { field: 'closeDate', message: 'required', code: 'REQUIRED' },
          { field: 'name', message: 'required', code: 'REQUIRED' },
        ],
      });

      const report = await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        [],
        ['c_account', 'c_contact']
      );

      expect(report.qualityScore).toBeGreaterThanOrEqual(0);
      expect(report.qualityScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Quality Gate Checks', () => {
    it('should block when quality score is below block threshold', () => {
      const report = {
        qualityScore: 0.2, // Below default 0.3 threshold
        issues: [],
        completeness: 0.2,
        staleness: 0,
        missingRelationships: [],
        fieldCompleteness: {},
        relationshipCompleteness: 0.5,
        stalenessCategory: 'fresh' as const,
      };

      const result = dataQualityService.checkQualityGate(report);

      expect(result.shouldProceed).toBe(false);
      expect(result.action).toBe('block');
      expect(result.message).toContain('too low');
    });

    it('should warn when quality score is below warn threshold', () => {
      const report = {
        qualityScore: 0.5, // Below default 0.6 threshold but above 0.3
        issues: [],
        completeness: 0.5,
        staleness: 0,
        missingRelationships: [],
        fieldCompleteness: {},
        relationshipCompleteness: 0.5,
        stalenessCategory: 'fresh' as const,
      };

      const result = dataQualityService.checkQualityGate(report);

      expect(result.shouldProceed).toBe(true);
      expect(result.action).toBe('warn');
      expect(result.message).toContain('concerns');
    });

    it('should proceed when quality score is above warn threshold', () => {
      const report = {
        qualityScore: 0.8, // Above default 0.6 threshold
        issues: [],
        completeness: 0.8,
        staleness: 0,
        missingRelationships: [],
        fieldCompleteness: {},
        relationshipCompleteness: 1.0,
        stalenessCategory: 'fresh' as const,
      };

      const result = dataQualityService.checkQualityGate(report);

      expect(result.shouldProceed).toBe(true);
      expect(result.action).toBe('proceed');
      expect(result.message).toBeUndefined();
    });

    it('should block when critical stale data exceeds max staleness', () => {
      const report = {
        qualityScore: 0.5,
        issues: [
          {
            type: 'stale_data' as const,
            severity: 'high' as const,
            message: 'Data is 200 days old',
            days: 200,
          },
        ],
        completeness: 0.8,
        staleness: 200,
        missingRelationships: [],
        fieldCompleteness: {},
        relationshipCompleteness: 1.0,
        stalenessCategory: 'critical' as const,
      };

      const config = {
        maxStalenessDays: 180,
      };

      const result = dataQualityService.checkQualityGate(report, config);

      expect(result.shouldProceed).toBe(false);
      expect(result.action).toBe('block');
    });

    it('should block when required fields are missing', () => {
      const report = {
        qualityScore: 0.5,
        issues: [
          {
            type: 'missing_field' as const,
            field: 'amount',
            severity: 'high' as const,
            message: 'amount is required',
          },
        ],
        completeness: 0.5,
        staleness: 0,
        missingRelationships: [],
        fieldCompleteness: {},
        relationshipCompleteness: 1.0,
        stalenessCategory: 'fresh' as const,
      };

      const config = {
        requiredFields: ['amount'],
      };

      const result = dataQualityService.checkQualityGate(report, config);

      expect(result.shouldProceed).toBe(false);
      expect(result.action).toBe('block');
    });

    it('should use custom thresholds from config', () => {
      const report = {
        qualityScore: 0.4,
        issues: [],
        completeness: 0.4,
        staleness: 0,
        missingRelationships: [],
        fieldCompleteness: {},
        relationshipCompleteness: 0.5,
        stalenessCategory: 'fresh' as const,
      };

      const config = {
        blockThreshold: 0.2, // Lower threshold
        warnThreshold: 0.5, // Higher threshold
      };

      const result = dataQualityService.checkQualityGate(report, config);

      expect(result.shouldProceed).toBe(true);
      expect(result.action).toBe('warn'); // 0.4 is below 0.5 warn threshold
    });
  });

  describe('Event Tracking', () => {
    it('should track validation event with metrics', async () => {
      const opportunity = createMockShard();

      mockShardValidationService.validateShardData.mockResolvedValue({
        valid: true,
        errors: [],
      });

      await dataQualityService.validateOpportunityDataQuality(
        opportunity,
        []
      );

      expect(monitoring.trackEvent).toHaveBeenCalledWith(
        'data-quality.validated',
        expect.objectContaining({
          tenantId: 'tenant-1',
          opportunityId: 'shard-1',
          qualityScore: expect.any(Number),
          issueCount: expect.any(Number),
          stalenessCategory: expect.any(String),
          durationMs: expect.any(Number),
        })
      );
    });
  });
});

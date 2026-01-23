/**
 * RetentionService Unit Tests
 * Per ModuleImplementationGuide Section 12: Testing Requirements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetentionService } from '../../../src/services/RetentionService';

// Mock config
vi.mock('../../../src/config', () => ({
  getConfig: vi.fn().mockReturnValue({
    defaults: {
      retention: {
        default_days: 90,
        min_days: 30,
        max_days: 365,
      },
    },
  }),
}));

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('RetentionService', () => {
  let retentionService: RetentionService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      audit_retention_policies: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      audit_logs: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    retentionService = new RetentionService(mockPrisma);
  });

  describe('getPolicy', () => {
    it('should retrieve a policy by organization', async () => {
      const mockPolicy = {
        id: 'policy-1',
        organizationId: 'org-1',
        category: null,
        severity: null,
        retentionDays: 90,
        archiveAfterDays: 60,
        deleteAfterDays: 90,
        minRetentionDays: 30,
        maxRetentionDays: 365,
        immutable: false,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedBy: 'user-1',
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.audit_retention_policies.findFirst).mockResolvedValue(mockPolicy);

      const result = await retentionService.getPolicy('org-1');

      expect(result).toBeDefined();
      expect(result?.organizationId).toBe('org-1');
    });

    it('should return default policy when none found', async () => {
      vi.mocked(mockPrisma.audit_retention_policies.findFirst).mockResolvedValue(null);

      const result = await retentionService.getPolicy('org-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('default');
      expect(result?.retentionDays).toBe(90); // From mocked config
    });
  });

  describe('createPolicy', () => {
    it('should create a retention policy', async () => {
      const input = {
        organizationId: 'org-1',
        retentionDays: 90,
        deleteAfterDays: 90,
      };

      const mockPolicy = {
        id: 'policy-1',
        organizationId: 'org-1',
        category: null,
        severity: null,
        retentionDays: 90,
        archiveAfterDays: null,
        deleteAfterDays: 90,
        minRetentionDays: 30,
        maxRetentionDays: 365,
        immutable: false,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedBy: 'user-1',
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.audit_retention_policies.create).mockResolvedValue(mockPolicy);

      const result = await retentionService.createPolicy(input, 'user-1');

      expect(result).toBeDefined();
      expect(result.organizationId).toBe('org-1');
      expect(mockPrisma.audit_retention_policies.create).toHaveBeenCalled();
    });
  });

  describe('listPolicies', () => {
    it('should list policies for organization', async () => {
      const mockPolicies = [
        {
          id: 'policy-1',
          organizationId: 'org-1',
          category: null,
          severity: null,
          retentionDays: 90,
          archiveAfterDays: null,
          deleteAfterDays: 90,
          minRetentionDays: 30,
          maxRetentionDays: 365,
          immutable: false,
          createdBy: 'user-1',
          createdAt: new Date(),
          updatedBy: 'user-1',
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockPrisma.audit_retention_policies.findMany).mockResolvedValue(mockPolicies);

      const result = await retentionService.listPolicies('org-1');

      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe('org-1');
    });
  });

  describe('updatePolicy', () => {
    it('should update a retention policy', async () => {
      const existingPolicy = {
        id: 'policy-1',
        organizationId: 'org-1',
        category: null,
        severity: null,
        retentionDays: 90,
        archiveAfterDays: null,
        deleteAfterDays: 90,
        minRetentionDays: 30,
        maxRetentionDays: 365,
        immutable: false,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedBy: 'user-1',
        updatedAt: new Date(),
      };
      
      const updatedPolicy = {
        ...existingPolicy,
        retentionDays: 120,
        deleteAfterDays: 120,
      };

      // Mock findUnique to return existing policy
      vi.mocked(mockPrisma.audit_retention_policies.findUnique).mockResolvedValue(existingPolicy);
      vi.mocked(mockPrisma.audit_retention_policies.update).mockResolvedValue(updatedPolicy);

      const result = await retentionService.updatePolicy('policy-1', { retentionDays: 120 }, 'user-1');

      expect(result).toBeDefined();
      expect(result.retentionDays).toBe(120);
    });
  });

  describe('deletePolicy', () => {
    it('should delete a retention policy', async () => {
      const existingPolicy = {
        id: 'policy-1',
        organizationId: 'org-1',
        category: null,
        severity: null,
        retentionDays: 90,
        archiveAfterDays: null,
        deleteAfterDays: 90,
        minRetentionDays: 30,
        maxRetentionDays: 365,
        immutable: false,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedBy: 'user-1',
        updatedAt: new Date(),
      };

      // Mock findUnique to return existing policy
      vi.mocked(mockPrisma.audit_retention_policies.findUnique).mockResolvedValue(existingPolicy);
      vi.mocked(mockPrisma.audit_retention_policies.delete).mockResolvedValue({ id: 'policy-1' });

      await retentionService.deletePolicy('policy-1');

      expect(mockPrisma.audit_retention_policies.delete).toHaveBeenCalledWith({
        where: { id: 'policy-1' },
      });
    });
  });
});

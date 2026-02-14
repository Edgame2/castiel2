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
  let mockCosmosRepo: any;

  beforeEach(() => {
    mockCosmosRepo = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    retentionService = new RetentionService(mockCosmosRepo);
  });

  describe('getPolicy', () => {
    it('should retrieve a policy by tenant', async () => {
      const mockPolicy = {
        id: 'policy-1',
        tenantId: 'org-1',
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

      vi.mocked(mockCosmosRepo.findFirst).mockResolvedValue(mockPolicy);

      const result = await retentionService.getPolicy('org-1');

      expect(result).toBeDefined();
      expect(result?.tenantId).toBe('org-1');
    });

    it('should return default policy when none found', async () => {
      vi.mocked(mockCosmosRepo.findFirst).mockResolvedValue(null);

      const result = await retentionService.getPolicy('org-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('default');
      expect(result?.retentionDays).toBe(90); // From mocked config
    });
  });

  describe('createPolicy', () => {
    it('should create a retention policy', async () => {
      const input = {
        tenantId: 'org-1',
        retentionDays: 90,
        deleteAfterDays: 90,
      };

      const mockPolicy = {
        id: 'policy-1',
        tenantId: 'org-1',
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

      vi.mocked(mockCosmosRepo.create).mockResolvedValue(mockPolicy);

      const result = await retentionService.createPolicy(input, 'user-1');

      expect(result).toBeDefined();
      expect(result.tenantId).toBe('org-1');
      expect(mockCosmosRepo.create).toHaveBeenCalled();
    });
  });

  describe('listPolicies', () => {
    it('should list policies for tenant', async () => {
      const mockPolicies = [
        {
          id: 'policy-1',
          tenantId: 'org-1',
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

      vi.mocked(mockCosmosRepo.findMany).mockResolvedValue(mockPolicies);

      const result = await retentionService.listPolicies('org-1');

      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe('org-1');
    });
  });

  describe('updatePolicy', () => {
    it('should update a retention policy', async () => {
      const existingPolicy = {
        id: 'policy-1',
        tenantId: 'org-1',
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

      vi.mocked(mockCosmosRepo.findUnique).mockResolvedValue(existingPolicy);
      vi.mocked(mockCosmosRepo.update).mockResolvedValue(updatedPolicy);

      const result = await retentionService.updatePolicy('policy-1', { retentionDays: 120 }, 'user-1', 'org-1');

      expect(result).toBeDefined();
      expect(result.retentionDays).toBe(120);
    });

    it('should throw when policy belongs to another tenant', async () => {
      const existingPolicy = {
        id: 'policy-1',
        tenantId: 'other-org',
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
      vi.mocked(mockCosmosRepo.findUnique).mockResolvedValue(existingPolicy);

      await expect(
        retentionService.updatePolicy('policy-1', { retentionDays: 120 }, 'user-1', 'org-1')
      ).rejects.toThrow('Retention policy not found');
      expect(mockCosmosRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('deletePolicy', () => {
    it('should delete a retention policy', async () => {
      const existingPolicy = {
        id: 'policy-1',
        tenantId: 'org-1',
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

      vi.mocked(mockCosmosRepo.findUnique).mockResolvedValue(existingPolicy);
      vi.mocked(mockCosmosRepo.delete).mockResolvedValue(undefined);

      await retentionService.deletePolicy('policy-1', 'org-1');

      expect(mockCosmosRepo.delete).toHaveBeenCalledWith('policy-1', 'org-1');
    });

    it('should throw when policy belongs to another tenant', async () => {
      const existingPolicy = {
        id: 'policy-1',
        tenantId: 'other-org',
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
      vi.mocked(mockCosmosRepo.findUnique).mockResolvedValue(existingPolicy);

      await expect(retentionService.deletePolicy('policy-1', 'org-1')).rejects.toThrow(
        'Retention policy not found'
      );
      expect(mockCosmosRepo.delete).not.toHaveBeenCalled();
    });
  });
});

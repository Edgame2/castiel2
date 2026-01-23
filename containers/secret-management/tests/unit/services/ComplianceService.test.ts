/**
 * Unit tests for Compliance Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceService } from '../../../../src/services/ComplianceService';
import { SecretService } from '../../../../src/services/SecretService';

// Mock dependencies
vi.mock('../../../../src/services/SecretService');
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      secret_secrets: {
        findMany: vi.fn(),
      },
    })),
  };
});

describe('ComplianceService', () => {
  let complianceService: ComplianceService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    complianceService = new ComplianceService();
    mockDb = (complianceService as any).db;
  });

  describe('checkCompliance', () => {
    it('should check compliance for a secret', async () => {
      const mockSecret = {
        id: 'secret-1',
        name: 'test-secret',
        type: 'API_KEY',
        rotationEnabled: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      
      const mockSecretService = (complianceService as any).secretService;
      mockSecretService.getSecret = vi.fn().mockResolvedValue(mockSecret);
      
      const result = await complianceService.checkCompliance('secret-1');
      
      expect(result).toBeDefined();
      expect(result.secretId).toBe('secret-1');
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate a compliance report', async () => {
      const mockSecrets = [
        {
          id: 'secret-1',
          name: 'secret-1',
          rotationEnabled: true,
        },
        {
          id: 'secret-2',
          name: 'secret-2',
          rotationEnabled: false,
        },
      ];
      
      mockDb.secret_secrets.findMany.mockResolvedValue(mockSecrets);
      
      const result = await complianceService.generateComplianceReport({
        organizationId: 'org-123',
      });
      
      expect(result).toBeDefined();
      expect(result.totalSecrets).toBe(2);
    });
  });
});



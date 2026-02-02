/**
 * Unit tests for Compliance Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceService } from '../../../src/services/ComplianceService';

// Mock dependencies - use a single object so service and test share the same mocks
const mockDb = vi.hoisted(() => ({
  secret_secrets: { count: vi.fn() },
  secret_audit_logs: {
    count: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    groupBy: vi.fn().mockResolvedValue([]),
  },
  secret_usage: { findMany: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(() => mockDb),
}));

describe('ComplianceService', () => {
  let complianceService: ComplianceService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.secret_secrets.count.mockResolvedValue(2);
    mockDb.secret_audit_logs.count.mockResolvedValue(0);
    complianceService = new ComplianceService();
  });

  describe('generateReport', () => {
    it('should generate a compliance report', async () => {
      const result = await complianceService.generateReport({
        organizationId: 'org-123',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      expect(result).toBeDefined();
      expect(result.summary.totalSecrets).toBe(2);
      expect(mockDb.secret_secrets.count).toHaveBeenCalled();
    });
  });
});



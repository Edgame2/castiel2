/**
 * Unit tests for Soft Delete Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SoftDeleteManager } from '../../../../src/services/lifecycle/SoftDeleteManager';
import { RecoveryPeriodExpiredError } from '../../../../src/errors/SecretErrors';

vi.mock('../../../../src/services/events/SecretEventPublisher', () => ({
  publishSecretEvent: vi.fn().mockResolvedValue(undefined),
  SecretEvents: {
    secretRestored: (d: Record<string, unknown>) => ({ type: 'secret.secret.restored', ...d }),
    secretPermanentlyDeleted: (d: Record<string, unknown>) => ({ type: 'secret.secret.permanently_deleted', ...d }),
  },
}));
vi.mock('../../../../src/services/logging/LoggingClient', () => ({
  getLoggingClient: vi.fn(() => ({ sendLog: vi.fn().mockResolvedValue(undefined) })),
}));
vi.mock('../../../../src/services/AuditService', () => ({
  AuditService: vi.fn().mockImplementation(() => ({
    log: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(() => ({
    secret_secrets: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    secret_versions: { deleteMany: vi.fn().mockResolvedValue({}) },
    secret_access_grants: { deleteMany: vi.fn().mockResolvedValue({}) },
    secret_usage: { deleteMany: vi.fn().mockResolvedValue({}) },
    secret_audit_logs: { create: vi.fn().mockResolvedValue({}) },
  })),
}));

describe('SoftDeleteManager', () => {
  let softDeleteManager: SoftDeleteManager;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    softDeleteManager = new SoftDeleteManager();
    mockDb = (softDeleteManager as any).db;
  });

  describe('restoreSecret', () => {
    it('should restore a soft-deleted secret', async () => {
      const recoveryDeadline = new Date();
      recoveryDeadline.setDate(recoveryDeadline.getDate() + 10);

      const mockSecret = {
        id: 'secret-1',
        name: 'test-secret',
        deletedAt: new Date('2025-01-01'),
        recoveryDeadline,
        organizationId: 'org-1',
        scope: 'ORGANIZATION',
      };

      mockDb.secret_secrets.findUnique.mockResolvedValue(mockSecret);
      mockDb.secret_secrets.update.mockResolvedValue({
        ...mockSecret,
        deletedAt: null,
        recoveryDeadline: null,
      });

      await softDeleteManager.restoreSecret('secret-1', 'user-123');

      expect(mockDb.secret_secrets.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: null,
            recoveryDeadline: null,
          }),
        })
      );
    });

    it('should throw RecoveryPeriodExpiredError if recovery period expired', async () => {
      const recoveryDeadline = new Date();
      recoveryDeadline.setDate(recoveryDeadline.getDate() - 1);

      const mockSecret = {
        id: 'secret-1',
        name: 'test-secret',
        deletedAt: new Date('2025-01-01'),
        recoveryDeadline,
      };

      mockDb.secret_secrets.findUnique.mockResolvedValue(mockSecret);

      await expect(
        softDeleteManager.restoreSecret('secret-1', 'user-123')
      ).rejects.toThrow(/Recovery period expired/);
    });
  });

  describe('permanentlyDeleteExpired', () => {
    it('should permanently delete expired secrets', async () => {
      const mockSecret = {
        id: 'secret-1',
        name: 'test-secret',
        deletedAt: new Date('2025-01-01'),
        recoveryDeadline: new Date('2024-12-01'),
        storageBackend: 'LOCAL_ENCRYPTED',
        vaultSecretId: null,
        scope: 'ORGANIZATION',
        organizationId: 'org-1',
      };

      mockDb.secret_secrets.findMany.mockResolvedValue([mockSecret]);
      mockDb.secret_secrets.delete.mockResolvedValue({});

      const count = await softDeleteManager.permanentlyDeleteExpired();

      expect(count).toBe(1);
      expect(mockDb.secret_secrets.findMany).toHaveBeenCalled();
    });
  });
});



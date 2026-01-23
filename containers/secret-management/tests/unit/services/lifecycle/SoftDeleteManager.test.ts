/**
 * Unit tests for Soft Delete Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SoftDeleteManager } from '../../../../src/services/lifecycle/SoftDeleteManager';
import { SecretService } from '../../../../src/services/SecretService';
import { RecoveryPeriodExpiredError } from '../../../../src/errors/SecretErrors';

// Mock dependencies
vi.mock('../../../../src/services/SecretService');
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      secret_secrets: {
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    })),
  };
});

describe('SoftDeleteManager', () => {
  let softDeleteManager: SoftDeleteManager;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    softDeleteManager = new SoftDeleteManager();
    mockDb = (softDeleteManager as any).db;
  });

  describe('softDelete', () => {
    it('should soft delete a secret', async () => {
      const mockSecret = {
        id: 'secret-1',
        name: 'test-secret',
        deletedAt: null,
      };
      
      mockDb.secret_secrets.findUnique.mockResolvedValue(mockSecret);
      
      const recoveryDeadline = new Date();
      recoveryDeadline.setDate(recoveryDeadline.getDate() + 30);
      
      mockDb.secret_secrets.update.mockResolvedValue({
        ...mockSecret,
        deletedAt: new Date(),
        recoveryDeadline,
      });
      
      await softDeleteManager.softDelete('secret-1', 'user-123');
      
      expect(mockDb.secret_secrets.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
            recoveryDeadline: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted secret', async () => {
      const recoveryDeadline = new Date();
      recoveryDeadline.setDate(recoveryDeadline.getDate() + 10); // Still within recovery period
      
      const mockSecret = {
        id: 'secret-1',
        name: 'test-secret',
        deletedAt: new Date('2025-01-01'),
        recoveryDeadline,
      };
      
      mockDb.secret_secrets.findUnique.mockResolvedValue(mockSecret);
      mockDb.secret_secrets.update.mockResolvedValue({
        ...mockSecret,
        deletedAt: null,
        recoveryDeadline: null,
      });
      
      await softDeleteManager.restore('secret-1', 'user-123');
      
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
      recoveryDeadline.setDate(recoveryDeadline.getDate() - 1); // Expired
      
      const mockSecret = {
        id: 'secret-1',
        name: 'test-secret',
        deletedAt: new Date('2025-01-01'),
        recoveryDeadline,
      };
      
      mockDb.secret_secrets.findUnique.mockResolvedValue(mockSecret);
      
      await expect(
        softDeleteManager.restore('secret-1', 'user-123')
      ).rejects.toThrow(RecoveryPeriodExpiredError);
    });
  });

  describe('permanentDelete', () => {
    it('should permanently delete a secret', async () => {
      const mockSecret = {
        id: 'secret-1',
        name: 'test-secret',
        deletedAt: new Date('2025-01-01'),
        storageBackend: 'LOCAL_ENCRYPTED',
      };
      
      mockDb.secret_secrets.findUnique.mockResolvedValue(mockSecret);
      mockDb.secret_secrets.delete.mockResolvedValue({});
      
      await softDeleteManager.permanentDelete('secret-1', 'user-123');
      
      expect(mockDb.secret_secrets.delete).toHaveBeenCalled();
    });
  });
});



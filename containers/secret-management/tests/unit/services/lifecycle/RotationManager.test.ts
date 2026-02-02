/**
 * Unit tests for Rotation Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RotationManager } from '../../../../src/services/lifecycle/RotationManager';
import { SecretService } from '../../../../src/services/SecretService';
import { BackendFactory } from '../../../../src/services/backends/BackendFactory';

const validMasterKey = '0'.repeat(64);

vi.mock('../../../../src/services/SecretService');
vi.mock('../../../../src/services/backends/BackendFactory');
vi.mock('../../../../src/services/events/SecretEventPublisher', () => ({
  publishSecretEvent: vi.fn().mockResolvedValue(undefined),
  SecretEvents: {
    secretRotated: (d: Record<string, unknown>) => ({ type: 'secret.secret.rotated', ...d }),
    secretRotationDue: (d: Record<string, unknown>) => ({ type: 'secret.secret.rotation_due', ...d }),
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
    },
  })),
}));

describe('RotationManager', () => {
  let rotationManager: RotationManager;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SECRET_MASTER_KEY = validMasterKey;
    rotationManager = new RotationManager();
    mockDb = (rotationManager as any).db;
  });

  afterEach(() => {
    delete process.env.SECRET_MASTER_KEY;
  });

  describe('rotateSecret', () => {
    it('should rotate a secret successfully', async () => {
      const mockSecret = {
        id: 'secret-1',
        name: 'test-secret',
        type: 'API_KEY',
        currentVersion: 1,
        storageBackend: 'LOCAL_ENCRYPTED',
        scope: 'ORGANIZATION',
        organizationId: 'org-1',
        rotationIntervalDays: null,
      };
      const mockUpdated = { ...mockSecret, currentVersion: 2 };
      mockDb.secret_secrets.findUnique
        .mockResolvedValueOnce(mockSecret)
        .mockResolvedValueOnce(mockUpdated);
      mockDb.secret_secrets.update.mockResolvedValue({});
      const mockSecretService = (rotationManager as any).secretService;
      mockSecretService.updateSecret = vi.fn().mockResolvedValue(mockUpdated);

      const result = await rotationManager.rotateSecret(
        'secret-1',
        { type: 'API_KEY', key: 'new-key' },
        { userId: 'user-123', organizationId: 'org-123', consumerModule: 'test' }
      );

      expect(result).toBeDefined();
      expect(result.secretId).toBe('secret-1');
      expect(result.newVersion).toBe(2);
      expect(result.rotatedAt).toBeInstanceOf(Date);
    });

    it('should throw error if secret does not exist', async () => {
      mockDb.secret_secrets.findUnique.mockResolvedValue(null);

      await expect(
        rotationManager.rotateSecret(
          'non-existent',
          { type: 'API_KEY', key: 'x' },
          { userId: 'user-123', consumerModule: 'test' }
        )
      ).rejects.toThrow();
    });
  });

  describe('checkRotationDue', () => {
    it('should return secrets due for rotation', async () => {
      const nextRotationAt = new Date(Date.now() - 1000);
      mockDb.secret_secrets.findMany
        .mockResolvedValueOnce([
          { id: 'secret-1', name: 's1', nextRotationAt },
        ])
        .mockResolvedValueOnce([
          { id: 'secret-1', name: 's1', organizationId: 'org-1' },
        ]);

      const result = await rotationManager.checkRotationDue();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('secret-1');
      expect(result[0].nextRotationAt).toEqual(nextRotationAt);
    });
  });
});



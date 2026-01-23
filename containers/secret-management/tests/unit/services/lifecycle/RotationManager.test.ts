/**
 * Unit tests for Rotation Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RotationManager } from '../../../../src/services/lifecycle/RotationManager';
import { SecretService } from '../../../../src/services/SecretService';
import { BackendFactory } from '../../../../src/services/backends/BackendFactory';

// Mock dependencies
vi.mock('../../../../src/services/SecretService');
vi.mock('../../../../src/services/backends/BackendFactory');
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      secret_secrets: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
    })),
  };
});

describe('RotationManager', () => {
  let rotationManager: RotationManager;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    rotationManager = new RotationManager();
    mockDb = (rotationManager as any).db;
  });

  describe('rotateSecret', () => {
    it('should rotate a secret successfully', async () => {
      const mockSecret = {
        id: 'secret-1',
        name: 'test-secret',
        type: 'API_KEY',
        currentVersion: 1,
        storageBackend: 'LOCAL_ENCRYPTED',
      };
      
      const mockSecretService = (rotationManager as any).secretService;
      mockSecretService.getSecret = vi.fn().mockResolvedValue(mockSecret);
      mockSecretService.getSecretValue = vi.fn().mockResolvedValue({
        type: 'API_KEY',
        key: 'old-key',
      });
      
      // Mock new value generation
      const mockBackend = {
        storeSecret: vi.fn().mockResolvedValue({
          secretRef: 'local:test-secret',
          version: 2,
        }),
      };
      (BackendFactory.createBackend as any).mockResolvedValue(mockBackend);
      
      mockDb.secret_secrets.update.mockResolvedValue({
        ...mockSecret,
        currentVersion: 2,
        lastRotatedAt: new Date(),
      });
      
      const result = await rotationManager.rotateSecret('secret-1', {
        userId: 'user-123',
        organizationId: 'org-123',
      });
      
      expect(result).toBeDefined();
      expect(result.rotatedAt).toBeInstanceOf(Date);
    });

    it('should throw error if secret does not exist', async () => {
      const mockSecretService = (rotationManager as any).secretService;
      mockSecretService.getSecret = vi.fn().mockRejectedValue(
        new Error('Secret not found')
      );
      
      await expect(
        rotationManager.rotateSecret('non-existent', {
          userId: 'user-123',
        })
      ).rejects.toThrow();
    });
  });

  describe('scheduleRotation', () => {
    it('should schedule rotation for a secret', async () => {
      const nextRotationAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      mockDb.secret_secrets.update.mockResolvedValue({
        id: 'secret-1',
        nextRotationAt,
      });
      
      await rotationManager.scheduleRotation('secret-1', 30);
      
      expect(mockDb.secret_secrets.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nextRotationAt: expect.any(Date),
          }),
        })
      );
    });
  });
});



/**
 * Unit tests for Version Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VersionManager } from '../../../../src/services/lifecycle/VersionManager';
import { SecretService } from '../../../../src/services/SecretService';
import { SecretNotFoundError } from '../../../../src/errors/SecretErrors';

// Mock dependencies
vi.mock('../../../../src/services/SecretService');
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      secret_secret_versions: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    })),
  };
});

describe('VersionManager', () => {
  let versionManager: VersionManager;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    versionManager = new VersionManager();
    mockDb = (versionManager as any).db;
  });

  describe('listVersions', () => {
    it('should list all versions of a secret', async () => {
      const mockVersions = [
        {
          id: 'version-1',
          version: 1,
          createdAt: new Date('2025-01-01'),
          isActive: false,
        },
        {
          id: 'version-2',
          version: 2,
          createdAt: new Date('2025-01-02'),
          isActive: true,
        },
      ];
      
      mockDb.secret_secret_versions.findMany.mockResolvedValue(mockVersions);
      
      const result = await versionManager.listVersions('secret-1');
      
      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(1);
      expect(result[1].version).toBe(2);
    });

    it('should throw error if secret does not exist', async () => {
      mockDb.secret_secret_versions.findMany.mockResolvedValue([]);
      
      // Check if secret exists first
      const mockSecretService = (versionManager as any).secretService;
      mockSecretService.getSecret = vi.fn().mockRejectedValue(
        new SecretNotFoundError('secret-1')
      );
      
      await expect(
        versionManager.listVersions('non-existent')
      ).rejects.toThrow();
    });
  });

  describe('getVersion', () => {
    it('should retrieve a specific version', async () => {
      const mockVersion = {
        id: 'version-1',
        version: 1,
        encryptedValue: 'encrypted-value',
        encryptionKeyId: 'key-1',
        createdAt: new Date('2025-01-01'),
        isActive: false,
      };
      
      mockDb.secret_secret_versions.findUnique.mockResolvedValue(mockVersion);
      
      const mockSecretService = (versionManager as any).secretService;
      mockSecretService.getSecret = vi.fn().mockResolvedValue({
        id: 'secret-1',
        type: 'API_KEY',
      });
      
      // Mock decryption
      const mockEncryptionService = (versionManager as any).encryptionService;
      mockEncryptionService.decryptSecretValue = vi.fn().mockResolvedValue({
        type: 'API_KEY',
        key: 'test-key',
      });
      
      const result = await versionManager.getVersion('secret-1', 1);
      
      expect(result).toBeDefined();
      expect(result.version).toBe(1);
    });
  });
});



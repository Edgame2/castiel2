/**
 * Unit tests for Version Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VersionManager } from '../../../../src/services/lifecycle/VersionManager';
import { SecretService } from '../../../../src/services/SecretService';
import { SecretNotFoundError } from '../../../../src/errors/SecretErrors';

// Mock dependencies
vi.mock('../../../../src/services/SecretService');
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      secret_versions: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      secret_secrets: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    })),
  };
});

const validMasterKey = '0'.repeat(64);

describe('VersionManager', () => {
  let versionManager: VersionManager;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SECRET_MASTER_KEY = validMasterKey;
    versionManager = new VersionManager();
    mockDb = (versionManager as any).db;
  });

  afterEach(() => {
    delete process.env.SECRET_MASTER_KEY;
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
      
      mockDb.secret_versions.findMany.mockResolvedValue(mockVersions);
      
      const result = await versionManager.getVersionHistory('secret-1');
      
      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(1);
      expect(result[1].version).toBe(2);
    });

    it('should return empty array when secret has no versions', async () => {
      mockDb.secret_versions.findMany.mockResolvedValue([]);
      
      const result = await versionManager.getVersionHistory('secret-1');
      
      expect(result).toHaveLength(0);
    });
  });

  describe('getVersionValue', () => {
    it('should retrieve a specific version', async () => {
      const mockVersion = {
        id: 'version-1',
        secretId: 'secret-1',
        version: 1,
        encryptedValue: 'encrypted-value',
        encryptionKeyId: 'key-1',
        createdAt: new Date('2025-01-01'),
        isActive: false,
      };
      
      mockDb.secret_versions.findFirst.mockResolvedValue(mockVersion);
      
      const mockEncryptionService = (versionManager as any).encryptionService;
      mockEncryptionService.decryptSecretValue = vi.fn().mockResolvedValue({
        type: 'API_KEY',
        key: 'test-key',
      });
      
      const result = await versionManager.getVersionValue('secret-1', 1);
      
      expect(result).toEqual({ type: 'API_KEY', key: 'test-key' });
    });
  });
});



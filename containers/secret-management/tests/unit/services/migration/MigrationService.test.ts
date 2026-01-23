/**
 * Unit tests for Migration Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MigrationService } from '../../../../src/services/migration/MigrationService';
import { BackendFactory } from '../../../../src/services/backends/BackendFactory';

// Mock dependencies
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

describe('MigrationService', () => {
  let migrationService: MigrationService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    migrationService = new MigrationService();
    mockDb = (migrationService as any).db;
  });

  describe('migrateSecret', () => {
    it('should migrate a secret from one backend to another', async () => {
      const mockSecret = {
        id: 'secret-1',
        name: 'test-secret',
        storageBackend: 'LOCAL_ENCRYPTED',
        vaultSecretId: null,
      };
      
      mockDb.secret_secrets.findMany.mockResolvedValue([mockSecret]);
      
      const mockSourceBackend = {
        retrieveSecret: vi.fn().mockResolvedValue({
          value: { type: 'API_KEY', key: 'test-key' },
          version: 1,
        }),
      };
      
      const mockTargetBackend = {
        storeSecret: vi.fn().mockResolvedValue({
          secretRef: 'azure:test-secret',
          version: 1,
        }),
      };
      
      (BackendFactory.createBackend as any)
        .mockResolvedValueOnce(mockSourceBackend)
        .mockResolvedValueOnce(mockTargetBackend);
      
      mockDb.secret_secrets.update.mockResolvedValue({
        ...mockSecret,
        storageBackend: 'AZURE_KEY_VAULT',
        vaultSecretId: 'azure:test-secret',
      });
      
      const result = await migrationService.migrateSecret('secret-1', 'AZURE_KEY_VAULT');
      
      expect(result).toBeDefined();
      expect(result.newBackend).toBe('AZURE_KEY_VAULT');
    });
  });
});



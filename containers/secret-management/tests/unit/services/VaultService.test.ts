/**
 * Unit tests for Vault Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VaultService } from '../../../src/services/VaultService';
import { BackendFactory } from '../../../src/services/backends/BackendFactory';
import { VaultNotConfiguredError } from '../../../src/errors/SecretErrors';
import { BackendConfig } from '../../../src/types/backend.types';

// Mock dependencies
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      secret_vault_configurations: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
    })),
  };
});

vi.mock('../../../src/services/backends/BackendFactory');
vi.mock('../../../src/services/encryption/EncryptionService');
vi.mock('../../../src/services/encryption/KeyManager', () => ({
  KeyManager: vi.fn().mockImplementation(() => ({
    getActiveKey: vi.fn().mockResolvedValue({ keyId: 'key-1', version: 1 }),
  })),
}));
vi.mock('../../../src/services/events/SecretEventPublisher', () => ({
  publishSecretEvent: vi.fn().mockResolvedValue(undefined),
  SecretEvents: {
    vaultConfigured: (d: Record<string, unknown>) => ({ type: 'vault.configured', ...d }),
    vaultHealthCheckFailed: (d: Record<string, unknown>) => ({ type: 'vault.health_check_failed', ...d }),
  },
}));
vi.mock('../../../src/services/logging/LoggingClient', () => ({
  getLoggingClient: vi.fn(() => ({ sendLog: vi.fn().mockResolvedValue(undefined) })),
}));
vi.mock('../../../src/services/AuditService', () => ({
  AuditService: vi.fn().mockImplementation(() => ({
    log: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('VaultService', () => {
  let vaultService: VaultService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vaultService = new VaultService();
    mockDb = (vaultService as any).db;
  });

  describe('createVault', () => {
    it('should create a vault configuration successfully', async () => {
      const config: BackendConfig = {
        type: 'AZURE_KEY_VAULT',
        vaultUrl: 'https://test.vault.azure.net/',
        authentication: {
          type: 'managed_identity',
        },
      };
      
      const mockVault = {
        id: 'vault-1',
        name: 'Test Vault',
        backend: 'AZURE_KEY_VAULT',
        scope: 'GLOBAL',
        isActive: true,
        isDefault: false,
        healthStatus: 'UNKNOWN',
        createdAt: new Date(),
        createdById: 'user-123',
        updatedAt: new Date(),
      };
      
      mockDb.secret_vault_configurations.create.mockResolvedValue(mockVault);
      mockDb.secret_vault_configurations.updateMany.mockResolvedValue({ count: 0 });
      
      // Mock encryption
      const mockEncryptionService = (vaultService as any).encryptionService;
      mockEncryptionService.encrypt = vi.fn().mockResolvedValue({
        encryptedValue: 'encrypted-config',
        keyId: 'key-1',
      });
      
      // Mock health check
      const mockBackend = {
        healthCheck: vi.fn().mockResolvedValue({
          status: 'healthy',
          latencyMs: 10,
        }),
      };
      (BackendFactory.createBackend as any).mockResolvedValue(mockBackend);
      
      const result = await vaultService.createVault({
        name: 'Test Vault',
        backend: 'AZURE_KEY_VAULT',
        scope: 'GLOBAL',
        config,
      }, 'user-123');
      
      expect(result).toBeDefined();
      expect(mockDb.secret_vault_configurations.create).toHaveBeenCalled();
    });

    it('should unset other defaults when creating a default vault', async () => {
      const config: BackendConfig = {
        type: 'AZURE_KEY_VAULT',
        vaultUrl: 'https://test.vault.azure.net/',
        authentication: {
          type: 'managed_identity',
        },
      };
      
      const mockVault = {
        id: 'vault-1',
        name: 'Test Vault',
        backend: 'AZURE_KEY_VAULT',
        scope: 'GLOBAL',
        isActive: true,
        isDefault: true,
        healthStatus: 'UNKNOWN',
        createdAt: new Date(),
        createdById: 'user-123',
        updatedAt: new Date(),
      };
      
      mockDb.secret_vault_configurations.create.mockResolvedValue(mockVault);
      mockDb.secret_vault_configurations.updateMany.mockResolvedValue({ count: 2 });
      
      const mockEncryptionService = (vaultService as any).encryptionService;
      mockEncryptionService.encrypt = vi.fn().mockResolvedValue({
        encryptedValue: 'encrypted-config',
        keyId: 'key-1',
      });
      
      const mockBackend = {
        healthCheck: vi.fn().mockResolvedValue({
          status: 'healthy',
          latencyMs: 10,
        }),
      };
      (BackendFactory.createBackend as any).mockResolvedValue(mockBackend);
      
      await vaultService.createVault({
        name: 'Test Vault',
        backend: 'AZURE_KEY_VAULT',
        scope: 'GLOBAL',
        config,
        isDefault: true,
      }, 'user-123');
      
      expect(mockDb.secret_vault_configurations.updateMany).toHaveBeenCalledWith({
        where: {
          scope: 'GLOBAL',
          organizationId: null,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    });
  });

  describe('getVault', () => {
    it('should retrieve a vault configuration', async () => {
      const mockVault = {
        id: 'vault-1',
        name: 'Test Vault',
        backend: 'AZURE_KEY_VAULT',
        scope: 'GLOBAL',
        isActive: true,
        isDefault: false,
        healthStatus: 'HEALTHY',
        createdAt: new Date(),
        createdById: 'user-123',
        updatedAt: new Date(),
        encryptedConfig: 'encrypted-config',
      };
      
      mockDb.secret_vault_configurations.findUnique.mockResolvedValue(mockVault);
      
      const mockEncryptionService = (vaultService as any).encryptionService;
      mockEncryptionService.decrypt = vi.fn().mockResolvedValue(JSON.stringify({
        type: 'AZURE_KEY_VAULT',
        vaultUrl: 'https://test.vault.azure.net/',
      }));
      
      const result = await vaultService.getVault('vault-1');
      
      expect(result).toBeDefined();
      expect(result.id).toBe('vault-1');
    });

    it('should throw VaultNotConfiguredError if vault does not exist', async () => {
      mockDb.secret_vault_configurations.findUnique.mockResolvedValue(null);

      await expect(
        vaultService.getVault('non-existent')
      ).rejects.toThrow(/Vault not configured/);
    });
  });

  describe('healthCheck', () => {
    it('should perform health check on vault', async () => {
      const mockVault = {
        id: 'vault-1',
        encryptedConfig: 'encrypted-config',
      };
      
      mockDb.secret_vault_configurations.findUnique.mockResolvedValue(mockVault);
      
      const mockEncryptionService = (vaultService as any).encryptionService;
      mockEncryptionService.decrypt = vi.fn().mockResolvedValue(JSON.stringify({
        type: 'AZURE_KEY_VAULT',
        vaultUrl: 'https://test.vault.azure.net/',
      }));
      
      const mockBackend = {
        healthCheck: vi.fn().mockResolvedValue({
          status: 'healthy',
          latencyMs: 10,
        }),
      };
      (BackendFactory.createBackend as any).mockResolvedValue(mockBackend);
      
      mockDb.secret_vault_configurations.update = vi.fn().mockResolvedValue({});
      
      const result = await vaultService.healthCheck('vault-1');
      
      expect(result.status).toBe('healthy');
      expect(mockBackend.healthCheck).toHaveBeenCalled();
    });
  });
});



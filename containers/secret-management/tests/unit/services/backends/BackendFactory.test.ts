/**
 * Unit tests for Backend Factory
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BackendFactory } from '../../../../src/services/backends/BackendFactory';
import { BackendConfig } from '../../../../src/types/backend.types';
import { LocalBackend } from '../../../../src/services/backends/LocalBackend';
import { AzureKeyVaultBackend } from '../../../../src/services/backends/AzureKeyVaultBackend';
import { AWSSecretsBackend } from '../../../../src/services/backends/AWSSecretsBackend';
import { HashiCorpVaultBackend } from '../../../../src/services/backends/HashiCorpVaultBackend';
import { GCPSecretBackend } from '../../../../src/services/backends/GCPSecretBackend';

// Mock all backends
vi.mock('../../../../src/services/backends/LocalBackend');
vi.mock('../../../../src/services/backends/AzureKeyVaultBackend');
vi.mock('../../../../src/services/backends/AWSSecretsBackend');
vi.mock('../../../../src/services/backends/HashiCorpVaultBackend');
vi.mock('../../../../src/services/backends/GCPSecretBackend');

describe('BackendFactory', () => {
  beforeEach(() => {
    BackendFactory.clearCache();
    vi.clearAllMocks();
  });

  describe('createBackend', () => {
    it('should create LOCAL_ENCRYPTED backend', async () => {
      const config: BackendConfig = {
        type: 'LOCAL_ENCRYPTED',
      };
      
      const backend = await BackendFactory.createBackend(config);
      
      expect(backend).toBeInstanceOf(LocalBackend);
      expect(LocalBackend).toHaveBeenCalled();
    });

    it('should create AZURE_KEY_VAULT backend', async () => {
      const config: BackendConfig = {
        type: 'AZURE_KEY_VAULT',
        vaultUrl: 'https://test.vault.azure.net/',
        authentication: {
          type: 'managed_identity',
        },
      };
      
      const mockBackend = {
        initialize: vi.fn().mockResolvedValue(undefined),
      };
      (AzureKeyVaultBackend as any).mockImplementation(() => mockBackend);
      
      const backend = await BackendFactory.createBackend(config);
      
      expect(backend).toBeDefined();
      expect(mockBackend.initialize).toHaveBeenCalledWith(config);
    });

    it('should create AWS_SECRETS_MANAGER backend', async () => {
      const config: BackendConfig = {
        type: 'AWS_SECRETS_MANAGER',
        region: 'us-east-1',
        authentication: {
          type: 'iam_role',
        },
      };
      
      const mockBackend = {
        initialize: vi.fn().mockResolvedValue(undefined),
      };
      (AWSSecretsBackend as any).mockImplementation(() => mockBackend);
      
      const backend = await BackendFactory.createBackend(config);
      
      expect(backend).toBeDefined();
      expect(mockBackend.initialize).toHaveBeenCalledWith(config);
    });

    it('should create HASHICORP_VAULT backend', async () => {
      const config: BackendConfig = {
        type: 'HASHICORP_VAULT',
        address: 'https://vault.example.com:8200',
        secretEngine: 'secret',
        secretEnginePath: 'data',
        authentication: {
          type: 'token',
          token: 'test-token',
        },
      };
      
      const mockBackend = {
        initialize: vi.fn().mockResolvedValue(undefined),
      };
      (HashiCorpVaultBackend as any).mockImplementation(() => mockBackend);
      
      const backend = await BackendFactory.createBackend(config);
      
      expect(backend).toBeDefined();
      expect(mockBackend.initialize).toHaveBeenCalledWith(config);
    });

    it('should create GCP_SECRET_MANAGER backend', async () => {
      const config: BackendConfig = {
        type: 'GCP_SECRET_MANAGER',
        projectId: 'test-project',
        authentication: {
          type: 'default_credentials',
        },
      };
      
      const mockBackend = {
        initialize: vi.fn().mockResolvedValue(undefined),
      };
      (GCPSecretBackend as any).mockImplementation(() => mockBackend);
      
      const backend = await BackendFactory.createBackend(config);
      
      expect(backend).toBeDefined();
      expect(mockBackend.initialize).toHaveBeenCalledWith(config);
    });

    it('should throw error for unknown backend type', async () => {
      const config = {
        type: 'UNKNOWN_BACKEND',
      } as any;
      
      await expect(
        BackendFactory.createBackend(config)
      ).rejects.toThrow('Unknown backend type');
    });

    it('should return cached instance for same config', async () => {
      const config: BackendConfig = {
        type: 'LOCAL_ENCRYPTED',
      };
      
      const backend1 = await BackendFactory.createBackend(config);
      const backend2 = await BackendFactory.createBackend(config);
      
      expect(backend1).toBe(backend2);
      expect(LocalBackend).toHaveBeenCalledTimes(1);
    });

    it('should create separate instances for different configs', async () => {
      const config1: BackendConfig = {
        type: 'AZURE_KEY_VAULT',
        vaultUrl: 'https://vault1.vault.azure.net/',
        authentication: {
          type: 'managed_identity',
        },
      };
      
      const config2: BackendConfig = {
        type: 'AZURE_KEY_VAULT',
        vaultUrl: 'https://vault2.vault.azure.net/',
        authentication: {
          type: 'managed_identity',
        },
      };
      
      const mockBackend1 = {
        initialize: vi.fn().mockResolvedValue(undefined),
      };
      const mockBackend2 = {
        initialize: vi.fn().mockResolvedValue(undefined),
      };
      (AzureKeyVaultBackend as any)
        .mockImplementationOnce(() => mockBackend1)
        .mockImplementationOnce(() => mockBackend2);
      
      const backend1 = await BackendFactory.createBackend(config1);
      const backend2 = await BackendFactory.createBackend(config2);
      
      expect(backend1).not.toBe(backend2);
      expect(AzureKeyVaultBackend).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached backends', async () => {
      const config: BackendConfig = {
        type: 'LOCAL_ENCRYPTED',
      };
      
      await BackendFactory.createBackend(config);
      BackendFactory.clearCache();
      
      const backend2 = await BackendFactory.createBackend(config);
      
      // Should create a new instance after cache clear
      expect(LocalBackend).toHaveBeenCalledTimes(2);
    });
  });

  describe('removeBackend', () => {
    it('should remove specific backend from cache', async () => {
      const config: BackendConfig = {
        type: 'LOCAL_ENCRYPTED',
      };
      
      const backend1 = await BackendFactory.createBackend(config);
      BackendFactory.removeBackend(config);
      
      const backend2 = await BackendFactory.createBackend(config);
      
      // Should create a new instance after removal
      expect(backend1).not.toBe(backend2);
      expect(LocalBackend).toHaveBeenCalledTimes(2);
    });
  });
});



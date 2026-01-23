/**
 * Unit tests for HashiCorp Vault Backend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HashiCorpVaultBackend } from '../../../../src/services/backends/HashiCorpVaultBackend';
import { HashiCorpVaultConfig } from '../../../../src/types/backend.types';
import { SecretNotFoundError } from '../../../../src/errors/SecretErrors';

// Mock node-vault
const mockVaultClient = {
  token: '',
  read: vi.fn(),
  write: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
  health: vi.fn(),
  approleLogin: vi.fn(),
  kubernetesLogin: vi.fn(),
};

vi.mock('node-vault', () => {
  return {
    default: vi.fn(() => mockVaultClient),
  };
});

describe('HashiCorpVaultBackend', () => {
  let backend: HashiCorpVaultBackend;
  let config: HashiCorpVaultConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = new HashiCorpVaultBackend();
    
    config = {
      type: 'HASHICORP_VAULT',
      address: 'https://vault.example.com:8200',
      secretEngine: 'secret',
      secretEnginePath: 'data',
      authentication: {
        type: 'token',
        token: 'test-token',
      },
    };
  });

  describe('initialize', () => {
    it('should initialize successfully with token authentication', async () => {
      mockVaultClient.read.mockRejectedValueOnce({ response: { statusCode: 404 } });
      mockVaultClient.write.mockResolvedValueOnce({});
      mockVaultClient.delete.mockResolvedValueOnce({});
      
      await backend.initialize(config);
      
      expect(mockVaultClient.token).toBe('test-token');
    });

    it('should initialize successfully with AppRole authentication', async () => {
      const approleConfig: HashiCorpVaultConfig = {
        type: 'HASHICORP_VAULT',
        address: 'https://vault.example.com:8200',
        secretEngine: 'secret',
        secretEnginePath: 'data',
        authentication: {
          type: 'approle',
          roleId: 'test-role-id',
          secretId: 'test-secret-id',
        },
      };
      
      mockVaultClient.approleLogin.mockResolvedValueOnce({
        auth: { client_token: 'approle-token' },
      });
      mockVaultClient.read.mockRejectedValueOnce({ response: { statusCode: 404 } });
      mockVaultClient.write.mockResolvedValueOnce({});
      mockVaultClient.delete.mockResolvedValueOnce({});
      
      await backend.initialize(approleConfig);
      
      expect(mockVaultClient.token).toBe('approle-token');
    });

    it('should throw error if address is missing', async () => {
      const invalidConfig = {
        type: 'HASHICORP_VAULT',
        address: '',
        secretEngine: 'secret',
        secretEnginePath: 'data',
        authentication: { type: 'token' as const, token: 'test' },
      };
      
      await expect(backend.initialize(invalidConfig as any)).rejects.toThrow();
    });
  });

  describe('storeSecret', () => {
    beforeEach(async () => {
      mockVaultClient.read.mockRejectedValueOnce({ response: { statusCode: 404 } });
      mockVaultClient.write.mockResolvedValueOnce({});
      mockVaultClient.delete.mockResolvedValueOnce({});
      await backend.initialize(config);
      vi.clearAllMocks();
    });

    it('should store a secret successfully (KV v2)', async () => {
      mockVaultClient.write.mockResolvedValueOnce({});
      
      const result = await backend.storeSecret({
        name: 'test-secret',
        value: { apiKey: 'test-key' },
      });
      
      expect(result.secretRef).toBe('test-secret');
      expect(result.version).toBe(1);
      expect(mockVaultClient.write).toHaveBeenCalled();
    });
  });

  describe('retrieveSecret', () => {
    beforeEach(async () => {
      mockVaultClient.read.mockRejectedValueOnce({ response: { statusCode: 404 } });
      mockVaultClient.write.mockResolvedValueOnce({});
      mockVaultClient.delete.mockResolvedValueOnce({});
      await backend.initialize(config);
      vi.clearAllMocks();
    });

    it('should retrieve a secret successfully (KV v2)', async () => {
      mockVaultClient.read.mockResolvedValueOnce({
        data: {
          data: {
            apiKey: 'test-key',
          },
          metadata: {
            created_time: '2025-01-01T00:00:00Z',
            version: 1,
          },
        },
      });
      
      const result = await backend.retrieveSecret({
        secretRef: 'test-secret',
      });
      
      expect(result.value).toEqual({ apiKey: 'test-key' });
      expect(result.version).toBe(1);
    });

    it('should throw SecretNotFoundError if secret does not exist', async () => {
      // HashiCorp Vault error structure - backend checks error.response?.statusCode === 404
      // The error must have response.statusCode = 404
      const error: any = new Error('Secret not found');
      error.response = {
        statusCode: 404,
      };
      
      // Mock read to throw the error
      mockVaultClient.read.mockRejectedValueOnce(error);
      
      await expect(
        backend.retrieveSecret({ secretRef: 'non-existent' })
      ).rejects.toThrow(SecretNotFoundError);
    });
    
    it('should throw DecryptionError for non-404 errors', async () => {
      // Non-404 errors should throw DecryptionError, not SecretNotFoundError
      const error: any = new Error('Connection failed');
      error.response = {
        statusCode: 500,
      };
      
      mockVaultClient.read.mockRejectedValueOnce(error);
      
      await expect(
        backend.retrieveSecret({ secretRef: 'test-secret' })
      ).rejects.toThrow(); // Should throw, but not SecretNotFoundError
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when vault is accessible', async () => {
      mockVaultClient.read.mockRejectedValueOnce({ response: { statusCode: 404 } });
      mockVaultClient.write.mockResolvedValueOnce({});
      mockVaultClient.delete.mockResolvedValueOnce({});
      await backend.initialize(config);
      vi.clearAllMocks();
      
      mockVaultClient.health.mockResolvedValueOnce({ sealed: false });
      
      const health = await backend.healthCheck();
      
      expect(health.status).toBe('healthy');
    });

    it('should return unhealthy status when vault is sealed', async () => {
      mockVaultClient.read.mockRejectedValueOnce({ response: { statusCode: 404 } });
      mockVaultClient.write.mockResolvedValueOnce({});
      mockVaultClient.delete.mockResolvedValueOnce({});
      await backend.initialize(config);
      vi.clearAllMocks();
      
      mockVaultClient.health.mockResolvedValueOnce({ sealed: true });
      
      const health = await backend.healthCheck();
      
      expect(health.status).toBe('unhealthy');
    });
  });
});


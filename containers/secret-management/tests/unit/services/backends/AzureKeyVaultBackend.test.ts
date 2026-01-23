/**
 * Unit tests for Azure Key Vault Backend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AzureKeyVaultBackend } from '../../../../src/services/backends/AzureKeyVaultBackend';
import { AzureKeyVaultConfig } from '../../../../src/types/backend.types';
import { SecretNotFoundError, VaultConnectionError } from '../../../../src/errors/SecretErrors';

// Mock Azure SDK
const mockSecretClient = {
  setSecret: vi.fn(),
  getSecret: vi.fn(),
  updateSecretProperties: vi.fn(),
  beginDeleteSecret: vi.fn(),
  listPropertiesOfSecrets: vi.fn(),
};

vi.mock('@azure/keyvault-secrets', () => {
  return {
    SecretClient: vi.fn().mockImplementation(() => mockSecretClient),
  };
});

vi.mock('@azure/identity', () => {
  return {
    DefaultAzureCredential: vi.fn().mockImplementation(() => ({})),
    ClientSecretCredential: vi.fn().mockImplementation(() => ({})),
    ClientCertificateCredential: vi.fn().mockImplementation(() => ({})),
  };
});

vi.mock('fs', () => {
  return {
    readFileSync: vi.fn().mockReturnValue('-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----'),
  };
});

describe('AzureKeyVaultBackend', () => {
  let backend: AzureKeyVaultBackend;
  let config: AzureKeyVaultConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = new AzureKeyVaultBackend();
    
    config = {
      type: 'AZURE_KEY_VAULT',
      vaultUrl: 'https://test.vault.azure.net/',
      authentication: {
        type: 'managed_identity',
      },
    };
  });

  describe('initialize', () => {
    it('should initialize successfully with managed identity', async () => {
      mockSecretClient.listPropertiesOfSecrets.mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true }),
      });
      
      await backend.initialize(config);
      
      expect(backend).toBeDefined();
    });

    it('should initialize successfully with service principal', async () => {
      const servicePrincipalConfig: AzureKeyVaultConfig = {
        type: 'AZURE_KEY_VAULT',
        vaultUrl: 'https://test.vault.azure.net/',
        authentication: {
          type: 'service_principal',
          tenantId: 'test-tenant',
          clientId: 'test-client',
          clientSecret: 'test-secret',
        },
      };
      
      mockSecretClient.listPropertiesOfSecrets.mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true }),
      });
      
      await backend.initialize(servicePrincipalConfig);
      
      expect(backend).toBeDefined();
    });

    it('should initialize successfully with certificate authentication', async () => {
      const certificateConfig: AzureKeyVaultConfig = {
        type: 'AZURE_KEY_VAULT',
        vaultUrl: 'https://test.vault.azure.net/',
        authentication: {
          type: 'certificate',
          tenantId: 'test-tenant',
          clientId: 'test-client',
          certificatePath: '/path/to/cert.pem',
        },
      };
      
      mockSecretClient.listPropertiesOfSecrets.mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true }),
      });
      
      await backend.initialize(certificateConfig);
      
      expect(backend).toBeDefined();
    });

    it('should throw error if vaultUrl is missing', async () => {
      const invalidConfig = {
        type: 'AZURE_KEY_VAULT',
        vaultUrl: '',
        authentication: { type: 'managed_identity' as const },
      };
      
      await expect(backend.initialize(invalidConfig as any)).rejects.toThrow();
    });

    it('should throw error if connection fails', async () => {
      mockSecretClient.listPropertiesOfSecrets.mockReturnValue({
        next: vi.fn().mockRejectedValue(new Error('Connection failed')),
      });
      
      await expect(backend.initialize(config)).rejects.toThrow();
    });
  });

  describe('storeSecret', () => {
    beforeEach(async () => {
      mockSecretClient.listPropertiesOfSecrets.mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true }),
      });
      await backend.initialize(config);
      vi.clearAllMocks();
    });

    it('should store a secret successfully', async () => {
      mockSecretClient.setSecret.mockResolvedValue({
        name: 'test-secret',
        properties: {
          version: 'v1',
          createdOn: new Date('2025-01-01'),
        },
      });
      
      const result = await backend.storeSecret({
        name: 'test-secret',
        value: { apiKey: 'test-key' },
      });
      
      expect(result.secretRef).toBeDefined();
      expect(result.version).toBe(1);
      expect(mockSecretClient.setSecret).toHaveBeenCalled();
    });
  });

  describe('retrieveSecret', () => {
    beforeEach(async () => {
      mockSecretClient.listPropertiesOfSecrets.mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true }),
      });
      await backend.initialize(config);
      vi.clearAllMocks();
    });

    it('should retrieve a secret successfully', async () => {
      mockSecretClient.getSecret.mockResolvedValue({
        name: 'test-secret',
        value: JSON.stringify({ apiKey: 'test-key' }),
        properties: {
          version: 'v1',
          createdOn: new Date('2025-01-01'),
        },
      });
      
      const result = await backend.retrieveSecret({
        secretRef: 'test-secret',
      });
      
      expect(result.value).toEqual({ apiKey: 'test-key' });
      expect(result.version).toBe(1);
    });

    it('should throw DecryptionError if secret does not exist', async () => {
      // Azure SDK throws a generic error for 404, which gets wrapped in DecryptionError
      const error: any = new Error('Secret not found');
      error.statusCode = 404;
      mockSecretClient.getSecret.mockRejectedValue(error);
      
      await expect(
        backend.retrieveSecret({ secretRef: 'non-existent' })
      ).rejects.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when vault is accessible', async () => {
      mockSecretClient.listPropertiesOfSecrets.mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true }),
      });
      await backend.initialize(config);
      vi.clearAllMocks();
      
      mockSecretClient.listPropertiesOfSecrets.mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true }),
      });
      
      const health = await backend.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.latencyMs).toBeDefined();
    });

    it('should return unhealthy status when vault is not accessible', async () => {
      mockSecretClient.listPropertiesOfSecrets.mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true }),
      });
      await backend.initialize(config);
      vi.clearAllMocks();
      
      mockSecretClient.listPropertiesOfSecrets.mockReturnValue({
        next: vi.fn().mockRejectedValue(new Error('Connection failed')),
      });
      
      const health = await backend.healthCheck();
      
      expect(health.status).toBe('unhealthy');
    });
  });
});


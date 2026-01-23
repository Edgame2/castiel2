/**
 * Unit tests for GCP Secret Manager Backend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GCPSecretBackend } from '../../../../src/services/backends/GCPSecretBackend';
import { GCPSecretConfig } from '../../../../src/types/backend.types';
import { SecretNotFoundError } from '../../../../src/errors/SecretErrors';

// Mock GCP SDK
const mockClient = {
  createSecret: vi.fn(),
  addSecretVersion: vi.fn(),
  accessSecretVersion: vi.fn(),
  getSecret: vi.fn(),
  deleteSecret: vi.fn(),
  listSecrets: vi.fn(),
  listSecretVersions: vi.fn(),
};

vi.mock('@google-cloud/secret-manager', () => {
  return {
    SecretManagerServiceClient: vi.fn().mockImplementation(() => mockClient),
  };
});

describe('GCPSecretBackend', () => {
  let backend: GCPSecretBackend;
  let config: GCPSecretConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = new GCPSecretBackend();
    
    config = {
      type: 'GCP_SECRET_MANAGER',
      projectId: 'test-project',
      authentication: {
        type: 'default_credentials',
      },
    };
  });

  describe('initialize', () => {
    it('should initialize successfully with default credentials', async () => {
      mockClient.listSecrets.mockRejectedValueOnce({ code: 7 }); // NOT_FOUND is acceptable
      
      await backend.initialize(config);
      
      expect(backend).toBeDefined();
    });

    it('should initialize successfully with service account key file', async () => {
      const keyFileConfig: GCPSecretConfig = {
        type: 'GCP_SECRET_MANAGER',
        projectId: 'test-project',
        authentication: {
          type: 'service_account',
          keyFilePath: '/path/to/key.json',
        },
      };
      
      mockClient.listSecrets.mockRejectedValueOnce({ code: 7 });
      
      await backend.initialize(keyFileConfig);
      
      expect(backend).toBeDefined();
    });

    it('should throw error if projectId is missing', async () => {
      const invalidConfig = {
        type: 'GCP_SECRET_MANAGER',
        projectId: '',
        authentication: { type: 'default_credentials' as const },
      };
      
      await expect(backend.initialize(invalidConfig as any)).rejects.toThrow();
    });
  });

  describe('storeSecret', () => {
    beforeEach(async () => {
      mockClient.listSecrets.mockRejectedValueOnce({ code: 7 });
      await backend.initialize(config);
      vi.clearAllMocks();
    });

    it('should store a secret successfully', async () => {
      mockClient.createSecret.mockResolvedValueOnce([{ name: 'projects/test-project/secrets/test-secret' }]);
      mockClient.addSecretVersion.mockResolvedValueOnce([{ name: 'projects/test-project/secrets/test-secret/versions/1' }]);
      
      const result = await backend.storeSecret({
        name: 'test-secret',
        value: { apiKey: 'test-key' },
      });
      
      expect(result.secretRef).toBeDefined();
      expect(result.version).toBe(1);
    });
  });

  describe('retrieveSecret', () => {
    beforeEach(async () => {
      mockClient.listSecrets.mockRejectedValueOnce({ code: 7 });
      await backend.initialize(config);
      vi.clearAllMocks();
    });

    it('should retrieve a secret successfully', async () => {
      mockClient.accessSecretVersion.mockResolvedValueOnce([{
        payload: {
          data: Buffer.from(JSON.stringify({ apiKey: 'test-key' }), 'utf8'),
        },
        name: 'projects/test-project/secrets/test-secret/versions/1',
      }]);
      mockClient.getSecret.mockResolvedValueOnce([{
        name: 'projects/test-project/secrets/test-secret',
        createTime: { seconds: 1609459200 }, // 2021-01-01
      }]);
      
      const result = await backend.retrieveSecret({
        secretRef: 'projects/test-project/secrets/test-secret',
      });
      
      expect(result.value).toEqual({ apiKey: 'test-key' });
      expect(result.version).toBe(1);
    });

    it('should throw SecretNotFoundError if secret does not exist', async () => {
      // GCP error structure - backend checks error.code === 5 (NOT_FOUND)
      // Create error with code property set to 5
      const error = new Error('Secret not found');
      (error as any).code = 5; // gRPC status code NOT_FOUND
      
      // Mock accessSecretVersion to throw the error
      mockClient.accessSecretVersion.mockRejectedValueOnce(error);
      
      await expect(
        backend.retrieveSecret({ secretRef: 'non-existent' })
      ).rejects.toThrow();
      
      // Verify it's SecretNotFoundError
      try {
        await backend.retrieveSecret({ secretRef: 'non-existent' });
      } catch (thrownError: any) {
        expect(thrownError.constructor.name).toBe('SecretNotFoundError');
        expect(thrownError.message).toContain('non-existent');
      }
    });
    
    it('should throw DecryptionError for non-NOT_FOUND errors', async () => {
      // Non-NOT_FOUND errors should throw DecryptionError
      const error: any = new Error('Permission denied');
      error.code = 7; // PERMISSION_DENIED, not NOT_FOUND
      
      mockClient.accessSecretVersion.mockRejectedValueOnce(error);
      
      await expect(
        backend.retrieveSecret({ secretRef: 'test-secret' })
      ).rejects.toThrow(); // Should throw, but not SecretNotFoundError
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when backend is accessible', async () => {
      mockClient.listSecrets.mockRejectedValueOnce({ code: 7 });
      await backend.initialize(config);
      vi.clearAllMocks();
      
      mockClient.listSecrets.mockResolvedValueOnce([[]]);
      
      const health = await backend.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.latencyMs).toBeDefined();
    });

    it('should return healthy status even if no secrets exist (NOT_FOUND)', async () => {
      mockClient.listSecrets.mockRejectedValueOnce({ code: 7 });
      await backend.initialize(config);
      vi.clearAllMocks();
      
      mockClient.listSecrets.mockRejectedValueOnce({ code: 7 }); // NOT_FOUND is acceptable
      
      const health = await backend.healthCheck();
      
      expect(health.status).toBe('healthy');
    });
  });
});


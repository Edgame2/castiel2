/**
 * Unit tests for AWS Secrets Manager Backend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AWSSecretsBackend } from '../../../../src/services/backends/AWSSecretsBackend';
import { AWSSecretsConfig } from '../../../../src/types/backend.types';
import { SecretNotFoundError } from '../../../../src/errors/SecretErrors';

// Mock AWS SDK
const mockSend = vi.fn();
vi.mock('@aws-sdk/client-secrets-manager', () => {
  return {
    SecretsManagerClient: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    CreateSecretCommand: vi.fn().mockImplementation((params: any) => ({ type: 'CreateSecretCommand', params })),
    GetSecretValueCommand: vi.fn().mockImplementation((params: any) => ({ type: 'GetSecretValueCommand', params })),
    PutSecretValueCommand: vi.fn().mockImplementation((params: any) => ({ type: 'PutSecretValueCommand', params })),
    DeleteSecretCommand: vi.fn().mockImplementation((params: any) => ({ type: 'DeleteSecretCommand', params })),
    ListSecretsCommand: vi.fn().mockImplementation((params: any) => ({ type: 'ListSecretsCommand', params })),
    DescribeSecretCommand: vi.fn().mockImplementation((params: any) => ({ type: 'DescribeSecretCommand', params })),
  };
});

describe('AWSSecretsBackend', () => {
  let backend: AWSSecretsBackend;
  let config: AWSSecretsConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockClear();
    backend = new AWSSecretsBackend();
    
    config = {
      type: 'AWS_SECRETS_MANAGER',
      region: 'us-east-1',
      authentication: {
        type: 'iam_role',
      },
    };
  });

  describe('initialize', () => {
    it('should initialize successfully with IAM role', async () => {
      mockSend.mockResolvedValueOnce({}); // ListSecretsCommand response
      
      await backend.initialize(config);
      
      expect(backend).toBeDefined();
    });

    it('should initialize successfully with access key', async () => {
      const accessKeyConfig: AWSSecretsConfig = {
        type: 'AWS_SECRETS_MANAGER',
        region: 'us-east-1',
        authentication: {
          type: 'access_key',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      };
      
      mockSend.mockResolvedValueOnce({});
      
      await backend.initialize(accessKeyConfig);
      
      expect(backend).toBeDefined();
    });

    it('should throw error if region is missing', async () => {
      const invalidConfig = {
        type: 'AWS_SECRETS_MANAGER',
        region: '',
        authentication: { type: 'iam_role' as const },
      };
      
      await expect(backend.initialize(invalidConfig as any)).rejects.toThrow();
    });
  });

  describe('storeSecret', () => {
    beforeEach(async () => {
      mockSend.mockResolvedValueOnce({}); // Initialize
      await backend.initialize(config);
      vi.clearAllMocks();
    });

    it('should store a secret successfully', async () => {
      mockSend
        .mockResolvedValueOnce({ ARN: 'arn:aws:secretsmanager:us-east-1:123:secret:test-123' }) // CreateSecretCommand
        .mockResolvedValueOnce({ VersionId: 'AWSCURRENT' }); // DescribeSecretCommand
      
      const result = await backend.storeSecret({
        name: 'test-secret',
        value: { apiKey: 'test-key' },
      });
      
      expect(result.secretRef).toBeDefined();
      expect(result.version).toBe(1);
    });

    it('should handle string values', async () => {
      mockSend
        .mockResolvedValueOnce({ ARN: 'arn:aws:secretsmanager:us-east-1:123:secret:test-123' })
        .mockResolvedValueOnce({ VersionId: 'AWSCURRENT' });
      
      const result = await backend.storeSecret({
        name: 'test-secret',
        value: 'simple-string',
      });
      
      expect(result.secretRef).toBeDefined();
    });
  });

  describe('retrieveSecret', () => {
    beforeEach(async () => {
      mockSend.mockResolvedValueOnce({});
      await backend.initialize(config);
      vi.clearAllMocks();
    });

    it('should retrieve a secret successfully', async () => {
      mockSend
        .mockResolvedValueOnce({
          SecretString: JSON.stringify({ apiKey: 'test-key' }),
          ARN: 'arn:aws:secretsmanager:us-east-1:123:secret:test-123',
        })
        .mockResolvedValueOnce({
          CreatedDate: new Date('2025-01-01'),
        });
      
      const result = await backend.retrieveSecret({
        secretRef: 'arn:aws:secretsmanager:us-east-1:123:secret:test-123',
      });
      
      expect(result.value).toEqual({ apiKey: 'test-key' });
      expect(result.version).toBe(1);
    });

    it('should throw SecretNotFoundError if secret does not exist', async () => {
      // AWS SDK v3 error structure - the backend checks error.name === 'ResourceNotFoundException'
      // Create error object with name property set correctly
      const error: any = Object.create(Error.prototype);
      error.message = 'Secrets Manager can\'t find the specified secret.';
      error.name = 'ResourceNotFoundException';
      error.$fault = 'client';
      error.$metadata = {
        httpStatusCode: 400,
        requestId: 'test-request-id',
      };
      error.stack = new Error().stack;
      
      // Mock the first send (GetSecretValueCommand) to throw the error
      mockSend.mockRejectedValueOnce(error);
      
      await expect(
        backend.retrieveSecret({ secretRef: 'non-existent' })
      ).rejects.toMatchObject({ name: 'SecretNotFoundError', message: expect.stringContaining('non-existent') });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when backend is accessible', async () => {
      mockSend.mockResolvedValueOnce({}); // Initialize
      await backend.initialize(config);
      vi.clearAllMocks();
      
      mockSend.mockResolvedValueOnce({}); // ListSecretsCommand
      
      const health = await backend.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.latencyMs).toBeDefined();
    });

    it('should return unhealthy status when backend is not accessible', async () => {
      mockSend.mockResolvedValueOnce({});
      await backend.initialize(config);
      vi.clearAllMocks();
      
      mockSend.mockRejectedValueOnce(new Error('Connection failed'));
      
      const health = await backend.healthCheck();
      
      expect(health.status).toBe('unhealthy');
    });
  });
});


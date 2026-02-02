/**
 * Unit tests for Local Encrypted Backend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalBackend } from '../../../../src/services/backends/LocalBackend';
import { LocalBackendConfig } from '../../../../src/types/backend.types';
import { SecretNotFoundError } from '../../../../src/errors/SecretErrors';

// Mock database client
const mockDb = {
  $queryRaw: vi.fn(),
  secret_secrets: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => mockDb),
  };
});

// Mock encryption services
const mockEncryptionService = {
  encryptSecretValue: vi.fn(),
  decryptSecretValue: vi.fn(),
};

const mockKeyManager = {
  getActiveKey: vi.fn().mockResolvedValue({ id: 'key-1', key: Buffer.from('test-key') }),
};

vi.mock('../../../../src/services/encryption/EncryptionService', () => {
  return {
    EncryptionService: vi.fn().mockImplementation(() => mockEncryptionService),
  };
});

vi.mock('../../../../src/services/encryption/KeyManager', () => {
  return {
    KeyManager: vi.fn().mockImplementation(() => mockKeyManager),
  };
});

describe('LocalBackend', () => {
  let backend: LocalBackend;
  let config: LocalBackendConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = new LocalBackend();
    
    config = {
      type: 'LOCAL_ENCRYPTED',
    };
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      mockKeyManager.getActiveKey.mockResolvedValue({ id: 'key-1', key: Buffer.from('test-key') });
      
      await backend.initialize(config);
      
      expect(backend).toBeDefined();
    });

    it('should throw error if config type is invalid', async () => {
      const invalidConfig = {
        type: 'INVALID_TYPE',
      } as any;
      
      await expect(backend.initialize(invalidConfig)).rejects.toThrow('Invalid config type');
    });
  });

  describe('storeSecret', () => {
    beforeEach(async () => {
      mockKeyManager.getActiveKey.mockResolvedValue({ id: 'key-1', key: Buffer.from('test-key') });
      await backend.initialize(config);
      vi.clearAllMocks();
    });

    it('should store a secret successfully', async () => {
      mockEncryptionService.encryptSecretValue.mockResolvedValue('encrypted-value');
      mockKeyManager.getActiveKey.mockResolvedValue({ id: 'key-1', key: Buffer.from('test-key') });
      
      const result = await backend.storeSecret({
        name: 'test-secret',
        value: { apiKey: 'test-key' },
      });
      
      expect(result.secretRef).toBe('local:test-secret');
      expect(result.version).toBe(1);
      expect(mockEncryptionService.encryptSecretValue).toHaveBeenCalledWith({ apiKey: 'test-key' });
    });
  });

  describe('retrieveSecret', () => {
    beforeEach(async () => {
      mockKeyManager.getActiveKey.mockResolvedValue({ id: 'key-1', key: Buffer.from('test-key') });
      await backend.initialize(config);
      vi.clearAllMocks();
    });

    it('should retrieve a secret successfully', async () => {
      mockDb.secret_secrets.findFirst.mockResolvedValue({
        id: 'secret-1',
        name: 'test-secret',
        encryptedValue: 'encrypted-value',
        encryptionKeyId: 'key-1',
        currentVersion: 1,
        createdAt: new Date('2025-01-01'),
        expiresAt: null,
      });
      
      mockEncryptionService.decryptSecretValue.mockResolvedValue({ apiKey: 'test-key' });
      
      const result = await backend.retrieveSecret({
        secretRef: 'local:test-secret',
      });
      
      expect(result.value).toEqual({ apiKey: 'test-key' });
      expect(result.version).toBe(1);
    });

    it('should throw SecretNotFoundError if secret does not exist', async () => {
      mockDb.secret_secrets.findFirst.mockResolvedValue(null);
      
      await expect(
        backend.retrieveSecret({ secretRef: 'local:non-existent' })
      ).rejects.toMatchObject({ name: 'SecretNotFoundError' });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when backend is accessible', async () => {
      mockKeyManager.getActiveKey.mockResolvedValue({ id: 'key-1', key: Buffer.from('test-key') });
      await backend.initialize(config);
      vi.clearAllMocks();
      
      mockDb.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockKeyManager.getActiveKey.mockResolvedValue({ id: 'key-1', key: Buffer.from('test-key') });
      
      const health = await backend.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.latencyMs).toBeDefined();
    });

    it('should return unhealthy status when database is not accessible', async () => {
      mockKeyManager.getActiveKey.mockResolvedValue({ id: 'key-1', key: Buffer.from('test-key') });
      await backend.initialize(config);
      vi.clearAllMocks();
      
      mockDb.$queryRaw.mockRejectedValue(new Error('Connection failed'));
      
      const health = await backend.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.message).toBeDefined();
    });
  });
});


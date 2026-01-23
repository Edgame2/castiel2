/**
 * Unit tests for Secret Service
 * 
 * Comprehensive tests for the core SecretService covering:
 * - CRUD operations
 * - Access control
 * - Versioning
 * - Lifecycle management
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecretService } from '../../../src/services/SecretService';
import {
  SecretNotFoundError,
  SecretAlreadyExistsError,
  InvalidSecretValueError,
  SecretExpiredError,
} from '../../../src/errors/SecretErrors';
import { SecretContext, AnySecretValue } from '../../../src/types';

// Mock all dependencies
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      secret_secrets: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
      },
      secret_secret_versions: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
    })),
  };
});

vi.mock('../../../src/services/backends/BackendFactory');
vi.mock('../../../src/services/encryption/EncryptionService');
vi.mock('../../../src/services/encryption/KeyManager');
vi.mock('../../../src/services/VaultService');
vi.mock('../../../src/services/access/AccessController');
vi.mock('../../../src/services/access/ScopeValidator');
vi.mock('../../../src/services/events/SecretEventPublisher');
vi.mock('../../../src/services/logging/LoggingClient');
vi.mock('../../../src/services/AuditService');

describe('SecretService', () => {
  let secretService: SecretService;
  let mockDb: any;
  let context: SecretContext;

  beforeEach(() => {
    vi.clearAllMocks();
    secretService = new SecretService();
    mockDb = (secretService as any).db;
    
    context = {
      userId: 'user-123',
      organizationId: 'org-123',
      teamId: 'team-123',
      projectId: 'project-123',
      consumerModule: 'test-module',
      consumerResourceId: 'resource-123',
    };
  });

  describe('createSecret', () => {
    it('should create a secret successfully', async () => {
      const secretValue: AnySecretValue = {
        type: 'API_KEY',
        key: 'test-api-key',
      };
      
      // Mock access control
      const mockAccessController = (secretService as any).accessController;
      mockAccessController.canCreateSecret = vi.fn().mockResolvedValue({ allowed: true });
      
      // Mock scope validation
      const mockScopeValidator = (secretService as any).scopeValidator;
      mockScopeValidator.validateScope = vi.fn().mockReturnValue(true);
      
      // Mock no existing secret
      mockDb.secret_secrets.findFirst.mockResolvedValue(null);
      
      // Mock backend
      const mockBackend = {
        storeSecret: vi.fn().mockResolvedValue({
          secretRef: 'local:test-secret',
          version: 1,
        }),
      };
      const { BackendFactory } = await import('../../../src/services/backends/BackendFactory');
      (BackendFactory.createBackend as any).mockResolvedValue(mockBackend);
      
      // Mock encryption
      const mockEncryptionService = (secretService as any).encryptionService;
      mockEncryptionService.encryptSecretValue = vi.fn().mockResolvedValue('encrypted-value');
      
      // Mock key manager
      const mockKeyManager = (secretService as any).keyManager;
      mockKeyManager.getActiveKey = vi.fn().mockResolvedValue({ id: 'key-1' });
      
      // Mock database create
      mockDb.secret_secrets.create.mockResolvedValue({
        id: 'secret-1',
        name: 'test-secret',
        type: 'API_KEY',
        scope: 'ORGANIZATION',
        organizationId: 'org-123',
        currentVersion: 1,
        createdAt: new Date(),
      });
      
      mockDb.secret_secret_versions.create.mockResolvedValue({
        id: 'version-1',
        version: 1,
      });
      
      const result = await secretService.createSecret({
        name: 'test-secret',
        type: 'API_KEY',
        value: secretValue,
        scope: 'ORGANIZATION',
        organizationId: 'org-123',
      }, context);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('test-secret');
      expect(mockDb.secret_secrets.create).toHaveBeenCalled();
    });

    it('should throw SecretAlreadyExistsError if secret name already exists', async () => {
      const secretValue: AnySecretValue = {
        type: 'API_KEY',
        key: 'test-api-key',
      };
      
      const mockAccessController = (secretService as any).accessController;
      mockAccessController.canCreateSecret = vi.fn().mockResolvedValue({ allowed: true });
      
      const mockScopeValidator = (secretService as any).scopeValidator;
      mockScopeValidator.validateScope = vi.fn().mockReturnValue(true);
      
      // Mock existing secret
      mockDb.secret_secrets.findFirst.mockResolvedValue({
        id: 'existing-secret',
        name: 'test-secret',
      });
      
      await expect(
        secretService.createSecret({
          name: 'test-secret',
          type: 'API_KEY',
          value: secretValue,
          scope: 'ORGANIZATION',
          organizationId: 'org-123',
        }, context)
      ).rejects.toThrow(SecretAlreadyExistsError);
    });

    it('should throw error if access is denied', async () => {
      const secretValue: AnySecretValue = {
        type: 'API_KEY',
        key: 'test-api-key',
      };
      
      const mockAccessController = (secretService as any).accessController;
      mockAccessController.canCreateSecret = vi.fn().mockResolvedValue({
        allowed: false,
        reason: 'Insufficient permissions',
      });
      
      const mockScopeValidator = (secretService as any).scopeValidator;
      mockScopeValidator.validateScope = vi.fn().mockReturnValue(true);
      
      await expect(
        secretService.createSecret({
          name: 'test-secret',
          type: 'API_KEY',
          value: secretValue,
          scope: 'ORGANIZATION',
          organizationId: 'org-123',
        }, context)
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('getSecret', () => {
    it('should retrieve a secret successfully', async () => {
      const mockSecret = {
        id: 'secret-1',
        name: 'test-secret',
        type: 'API_KEY',
        scope: 'ORGANIZATION',
        organizationId: 'org-123',
        currentVersion: 1,
        createdAt: new Date(),
        expiresAt: null,
      };
      
      mockDb.secret_secrets.findFirst.mockResolvedValue(mockSecret);
      
      const mockAccessController = (secretService as any).accessController;
      mockAccessController.canReadSecret = vi.fn().mockResolvedValue({ allowed: true });
      
      const result = await secretService.getSecret('secret-1', context);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('secret-1');
    });

    it('should throw SecretNotFoundError if secret does not exist', async () => {
      mockDb.secret_secrets.findFirst.mockResolvedValue(null);
      
      await expect(
        secretService.getSecret('non-existent', context)
      ).rejects.toThrow(SecretNotFoundError);
    });
  });

  describe('updateSecret', () => {
    it('should update a secret successfully', async () => {
      const existingSecret = {
        id: 'secret-1',
        name: 'test-secret',
        type: 'API_KEY',
        scope: 'ORGANIZATION',
        organizationId: 'org-123',
        currentVersion: 1,
      };
      
      mockDb.secret_secrets.findFirst.mockResolvedValue(existingSecret);
      
      const mockAccessController = (secretService as any).accessController;
      mockAccessController.canUpdateSecret = vi.fn().mockResolvedValue({ allowed: true });
      
      const mockBackend = {
        updateSecret: vi.fn().mockResolvedValue({ version: 2 }),
      };
      const { BackendFactory } = await import('../../../src/services/backends/BackendFactory');
      (BackendFactory.createBackend as any).mockResolvedValue(mockBackend);
      
      const mockEncryptionService = (secretService as any).encryptionService;
      mockEncryptionService.encryptSecretValue = vi.fn().mockResolvedValue('encrypted-value');
      
      mockDb.secret_secrets.update.mockResolvedValue({
        ...existingSecret,
        currentVersion: 2,
      });
      
      mockDb.secret_secret_versions.create.mockResolvedValue({
        id: 'version-2',
        version: 2,
      });
      
      const newValue: AnySecretValue = {
        type: 'API_KEY',
        key: 'new-api-key',
      };
      
      const result = await secretService.updateSecret('secret-1', {
        value: newValue,
      }, context);
      
      expect(result).toBeDefined();
      expect(mockDb.secret_secrets.update).toHaveBeenCalled();
    });
  });

  describe('deleteSecret', () => {
    it('should soft delete a secret successfully', async () => {
      const existingSecret = {
        id: 'secret-1',
        name: 'test-secret',
        scope: 'ORGANIZATION',
        organizationId: 'org-123',
        deletedAt: null,
      };
      
      mockDb.secret_secrets.findFirst.mockResolvedValue(existingSecret);
      
      const mockAccessController = (secretService as any).accessController;
      mockAccessController.canDeleteSecret = vi.fn().mockResolvedValue({ allowed: true });
      
      mockDb.secret_secrets.update.mockResolvedValue({
        ...existingSecret,
        deletedAt: new Date(),
      });
      
      await secretService.deleteSecret('secret-1', context);
      
      expect(mockDb.secret_secrets.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('listSecrets', () => {
    it('should list secrets with pagination', async () => {
      const mockSecrets = [
        {
          id: 'secret-1',
          name: 'secret-1',
          type: 'API_KEY',
          scope: 'ORGANIZATION',
          createdAt: new Date(),
        },
        {
          id: 'secret-2',
          name: 'secret-2',
          type: 'API_KEY',
          scope: 'ORGANIZATION',
          createdAt: new Date(),
        },
      ];
      
      mockDb.secret_secrets.findMany.mockResolvedValue(mockSecrets);
      mockDb.secret_secrets.count = vi.fn().mockResolvedValue(2);
      
      const result = await secretService.listSecrets({
        scope: 'ORGANIZATION',
        organizationId: 'org-123',
        limit: 10,
        offset: 0,
      }, context);
      
      expect(result.secrets).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });
  });
});



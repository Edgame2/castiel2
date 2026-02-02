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

const mockDb = {
  secret_secrets: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
  secret_access_grants: { findFirst: vi.fn() },
  secret_versions: {
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    create: vi.fn().mockResolvedValue({ id: 'v1', version: 2 }),
  },
  secret_secret_versions: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};
vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(() => mockDb),
}));

vi.mock('../../../src/services/backends/BackendFactory');
vi.mock('../../../src/services/encryption/EncryptionService');
vi.mock('../../../src/services/encryption/KeyManager', () => ({
  KeyManager: vi.fn().mockImplementation(() => ({
    getActiveKey: vi.fn().mockResolvedValue({ keyId: 'key-1', version: 1 }),
  })),
}));
vi.mock('../../../src/services/VaultService');
vi.mock('../../../src/services/access/AccessController', () => ({
  AccessController: vi.fn().mockImplementation(() => ({
    checkAccess: vi.fn().mockResolvedValue({ allowed: true }),
    canCreateSecret: vi.fn().mockResolvedValue({ allowed: true }),
  })),
}));
vi.mock('../../../src/services/access/ScopeValidator', () => ({
  ScopeValidator: {
    validateScope: vi.fn().mockReturnValue(true),
  },
}));
vi.mock('../../../src/services/events/SecretEventPublisher', () => ({
  publishSecretEvent: vi.fn().mockResolvedValue(undefined),
  SecretEvents: {
    secretCreated: (d: Record<string, unknown>) => ({ type: 'secret.created', ...d }),
    secretUpdated: (d: Record<string, unknown>) => ({ type: 'secret.updated', ...d }),
    secretDeleted: (d: Record<string, unknown>) => ({ type: 'secret.deleted', ...d }),
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

describe('SecretService', () => {
  let secretService: SecretService;
  let context: SecretContext;

  beforeEach(() => {
    vi.clearAllMocks();
    secretService = new SecretService();
    
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
      ).rejects.toThrow(/Secret already exists|SecretAlreadyExistsError/);
    });

    it('should throw error if access is denied', async () => {
      const secretValue: AnySecretValue = {
        type: 'API_KEY',
        key: 'test-api-key',
      };
      const mockAccessController = (secretService as any).accessController;
      mockAccessController.canCreateSecret.mockResolvedValueOnce({
        allowed: false,
        reason: 'Insufficient permissions',
      });

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

  describe('getSecretMetadata', () => {
    it('should retrieve secret metadata successfully', async () => {
      const mockSecret = {
        id: 'secret-1',
        name: 'test-secret',
        type: 'API_KEY',
        scope: 'ORGANIZATION',
        organizationId: 'org-123',
        currentVersion: 1,
        createdAt: new Date(),
        expiresAt: null,
        createdBy: null,
        updatedBy: null,
      };
      mockDb.secret_secrets.findUnique.mockResolvedValue(mockSecret);

      const result = await secretService.getSecretMetadata('secret-1', context);

      expect(result).toBeDefined();
      expect(result.id).toBe('secret-1');
    });

    it('should throw SecretNotFoundError if secret does not exist', async () => {
      mockDb.secret_secrets.findUnique.mockResolvedValue(null);

      await expect(
        secretService.getSecretMetadata('non-existent', context)
      ).rejects.toThrow(/Secret not found|SecretNotFoundError/);
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
        storageBackend: 'LOCAL_ENCRYPTED',
      };
      mockDb.secret_secrets.findUnique.mockResolvedValue(existingSecret);

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
      
      mockDb.secret_secrets.findUnique.mockResolvedValue(existingSecret);

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
    it('should list secrets', async () => {
      const mockSecrets = [
        {
          id: 'secret-1',
          name: 'secret-1',
          type: 'API_KEY',
          scope: 'ORGANIZATION',
          organizationId: 'org-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: null,
          currentVersion: 1,
          deletedAt: null,
          createdById: 'user-123',
          storageBackend: 'LOCAL_ENCRYPTED',
          tags: [],
          metadata: null,
          rotationEnabled: false,
          teamId: null,
          projectId: null,
          userId: null,
        },
        {
          id: 'secret-2',
          name: 'secret-2',
          type: 'API_KEY',
          scope: 'ORGANIZATION',
          organizationId: 'org-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: null,
          currentVersion: 1,
          deletedAt: null,
          createdById: 'user-123',
          storageBackend: 'LOCAL_ENCRYPTED',
          tags: [],
          metadata: null,
          rotationEnabled: false,
          teamId: null,
          projectId: null,
          userId: null,
        },
      ];
      mockDb.secret_secrets.findMany.mockResolvedValue(mockSecrets);

      const result = await secretService.listSecrets({
        scope: 'ORGANIZATION',
        organizationId: 'org-123',
        limit: 10,
      }, context);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('secret-1');
      expect(result[1].id).toBe('secret-2');
    });
  });
});



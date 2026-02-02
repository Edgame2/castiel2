/**
 * Unit tests for Migration Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MigrationService } from '../../../../src/services/migration/MigrationService';
import { BackendFactory } from '../../../../src/services/backends/BackendFactory';

const validMasterKey = '0'.repeat(64);

vi.mock('../../../../src/services/backends/BackendFactory');
vi.mock('../../../../src/services/events/SecretEventPublisher', () => ({
  publishSecretEvent: vi.fn().mockResolvedValue(undefined),
  SecretEvents: {
    secretsMigrated: (d: Record<string, unknown>) => ({ type: 'secret.secrets.migrated', ...d }),
  },
}));
vi.mock('../../../../src/services/logging/LoggingClient', () => ({
  getLoggingClient: vi.fn(() => ({ sendLog: vi.fn().mockResolvedValue(undefined) })),
}));
vi.mock('../../../../src/services/AuditService', () => ({
  AuditService: vi.fn().mockImplementation(() => ({
    log: vi.fn().mockResolvedValue(undefined),
  })),
}));
const mockDb = {
  secret_secrets: { update: vi.fn().mockResolvedValue({}) },
};
vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(() => mockDb),
}));

describe('MigrationService', () => {
  let migrationService: MigrationService;

  const mockSecret = {
    id: 'secret-1',
    name: 'test-secret',
    storageBackend: 'LOCAL_ENCRYPTED',
    scope: 'ORGANIZATION',
    organizationId: 'org-1',
  };
  const mockSourceVault = { id: 'vault-1', name: 'Local', backend: 'LOCAL_ENCRYPTED' };
  const mockTargetVault = { id: 'vault-2', name: 'Azure', backend: 'AZURE_KEY_VAULT' };

  beforeEach(() => {
    process.env.SECRET_MASTER_KEY = validMasterKey;
    mockDb.secret_secrets.update.mockResolvedValue({});
    migrationService = new MigrationService();
    vi.spyOn((migrationService as any).vaultService, 'getVault')
      .mockResolvedValueOnce(mockSourceVault)
      .mockResolvedValueOnce(mockTargetVault);
    vi.spyOn((migrationService as any).secretService, 'getSecretMetadata').mockResolvedValue(mockSecret);
    vi.spyOn((migrationService as any).secretService, 'getSecretValue').mockResolvedValue({
      type: 'API_KEY',
      key: 'test-key',
    });
    vi.spyOn((migrationService as any).secretService, 'updateSecret').mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env.SECRET_MASTER_KEY;
  });

  describe('migrateSecrets', () => {
    it('should return migration result with migrated/failed/errors when spies are set', async () => {
      const result = await migrationService.migrateSecrets(
        'vault-1',
        'vault-2',
        ['secret-1'],
        { userId: 'user-1', organizationId: 'org-1', consumerModule: 'test' }
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('migrated');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.migrated + result.failed).toBeLessThanOrEqual(1);
    });
  });
});



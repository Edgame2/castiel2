/**
 * SSO Configuration Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { SSOConfigurationService } from '../../../src/services/SSOConfigurationService';

vi.mock('@coder/shared', () => ({ getDatabaseClient: vi.fn() }));
vi.mock('../../../src/services/SecretManagementClient', () => ({
  getSecretManagementClient: vi.fn(() => ({
    createSecret: vi.fn().mockResolvedValue({ id: 'secret-1' }),
    getSecret: vi.fn().mockResolvedValue(null),
    deleteSecret: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock('../../../src/utils/logger', () => ({
  log: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe('SSOConfigurationService', () => {
  let service: SSOConfigurationService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      sSOConfiguration: {
        upsert: vi.fn().mockResolvedValue({ id: 'sso-1', organizationId: 'org-1', secretId: 'secret-1' }),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb);
    service = new SSOConfigurationService();
  });

  describe('configureSSO', () => {
    it('should have configureSSO method', () => {
      expect(typeof service.configureSSO).toBe('function');
    });
  });
});

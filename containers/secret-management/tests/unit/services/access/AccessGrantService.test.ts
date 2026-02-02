/**
 * Unit tests for Access Grant Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccessGrantService } from '../../../../src/services/access/AccessGrantService';
import { GrantNotFoundError } from '../../../../src/errors/SecretErrors';

vi.mock('../../../../src/services/access/AccessController', () => ({
  AccessController: vi.fn().mockImplementation(() => ({
    checkAccess: vi.fn().mockResolvedValue({ allowed: true }),
  })),
}));
vi.mock('../../../../src/services/events/SecretEventPublisher', () => ({
  publishSecretEvent: vi.fn().mockResolvedValue(undefined),
  SecretEvents: {
    accessGranted: (d: Record<string, unknown>) => ({ type: 'secret.access.granted', ...d }),
    accessRevoked: (d: Record<string, unknown>) => ({ type: 'secret.access.revoked', ...d }),
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

vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(() => ({
    secret_access_grants: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    secret_secrets: { findUnique: vi.fn() },
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'user-123' }) },
  })),
}));

describe('AccessGrantService', () => {
  let grantService: AccessGrantService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    grantService = new AccessGrantService();
    mockDb = (grantService as any).db;
  });

  describe('grantAccess', () => {
    it('should create an access grant successfully', async () => {
      const mockSecret = { id: 'secret-1', name: 's1', organizationId: 'org-1', teamId: null, projectId: null };
      const mockGrant = {
        id: 'grant-1',
        secretId: 'secret-1',
        granteeType: 'USER',
        userId: 'user-123',
        teamId: null,
        roleId: null,
        canRead: true,
        canUpdate: false,
        canDelete: false,
        canGrant: false,
        expiresAt: null,
        grantedAt: new Date(),
        grantedById: 'actor-123',
      };
      mockDb.secret_secrets.findUnique.mockResolvedValue(mockSecret);
      mockDb.secret_access_grants.findFirst.mockResolvedValue(null);
      mockDb.secret_access_grants.create.mockResolvedValue(mockGrant);

      const result = await grantService.grantAccess(
        {
          secretId: 'secret-1',
          granteeType: 'USER',
          granteeId: 'user-123',
          permissions: { canRead: true, canUpdate: false, canDelete: false, canGrant: false },
        },
        'actor-123'
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('grant-1');
    });
  });

  describe('listGrants', () => {
    it('should retrieve grants for a secret', async () => {
      const mockGrants = [
        {
          id: 'grant-1',
          secretId: 'secret-1',
          granteeType: 'USER',
          userId: 'user-123',
          teamId: null,
          roleId: null,
          canRead: true,
          canUpdate: false,
          canDelete: false,
          canGrant: false,
          expiresAt: null,
          grantedAt: new Date(),
          grantedById: 'actor-123',
          grantedBy: null,
        },
      ];
      mockDb.secret_access_grants.findMany.mockResolvedValue(mockGrants);

      const result = await grantService.listGrants('secret-1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('grant-1');
    });
  });

  describe('revokeAccess', () => {
    it('should revoke an access grant', async () => {
      const mockGrant = {
        id: 'grant-1',
        secretId: 'secret-1',
        secret: { name: 's1', organizationId: 'org-1', teamId: null, projectId: null, scope: 'ORGANIZATION' },
      };
      mockDb.secret_access_grants.findUnique.mockResolvedValue(mockGrant);
      mockDb.secret_access_grants.delete.mockResolvedValue({});

      await grantService.revokeAccess('grant-1', 'actor-123');

      expect(mockDb.secret_access_grants.delete).toHaveBeenCalled();
    });

    it('should throw GrantNotFoundError if grant does not exist', async () => {
      mockDb.secret_access_grants.findUnique.mockResolvedValue(null);

      await expect(grantService.revokeAccess('non-existent', 'actor-123')).rejects.toThrow(/Access grant not found|GrantNotFoundError/);
    });
  });
});



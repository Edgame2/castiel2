/**
 * Unit tests for Access Controller
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccessController } from '../../../../src/services/access/AccessController';
import { SecretContext } from '../../../../src/types';

// Mock dependencies
vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(() => ({
    secret_secrets: { findUnique: vi.fn() },
    secret_access_grants: { findMany: vi.fn(), findFirst: vi.fn() },
  })),
}));

vi.mock('../../../../src/services/access/RoleService', () => ({
  getUserRoles: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));
vi.mock('../../../../src/services/access/ScopeValidator', () => ({
  ScopeValidator: {
    canAccessScope: vi.fn().mockReturnValue(true),
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

describe('AccessController', () => {
  let accessController: AccessController;
  let mockDb: any;
  let context: SecretContext;

  beforeEach(() => {
    vi.clearAllMocks();
    accessController = new AccessController();
    mockDb = (accessController as any).db;
    
    context = {
      userId: 'user-123',
      organizationId: 'org-123',
      teamId: 'team-123',
      projectId: 'project-123',
      consumerModule: 'test-module',
      consumerResourceId: 'resource-123',
    };
  });

  describe('checkAccess', () => {
    it('should allow access if user has permission', async () => {
      const mockSecret = {
        id: 'secret-1',
        scope: 'ORGANIZATION',
        organizationId: 'org-123',
        createdById: 'user-123',
        deletedAt: null,
        expiresAt: null,
        name: 's1',
      };
      mockDb.secret_secrets.findUnique.mockResolvedValue(mockSecret);
      mockDb.secret_access_grants.findFirst.mockResolvedValue(null);

      const { getUserRoles } = await import('../../../../src/services/access/RoleService');
      (getUserRoles as any).mockResolvedValue([
        {
          id: 'role-1',
          name: 'Admin',
          permissions: ['secrets.secret.read', 'secrets.secret.read.organization'],
        },
      ]);

      const result = await accessController.checkAccess('secret-1', 'READ', context);

      expect(result.allowed).toBe(true);
    });

    it('should deny access if user lacks permission', async () => {
      const mockSecret = {
        id: 'secret-1',
        scope: 'ORGANIZATION',
        organizationId: 'org-123',
        createdById: 'other-user',
        deletedAt: null,
        expiresAt: null,
        name: 's1',
      };
      mockDb.secret_secrets.findUnique.mockResolvedValue(mockSecret);
      mockDb.secret_access_grants.findFirst.mockResolvedValue(null);

      const { getUserRoles } = await import('../../../../src/services/access/RoleService');
      (getUserRoles as any).mockResolvedValue([
        { id: 'role-1', name: 'Viewer', permissions: [] },
      ]);

      const result = await accessController.checkAccess('secret-1', 'READ', context);

      expect(result.allowed).toBe(false);
    });
  });

  describe('canCreateSecret', () => {
    it('should allow creation if user has permission', async () => {
      const { getUserRoles, isSuperAdmin } = await import('../../../../src/services/access/RoleService');
      (getUserRoles as any).mockResolvedValue([
        { id: 'role-1', name: 'Admin', permissions: ['secrets.secret.create.organization'] },
      ]);
      (isSuperAdmin as any).mockResolvedValue(false);

      const result = await accessController.canCreateSecret('ORGANIZATION', context);

      expect(result.allowed).toBe(true);
    });
  });
});



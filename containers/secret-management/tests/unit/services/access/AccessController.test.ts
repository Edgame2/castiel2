/**
 * Unit tests for Access Controller
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccessController } from '../../../../src/services/access/AccessController';
import { SecretContext } from '../../../../src/types';

// Mock dependencies
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      secret_secrets: {
        findUnique: vi.fn(),
      },
      secret_access_grants: {
        findMany: vi.fn(),
      },
    })),
  };
});

vi.mock('../../../../src/services/access/RoleService');
vi.mock('../../../../src/services/access/ScopeValidator');

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
      };
      
      mockDb.secret_secrets.findUnique.mockResolvedValue(mockSecret);
      
      // Mock role service
      const { getUserRoles } = await import('../../../../src/services/access/RoleService');
      (getUserRoles as any).mockResolvedValue([
        {
          id: 'role-1',
          name: 'Admin',
          permissions: ['SECRET_READ', 'SECRET_WRITE'],
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
      };
      
      mockDb.secret_secrets.findUnique.mockResolvedValue(mockSecret);
      
      const { getUserRoles } = await import('../../../../src/services/access/RoleService');
      (getUserRoles as any).mockResolvedValue([
        {
          id: 'role-1',
          name: 'Viewer',
          permissions: [], // No permissions
        },
      ]);
      
      const result = await accessController.checkAccess('secret-1', 'READ', context);
      
      expect(result.allowed).toBe(false);
    });
  });

  describe('canCreateSecret', () => {
    it('should allow creation if user has permission', async () => {
      const { getUserRoles } = await import('../../../../src/services/access/RoleService');
      (getUserRoles as any).mockResolvedValue([
        {
          id: 'role-1',
          name: 'Admin',
          permissions: ['SECRET_CREATE'],
        },
      ]);
      
      const result = await accessController.canCreateSecret('ORGANIZATION', context);
      
      expect(result.allowed).toBe(true);
    });
  });
});



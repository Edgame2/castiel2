/**
 * Unit tests for Role Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUserRoles, hasPermission, isSuperAdmin } from '../../../../src/services/access/RoleService';
import { getUserManagementClient } from '../../../../src/services/access/UserManagementClient';

// Mock UserManagementClient
vi.mock('../../../../src/services/access/UserManagementClient');

describe('RoleService', () => {
  let mockUserManagementClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserManagementClient = {
      baseUrl: 'http://user-management:3000',
      getUserRoles: vi.fn(),
      getOrganizationUserRoles: vi.fn(),
      hasPermission: vi.fn(),
    };
    (getUserManagementClient as any).mockReturnValue(mockUserManagementClient);
  });

  describe('getUserRoles', () => {
    it('should fetch user roles from User Management', async () => {
      const mockRoles = [
        {
          id: 'role-1',
          name: 'Admin',
          permissions: ['SECRET_READ', 'SECRET_WRITE'],
        },
      ];
      
      mockUserManagementClient.getUserRoles.mockResolvedValue(mockRoles);
      
      const result = await getUserRoles('user-123');
      
      expect(result).toEqual(mockRoles);
      expect(mockUserManagementClient.getUserRoles).toHaveBeenCalledWith('user-123');
    });

    it('should fetch organization-specific roles', async () => {
      const mockRoles = [
        {
          id: 'role-1',
          name: 'OrgAdmin',
          permissions: ['SECRET_READ'],
        },
      ];
      
      mockUserManagementClient.getOrganizationUserRoles.mockResolvedValue(mockRoles);
      
      const result = await getUserRoles('user-123', 'org-123');
      
      expect(result).toEqual(mockRoles);
      expect(mockUserManagementClient.getOrganizationUserRoles).toHaveBeenCalledWith('org-123', 'user-123');
    });

    it('should return empty array on error', async () => {
      mockUserManagementClient.getUserRoles.mockRejectedValue(new Error('Service unavailable'));
      
      const result = await getUserRoles('user-123');
      
      expect(result).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true if user has permission', async () => {
      mockUserManagementClient.getUserRoles.mockResolvedValue([
        {
          id: 'role-1',
          name: 'Admin',
          permissions: ['SECRET_READ'],
          isSuperAdmin: false,
        },
      ]);
      
      const result = await hasPermission('user-123', 'SECRET_READ');
      
      expect(result).toBe(true);
    });

    it('should return false if user lacks permission', async () => {
      mockUserManagementClient.getUserRoles.mockResolvedValue([
        {
          id: 'role-1',
          name: 'Viewer',
          permissions: [],
        },
      ]);
      
      const result = await hasPermission('user-123', 'SECRET_READ');
      
      expect(result).toBe(false);
    });
  });

  describe('isSuperAdmin', () => {
    it('should return true if user is super admin', async () => {
      mockUserManagementClient.getUserRoles.mockResolvedValue([
        {
          id: 'role-1',
          name: 'SuperAdmin',
          permissions: ['*'],
          isSuperAdmin: true,
        },
      ]);
      
      const result = await isSuperAdmin('user-123');
      
      expect(result).toBe(true);
    });

    it('should return false if user is not super admin', async () => {
      mockUserManagementClient.getUserRoles.mockResolvedValue([
        {
          id: 'role-1',
          name: 'Admin',
          permissions: ['SECRET_READ'],
          isSuperAdmin: false,
        },
      ]);
      
      const result = await isSuperAdmin('user-123');
      
      expect(result).toBe(false);
    });
  });
});



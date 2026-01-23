/**
 * Unit tests for User Management Client
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UserManagementClient, getUserManagementClient } from '../../../../src/services/access/UserManagementClient';
import { getConfig } from '../../../../src/config';

// Mock config
vi.mock('../../../../src/config', () => ({
  getConfig: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('UserManagementClient', () => {
  let client: UserManagementClient;
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new UserManagementClient('http://localhost:3000', 'test-token');
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('getUserRoles', () => {
    it('should fetch user roles successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ roles: [{ id: '1', name: 'Admin', permissions: ['read', 'write'] }] }),
      });
      
      const roles = await client.getUserRoles('user-123');
      
      expect(roles).toHaveLength(1);
      expect(roles[0].name).toBe('Admin');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/users/user-123/roles',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should return empty array on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      
      const roles = await client.getUserRoles('user-123');
      
      expect(roles).toEqual([]);
    });

    it('should return empty array on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const roles = await client.getUserRoles('user-123');
      
      expect(roles).toEqual([]);
    });
  });

  describe('getOrganizationUserRoles', () => {
    it('should fetch organization user roles successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ roles: [{ id: '1', name: 'OrgAdmin', permissions: ['read'] }] }),
      });
      
      const roles = await client.getOrganizationUserRoles('org-123', 'user-123');
      
      expect(roles).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/organizations/org-123/users/user-123/roles',
        expect.any(Object)
      );
    });
  });

  describe('hasPermission', () => {
    it('should return true if user has permission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ roles: [{ permissions: ['read', 'write'] }] }),
      });
      
      const hasPermission = await client.hasPermission('user-123', 'read');
      
      expect(hasPermission).toBe(true);
    });

    it('should return false if user does not have permission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ roles: [{ permissions: ['read'] }] }),
      });
      
      const hasPermission = await client.hasPermission('user-123', 'write');
      
      expect(hasPermission).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when service is accessible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });
      
      const health = await client.healthCheck();
      
      expect(health.status).toBe('ok');
      expect(health.latency_ms).toBeDefined();
    });

    it('should return error status when service is not accessible', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));
      
      const health = await client.healthCheck();
      
      expect(health.status).toBe('error');
      expect(health.message).toBeDefined();
    });
  });

  describe('getUserManagementClient (singleton)', () => {
    it('should return singleton instance', () => {
      (getConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        services: {
          user_management: {
            url: 'http://localhost:3000',
          },
        },
        service: {
          authToken: 'test-token',
        },
      });
      
      const client1 = getUserManagementClient();
      const client2 = getUserManagementClient();
      
      expect(client1).toBe(client2);
    });

    it('should handle missing URL gracefully', () => {
      (getConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        services: {},
        service: {
          authToken: 'test-token',
        },
      });
      
      const client = getUserManagementClient();
      
      expect(client).toBeDefined();
    });
  });
});




/**
 * Unit tests for UserManagementClient
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserManagementClient, getUserManagementClient } from '../../../src/services/UserManagementClient';
import { getConfig } from '../../../src/config';

vi.mock('../../../src/config', () => ({
  getConfig: vi.fn(),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: { warn: vi.fn(), error: vi.fn() },
}));

describe('UserManagementClient', () => {
  let client: UserManagementClient;
  const mockGet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConfig).mockReturnValue({
      services: { user_management: { url: 'http://user-mgmt:3000' } },
    } as any);
    client = new UserManagementClient();
    (client as any).serviceClient = { get: mockGet };
  });

  describe('getUserRoles', () => {
    it('returns roles from service when successful', async () => {
      mockGet.mockResolvedValue({
        data: {
          userId: 'u1',
          organizationId: 'org1',
          roles: [{ id: 'r1', name: 'Admin', permissions: ['read', 'write'] }],
          isSuperAdmin: false,
        },
      });
      const result = await client.getUserRoles('u1');
      expect(result.userId).toBe('u1');
      expect(result.roles).toHaveLength(1);
      expect(result.roles[0].permissions).toContain('read');
    });

    it('returns default response on 404', async () => {
      mockGet.mockRejectedValue({ response: { status: 404 } });
      const result = await client.getUserRoles('unknown');
      expect(result.userId).toBe('unknown');
      expect(result.roles).toEqual([]);
      expect(result.isSuperAdmin).toBe(false);
    });

    it('returns default response on error', async () => {
      mockGet.mockRejectedValue(new Error('network'));
      const result = await client.getUserRoles('u1');
      expect(result.userId).toBe('u1');
      expect(result.roles).toEqual([]);
    });
  });

  describe('getOrganizationUserRoles', () => {
    it('returns org roles when fetch succeeds', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              userId: 'u1',
              organizationId: 'org1',
              roles: [{ id: 'r1', name: 'Member', permissions: ['read'] }],
              isOrgAdmin: false,
            },
          }),
      });
      const result = await client.getOrganizationUserRoles('u1', 'org1');
      expect(result.userId).toBe('u1');
      expect(result.organizationId).toBe('org1');
      expect(result.roles).toHaveLength(1);
      global.fetch = originalFetch;
    });

    it('returns default on 404', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
      const result = await client.getOrganizationUserRoles('u1', 'org1');
      expect(result.roles).toEqual([]);
      expect(result.isOrgAdmin).toBe(false);
      global.fetch = originalFetch;
    });
  });

  describe('hasPermission', () => {
    it('returns true when user is super admin', async () => {
      vi.spyOn(client, 'getUserRoles').mockResolvedValue({
        userId: 'u1',
        roles: [],
        isSuperAdmin: true,
      });
      const result = await client.hasPermission('u1', 'any.permission');
      expect(result).toBe(true);
    });

    it('returns true when role has permission', async () => {
      vi.spyOn(client, 'getUserRoles').mockResolvedValue({
        userId: 'u1',
        roles: [{ id: 'r1', name: 'Admin', permissions: ['logs.read'] }],
        isSuperAdmin: false,
      });
      const result = await client.hasPermission('u1', 'logs.read');
      expect(result).toBe(true);
    });

    it('returns false when no matching permission', async () => {
      vi.spyOn(client, 'getUserRoles').mockResolvedValue({
        userId: 'u1',
        roles: [{ id: 'r1', name: 'Viewer', permissions: ['logs.read'] }],
        isSuperAdmin: false,
      });
      const result = await client.hasPermission('u1', 'logs.write');
      expect(result).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('returns ok when service responds', async () => {
      mockGet.mockResolvedValue(undefined);
      const result = await client.healthCheck();
      expect(result.status).toBe('ok');
      expect(result.latency_ms).toBeDefined();
    });

    it('returns error when service fails', async () => {
      mockGet.mockRejectedValue(new Error('unavailable'));
      const result = await client.healthCheck();
      expect(result.status).toBe('error');
      expect(result.message).toBeDefined();
    });
  });

  describe('getUserManagementClient', () => {
    it('returns singleton instance', () => {
      const a = getUserManagementClient();
      const b = getUserManagementClient();
      expect(a).toBe(b);
    });
  });
});

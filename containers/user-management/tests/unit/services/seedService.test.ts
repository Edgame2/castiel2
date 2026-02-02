/**
 * Unit tests for seedService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as seedService from '../../../src/services/seedService';
import { getDatabaseClient } from '@coder/shared';
import { log } from '../../../src/utils/logger';

const mockPermissionUpsert = vi.fn().mockResolvedValue({});
const mockOrgFindUnique = vi.fn();
const mockPermissionFindMany = vi.fn();
const mockRoleUpsert = vi.fn();
const mockRolePermissionDeleteMany = vi.fn().mockResolvedValue(undefined);
const mockRolePermissionCreateMany = vi.fn().mockResolvedValue(undefined);

vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockGetDatabaseClient = vi.mocked(getDatabaseClient);

describe('seedService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionUpsert.mockResolvedValue({});
    mockGetDatabaseClient.mockReturnValue({
      permission: { upsert: mockPermissionUpsert, findMany: mockPermissionFindMany },
      organization: { findUnique: mockOrgFindUnique },
      role: { upsert: mockRoleUpsert },
      rolePermission: { deleteMany: mockRolePermissionDeleteMany, createMany: mockRolePermissionCreateMany },
    } as any);
  });

  describe('seedSystemPermissions', () => {
    it('calls permission.upsert for each system permission and logs', async () => {
      await seedService.seedSystemPermissions();

      expect(mockPermissionUpsert).toHaveBeenCalled();
      expect(log.info).toHaveBeenCalledWith('Seeding system permissions', expect.objectContaining({ service: 'user-management' }));
      expect(log.info).toHaveBeenCalledWith(
        expect.stringMatching(/Seeded \d+ system permissions/),
        expect.objectContaining({ service: 'user-management' })
      );
    });
  });

  describe('seedOrganizationRoles', () => {
    it('throws when organization not found', async () => {
      mockOrgFindUnique.mockResolvedValue(null);

      await expect(seedService.seedOrganizationRoles('org-1')).rejects.toThrow('Organization org-1 not found');

      expect(mockOrgFindUnique).toHaveBeenCalledWith({ where: { id: 'org-1' } });
    });

    it('seeds roles and assigns permissions when organization exists', async () => {
      mockOrgFindUnique.mockResolvedValue({ name: 'Test Org' });
      mockPermissionFindMany.mockResolvedValue(
        Array.from({ length: 17 }, (_, i) => ({ id: `perm-${i}`, code: `code.${i}` }))
      );
      mockRoleUpsert
        .mockResolvedValueOnce({ id: 'role-super', name: 'Super Admin' })
        .mockResolvedValueOnce({ id: 'role-admin', name: 'Admin' })
        .mockResolvedValueOnce({ id: 'role-member', name: 'Member' })
        .mockResolvedValueOnce({ id: 'role-viewer', name: 'Viewer' });

      await seedService.seedOrganizationRoles('org-1');

      expect(mockOrgFindUnique).toHaveBeenCalledWith({ where: { id: 'org-1' } });
      expect(mockPermissionFindMany).toHaveBeenCalled();
      expect(mockRoleUpsert).toHaveBeenCalledTimes(4);
      expect(log.info).toHaveBeenCalledWith(
        'Seeding roles for organization',
        expect.objectContaining({ organizationId: 'org-1', organizationName: 'Test Org', service: 'user-management' })
      );
    });
  });
});

/**
 * OrganizationService unit tests (Super Admin admin orgs).
 * Tests listAllOrganizationsForSuperAdmin and getOrganizationForSuperAdmin.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import {
  listAllOrganizationsForSuperAdmin,
  getOrganizationForSuperAdmin,
} from '../../../src/services/OrganizationService';

vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(),
}));

describe('OrganizationService (Super Admin)', () => {
  const superAdminUserId = 'user-super-admin';
  const orgId = 'org-1';

  let mockDb: {
    organization: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
    organizationMembership: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      organization: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      organizationMembership: {
        findMany: vi.fn(),
      },
    };
    (getDatabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  });

  describe('listAllOrganizationsForSuperAdmin', () => {
    it('throws when user does not have Super Admin in any org', async () => {
      mockDb.organizationMembership.findMany.mockResolvedValue([]);

      await expect(listAllOrganizationsForSuperAdmin(superAdminUserId)).rejects.toThrow(
        'Permission denied. Super Admin role required to list all organizations.'
      );
      expect(mockDb.organization.findMany).not.toHaveBeenCalled();
    });

    it('returns mapped list when user has Super Admin', async () => {
      mockDb.organizationMembership.findMany.mockResolvedValue([
        { role: { isSuperAdmin: true } },
      ]);
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      mockDb.organization.findMany.mockResolvedValue([
        {
          id: orgId,
          name: 'Org One',
          slug: 'org-one',
          description: 'Desc',
          createdAt,
          isActive: true,
        },
      ]);

      const result = await listAllOrganizationsForSuperAdmin(superAdminUserId);

      expect(mockDb.organization.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          createdAt: true,
          isActive: true,
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: orgId,
        name: 'Org One',
        slug: 'org-one',
        description: 'Desc',
        createdAt: '2025-01-01T00:00:00.000Z',
        isActive: true,
      });
    });
  });

  describe('getOrganizationForSuperAdmin', () => {
    it('throws when user does not have Super Admin', async () => {
      mockDb.organizationMembership.findMany.mockResolvedValue([]);

      await expect(
        getOrganizationForSuperAdmin(orgId, superAdminUserId)
      ).rejects.toThrow('Permission denied. Super Admin role required.');
      expect(mockDb.organization.findUnique).not.toHaveBeenCalled();
    });

    it('returns null when organization not found', async () => {
      mockDb.organizationMembership.findMany.mockResolvedValue([
        { role: { isSuperAdmin: true } },
      ]);
      mockDb.organization.findUnique.mockResolvedValue(null);

      const result = await getOrganizationForSuperAdmin(orgId, superAdminUserId);

      expect(result).toBeNull();
      expect(mockDb.organization.findUnique).toHaveBeenCalledWith({
        where: { id: orgId },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          createdAt: true,
          isActive: true,
          ownerUserId: true,
          memberLimit: true,
        },
      });
    });

    it('returns organization when found and user is Super Admin', async () => {
      mockDb.organizationMembership.findMany.mockResolvedValue([
        { role: { isSuperAdmin: true } },
      ]);
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      mockDb.organization.findUnique.mockResolvedValue({
        id: orgId,
        name: 'Org One',
        slug: 'org-one',
        description: 'Desc',
        createdAt,
        isActive: true,
        ownerUserId: 'owner-1',
        memberLimit: 500,
      });

      const result = await getOrganizationForSuperAdmin(orgId, superAdminUserId);

      expect(result).toEqual({
        id: orgId,
        name: 'Org One',
        slug: 'org-one',
        description: 'Desc',
        createdAt: '2025-01-01T00:00:00.000Z',
        isActive: true,
        ownerUserId: 'owner-1',
        memberLimit: 500,
      });
    });
  });
});

/**
 * RoleService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { listRoles, getRole } from '../../../src/services/RoleService';

vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(),
}));

describe('RoleService', () => {
  let mockDb: {
    role: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      role: { findMany: vi.fn(), findUnique: vi.fn() },
    };
    (getDatabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  });

  describe('listRoles', () => {
    it('returns roles for organization', async () => {
      mockDb.role.findMany.mockResolvedValue([
        {
          id: 'role-1',
          name: 'Admin',
          organizationId: 'org-1',
          isSuperAdmin: false,
          permissions: [],
          memberships: [],
          description: null,
          isSystemRole: false,
          isCustomRole: true,
          createdByUserId: null,
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'role-2',
          name: 'Member',
          organizationId: 'org-1',
          isSuperAdmin: false,
          permissions: [],
          memberships: [],
          description: null,
          isSystemRole: false,
          isCustomRole: true,
          createdByUserId: null,
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await listRoles('org-1');

      expect(mockDb.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-1' }) })
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('getRole', () => {
    it('returns role when found', async () => {
      mockDb.role.findUnique.mockResolvedValue({
        id: 'role-1',
        name: 'Admin',
        organizationId: 'org-1',
        isSuperAdmin: false,
        permissions: [],
        memberships: [],
        description: null,
        isSystemRole: false,
        isCustomRole: true,
        createdByUserId: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getRole('org-1', 'role-1');

      expect(mockDb.role.findUnique).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.id).toBe('role-1');
    });

    it('returns null when role not found', async () => {
      mockDb.role.findUnique.mockResolvedValue(null);

      const result = await getRole('org-1', 'missing');

      expect(result).toBeNull();
    });
  });
});

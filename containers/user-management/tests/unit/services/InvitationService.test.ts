/**
 * InvitationService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { listInvitations } from '../../../src/services/InvitationService';

vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(),
}));

describe('InvitationService', () => {
  let mockDb: {
    invitation: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
    organizationMembership: { findFirst: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      invitation: { findMany: vi.fn(), create: vi.fn() },
      organizationMembership: { findFirst: vi.fn() },
    };
    (getDatabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  });

  describe('listInvitations', () => {
    it('returns invitations for organization', async () => {
      mockDb.invitation.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          email: 'a@b.com',
          organizationId: 'org-1',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          token: 't',
          roleId: 'role-1',
          invitedByUserId: 'user-1',
          message: null,
          expiresAt: null,
          acceptedAt: null,
          resendCount: 0,
          lastResentAt: null,
          cancelledAt: null,
          invitedUserId: null,
          organization: { id: 'org-1', name: 'Org', slug: 'org' },
          role: { id: 'role-1', name: 'Member' },
          inviter: { id: 'user-1', email: 'u@b.com', name: 'U' },
        },
      ]);

      const result = await listInvitations('org-1', {});

      expect(mockDb.invitation.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('a@b.com');
    });
  });
});

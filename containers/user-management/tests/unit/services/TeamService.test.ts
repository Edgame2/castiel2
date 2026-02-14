/**
 * TeamService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { getTeam, createTeam } from '../../../src/services/TeamService';

vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(),
}));

describe('TeamService', () => {
  let mockDb: {
    team: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
    membership: { findFirst: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      team: { findUnique: vi.fn(), create: vi.fn() },
      membership: { findFirst: vi.fn() },
    };
    (getDatabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  });

  describe('getTeam', () => {
    it('returns team when found and user is member', async () => {
      const teamId = 'team-1';
      mockDb.team.findUnique.mockResolvedValue({
        id: teamId,
        name: 'Team One',
        tenantId: 'tenant-1',
        createdAt: new Date('2025-01-01'),
        members: [{ userId: 'user-1' }],
      });

      const result = await getTeam(teamId, 'user-1');

      expect(mockDb.team.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: teamId } })
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe(teamId);
    });

    it('returns null when team not found', async () => {
      mockDb.team.findUnique.mockResolvedValue(null);

      const result = await getTeam('missing', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('createTeam', () => {
    it('creates team when user is tenant member', async () => {
      mockDb.membership.findFirst.mockResolvedValue({ id: 'mem-1' });
      mockDb.team.create.mockResolvedValue({
        id: 'team-new',
        name: 'New Team',
        tenantId: 'tenant-1',
        createdAt: new Date(),
      });

      const result = await createTeam('tenant-1', 'user-1', 'New Team');

      expect(mockDb.team.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.name).toBe('New Team');
    });
  });
});

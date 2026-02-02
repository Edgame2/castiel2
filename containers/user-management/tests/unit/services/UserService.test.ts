/**
 * UserService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { getUserProfile } from '../../../src/services/UserService';

vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(),
}));

describe('UserService', () => {
  let mockDb: { user: { findUnique: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      user: {
        findUnique: vi.fn(),
      },
    };
    (getDatabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  });

  describe('getUserProfile', () => {
    it('returns user profile when user exists', async () => {
      const userId = 'user-1';
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'u@example.com',
        name: 'User One',
        firstName: 'User',
        lastName: 'One',
        phoneNumber: null,
        avatarUrl: null,
        picture: null,
        function: null,
        speciality: null,
        timezone: null,
        language: null,
        isEmailVerified: true,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        authProviders: [],
      });

      const result = await getUserProfile(userId);

      expect(mockDb.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: userId } })
      );
      expect(result.id).toBe(userId);
      expect(result.email).toBe('u@example.com');
      expect(result.name).toBe('User One');
    });

    it('throws when user not found', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      await expect(getUserProfile('missing')).rejects.toThrow('User not found');
    });
  });
});

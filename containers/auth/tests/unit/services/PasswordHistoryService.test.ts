/**
 * Password History Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { isPasswordInHistory, addPasswordToHistory } from '../../../src/services/PasswordHistoryService';

vi.mock('@coder/shared', () => ({ getDatabaseClient: vi.fn() }));
vi.mock('../../../src/utils/passwordUtils', () => ({
  verifyPassword: vi.fn().mockResolvedValue(false),
}));

describe('PasswordHistoryService', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      passwordHistory: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb);
  });

  describe('isPasswordInHistory', () => {
    it('should return false when history empty', async () => {
      const result = await isPasswordInHistory('user-1', 'newPassword');
      expect(result).toBe(false);
    });

    it('should return true when verifyPassword matches', async () => {
      const { verifyPassword } = await import('../../../src/utils/passwordUtils');
      mockDb.passwordHistory.findMany.mockResolvedValueOnce([{ passwordHash: 'hash1' }]);
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);
      const result = await isPasswordInHistory('user-1', 'samePassword');
      expect(result).toBe(true);
    });
  });

  describe('addPasswordToHistory', () => {
    it('should create history entry', async () => {
      await addPasswordToHistory('user-1', 'hashedPassword');
      expect(mockDb.passwordHistory.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', passwordHash: 'hashedPassword' },
      });
    });
  });
});

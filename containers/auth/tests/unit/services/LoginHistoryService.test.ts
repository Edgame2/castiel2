/**
 * Login History Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { recordLoginAttempt, getUserLoginHistory } from '../../../src/services/LoginHistoryService';

vi.mock('@coder/shared', () => ({ getDatabaseClient: vi.fn() }));

describe('LoginHistoryService', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      userLoginHistory: {
        create: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb);
  });

  describe('recordLoginAttempt', () => {
    it('should create login history entry', async () => {
      await recordLoginAttempt(
        'user-1',
        'sess-1',
        'password',
        '127.0.0.1',
        'Mozilla',
        null,
        null,
        null,
        true
      );
      expect(mockDb.userLoginHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'user-1', provider: 'password', success: true }),
      });
    });
  });

  describe('getUserLoginHistory', () => {
    it('should return loginHistory and total', async () => {
      mockDb.userLoginHistory.findMany.mockResolvedValueOnce([]);
      mockDb.userLoginHistory.count.mockResolvedValueOnce(0);
      const result = await getUserLoginHistory('user-1');
      expect(result.loginHistory).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});

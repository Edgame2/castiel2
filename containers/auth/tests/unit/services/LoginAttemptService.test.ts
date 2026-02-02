/**
 * Login Attempt Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { recordLoginAttempt, isAccountLocked, getFailedAttemptsCount } from '../../../src/services/LoginAttemptService';

vi.mock('@coder/shared', () => ({ getDatabaseClient: vi.fn() }));
vi.mock('../../../src/utils/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
  },
  default: {},
}));
vi.mock('../../../src/utils/cacheKeys', () => ({
  cacheKeys: { loginAttempts: (id: string) => `login:attempts:${id}` },
}));
vi.mock('../../../src/utils/logger', () => ({
  log: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe('LoginAttemptService', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      loginAttempt: { create: vi.fn().mockResolvedValue({}) },
      user: {
        update: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn().mockResolvedValue({ failedLoginAttempts: 0, lockedUntil: null }),
      },
    };
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb);
  });

  describe('recordLoginAttempt', () => {
    it('should create login attempt record', async () => {
      await recordLoginAttempt('user@example.com', 'user-1', '127.0.0.1', 'Mozilla', true);
      expect(mockDb.loginAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: 'user@example.com', success: true }),
      });
    });
  });

  describe('isAccountLocked', () => {
    it('should return false when user has no lock', async () => {
      mockDb.user.findUnique.mockResolvedValueOnce(null);
      const result = await isAccountLocked('user@example.com');
      expect(result).toBe(false);
    });

    it('should return true when lockedUntil is in future', async () => {
      const future = new Date(Date.now() + 60000);
      mockDb.user.findUnique.mockResolvedValueOnce({ id: 'user-1', lockedUntil: future });
      const result = await isAccountLocked('user@example.com');
      expect(result).toBe(true);
    });
  });

  describe('getFailedAttemptsCount', () => {
    it('should return 0 when no failures', async () => {
      const count = await getFailedAttemptsCount('user@example.com');
      expect(count).toBe(0);
    });
  });
});

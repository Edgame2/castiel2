/**
 * Account Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { AccountService, getAccountService } from '../../../src/services/AccountService';

vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(),
}));

describe('AccountService', () => {
  let service: AccountService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      account: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'acc-1', userId: 'u1', handle: 'alice' }),
      },
    };
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb);
    service = new AccountService();
  });

  describe('createUserAccount', () => {
    it('should return existing account if already exists', async () => {
      mockDb.account.findUnique.mockResolvedValueOnce({ id: 'existing', userId: 'u1' });
      const result = await service.createUserAccount('u1', 'alice', 'Alice', undefined, undefined);
      expect(result).toEqual({ id: 'existing', userId: 'u1' });
      expect(mockDb.account.create).not.toHaveBeenCalled();
    });

    it('should return null if handle already taken', async () => {
      mockDb.account.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'other', handle: 'alice' });
      const result = await service.createUserAccount('u1', 'alice', 'Alice');
      expect(result).toBeNull();
      expect(mockDb.account.create).not.toHaveBeenCalled();
    });

    it('should create account and return it', async () => {
      const created = { id: 'acc-1', userId: 'u1', handle: 'alice', displayName: 'Alice' };
      mockDb.account.create.mockResolvedValueOnce(created);
      const result = await service.createUserAccount('u1', 'alice', 'Alice');
      expect(mockDb.account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'u1', handle: 'alice', displayName: 'Alice' }),
      });
      expect(result).toEqual(created);
    });

    it('should return null on create failure', async () => {
      mockDb.account.create.mockRejectedValueOnce(new Error('db error'));
      const result = await service.createUserAccount('u1', 'alice', 'Alice');
      expect(result).toBeNull();
    });
  });
});

describe('getAccountService', () => {
  it('should return singleton instance', () => {
    vi.mocked(getDatabaseClient).mockReturnValue({ account: { findUnique: vi.fn(), create: vi.fn() } } as any);
    const a = getAccountService();
    const b = getAccountService();
    expect(a).toBe(b);
  });
});

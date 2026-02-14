/**
 * Password Policy Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { getPasswordPolicy, validatePassword } from '../../../src/services/PasswordPolicyService';

vi.mock('@coder/shared', () => ({ getDatabaseClient: vi.fn() }));
vi.mock('../../../src/services/PasswordHistoryService', () => ({
  isPasswordInHistory: vi.fn().mockResolvedValue(false),
}));

describe('PasswordPolicyService', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      tenant: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb);
  });

  describe('getPasswordPolicy', () => {
    it('should return default policy when tenantId null', async () => {
      const policy = await getPasswordPolicy(null);
      expect(policy.minLength).toBe(12);
      expect(policy.requireUppercase).toBe(true);
      expect(policy.requireLowercase).toBe(true);
      expect(policy.requireNumbers).toBe(true);
      expect(policy.requireSpecial).toBe(true);
      expect(policy.passwordHistoryCount).toBe(5);
    });

    it('should return default when tenant not found', async () => {
      const policy = await getPasswordPolicy('tenant-1');
      expect(policy.minLength).toBe(12);
    });

    it('should return tenant policy when tenant exists', async () => {
      mockDb.tenant.findUnique.mockResolvedValueOnce({
        passwordMinLength: 10,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        passwordRequireSpecial: true,
        passwordHistoryCount: 3,
        passwordExpiryDays: null,
      });
      const policy = await getPasswordPolicy('tenant-1');
      expect(policy.minLength).toBe(10);
      expect(policy.passwordHistoryCount).toBe(3);
    });
  });

  describe('validatePassword', () => {
    it('should return errors for short password', async () => {
      const result = await validatePassword('short', 'user-1', null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return valid for strong password', async () => {
      const result = await validatePassword('StrongPass1!', 'user-1', null);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});

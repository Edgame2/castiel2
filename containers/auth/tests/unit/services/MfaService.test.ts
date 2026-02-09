/**
 * MfaService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { MfaService } from '../../../src/services/MfaService';

vi.mock('@coder/shared/database', () => ({ getContainer: vi.fn() }));
vi.mock('otplib', () => ({
  generateSecret: vi.fn(() => 'MOCKED_SECRET_BASE32'),
  verify: vi.fn((opts: { secret: string; token: string }) => opts.token === 'valid123' && !!opts.secret),
}));
vi.mock('../../../src/config/index.js', () => ({
  loadConfig: vi.fn(() => ({
    cosmos_db: { containers: { mfa_secrets: 'auth_mfa_secrets', mfa_backup_codes: 'auth_mfa_backup_codes' } },
  })),
}));
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('mockHash'),
  compare: vi.fn().mockResolvedValue(true),
}));
vi.mock('../../../src/utils/logger.js', () => ({ log: { info: vi.fn() } }));

describe('MfaService', () => {
  let mockContainer: {
    item: ReturnType<typeof vi.fn>;
    items: { create: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const mockItem = {
      read: vi.fn(),
      delete: vi.fn(),
    };
    mockContainer = {
      item: vi.fn(() => mockItem),
      items: { create: vi.fn().mockResolvedValue(undefined), upsert: vi.fn().mockResolvedValue(undefined) },
    };
    vi.mocked(getContainer).mockReturnValue(mockContainer as any);
  });

  describe('enroll', () => {
    it('returns secret and provisioningUri when user not enrolled', async () => {
      mockContainer.item().read.mockResolvedValueOnce({ resource: null });
      const service = new MfaService();
      const result = await service.enroll('user-1');
      expect(result.secret).toBeDefined();
      expect(result.provisioningUri).toMatch(/^otpauth:\/\/totp\//);
      expect(result.provisioningUri).toContain('secret=');
      expect(mockContainer.items.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          userId: 'user-1',
          secret: result.secret,
        }),
        expect.any(Object)
      );
    });

    it('uses optional issuer and accountName in provisioningUri and label', async () => {
      mockContainer.item().read.mockResolvedValueOnce({ resource: null });
      const service = new MfaService();
      const result = await service.enroll('user-1', 'MyApp', 'user@example.com');
      expect(result.provisioningUri).toContain(encodeURIComponent('MyApp:user@example.com'));
      expect(result.provisioningUri).toContain('issuer=MyApp');
      expect(result.label).toBe('MyApp (user@example.com)');
    });

    it('throws MFA_ALREADY_ENROLLED when user already has secret', async () => {
      mockContainer.item().read.mockResolvedValueOnce({
        resource: { id: 'user-1', userId: 'user-1', secret: 'existing', createdAt: '', updatedAt: '' },
      });
      const service = new MfaService();
      await expect(service.enroll('user-1')).rejects.toThrow('MFA_ALREADY_ENROLLED');
      expect(mockContainer.items.create).not.toHaveBeenCalled();
    });
  });

  describe('verify', () => {
    it('returns false for token shorter than 6 characters', async () => {
      const service = new MfaService();
      expect(await service.verify('user-1', '12345')).toBe(false);
      expect(await service.verify('user-1', '')).toBe(false);
      expect(mockContainer.item().read).not.toHaveBeenCalled();
    });

    it('returns false when no secret exists for user', async () => {
      mockContainer.item().read.mockResolvedValueOnce({ resource: null });
      const service = new MfaService();
      expect(await service.verify('user-1', '123456')).toBe(false);
    });

    it('returns true when verify accepts the token', async () => {
      mockContainer.item().read.mockResolvedValueOnce({
        resource: { id: 'user-1', userId: 'user-1', secret: 'stored-secret', createdAt: '', updatedAt: '' },
      });
      const service = new MfaService();
      expect(await service.verify('user-1', 'valid123')).toBe(true);
    });

    it('returns false when verify rejects the token', async () => {
      mockContainer.item().read.mockResolvedValueOnce({
        resource: { id: 'user-1', userId: 'user-1', secret: 'stored-secret', createdAt: '', updatedAt: '' },
      });
      const service = new MfaService();
      expect(await service.verify('user-1', '000000')).toBe(false);
    });
  });

  describe('isEnrolled', () => {
    it('returns true when user has secret', async () => {
      mockContainer.item().read.mockResolvedValueOnce({
        resource: { id: 'user-1', userId: 'user-1', secret: 'x', createdAt: '', updatedAt: '' },
      });
      const service = new MfaService();
      expect(await service.isEnrolled('user-1')).toBe(true);
    });

    it('returns false when user has no secret', async () => {
      mockContainer.item().read.mockResolvedValueOnce({ resource: null });
      const service = new MfaService();
      expect(await service.isEnrolled('user-1')).toBe(false);
    });
  });

  describe('disable', () => {
    it('calls container item delete', async () => {
      const mockItem = mockContainer.item();
      mockItem.delete.mockResolvedValueOnce(undefined);
      const service = new MfaService();
      await service.disable('user-1');
      expect(mockContainer.item).toHaveBeenCalledWith('user-1', 'user-1');
      expect(mockItem.delete).toHaveBeenCalled();
    });
  });

  describe('verifyBackupCode', () => {
    it('returns true and marks code used when backup code matches', async () => {
      mockContainer.item().read.mockResolvedValueOnce({
        resource: {
          id: 'user-1',
          userId: 'user-1',
          backupCodes: [{ hash: 'storedHash' }],
          updatedAt: new Date().toISOString(),
        },
      });
      const service = new MfaService();
      const result = await service.verifyBackupCode('user-1', '  ABC12345  ');
      expect(result).toBe(true);
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          backupCodes: expect.arrayContaining([expect.objectContaining({ usedAt: expect.any(String) })]),
        }),
        expect.any(Object)
      );
    });

    it('returns false when no backup codes doc', async () => {
      mockContainer.item().read.mockResolvedValueOnce({ resource: null });
      const service = new MfaService();
      expect(await service.verifyBackupCode('user-1', 'ABCD1234')).toBe(false);
    });

    it('returns false when code too short', async () => {
      const service = new MfaService();
      expect(await service.verifyBackupCode('user-1', 'short')).toBe(false);
      expect(mockContainer.item().read).not.toHaveBeenCalled();
    });
  });
});

/**
 * Unit tests for Expiration Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpirationManager } from '../../../../src/services/lifecycle/ExpirationManager';

vi.mock('../../../../src/services/events/SecretEventPublisher', () => ({
  publishSecretEvent: vi.fn().mockResolvedValue(undefined),
  SecretEvents: {
    secretExpiringSoon: (d: Record<string, unknown>) => ({ type: 'secret.expiring_soon', ...d }),
    secretExpired: (d: Record<string, unknown>) => ({ type: 'secret.expired', ...d }),
  },
}));
vi.mock('../../../../src/services/logging/LoggingClient', () => ({
  getLoggingClient: vi.fn(() => ({ sendLog: vi.fn().mockResolvedValue(undefined) })),
}));
const mockDb = {
  secret_secrets: {
    findMany: vi.fn(),
  },
};
vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(() => mockDb),
}));

describe('ExpirationManager', () => {
  let expirationManager: ExpirationManager;

  beforeEach(() => {
    vi.clearAllMocks();
    expirationManager = new ExpirationManager();
  });

  describe('isExpired', () => {
    it('should return true if expiresAt is in the past', () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      expect(expirationManager.isExpired(expiredDate)).toBe(true);
    });

    it('should return false if expiresAt is in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      expect(expirationManager.isExpired(futureDate)).toBe(false);
    });

    it('should return false if expiresAt is null', () => {
      expect(expirationManager.isExpired(null)).toBe(false);
    });
  });

  describe('checkExpirations', () => {
    it('should return counts for expiring and expired secrets', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      const expiredSecrets = [
        { id: 's1', name: 'secret-1', expiresAt: expiredDate },
        { id: 's2', name: 'secret-2', expiresAt: expiredDate },
      ];
      const expiredDetails = [
        { id: 's1', name: 'secret-1', scope: 'ORGANIZATION', organizationId: 'org-1' },
        { id: 's2', name: 'secret-2', scope: 'ORGANIZATION', organizationId: 'org-1' },
      ];
      mockDb.secret_secrets.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(expiredSecrets)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(expiredDetails);

      const result = await expirationManager.checkExpirations();

      expect(result.checked).toBe(2);
      expect(result.expired).toBe(2);
      expect(result.secretsExpired).toHaveLength(2);
    });
  });
});



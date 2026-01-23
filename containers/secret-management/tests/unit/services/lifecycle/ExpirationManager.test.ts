/**
 * Unit tests for Expiration Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpirationManager } from '../../../../src/services/lifecycle/ExpirationManager';
import { SecretService } from '../../../../src/services/SecretService';
import { SecretExpiredError } from '../../../../src/errors/SecretErrors';

// Mock dependencies
vi.mock('../../../../src/services/SecretService');
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      secret_secrets: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
    })),
  };
});

describe('ExpirationManager', () => {
  let expirationManager: ExpirationManager;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    expirationManager = new ExpirationManager();
    mockDb = (expirationManager as any).db;
  });

  describe('checkExpiration', () => {
    it('should throw SecretExpiredError if secret is expired', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Expired yesterday
      
      const mockSecret = {
        id: 'secret-1',
        name: 'test-secret',
        expiresAt: expiredDate,
      };
      
      const mockSecretService = (expirationManager as any).secretService;
      mockSecretService.getSecret = vi.fn().mockResolvedValue(mockSecret);
      
      await expect(
        expirationManager.checkExpiration('secret-1')
      ).rejects.toThrow(SecretExpiredError);
    });

    it('should not throw if secret is not expired', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // Expires in 30 days
      
      const mockSecret = {
        id: 'secret-1',
        name: 'test-secret',
        expiresAt: futureDate,
      };
      
      const mockSecretService = (expirationManager as any).secretService;
      mockSecretService.getSecret = vi.fn().mockResolvedValue(mockSecret);
      
      await expect(
        expirationManager.checkExpiration('secret-1')
      ).resolves.not.toThrow();
    });
  });

  describe('processExpiredSecrets', () => {
    it('should process expired secrets', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      
      const mockExpiredSecrets = [
        {
          id: 'secret-1',
          name: 'secret-1',
          expiresAt: expiredDate,
        },
        {
          id: 'secret-2',
          name: 'secret-2',
          expiresAt: expiredDate,
        },
      ];
      
      mockDb.secret_secrets.findMany.mockResolvedValue(mockExpiredSecrets);
      mockDb.secret_secrets.update.mockResolvedValue({});
      
      const result = await expirationManager.processExpiredSecrets();
      
      expect(result.processed).toBe(2);
      expect(mockDb.secret_secrets.update).toHaveBeenCalledTimes(2);
    });
  });
});



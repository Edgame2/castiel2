/**
 * Unit tests for Access Grant Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccessGrantService } from '../../../../src/services/access/AccessGrantService';
import { GrantNotFoundError } from '../../../../src/errors/SecretErrors';

// Mock dependencies
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      secret_access_grants: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    })),
  };
});

describe('AccessGrantService', () => {
  let grantService: AccessGrantService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    grantService = new AccessGrantService();
    mockDb = (grantService as any).db;
  });

  describe('createGrant', () => {
    it('should create an access grant successfully', async () => {
      const mockGrant = {
        id: 'grant-1',
        secretId: 'secret-1',
        granteeType: 'USER',
        granteeId: 'user-123',
        permissions: ['READ'],
        expiresAt: null,
        createdAt: new Date(),
      };
      
      mockDb.secret_access_grants.create.mockResolvedValue(mockGrant);
      
      const result = await grantService.createGrant({
        secretId: 'secret-1',
        granteeType: 'USER',
        granteeId: 'user-123',
        permissions: ['READ'],
      }, 'actor-123');
      
      expect(result).toBeDefined();
      expect(result.id).toBe('grant-1');
    });
  });

  describe('getGrant', () => {
    it('should retrieve an access grant', async () => {
      const mockGrant = {
        id: 'grant-1',
        secretId: 'secret-1',
        granteeType: 'USER',
        granteeId: 'user-123',
        permissions: ['READ'],
      };
      
      mockDb.secret_access_grants.findUnique.mockResolvedValue(mockGrant);
      
      const result = await grantService.getGrant('grant-1');
      
      expect(result).toBeDefined();
      expect(result.id).toBe('grant-1');
    });

    it('should throw GrantNotFoundError if grant does not exist', async () => {
      mockDb.secret_access_grants.findUnique.mockResolvedValue(null);
      
      await expect(
        grantService.getGrant('non-existent')
      ).rejects.toThrow(GrantNotFoundError);
    });
  });

  describe('revokeGrant', () => {
    it('should revoke an access grant', async () => {
      const mockGrant = {
        id: 'grant-1',
        secretId: 'secret-1',
      };
      
      mockDb.secret_access_grants.findUnique.mockResolvedValue(mockGrant);
      mockDb.secret_access_grants.delete.mockResolvedValue({});
      
      await grantService.revokeGrant('grant-1', 'actor-123');
      
      expect(mockDb.secret_access_grants.delete).toHaveBeenCalled();
    });
  });
});



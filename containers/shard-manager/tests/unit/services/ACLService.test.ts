/**
 * ACLService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ACLService } from '../../../src/services/ACLService';
import { ShardService } from '../../../src/services/ShardService';
import { PermissionLevel } from '../../../src/types/shard.types';

describe('ACLService', () => {
  let service: ACLService;
  let mockFindById: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById = vi.fn().mockResolvedValue(null);
    const shardService = { findById: mockFindById } as unknown as ShardService;
    service = new ACLService(shardService);
  });

  describe('checkPermission', () => {
    it('returns hasAccess false when shard not found', async () => {
      mockFindById.mockResolvedValue(null);
      const result = await service.checkPermission({
        shardId: 's1',
        tenantId: 't1',
        userId: 'u1',
        requiredPermission: PermissionLevel.READ,
      });
      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Shard not found');
      expect(mockFindById).toHaveBeenCalledWith('s1', 't1');
    });
    it('returns hasAccess true when shard has user with required permission', async () => {
      mockFindById.mockResolvedValue({
        id: 's1',
        tenantId: 't1',
        acl: [
          {
            userId: 'u1',
            permissions: [PermissionLevel.READ, PermissionLevel.WRITE],
            grantedBy: 'admin',
            grantedAt: new Date(),
          },
        ],
      });
      const result = await service.checkPermission({
        shardId: 's1',
        tenantId: 't1',
        userId: 'u1',
        requiredPermission: PermissionLevel.READ,
      });
      expect(result.hasAccess).toBe(true);
      expect(result.grantedPermissions).toContain(PermissionLevel.READ);
    });
  });
});

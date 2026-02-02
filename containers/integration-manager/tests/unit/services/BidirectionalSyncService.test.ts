/**
 * Bidirectional Sync Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared';
import { BidirectionalSyncService } from '../../../src/services/BidirectionalSyncService';

vi.mock('../../../src/utils/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('BidirectionalSyncService', () => {
  let service: BidirectionalSyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: vi.fn().mockResolvedValue({ resource: {} }),
        query: vi.fn(() => ({ fetchNext: vi.fn().mockResolvedValue({ resources: [] }) })),
      },
      item: vi.fn(() => ({ read: vi.fn().mockResolvedValue({ resource: null }), replace: vi.fn(), delete: vi.fn() })),
    } as any);
    service = new BidirectionalSyncService();
  });

  describe('detectConflicts', () => {
    it('should return null when changes are not concurrent', async () => {
      const localShard = {
        id: 's1',
        tenantId: 't1',
        updatedAt: new Date(Date.now() - 120000).toISOString(),
        createdAt: new Date(Date.now() - 300000).toISOString(),
        structuredData: {},
      };
      const remoteRecord = { Id: 'ext-1', LastModifiedDate: new Date(Date.now() - 60000).toISOString() };
      const mapping = { lastModifiedField: 'LastModifiedDate' };
      const result = await service.detectConflicts({
        localShard,
        remoteRecord,
        mapping,
        syncTaskId: 'st1',
        integrationId: 'i1',
        schemaId: 'schema1',
      });
      expect(result).toBeNull();
    });
  });
});

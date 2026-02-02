/**
 * Risk Catalog Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RiskCatalogService } from '../../../src/services/RiskCatalogService';
import { generateServiceToken } from '@coder/shared';

const mockShardManagerClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: unknown, _config: { baseURL?: string }) {
    return mockShardManagerClient;
  }),
  generateServiceToken: vi.fn(() => 'mock-token'),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      shard_manager: { url: 'http://shard-manager:3000' },
    },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../../src/events/publishers/RiskCatalogEventPublisher', () => ({
  publishRiskCatalogEvent: vi.fn(),
}));

describe('RiskCatalogService', () => {
  let service: RiskCatalogService;
  let mockApp: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApp = {};
    service = new RiskCatalogService(mockApp);
  });

  describe('getCatalog', () => {
    it('should return catalog array when shard type exists and shards returned', async () => {
      const tenantId = 'tenant-123';
      const shardTypeId = 'st-1';
      const shardList = { items: [] };
      const globalShard = {
        id: 'shard-1',
        tenantId: 'system',
        structuredData: {
          catalogType: 'global',
          riskId: 'risk-1',
          name: 'Test Risk',
          category: 'financial',
          isActive: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockShardManagerClient.get.mockImplementation((url: string) => {
        if (url?.includes('shard-types')) return Promise.resolve([{ id: shardTypeId, name: 'risk_catalog' }]);
        if (url?.includes('shards')) return Promise.resolve({ items: url?.includes(shardTypeId) ? [globalShard] : [] });
        return Promise.resolve({ items: [] });
      });

      const result = await service.getCatalog(tenantId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
      expect(mockShardManagerClient.get).toHaveBeenCalled();
    });

    it('should return empty array when shard type not found', async () => {
      mockShardManagerClient.get.mockResolvedValue([]);

      const result = await service.getCatalog('tenant-123');

      expect(result).toEqual([]);
    });
  });

  describe('updateRisk', () => {
    it('should update a risk successfully', async () => {
      const riskId = 'risk-123';
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const updates = { name: 'Updated Risk', description: 'Updated description' };
      const shardTypeId = 'st-1';
      const existingShard = {
        id: 'shard-1',
        tenantId,
        structuredData: { riskId, name: 'Original Risk', category: 'financial', catalogType: 'tenant' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedShard = {
        id: existingShard.id,
        tenantId: existingShard.tenantId,
        structuredData: { ...existingShard.structuredData, ...updates, catalogType: 'tenant' },
        createdAt: existingShard.createdAt,
        updatedAt: new Date(),
      };

      mockShardManagerClient.get.mockImplementation((url: string) => {
        if (url?.includes('shard-types')) return Promise.resolve([{ id: shardTypeId, name: 'risk_catalog' }]);
        return Promise.resolve({ items: [existingShard] });
      });
      mockShardManagerClient.put.mockResolvedValue(updatedShard);

      const result = await service.updateRisk(riskId, tenantId, userId, updates);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(updates.name);
      expect(mockShardManagerClient.put).toHaveBeenCalled();
    });

    it('should throw when risk not found', async () => {
      const riskId = 'non-existent';
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const shardTypeId = 'st-1';

      mockShardManagerClient.get.mockImplementation((url: string) => {
        if (url?.includes('shard-types')) return Promise.resolve([{ id: shardTypeId, name: 'risk_catalog' }]);
        return Promise.resolve({ items: [] });
      });

      await expect(service.updateRisk(riskId, tenantId, userId, { name: 'Updated' })).rejects.toThrow();
    });
  });

  describe('deleteRisk', () => {
    it('should delete a risk successfully', async () => {
      const riskId = 'risk-123';
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const shardTypeId = 'st-1';
      const existingShard = {
        id: 'shard-1',
        tenantId,
        structuredData: { riskId, name: 'Test Risk', catalogType: 'tenant' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockShardManagerClient.get.mockImplementation((url: string) => {
        if (url?.includes('shard-types')) return Promise.resolve([{ id: shardTypeId, name: 'risk_catalog' }]);
        return Promise.resolve({ items: [existingShard] });
      });
      mockShardManagerClient.delete.mockResolvedValue(undefined);

      await service.deleteRisk(riskId, tenantId, userId);

      expect(mockShardManagerClient.delete).toHaveBeenCalled();
    });
  });
});

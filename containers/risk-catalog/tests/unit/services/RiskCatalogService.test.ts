/**
 * Risk Catalog Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RiskCatalogService } from '../../../src/services/RiskCatalogService';
import { ServiceClient } from '@coder/shared';
import { generateServiceToken } from '@coder/shared';

// Mock dependencies
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
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
  let mockShardManagerClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockShardManagerClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    (ServiceClient as any).mockImplementation(() => mockShardManagerClient);

    service = new RiskCatalogService();
  });

  describe('getCatalog', () => {
    it('should retrieve catalog successfully', async () => {
      const tenantId = 'tenant-123';
      const catalogType = 'tenant';

      const mockCatalog = {
        id: 'catalog-123',
        tenantId,
        type: catalogType,
        risks: [
          {
            id: 'risk-1',
            name: 'Test Risk',
            category: 'financial',
            enabled: true,
          },
        ],
      };

      mockShardManagerClient.get.mockResolvedValue(mockCatalog);

      const result = await service.getCatalog(tenantId, catalogType);

      expect(result).toEqual(mockCatalog);
      expect(mockShardManagerClient.get).toHaveBeenCalledWith(
        `/api/v1/shards?shardTypeName=risk_catalog&filters=${encodeURIComponent(JSON.stringify({ type: catalogType }))}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-ID': tenantId,
          }),
        })
      );
    });

    it('should handle catalog not found', async () => {
      const tenantId = 'tenant-123';
      const catalogType = 'tenant';

      mockShardManagerClient.get.mockResolvedValue(null);

      const result = await service.getCatalog(tenantId, catalogType);

      expect(result).toBeNull();
    });
  });

  describe('createRisk', () => {
    it('should create a risk successfully', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const input = {
        name: 'New Risk',
        category: 'financial',
        description: 'Test risk description',
        catalogType: 'tenant' as const,
      };

      // Mock shard type exists
      mockShardManagerClient.get.mockResolvedValueOnce([
        { name: 'risk_catalog', id: 'shard-type-123' },
      ]);

      // Mock shard creation
      const mockRisk = {
        id: 'risk-123',
        tenantId,
        userId,
        shardTypeName: 'risk_catalog',
        data: {
          name: input.name,
          category: input.category,
          description: input.description,
          catalogType: input.catalogType,
          enabled: true,
        },
      };

      mockShardManagerClient.post.mockResolvedValue(mockRisk);

      const result = await service.createRisk(tenantId, userId, input);

      expect(result).toHaveProperty('id');
      expect(result.data.name).toBe(input.name);
      expect(mockShardManagerClient.post).toHaveBeenCalled();
    });

    it('should handle errors during risk creation', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const input = {
        name: 'New Risk',
        category: 'financial',
        catalogType: 'tenant' as const,
      };

      mockShardManagerClient.get.mockRejectedValue(new Error('Service unavailable'));

      await expect(
        service.createRisk(tenantId, userId, input)
      ).rejects.toThrow();
    });
  });

  describe('updateRisk', () => {
    it('should update a risk successfully', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const riskId = 'risk-123';
      const input = {
        name: 'Updated Risk',
        description: 'Updated description',
      };

      // Mock existing risk
      mockShardManagerClient.get.mockResolvedValueOnce({
        id: riskId,
        tenantId,
        data: {
          name: 'Original Risk',
          category: 'financial',
        },
      });

      // Mock update
      const updatedRisk = {
        id: riskId,
        tenantId,
        data: {
          ...input,
          category: 'financial',
        },
      };

      mockShardManagerClient.put.mockResolvedValue(updatedRisk);

      const result = await service.updateRisk(tenantId, userId, riskId, input);

      expect(result).toHaveProperty('id');
      expect(result.data.name).toBe(input.name);
      expect(mockShardManagerClient.put).toHaveBeenCalled();
    });

    it('should handle risk not found', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const riskId = 'non-existent';
      const input = {
        name: 'Updated Risk',
      };

      mockShardManagerClient.get.mockResolvedValue(null);

      await expect(
        service.updateRisk(tenantId, userId, riskId, input)
      ).rejects.toThrow();
    });
  });

  describe('deleteRisk', () => {
    it('should delete a risk successfully', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const riskId = 'risk-123';

      // Mock existing risk
      mockShardManagerClient.get.mockResolvedValueOnce({
        id: riskId,
        tenantId,
        data: {
          name: 'Test Risk',
        },
      });

      mockShardManagerClient.delete.mockResolvedValue(undefined);

      await service.deleteRisk(tenantId, userId, riskId);

      expect(mockShardManagerClient.delete).toHaveBeenCalledWith(
        `/api/v1/shards/${riskId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-ID': tenantId,
          }),
        })
      );
    });
  });

  describe('enableRisk', () => {
    it('should enable a risk successfully', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const riskId = 'risk-123';

      // Mock existing risk
      mockShardManagerClient.get.mockResolvedValueOnce({
        id: riskId,
        tenantId,
        data: {
          name: 'Test Risk',
          enabled: false,
        },
      });

      const updatedRisk = {
        id: riskId,
        tenantId,
        data: {
          name: 'Test Risk',
          enabled: true,
        },
      };

      mockShardManagerClient.put.mockResolvedValue(updatedRisk);

      const result = await service.enableRisk(tenantId, userId, riskId);

      expect(result.data.enabled).toBe(true);
      expect(mockShardManagerClient.put).toHaveBeenCalled();
    });
  });

  describe('disableRisk', () => {
    it('should disable a risk successfully', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const riskId = 'risk-123';

      // Mock existing risk
      mockShardManagerClient.get.mockResolvedValueOnce({
        id: riskId,
        tenantId,
        data: {
          name: 'Test Risk',
          enabled: true,
        },
      });

      const updatedRisk = {
        id: riskId,
        tenantId,
        data: {
          name: 'Test Risk',
          enabled: false,
        },
      };

      mockShardManagerClient.put.mockResolvedValue(updatedRisk);

      const result = await service.disableRisk(tenantId, userId, riskId);

      expect(result.data.enabled).toBe(false);
      expect(mockShardManagerClient.put).toHaveBeenCalled();
    });
  });
});

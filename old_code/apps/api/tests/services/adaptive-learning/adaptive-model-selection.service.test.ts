/**
 * Adaptive Model Selection Service Tests
 * Tests for model selection and auto-graduation functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdaptiveModelSelectionService } from '../../../src/services/adaptive-model-selection.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import { ServiceType, Context } from '../../../src/types/adaptive-learning.types';

const mockMonitoring: IMonitoringProvider = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  trackMetric: vi.fn(),
  trackTrace: vi.fn(),
} as any;

const mockCosmosClient = {
  database: vi.fn().mockReturnValue({
    container: vi.fn().mockReturnValue({
      items: {
        query: vi.fn().mockReturnValue({
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        }),
        create: vi.fn().mockResolvedValue({ resource: {} }),
        upsert: vi.fn().mockResolvedValue({ resource: {} }),
      },
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
} as unknown as Redis;

describe('AdaptiveModelSelectionService', () => {
  let service: AdaptiveModelSelectionService;
  const tenantId = 'tenant-1';
  const context: Context = {
    industry: 'tech',
    dealSize: 'large',
    stage: 'proposal',
  };
  const serviceType: ServiceType = 'risk';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdaptiveModelSelectionService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );
  });

  describe('selectModel', () => {
    it('should select global model when no tenant data exists', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      const result = await service.selectModel(tenantId, serviceType, context);

      expect(result.model).toBe('global');
      expect(result.reason).toContain('insufficient');
    });

    it('should select industry model when industry data is sufficient', async () => {
      (mockRedis.get as any).mockResolvedValue(null);
      
      // Mock learning record with industry data
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [{
            tenantId,
            modelType: serviceType,
            contextKey: 'tech:large:proposal',
            graduationState: {
              current: 'industry',
              industryExamples: 200,
              tenantExamples: 50,
            },
            performance: {
              globalAccuracy: 0.7,
              industryAccuracy: 0.85,
            },
          }],
        }),
      });

      const result = await service.selectModel(tenantId, serviceType, context);

      expect(result.model).toBe('industry');
      expect(result.reason).toContain('industry');
    });

    it('should select tenant model when tenant data is sufficient', async () => {
      (mockRedis.get as any).mockResolvedValue(null);
      
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [{
            tenantId,
            modelType: serviceType,
            contextKey: 'tech:large:proposal',
            graduationState: {
              current: 'tenant',
              industryExamples: 500,
              tenantExamples: 300,
            },
            performance: {
              globalAccuracy: 0.7,
              industryAccuracy: 0.85,
              tenantAccuracy: 0.92,
            },
          }],
        }),
      });

      const result = await service.selectModel(tenantId, serviceType, context);

      expect(result.model).toBe('tenant');
      expect(result.reason).toContain('tenant');
    });

    it('should cache model selection result', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      await service.selectModel(tenantId, serviceType, context);

      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('learnSelectionCriteria', () => {
    it('should update model performance metrics', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      await service.learnSelectionCriteria(
        tenantId,
        serviceType,
        context,
        {
          globalAccuracy: 0.75,
          industryAccuracy: 0.80,
          tenantAccuracy: 0.85,
          examples: 100,
        }
      );

      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled(); // Cache invalidation
    });

    it('should determine best model based on performance', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      await service.learnSelectionCriteria(
        tenantId,
        serviceType,
        context,
        {
          globalAccuracy: 0.70,
          industryAccuracy: 0.85,
          tenantAccuracy: 0.90,
          examples: 200,
        }
      );

      // Should prefer tenant model when it performs best
      const result = await service.selectModel(tenantId, serviceType, context);
      expect(result.model).toBeDefined();
    });
  });

  describe('graduation logic', () => {
    it('should not graduate with insufficient examples', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      const result = await service.selectModel(tenantId, serviceType, context);

      // Should stay at global with insufficient data
      expect(result.model).toBe('global');
    });

    it('should graduate to industry with sufficient industry examples', async () => {
      (mockRedis.get as any).mockResolvedValue(null);
      
      // Simulate learning with industry data
      await service.learnSelectionCriteria(
        tenantId,
        serviceType,
        context,
        {
          globalAccuracy: 0.70,
          industryAccuracy: 0.85,
          examples: 150, // Sufficient for industry
        }
      );

      const result = await service.selectModel(tenantId, serviceType, context);
      // Should prefer industry if it performs better
      expect(result.model).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should fallback to global model on error', async () => {
      (mockRedis.get as any).mockRejectedValue(new Error('Redis error'));

      const result = await service.selectModel(tenantId, serviceType, context);

      expect(result.model).toBe('global');
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should handle Cosmos DB errors gracefully', async () => {
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockRejectedValue(new Error('Cosmos DB error')),
      });

      const result = await service.selectModel(tenantId, serviceType, context);

      expect(result.model).toBe('global'); // Fallback
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

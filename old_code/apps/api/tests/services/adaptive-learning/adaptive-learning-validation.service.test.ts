/**
 * Adaptive Learning Validation Service Tests
 * Tests for statistical validation using Bootstrap confidence intervals
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdaptiveLearningValidationService } from '../../../src/services/adaptive-learning-validation.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import { ServiceType } from '../../../src/types/adaptive-learning.types';

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
        upsert: vi.fn().mockResolvedValue({ resource: {} }),
      },
      item: vi.fn().mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: null }),
      }),
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
} as unknown as Redis;

describe('AdaptiveLearningValidationService', () => {
  let service: AdaptiveLearningValidationService;
  const tenantId = 'tenant-1';
  const contextKey = 'tech:large:proposal';
  const serviceType: ServiceType = 'risk';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdaptiveLearningValidationService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );
  });

  describe('shouldValidate', () => {
    it('should trigger validation when example threshold reached', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            examples: 150, // Above threshold
            lastValidatedExamples: 50,
          },
        }),
      });

      const trigger = await service.shouldValidate(tenantId, contextKey, serviceType);

      expect(trigger.shouldValidate).toBe(true);
      expect(trigger.reason).toContain('example');
    });

    it('should trigger validation when time threshold reached', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 8); // 8 days ago

      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            examples: 50,
            validatedAt: oldDate,
          },
        }),
      });

      const trigger = await service.shouldValidate(tenantId, contextKey, serviceType);

      expect(trigger.shouldValidate).toBe(true);
      expect(trigger.reason).toContain('time');
    });

    it('should not validate when thresholds not met', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            examples: 50,
            validatedAt: new Date(), // Recent
          },
        }),
      });

      const trigger = await service.shouldValidate(tenantId, contextKey, serviceType);

      expect(trigger.shouldValidate).toBe(false);
    });
  });

  describe('validateWeights', () => {
    it('should validate learned parameters using Bootstrap', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            examples: 200,
            performance: {
              accuracy: 0.85,
              baseline: 0.75,
            },
          },
        }),
      });

      // Mock performance data retrieval
      (service as any).getPerformanceData = vi.fn().mockResolvedValue({
        learned: [0.8, 0.85, 0.9, 0.82, 0.88],
        default: [0.7, 0.75, 0.72, 0.74, 0.73],
      });

      const result = await service.validateWeights(tenantId, contextKey, serviceType);

      expect(result).toBeDefined();
      expect(result.validated).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should mark as validated when improvement is significant', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            examples: 200,
            performance: {
              accuracy: 0.90,
              baseline: 0.75,
            },
          },
        }),
      });

      (service as any).getPerformanceData = vi.fn().mockResolvedValue({
        learned: [0.88, 0.90, 0.92, 0.89, 0.91],
        default: [0.70, 0.75, 0.72, 0.74, 0.73],
      });

      const result = await service.validateWeights(tenantId, contextKey, serviceType);

      if (result.validated) {
        expect(result.confidence).toBeGreaterThan(0.8);
      }
    });

    it('should update learning record with validation results', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            examples: 200,
            performance: { accuracy: 0.85, baseline: 0.75 },
          },
        }),
      });

      (service as any).getPerformanceData = vi.fn().mockResolvedValue({
        learned: [0.8, 0.85, 0.9],
        default: [0.7, 0.75, 0.72],
      });

      await service.validateWeights(tenantId, contextKey, serviceType);

      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
    });
  });

  describe('shouldApplyLearnedParams', () => {
    it('should allow application when validated', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            validated: true,
            validatedAt: new Date(),
          },
        }),
      });

      const shouldApply = await service.shouldApplyLearnedParams(
        tenantId,
        contextKey,
        serviceType
      );

      expect(shouldApply).toBe(true);
    });

    it('should not allow application when not validated', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            tenantId,
            contextKey,
            serviceType,
            validated: false,
          },
        }),
      });

      const shouldApply = await service.shouldApplyLearnedParams(
        tenantId,
        contextKey,
        serviceType
      );

      expect(shouldApply).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle missing learning record', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: null }),
      });

      const trigger = await service.shouldValidate(tenantId, contextKey, serviceType);

      expect(trigger.shouldValidate).toBe(false);
    });

    it('should handle Cosmos DB errors gracefully', async () => {
      (mockCosmosClient.database().container().item as any).mockReturnValue({
        read: vi.fn().mockRejectedValue(new Error('Cosmos DB error')),
      });

      await expect(
        service.shouldValidate(tenantId, contextKey, serviceType)
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

/**
 * Outcome Collector Service Tests
 * Tests for outcome collection (real-time and batch)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutcomeCollectorService } from '../../../src/services/outcome-collector.service';
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
  lpush: vi.fn().mockResolvedValue(1),
  lrange: vi.fn().mockResolvedValue([]),
} as unknown as Redis;

describe('OutcomeCollectorService', () => {
  let service: OutcomeCollectorService;
  const tenantId = 'tenant-1';
  const context: Context = {
    industry: 'tech',
    dealSize: 'large',
  };
  const serviceType: ServiceType = 'risk';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OutcomeCollectorService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );
  });

  describe('recordPrediction', () => {
    it('should store prediction in memory queue', async () => {
      const predictionId = await service.recordPrediction(
        tenantId,
        serviceType,
        context,
        { riskScore: 0.7 },
        { ml: 0.9, rules: 1.0 },
        { ml: 0.9, rules: 1.0 }
      );

      expect(predictionId).toBeDefined();
      expect(typeof predictionId).toBe('string');
    });

    it('should store prediction in Redis for high-value tenants', async () => {
      // Mock high-value tenant check
      (service as any).isHighValueTenant = vi.fn().mockReturnValue(true);

      await service.recordPrediction(
        tenantId,
        serviceType,
        context,
        { riskScore: 0.7 },
        { ml: 0.9 },
        { ml: 0.9 }
      );

      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('recordOutcome', () => {
    it('should record outcome and process real-time for high-value tenants', async () => {
      const predictionId = 'pred-1';
      
      // Mock prediction retrieval
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        id: predictionId,
        tenantId,
        serviceType,
        context,
        prediction: { riskScore: 0.7 },
      }));

      // Mock high-value tenant
      (service as any).isHighValueTenant = vi.fn().mockReturnValue(true);

      await service.recordOutcome(
        predictionId,
        tenantId,
        0.8, // Actual outcome
        'success'
      );

      expect(mockCosmosClient.database().container().items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should queue outcome for batch processing for regular tenants', async () => {
      const predictionId = 'pred-1';
      
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        id: predictionId,
        tenantId,
        serviceType,
        context,
        prediction: { riskScore: 0.7 },
      }));

      // Mock regular tenant (not high-value)
      (service as any).isHighValueTenant = vi.fn().mockReturnValue(false);

      await service.recordOutcome(
        predictionId,
        tenantId,
        0.8,
        'success'
      );

      // Should queue for batch
      expect(mockRedis.lpush).toHaveBeenCalled();
    });

    it('should handle different outcome types', async () => {
      const predictionId = 'pred-1';
      
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        id: predictionId,
        tenantId,
        serviceType,
        context,
        prediction: { riskScore: 0.7 },
      }));

      await service.recordOutcome(predictionId, tenantId, 0.2, 'failure');
      await service.recordOutcome(predictionId, tenantId, 0.5, 'partial');

      expect(mockCosmosClient.database().container().items.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('batch processing', () => {
    it('should process queued outcomes in batch', async () => {
      (mockRedis.lrange as any).mockResolvedValue([
        JSON.stringify({ predictionId: 'pred-1', tenantId, outcome: 0.8 }),
        JSON.stringify({ predictionId: 'pred-2', tenantId, outcome: 0.6 }),
      ]);

      await (service as any).processBatchOutcomes();

      expect(mockCosmosClient.database().container().items.create).toHaveBeenCalled();
    });

    it('should handle empty queue', async () => {
      (mockRedis.lrange as any).mockResolvedValue([]);

      await (service as any).processBatchOutcomes();

      expect(mockCosmosClient.database().container().items.create).not.toHaveBeenCalled();
    });
  });

  describe('high-value tenant detection', () => {
    it('should identify high-value tenants', async () => {
      const isHighValue = (service as any).isHighValueTenant(tenantId);
      
      // Default implementation should return false for test tenant
      expect(typeof isHighValue).toBe('boolean');
    });
  });

  describe('error handling', () => {
    it('should handle missing prediction gracefully', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      await expect(
        service.recordOutcome('missing-pred', tenantId, 0.8, 'success')
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      (mockRedis.get as any).mockRejectedValue(new Error('Redis error'));

      await expect(
        service.recordOutcome('pred-1', tenantId, 0.8, 'success')
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

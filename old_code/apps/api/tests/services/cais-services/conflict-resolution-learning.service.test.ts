/**
 * Conflict Resolution Learning Service Tests
 * Tests for conflict resolution strategy learning
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConflictResolutionLearningService } from '../../../src/services/conflict-resolution-learning.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';

// Mock dependencies
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
        query: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
      },
      item: vi.fn().mockReturnValue({
        read: vi.fn(),
        replace: vi.fn(),
      }),
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
} as unknown as Redis;

describe('ConflictResolutionLearningService', () => {
  let service: ConflictResolutionLearningService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ConflictResolutionLearningService(mockCosmosClient, mockRedis, mockMonitoring);
  });

  describe('resolveConflict', () => {
    it('should resolve conflict using learned strategy when available', async () => {
      const tenantId = 'tenant-1';
      const contextKey = 'tech:large:proposal';
      const method1 = 'ml_model';
      const method2 = 'rule_engine';
      const conflictType = 'risk_score';
      const conflictDescription = 'ML model says 0.8, rule engine says 0.3';

      // Mock cache hit with learned strategy
      (mockRedis.get as any).mockResolvedValue(JSON.stringify({
        activeStrategy: 'learned',
        blendRatio: 0.7,
        performance: { accuracy: 0.85, baseline: 0.70, improvement: 0.15 },
      }));

      const result = await service.resolveConflict(
        tenantId,
        contextKey,
        method1,
        method2,
        conflictType,
        conflictDescription
      );

      expect(result).toBeDefined();
      expect(result.resolutionStrategy).toBe('learned');
      expect(mockRedis.get).toHaveBeenCalled();
    });

    it('should fall back to default strategy when no learning available', async () => {
      const tenantId = 'tenant-1';
      const contextKey = 'tech:large:proposal';
      const method1 = 'ml_model';
      const method2 = 'rule_engine';
      const conflictType = 'risk_score';
      const conflictDescription = 'ML model says 0.8, rule engine says 0.3';

      // Mock cache miss and Cosmos query returning empty
      (mockRedis.get as any).mockResolvedValue(null);
      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      });

      const result = await service.resolveConflict(
        tenantId,
        contextKey,
        method1,
        method2,
        conflictType,
        conflictDescription
      );

      expect(result).toBeDefined();
      expect(result.resolutionStrategy).toBe('highest_confidence'); // Default
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should record conflict resolution for learning', async () => {
      const tenantId = 'tenant-1';
      const contextKey = 'tech:large:proposal';
      const method1 = 'ml_model';
      const method2 = 'rule_engine';
      const conflictType = 'risk_score';
      const conflictDescription = 'ML model says 0.8, rule engine says 0.3';

      // Mock cache miss
      (mockRedis.get as any).mockResolvedValue(null);
      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      });
      (mockContainer.items.create as any).mockResolvedValue({ resource: { id: 'conflict-1' } });

      await service.resolveConflict(
        tenantId,
        contextKey,
        method1,
        method2,
        conflictType,
        conflictDescription
      );

      // Verify conflict was recorded
      expect(mockContainer.items.create).toHaveBeenCalled();
    });
  });

  describe('recordOutcome', () => {
    it('should record outcome and update learning', async () => {
      const conflictId = 'conflict-1';
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const outcome = 0.9; // Success metric

      const mockContainer = (mockCosmosClient.database as any)().container();
      const mockItem = mockContainer.item();
      (mockItem.read as any).mockResolvedValue({
        resource: {
          id: conflictId,
          tenantId,
          examples: 5,
          performance: { accuracy: 0.8 },
        },
      });
      (mockItem.replace as any).mockResolvedValue({ resource: {} });

      await service.recordOutcome(conflictId, tenantId, opportunityId, outcome);

      expect(mockItem.read).toHaveBeenCalled();
      expect(mockItem.replace).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should handle missing conflict record gracefully', async () => {
      const conflictId = 'conflict-1';
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const outcome = 0.9;

      const mockContainer = (mockCosmosClient.database as any)().container();
      const mockItem = mockContainer.item();
      (mockItem.read as any).mockResolvedValue({ resource: null });

      await expect(
        service.recordOutcome(conflictId, tenantId, opportunityId, outcome)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });

  describe('getLearnedStrategy', () => {
    it('should retrieve learned strategy from cache', async () => {
      const tenantId = 'tenant-1';
      const contextKey = 'tech:large:proposal';
      const method1 = 'ml_model';
      const method2 = 'rule_engine';

      const cachedStrategy = {
        activeStrategy: 'learned',
        blendRatio: 0.7,
        performance: { accuracy: 0.85 },
      };

      (mockRedis.get as any).mockResolvedValue(JSON.stringify(cachedStrategy));

      const result = await service.getLearnedStrategy(tenantId, contextKey, method1, method2);

      expect(result).toEqual(cachedStrategy);
      expect(mockRedis.get).toHaveBeenCalled();
    });

    it('should fall back to Cosmos when cache miss', async () => {
      const tenantId = 'tenant-1';
      const contextKey = 'tech:large:proposal';
      const method1 = 'ml_model';
      const method2 = 'rule_engine';

      (mockRedis.get as any).mockResolvedValue(null);
      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [{
            id: 'learning-1',
            activeStrategy: 'learned',
            blendRatio: 0.7,
          }],
        }),
      });

      const result = await service.getLearnedStrategy(tenantId, contextKey, method1, method2);

      expect(result).toBeDefined();
      expect(mockRedis.setex).toHaveBeenCalled(); // Should cache result
    });
  });
});

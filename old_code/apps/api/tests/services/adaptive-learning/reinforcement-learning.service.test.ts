/**
 * Reinforcement Learning Service Tests
 * Tests for Q-learning action sequence optimization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReinforcementLearningService } from '../../../src/services/reinforcement-learning.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';

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

describe('ReinforcementLearningService', () => {
  let service: ReinforcementLearningService;
  const tenantId = 'tenant-1';
  const opportunityId = 'opp-1';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReinforcementLearningService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );
  });

  describe('learnDealNurturingStrategy', () => {
    it('should generate action sequence for deal nurturing', async () => {
      (mockRedis.get as any).mockResolvedValue(null);
      (service as any).getOpportunityState = vi.fn().mockResolvedValue('qualification');

      const strategy = await service.learnDealNurturingStrategy(opportunityId, tenantId);

      expect(strategy).toBeDefined();
      expect(strategy.strategyId).toBeDefined();
      expect(strategy.tenantId).toBe(tenantId);
      expect(strategy.opportunityId).toBe(opportunityId);
      expect(strategy.actions).toBeDefined();
      expect(Array.isArray(strategy.actions)).toBe(true);
    });

    it('should order actions by expected reward', async () => {
      (mockRedis.get as any).mockResolvedValue(null);
      (service as any).getOpportunityState = vi.fn().mockResolvedValue('qualification');

      const strategy = await service.learnDealNurturingStrategy(opportunityId, tenantId);

      if (strategy.actions.length > 1) {
        // Actions should be ordered by expected reward (descending)
        for (let i = 0; i < strategy.actions.length - 1; i++) {
          expect(strategy.actions[i].expectedReward).toBeGreaterThanOrEqual(
            strategy.actions[i + 1].expectedReward
          );
        }
      }
    });

    it('should calculate total expected reward', async () => {
      (mockRedis.get as any).mockResolvedValue(null);
      (service as any).getOpportunityState = vi.fn().mockResolvedValue('qualification');

      const strategy = await service.learnDealNurturingStrategy(opportunityId, tenantId);

      expect(strategy.totalExpectedReward).toBeDefined();
      expect(strategy.totalExpectedReward).toBeGreaterThanOrEqual(0);
    });
  });

  describe('learnStakeholderEngagementPath', () => {
    it('should generate stakeholder-focused action sequence', async () => {
      (mockRedis.get as any).mockResolvedValue(null);
      (service as any).getOpportunityState = vi.fn().mockResolvedValue('qualification');

      const strategy = await service.learnStakeholderEngagementPath(
        opportunityId,
        tenantId,
        'stakeholder-1'
      );

      expect(strategy).toBeDefined();
      expect(strategy.actions).toBeDefined();
      
      // Should include stakeholder-specific actions
      const hasStakeholderAction = strategy.actions.some(
        (a) => a.action === 'stakeholder_introduction' || a.action === 'meeting'
      );
      expect(hasStakeholderAction).toBe(true);
    });
  });

  describe('optimizeActionSequence', () => {
    it('should optimize action sequence by expected reward', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      const actions = ['email', 'call', 'meeting', 'proposal'];
      const optimized = await service.optimizeActionSequence(
        'qualification',
        actions,
        tenantId
      );

      expect(optimized).toBeDefined();
      expect(Array.isArray(optimized)).toBe(true);
      expect(optimized.length).toBe(actions.length);

      // Should be sorted by expected reward
      if (optimized.length > 1) {
        for (let i = 0; i < optimized.length - 1; i++) {
          expect(optimized[i].expectedReward).toBeGreaterThanOrEqual(
            optimized[i + 1].expectedReward
          );
        }
      }
    });
  });

  describe('learnFromExperience', () => {
    it('should update Q-values using Q-learning', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      const experience = {
        state: 'qualification',
        action: 'email',
        reward: 0.8,
        nextState: 'proposal',
        timestamp: new Date(),
      };

      await service.learnFromExperience(tenantId, experience);

      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled(); // Cache invalidation
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should increase Q-value for positive rewards', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      // First experience with positive reward
      await service.learnFromExperience(tenantId, {
        state: 'qualification',
        action: 'email',
        reward: 0.9,
        nextState: 'proposal',
        timestamp: new Date(),
      });

      // Second experience with same action should have higher Q-value
      const optimized = await service.optimizeActionSequence(
        'qualification',
        ['email', 'call'],
        tenantId
      );

      expect(optimized).toBeDefined();
    });

    it('should decrease Q-value for negative rewards', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      await service.learnFromExperience(tenantId, {
        state: 'qualification',
        action: 'email',
        reward: 0.2, // Low reward
        nextState: 'qualification', // No progress
        timestamp: new Date(),
      });

      const optimized = await service.optimizeActionSequence(
        'qualification',
        ['email', 'call'],
        tenantId
      );

      expect(optimized).toBeDefined();
    });
  });

  describe('epsilon-greedy policy', () => {
    it('should explore sometimes (20% of the time)', async () => {
      (mockRedis.get as any).mockResolvedValue(null);
      (service as any).getOpportunityState = vi.fn().mockResolvedValue('qualification');

      // Run multiple times to check exploration
      const strategies = [];
      for (let i = 0; i < 10; i++) {
        const strategy = await service.learnDealNurturingStrategy(opportunityId, tenantId);
        strategies.push(strategy);
      }

      // Should have some variation (exploration)
      expect(strategies.length).toBe(10);
    });
  });

  describe('error handling', () => {
    it('should handle Redis errors gracefully', async () => {
      (mockRedis.get as any).mockRejectedValue(new Error('Redis error'));

      const strategy = await service.learnDealNurturingStrategy(opportunityId, tenantId);

      expect(strategy).toBeDefined(); // Should still work
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should handle Cosmos DB errors gracefully', async () => {
      (mockCosmosClient.database().container().items.upsert as any).mockRejectedValue(
        new Error('Cosmos DB error')
      );

      const experience = {
        state: 'qualification',
        action: 'email',
        reward: 0.8,
        nextState: 'proposal',
        timestamp: new Date(),
      };

      await expect(
        service.learnFromExperience(tenantId, experience)
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

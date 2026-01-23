/**
 * Episodic Memory Service Tests
 * Tests for notable event learning
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EpisodicMemoryService, EventSignificance } from '../../../src/services/episodic-memory.service';
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
      },
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
} as unknown as Redis;

describe('EpisodicMemoryService', () => {
  let service: EpisodicMemoryService;
  const tenantId = 'tenant-1';
  const opportunityId = 'opp-1';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EpisodicMemoryService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );
  });

  describe('identifySignificantEvent', () => {
    it('should identify big win events', async () => {
      const significance = await service.identifySignificantEvent(
        opportunityId,
        tenantId,
        'won',
        'won',
        0.8 // High risk score
      );

      expect(significance).toBe('big_win');
    });

    it('should identify surprising loss events', async () => {
      const significance = await service.identifySignificantEvent(
        opportunityId,
        tenantId,
        'lost',
        'won' // Predicted to win but lost
      );

      expect(significance).toBe('surprising_loss');
    });

    it('should identify near miss events', async () => {
      const significance = await service.identifySignificantEvent(
        opportunityId,
        tenantId,
        'lost',
        'won',
        0.2 // Low risk score (should have won)
      );

      expect(significance).toBe('near_miss');
    });

    it('should identify critical intervention events', async () => {
      const significance = await service.identifySignificantEvent(
        opportunityId,
        tenantId,
        'won',
        'won',
        0.9 // Very high risk score
      );

      expect(significance).toBe('critical_intervention');
    });

    it('should return null for non-significant events', async () => {
      const significance = await service.identifySignificantEvent(
        opportunityId,
        tenantId,
        'won',
        'won',
        0.5 // Moderate risk
      );

      expect(significance).toBeNull();
    });
  });

  describe('captureEpisode', () => {
    it('should capture episode with full context', async () => {
      const context = {
        opportunity: {
          id: opportunityId,
          structuredData: {
            amount: 500000,
            stage: 'proposal',
          },
        },
        stakeholders: [],
        risks: [],
        predictions: { riskScore: 0.8 },
      };

      const episode = await service.captureEpisode(
        opportunityId,
        tenantId,
        'big_win',
        context,
        {
          actual: 'won',
          predicted: 'won',
        }
      );

      expect(episode).toBeDefined();
      expect(episode.episodeId).toBeDefined();
      expect(episode.tenantId).toBe(tenantId);
      expect(episode.opportunityId).toBe(opportunityId);
      expect(episode.significance).toBe('big_win');
      expect(episode.context).toBeDefined();
      expect(episode.outcome.actual).toBe('won');
      expect(episode.lessons).toBeDefined();
    });

    it('should extract success factors for big wins', async () => {
      const context = {
        opportunity: {
          structuredData: {
            stage: 'closed_won',
            amount: 600000,
          },
        },
        risks: [{ confidence: 0.7 }],
      };

      const episode = await service.captureEpisode(
        opportunityId,
        tenantId,
        'big_win',
        context,
        { actual: 'won', predicted: 'won' }
      );

      expect(episode.lessons.successFactors).toBeDefined();
      expect(Array.isArray(episode.lessons.successFactors)).toBe(true);
    });

    it('should extract failure factors for losses', async () => {
      const context = {
        opportunity: {
          structuredData: {
            stage: 'closed_lost',
          },
        },
        risks: [{ confidence: 0.8 }],
      };

      const episode = await service.captureEpisode(
        opportunityId,
        tenantId,
        'surprising_loss',
        context,
        { actual: 'lost', predicted: 'won' }
      );

      expect(episode.lessons.failureFactors).toBeDefined();
      expect(Array.isArray(episode.lessons.failureFactors)).toBe(true);
    });

    it('should mark surprise when outcome differs from prediction', async () => {
      const episode = await service.captureEpisode(
        opportunityId,
        tenantId,
        'surprising_loss',
        { opportunity: {} },
        { actual: 'lost', predicted: 'won' }
      );

      expect(episode.outcome.surprise).toBe(true);
    });

    it('should save episode to Cosmos DB', async () => {
      await service.captureEpisode(
        opportunityId,
        tenantId,
        'big_win',
        { opportunity: {} },
        { actual: 'won', predicted: 'won' }
      );

      expect(mockCosmosClient.database().container().items.create).toHaveBeenCalled();
    });

    it('should cache episode in Redis', async () => {
      await service.captureEpisode(
        opportunityId,
        tenantId,
        'big_win',
        { opportunity: {} },
        { actual: 'won', predicted: 'won' }
      );

      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('retrieveSimilarEpisodes', () => {
    it('should retrieve episodes with similar contexts', async () => {
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              episodeId: 'ep-1',
              context: {
                opportunity: {
                  structuredData: {
                    industry: 'tech',
                    amount: 500000,
                  },
                },
              },
              applicableContexts: ['tech:large'],
            },
          ],
        }),
      });

      const context: Context = {
        industry: 'tech',
        dealSize: 'large',
      };

      const similar = await service.retrieveSimilarEpisodes(
        opportunityId,
        tenantId,
        context,
        5
      );

      expect(similar).toBeDefined();
      expect(Array.isArray(similar)).toBe(true);
    });

    it('should calculate similarity scores', async () => {
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              episodeId: 'ep-1',
              context: {
                opportunity: {
                  structuredData: {
                    industry: 'tech',
                    stage: 'proposal',
                    amount: 500000,
                  },
                },
              },
              applicableContexts: ['tech:large:proposal'],
            },
          ],
        }),
      });

      const context: Context = {
        industry: 'tech',
        dealSize: 'large',
        stage: 'proposal',
      };

      const similar = await service.retrieveSimilarEpisodes(
        opportunityId,
        tenantId,
        context,
        5
      );

      if (similar.length > 0) {
        expect(similar[0].similarityScore).toBeGreaterThan(0);
        expect(similar[0].similarityScore).toBeLessThanOrEqual(1);
        expect(similar[0].sharedFactors).toBeDefined();
      }
    });

    it('should sort by similarity score', async () => {
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              episodeId: 'ep-1',
              context: { opportunity: { structuredData: { industry: 'tech' } } },
              applicableContexts: ['tech'],
            },
            {
              episodeId: 'ep-2',
              context: { opportunity: { structuredData: { industry: 'finance' } } },
              applicableContexts: ['finance'],
            },
          ],
        }),
      });

      const context: Context = { industry: 'tech' };
      const similar = await service.retrieveSimilarEpisodes(
        opportunityId,
        tenantId,
        context,
        5
      );

      if (similar.length > 1) {
        expect(similar[0].similarityScore).toBeGreaterThanOrEqual(
          similar[1].similarityScore
        );
      }
    });

    it('should handle empty results gracefully', async () => {
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      });

      const similar = await service.retrieveSimilarEpisodes(
        opportunityId,
        tenantId,
        { industry: 'tech' },
        5
      );

      expect(similar).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle Cosmos DB errors gracefully', async () => {
      (mockCosmosClient.database().container().items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockRejectedValue(new Error('Cosmos DB error')),
      });

      const similar = await service.retrieveSimilarEpisodes(
        opportunityId,
        tenantId,
        { industry: 'tech' },
        5
      );

      expect(similar).toEqual([]);
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      (mockRedis.setex as any).mockRejectedValue(new Error('Redis error'));

      await expect(
        service.captureEpisode(
          opportunityId,
          tenantId,
          'big_win',
          { opportunity: {} },
          { actual: 'won', predicted: 'won' }
        )
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

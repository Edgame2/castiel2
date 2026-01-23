/**
 * Collaborative Intelligence Service Tests
 * Tests for team learning and knowledge sharing
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CollaborativeIntelligenceService } from '../../../src/services/collaborative-intelligence.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { FeedbackLearningService } from '../../../src/services/feedback-learning.service.js';
import type { MetaLearningService } from '../../../src/services/meta-learning.service.js';

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

const mockFeedbackLearningService = {
  recordFeedback: vi.fn(),
} as unknown as FeedbackLearningService;

const mockMetaLearningService = {
  learnComponentTrust: vi.fn(),
} as unknown as MetaLearningService;

describe('CollaborativeIntelligenceService', () => {
  let service: CollaborativeIntelligenceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CollaborativeIntelligenceService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockFeedbackLearningService,
      mockMetaLearningService
    );
  });

  describe('learnTeamPattern', () => {
    it('should learn a success pattern from team behavior', async () => {
      const tenantId = 'tenant-1';
      const teamId = 'team-1';
      const patternType = 'success';
      const pattern = {
        context: 'tech:large:proposal',
        action: 'sent_detailed_proposal',
        outcome: 0.9,
        frequency: 5,
        users: ['user-1', 'user-2'],
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'pattern-1',
          tenantId,
          teamId,
          patternType,
          pattern,
          confidence: 0.85,
          detectedAt: new Date(),
        },
      });

      const result = await service.learnTeamPattern(tenantId, teamId, patternType, pattern);

      expect(result).toBeDefined();
      expect(result.patternType).toBe(patternType);
      expect(result.confidence).toBeGreaterThan(0);
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should learn a failure pattern', async () => {
      const tenantId = 'tenant-1';
      const teamId = 'team-1';
      const patternType = 'failure';
      const pattern = {
        context: 'tech:small:demo',
        action: 'skipped_demo',
        outcome: 0.2,
        frequency: 3,
        users: ['user-3'],
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'pattern-1',
          tenantId,
          teamId,
          patternType,
          pattern,
          confidence: 0.7,
        },
      });

      const result = await service.learnTeamPattern(tenantId, teamId, patternType, pattern);

      expect(result).toBeDefined();
      expect(result.patternType).toBe('failure');
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const teamId = 'team-1';
      const patternType = 'success';
      const pattern = {
        context: 'test',
        action: 'test',
        outcome: 0.5,
        frequency: 1,
        users: [],
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockRejectedValue(new Error('Database error'));

      await expect(
        service.learnTeamPattern(tenantId, teamId, patternType, pattern)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });

  describe('generateCollectiveInsight', () => {
    it('should generate collective insight from team patterns', async () => {
      const tenantId = 'tenant-1';
      const teamId = 'team-1';
      const insightType = 'best_practice';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'pattern-1',
              patternType: 'success',
              pattern: {
                context: 'tech:large:proposal',
                action: 'sent_detailed_proposal',
                outcome: 0.9,
                users: ['user-1', 'user-2'],
              },
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'insight-1',
          tenantId,
          teamId,
          insightType,
          content: {
            title: 'Best Practice: Detailed Proposals',
            description: 'Sending detailed proposals leads to high success rate',
            context: 'tech:large:proposal',
            evidence: [
              {
                userId: 'user-1',
                example: 'Sent detailed proposal',
                outcome: 0.9,
              },
            ],
          },
          aggregation: {
            contributorCount: 2,
            consensusScore: 0.9,
            validationScore: 0.85,
          },
        },
      });

      const result = await service.generateCollectiveInsight(tenantId, teamId, insightType);

      expect(result).toBeDefined();
      expect(result.insightType).toBe(insightType);
      expect(result.aggregation.consensusScore).toBeGreaterThan(0);
      expect(mockContainer.items.create).toHaveBeenCalled();
    });
  });

  describe('identifyExpert', () => {
    it('should identify expert user based on performance', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';
      const domain = 'risk_analysis';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'pattern-1',
              patternType: 'success',
              pattern: {
                outcome: 0.95,
                users: [userId],
              },
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'expert-1',
          tenantId,
          userId,
          expertise: [
            {
              domain,
              score: 0.9,
              evidence: [
                {
                  type: 'high_accuracy',
                  description: 'Consistently high accuracy in risk analysis',
                },
              ],
            },
          ],
          metrics: {
            accuracy: 0.9,
            consistency: 0.85,
            contribution: 0.8,
            recognition: 0.75,
          },
        },
      });

      const result = await service.identifyExpert(tenantId, userId, domain);

      expect(result).toBeDefined();
      expect(result.expertise[0].domain).toBe(domain);
      expect(result.metrics.accuracy).toBeGreaterThan(0.8);
    });
  });
});

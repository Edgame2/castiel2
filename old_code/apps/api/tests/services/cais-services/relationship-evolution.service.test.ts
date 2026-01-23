/**
 * Relationship Evolution Service Tests
 * Tests for relationship tracking and health
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RelationshipEvolutionService } from '../../../src/services/relationship-evolution.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { ShardRelationshipService } from '../../../src/services/shard-relationship.service.js';
import type { CommunicationAnalysisService } from '../../../src/services/communication-analysis.service.js';
import type { CalendarIntelligenceService } from '../../../src/services/calendar-intelligence.service.js';

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

const mockShardRelationshipService = {
  getRelationships: vi.fn(),
} as unknown as ShardRelationshipService;

const mockCommunicationAnalysisService = {
  analyzeEmail: vi.fn(),
} as unknown as CommunicationAnalysisService;

const mockCalendarIntelligenceService = {
  analyzeOpportunityCalendar: vi.fn(),
} as unknown as CalendarIntelligenceService;

describe('RelationshipEvolutionService', () => {
  let service: RelationshipEvolutionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RelationshipEvolutionService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockShardRelationshipService,
      mockCommunicationAnalysisService,
      mockCalendarIntelligenceService
    );
  });

  describe('trackEvolution', () => {
    it('should track relationship evolution', async () => {
      const tenantId = 'tenant-1';
      const sourceShardId = 'account-1';
      const targetShardId = 'contact-1';
      const relationshipType = 'works_with';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'evolution-1',
              tenantId,
              sourceShardId,
              targetShardId,
              currentStage: 'established',
              strength: 0.8,
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'evolution-1',
          tenantId,
          sourceShardId,
          targetShardId,
          relationshipType,
          currentStage: 'established',
          strength: 0.8,
          health: {
            score: 80,
            factors: [
              {
                factor: 'interaction_frequency',
                score: 0.9,
                impact: 'positive',
              },
            ],
          },
          lifecycle: {
            stage: 'established',
            enteredAt: new Date(),
            duration: 90,
            transitions: [],
          },
          metrics: {
            interactionFrequency: 5,
            lastInteraction: new Date(),
            averageResponseTime: 24,
            engagementScore: 0.85,
            sentimentTrend: 'improving',
          },
        },
      });

      const result = await service.trackEvolution(
        tenantId,
        sourceShardId,
        targetShardId,
        relationshipType
      );

      expect(result).toBeDefined();
      expect(result.currentStage).toBeDefined();
      expect(result.strength).toBeGreaterThan(0);
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should detect relationship stage transitions', async () => {
      const tenantId = 'tenant-1';
      const sourceShardId = 'account-1';
      const targetShardId = 'contact-1';
      const relationshipType = 'works_with';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'evolution-1',
              tenantId,
              sourceShardId,
              targetShardId,
              currentStage: 'developing',
              strength: 0.6,
              lifecycle: {
                stage: 'developing',
                enteredAt: new Date('2024-01-01'),
                duration: 60,
                transitions: [
                  {
                    from: 'initial',
                    to: 'developing',
                    timestamp: new Date('2024-01-01'),
                    reason: 'Increased interactions',
                  },
                ],
              },
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'evolution-1',
          tenantId,
          currentStage: 'established',
          lifecycle: {
            stage: 'established',
            enteredAt: new Date(),
            duration: 0,
            transitions: [
              {
                from: 'developing',
                to: 'established',
                timestamp: new Date(),
                reason: 'Strong engagement pattern',
              },
            ],
          },
        },
      });

      const result = await service.trackEvolution(
        tenantId,
        sourceShardId,
        targetShardId,
        relationshipType
      );

      expect(result).toBeDefined();
      expect(result.lifecycle.transitions.length).toBeGreaterThan(0);
    });

    it('should calculate relationship health score', async () => {
      const tenantId = 'tenant-1';
      const sourceShardId = 'account-1';
      const targetShardId = 'contact-1';
      const relationshipType = 'works_with';

      (mockCommunicationAnalysisService.analyzeEmail as any).mockResolvedValue({
        sentiment: { overall: 'positive', confidence: 0.9 },
        engagement: { depth: 0.8 },
      });

      (mockCalendarIntelligenceService.analyzeOpportunityCalendar as any).mockResolvedValue({
        patterns: [
          {
            patternType: 'frequency',
            pattern: { avgDaysBetweenMeetings: 7 },
          },
        ],
      });

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'evolution-1',
          tenantId,
          health: {
            score: 85,
            factors: [
              {
                factor: 'positive_sentiment',
                score: 0.9,
                impact: 'positive',
              },
              {
                factor: 'high_engagement',
                score: 0.8,
                impact: 'positive',
              },
            ],
          },
        },
      });

      const result = await service.trackEvolution(
        tenantId,
        sourceShardId,
        targetShardId,
        relationshipType
      );

      expect(result).toBeDefined();
      expect(result.health.score).toBeGreaterThan(0);
      expect(result.health.factors.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const sourceShardId = 'account-1';
      const targetShardId = 'contact-1';
      const relationshipType = 'works_with';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockRejectedValue(new Error('Database error'));

      await expect(
        service.trackEvolution(tenantId, sourceShardId, targetShardId, relationshipType)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

/**
 * Communication Analysis Service Tests
 * Tests for email and meeting analysis functionality
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CommunicationAnalysisService } from '../../../src/services/communication-analysis.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { MultiModalIntelligenceService } from '../../../src/services/multimodal-intelligence.service.js';

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

const mockMultiModalIntelligenceService = {
  analyzeText: vi.fn(),
  extractEntities: vi.fn(),
} as unknown as MultiModalIntelligenceService;

describe('CommunicationAnalysisService', () => {
  let service: CommunicationAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CommunicationAnalysisService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockMultiModalIntelligenceService
    );
  });

  describe('analyzeCommunication', () => {
    it('should analyze email communication', async () => {
      const tenantId = 'tenant-1';
      const communicationType = 'email';
      const content = 'Thank you for the proposal. We are very interested.';
      const opportunityId = 'opp-1';
      const metadata = { sender: 'customer@example.com', subject: 'Re: Proposal' };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'analysis-1',
          tenantId,
          communicationType,
          sentiment: { score: 0.8, label: 'positive' },
          tone: { score: 0.7, label: 'professional' },
        },
      });

      (mockMultiModalIntelligenceService.analyzeText as any).mockResolvedValue({
        sentiment: { score: 0.8, label: 'positive' },
        entities: [],
      });

      const result = await service.analyzeEmail(
        tenantId,
        {
          subject: metadata.subject,
          body: content,
          from: metadata.sender,
          to: ['sales@example.com'],
          timestamp: new Date(),
          metadata,
        },
        opportunityId
      );

      expect(result).toBeDefined();
      expect(result.communicationType).toBe('email');
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should analyze meeting transcript', async () => {
      const tenantId = 'tenant-1';
      const transcript = {
        text: 'Meeting transcript: Discussed pricing and timeline. Customer wants to move forward.',
        participants: ['customer@example.com', 'sales@example.com'],
        timestamp: new Date(),
        duration: 30,
      };
      const opportunityId = 'opp-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'analysis-1',
          tenantId,
          communicationType: 'meeting',
          sentiment: { overall: 'positive', confidence: 0.9 },
          engagement: { depth: 0.8 },
        },
      });

      (mockMultiModalIntelligenceService.analyzeText as any).mockResolvedValue({
        sentiment: { score: 0.9, label: 'positive' },
        entities: [{ type: 'action', value: 'move forward' }],
      });

      const result = await service.analyzeMeetingTranscript(
        tenantId,
        transcript,
        opportunityId
      );

      expect(result).toBeDefined();
      expect(result.communicationType).toBe('meeting');
      expect(result.insights).toBeDefined();
    });

    it('should handle negative sentiment', async () => {
      const tenantId = 'tenant-1';
      const email = {
        subject: 'Re: Proposal',
        body: 'We are not interested at this time.',
        from: 'customer@example.com',
        to: ['sales@example.com'],
        timestamp: new Date(),
      };
      const opportunityId = 'opp-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'analysis-1',
          tenantId,
          sentiment: { overall: 'negative', confidence: 0.8 },
          insights: { riskIndicators: ['low_interest'] },
        },
      });

      (mockMultiModalIntelligenceService.analyzeText as any).mockResolvedValue({
        sentiment: { score: 0.2, label: 'negative' },
        entities: [],
      });

      const result = await service.analyzeEmail(tenantId, email, opportunityId);

      expect(result).toBeDefined();
      expect(result.sentiment.overall).toBe('negative');
      expect(result.insights.riskIndicators).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const email = {
        subject: 'Test',
        body: 'Test content',
        from: 'test@example.com',
        to: ['sales@example.com'],
        timestamp: new Date(),
      };

      (mockMultiModalIntelligenceService.analyzeText as any).mockRejectedValue(
        new Error('Analysis failed')
      );

      await expect(
        service.analyzeEmail(tenantId, email)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });

  describe('analyzeResponseTimePattern', () => {
    it('should analyze response time patterns', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const communications = [
        {
          from: 'customer@example.com',
          to: 'sales@example.com',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          type: 'email' as const,
        },
        {
          from: 'sales@example.com',
          to: 'customer@example.com',
          timestamp: new Date('2024-01-01T10:30:00Z'),
          type: 'email' as const,
        },
      ];

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'pattern-1',
          tenantId,
          opportunityId,
          patternType: 'response_time',
          pattern: { avgResponseTime: 1800000 }, // 30 minutes
        },
      });

      const result = await service.analyzeResponseTimePattern(
        tenantId,
        opportunityId,
        communications
      );

      expect(result).toBeDefined();
      expect(result.patternType).toBe('response_time');
      expect(mockContainer.items.create).toHaveBeenCalled();
    });
  });
});

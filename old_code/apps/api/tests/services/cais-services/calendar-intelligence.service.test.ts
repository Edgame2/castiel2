/**
 * Calendar Intelligence Service Tests
 * Tests for calendar pattern analysis functionality
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CalendarIntelligenceService } from '../../../src/services/calendar-intelligence.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { CommunicationAnalysisService } from '../../../src/services/communication-analysis.service.js';

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

const mockCommunicationAnalysisService = {
  analyzeMeetingTranscript: vi.fn(),
} as unknown as CommunicationAnalysisService;

describe('CalendarIntelligenceService', () => {
  let service: CalendarIntelligenceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CalendarIntelligenceService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockCommunicationAnalysisService
    );
  });

  describe('analyzeOpportunityCalendar', () => {
    it('should analyze calendar events for patterns', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      
      // Mock events retrieval
      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
        {
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T11:00:00Z'),
          attendees: ['customer@example.com', 'sales@example.com'],
          status: 'accepted',
          subject: 'Product Demo',
        },
        {
          startTime: new Date('2024-01-08T10:00:00Z'),
          endTime: new Date('2024-01-08T11:00:00Z'),
          attendees: ['customer@example.com', 'sales@example.com'],
          status: 'accepted',
          subject: 'Follow-up Meeting',
            startTime: new Date('2024-01-08T10:00:00Z'),
            endTime: new Date('2024-01-08T11:00:00Z'),
            attendees: [{ email: 'customer@example.com', isInternal: false }],
            status: 'completed',
            title: 'Follow-up Meeting',
          },
          ],
        }),
      });
      
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'intelligence-1',
          tenantId,
          opportunityId,
          patterns: [
            {
              patternType: 'frequency',
              pattern: { avgDaysBetweenMeetings: 7, meetingFrequency: 'high' },
              confidence: 0.9,
            },
          ],
        },
      });

      const result = await service.analyzeOpportunityCalendar(tenantId, opportunityId);

      expect(result).toBeDefined();
      expect(result.opportunityId).toBe(opportunityId);
      expect(result.patterns).toBeDefined();
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should detect cancellation patterns', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const events = [
        {
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T11:00:00Z'),
          attendees: ['customer@example.com'],
          status: 'cancelled',
          subject: 'Meeting',
        },
        {
          startTime: new Date('2024-01-08T10:00:00Z'),
          endTime: new Date('2024-01-08T11:00:00Z'),
          attendees: ['customer@example.com'],
          status: 'cancelled',
          subject: 'Meeting',
        },
      ];

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'intelligence-1',
          tenantId,
          opportunityId,
          patterns: {
            cancellationRate: 1.0,
            cancellationPattern: 'high',
          },
          insights: {
            riskIndicators: ['high_cancellation_rate'],
          },
        },
      });

      const result = await service.analyzeOpportunityCalendar(tenantId, opportunityId);

      expect(result).toBeDefined();
      expect(result.insights?.riskIndicators).toContain('high_cancellation_rate');
    });

    it('should analyze attendee seniority', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const events = [
        {
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T11:00:00Z'),
          attendees: ['ceo@example.com', 'cfo@example.com', 'sales@example.com'],
          status: 'accepted',
          subject: 'Executive Meeting',
        },
      ];

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'intelligence-1',
          tenantId,
          opportunityId,
          attendeeAnalysis: {
            seniorityLevel: 'high',
            executivePresence: true,
          },
        },
      });

      const result = await service.analyzeOpportunityCalendar(tenantId, opportunityId);

      expect(result).toBeDefined();
      expect(result.attendeeAnalysis?.seniorityLevel).toBe('high');
    });

    it('should handle empty events array', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const events: any[] = [];

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'intelligence-1',
          tenantId,
          opportunityId,
          patterns: {
            meetingFrequency: { avgDaysBetween: 0, consistency: 0 },
          },
        },
      });

      const result = await service.analyzeOpportunityCalendar(tenantId, opportunityId);

      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const events = [
        {
          startTime: new Date(),
          endTime: new Date(),
          attendees: [],
          status: 'accepted',
          subject: 'Test',
        },
      ];

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockRejectedValue(new Error('Database error'));

      await expect(
        service.analyzeOpportunityCalendar(tenantId, opportunityId)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

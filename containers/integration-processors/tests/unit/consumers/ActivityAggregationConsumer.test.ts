/**
 * Activity Aggregation Consumer Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityAggregationConsumer } from '../../../src/consumers/ActivityAggregationConsumer';
import { ServiceClient, EventPublisher } from '@coder/shared';

// Mock dependencies
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
  EventPublisher: vi.fn(),
  EventConsumer: vi.fn().mockImplementation(function (this: any) {
    this.on = vi.fn();
    this.connect = vi.fn();
    this.start = vi.fn();
    this.stop = vi.fn();
    return this;
  }),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    rabbitmq: {
      url: 'amqp://localhost:5672',
      exchange: 'coder_events',
      queues: {
        activity_aggregation: 'activity_aggregation',
      },
    },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../src/services/ActivityAggregationService', () => ({
  ActivityAggregationService: vi.fn().mockImplementation(function (this: any) {
    this.createActivityFromShard = vi.fn();
    this.createInteractionsFromActivity = vi.fn();
    return this;
  }),
}));

describe('ActivityAggregationConsumer', () => {
  let consumer: ActivityAggregationConsumer;
  let mockShardManager: any;
  let mockEventPublisher: any;
  let mockActivityAggregationService: any;

  beforeEach(() => {
    mockShardManager = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
    };

    mockEventPublisher = {
      publish: vi.fn(),
    };

    mockActivityAggregationService = {
      createActivityFromShard: vi.fn(),
      createInteractionsFromActivity: vi.fn(),
    };

    const deps = {
      shardManager: mockShardManager as ServiceClient,
      eventPublisher: mockEventPublisher as EventPublisher,
      integrationManager: {} as ServiceClient,
    };

    consumer = new ActivityAggregationConsumer(deps);
    // Access private service for testing
    (consumer as any).activityAggregationService = mockActivityAggregationService;
  });

  describe('handleShardCreatedEvent', () => {
    it('should skip non-Email/Meeting/Message shards', async () => {
      const event = {
        shardId: 'shard-123',
        tenantId: 'tenant-123',
        shardTypeId: 'opportunity',
        shardTypeName: 'Opportunity',
        structuredData: { name: 'Test Opportunity' },
      };

      await (consumer as any).handleShardCreatedEvent(event);

      // Should not call aggregation service
      expect(mockActivityAggregationService.createActivityFromShard).not.toHaveBeenCalled();
    });

    it('should create Activity and Interaction shards from Email shard', async () => {
      const event = {
        shardId: 'email-123',
        tenantId: 'tenant-123',
        shardTypeId: 'email',
        shardTypeName: 'Email',
        structuredData: {
          from: { email: 'sender@example.com', name: 'Sender', contactId: 'contact-1' },
          to: [{ email: 'recipient@example.com', name: 'Recipient', contactId: 'contact-2' }],
          subject: 'Test Email',
          body: 'Test body',
          integrationSource: 'gmail',
          linkedOpportunityIds: ['opp-123'],
        },
      };

      const mockActivityData = {
        id: 'activity-123',
        activityType: 'email',
        sourceShardId: 'email-123',
        sourceShardType: 'Email',
        primaryParticipant: { contactId: 'contact-1', email: 'sender@example.com' },
        secondaryParticipants: [{ contactId: 'contact-2', email: 'recipient@example.com' }],
        subject: 'Test Email',
        description: 'Test body',
        activityDate: new Date().toISOString(),
      };

      mockActivityAggregationService.createActivityFromShard.mockResolvedValue({
        shardId: 'activity-shard-123',
        structuredData: mockActivityData,
      });

      mockActivityAggregationService.createInteractionsFromActivity.mockResolvedValue([
        'interaction-1',
        'interaction-2',
      ]);

      await (consumer as any).handleShardCreatedEvent(event);

      // Verify Activity was created
      expect(mockActivityAggregationService.createActivityFromShard).toHaveBeenCalledWith({
        shardId: 'email-123',
        shardType: 'Email',
        structuredData: event.structuredData,
        tenantId: 'tenant-123',
      });

      // Verify Interactions were created
      expect(mockActivityAggregationService.createInteractionsFromActivity).toHaveBeenCalledWith(
        'activity-shard-123',
        mockActivityData,
        'tenant-123'
      );

      // Verify activity.created event was published (3 args: eventType, tenantId, payload)
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'activity.created',
        'tenant-123',
        expect.objectContaining({
          activityId: 'activity-shard-123',
          sourceShardId: 'email-123',
          sourceShardType: 'Email',
          interactionCount: 2,
          tenantId: 'tenant-123',
        })
      );
    });

    it('should create Activity and Interaction shards from Meeting shard', async () => {
      const event = {
        shardId: 'meeting-123',
        tenantId: 'tenant-123',
        shardTypeId: 'meeting',
        shardTypeName: 'Meeting',
        structuredData: {
          organizer: { email: 'organizer@example.com', name: 'Organizer', contactId: 'contact-1' },
          participants: [
            { email: 'participant1@example.com', name: 'Participant 1', contactId: 'contact-2' },
            { email: 'participant2@example.com', name: 'Participant 2', contactId: 'contact-3' },
          ],
          subject: 'Team Meeting',
          duration: 3600,
          integrationSource: 'zoom',
        },
      };

      const mockActivityData = {
        id: 'activity-123',
        activityType: 'meeting',
        sourceShardId: 'meeting-123',
        sourceShardType: 'Meeting',
        primaryParticipant: { contactId: 'contact-1', email: 'organizer@example.com' },
        secondaryParticipants: [
          { contactId: 'contact-2', email: 'participant1@example.com' },
          { contactId: 'contact-3', email: 'participant2@example.com' },
        ],
        subject: 'Team Meeting',
        duration: 3600,
        activityDate: new Date().toISOString(),
      };

      mockActivityAggregationService.createActivityFromShard.mockResolvedValue({
        shardId: 'activity-shard-123',
        structuredData: mockActivityData,
      });

      mockActivityAggregationService.createInteractionsFromActivity.mockResolvedValue([
        'interaction-1',
      ]);

      await (consumer as any).handleShardCreatedEvent(event);

      expect(mockActivityAggregationService.createActivityFromShard).toHaveBeenCalledWith({
        shardId: 'meeting-123',
        shardType: 'Meeting',
        structuredData: event.structuredData,
        tenantId: 'tenant-123',
      });
    });

    it('should create Activity and Interaction shards from Message shard', async () => {
      const event = {
        shardId: 'message-123',
        tenantId: 'tenant-123',
        shardTypeId: 'message',
        shardTypeName: 'Message',
        structuredData: {
          from: { email: 'sender@example.com', name: 'Sender', contactId: 'contact-1' },
          to: [{ email: 'recipient@example.com', name: 'Recipient', contactId: 'contact-2' }],
          text: 'Test message',
          channelType: 'slack',
          integrationSource: 'slack',
        },
      };

      const mockActivityData = {
        id: 'activity-123',
        activityType: 'message',
        sourceShardId: 'message-123',
        sourceShardType: 'Message',
        primaryParticipant: { contactId: 'contact-1', email: 'sender@example.com' },
        secondaryParticipants: [{ contactId: 'contact-2', email: 'recipient@example.com' }],
        description: 'Test message',
        activityDate: new Date().toISOString(),
      };

      mockActivityAggregationService.createActivityFromShard.mockResolvedValue({
        shardId: 'activity-shard-123',
        structuredData: mockActivityData,
      });

      mockActivityAggregationService.createInteractionsFromActivity.mockResolvedValue([
        'interaction-1',
      ]);

      await (consumer as any).handleShardCreatedEvent(event);

      expect(mockActivityAggregationService.createActivityFromShard).toHaveBeenCalledWith({
        shardId: 'message-123',
        shardType: 'Message',
        structuredData: event.structuredData,
        tenantId: 'tenant-123',
      });
    });

    it('should handle aggregation failures and publish failed event', async () => {
      const event = {
        shardId: 'email-123',
        tenantId: 'tenant-123',
        shardTypeId: 'email',
        shardTypeName: 'Email',
        structuredData: {
          from: { email: 'sender@example.com' },
          to: [{ email: 'recipient@example.com' }],
        },
      };

      const error = new Error('Failed to create activity');
      mockActivityAggregationService.createActivityFromShard.mockRejectedValue(error);

      await (consumer as any).handleShardCreatedEvent(event);

      // Verify failed event was published (3 args: eventType, tenantId, payload)
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'activity.aggregation.failed',
        'tenant-123',
        expect.objectContaining({
          shardId: 'email-123',
          shardTypeName: 'Email',
          tenantId: 'tenant-123',
          error: expect.any(String),
        })
      );
    });

    it('should handle interaction creation failures gracefully', async () => {
      const event = {
        shardId: 'email-123',
        tenantId: 'tenant-123',
        shardTypeId: 'email',
        shardTypeName: 'Email',
        structuredData: {
          from: { email: 'sender@example.com', contactId: 'contact-1' },
          to: [{ email: 'recipient@example.com', contactId: 'contact-2' }],
        },
      };

      const mockActivityData = {
        id: 'activity-123',
        activityType: 'email',
        primaryParticipant: { contactId: 'contact-1' },
        secondaryParticipants: [{ contactId: 'contact-2' }],
      };

      mockActivityAggregationService.createActivityFromShard.mockResolvedValue({
        shardId: 'activity-shard-123',
        structuredData: mockActivityData,
      });

      const interactionError = new Error('Failed to create interactions');
      mockActivityAggregationService.createInteractionsFromActivity.mockRejectedValue(
        interactionError
      );

      await (consumer as any).handleShardCreatedEvent(event);

      // When interactions fail, implementation publishes activity.aggregation.failed (3 args)
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'activity.aggregation.failed',
        'tenant-123',
        expect.objectContaining({
          shardId: 'email-123',
          shardTypeName: 'Email',
          tenantId: 'tenant-123',
          error: expect.any(String),
        })
      );
    });
  });
});

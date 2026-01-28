/**
 * Activity Aggregation Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityAggregationService, SourceShardData } from '../../../src/services/ActivityAggregationService';
import { ServiceClient } from '@coder/shared';

// Mock dependencies
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
}));

describe('ActivityAggregationService', () => {
  let service: ActivityAggregationService;
  let mockShardManager: any;

  beforeEach(() => {
    mockShardManager = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
    };

    service = new ActivityAggregationService(mockShardManager as ServiceClient);
  });

  describe('createActivityFromShard', () => {
    it('should create Activity shard from Email shard', async () => {
      const sourceShard: SourceShardData = {
        shardId: 'email-123',
        shardType: 'Email',
        tenantId: 'tenant-123',
        structuredData: {
          from: { email: 'sender@example.com', name: 'Sender', contactId: 'contact-1' },
          to: [{ email: 'recipient@example.com', name: 'Recipient', contactId: 'contact-2' }],
          subject: 'Test Email',
          body: 'Test body',
          integrationSource: 'gmail',
          linkedOpportunityIds: ['opp-123'],
          activityDate: '2026-01-27T10:00:00Z',
        },
      };

      mockShardManager.post.mockResolvedValue({ id: 'activity-shard-123' });

      const result = await service.createActivityFromShard(sourceShard);

      expect(result.shardId).toBe('activity-shard-123');
      expect(result.structuredData.activityType).toBe('email');
      expect(result.structuredData.sourceShardId).toBe('email-123');
      expect(result.structuredData.sourceShardType).toBe('Email');
      expect(result.structuredData.primaryParticipant.contactId).toBe('contact-1');
      expect(result.structuredData.secondaryParticipants).toHaveLength(1);
      expect(result.structuredData.subject).toBe('Test Email');
      expect(result.structuredData.description).toBe('Test body');
      expect(result.structuredData.linkedOpportunityIds).toEqual(['opp-123']);

      expect(mockShardManager.post).toHaveBeenCalledWith(
        '/api/v1/shards',
        expect.objectContaining({
          tenantId: 'tenant-123',
          shardTypeId: 'activity',
          shardTypeName: 'Activity',
          structuredData: expect.objectContaining({
            activityType: 'email',
            sourceShardId: 'email-123',
          }),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-ID': 'tenant-123',
          }),
        })
      );
    });

    it('should create Activity shard from Meeting shard', async () => {
      const sourceShard: SourceShardData = {
        shardId: 'meeting-123',
        shardType: 'Meeting',
        tenantId: 'tenant-123',
        structuredData: {
          organizer: { email: 'organizer@example.com', name: 'Organizer', contactId: 'contact-1' },
          participants: [
            { email: 'p1@example.com', name: 'P1', contactId: 'contact-2' },
            { email: 'p2@example.com', name: 'P2', contactId: 'contact-3' },
          ],
          subject: 'Team Meeting',
          description: 'Meeting description',
          duration: 3600,
          startTime: '2026-01-27T10:00:00Z',
          integrationSource: 'zoom',
        },
      };

      mockShardManager.post.mockResolvedValue({ id: 'activity-shard-123' });

      const result = await service.createActivityFromShard(sourceShard);

      expect(result.structuredData.activityType).toBe('meeting');
      expect(result.structuredData.primaryParticipant.contactId).toBe('contact-1');
      expect(result.structuredData.secondaryParticipants).toHaveLength(2);
      expect(result.structuredData.duration).toBe(3600);
      expect(result.structuredData.subject).toBe('Team Meeting');
    });

    it('should create Activity shard from Message shard', async () => {
      const sourceShard: SourceShardData = {
        shardId: 'message-123',
        shardType: 'Message',
        tenantId: 'tenant-123',
        structuredData: {
          from: { email: 'sender@example.com', name: 'Sender', contactId: 'contact-1' },
          to: [{ email: 'recipient@example.com', name: 'Recipient', contactId: 'contact-2' }],
          text: 'Test message',
          channelType: 'slack',
          timestamp: '2026-01-27T10:00:00Z',
          integrationSource: 'slack',
        },
      };

      mockShardManager.post.mockResolvedValue({ id: 'activity-shard-123' });

      const result = await service.createActivityFromShard(sourceShard);

      expect(result.structuredData.activityType).toBe('message');
      expect(result.structuredData.description).toBe('Test message');
    });

    it('should handle missing optional fields gracefully', async () => {
      const sourceShard: SourceShardData = {
        shardId: 'email-123',
        shardType: 'Email',
        tenantId: 'tenant-123',
        structuredData: {
          from: { email: 'sender@example.com' },
          // Missing to, subject, body
          integrationSource: 'gmail',
        },
      };

      mockShardManager.post.mockResolvedValue({ id: 'activity-shard-123' });

      const result = await service.createActivityFromShard(sourceShard);

      expect(result.structuredData.primaryParticipant.email).toBe('sender@example.com');
      expect(result.structuredData.secondaryParticipants).toEqual([]);
      expect(result.structuredData.subject).toBeUndefined();
      expect(result.structuredData.description).toBeUndefined();
    });
  });

  describe('createInteractionsFromActivity', () => {
    it('should create Interaction shards for all participant pairs', async () => {
      const activityShardId = 'activity-shard-123';
      const activityData = {
        id: 'activity-123',
        activityType: 'meeting' as const,
        primaryParticipant: { contactId: 'contact-1', email: 'p1@example.com' },
        secondaryParticipants: [
          { contactId: 'contact-2', email: 'p2@example.com' },
          { contactId: 'contact-3', email: 'p3@example.com' },
        ],
        activityDate: '2026-01-27T10:00:00Z',
      };
      const tenantId = 'tenant-123';

      mockShardManager.post
        .mockResolvedValueOnce({ id: 'interaction-1' })
        .mockResolvedValueOnce({ id: 'interaction-2' });

      const result = await service.createInteractionsFromActivity(
        activityShardId,
        activityData as any,
        tenantId
      );

      expect(result).toHaveLength(2);
      expect(result).toContain('interaction-1');
      expect(result).toContain('interaction-2');

      // Verify two interactions were created
      expect(mockShardManager.post).toHaveBeenCalledTimes(2);

      // Verify first interaction (contact-1 -> contact-2)
      expect(mockShardManager.post).toHaveBeenCalledWith(
        '/api/v1/shards',
        expect.objectContaining({
          tenantId: 'tenant-123',
          shardTypeId: 'interaction',
          structuredData: expect.objectContaining({
            fromContactId: 'contact-1',
            toContactIds: ['contact-2'],
            interactionType: 'meeting',
            sourceActivityId: 'activity-shard-123',
          }),
        }),
        expect.any(Object)
      );
    });

    it('should skip participants without contactId', async () => {
      const activityShardId = 'activity-shard-123';
      const activityData = {
        id: 'activity-123',
        activityType: 'email' as const,
        primaryParticipant: { contactId: 'contact-1', email: 'p1@example.com' },
        secondaryParticipants: [
          { email: 'p2@example.com' }, // No contactId
          { contactId: 'contact-3', email: 'p3@example.com' },
        ],
        activityDate: '2026-01-27T10:00:00Z',
      };
      const tenantId = 'tenant-123';

      mockShardManager.post.mockResolvedValue({ id: 'interaction-1' });

      const result = await service.createInteractionsFromActivity(
        activityShardId,
        activityData as any,
        tenantId
      );

      // Should only create one interaction (for contact-3, skipping contact without contactId)
      expect(result).toHaveLength(1);
      expect(mockShardManager.post).toHaveBeenCalledTimes(1);
    });

    it('should return empty array if primary participant has no contactId', async () => {
      const activityShardId = 'activity-shard-123';
      const activityData = {
        id: 'activity-123',
        activityType: 'email' as const,
        primaryParticipant: { email: 'p1@example.com' }, // No contactId
        secondaryParticipants: [{ contactId: 'contact-2', email: 'p2@example.com' }],
        activityDate: '2026-01-27T10:00:00Z',
      };
      const tenantId = 'tenant-123';

      const result = await service.createInteractionsFromActivity(
        activityShardId,
        activityData as any,
        tenantId
      );

      expect(result).toEqual([]);
      expect(mockShardManager.post).not.toHaveBeenCalled();
    });

    it('should return empty array if no secondary participants', async () => {
      const activityShardId = 'activity-shard-123';
      const activityData = {
        id: 'activity-123',
        activityType: 'email' as const,
        primaryParticipant: { contactId: 'contact-1', email: 'p1@example.com' },
        secondaryParticipants: [],
        activityDate: '2026-01-27T10:00:00Z',
      };
      const tenantId = 'tenant-123';

      const result = await service.createInteractionsFromActivity(
        activityShardId,
        activityData as any,
        tenantId
      );

      expect(result).toEqual([]);
      expect(mockShardManager.post).not.toHaveBeenCalled();
    });
  });
});

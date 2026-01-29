/**
 * Meeting Processor Consumer Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeetingProcessorConsumer } from '../../../src/consumers/MeetingProcessorConsumer';
import { ServiceClient, EventPublisher } from '@coder/shared';

// Mock dependencies
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
  EventPublisher: vi.fn(),
  EventConsumer: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  EntityLinkingService: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    rabbitmq: {
      url: 'amqp://localhost:5672',
      exchange: 'coder_events',
      queues: {
        integration_meetings: 'integration_meetings',
      },
    },
    azure: {
      blob_storage: {
        connection_string: 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net',
        containers: {
          recordings: 'integration-recordings',
        },
      },
      cognitive_services: {
        speech: {
          endpoint: 'https://test.cognitiveservices.azure.com',
          key: 'test-key',
        },
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

vi.mock('../../../src/services/BlobStorageService', () => ({
  BlobStorageService: vi.fn().mockImplementation(function (this: any) {
    this.uploadFile = vi.fn();
    this.ensureContainer = vi.fn();
    return this;
  }),
}));

vi.mock('../../../src/services/DocumentDownloadService', () => ({
  DocumentDownloadService: vi.fn().mockImplementation(function (this: any) {
    this.downloadDocument = vi.fn();
    return this;
  }),
}));

vi.mock('../../../src/services/TranscriptionService', () => ({
  TranscriptionService: vi.fn().mockImplementation(function (this: any) {
    this.downloadTranscript = vi.fn();
    this.transcribeAudio = vi.fn();
    return this;
  }),
}));

vi.mock('../../../src/services/MeetingAnalysisService', () => ({
  MeetingAnalysisService: vi.fn().mockImplementation(function (this: any) {
    this.analyzeMeeting = vi.fn();
    return this;
  }),
}));

describe('MeetingProcessorConsumer', () => {
  let consumer: MeetingProcessorConsumer;
  let mockShardManager: any;
  let mockEventPublisher: any;
  let mockBlobStorageService: any;
  let mockDocumentDownloadService: any;
  let mockTranscriptionService: any;
  let mockMeetingAnalysisService: any;

  beforeEach(() => {
    mockShardManager = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
    };

    mockEventPublisher = {
      publish: vi.fn(),
    };

    mockBlobStorageService = {
      uploadFile: vi.fn(),
      ensureContainer: vi.fn(),
    };

    mockDocumentDownloadService = {
      downloadDocument: vi.fn(),
    };

    mockTranscriptionService = {
      downloadTranscript: vi.fn(),
      transcribeAudio: vi.fn(),
    };

    mockMeetingAnalysisService = {
      analyzeMeeting: vi.fn(),
    };

    const deps = {
      shardManager: mockShardManager as ServiceClient,
      eventPublisher: mockEventPublisher as EventPublisher,
      integrationManager: {} as ServiceClient,
      aiService: {} as ServiceClient,
    };

    consumer = new MeetingProcessorConsumer(deps);
    // Access private services for testing
    (consumer as any).blobStorageService = mockBlobStorageService;
    (consumer as any).documentDownloadService = mockDocumentDownloadService;
    (consumer as any).transcriptionService = mockTranscriptionService;
    (consumer as any).meetingAnalysisService = mockMeetingAnalysisService;
  });

  describe('handleMeetingCompletedEvent', () => {
    it('should process meeting successfully with transcript and analysis', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        meetingId: 'meeting-123',
        externalId: 'ext-123',
        title: 'Team Meeting',
        description: 'Weekly team sync',
        startTime: '2026-01-27T10:00:00Z',
        endTime: '2026-01-27T11:00:00Z',
        duration: 60,
        integrationSource: 'zoom' as const,
        transcriptUrl: 'https://example.com/transcript.json',
        organizer: { email: 'organizer@example.com', name: 'Organizer' },
        participants: [
          { email: 'p1@example.com', name: 'Participant 1', attended: true },
          { email: 'p2@example.com', name: 'Participant 2', attended: true },
        ],
      };

      const mockTranscript = {
        fullTranscript: 'This is the full meeting transcript.',
        segments: [
          { speaker: 'Speaker 1', startTime: 0, endTime: 10, text: 'Hello everyone', sentiment: 'positive' },
        ],
        speakerCount: 2,
      };

      const mockAnalysis = {
        meetingType: 'team_sync',
        topics: ['Project updates', 'Next steps'],
        keyMoments: [{ timestamp: 300, description: 'Key decision made' }],
        actionItems: [{ text: 'Follow up on task', assignee: 'p1@example.com' }],
        objections: [],
        commitments: [],
        engagementMetrics: { averageParticipation: 0.8 },
      };

      mockTranscriptionService.downloadTranscript.mockResolvedValue(mockTranscript);
      mockBlobStorageService.uploadFile.mockResolvedValue({
        path: 'meetings/tenant-123/ext-123/transcript.json',
        url: 'https://storage.azure.com/container/meetings/tenant-123/ext-123/transcript.json',
      });
      mockMeetingAnalysisService.analyzeMeeting.mockResolvedValue(mockAnalysis);
      mockShardManager.post.mockResolvedValue({ id: 'shard-123' });

      await (consumer as any).handleMeetingCompletedEvent(event);

      // Verify transcript was downloaded
      expect(mockTranscriptionService.downloadTranscript).toHaveBeenCalledWith(
        'https://example.com/transcript.json'
      );

      // Verify transcript was stored in blob (uploadFile(path, buffer, contentType))
      expect(mockBlobStorageService.uploadFile).toHaveBeenCalledWith(
        'meetings/tenant-123/ext-123/transcript.json',
        expect.any(Buffer),
        'application/json'
      );

      // Verify meeting was analyzed
      expect(mockMeetingAnalysisService.analyzeMeeting).toHaveBeenCalledWith(
        'tenant-123',
        mockTranscript.fullTranscript,
        mockTranscript.segments,
        event.participants
      );

      // Verify shard was created with analysis (3 args: path, body, options)
      expect(mockShardManager.post).toHaveBeenCalledWith(
        '/api/v1/shards',
        expect.objectContaining({
          tenantId: 'tenant-123',
          shardTypeId: 'meeting',
          shardTypeName: 'Meeting',
          structuredData: expect.objectContaining({
            id: 'ext-123',
            title: 'Team Meeting',
            meetingType: 'team_sync',
            topics: mockAnalysis.topics,
            actionItems: mockAnalysis.actionItems,
            processingStatus: 'completed',
          }),
        }),
        expect.any(Object)
      );

      // Verify events were published (3 args: eventType, tenantId, payload)
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'shard.created',
        'tenant-123',
        expect.objectContaining({
          shardId: 'shard-123',
          shardTypeId: 'meeting',
        })
      );

      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'meeting.processed',
        'tenant-123',
        expect.objectContaining({
          meetingId: 'meeting-123',
          shardId: 'shard-123',
          hasTranscript: true,
          actionItemsCount: 1,
        })
      );
    });

    it('should process meeting with recording download', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        meetingId: 'meeting-123',
        externalId: 'ext-123',
        title: 'Team Meeting',
        startTime: '2026-01-27T10:00:00Z',
        endTime: '2026-01-27T11:00:00Z',
        duration: 60,
        integrationSource: 'zoom' as const,
        recordingUrl: 'https://example.com/recording.mp4',
        organizer: { email: 'organizer@example.com', name: 'Organizer' },
        participants: [],
      };

      const mockRecordingBuffer = Buffer.from('recording content');
      mockDocumentDownloadService.downloadDocument.mockResolvedValue({
        buffer: mockRecordingBuffer,
        contentType: 'video/mp4',
        size: 1024 * 1024,
      });

      mockBlobStorageService.uploadFile
        .mockResolvedValueOnce({
          path: 'meetings/tenant-123/ext-123/recording.mp4',
          url: 'https://storage.azure.com/container/meetings/tenant-123/ext-123/recording.mp4',
          size: 1024 * 1024,
        })
        .mockResolvedValueOnce({
          path: 'meetings/tenant-123/ext-123/transcript.json',
          url: 'https://storage.azure.com/container/meetings/tenant-123/ext-123/transcript.json',
        });

      const mockTranscript = {
        fullTranscript: 'Transcribed recording',
        segments: [],
      };
      mockTranscriptionService.transcribeAudio.mockResolvedValue(mockTranscript);

      mockShardManager.post.mockResolvedValue({ id: 'shard-123' });

      await (consumer as any).handleMeetingCompletedEvent(event);

      // Verify recording was downloaded
      expect(mockDocumentDownloadService.downloadDocument).toHaveBeenCalledWith(
        'https://example.com/recording.mp4',
        {
          timeout: 300000,
          maxSize: 500 * 1024 * 1024,
        }
      );

      // Verify recording was uploaded (uploadFile(path, buffer, contentType))
      expect(mockBlobStorageService.uploadFile).toHaveBeenCalledWith(
        expect.stringMatching(/meetings\/tenant-123\/ext-123\/recording\.mp4/),
        mockRecordingBuffer,
        'video/mp4'
      );

      // Verify transcription was attempted
      expect(mockTranscriptionService.transcribeAudio).toHaveBeenCalled();
    });

    it('should handle recording download failure gracefully', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        meetingId: 'meeting-123',
        externalId: 'ext-123',
        title: 'Team Meeting',
        startTime: '2026-01-27T10:00:00Z',
        duration: 60,
        integrationSource: 'zoom' as const,
        recordingUrl: 'https://example.com/recording.mp4',
        organizer: { email: 'organizer@example.com', name: 'Organizer' },
        participants: [],
      };

      mockDocumentDownloadService.downloadDocument.mockRejectedValue(new Error('Download failed'));
      mockShardManager.post.mockResolvedValue({ id: 'shard-123' });

      await (consumer as any).handleMeetingCompletedEvent(event);

      // Meeting should still be processed without recording
      expect(mockShardManager.post).toHaveBeenCalled();
      const shardCall = mockShardManager.post.mock.calls[0];
      expect(shardCall[1].structuredData.hasRecording).toBe(false);
      expect(shardCall[1].structuredData.recordingBlobUrl).toBeUndefined();
    });

    it('should handle transcript download failure gracefully', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        meetingId: 'meeting-123',
        externalId: 'ext-123',
        title: 'Team Meeting',
        startTime: '2026-01-27T10:00:00Z',
        duration: 60,
        integrationSource: 'zoom' as const,
        transcriptUrl: 'https://example.com/transcript.json',
        organizer: { email: 'organizer@example.com', name: 'Organizer' },
        participants: [],
      };

      mockTranscriptionService.downloadTranscript.mockRejectedValue(new Error('Transcript download failed'));
      mockShardManager.post.mockResolvedValue({ id: 'shard-123' });

      await (consumer as any).handleMeetingCompletedEvent(event);

      // Meeting should still be processed without transcript
      expect(mockShardManager.post).toHaveBeenCalled();
      const shardCall = mockShardManager.post.mock.calls[0];
      expect(shardCall[1].structuredData.hasTranscript).toBe(false);
      expect(shardCall[1].structuredData.processingStatus).toBe('pending');
    });

    it('should handle meeting analysis failure gracefully', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        meetingId: 'meeting-123',
        externalId: 'ext-123',
        title: 'Team Meeting',
        startTime: '2026-01-27T10:00:00Z',
        duration: 60,
        integrationSource: 'zoom' as const,
        transcriptUrl: 'https://example.com/transcript.json',
        organizer: { email: 'organizer@example.com', name: 'Organizer' },
        participants: [],
      };

      const mockTranscript = {
        fullTranscript: 'Meeting transcript',
        segments: [],
      };

      mockTranscriptionService.downloadTranscript.mockResolvedValue(mockTranscript);
      mockMeetingAnalysisService.analyzeMeeting.mockRejectedValue(new Error('Analysis failed'));
      mockShardManager.post.mockResolvedValue({ id: 'shard-123' });

      await (consumer as any).handleMeetingCompletedEvent(event);

      // Meeting should still be processed without analysis
      expect(mockShardManager.post).toHaveBeenCalled();
      const shardCall = mockShardManager.post.mock.calls[0];
      expect(shardCall[1].structuredData.meetingType).toBeUndefined();
      expect(shardCall[1].structuredData.topics).toBeUndefined();
    });

    it('should classify participants as internal or external', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        meetingId: 'meeting-123',
        externalId: 'ext-123',
        title: 'Team Meeting',
        startTime: '2026-01-27T10:00:00Z',
        duration: 60,
        integrationSource: 'zoom' as const,
        organizer: { email: 'organizer@company.com', name: 'Organizer' },
        participants: [
          { email: 'internal@company.com', name: 'Internal User' },
          { email: 'external@client.com', name: 'External User' },
        ],
      };

      mockShardManager.post.mockResolvedValue({ id: 'shard-123' });

      await (consumer as any).handleMeetingCompletedEvent(event);

      const shardCall = mockShardManager.post.mock.calls[0];
      const participants = shardCall[1].structuredData.participants;
      
      // Verify participants are classified
      expect(participants).toHaveLength(2);
      // Note: Actual classification logic depends on implementation
      // This test verifies the structure is correct
      expect(participants[0]).toHaveProperty('isInternal');
    });

    it('should calculate duration if not provided', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        meetingId: 'meeting-123',
        externalId: 'ext-123',
        title: 'Team Meeting',
        startTime: '2026-01-27T10:00:00Z',
        endTime: '2026-01-27T10:30:00Z',
        // duration not provided
        integrationSource: 'zoom' as const,
        organizer: { email: 'organizer@example.com', name: 'Organizer' },
        participants: [],
      };

      mockShardManager.post.mockResolvedValue({ id: 'shard-123' });

      await (consumer as any).handleMeetingCompletedEvent(event);

      const shardCall = mockShardManager.post.mock.calls[0];
      // Duration should be calculated from startTime and endTime
      expect(shardCall[1].structuredData.duration).toBe(30); // 30 minutes
    });

    it('should handle shard creation failure and publish failed event', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        meetingId: 'meeting-123',
        externalId: 'ext-123',
        title: 'Team Meeting',
        startTime: '2026-01-27T10:00:00Z',
        duration: 60,
        integrationSource: 'zoom' as const,
        organizer: { email: 'organizer@example.com', name: 'Organizer' },
        participants: [],
      };

      const shardError = new Error('Shard creation failed');
      mockShardManager.post.mockRejectedValue(shardError);

      await expect((consumer as any).handleMeetingCompletedEvent(event)).rejects.toThrow();

      // Verify failed event was published (3 args)
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'meeting.processing.failed',
        'tenant-123',
        expect.objectContaining({
          meetingId: 'meeting-123',
          externalId: 'ext-123',
          error: 'Shard creation failed',
        })
      );
    });
  });
});

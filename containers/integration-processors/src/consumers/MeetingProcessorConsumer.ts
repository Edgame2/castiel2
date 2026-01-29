/**
 * Meeting Processor Consumer
 * Consumes integration.meeting.completed events, processes recordings/transcripts, and creates Meeting shards
 * @module integration-processors/consumers
 */

import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { BaseConsumer, ConsumerDependencies } from './index';
import { BlobStorageService } from '../services/BlobStorageService';
import { DocumentDownloadService } from '../services/DocumentDownloadService';
import { TranscriptionService } from '../services/TranscriptionService';
import { MeetingAnalysisService } from '../services/MeetingAnalysisService';
import { MeetingStructuredData } from '@coder/shared/types/shards';

interface MeetingCompletedEvent {
  integrationId: string;
  tenantId: string;
  meetingId: string;
  externalId: string;
  title: string;
  description?: string;
  startTime: string; // ISO date-time string
  endTime?: string; // ISO date-time string
  duration?: number; // minutes
  timezone?: string;
  integrationSource: 'zoom' | 'teams' | 'google_meet' | 'gong' | 'chorus';
  externalUrl?: string;
  recordingUrl?: string;
  transcriptUrl?: string;
  organizer?: {
    email: string;
    name: string;
  };
  participants?: Array<{
    email?: string;
    name: string;
    attended?: boolean;
    joinedAt?: string; // ISO date-time string
    leftAt?: string; // ISO date-time string
    durationMinutes?: number;
  }>;
  syncTaskId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Meeting Processor Consumer
 * Processes meeting recordings and transcripts from integrations (Zoom, Teams, Google Meet, Gong)
 */
export class MeetingProcessorConsumer implements BaseConsumer {
  private consumer: EventConsumer | null = null;
  private config: ReturnType<typeof loadConfig>;
  private blobStorageService: BlobStorageService | null = null;
  private documentDownloadService: DocumentDownloadService;
  private transcriptionService: TranscriptionService;
  private meetingAnalysisService: MeetingAnalysisService;
  constructor(private deps: ConsumerDependencies) {
    this.config = loadConfig();
    this.documentDownloadService = new DocumentDownloadService();
    this.transcriptionService = new TranscriptionService({
      endpoint: this.config.azure?.cognitive_services?.speech?.endpoint,
      key: this.config.azure?.cognitive_services?.speech?.key,
    });
    this.meetingAnalysisService = new MeetingAnalysisService(deps.aiService || null);

    // Initialize blob storage service if configured
    if (this.config.azure?.blob_storage?.connection_string) {
      const containerName = this.config.azure.blob_storage.containers?.recordings || 'integration-recordings';
      this.blobStorageService = new BlobStorageService({
        connectionString: this.config.azure.blob_storage.connection_string,
        containerName,
      });
    }
  }

  async start(): Promise<void> {
    if (!this.config.rabbitmq?.url) {
      log.warn('RabbitMQ URL not configured, meeting processor consumer disabled', {
        service: 'integration-processors',
      });
      return;
    }

    try {
      this.consumer = new EventConsumer({
        url: this.config.rabbitmq.url,
        exchange: this.config.rabbitmq.exchange || 'coder_events',
        queue: 'integration_meetings',
        routingKeys: ['integration.meeting.completed'],
        prefetch: 3, // Very slow processing (transcription, analysis)
      });

      // Handle meeting completed events
      this.consumer.on('integration.meeting.completed', async (event) => {
        await this.handleMeetingCompletedEvent(event.data as MeetingCompletedEvent);
      });

      await this.consumer.connect();
      await this.consumer.start();

      log.info('Meeting processor consumer started', {
        queue: 'integration_meetings',
        service: 'integration-processors',
      });
    } catch (error: any) {
      log.error('Failed to start meeting processor consumer', error, {
        service: 'integration-processors',
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.consumer) {
      await this.consumer.stop();
      this.consumer = null;
    }
  }

  /**
   * Handle meeting completed event
   */
  private async handleMeetingCompletedEvent(event: MeetingCompletedEvent): Promise<void> {
    const startTime = process.hrtime.bigint();
    const { tenantId, meetingId, externalId } = event;

    try {
      log.info('Processing meeting', {
        meetingId,
        externalId,
        tenantId,
        title: event.title,
        service: 'integration-processors',
      });

      // Step 1: Download and store recording (if available)
      let recordingBlobUrl: string | undefined;
      let recordingSize: number | undefined;
      let recordingDuration: number | undefined;

      if (event.recordingUrl && this.blobStorageService) {
        try {
          await this.blobStorageService.ensureContainer();
          const recordingData = await this.documentDownloadService.downloadDocument(event.recordingUrl, {
            timeout: 300000, // 5 minutes for large recordings
            maxSize: 500 * 1024 * 1024, // 500 MB max
          });

          const recordingPath = `meetings/${tenantId}/${externalId}/recording.${this.getFileExtension(recordingData.contentType)}`;
          const uploadResult = await this.blobStorageService.uploadFile(recordingPath, recordingData.buffer, recordingData.contentType);

          recordingBlobUrl = uploadResult.url;
          recordingSize = uploadResult.size;
          recordingDuration = event.duration ? event.duration * 60 : undefined; // Convert minutes to seconds

          log.info('Meeting recording stored', {
            meetingId,
            recordingBlobUrl,
            recordingSize,
            service: 'integration-processors',
          });
        } catch (error: any) {
          log.warn('Failed to download/store recording, continuing without it', {
            error: error.message,
            meetingId,
            service: 'integration-processors',
          });
        }
      }

      // Step 2: Process transcript
      let transcriptResult: { fullTranscript: string; segments: any[]; speakerCount?: number } | null = null;

      if (event.transcriptUrl) {
        try {
          transcriptResult = await this.transcriptionService.downloadTranscript(event.transcriptUrl);
          log.info('Transcript downloaded and parsed', {
            meetingId,
            segmentCount: transcriptResult.segments.length,
            speakerCount: transcriptResult.speakerCount,
            service: 'integration-processors',
          });
        } catch (error: any) {
          log.warn('Failed to download/parse transcript, continuing without it', {
            error: error.message,
            meetingId,
            service: 'integration-processors',
          });
        }
      } else if (recordingBlobUrl) {
        // Try to transcribe recording if no transcript provided
        try {
          transcriptResult = await this.transcriptionService.transcribeAudio(recordingBlobUrl);
          log.info('Recording transcribed', {
            meetingId,
            segmentCount: transcriptResult.segments.length,
            service: 'integration-processors',
          });
        } catch (error: any) {
          log.warn('Failed to transcribe recording, continuing without transcript', {
            error: error.message,
            meetingId,
            service: 'integration-processors',
          });
        }
      }

      // Step 3: Store transcript in blob storage (if available)
      let transcriptBlobUrl: string | undefined;
      if (transcriptResult && this.blobStorageService) {
        try {
          await this.blobStorageService.ensureContainer();
          const transcriptJson = JSON.stringify({
            fullTranscript: transcriptResult.fullTranscript,
            segments: transcriptResult.segments,
          });
          const transcriptPath = `meetings/${tenantId}/${externalId}/transcript.json`;
          const uploadResult = await this.blobStorageService.uploadFile(
            transcriptPath,
            Buffer.from(transcriptJson),
            'application/json'
          );
          transcriptBlobUrl = uploadResult.url;
        } catch (error: any) {
          log.warn('Failed to store transcript in blob storage', {
            error: error.message,
            meetingId,
            service: 'integration-processors',
          });
        }
      }

      // Step 4: Analyze meeting content (if transcript available)
      let analysisResult: any = null;
      if (transcriptResult) {
        try {
          analysisResult = await this.meetingAnalysisService.analyzeMeeting(
            tenantId,
            transcriptResult.fullTranscript,
            transcriptResult.segments,
            event.participants || []
          );
          log.info('Meeting analysis completed', {
            meetingId,
            meetingType: analysisResult.meetingType,
            topicsCount: analysisResult.topics?.length || 0,
            actionItemsCount: analysisResult.actionItems?.length || 0,
            service: 'integration-processors',
          });
        } catch (error: any) {
          log.warn('Failed to analyze meeting content, continuing without analysis', {
            error: error.message,
            meetingId,
            service: 'integration-processors',
          });
        }
      }

      // Step 5: Classify participants (internal vs external)
      const classifiedParticipants = this.classifyParticipants(event.participants || []);

      // Step 6: Calculate duration if not provided
      const duration = event.duration || this.calculateDuration(event.startTime, event.endTime);

      // Step 7: Create Meeting shard
      const structuredData: MeetingStructuredData = {
        id: externalId,
        meetingId: event.meetingId,
        title: event.title,
        description: event.description,
        integrationSource: event.integrationSource,
        externalId: externalId,
        externalUrl: event.externalUrl,
        startTime: event.startTime,
        endTime: event.endTime,
        duration: duration,
        timezone: event.timezone,
        organizer: event.organizer
          ? {
              email: event.organizer.email,
              name: event.organizer.name,
            }
          : undefined,
        participants: classifiedParticipants,
        participantCount: classifiedParticipants.length,
        internalParticipantCount: classifiedParticipants.filter((p) => p.isInternal).length,
        externalParticipantCount: classifiedParticipants.filter((p) => !p.isInternal).length,
        hasRecording: !!recordingBlobUrl,
        recordingUrl: event.recordingUrl,
        recordingBlobUrl: recordingBlobUrl,
        recordingDuration: recordingDuration,
        recordingSize: recordingSize,
        hasTranscript: !!transcriptResult,
        transcriptUrl: event.transcriptUrl,
        transcriptBlobUrl: transcriptBlobUrl,
        fullTranscript: transcriptResult?.fullTranscript,
        transcriptSegments: transcriptResult?.segments.map((seg) => ({
          speaker: seg.speaker,
          startTime: seg.startTime,
          endTime: seg.endTime,
          text: seg.text,
          sentiment: seg.sentiment,
        })),
        meetingType: analysisResult?.meetingType,
        topics: analysisResult?.topics,
        keyMoments: analysisResult?.keyMoments,
        actionItems: analysisResult?.actionItems,
        objections: analysisResult?.objections,
        commitments: analysisResult?.commitments,
        engagementMetrics: analysisResult?.engagementMetrics,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'synced',
        processingStatus: transcriptResult ? 'completed' : 'pending',
      };

      // Step 8: Create shard via shard-manager API
      const shardResponse = await this.deps.shardManager.post<{ id: string }>(
        '/api/v1/shards',
        {
          tenantId,
          shardTypeId: 'meeting',
          shardTypeName: 'Meeting',
          structuredData,
        },
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const shardId = shardResponse.id;

      log.info('Meeting shard created', {
        meetingId,
        shardId,
        tenantId,
        service: 'integration-processors',
      });

      // Step 9: Publish shard.created event (triggers entity linking)
      await this.deps.eventPublisher.publish('shard.created', tenantId, {
        shardId,
        tenantId,
        shardTypeId: 'meeting',
        shardTypeName: 'Meeting',
        structuredData,
      });

      // Step 10: Publish meeting.processed event
      await this.deps.eventPublisher.publish('meeting.processed', tenantId, {
        meetingId,
        shardId,
        tenantId,
        integrationId: event.integrationId,
        externalId,
        title: event.title,
        startTime: event.startTime,
        participantCount: classifiedParticipants.length,
        hasRecording: !!recordingBlobUrl,
        hasTranscript: !!transcriptResult,
        meetingType: analysisResult?.meetingType,
        actionItemsCount: analysisResult?.actionItems?.length || 0,
      });

      const durationMs = Number(process.hrtime.bigint() - startTime) / 1e9;
      log.info('Meeting processed successfully', {
        meetingId,
        shardId,
        duration: durationMs,
        service: 'integration-processors',
      });
    } catch (error: any) {
      const durationMs = Number(process.hrtime.bigint() - startTime) / 1e9;
      log.error('Failed to process meeting', error, {
        meetingId,
        externalId,
        tenantId,
        duration: durationMs,
        service: 'integration-processors',
      });

      // Publish meeting processing failed event
      await this.deps.eventPublisher.publish('meeting.processing.failed', tenantId, {
        meetingId,
        tenantId,
        integrationId: event.integrationId,
        externalId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Classify participants as internal or external
   */
  private classifyParticipants(
    participants: Array<{ email?: string; name: string; attended?: boolean; joinedAt?: string; leftAt?: string; durationMinutes?: number }>
  ): Array<{
    email?: string;
    name: string;
    contactId?: string;
    isInternal?: boolean;
    attended?: boolean;
    joinedAt?: string;
    leftAt?: string;
    durationMinutes?: number;
  }> {
    return participants.map((participant) => {
      if (!participant.email) {
        return {
          ...participant,
          isInternal: false, // Default to external if no email
        };
      }

      const domain = participant.email.split('@')[1]?.toLowerCase();
      const isInternal =
        domain &&
        (domain.includes('gmail.com') ||
          domain.includes('outlook.com') ||
          domain.includes('hotmail.com') ||
          domain.includes('yahoo.com') ||
          // Add tenant-specific domain check if needed
          false);

      return {
        ...participant,
        isInternal: isInternal || false,
      };
    });
  }

  /**
   * Calculate duration in minutes from start and end times
   */
  private calculateDuration(startTime: string, endTime?: string): number | undefined {
    if (!endTime) {
      return undefined;
    }

    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end.getTime() - start.getTime();
      return Math.round(diffMs / (1000 * 60)); // Convert to minutes
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get file extension from content type
   */
  private getFileExtension(contentType: string): string {
    const extensions: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
    };

    return extensions[contentType] || 'mp4';
  }
}

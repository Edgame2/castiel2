/**
 * Message Processor Consumer
 * Consumes integration.message.received events, parses message metadata, processes attachments, and creates Message shards
 * @module integration-processors/consumers
 */

import { EventConsumer, ServiceClient, EventPublisher, EntityLinkingService } from '@coder/shared';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { BaseConsumer, ConsumerDependencies } from './index';
import { BlobStorageService } from '../services/BlobStorageService';
import { DocumentDownloadService } from '../services/DocumentDownloadService';
import { MessageStructuredData } from '@coder/shared/types/shards';

interface MessageReceivedEvent {
  integrationId: string;
  tenantId: string;
  messageId: string;
  externalId: string;
  threadId?: string;
  parentMessageId?: string;
  channelId: string;
  channelName?: string;
  channelType?: 'dm' | 'group_dm' | 'public_channel' | 'private_channel';
  workspaceId?: string;
  workspaceName?: string;
  from: {
    userId: string;
    email?: string;
    name: string;
  };
  text: string;
  formattedText?: string;
  mentions?: Array<{
    userId: string;
    name: string;
  }>;
  mentionedChannels?: string[];
  reactions?: Array<{
    emoji: string;
    count: number;
    userIds: string[];
  }>;
  attachments?: Array<{
    type: 'file' | 'image' | 'video' | 'link';
    url: string;
    filename?: string;
    mimeType?: string;
    size?: number;
    attachmentId: string;
  }>;
  isEdited?: boolean;
  editedAt?: string; // ISO date-time string
  isDeleted?: boolean;
  deletedAt?: string; // ISO date-time string
  isPinned?: boolean;
  threadReplyCount?: number;
  sentAt: string; // ISO date-time string
  integrationSource: 'slack' | 'teams' | 'discord';
  syncTaskId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Message Processor Consumer
 * Processes messages from integrations (Slack, Teams, Discord)
 */
export class MessageProcessorConsumer implements BaseConsumer {
  private consumer: EventConsumer | null = null;
  private config: ReturnType<typeof loadConfig>;
  private blobStorageService: BlobStorageService | null = null;
  private documentDownloadService: DocumentDownloadService;
  private entityLinkingService: EntityLinkingService | null = null;

  constructor(private deps: ConsumerDependencies) {
    this.config = loadConfig();
    this.documentDownloadService = new DocumentDownloadService();

    // Initialize blob storage service if configured (for attachments)
    if (this.config.azure?.blob_storage?.connection_string) {
      const containerName = this.config.azure.blob_storage.containers?.attachments || 'integration-attachments';
      this.blobStorageService = new BlobStorageService({
        connectionString: this.config.azure.blob_storage.connection_string,
        containerName,
      });
    }

    // Initialize entity linking service if AI service is available
    if (deps.aiService) {
      this.entityLinkingService = new EntityLinkingService(deps.shardManager, deps.aiService);
    }
  }

  async start(): Promise<void> {
    if (!this.config.rabbitmq?.url) {
      log.warn('RabbitMQ URL not configured, message processor consumer disabled', {
        service: 'integration-processors',
      });
      return;
    }

    try {
      this.consumer = new EventConsumer({
        url: this.config.rabbitmq.url,
        exchange: this.config.rabbitmq.exchange || 'coder_events',
        queue: 'integration_communications',
        routingKeys: ['integration.message.received'],
        prefetch: 10, // Medium prefetch for message processing
      });

      // Handle message received events
      this.consumer.on('integration.message.received', async (event) => {
        await this.handleMessageReceivedEvent(event.data as MessageReceivedEvent);
      });

      await this.consumer.connect();
      await this.consumer.start();

      log.info('Message processor consumer started', {
        queue: 'integration_communications',
        service: 'integration-processors',
      });
    } catch (error: any) {
      log.error('Failed to start message processor consumer', error, {
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
   * Handle message received event
   */
  private async handleMessageReceivedEvent(event: MessageReceivedEvent): Promise<void> {
    const startTime = process.hrtime.bigint();
    const { tenantId, messageId, externalId } = event;

    try {
      log.info('Processing message', {
        messageId,
        externalId,
        tenantId,
        channelId: event.channelId,
        service: 'integration-processors',
      });

      // Step 1: Process attachments (if any)
      const processedAttachments = await this.processAttachments(event, tenantId);

      // Step 2: Classify channel type if not provided
      const channelType = event.channelType || this.classifyChannelType(event.channelId, event.channelName);

      // Step 3: Create Message shard
      const structuredData: MessageStructuredData = {
        id: externalId,
        messageId: event.messageId,
        threadId: event.threadId,
        parentMessageId: event.parentMessageId,
        integrationSource: event.integrationSource,
        externalId: externalId,
        channelId: event.channelId,
        channelName: event.channelName,
        channelType: channelType,
        workspaceId: event.workspaceId,
        workspaceName: event.workspaceName,
        from: {
          userId: event.from.userId,
          email: event.from.email,
          name: event.from.name,
        },
        text: event.text,
        formattedText: event.formattedText,
        mentions: event.mentions?.map((m) => ({
          userId: m.userId,
          name: m.name,
        })),
        mentionedChannels: event.mentionedChannels,
        reactions: event.reactions,
        hasAttachments: processedAttachments.length > 0,
        attachments: processedAttachments,
        isEdited: event.isEdited,
        editedAt: event.editedAt,
        isDeleted: event.isDeleted,
        deletedAt: event.deletedAt,
        isPinned: event.isPinned,
        threadReplyCount: event.threadReplyCount,
        sentAt: event.sentAt,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'synced',
        processingStatus: 'processing', // Content analysis pending
      };

      // Step 4: Create shard via shard-manager API
      const shardResponse = await this.deps.shardManager.post<{ id: string }>(
        '/api/v1/shards',
        {
          tenantId,
          shardTypeId: 'message',
          shardTypeName: 'Message',
          structuredData,
        },
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const shardId = shardResponse.id;

      log.info('Message shard created', {
        messageId,
        shardId,
        tenantId,
        service: 'integration-processors',
      });

      // Step 5: Publish shard.created event (triggers vectorization and entity linking)
      await this.deps.eventPublisher.publish('shard.created', tenantId, {
        shardId,
        tenantId,
        shardTypeId: 'message',
        shardTypeName: 'Message',
        structuredData,
      });

      // Step 6: Publish message.processed event
      await this.deps.eventPublisher.publish('message.processed', tenantId, {
        messageId,
        shardId,
        tenantId,
        integrationId: event.integrationId,
        externalId,
        channelId: event.channelId,
        channelType: channelType,
        attachmentCount: processedAttachments.length,
        processingStatus: 'processing', // Content analysis pending
      });

      const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
      log.info('Message processed successfully', {
        messageId,
        shardId,
        duration,
        service: 'integration-processors',
      });
    } catch (error: any) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
      log.error('Failed to process message', error, {
        messageId,
        externalId,
        tenantId,
        duration,
        service: 'integration-processors',
      });

      // Publish message processing failed event
      await this.deps.eventPublisher.publish('message.processing.failed', tenantId, {
        messageId,
        tenantId,
        integrationId: event.integrationId,
        externalId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Process message attachments
   * Downloads file attachments and creates Document shards for each
   */
  private async processAttachments(
    event: MessageReceivedEvent,
    tenantId: string
  ): Promise<Array<{ type: 'file' | 'image' | 'video' | 'link'; url: string; filename?: string; documentShardId?: string }>> {
    if (!event.attachments || event.attachments.length === 0) {
      return [];
    }

    // Only process file/image/video attachments (not links)
    const fileAttachments = event.attachments.filter(
      (att) => att.type === 'file' || att.type === 'image' || att.type === 'video'
    );

    if (fileAttachments.length === 0) {
      // Return link attachments as-is (no document shard needed)
      return event.attachments
        .filter((att) => att.type === 'link')
        .map((att) => ({
          type: att.type,
          url: att.url,
          filename: att.filename,
        }));
    }

    if (!this.blobStorageService || !this.documentDownloadService) {
      log.warn('Blob storage or download service not available, skipping attachment processing', {
        messageId: event.messageId,
        attachmentCount: fileAttachments.length,
        service: 'integration-processors',
      });
      // Return attachment metadata without document shards
      return event.attachments.map((att) => ({
        type: att.type,
        url: att.url,
        filename: att.filename,
      }));
    }

    const processedAttachments: Array<{
      type: 'file' | 'image' | 'video' | 'link';
      url: string;
      filename?: string;
      documentShardId?: string;
    }> = [];

    // Process file/image/video attachments
    for (const attachment of fileAttachments) {
      try {
        // Download attachment
        const { buffer, contentType } = await this.documentDownloadService.downloadDocument(attachment.url, {
          timeout: 30000,
          maxSize: 50 * 1024 * 1024, // 50 MB
        });

        // Upload to blob storage
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const filename = `${attachment.attachmentId}-${attachment.filename || 'attachment'}`.replace(/[^a-zA-Z0-9.-]/g, '_');
        const blobPath = `${tenantId}/${year}/${month}/${day}/${filename}`;

        const uploadResult = await this.blobStorageService.uploadFile(
          blobPath,
          buffer,
          contentType || attachment.mimeType || 'application/octet-stream'
        );

        // Create Document shard for attachment
        const documentShardResponse = await this.deps.shardManager.post<{ id: string }>(
          '/api/v1/shards',
          {
            tenantId,
            shardTypeId: 'document',
            shardTypeName: 'Document',
            structuredData: {
              id: attachment.attachmentId,
              title: attachment.filename || 'Message Attachment',
              documentType: this.detectDocumentType(contentType || attachment.mimeType || ''),
              mimeType: contentType || attachment.mimeType || 'application/octet-stream',
              size: attachment.size || buffer.length,
              integrationSource: event.integrationSource,
              externalId: attachment.attachmentId,
              externalUrl: attachment.url,
              blobStorageUrl: uploadResult.url,
              blobStorageContainer: this.config.azure?.blob_storage?.containers?.attachments || 'integration-attachments',
              blobStoragePath: blobPath,
              createdAt: new Date().toISOString(),
              modifiedAt: new Date().toISOString(),
              lastSyncedAt: new Date().toISOString(),
              syncStatus: 'synced',
              processingStatus: 'pending', // Text extraction pending
              textExtractionCompleted: false,
              analysisCompleted: false,
              vectorizationCompleted: false,
            },
          },
          {
            headers: {
              'X-Tenant-ID': tenantId,
            },
          }
        );

        processedAttachments.push({
          type: attachment.type,
          url: attachment.url,
          filename: attachment.filename,
          documentShardId: documentShardResponse.id,
        });

        log.debug('Attachment processed and document shard created', {
          messageId: event.messageId,
          attachmentId: attachment.attachmentId,
          documentShardId: documentShardResponse.id,
          service: 'integration-processors',
        });
      } catch (error: any) {
        log.warn('Failed to process attachment, continuing with metadata only', {
          messageId: event.messageId,
          attachmentId: attachment.attachmentId,
          filename: attachment.filename,
          error: error.message,
          service: 'integration-processors',
        });

        // Add attachment metadata without document shard
        processedAttachments.push({
          type: attachment.type,
          url: attachment.url,
          filename: attachment.filename,
        });
      }
    }

    // Add link attachments (no processing needed)
    const linkAttachments = event.attachments.filter((att) => att.type === 'link');
    for (const link of linkAttachments) {
      processedAttachments.push({
        type: link.type,
        url: link.url,
        filename: link.filename,
      });
    }

    return processedAttachments;
  }

  /**
   * Classify channel type based on channel ID and name
   */
  private classifyChannelType(channelId: string, channelName?: string): 'dm' | 'group_dm' | 'public_channel' | 'private_channel' {
    // Simple heuristics - can be enhanced with actual channel metadata
    if (!channelName) {
      return 'private_channel'; // Default to private if unknown
    }

    const nameLower = channelName.toLowerCase();

    // DM channels typically start with 'D' in Slack or have specific patterns
    if (channelId.startsWith('D') || nameLower.includes('direct message')) {
      return 'dm';
    }

    // Group DM channels
    if (channelId.startsWith('G') || nameLower.includes('group')) {
      return 'group_dm';
    }

    // Public channels typically don't have special prefixes
    if (channelId.startsWith('C') || !channelId.startsWith('G')) {
      return 'public_channel';
    }

    // Default to private
    return 'private_channel';
  }

  /**
   * Detect document type from MIME type
   */
  private detectDocumentType(mimeType: string): 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt' | 'html' | 'image' | 'other' {
    const mimeTypeLower = mimeType.toLowerCase();

    if (mimeTypeLower.includes('pdf')) return 'pdf';
    if (mimeTypeLower.includes('wordprocessingml') || mimeTypeLower.includes('msword')) return 'docx';
    if (mimeTypeLower.includes('spreadsheetml') || mimeTypeLower.includes('excel')) return 'xlsx';
    if (mimeTypeLower.includes('presentationml') || mimeTypeLower.includes('powerpoint')) return 'pptx';
    if (mimeTypeLower.includes('text/plain')) return 'txt';
    if (mimeTypeLower.includes('text/html') || mimeTypeLower.includes('html')) return 'html';
    if (mimeTypeLower.startsWith('image/')) return 'image';

    return 'other';
  }
}

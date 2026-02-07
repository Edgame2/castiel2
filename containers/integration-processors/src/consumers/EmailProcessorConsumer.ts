/**
 * Email Processor Consumer
 * Consumes integration.email.received events, parses email metadata, processes attachments, and creates Email shards
 * @module integration-processors/consumers
 */

import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { BaseConsumer, ConsumerDependencies } from './index.js';
import { BlobStorageService } from '../services/BlobStorageService.js';
import { DocumentDownloadService } from '../services/DocumentDownloadService.js';
import { EmailStructuredData } from '@coder/shared/types/shards';

interface EmailReceivedEvent {
  integrationId: string;
  tenantId: string;
  emailId: string;
  externalId: string;
  threadId: string;
  messageId?: string;
  subject: string;
  from: {
    email: string;
    name?: string;
  };
  to: Array<{
    email: string;
    name?: string;
  }>;
  cc?: Array<{
    email: string;
    name?: string;
  }>;
  bcc?: Array<{
    email: string;
    name?: string;
  }>;
  bodyHtml?: string;
  bodyPlainText: string;
  snippet?: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    url: string;
    attachmentId: string;
  }>;
  isRead?: boolean;
  isImportant?: boolean;
  isFlagged?: boolean;
  isReply?: boolean;
  inReplyTo?: string;
  labels?: string[];
  categories?: string[];
  sentAt: string; // ISO date-time string
  receivedAt?: string; // ISO date-time string
  integrationSource: 'gmail' | 'outlook' | 'exchange';
  syncTaskId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Email Processor Consumer
 * Processes emails from integrations (Gmail, Outlook, Exchange)
 */
export class EmailProcessorConsumer implements BaseConsumer {
  private consumer: EventConsumer | null = null;
  private config: ReturnType<typeof loadConfig>;
  private blobStorageService: BlobStorageService | null = null;
  private documentDownloadService: DocumentDownloadService;
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
  }

  async start(): Promise<void> {
    if (!this.config.rabbitmq?.url) {
      log.warn('RabbitMQ URL not configured, email processor consumer disabled', {
        service: 'integration-processors',
      });
      return;
    }

    try {
      this.consumer = new EventConsumer({
        url: this.config.rabbitmq.url,
        exchange: this.config.rabbitmq.exchange || 'coder_events',
        queue: 'integration_communications',
        routingKeys: ['integration.email.received'],
        prefetch: 10, // Medium prefetch for email processing
      });

      // Handle email received events
      this.consumer.on('integration.email.received', async (event) => {
        await this.handleEmailReceivedEvent(event.data as EmailReceivedEvent);
      });

      await this.consumer.connect();
      await this.consumer.start();

      log.info('Email processor consumer started', {
        queue: 'integration_communications',
        service: 'integration-processors',
      });
    } catch (error: any) {
      log.error('Failed to start email processor consumer', error, {
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
   * Handle email received event
   */
  private async handleEmailReceivedEvent(event: EmailReceivedEvent): Promise<void> {
    const startTime = process.hrtime.bigint();
    const { tenantId, emailId, externalId } = event;

    try {
      log.info('Processing email', {
        emailId,
        externalId,
        tenantId,
        subject: event.subject,
        service: 'integration-processors',
      });

      // Step 1: Process attachments (if any)
      const processedAttachments = await this.processAttachments(event, tenantId);

      // Step 2: Extract plain text from HTML if needed
      const bodyPlainText = event.bodyPlainText || this.extractPlainTextFromHtml(event.bodyHtml || '');

      // Step 3: Generate snippet if not provided
      const snippet = event.snippet || this.generateSnippet(bodyPlainText);

      // Step 4: Create Email shard
      const structuredData: EmailStructuredData = {
        id: externalId,
        subject: event.subject,
        threadId: event.threadId,
        messageId: event.messageId,
        integrationSource: event.integrationSource,
        externalId: externalId,
        from: {
          email: event.from.email,
          name: event.from.name,
        },
        to: event.to.map((p) => ({
          email: p.email,
          name: p.name,
        })),
        cc: event.cc?.map((p) => ({
          email: p.email,
          name: p.name,
        })),
        bcc: event.bcc?.map((p) => ({
          email: p.email,
          name: p.name,
        })),
        bodyHtml: event.bodyHtml,
        bodyPlainText: bodyPlainText,
        snippet: snippet,
        hasAttachments: processedAttachments.length > 0,
        attachmentCount: processedAttachments.length,
        attachments: processedAttachments,
        isRead: event.isRead,
        isImportant: event.isImportant,
        isFlagged: event.isFlagged,
        isReply: event.isReply,
        inReplyTo: event.inReplyTo,
        labels: event.labels,
        categories: event.categories,
        sentAt: event.sentAt,
        receivedAt: event.receivedAt || new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'synced',
        processingStatus: 'processing', // Content analysis pending
      };

      // Step 5: Create shard via shard-manager API
      const shardResponse = await this.deps.shardManager.post<{ id: string }>(
        '/api/v1/shards',
        {
          tenantId,
          shardTypeId: 'email',
          shardTypeName: 'Email',
          structuredData,
        },
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const shardId = shardResponse.id;

      log.info('Email shard created', {
        emailId,
        shardId,
        tenantId,
        service: 'integration-processors',
      });

      // Step 6: Publish shard.created event (triggers vectorization and entity linking)
      await this.deps.eventPublisher.publish('shard.created', tenantId, {
        shardId,
        tenantId,
        shardTypeId: 'email',
        shardTypeName: 'Email',
        structuredData,
      });

      // Step 7: Publish email.processed event
      await this.deps.eventPublisher.publish('email.processed', tenantId, {
        emailId,
        shardId,
        tenantId,
        integrationId: event.integrationId,
        externalId,
        subject: event.subject,
        threadId: event.threadId,
        attachmentCount: processedAttachments.length,
        processingStatus: 'processing', // Content analysis pending
      });

      const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
      log.info('Email processed successfully', {
        emailId,
        shardId,
        duration,
        service: 'integration-processors',
      });
    } catch (error: any) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
      log.error('Failed to process email', error, {
        emailId,
        externalId,
        tenantId,
        duration,
        service: 'integration-processors',
      });

      // Publish email processing failed event
      await this.deps.eventPublisher.publish('email.processing.failed', tenantId, {
        emailId,
        tenantId,
        integrationId: event.integrationId,
        externalId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Process email attachments
   * Downloads attachments and creates Document shards for each
   */
  private async processAttachments(
    event: EmailReceivedEvent,
    tenantId: string
  ): Promise<Array<{ filename: string; mimeType: string; size: number; documentShardId?: string }>> {
    if (!event.attachments || event.attachments.length === 0) {
      return [];
    }

    if (!this.blobStorageService || !this.documentDownloadService) {
      log.warn('Blob storage or download service not available, skipping attachment processing', {
        emailId: event.emailId,
        attachmentCount: event.attachments.length,
        service: 'integration-processors',
      });
      // Return attachment metadata without document shards
      return event.attachments.map((att) => ({
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
      }));
    }

    const processedAttachments: Array<{
      filename: string;
      mimeType: string;
      size: number;
      documentShardId?: string;
    }> = [];

    for (const attachment of event.attachments) {
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
        const filename = `${attachment.attachmentId}-${attachment.filename}`.replace(/[^a-zA-Z0-9.-]/g, '_');
        const blobPath = `${tenantId}/${year}/${month}/${day}/${filename}`;

        const uploadResult = await this.blobStorageService.uploadFile(blobPath, buffer, contentType || attachment.mimeType);

        // Create Document shard for attachment
        const documentShardResponse = await this.deps.shardManager.post<{ id: string }>(
          '/api/v1/shards',
          {
            tenantId,
            shardTypeId: 'document',
            shardTypeName: 'Document',
            structuredData: {
              id: attachment.attachmentId,
              title: attachment.filename,
              documentType: this.detectDocumentType(contentType || attachment.mimeType),
              mimeType: contentType || attachment.mimeType,
              size: attachment.size,
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
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
          documentShardId: documentShardResponse.id,
        });

        log.debug('Attachment processed and document shard created', {
          emailId: event.emailId,
          attachmentId: attachment.attachmentId,
          documentShardId: documentShardResponse.id,
          service: 'integration-processors',
        });
      } catch (error: any) {
        log.warn('Failed to process attachment, continuing with metadata only', {
          emailId: event.emailId,
          attachmentId: attachment.attachmentId,
          filename: attachment.filename,
          error: error.message,
          service: 'integration-processors',
        });

        // Add attachment metadata without document shard
        processedAttachments.push({
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
        });
      }
    }

    return processedAttachments;
  }

  /**
   * Extract plain text from HTML
   */
  private extractPlainTextFromHtml(html: string): string {
    if (!html) {
      return '';
    }

    // Simple HTML tag removal (for better extraction, consider using cheerio)
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Generate snippet from text (first 100 characters)
   */
  private generateSnippet(text: string): string {
    if (!text) {
      return '';
    }
    return text.substring(0, 100).trim();
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

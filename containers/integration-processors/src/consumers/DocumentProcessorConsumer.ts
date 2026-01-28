/**
 * Document Processor Consumer
 * Consumes integration.document.detected events, downloads documents, stores in Azure Blob, extracts text, and creates Document shards
 * @module integration-processors/consumers
 */

import { EventConsumer, ServiceClient, EventPublisher, EntityLinkingService } from '@coder/shared';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { BaseConsumer, ConsumerDependencies } from './index';
import { BlobStorageService } from '../services/BlobStorageService';
import { DocumentDownloadService } from '../services/DocumentDownloadService';
import { TextExtractionService } from '../services/TextExtractionService';
import { DocumentStructuredData } from '@coder/shared/types/shards';

interface DocumentDetectedEvent {
  integrationId: string;
  tenantId: string;
  documentId: string;
  externalId: string;
  externalUrl: string;
  title: string;
  mimeType: string;
  size: number;
  integrationSource: 'google_drive' | 'sharepoint' | 'dropbox' | 'onedrive' | 'box';
  sourcePath?: string;
  parentFolderId?: string;
  parentFolderName?: string;
  createdBy?: string;
  modifiedBy?: string;
  createdAt?: string;
  modifiedAt?: string;
  syncTaskId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Document Processor Consumer
 * Processes documents from integrations (Google Drive, SharePoint, etc.)
 */
export class DocumentProcessorConsumer implements BaseConsumer {
  private consumer: EventConsumer | null = null;
  private config: ReturnType<typeof loadConfig>;
  private blobStorageService: BlobStorageService | null = null;
  private documentDownloadService: DocumentDownloadService;
  private entityLinkingService: EntityLinkingService | null = null;

  constructor(private deps: ConsumerDependencies) {
    this.config = loadConfig();
    this.documentDownloadService = new DocumentDownloadService();
    this.textExtractionService = new TextExtractionService();

    // Initialize blob storage service if configured
    if (this.config.azure?.blob_storage?.connection_string) {
      const containerName = this.config.azure.blob_storage.containers?.documents || 'integration-documents';
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
      log.warn('RabbitMQ URL not configured, document processor consumer disabled', {
        service: 'integration-processors',
      });
      return;
    }

    if (!this.blobStorageService) {
      log.warn('Azure Blob Storage not configured, document processor consumer disabled', {
        service: 'integration-processors',
      });
      return;
    }

    try {
      this.consumer = new EventConsumer({
        url: this.config.rabbitmq.url,
        exchange: this.config.rabbitmq.exchange || 'coder_events',
        queue: 'integration_documents',
        routingKeys: ['integration.document.detected'],
        prefetch: 5, // Lower prefetch for heavy processing
      });

      // Handle document detected events
      this.consumer.on('integration.document.detected', async (event) => {
        await this.handleDocumentDetectedEvent(event as any);
      });

      await this.consumer.start();

      log.info('Document processor consumer started', {
        queue: this.config.rabbitmq.queue || 'integration_documents',
        service: 'integration-processors',
      });
    } catch (error: any) {
      log.error('Failed to start document processor consumer', error, {
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
   * Handle document detected event
   */
  private async handleDocumentDetectedEvent(event: DocumentDetectedEvent): Promise<void> {
    const startTime = process.hrtime.bigint();
    const { tenantId, documentId, externalId, externalUrl } = event;

    try {
      log.info('Processing document', {
        documentId,
        externalId,
        tenantId,
        service: 'integration-processors',
      });

      // Step 1: Download document from external URL
      const { buffer, contentType, size } = await this.documentDownloadService.downloadDocument(externalUrl, {
        timeout: 30000, // 30 seconds
        maxSize: 50 * 1024 * 1024, // 50 MB
      });

      log.debug('Document downloaded', {
        documentId,
        size,
        contentType,
        service: 'integration-processors',
      });

      // Step 2: Upload to Azure Blob Storage
      if (!this.blobStorageService) {
        throw new Error('Blob storage service not initialized');
      }

      // Generate blob path: tenantId/year/month/day/documentId-filename
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const filename = `${externalId}-${event.title || 'document'}`.replace(/[^a-zA-Z0-9.-]/g, '_');
      const blobPath = `${tenantId}/${year}/${month}/${day}/${filename}`;

      const uploadResult = await this.blobStorageService.uploadFile(blobPath, buffer, contentType);

      log.debug('Document uploaded to blob storage', {
        documentId,
        blobPath: uploadResult.path,
        blobUrl: uploadResult.url,
        service: 'integration-processors',
      });

      // Step 3: Extract text from document
      let extractedText: string | undefined;
      let extractedTextLength: number | undefined;
      let wordCount: number | undefined;
      let pageCount: number | undefined;
      let textExtractionCompleted = false;
      let textExtractionError: string | undefined;

      try {
        const documentType = this.detectDocumentType(contentType);
        const extractionResult = await this.textExtractionService.extractText(buffer, contentType, documentType);

        extractedText = extractionResult.text;
        extractedTextLength = extractionResult.text.length;
        wordCount = extractionResult.wordCount;
        pageCount = extractionResult.pageCount;
        textExtractionCompleted = true;

        log.debug('Text extracted from document', {
          documentId,
          documentType,
          textLength: extractedTextLength,
          wordCount,
          pageCount,
          service: 'integration-processors',
        });
      } catch (error: any) {
        textExtractionError = error.message;
        log.warn('Text extraction failed, continuing with metadata only', {
          documentId,
          error: textExtractionError,
          service: 'integration-processors',
        });
        // Continue processing even if text extraction fails
      }

      // Step 4: Create Document shard with extracted text and metadata
      const structuredData: DocumentStructuredData = {
        id: externalId,
        title: event.title,
        documentType: this.detectDocumentType(contentType),
        mimeType: contentType,
        size: size,
        integrationSource: event.integrationSource,
        externalId: externalId,
        externalUrl: externalUrl,
        sourcePath: event.sourcePath,
        parentFolderId: event.parentFolderId,
        parentFolderName: event.parentFolderName,
        blobStorageUrl: uploadResult.url,
        blobStorageContainer: this.config.azure?.blob_storage?.containers?.documents || 'integration-documents',
        blobStoragePath: blobPath,
        createdAt: event.createdAt || new Date().toISOString(),
        modifiedAt: event.modifiedAt || new Date().toISOString(),
        createdBy: event.createdBy,
        modifiedBy: event.modifiedBy,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'synced',
        processingStatus: 'pending', // Will be updated after text extraction and analysis
        textExtractionCompleted: false,
        analysisCompleted: false,
        vectorizationCompleted: false,
      };

      // Step 5: Create shard via shard-manager API
      const shardResponse = await this.deps.shardManager.post<{ id: string }>(
        '/api/v1/shards',
        {
          tenantId,
          shardTypeId: 'document',
          shardTypeName: 'Document',
          structuredData,
        },
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const shardId = shardResponse.id;

      log.info('Document shard created', {
        documentId,
        shardId,
        tenantId,
        service: 'integration-processors',
      });

      // Step 6: Publish shard.created event (triggers vectorization and entity linking)
      await this.deps.eventPublisher.publish('shard.created', tenantId, {
        shardId,
        tenantId,
        shardTypeId: 'document',
        shardTypeName: 'Document',
        structuredData,
      });

      // Step 7: Publish document.processed event
      await this.deps.eventPublisher.publish('document.processed', tenantId, {
        documentId,
        shardId,
        tenantId,
        integrationId: event.integrationId,
        externalId,
        blobPath: uploadResult.path,
        blobUrl: uploadResult.url,
        size,
        mimeType: contentType,
        textExtracted: textExtractionCompleted,
        textLength: extractedTextLength,
        wordCount,
        pageCount,
        processingStatus: textExtractionCompleted ? 'processing' : 'pending', // 'processing' if text extracted, 'pending' if failed
        textExtractionError,
      });

      const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
      log.info('Document processed successfully', {
        documentId,
        shardId,
        duration,
        service: 'integration-processors',
      });
    } catch (error: any) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
      log.error('Failed to process document', error, {
        documentId,
        externalId,
        tenantId,
        duration,
        service: 'integration-processors',
      });

      // Publish document processing failed event
      await this.deps.eventPublisher.publish('document.processing.failed', tenantId, {
        documentId,
        tenantId,
        integrationId: event.integrationId,
        externalId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Detect document type from MIME type
   */
  private detectDocumentType(mimeType: string): DocumentStructuredData['documentType'] {
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

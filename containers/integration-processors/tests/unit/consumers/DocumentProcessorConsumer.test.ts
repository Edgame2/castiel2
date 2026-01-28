/**
 * Document Processor Consumer Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentProcessorConsumer } from '../../../src/consumers/DocumentProcessorConsumer';
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
        integration_documents: 'integration_documents',
      },
    },
    azure: {
      blob_storage: {
        connection_string: 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net',
        containers: {
          documents: 'integration-documents',
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
  BlobStorageService: vi.fn().mockImplementation(() => ({
    uploadFile: vi.fn(),
    ensureContainer: vi.fn(),
  })),
}));

vi.mock('../../../src/services/DocumentDownloadService', () => ({
  DocumentDownloadService: vi.fn().mockImplementation(() => ({
    downloadDocument: vi.fn(),
  })),
}));

vi.mock('../../../src/services/TextExtractionService', () => ({
  TextExtractionService: vi.fn().mockImplementation(() => ({
    extractText: vi.fn(),
  })),
}));

describe('DocumentProcessorConsumer', () => {
  let consumer: DocumentProcessorConsumer;
  let mockShardManager: any;
  let mockEventPublisher: any;
  let mockBlobStorageService: any;
  let mockDocumentDownloadService: any;
  let mockTextExtractionService: any;

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

    mockTextExtractionService = {
      extractText: vi.fn(),
    };

    const deps = {
      shardManager: mockShardManager as ServiceClient,
      eventPublisher: mockEventPublisher as EventPublisher,
      integrationManager: {} as ServiceClient,
      aiService: {} as ServiceClient,
    };

    consumer = new DocumentProcessorConsumer(deps);
    // Access private services for testing
    (consumer as any).blobStorageService = mockBlobStorageService;
    (consumer as any).documentDownloadService = mockDocumentDownloadService;
    (consumer as any).textExtractionService = mockTextExtractionService;
  });

  describe('handleDocumentDetectedEvent', () => {
    it('should process document successfully with text extraction', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        documentId: 'doc-123',
        externalId: 'ext-123',
        externalUrl: 'https://example.com/document.pdf',
        title: 'Test Document',
        mimeType: 'application/pdf',
        size: 1024,
        integrationSource: 'google_drive' as const,
        sourcePath: '/folder/document.pdf',
        createdAt: '2026-01-27T10:00:00Z',
        modifiedAt: '2026-01-27T10:00:00Z',
      };

      const mockBuffer = Buffer.from('test document content');
      const mockContentType = 'application/pdf';

      // Mock download
      mockDocumentDownloadService.downloadDocument.mockResolvedValue({
        buffer: mockBuffer,
        contentType: mockContentType,
        size: 1024,
      });

      // Mock blob upload
      mockBlobStorageService.uploadFile.mockResolvedValue({
        path: 'tenant-123/2026/01/27/ext-123-Test_Document',
        url: 'https://storage.azure.com/container/tenant-123/2026/01/27/ext-123-Test_Document',
      });

      // Mock text extraction
      mockTextExtractionService.extractText.mockResolvedValue({
        text: 'Extracted text content',
        wordCount: 3,
        pageCount: 1,
      });

      // Mock shard creation
      mockShardManager.post.mockResolvedValue({ id: 'shard-123' });

      await (consumer as any).handleDocumentDetectedEvent(event);

      // Verify document was downloaded
      expect(mockDocumentDownloadService.downloadDocument).toHaveBeenCalledWith(
        'https://example.com/document.pdf',
        {
          timeout: 30000,
          maxSize: 50 * 1024 * 1024,
        }
      );

      // Verify blob was uploaded
      expect(mockBlobStorageService.uploadFile).toHaveBeenCalledWith(
        expect.stringMatching(/^tenant-123\/\d{4}\/\d{2}\/\d{2}\/ext-123-Test_Document$/),
        mockBuffer,
        mockContentType
      );

      // Verify text was extracted
      expect(mockTextExtractionService.extractText).toHaveBeenCalledWith(
        mockBuffer,
        mockContentType,
        'pdf'
      );

      // Verify shard was created
      expect(mockShardManager.post).toHaveBeenCalledWith(
        '/api/v1/shards',
        expect.objectContaining({
          tenantId: 'tenant-123',
          shardTypeId: 'document',
          shardTypeName: 'Document',
          structuredData: expect.objectContaining({
            id: 'ext-123',
            title: 'Test Document',
            documentType: 'pdf',
            mimeType: mockContentType,
            size: 1024,
            integrationSource: 'google_drive',
            blobStorageUrl: expect.any(String),
          }),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-ID': 'tenant-123',
          }),
        })
      );

      // Verify events were published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'shard.created',
        'tenant-123',
        expect.objectContaining({
          shardId: 'shard-123',
          shardTypeId: 'document',
        }),
        expect.any(Object)
      );

      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'document.processed',
        'tenant-123',
        expect.objectContaining({
          documentId: 'doc-123',
          shardId: 'shard-123',
          textExtracted: true,
          processingStatus: 'processing',
        }),
        expect.any(Object)
      );
    });

    it('should handle text extraction failure gracefully', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        documentId: 'doc-123',
        externalId: 'ext-123',
        externalUrl: 'https://example.com/document.pdf',
        title: 'Test Document',
        mimeType: 'application/pdf',
        size: 1024,
        integrationSource: 'google_drive' as const,
      };

      const mockBuffer = Buffer.from('test content');
      const mockContentType = 'application/pdf';

      mockDocumentDownloadService.downloadDocument.mockResolvedValue({
        buffer: mockBuffer,
        contentType: mockContentType,
        size: 1024,
      });

      mockBlobStorageService.uploadFile.mockResolvedValue({
        path: 'tenant-123/2026/01/27/ext-123-Test_Document',
        url: 'https://storage.azure.com/container/tenant-123/2026/01/27/ext-123-Test_Document',
      });

      // Mock text extraction failure
      const extractionError = new Error('Text extraction failed');
      mockTextExtractionService.extractText.mockRejectedValue(extractionError);

      mockShardManager.post.mockResolvedValue({ id: 'shard-123' });

      await (consumer as any).handleDocumentDetectedEvent(event);

      // Verify shard was still created (processing continues despite extraction failure)
      expect(mockShardManager.post).toHaveBeenCalled();

      // Verify document.processed event indicates extraction failure
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'document.processed',
        'tenant-123',
        expect.objectContaining({
          textExtracted: false,
          processingStatus: 'pending',
          textExtractionError: 'Text extraction failed',
        }),
        expect.any(Object)
      );
    });

    it('should handle download failure and publish failed event', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        documentId: 'doc-123',
        externalId: 'ext-123',
        externalUrl: 'https://example.com/document.pdf',
        title: 'Test Document',
        mimeType: 'application/pdf',
        size: 1024,
        integrationSource: 'google_drive' as const,
      };

      const downloadError = new Error('Download failed');
      mockDocumentDownloadService.downloadDocument.mockRejectedValue(downloadError);

      await expect((consumer as any).handleDocumentDetectedEvent(event)).rejects.toThrow();

      // Verify failed event was published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'document.processing.failed',
        'tenant-123',
        expect.objectContaining({
          documentId: 'doc-123',
          externalId: 'ext-123',
          error: 'Download failed',
        }),
        expect.any(Object)
      );
    });

    it('should handle blob upload failure', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        documentId: 'doc-123',
        externalId: 'ext-123',
        externalUrl: 'https://example.com/document.pdf',
        title: 'Test Document',
        mimeType: 'application/pdf',
        size: 1024,
        integrationSource: 'google_drive' as const,
      };

      const mockBuffer = Buffer.from('test content');
      mockDocumentDownloadService.downloadDocument.mockResolvedValue({
        buffer: mockBuffer,
        contentType: 'application/pdf',
        size: 1024,
      });

      const uploadError = new Error('Blob upload failed');
      mockBlobStorageService.uploadFile.mockRejectedValue(uploadError);

      await expect((consumer as any).handleDocumentDetectedEvent(event)).rejects.toThrow();

      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'document.processing.failed',
        'tenant-123',
        expect.objectContaining({
          error: 'Blob upload failed',
        }),
        expect.any(Object)
      );
    });

    it('should handle shard creation failure', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        documentId: 'doc-123',
        externalId: 'ext-123',
        externalUrl: 'https://example.com/document.pdf',
        title: 'Test Document',
        mimeType: 'application/pdf',
        size: 1024,
        integrationSource: 'google_drive' as const,
      };

      const mockBuffer = Buffer.from('test content');
      mockDocumentDownloadService.downloadDocument.mockResolvedValue({
        buffer: mockBuffer,
        contentType: 'application/pdf',
        size: 1024,
      });

      mockBlobStorageService.uploadFile.mockResolvedValue({
        path: 'tenant-123/2026/01/27/ext-123-Test_Document',
        url: 'https://storage.azure.com/container/tenant-123/2026/01/27/ext-123-Test_Document',
      });

      mockTextExtractionService.extractText.mockResolvedValue({
        text: 'Extracted text',
        wordCount: 2,
      });

      const shardError = new Error('Shard creation failed');
      mockShardManager.post.mockRejectedValue(shardError);

      await expect((consumer as any).handleDocumentDetectedEvent(event)).rejects.toThrow();

      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'document.processing.failed',
        'tenant-123',
        expect.objectContaining({
          error: 'Shard creation failed',
        }),
        expect.any(Object)
      );
    });

    it('should detect document type correctly', async () => {
      const testCases = [
        { mimeType: 'application/pdf', expected: 'pdf' },
        { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', expected: 'docx' },
        { mimeType: 'application/vnd.ms-excel', expected: 'xlsx' },
        { mimeType: 'text/plain', expected: 'txt' },
        { mimeType: 'text/html', expected: 'html' },
        { mimeType: 'image/png', expected: 'image' },
        { mimeType: 'application/octet-stream', expected: 'other' },
      ];

      for (const testCase of testCases) {
        const detectedType = (consumer as any).detectDocumentType(testCase.mimeType);
        expect(detectedType).toBe(testCase.expected);
      }
    });
  });
});

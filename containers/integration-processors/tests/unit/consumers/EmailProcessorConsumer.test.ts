/**
 * Email Processor Consumer Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailProcessorConsumer } from '../../../src/consumers/EmailProcessorConsumer';
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
        integration_communications: 'integration_communications',
      },
    },
    azure: {
      blob_storage: {
        connection_string: 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net',
        containers: {
          attachments: 'integration-attachments',
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

describe('EmailProcessorConsumer', () => {
  let consumer: EmailProcessorConsumer;
  let mockShardManager: any;
  let mockEventPublisher: any;
  let mockBlobStorageService: any;
  let mockDocumentDownloadService: any;

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

    const deps = {
      shardManager: mockShardManager as ServiceClient,
      eventPublisher: mockEventPublisher as EventPublisher,
      integrationManager: {} as ServiceClient,
      aiService: {} as ServiceClient,
    };

    consumer = new EmailProcessorConsumer(deps);
    // Access private services for testing
    (consumer as any).blobStorageService = mockBlobStorageService;
    (consumer as any).documentDownloadService = mockDocumentDownloadService;
  });

  describe('handleEmailReceivedEvent', () => {
    it('should process email successfully without attachments', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        emailId: 'email-123',
        externalId: 'ext-123',
        threadId: 'thread-123',
        messageId: 'msg-123',
        subject: 'Test Email',
        from: { email: 'sender@example.com', name: 'Sender' },
        to: [{ email: 'recipient@example.com', name: 'Recipient' }],
        bodyPlainText: 'Test email body',
        sentAt: '2026-01-27T10:00:00Z',
        receivedAt: '2026-01-27T10:01:00Z',
        integrationSource: 'gmail' as const,
      };

      mockShardManager.post.mockResolvedValue({ id: 'shard-123' });

      await (consumer as any).handleEmailReceivedEvent(event);

      // Verify shard was created
      expect(mockShardManager.post).toHaveBeenCalledWith(
        '/api/v1/shards',
        expect.objectContaining({
          tenantId: 'tenant-123',
          shardTypeId: 'email',
          shardTypeName: 'Email',
          structuredData: expect.objectContaining({
            id: 'ext-123',
            subject: 'Test Email',
            threadId: 'thread-123',
            from: { email: 'sender@example.com', name: 'Sender' },
            bodyPlainText: 'Test email body',
            hasAttachments: false,
            attachmentCount: 0,
          }),
        }),
        expect.any(Object)
      );

      // Verify events were published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'shard.created',
        'tenant-123',
        expect.objectContaining({
          shardId: 'shard-123',
          shardTypeId: 'email',
        }),
        expect.any(Object)
      );

      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'email.processed',
        'tenant-123',
        expect.objectContaining({
          emailId: 'email-123',
          shardId: 'shard-123',
          subject: 'Test Email',
          attachmentCount: 0,
        }),
        expect.any(Object)
      );
    });

    it('should process email with HTML body and extract plain text', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        emailId: 'email-123',
        externalId: 'ext-123',
        threadId: 'thread-123',
        subject: 'Test Email',
        from: { email: 'sender@example.com' },
        to: [{ email: 'recipient@example.com' }],
        bodyHtml: '<html><body><p>Test email body</p></body></html>',
        sentAt: '2026-01-27T10:00:00Z',
        integrationSource: 'gmail' as const,
      };

      mockShardManager.post.mockResolvedValue({ id: 'shard-123' });

      await (consumer as any).handleEmailReceivedEvent(event);

      // Verify plain text was extracted from HTML
      const shardCall = mockShardManager.post.mock.calls[0];
      expect(shardCall[1].structuredData.bodyPlainText).toBeTruthy();
      expect(shardCall[1].structuredData.bodyHtml).toBe(event.bodyHtml);
    });

    it('should process email with attachments', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        emailId: 'email-123',
        externalId: 'ext-123',
        threadId: 'thread-123',
        subject: 'Test Email with Attachments',
        from: { email: 'sender@example.com' },
        to: [{ email: 'recipient@example.com' }],
        bodyPlainText: 'Test email body',
        attachments: [
          {
            filename: 'document.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'https://example.com/attachment.pdf',
            attachmentId: 'att-123',
          },
        ],
        sentAt: '2026-01-27T10:00:00Z',
        integrationSource: 'gmail' as const,
      };

      const mockBuffer = Buffer.from('attachment content');
      mockDocumentDownloadService.downloadDocument.mockResolvedValue({
        buffer: mockBuffer,
        contentType: 'application/pdf',
        size: 1024,
      });

      mockBlobStorageService.uploadFile.mockResolvedValue({
        path: 'tenant-123/2026/01/27/att-123-document.pdf',
        url: 'https://storage.azure.com/container/tenant-123/2026/01/27/att-123-document.pdf',
      });

      mockShardManager.post
        .mockResolvedValueOnce({ id: 'doc-shard-123' }) // Document shard for attachment
        .mockResolvedValueOnce({ id: 'email-shard-123' }); // Email shard

      await (consumer as any).handleEmailReceivedEvent(event);

      // Verify attachment was downloaded
      expect(mockDocumentDownloadService.downloadDocument).toHaveBeenCalledWith(
        'https://example.com/attachment.pdf',
        {
          timeout: 30000,
          maxSize: 50 * 1024 * 1024,
        }
      );

      // Verify attachment was uploaded to blob storage
      expect(mockBlobStorageService.uploadFile).toHaveBeenCalled();

      // Verify Document shard was created for attachment
      expect(mockShardManager.post).toHaveBeenCalledWith(
        '/api/v1/shards',
        expect.objectContaining({
          shardTypeId: 'document',
          structuredData: expect.objectContaining({
            id: 'att-123',
            title: 'document.pdf',
          }),
        }),
        expect.any(Object)
      );

      // Verify Email shard includes attachment info
      const emailShardCall = mockShardManager.post.mock.calls.find(
        (call) => call[1].shardTypeId === 'email'
      );
      expect(emailShardCall[1].structuredData.hasAttachments).toBe(true);
      expect(emailShardCall[1].structuredData.attachmentCount).toBe(1);
      expect(emailShardCall[1].structuredData.attachments).toHaveLength(1);
      expect(emailShardCall[1].structuredData.attachments[0].documentShardId).toBe('doc-shard-123');
    });

    it('should generate snippet if not provided', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        emailId: 'email-123',
        externalId: 'ext-123',
        threadId: 'thread-123',
        subject: 'Test Email',
        from: { email: 'sender@example.com' },
        to: [{ email: 'recipient@example.com' }],
        bodyPlainText: 'This is a long email body that should be truncated to create a snippet for preview purposes.',
        sentAt: '2026-01-27T10:00:00Z',
        integrationSource: 'gmail' as const,
      };

      mockShardManager.post.mockResolvedValue({ id: 'shard-123' });

      await (consumer as any).handleEmailReceivedEvent(event);

      const shardCall = mockShardManager.post.mock.calls[0];
      expect(shardCall[1].structuredData.snippet).toBeTruthy();
      expect(shardCall[1].structuredData.snippet.length).toBeLessThanOrEqual(200);
    });

    it('should handle email with CC and BCC', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        emailId: 'email-123',
        externalId: 'ext-123',
        threadId: 'thread-123',
        subject: 'Test Email',
        from: { email: 'sender@example.com' },
        to: [{ email: 'to@example.com' }],
        cc: [{ email: 'cc@example.com', name: 'CC Recipient' }],
        bcc: [{ email: 'bcc@example.com', name: 'BCC Recipient' }],
        bodyPlainText: 'Test email body',
        sentAt: '2026-01-27T10:00:00Z',
        integrationSource: 'gmail' as const,
      };

      mockShardManager.post.mockResolvedValue({ id: 'shard-123' });

      await (consumer as any).handleEmailReceivedEvent(event);

      const shardCall = mockShardManager.post.mock.calls[0];
      expect(shardCall[1].structuredData.cc).toHaveLength(1);
      expect(shardCall[1].structuredData.bcc).toHaveLength(1);
    });

    it('should handle attachment processing failure gracefully', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        emailId: 'email-123',
        externalId: 'ext-123',
        threadId: 'thread-123',
        subject: 'Test Email',
        from: { email: 'sender@example.com' },
        to: [{ email: 'recipient@example.com' }],
        bodyPlainText: 'Test email body',
        attachments: [
          {
            filename: 'document.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'https://example.com/attachment.pdf',
            attachmentId: 'att-123',
          },
        ],
        sentAt: '2026-01-27T10:00:00Z',
        integrationSource: 'gmail' as const,
      };

      // Mock attachment download failure
      mockDocumentDownloadService.downloadDocument.mockRejectedValue(new Error('Download failed'));

      mockShardManager.post.mockResolvedValue({ id: 'email-shard-123' });

      await (consumer as any).handleEmailReceivedEvent(event);

      // Email should still be processed even if attachment fails
      expect(mockShardManager.post).toHaveBeenCalled();
      const emailShardCall = mockShardManager.post.mock.calls.find(
        (call) => call[1].shardTypeId === 'email'
      );
      // Attachment should be included but without documentShardId
      expect(emailShardCall[1].structuredData.attachments[0].documentShardId).toBeUndefined();
    });

    it('should handle shard creation failure and publish failed event', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        emailId: 'email-123',
        externalId: 'ext-123',
        threadId: 'thread-123',
        subject: 'Test Email',
        from: { email: 'sender@example.com' },
        to: [{ email: 'recipient@example.com' }],
        bodyPlainText: 'Test email body',
        sentAt: '2026-01-27T10:00:00Z',
        integrationSource: 'gmail' as const,
      };

      const shardError = new Error('Shard creation failed');
      mockShardManager.post.mockRejectedValue(shardError);

      await expect((consumer as any).handleEmailReceivedEvent(event)).rejects.toThrow();

      // Verify failed event was published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'email.processing.failed',
        'tenant-123',
        expect.objectContaining({
          emailId: 'email-123',
          externalId: 'ext-123',
          error: 'Shard creation failed',
        }),
        expect.any(Object)
      );
    });
  });
});

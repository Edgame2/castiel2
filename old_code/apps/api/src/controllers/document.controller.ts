/**
 * Document Controller
 * Provides document management: metadata CRUD, file upload/download
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import type { Redis } from 'ioredis';
import {
  ShardRepository,
  AuditLogService,
} from '@castiel/api-core';
import { CosmosClient } from '@azure/cosmos';
import { config } from '../config/env.js';
import { SystemConfigRepository } from '../repositories/system-config.repository.js';
import { TenantRepository } from '../repositories/tenant.repository.js';
import { DocumentSettingsService } from '../services/document-settings.service.js';
import { AzureBlobStorageService } from '../services/azure-blob-storage.service.js';
import { DocumentUploadService } from '../services/document-upload.service.js';
import { DocumentValidationService } from '../services/document-validation.service.js';
import { QueueService } from '../services/queue.service.js';
import { DocumentAuditIntegration } from '../services/document-audit-integration.service.js';
import { AuditWebhookEmitter } from '../services/audit-webhook-emitter.service.js';
import type { AuthUser } from '../types/auth.types.js';
import { PermissionLevel } from '../types/shard.types.js';
import type {
  TenantDocumentSettings,
  GlobalDocumentSettings,
  CreateDocumentRequest,
} from '../types/document.types.js';

/**
 * Document Controller
 * Provides document metadata CRUD and file operations
 */
export class DocumentController {
  private shardRepository: ShardRepository;
  private blobStorageService?: AzureBlobStorageService;
  private documentUploadService?: DocumentUploadService;
  private documentSettingsService?: DocumentSettingsService;
  private validationService?: DocumentValidationService;
  private documentAuditIntegration?: DocumentAuditIntegration;

  constructor(
    private readonly monitoring: IMonitoringProvider,
    private readonly auditLogService: AuditLogService,
    blobStorageConfig?: {
      connectionString: string;
      accountName: string;
      accountKey: string;
      documentsContainer: string;
      quarantineContainer: string;
    },
    private readonly webhookEmitter?: AuditWebhookEmitter,
    redis?: Redis
  ) {
    this.shardRepository = new ShardRepository(monitoring);

    // Initialize Settings Service (Cosmos DB)
    if (config.cosmosDb?.endpoint && config.cosmosDb?.key) {
      const cosmosClient = new CosmosClient({
        endpoint: config.cosmosDb.endpoint,
        key: config.cosmosDb.key,
      });
      const database = cosmosClient.database(config.cosmosDb.databaseId);
      const systemConfigRepo = new SystemConfigRepository(database.container('systemConfig'));
      const tenantRepo = new TenantRepository(database.container('tenants'));

      this.documentSettingsService = new DocumentSettingsService(
        systemConfigRepo,
        tenantRepo
      );
    } else {
      monitoring.trackException(new Error('DocumentSettingsService not initialized - Cosmos DB config missing'), {
        component: 'DocumentController',
        operation: 'initialization',
      });
    }

    // Initialize blob storage service if config provided
    if (blobStorageConfig) {
      this.blobStorageService = new AzureBlobStorageService(
        blobStorageConfig,
        monitoring,
        redis
      );
      this.validationService = new DocumentValidationService(monitoring);

      // Initialize Queue service (BullMQ) for async messaging
      let serviceBusService: QueueService | undefined;
      try {
        serviceBusService = new QueueService(monitoring);
      } catch (error) {
        monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
          component: 'DocumentController',
          operation: 'service-bus-initialization',
        });
        serviceBusService = undefined;
      }

      // Only initialize upload service if settings service is available (it might need settings?)
      // Actually upload service uses settings in its methods, so we pass it.
      // Wait, DocumentUploadService constructor doesn't take DocumentSettingsService in the previous file view?
      // Let's check line 76. It takes: blobStorage, validation, shardRepo, auditLog, monitoring.
      // So unrelated.

      this.documentUploadService = new DocumentUploadService(
        this.blobStorageService,
        this.validationService,
        this.shardRepository,
        this.auditLogService,
        monitoring,
        serviceBusService
      );

      // Initialize audit integration
      this.documentAuditIntegration = new DocumentAuditIntegration(
        this.auditLogService,
        this.webhookEmitter
      );
    }

    // Bind methods
    this.getDocument = this.getDocument.bind(this);
    this.updateDocument = this.updateDocument.bind(this);
    this.deleteDocument = this.deleteDocument.bind(this);
    this.restoreDocument = this.restoreDocument.bind(this);
    this.listDocuments = this.listDocuments.bind(this);
    this.uploadDocument = this.uploadDocument.bind(this);
    this.downloadDocument = this.downloadDocument.bind(this);
    this.initializeChunkedUpload = this.initializeChunkedUpload.bind(this);
    this.uploadChunk = this.uploadChunk.bind(this);
    this.completeChunkedUpload = this.completeChunkedUpload.bind(this);
    this.getChunkedUploadStatus = this.getChunkedUploadStatus.bind(this);
  }

  /**
   * Initialize repositories
   */
  async initialize(): Promise<void> {
    await this.shardRepository.ensureContainer();
    this.monitoring.trackTrace('DocumentController initialized', 1);
  }

  /**
   * GET /api/v1/documents/:id
   * Get document metadata
   */
  async getDocument(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auth = (request as any).auth as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { id } = request.params;

      // Get document shard with tenantId for partition key
      const shard = await this.shardRepository.findById(id, auth.tenantId);
      if (!shard) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      // Check ACL permissions
      const permissions = await this.shardRepository.checkPermission(
        id,
        auth.tenantId,
        auth.id
      );

      if (!permissions.hasAccess) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      // Log view event
      try {
        await this.documentAuditIntegration?.logView(
          auth.tenantId,
          auth.id,
          id,
          shard.structuredData?.name || id,
          request.ip,
          request.headers['user-agent'],
        );
      } catch (auditErr: any) {
        this.monitoring.trackMetric('document.audit.error', 1, { event: 'view' });
      }

      reply.status(200).send({
        success: true,
        data: shard,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      this.monitoring.trackMetric('document.get.error', 1, {
        error: errorMessage,
      });

      request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Get document failed');

      reply.status(statusCode || 500).send({
        success: false,
        error: errorMessage || 'Failed to get document',
      });
    }
  }

  /**
   * GET /api/v1/documents
   * List documents (filtered by tenant)
   */
  async listDocuments(
    request: FastifyRequest<{
      Querystring: {
        limit?: string;
        continuationToken?: string;
        shardTypeId?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auth = (request as any).auth as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { limit, continuationToken, shardTypeId } = request.query;

      // Validate and sanitize limit
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const validatedLimit = isNaN(limitNum) || limitNum < 1 ? 50 : Math.min(limitNum, 1000); // Max 1000 items per page

      const result = await this.shardRepository.list({
        filter: {
          tenantId: auth.tenantId,
          shardTypeId: shardTypeId || 'c_document',
        },
        limit: validatedLimit,
        continuationToken,
      });

      reply.status(200).send({
        success: true,
        data: result.shards,
        continuationToken: result.continuationToken,
        hasMore: !!result.continuationToken,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      this.monitoring.trackMetric('document.list.error', 1, {
        error: errorMessage,
      });

      request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'List documents failed');

      reply.status(statusCode || 500).send({
        success: false,
        error: errorMessage || 'Failed to list documents',
      });
    }
  }

  /**
   * PUT /api/v1/documents/:id
   * Update document metadata
   */
  async updateDocument(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        name?: string;
        category?: string;
        tags?: string[];
        description?: string;
        customMetadata?: Record<string, any>;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auth = (request as any).auth as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { id } = request.params;
      const updates = request.body;

      // Get existing document
      const shard = await this.shardRepository.findById(id, auth.tenantId);
      if (!shard) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      // Check write permission
      const permissions = await this.shardRepository.checkPermission(
        id,
        auth.tenantId,
        auth.id
      );

      if (!permissions.hasAccess) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      // Update structured data
      const updatedStructuredData = {
        ...shard.structuredData,
        ...(updates.name && { name: updates.name }),
        ...(updates.category && { category: updates.category }),
        ...(updates.tags && { tags: updates.tags }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.customMetadata && { customMetadata: updates.customMetadata }),
      };

      // Update shard
      const updatedShard = await this.shardRepository.update(id, auth.tenantId, {
        structuredData: updatedStructuredData,
      });

      if (!updatedShard) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      // Log update event
      try {
        const changes: any = {};
        if (updates.name) {changes.name = { new: updates.name, old: shard.structuredData?.name };}
        if (updates.category) {changes.category = { new: updates.category, old: shard.structuredData?.category };}
        if (updates.tags) {changes.tags = { new: updates.tags, old: shard.structuredData?.tags };}
        if (updates.description !== undefined) {changes.description = { new: updates.description, old: shard.structuredData?.description };}

        await this.documentAuditIntegration?.logUpdate(
          auth.tenantId,
          auth.id,
          id,
          updatedShard.structuredData?.name || id,
          changes,
          request.ip,
          request.headers['user-agent'],
        );
      } catch (auditErr: unknown) {
        this.monitoring.trackMetric('document.audit.error', 1, { event: 'update' });
      }

      reply.status(200).send({
        success: true,
        data: updatedShard,
        message: 'Document updated successfully',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      this.monitoring.trackMetric('document.update.error', 1, {
        error: errorMessage,
      });

      request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Document update failed');

      reply.status(statusCode || 500).send({
        success: false,
        error: errorMessage || 'Failed to update document',
      });
    }
  }

  /**
   * DELETE /api/v1/documents/:id
   * Soft delete a document
   */
  async deleteDocument(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auth = (request as any).auth as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { id } = request.params;

      // Get document
      const shard = await this.shardRepository.findById(id, auth.tenantId);
      if (!shard) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      // Check delete permission
      const permissions = await this.shardRepository.checkPermission(
        id,
        auth.tenantId,
        auth.id
      );

      if (!permissions.hasAccess) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      // Soft delete using shardRepository.delete
      await this.shardRepository.delete(id, auth.tenantId, false);

      // Log delete event
      try {
        await this.documentAuditIntegration?.logDelete(
          auth.tenantId,
          auth.id,
          id,
          shard.structuredData?.name || id,
          {
            documentId: id,
            fileName: shard.structuredData?.name || id,
            softDelete: true,
            reason: 'User initiated soft delete',
          },
          request.ip,
          request.headers['user-agent'],
        );
      } catch (auditErr: unknown) {
        this.monitoring.trackMetric('document.audit.error', 1, { event: 'delete' });
      }

      reply.status(200).send({
        success: true,
        message: 'Document deleted successfully (soft delete, can be restored within 30 days)',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      this.monitoring.trackMetric('document.delete.error', 1, {
        error: errorMessage,
      });

      request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Document delete failed');

      reply.status(statusCode || 500).send({
        success: false,
        error: errorMessage || 'Failed to delete document',
      });
    }
  }

  /**
   * POST /api/v1/documents/:id/restore
   * Restore a soft-deleted document
   */
  async restoreDocument(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auth = (request as any).auth as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { id } = request.params;

      // Get document
      const shard = await this.shardRepository.findById(id, auth.tenantId);
      if (!shard) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      // Check permission
      const permissionCheck = await this.shardRepository.checkPermission(
        id,
        auth.tenantId,
        auth.id
      );

      if (!permissionCheck.hasAccess) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      // Check if within retention period
      const structuredData = shard.structuredData as any;
      if (structuredData.deletedAt) {
        const deletedDate = new Date(structuredData.deletedAt);
        // Validate date before using it
        if (isNaN(deletedDate.getTime())) {
          request.log.warn({ deletedAt: structuredData.deletedAt }, 'Invalid deletedAt date');
          return reply.status(400).send({ error: 'Invalid deletedAt date' });
        }
        const daysSinceDeleted = (Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceDeleted > 30) {
          return reply.status(410).send({
            error: 'Document retention period expired (>30 days)'
          });
        }
      }

      const restoredShard = await this.shardRepository.restore(id, auth.tenantId);

      if (!restoredShard) {
        return reply.status(404).send({ error: 'Document not found or not deleted' });
      }

      // Log restore event
      try {
        const fileName = restoredShard.structuredData?.name || restoredShard.id;
        const ipAddress = request.ip || request.headers['x-forwarded-for'] as string || undefined;
        const userAgent = request.headers['user-agent'] || undefined;
        
        await this.documentAuditIntegration?.logRestore(
          auth.tenantId,
          auth.id,
          id,
          fileName,
          ipAddress,
          userAgent
        );
      } catch (auditErr: any) {
        // Log error but don't break restore flow
        this.monitoring.trackException(auditErr as Error, {
          operation: 'document.restore.audit',
          documentId: id,
        });
      }

      reply.status(200).send({
        success: true,
        data: restoredShard,
        message: 'Document restored successfully',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      this.monitoring.trackMetric('document.restore.error', 1, {
        error: errorMessage,
      });

      request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Document restore failed');

      reply.status(statusCode || 500).send({
        success: false,
        error: errorMessage || 'Failed to restore document',
      });
    }
  }

  /**
   * POST /api/v1/documents/upload
   * Upload a document file
   */
  async uploadDocument(
    request: FastifyRequest<{
      Body: {
        name: string;
        description?: string;
        category?: string;
        visibility?: string;
        tags?: string[];
        metadata?: Record<string, any>;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!this.documentUploadService || !this.blobStorageService || !this.documentSettingsService) {
        return reply.status(503).send({
          success: false,
          error: 'Document upload service not configured',
          message: 'Azure Storage connection not configured. Set AZURE_STORAGE_CONNECTION_STRING environment variable.',
        });
      }

      const auth = (request as any).auth as unknown as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      // Get multipart file
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: 'No file provided',
          message: 'Request must include a file in multipart/form-data format',
        });
      }

      // Validate file size before loading into memory (max 500MB to prevent DoS)
      const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
      const fileSize = data.file.bytesRead || 0;
      if (fileSize > MAX_FILE_SIZE) {
        return reply.status(400).send({
          success: false,
          error: 'File too large',
          message: `File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds maximum allowed size of ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`,
        });
      }

      // Convert file stream to buffer
      const fileBuffer = await data.toBuffer();
      
      // Double-check buffer size after loading (defense in depth)
      if (fileBuffer.length > MAX_FILE_SIZE) {
        return reply.status(400).send({
          success: false,
          error: 'File too large',
          message: `File size (${Math.round(fileBuffer.length / 1024 / 1024)}MB) exceeds maximum allowed size of ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`,
        });
      }

      // Extract metadata from form fields or body
      const fields = data.fields as Record<string, any>;

      // Debug logging to check what fields are actually received
      request.log.info({
        msg: 'Document upload fields received',
        fieldKeys: Object.keys(fields),
        projectIdField: fields['projectId'],
        projectIdValue: fields['projectId']?.value
      });

      const metadata: CreateDocumentRequest = {
        name: fields['name']?.value || data.filename,
        description: fields['description']?.value,
        category: fields['category']?.value,
        visibility: (fields['visibility']?.value || 'internal'),
        tags: (() => {
          try {
            return fields['tags']?.value ? JSON.parse(fields['tags'].value) : [];
          } catch (error) {
            request.log.warn({ error, tagsValue: fields['tags']?.value }, 'Failed to parse tags JSON, using empty array');
            return [];
          }
        })(),
        projectId: fields['projectId']?.value,
      };

      request.log.info({ metadata }, 'Extracted metadata for upload');

      // Fetch document settings (dynamic)
      const { tenantSettings, globalSettings } =
        await this.documentSettingsService.getFullConfiguration(auth.tenantId);

      // Upload document
      const result = await this.documentUploadService.uploadDocument(
        {
          fileName: data.filename,
          fileBuffer,
          fileSize: fileBuffer.length,
          mimeType: data.mimetype,
        },
        metadata,
        auth.tenantId,
        auth.id,
        auth.email || '',
        tenantSettings,
        globalSettings
      );

      const documentId = result.shard?.id;

      if (!result.success || !documentId) {
        request.log.warn({ result }, 'Document upload failed');
        return reply.status(400).send({
          success: false,
          error: result.error || 'Unknown upload error (no error message provided)',
          errorCode: result.errorCode || 'UNKNOWN_ERROR',
          details: config.nodeEnv === 'development' ? result : undefined,
        });
      }

      // Log upload event
      try {
        const uploadStartTime = Date.now();
        await this.documentAuditIntegration?.logUpload(
          auth.tenantId,
          auth.id,
          documentId,
          data.filename,
          {
            documentId,
            fileName: data.filename,
            fileSize: fileBuffer.length,
            mimeType: data.mimetype,
            category: metadata.category,
            tags: metadata.tags,
            visibility: metadata.visibility || 'internal',
            uploadDurationMs: Date.now() - uploadStartTime,
          },
          request.ip,
          request.headers['user-agent'],
        );
      } catch (auditErr: any) {
        this.monitoring.trackMetric('document.audit.error', 1, { event: 'upload' });
      }

      this.monitoring.trackMetric('document.upload.success', 1, {
        tenantId: auth.tenantId,
        userId: auth.id,
        fileSize: fileBuffer.length,
      });

      reply.status(201).send({
        success: true,
        data: result.shard,
        message: 'Document uploaded successfully',
      });
    } catch (error: unknown) {
      this.monitoring.trackMetric('document.upload.error', 1);
      if (error instanceof Error) {
        this.monitoring.trackException(error, { context: 'document.upload' });
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: errorMessage,
      });
    }
  }

  /**
   * GET /api/v1/documents/:id/download
   * Generate download URL with SAS token
   */
  async downloadDocument(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!this.blobStorageService) {
        return reply.status(503).send({
          success: false,
          error: 'Document download service not configured',
          message: 'Azure Storage connection not configured. Set AZURE_STORAGE_CONNECTION_STRING environment variable.',
        });
      }

      const auth = (request as any).auth as unknown as AuthUser;
      const { id } = request.params;

      // Get document shard
      const document = await this.shardRepository.findById(id, auth.tenantId);

      if (!document) {
        return reply.status(404).send({
          success: false,
          error: 'Document not found',
        });
      }

      // Check READ permission
      const permissionCheck = await this.shardRepository.checkPermission(
        id,
        auth.tenantId,
        auth.id
      );

      if (!permissionCheck.hasAccess || !permissionCheck.permissions.includes(PermissionLevel.READ)) {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to download this document',
        });
      }

      // Get storage path from document
      const structuredData = document.structuredData as any;
      const storagePath = structuredData.storagePath || structuredData.blobPath;

      if (!storagePath) {
        return reply.status(400).send({
          success: false,
          error: 'Document has no associated file',
          message: 'This document metadata exists but no file is stored',
        });
      }

      // Generate SAS URL (15 minute expiry)
      // If path starts with quarantine/, use the quarantine container
      let containerName = undefined;
      if (storagePath.startsWith('quarantine/')) {
        // The storage path includes 'quarantine/' prefix, which is part of the blob path.
        // However, we need to specify the container name explicitly for the SAS token generation if it differs from default.
        // Our BlobStorageService defaults to 'documents'.
        containerName = config.azureStorage?.quarantineContainer || 'quarantine';
      }

      const { url, expiresAt } = await this.blobStorageService.generateDownloadUrl(
        storagePath,
        containerName,
        15
      );

      // Log download audit event
      try {
        await this.documentAuditIntegration?.logDownload(
          auth.tenantId,
          auth.id,
          id,
          structuredData.name,
          {
            documentId: id,
            fileSize: structuredData.fileSize,
            fileName: structuredData.name,
          },
          request.ip,
          request.headers['user-agent'],
        );

        // Also log the specific event of generating the URL (internal audit)
        await this.auditLogService.log({
          tenantId: auth.tenantId,
          category: 'data_management' as any,
          eventType: 'document_download_url_generated' as any,
          outcome: 'success' as any,
          actorId: auth.id,
          actorEmail: auth.email,
          targetType: 'document',
          targetId: id,
          targetName: structuredData.name,
          message: `Download URL generated for: ${structuredData.name}`,
          details: {
            fileName: structuredData.name,
            fileSize: structuredData.fileSize,
            mimeType: structuredData.mimeType,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
      } catch (auditErr: any) {
        this.monitoring.trackMetric('document.audit.error', 1, { event: 'download' });
      }

      this.monitoring.trackMetric('document.download.success', 1, {
        tenantId: auth.tenantId,
        userId: auth.id,
      });

      reply.status(200).send({
        success: true,
        data: {
          downloadUrl: url,
          expiresAt: expiresAt.toISOString(),
          fileName: structuredData.name,
          fileSize: structuredData.fileSize,
          mimeType: structuredData.mimeType,
        },
        message: 'Download URL generated successfully. Valid for 15 minutes.',
      });
    } catch (error: unknown) {
      this.monitoring.trackMetric('document.download.error', 1);
      if (error instanceof Error) {
        this.monitoring.trackException(error, { context: 'document.download' });
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: errorMessage,
      });
    }
  }

  /**
   * GET /api/v1/documents/settings
   * Get effective settings for current tenant
   */
  async getTenantSettings(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const auth = (request as any).auth as unknown as AuthUser;
    if (!this.documentSettingsService) {
      return reply.status(503).send({ error: 'Settings service not available' });
    }
    const settings = await this.documentSettingsService.getTenantSettings(auth.tenantId);
    reply.send(settings);
  }

  /**
   * PUT /api/v1/documents/settings
   * Update settings for current tenant (Restricted to Tenant Admin)
   */
  async updateTenantSettings(
    request: FastifyRequest<{ Body: Partial<TenantDocumentSettings> }>,
    reply: FastifyReply
  ): Promise<void> {
    const auth = (request as any).auth as unknown as AuthUser;
    if (!this.documentSettingsService) {
      return reply.status(503).send({ error: 'Settings service not available' });
    }

    // Allowed fields for tenant admins to modify
    const allowedUpdates: Partial<TenantDocumentSettings> = {
      blockedMimeTypes: request.body.blockedMimeTypes,
      acceptedMimeTypes: request.body.acceptedMimeTypes,
      dailyUploadLimit: request.body.dailyUploadLimit,
      monthlyUploadLimit: request.body.monthlyUploadLimit,
      maxFileSizeBytes: request.body.maxFileSizeBytes,
      enableVirusScanning: request.body.enableVirusScanning,
      defaultVisibility: request.body.defaultVisibility,
      defaultRetentionDays: request.body.defaultRetentionDays,
    };

    const updated = await this.documentSettingsService.updateTenantSettings(
      auth.tenantId,
      allowedUpdates,
      auth.id
    );
    reply.send(updated);
  }

  /**
   * GET /api/v1/admin/documents/settings/global
   * Get global settings (Super Admin)
   */
  async getGlobalSettings(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!this.documentSettingsService) {
      return reply.status(503).send({ error: 'Settings service not available' });
    }
    const settings = await this.documentSettingsService.getGlobalSettings();
    reply.send(settings);
  }

  /**
   * PUT /api/v1/admin/documents/settings/global
   * Update global settings (Super Admin)
   */
  async updateGlobalSettings(
    request: FastifyRequest<{ Body: Partial<GlobalDocumentSettings> }>,
    reply: FastifyReply
  ): Promise<void> {
    const auth = (request as any).auth as unknown as AuthUser;
    if (!this.documentSettingsService) {
      return reply.status(503).send({ error: 'Settings service not available' });
    }
    const updated = await this.documentSettingsService.updateGlobalSettings(
      request.body,
      auth.id
    );
    reply.send(updated);
  }

  /**
   * PUT /api/v1/admin/documents/settings/tenants/:tenantId  /**
   * Override tenant settings (Super Admin)
   */
  async updateTenantSettingsOverride(
    request: FastifyRequest<{
      Params: { tenantId: string };
      Body: Partial<TenantDocumentSettings>;
    }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.params;
    const updates = request.body;
    const auth = (request as any).auth as unknown as AuthUser; // Reverted to original auth access

    if (!this.documentSettingsService) {
      return reply.status(503).send({ error: 'Settings service not available' });
    }

    request.log.info({ tenantId, updates }, 'Overriding tenant document settings');

    try {
      const settings = await this.documentSettingsService.updateTenantSettings(
        tenantId,
        updates,
        auth.id
      );
      return reply.send(settings);
    } catch (error) {
      request.log.error(error, 'Failed to override tenant settings');
      return reply.status(500).send({ error: 'Failed to override tenant settings' });
    }
  }

  /**
   * Get tenant settings for override (Super Admin)
   */
  async getTenantSettingsOverride(
    request: FastifyRequest<{
      Params: { tenantId: string };
    }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.params;
    request.log.info({ tenantId }, 'Fetching tenant settings for override');

    if (!this.documentSettingsService) {
      return reply.status(503).send({ error: 'Settings service not available' });
    }

    try {
      const settings = await this.documentSettingsService.getTenantSettings(tenantId);
      return reply.send(settings);
    } catch (error) {
      request.log.error(error, 'Failed to fetch tenant settings');
      return reply.status(500).send({ error: 'Failed to fetch tenant settings' });
    }
  }

  /**
   * POST /api/v1/documents/:id/duplicate
   * Duplicate a document (creates a copy with new metadata)
   */
  async duplicateDocument(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        name?: string;
        description?: string;
        category?: string;
        tags?: string[];
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auth = (request as any).auth as unknown as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { id } = request.params;
      const { name, description, category, tags } = request.body || {};

      // Get source document
      const sourceDocument = await this.shardRepository.findById(id, auth.tenantId);
      if (!sourceDocument) {
        return reply.status(404).send({
          success: false,
          error: 'Document not found',
        });
      }

      // Check READ permission on source
      const sourcePermission = await this.shardRepository.checkPermission(
        id,
        auth.tenantId,
        auth.id
      );

      if (!sourcePermission.hasAccess || !sourcePermission.permissions.includes(PermissionLevel.READ)) {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to duplicate this document',
        });
      }

      // Prepare new document metadata
      const sourceData = sourceDocument.structuredData as any;
      const newName = name || `${sourceData.name || 'Untitled'} (Copy)`;
      
      // Check if name already exists and make it unique
      const existingDocs = await this.shardRepository.list({
        filter: {
          tenantId: auth.tenantId,
          shardTypeId: sourceDocument.shardTypeId,
        },
        limit: 1000,
      });
      
      let finalName = newName;
      const nameExists = existingDocs.shards.some(
        (doc: any) => doc.structuredData?.name === finalName
      );
      
      if (nameExists) {
        // Append number to make unique
        let counter = 1;
        finalName = `${newName} (${counter})`;
        while (existingDocs.shards.some((doc: any) => doc.structuredData?.name === finalName)) {
          counter++;
          finalName = `${newName} (${counter})`;
        }
      }

      // Create duplicate shard (metadata only - file is not duplicated)
      const duplicateShard = await this.shardRepository.create({
        tenantId: auth.tenantId,
        userId: auth.id,
        shardTypeId: sourceDocument.shardTypeId,
        structuredData: {
          ...sourceData,
          name: finalName,
          description: description !== undefined ? description : sourceData.description,
          category: category !== undefined ? category : sourceData.category,
          tags: tags !== undefined ? tags : sourceData.tags,
          duplicatedFrom: {
            documentId: id,
            duplicatedAt: new Date().toISOString(),
            duplicatedBy: auth.id,
          },
          // Don't copy storage path - duplicate is metadata-only
          // User would need to upload a new file or link to same file
          storagePath: undefined,
          blobPath: undefined,
        },
      });

      // Log duplicate event
      try {
        await this.documentAuditIntegration?.logDuplicate(
          auth.tenantId,
          auth.id,
          id,
          duplicateShard.id,
          sourceData.name || 'Untitled',
          finalName,
          request.ip,
          request.headers['user-agent'],
        );
      } catch (auditErr: any) {
        this.monitoring.trackMetric('document.audit.error', 1, { event: 'duplicate' });
      }

      this.monitoring.trackMetric('document.duplicate.success', 1, {
        tenantId: auth.tenantId,
        userId: auth.id,
      });

      reply.status(201).send({
        success: true,
        data: duplicateShard,
        message: 'Document duplicated successfully',
      });
    } catch (error: unknown) {
      this.monitoring.trackMetric('document.duplicate.error', 1);
      if (error instanceof Error) {
        this.monitoring.trackException(error, { context: 'document.duplicate' });
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: errorMessage,
      });
    }
  }

  /**
   * POST /api/v1/documents/upload/chunked/init
   * Initialize chunked upload session for large files (> 100MB)
   */
  async initializeChunkedUpload(
    request: FastifyRequest<{
      Body: {
        fileName: string;
        fileSize: number;
        mimeType: string;
        name: string;
        description?: string;
        category?: string;
        visibility?: string;
        tags?: string[];
        metadata?: Record<string, any>;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!this.documentUploadService || !this.documentSettingsService) {
        return reply.status(503).send({
          success: false,
          error: 'Document upload service not configured',
          message: 'Azure Storage connection not configured. Set AZURE_STORAGE_CONNECTION_STRING environment variable.',
        });
      }

      const auth = (request as any).auth as unknown as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { fileName, fileSize, mimeType, name, description, category, visibility, tags } = request.body;

      // Get tenant and global settings
      const tenantSettings = await this.documentSettingsService.getTenantSettings(auth.tenantId);
      const globalSettings = await this.documentSettingsService.getGlobalSettings();

      // Initialize chunked upload
      const result = await this.documentUploadService.initializeChunkedUpload(
        fileName,
        fileSize,
        mimeType,
        {
          name,
          description,
          category,
          visibility: visibility as any,
          tags,
        },
        auth.tenantId,
        auth.id,
        auth.email || '',
        tenantSettings,
        globalSettings
      );

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error,
          errorCode: result.errorCode,
        });
      }

      return reply.status(201).send({
        success: true,
        sessionId: result.sessionId,
        uploadUrl: result.uploadUrl,
        chunkSize: result.chunkSize,
        totalChunks: result.totalChunks,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
        context: 'document.initialize-chunked-upload',
      });
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: errorMessage,
      });
    }
  }

  /**
   * POST /api/v1/documents/upload/chunked/:sessionId/chunk
   * Upload a single chunk for chunked upload
   */
  async uploadChunk(
    request: FastifyRequest<{
      Params: { sessionId: string };
      Querystring: { chunkNumber: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!this.blobStorageService) {
        return reply.status(503).send({
          success: false,
          error: 'Document upload service not configured',
          message: 'Azure Storage connection not configured.',
        });
      }

      const auth = (request as any).auth as unknown as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { sessionId } = request.params;
      const chunkNumber = parseInt(request.query.chunkNumber, 10);

      if (isNaN(chunkNumber) || chunkNumber < 0) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid chunk number',
          message: 'chunkNumber query parameter must be a non-negative integer',
        });
      }

      // Get multipart file
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: 'No chunk data provided',
          message: 'Request must include chunk data in multipart/form-data format',
        });
      }

      // Convert file stream to buffer
      const chunkBuffer = await data.toBuffer();

      // Upload chunk
      const result = await this.blobStorageService.uploadChunk(sessionId, chunkNumber, chunkBuffer);

      return reply.status(200).send({
        success: true,
        chunkNumber: result.chunkNumber,
        blockId: result.blockId,
        uploaded: result.uploaded,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
        context: 'document.upload-chunk',
      });
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: errorMessage,
      });
    }
  }

  /**
   * POST /api/v1/documents/upload/chunked/:sessionId/complete
   * Complete chunked upload and create document shard
   */
  async completeChunkedUpload(
    request: FastifyRequest<{
      Params: { sessionId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!this.documentUploadService || !this.documentSettingsService) {
        return reply.status(503).send({
          success: false,
          error: 'Document upload service not configured',
          message: 'Azure Storage connection not configured.',
        });
      }

      const auth = (request as any).auth as unknown as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { sessionId } = request.params;

      // Get tenant settings
      const tenantSettings = await this.documentSettingsService.getTenantSettings(auth.tenantId);

      // Complete chunked upload
      const result = await this.documentUploadService.completeChunkedUpload(
        sessionId,
        auth.tenantId,
        auth.id,
        auth.email || '',
        tenantSettings
      );

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error,
          errorCode: result.errorCode,
        });
      }

      return reply.status(201).send({
        success: true,
        shard: result.shard,
        storagePath: result.storagePath,
        fileSize: result.fileSize,
        uploadDurationMs: result.uploadDurationMs,
        message: 'Chunked upload completed successfully',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
        context: 'document.complete-chunked-upload',
      });
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: errorMessage,
      });
    }
  }

  /**
   * GET /api/v1/documents/upload/chunked/:sessionId/status
   * Get chunked upload session status
   */
  async getChunkedUploadStatus(
    request: FastifyRequest<{
      Params: { sessionId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!this.blobStorageService) {
        return reply.status(503).send({
          success: false,
          error: 'Document upload service not configured',
        });
      }

      const auth = (request as any).auth as unknown as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { sessionId } = request.params;

      // Get session
      const session = await this.blobStorageService.getChunkedUploadSession(sessionId);

      if (!session) {
        return reply.status(404).send({
          success: false,
          error: 'Session not found',
          message: 'Upload session not found or expired',
        });
      }

      // Check if session belongs to this tenant
      if (session.tenantId !== auth.tenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied',
          message: 'Session does not belong to your tenant',
        });
      }

      return reply.status(200).send({
        success: true,
        sessionId: session.sessionId,
        fileName: session.fileName,
        fileSize: session.fileSize,
        totalChunks: session.totalChunks,
        uploadedChunks: session.uploadedChunks.length,
        progress: session.uploadedChunks.length / session.totalChunks,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastChunkAt: session.lastChunkAt,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
        context: 'document.get-chunked-upload-status',
      });
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: errorMessage,
      });
    }
  }
}


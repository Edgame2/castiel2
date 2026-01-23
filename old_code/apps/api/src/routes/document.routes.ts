import type { FastifyInstance } from 'fastify';
import { DocumentController } from '../controllers/document.controller.js';
import { requireAuth, requireRole, requireGlobalAdmin } from '../middleware/authorization.js';

/**
 * Register Document Management routes
 * 
 * Implementation Status:
 * - ✅ Document metadata CRUD (GET, PUT, DELETE, POST restore)
 * - ✅ List documents with pagination
 * - ✅ File upload/download (uses @fastify/multipart plugin)
 * - ✅ DocumentUploadService and AzureBlobStorageService integrated
 * - ✅ Chunked upload with Redis session storage for large files (> 100MB)
 * - ✅ Chunked upload routes: init, upload chunk, complete, status
 * 
 * The @fastify/multipart plugin is registered in the main server initialization.
 */
export async function registerDocumentRoutes(
  server: FastifyInstance
): Promise<void> {
  const controller = (server as any).documentController as DocumentController | undefined;

  if (!controller) {
    server.log.warn('⚠️  Document routes not registered - controller missing');
    return;
  }

  const authDecorator = (server as any).authenticate;

  if (!authDecorator) {
    server.log.warn('⚠️  Document routes not registered - authentication decorator missing');
    return;
  }

  // Authentication guards - all routes require authentication
  const authGuards = [authDecorator, requireAuth()];

  // GET /api/v1/documents - List documents
  server.get(
    '/api/v1/documents',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.listDocuments(request as any, reply)
  );

  // GET /api/v1/documents/:id - Get document metadata
  server.get(
    '/api/v1/documents/:id',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.getDocument(request as any, reply)
  );

  // PUT /api/v1/documents/:id - Update document metadata
  server.put(
    '/api/v1/documents/:id',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.updateDocument(request as any, reply)
  );

  // DELETE /api/v1/documents/:id - Soft delete document
  server.delete(
    '/api/v1/documents/:id',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.deleteDocument(request as any, reply)
  );

  // POST /api/v1/documents/:id/restore - Restore deleted document
  server.post(
    '/api/v1/documents/:id/restore',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.restoreDocument(request as any, reply)
  );

  // POST /api/v1/documents/upload - Upload file (multipart/form-data)
  server.post(
    '/api/v1/documents/upload',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.uploadDocument(request as any, reply)
  );

  // GET /api/v1/documents/:id/download - Download file (generates SAS URL)
  server.get(
    '/api/v1/documents/:id/download',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.downloadDocument(request as any, reply)
  );

  // POST /api/v1/documents/upload/chunked/init - Initialize chunked upload session
  server.post(
    '/api/v1/documents/upload/chunked/init',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Documents'],
        summary: 'Initialize chunked upload session',
        description: 'Initialize a chunked upload session for large files (> 100MB)',
        body: {
          type: 'object',
          required: ['fileName', 'fileSize', 'mimeType', 'name'],
          properties: {
            fileName: { type: 'string' },
            fileSize: { type: 'number' },
            mimeType: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            visibility: { type: 'string', enum: ['public', 'internal', 'confidential'] },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    (request, reply) => controller.initializeChunkedUpload(request as any, reply)
  );

  // POST /api/v1/documents/upload/chunked/:sessionId/chunk - Upload a single chunk
  server.post(
    '/api/v1/documents/upload/chunked/:sessionId/chunk',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Documents'],
        summary: 'Upload a chunk',
        description: 'Upload a single chunk for chunked upload session',
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          required: ['chunkNumber'],
          properties: {
            chunkNumber: { type: 'string' },
          },
        },
      },
    },
    (request, reply) => controller.uploadChunk(request as any, reply)
  );

  // POST /api/v1/documents/upload/chunked/:sessionId/complete - Complete chunked upload
  server.post(
    '/api/v1/documents/upload/chunked/:sessionId/complete',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Documents'],
        summary: 'Complete chunked upload',
        description: 'Complete chunked upload and create document shard',
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
          },
        },
      },
    },
    (request, reply) => controller.completeChunkedUpload(request as any, reply)
  );

  // GET /api/v1/documents/upload/chunked/:sessionId/status - Get chunked upload status
  server.get(
    '/api/v1/documents/upload/chunked/:sessionId/status',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Documents'],
        summary: 'Get chunked upload status',
        description: 'Get status of a chunked upload session',
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
          },
        },
      },
    },
    (request, reply) => controller.getChunkedUploadStatus(request as any, reply)
  );

  // GET /api/v1/documents/settings - Get effective settings for current tenant
  server.get(
    '/api/v1/documents/settings',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.getTenantSettings(request as any, reply)
  );

  // PUT /api/v1/documents/settings - Update settings for current tenant
  server.put(
    '/api/v1/documents/settings',
    {
      onRequest: [...authGuards, requireRole('admin')],
    },
    (request, reply) => controller.updateTenantSettings(request as any, reply)
  );

  // GET /api/v1/admin/documents/settings/global - Get global settings
  server.get(
    '/api/v1/admin/documents/settings/global',
    {
      onRequest: [...authGuards, requireGlobalAdmin()],
    },
    (request, reply) => controller.getGlobalSettings(request as any, reply)
  );

  // PUT /api/v1/admin/documents/settings/global - Update global settings
  server.put(
    '/api/v1/admin/documents/settings/global',
    {
      onRequest: [...authGuards, requireGlobalAdmin()],
    },
    (request, reply) => controller.updateGlobalSettings(request as any, reply)
  );

  // GET /api/v1/admin/documents/settings/tenants/:tenantId - Get tenant settings for override
  server.get(
    '/api/v1/admin/documents/settings/tenants/:tenantId',
    {
      onRequest: [...authGuards, requireGlobalAdmin()],
    },
    (request, reply) => controller.getTenantSettingsOverride(request as any, reply)
  );

  // PUT /api/v1/admin/documents/settings/tenants/:tenantId - Override tenant settings
  server.put(
    '/api/v1/admin/documents/settings/tenants/:tenantId',
    {
      onRequest: [...authGuards, requireGlobalAdmin()],
    },
    (request, reply) => controller.updateTenantSettingsOverride(request as any, reply)
  );

  server.log.info('✅ Document routes registered (Phase 1: metadata, CRUD, settings)');
}


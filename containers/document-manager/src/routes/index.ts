/**
 * Route Registration
 * Document Manager routes
 */

import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { DocumentService } from '../services/DocumentService';
import { CollectionService } from '../services/CollectionService';
import { BlobStorageService, BlobStorageConfig } from '../services/BlobStorageService';
import {
  CreateDocumentInput,
  UpdateDocumentInput,
  CreateCollectionInput,
  UpdateCollectionInput,
  StorageProvider,
  VisibilityLevel,
} from '../types/document.types';
import { v4 as uuidv4 } from 'uuid';

export async function registerRoutes(
  app: FastifyInstance,
  config: any
): Promise<void> {
  // Register multipart for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB default limit
    },
  });

  // Initialize blob storage service
  const blobStorageConfig: BlobStorageConfig = {
    provider: StorageProvider.AZURE,
    azure: {
      accountName: config.storage.azure.account_name,
      accountKey: config.storage.azure.account_key,
      containerName: config.storage.azure.container_name,
    },
  };
  const blobStorage = new BlobStorageService(blobStorageConfig);

  const documentService = new DocumentService(blobStorage);
  const collectionService = new CollectionService();

  // ===== DOCUMENT ROUTES =====

  /**
   * Upload file and create document
   * POST /api/v1/documents/upload
   */
  app.post(
    '/api/v1/documents/upload',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      const buffer = await data.toBuffer();
      const fileName = data.filename || `file-${uuidv4()}`;
      const mimeType = data.mimetype || 'application/octet-stream';
      const fileSize = buffer.length;

      // Generate storage path
      const storagePath = `quarantine/${tenantId}/${uuidv4()}/${fileName}`;

      // Upload to blob storage
      await blobStorage.uploadFile(storagePath, buffer, mimeType);

      // Create document record
      const createInput: CreateDocumentInput = {
        tenantId,
        userId,
        name: fileName,
        mimeType,
        fileSize,
        storageProvider: StorageProvider.AZURE,
        storagePath,
        visibility: VisibilityLevel.INTERNAL,
      };

      const document = await documentService.create(createInput);
      reply.code(201).send(document);
    }
  );

  /**
   * Create document metadata (without file)
   * POST /api/v1/documents
   */
  app.post<{ Body: CreateDocumentInput }>(
    '/api/v1/documents',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create document metadata',
        tags: ['Documents'],
        body: {
          type: 'object',
          required: ['name', 'mimeType', 'fileSize', 'storagePath'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            documentType: { type: 'string' },
            mimeType: { type: 'string' },
            fileSize: { type: 'number' },
            storagePath: { type: 'string' },
            category: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            visibility: { type: 'string', enum: ['public', 'internal', 'confidential'] },
            shardId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Document created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateDocumentInput = {
        ...request.body,
        tenantId,
        userId,
        storageProvider: StorageProvider.AZURE,
      };

      const document = await documentService.create(input);
      reply.code(201).send(document);
    }
  );

  /**
   * Get document by ID
   * GET /api/v1/documents/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/documents/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get document by ID',
        tags: ['Documents'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Document details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const document = await documentService.getById(request.params.id, tenantId);
      reply.send(document);
    }
  );

  /**
   * Update document
   * PUT /api/v1/documents/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateDocumentInput }>(
    '/api/v1/documents/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update document metadata',
        tags: ['Documents'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            documentType: { type: 'string' },
            category: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            visibility: { type: 'string', enum: ['public', 'internal', 'confidential'] },
            retentionPolicyId: { type: 'string' },
            retentionUntil: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Document updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const document = await documentService.update(request.params.id, tenantId, request.body);
      reply.send(document);
    }
  );

  /**
   * Delete document
   * DELETE /api/v1/documents/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/documents/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete document (soft delete)',
        tags: ['Documents'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Document deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;
      await documentService.delete(request.params.id, tenantId, userId);
      reply.code(204).send();
    }
  );

  /**
   * List documents
   * GET /api/v1/documents
   */
  app.get<{
    Querystring: {
      category?: string;
      documentType?: string;
      tags?: string;
      visibility?: string;
      status?: string;
      uploadedBy?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/documents',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List documents with filtering',
        tags: ['Documents'],
        querystring: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            documentType: { type: 'string' },
            tags: { type: 'string' },
            visibility: { type: 'string', enum: ['public', 'internal', 'confidential'] },
            status: { type: 'string', enum: ['active', 'archived', 'deleted', 'processing'] },
            uploadedBy: { type: 'string', format: 'uuid' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of documents',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const tags = request.query.tags ? request.query.tags.split(',') : undefined;
      const result = await documentService.list(tenantId, {
        category: request.query.category,
        documentType: request.query.documentType,
        tags,
        visibility: request.query.visibility as any,
        status: request.query.status as any,
        uploadedBy: request.query.uploadedBy,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  /**
   * Generate download URL
   * GET /api/v1/documents/:id/download
   */
  app.get<{ Params: { id: string }; Querystring: { expiresIn?: number } }>(
    '/api/v1/documents/:id/download',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Generate secure download URL',
        tags: ['Documents'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            expiresIn: { type: 'number', default: 15, description: 'Expiration in minutes' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Download URL and metadata',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const expiresIn = request.query.expiresIn || 15;
      const downloadResponse = await documentService.generateDownloadUrl(
        request.params.id,
        tenantId,
        expiresIn
      );
      reply.send(downloadResponse);
    }
  );

  // ===== COLLECTION ROUTES =====

  /**
   * Create collection
   * POST /api/v1/collections
   */
  app.post<{ Body: CreateCollectionInput }>(
    '/api/v1/collections',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create document collection',
        tags: ['Collections'],
        body: {
          type: 'object',
          required: ['name', 'type'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['folder', 'tag', 'smart'] },
            parentCollectionId: { type: 'string', format: 'uuid' },
            documentIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            filterCriteria: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Collection created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateCollectionInput = {
        ...request.body,
        tenantId,
        userId,
      };

      const collection = await collectionService.create(input);
      reply.code(201).send(collection);
    }
  );

  /**
   * Get collection by ID
   * GET /api/v1/collections/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/collections/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get collection by ID',
        tags: ['Collections'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Collection details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const collection = await collectionService.getById(request.params.id, tenantId);
      reply.send(collection);
    }
  );

  /**
   * Update collection
   * PUT /api/v1/collections/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateCollectionInput }>(
    '/api/v1/collections/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update collection',
        tags: ['Collections'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            documentIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            filterCriteria: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Collection updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const collection = await collectionService.update(
        request.params.id,
        tenantId,
        request.body
      );
      reply.send(collection);
    }
  );

  /**
   * Delete collection
   * DELETE /api/v1/collections/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/collections/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete collection',
        tags: ['Collections'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Collection deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await collectionService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List collections
   * GET /api/v1/collections
   */
  app.get<{
    Querystring: {
      type?: string;
      parentCollectionId?: string;
      limit?: number;
    };
  }>(
    '/api/v1/collections',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List collections',
        tags: ['Collections'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['folder', 'tag', 'smart'] },
            parentCollectionId: { type: 'string', format: 'uuid' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of collections',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const collections = await collectionService.list(tenantId, {
        type: request.query.type as any,
        parentCollectionId: request.query.parentCollectionId || null,
        limit: request.query.limit,
      });
      reply.send(collections);
    }
  );

  /**
   * Add document to collection
   * POST /api/v1/collections/:id/documents/:documentId
   */
  app.post<{ Params: { id: string; documentId: string } }>(
    '/api/v1/collections/:id/documents/:documentId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Add document to collection',
        tags: ['Collections'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            documentId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Collection updated with document',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const collection = await collectionService.addDocument(
        request.params.id,
        tenantId,
        request.params.documentId
      );
      reply.send(collection);
    }
  );

  /**
   * Remove document from collection
   * DELETE /api/v1/collections/:id/documents/:documentId
   */
  app.delete<{ Params: { id: string; documentId: string } }>(
    '/api/v1/collections/:id/documents/:documentId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Remove document from collection',
        tags: ['Collections'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            documentId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Collection updated without document',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const collection = await collectionService.removeDocument(
        request.params.id,
        tenantId,
        request.params.documentId
      );
      reply.send(collection);
    }
  );
}

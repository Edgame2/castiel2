/**
 * Document Bulk Routes
 * 
 * Routes for bulk document operations
 */

import type { FastifyInstance } from 'fastify';
import { DocumentBulkController } from '../controllers/document-bulk.controller.js';

/**
 * Register document bulk operation routes
 */
export async function registerDocumentBulkRoutes(
  server: FastifyInstance,
  controller: DocumentBulkController
): Promise<void> {
  // Start bulk upload
  server.post(
    '/api/v1/documents/bulk-upload',
    {
      schema: {
        tags: ['Bulk Operations'],
        summary: 'Start a bulk upload job',
        body: {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              maxItems: 1000,
              minItems: 1,
              items: {
                type: 'object',
                required: ['name', 'mimeType', 'fileSize', 'storagePath', 'visibility'],
                properties: {
                  name: { type: 'string' },
                  fileSize: { type: 'number' },
                  mimeType: { type: 'string' },
                  storagePath: { type: 'string' },
                  category: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  visibility: { type: 'string', enum: ['public', 'internal', 'confidential'] },
                },
              },
            },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              status: { type: 'string' },
              totalItems: { type: 'number' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.startBulkUpload(request as any, reply)
  );

  // Start bulk delete
  server.post(
    '/api/v1/documents/bulk-delete',
    {
      schema: {
        tags: ['Bulk Operations'],
        summary: 'Start a bulk delete job',
        body: {
          type: 'object',
          required: ['documentIds'],
          properties: {
            documentIds: {
              type: 'array',
              maxItems: 1000,
              minItems: 1,
              items: { type: 'string' },
            },
            reason: { type: 'string' },
            hardDelete: { type: 'boolean' },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              status: { type: 'string' },
              totalItems: { type: 'number' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.startBulkDelete(request as any, reply)
  );

  // Start bulk update
  server.post(
    '/api/v1/documents/bulk-update',
    {
      schema: {
        tags: ['Bulk Operations'],
        summary: 'Start a bulk metadata update job',
        body: {
          type: 'object',
          required: ['updates'],
          properties: {
            updates: {
              type: 'array',
              maxItems: 1000,
              minItems: 1,
              items: {
                type: 'object',
                required: ['documentId'],
                properties: {
                  documentId: { type: 'string' },
                  category: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  visibility: { type: 'string', enum: ['public', 'internal', 'confidential'] },
                },
              },
            },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              status: { type: 'string' },
              totalItems: { type: 'number' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.startBulkUpdate(request as any, reply)
  );

  // Start bulk collection assignment
  server.post(
    '/api/v1/collections/:collectionId/bulk-assign',
    {
      schema: {
        tags: ['Bulk Operations'],
        summary: 'Bulk assign documents to a collection',
        params: {
          type: 'object',
          properties: {
            collectionId: { type: 'string' },
          },
          required: ['collectionId'],
        },
        body: {
          type: 'object',
          required: ['documentIds'],
          properties: {
            documentIds: {
              type: 'array',
              maxItems: 1000,
              minItems: 1,
              items: { type: 'string' },
            },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              status: { type: 'string' },
              totalItems: { type: 'number' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.startBulkCollectionAssign(request as any, reply)
  );

  // Get job status
  server.get(
    '/api/v1/bulk-jobs/:jobId',
    {
      schema: {
        tags: ['Bulk Operations'],
        summary: 'Get bulk job status',
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
          },
          required: ['jobId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              jobType: { type: 'string' },
              status: { type: 'string' },
              totalItems: { type: 'number' },
              processedItems: { type: 'number' },
              successCount: { type: 'number' },
              failureCount: { type: 'number' },
              progress: { type: 'number' },
              createdAt: { type: 'string' },
              startedAt: { type: 'string' },
              completedAt: { type: 'string' },
              errorMessage: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.getJobStatus(request as any, reply)
  );

  // Get job results
  server.get(
    '/api/v1/bulk-jobs/:jobId/results',
    {
      schema: {
        tags: ['Bulk Operations'],
        summary: 'Get bulk job results',
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
          },
          required: ['jobId'],
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'string' },
            offset: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              results: {
                type: 'array',
                items: { type: 'object' },
              },
              pagination: {
                type: 'object',
                properties: {
                  limit: { type: 'number' },
                  offset: { type: 'number' },
                  total: { type: 'number' },
                  hasMore: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.getJobResults(request as any, reply)
  );

  // Cancel job
  server.post(
    '/api/v1/bulk-jobs/:jobId/cancel',
    {
      schema: {
        tags: ['Bulk Operations'],
        summary: 'Cancel a bulk job',
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
          },
          required: ['jobId'],
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              status: { type: 'string' },
              cancelledAt: { type: 'string' },
              cancellationReason: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.cancelJob(request as any, reply)
  );
}

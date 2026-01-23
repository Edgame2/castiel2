import type { FastifyInstance } from 'fastify';
import { CollectionController } from '../controllers/collection.controller.js';
import { requireAuth } from '../middleware/authorization.js';

/**
 * Register Collection Management routes
 * Collections can be folders, tags, or smart collections
 * Each collection has independent ACL from documents
 */
export async function registerCollectionRoutes(
  server: FastifyInstance
): Promise<void> {
  const controller = (server as any).collectionController as CollectionController | undefined;

  if (!controller) {
    server.log.warn('⚠️  Collection routes not registered - controller missing');
    return;
  }

  const authDecorator = (server as any).authenticate;

  if (!authDecorator) {
    server.log.warn('⚠️  Collection routes not registered - authentication decorator missing');
    return;
  }

  // Authentication guards
  const authGuards = [authDecorator, requireAuth()];

  // POST /api/v1/collections - Create collection
  server.post(
    '/api/v1/collections',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.createCollection(request as any, reply)
  );

  // GET /api/v1/collections - List collections
  server.get(
    '/api/v1/collections',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.listCollections(request as any, reply)
  );

  // GET /api/v1/collections/:id - Get collection
  server.get(
    '/api/v1/collections/:id',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.getCollection(request as any, reply)
  );

  // PUT /api/v1/collections/:id - Update collection
  server.put(
    '/api/v1/collections/:id',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.updateCollection(request as any, reply)
  );

  // DELETE /api/v1/collections/:id - Delete collection
  server.delete(
    '/api/v1/collections/:id',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.deleteCollection(request as any, reply)
  );

  // POST /api/v1/collections/:id/documents - Add documents to collection
  server.post(
    '/api/v1/collections/:id/documents',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.addDocuments(request as any, reply)
  );

  // GET /api/v1/collections/:id/documents - Get collection documents
  server.get(
    '/api/v1/collections/:id/documents',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.getCollectionDocuments(request as any, reply)
  );

  // DELETE /api/v1/collections/:id/documents/:documentId - Remove document from collection
  server.delete(
    '/api/v1/collections/:id/documents/:documentId',
    {
      onRequest: authGuards,
    },
    (request, reply) => controller.removeDocument(request as any, reply)
  );

  server.log.info('✅ Collection routes registered');
}

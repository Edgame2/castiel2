import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateRequest, sanitizeString } from '@coder/shared';
import { EmbeddingService } from '../services/EmbeddingService';

export async function embeddingRoutes(fastify: FastifyInstance) {
  const embeddingService = new EmbeddingService();

  // Register authentication middleware
  fastify.addHook('preHandler', authenticateRequest);

  // Store embedding
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const body = request.body as any;

      if (!body.content || !body.vector) {
        reply.code(400).send({ error: 'Content and vector are required' });
        return;
      }

      if (!Array.isArray(body.vector) || body.vector.length === 0) {
        reply.code(400).send({ error: 'Vector must be a non-empty array' });
        return;
      }

      const embedding = await embeddingService.storeEmbedding(
        body.projectId,
        body.filePath,
        sanitizeString(body.content),
        body.vector,
        body.metadata,
        body.embeddingModel
      );

      reply.code(201).send(embedding);
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to store embedding' });
    }
  });

  // Store embeddings in batch
  fastify.post('/batch', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;

      if (!Array.isArray(body.embeddings)) {
        reply.code(400).send({ error: 'Embeddings must be an array' });
        return;
      }

      const results = await embeddingService.storeEmbeddingsBatch(
        body.embeddings.map((emb: any) => ({
          projectId: emb.projectId,
          filePath: emb.filePath,
          content: sanitizeString(emb.content),
          vector: emb.vector,
          metadata: emb.metadata,
          embeddingModel: emb.embeddingModel,
        }))
      );

      reply.code(201).send({ embeddings: results });
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to store embeddings' });
    }
  });

  // Get embedding
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const embedding = await embeddingService.getEmbedding(id);

      if (!embedding) {
        reply.code(404).send({ error: 'Embedding not found' });
        return;
      }

      reply.send(embedding);
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to get embedding' });
    }
  });

  // Search similar embeddings
  fastify.post('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      const query = request.query as any;

      if (!body.vector || !Array.isArray(body.vector)) {
        reply.code(400).send({ error: 'Vector is required and must be an array' });
        return;
      }

      const results = await embeddingService.searchSimilar(
        body.vector,
        body.projectId || query.projectId,
        query.limit ? parseInt(query.limit, 10) : 10,
        query.threshold ? parseFloat(query.threshold) : 0.7
      );

      reply.send({ results });
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to search embeddings' });
    }
  });

  // Delete embedding
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      await embeddingService.deleteEmbedding(id);
      reply.code(204).send();
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to delete embedding' });
    }
  });

  // Delete all embeddings for a project
  fastify.delete('/project/:projectId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { projectId } = request.params as { projectId: string };
      const count = await embeddingService.deleteEmbeddingsByProject(projectId);
      reply.send({ deleted: count });
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to delete embeddings' });
    }
  });
}

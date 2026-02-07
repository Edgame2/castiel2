/**
 * Shard embedding routes (generate, batch, regenerate-type, statistics)
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ShardEmbeddingService } from '../services/ShardEmbeddingService';

export async function shardEmbeddingRoutes(server: FastifyInstance): Promise<void> {
  const shardEmbeddingService = new ShardEmbeddingService(server);
  const preHandler = [authenticateRequest(), tenantEnforcementMiddleware()];

  server.post<{ Body: { shardId: string; forceRegenerate?: boolean } }>(
    '/generate',
    { preHandler, schema: { description: 'Generate embeddings for a shard using template', tags: ['Shard Embeddings'] } as any },
    async (request, reply) => {
      try {
        const { shardId, forceRegenerate } = request.body;
        const tenantId = (request as any).user?.tenantId;
        if (!tenantId) return reply.code(403).send({ error: 'Missing tenant' });
        const result = await shardEmbeddingService.generateEmbeddingsForShard(shardId, tenantId, { forceRegenerate });
        return reply.send(result);
      } catch (error: any) {
        return reply.status(error.statusCode ?? 500).send({
          error: { code: 'EMBEDDING_GENERATION_FAILED', message: error.message ?? 'Failed to generate shard embeddings' },
        });
      }
    }
  );

  server.post<{ Body: { shardIds: string[]; forceRegenerate?: boolean; concurrency?: number } }>(
    '/batch',
    { preHandler, schema: { description: 'Batch generate embeddings for multiple shards', tags: ['Shard Embeddings'] } as any },
    async (request, reply) => {
      try {
        const { shardIds, forceRegenerate, concurrency } = request.body;
        const tenantId = (request as any).user?.tenantId;
        if (!tenantId) return reply.code(403).send({ error: 'Missing tenant' });
        const result = await shardEmbeddingService.batchGenerateEmbeddings(shardIds, tenantId, {
          forceRegenerate,
          concurrency,
        });
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          error: { code: 'BATCH_EMBEDDING_GENERATION_FAILED', message: (error as Error).message },
        });
      }
    }
  );

  server.post<{ Body: { shardTypeId: string; forceRegenerate?: boolean } }>(
    '/regenerate-type',
    { preHandler, schema: { description: 'Regenerate embeddings for all shards of a type', tags: ['Shard Embeddings'] } as any },
    async (request, reply) => {
      try {
        const { shardTypeId, forceRegenerate } = request.body;
        const tenantId = (request as any).user?.tenantId;
        if (!tenantId) return reply.code(403).send({ error: 'Missing tenant' });
        const result = await shardEmbeddingService.regenerateEmbeddingsForShardType(shardTypeId, tenantId, {
          forceRegenerate,
        });
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          error: { code: 'REGENERATION_FAILED', message: (error as Error).message },
        });
      }
    }
  );

  server.get(
    '/statistics',
    { preHandler, schema: { description: 'Get embedding statistics for tenant', tags: ['Shard Embeddings'] } as any },
    async (request, reply) => {
      try {
        const tenantId = (request as any).user?.tenantId;
        if (!tenantId) return reply.code(403).send({ error: 'Missing tenant' });
        const stats = await shardEmbeddingService.getEmbeddingStats(tenantId);
        return reply.send(stats);
      } catch (error: any) {
        return reply.status(500).send({
          error: { code: 'STATISTICS_RETRIEVAL_FAILED', message: (error as Error).message },
        });
      }
    }
  );
}

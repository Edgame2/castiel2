/**
 * Vectorization Routes
 * API endpoints for shard vectorization
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { VectorizationService } from '../services/vectorization.service.js';
import {
  VectorizeShardRequest,
  BatchVectorizeRequest,
  VectorizationConfig,
  ChunkingStrategy,
  EmbeddingModel,
} from '../types/vectorization.types.js';

/**
 * Vectorization route parameters
 */
interface VectorizeParams {
  id: string; // Shard ID
}

/**
 * Vectorization job status parameters
 */
interface JobStatusParams {
  jobId: string;
}

/**
 * Vectorization route body
 */
interface VectorizeBody {
  config?: Partial<VectorizationConfig>;
  priority?: number;
  force?: boolean;
}

/**
 * Batch vectorization body
 */
interface BatchVectorizeBody {
  shardIds?: string[];
  filter?: {
    shardTypeId?: string;
    status?: string;
    updatedAfter?: string;
    missingVectors?: boolean;
  };
  config?: Partial<VectorizationConfig>;
  priority?: number;
}

/**
 * Vectorization routes plugin
 */
export const vectorizationRoutes: FastifyPluginAsync = async (fastify) => {
  const vectorizationService = fastify.vectorizationService as VectorizationService;

  if (!vectorizationService) {
    fastify.log.warn('VectorizationService not available, vectorization routes disabled');
    return;
  }

  /**
   * POST /vectorization/shards/:id
   * Vectorize a single shard
   */
  fastify.post<{
    Params: VectorizeParams;
    Body: VectorizeBody;
  }>(
    '/vectorization/shards/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Shard ID' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            config: {
              type: 'object',
              properties: {
                model: {
                  type: 'string',
                  enum: Object.values(EmbeddingModel),
                  description: 'Embedding model to use',
                },
                chunkingStrategy: {
                  type: 'string',
                  enum: Object.values(ChunkingStrategy),
                  description: 'Text chunking strategy',
                },
                chunkSize: { type: 'number', description: 'Chunk size in tokens' },
                chunkOverlap: { type: 'number', description: 'Overlap between chunks' },
                combineChunks: {
                  type: 'boolean',
                  description: 'Combine chunks into single embedding',
                },
              },
            },
            priority: { type: 'number', description: 'Job priority (higher = more urgent)' },
            force: {
              type: 'boolean',
              description: 'Re-vectorize even if already vectorized',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              shardId: { type: 'string' },
              status: { type: 'string' },
              progress: { type: 'number' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: VectorizeParams; Body: VectorizeBody }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const vectorizeRequest: VectorizeShardRequest = {
          shardId: request.params.id,
          tenantId: user.tenantId,
          config: request.body.config,
          priority: request.body.priority,
          force: request.body.force,
        };

        const result = await vectorizationService.vectorizeShard(vectorizeRequest);

        return reply.code(200).send(result);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
        const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined;
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage), 'Failed to vectorize shard');
        return reply.code(statusCode || 500).send({
          error: errorMessage || 'Failed to vectorize shard',
          code: errorCode,
        });
      }
    }
  );

  /**
   * GET /vectorization/jobs/:jobId
   * Get vectorization job status
   */
  fastify.get<{
    Params: JobStatusParams;
  }>(
    '/vectorization/jobs/:jobId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string', description: 'Job ID' },
          },
          required: ['jobId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              shardId: { type: 'string' },
              status: { type: 'string' },
              progress: { type: 'number' },
              result: {
                type: 'object',
                properties: {
                  vectorCount: { type: 'number' },
                  totalTokens: { type: 'number' },
                  chunksProcessed: { type: 'number' },
                  model: { type: 'string' },
                  dimensions: { type: 'number' },
                  executionTimeMs: { type: 'number' },
                  cost: { type: 'number' },
                },
              },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
              createdAt: { type: 'string' },
              startedAt: { type: 'string' },
              completedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: JobStatusParams }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const status = await vectorizationService.getJobStatus(request.params.jobId);

        if (!status) {
          return reply.code(404).send({ error: 'Job not found' });
        }

        return reply.code(200).send(status);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage), 'Failed to get job status');
        return reply.code(statusCode || 500).send({
          error: errorMessage || 'Failed to get job status',
        });
      }
    }
  );

  /**
   * GET /vectorization/shards/:id/status
   * Get shard vectorization status (convenience endpoint)
   */
  fastify.get<{
    Params: VectorizeParams;
  }>(
    '/vectorization/shards/:id/status',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Shard ID' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              shardId: { type: 'string' },
              isVectorized: { type: 'boolean' },
              vectorCount: { type: 'number' },
              lastVectorizedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: VectorizeParams }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        // This would need to query the shard to check vectorization status
        // For now, return a placeholder response
        return reply.code(200).send({
          shardId: request.params.id,
          isVectorized: false,
          vectorCount: 0,
          message: 'Status check not implemented - use job status endpoint',
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage), 'Failed to get shard status');
        return reply.code(statusCode || 500).send({
          error: errorMessage || 'Failed to get shard status',
        });
      }
    }
  );

  /**
   * POST /vectorization/batch
   * Batch vectorize multiple shards
   */
  fastify.post<{
    Body: BatchVectorizeBody;
  }>(
    '/vectorization/batch',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            shardIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific shard IDs to vectorize',
            },
            filter: {
              type: 'object',
              properties: {
                shardTypeId: { type: 'string' },
                status: { type: 'string' },
                updatedAfter: { type: 'string', format: 'date-time' },
                missingVectors: { type: 'boolean' },
              },
              description: 'Filter to select shards',
            },
            config: {
              type: 'object',
              properties: {
                model: { type: 'string', enum: Object.values(EmbeddingModel) },
                chunkingStrategy: {
                  type: 'string',
                  enum: Object.values(ChunkingStrategy),
                },
                chunkSize: { type: 'number' },
                chunkOverlap: { type: 'number' },
                combineChunks: { type: 'boolean' },
              },
            },
            priority: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              jobIds: {
                type: 'array',
                items: { type: 'string' },
              },
              totalShards: { type: 'number' },
              estimatedCompletionTime: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: BatchVectorizeBody }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const batchRequest: BatchVectorizeRequest = {
          tenantId: user.tenantId,
          shardIds: request.body.shardIds,
          filter: request.body.filter
            ? {
                shardTypeId: request.body.filter.shardTypeId,
                status: request.body.filter.status,
                updatedAfter: request.body.filter.updatedAfter
                  ? new Date(request.body.filter.updatedAfter)
                  : undefined,
                missingVectors: request.body.filter.missingVectors,
              }
            : undefined,
          config: request.body.config,
          priority: request.body.priority,
        };

        const result = await vectorizationService.batchVectorize(batchRequest);

        return reply.code(200).send(result);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
        const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined;
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage), 'Failed to batch vectorize');
        return reply.code(statusCode || 500).send({
          error: errorMessage || 'Failed to batch vectorize',
          code: errorCode,
        });
      }
    }
  );
};

// Export for type augmentation
declare module 'fastify' {
  interface FastifyInstance {
    vectorizationService?: VectorizationService;
  }
}

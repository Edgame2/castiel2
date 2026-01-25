/**
 * Route registration for data-enrichment module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { EnrichmentService } from '../services/EnrichmentService';
import { VectorizationService } from '../services/VectorizationService';
import { ShardEmbeddingService } from '../services/ShardEmbeddingService';
import {
  EnrichShardRequest,
  BulkEnrichmentRequest,
  EnrichmentConfiguration,
  EnrichmentProcessorType,
} from '../types/enrichment.types';
import {
  VectorizeShardRequest,
  BatchVectorizeRequest,
} from '../types/vectorization.types';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const enrichmentService = new EnrichmentService(fastify);
    const vectorizationService = new VectorizationService(fastify);
    const shardEmbeddingService = new ShardEmbeddingService(fastify);

    // Get enrichment job status
    fastify.get<{ Params: { jobId: string } }>(
      '/api/v1/enrichment/jobs/:jobId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get enrichment job status',
          tags: ['Enrichment'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { jobId } = request.params;
          const tenantId = request.user!.tenantId;

          const job = await enrichmentService.getEnrichmentJob(jobId, tenantId);

          if (!job) {
            return reply.status(404).send({
              error: {
                code: 'JOB_NOT_FOUND',
                message: 'Enrichment job not found',
              },
            });
          }

          return reply.send(job);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get enrichment job', error instanceof Error ? error : new Error(msg), { service: 'data-enrichment' });
          return reply.status(statusCode).send({
            error: { code: 'JOB_RETRIEVAL_FAILED', message: msg || 'Failed to retrieve enrichment job' },
          });
        }
      }
    );

    // Trigger enrichment for shard (new method with config support)
    fastify.post<{ Body: { shardId: string; configId?: string; processors?: string[]; force?: boolean } }>(
      '/api/v1/enrichment/enrich',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Enrich a shard using enrichment configuration',
          tags: ['Enrichment'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { shardId, configId, processors, force } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          const enrichRequest: EnrichShardRequest = {
            shardId,
            tenantId,
            configId: configId || 'default',
            processors: processors as EnrichmentProcessorType[] | undefined,
            force: force || false,
            triggeredBy: 'manual',
            triggeredByUserId: userId,
          };

          const response = await enrichmentService.enrichShard(enrichRequest);

          return reply.status(202).send(response);
        } catch (error: any) {
          log.error('Failed to enrich shard', error, { service: 'data-enrichment' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'ENRICHMENT_FAILED',
              message: error.message || 'Failed to enrich shard',
            },
          });
        }
      }
    );

    // Trigger enrichment for shard (legacy method)
    fastify.post<{ Body: { shardId: string } }>(
      '/api/v1/enrichment/trigger',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Trigger enrichment for a shard (legacy method)',
          tags: ['Enrichment'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { shardId } = request.body;
          const tenantId = request.user!.tenantId;

          // Trigger enrichment (async)
          const job = await enrichmentService.triggerEnrichment(shardId, tenantId);

          return reply.status(202).send({
            jobId: job.jobId,
            status: job.status,
            message: 'Enrichment job started',
          });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to trigger enrichment', error instanceof Error ? error : new Error(msg), { service: 'data-enrichment' });
          return reply.status(statusCode).send({
            error: { code: 'ENRICHMENT_TRIGGER_FAILED', message: msg || 'Failed to trigger enrichment' },
          });
        }
      }
    );

    // Bulk enrich shards
    fastify.post<{ Body: BulkEnrichmentRequest }>(
      '/api/v1/enrichment/bulk',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Bulk enrich multiple shards',
          tags: ['Enrichment'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          const bulkRequest: BulkEnrichmentRequest = {
            ...request.body,
            tenantId,
            triggeredByUserId: userId,
          };

          const response = await enrichmentService.bulkEnrich(bulkRequest);

          return reply.status(202).send(response);
        } catch (error: any) {
          log.error('Failed to bulk enrich', error, { service: 'data-enrichment' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'BULK_ENRICHMENT_FAILED',
              message: error.message || 'Failed to bulk enrich shards',
            },
          });
        }
      }
    );

    // Get enrichment statistics
    fastify.get<{ Querystring: { tenantId?: string } }>(
      '/api/v1/enrichment/statistics',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get enrichment statistics for tenant',
          tags: ['Enrichment'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;

          const statistics = await enrichmentService.getStatistics(tenantId);

          return reply.send(statistics);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get statistics', error instanceof Error ? error : new Error(msg), { service: 'data-enrichment' });
          return reply.status(statusCode).send({
            error: { code: 'STATISTICS_RETRIEVAL_FAILED', message: msg || 'Failed to retrieve enrichment statistics' },
          });
        }
      }
    );

    // ============================================
    // VECTORIZATION ROUTES
    // ============================================

    // Vectorize a shard
    fastify.post<{ Body: VectorizeShardRequest }>(
      '/api/v1/vectorization/vectorize',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Vectorize a shard',
          tags: ['Vectorization'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const vectorizeRequest: VectorizeShardRequest = {
            ...request.body,
            tenantId,
          };

          const response = await vectorizationService.vectorizeShard(vectorizeRequest);

          return reply.status(202).send(response);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to vectorize shard', error instanceof Error ? error : new Error(msg), { service: 'data-enrichment' });
          return reply.status(statusCode).send({
            error: { code: 'VECTORIZATION_FAILED', message: msg || 'Failed to vectorize shard' },
          });
        }
      }
    );

    // Get vectorization job status
    fastify.get<{ Params: { jobId: string } }>(
      '/api/v1/vectorization/jobs/:jobId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get vectorization job status',
          tags: ['Vectorization'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { jobId } = request.params;
          const tenantId = request.user!.tenantId;

          const status = await vectorizationService.getJobStatus(jobId, tenantId);

          if (!status) {
            return reply.status(404).send({
              error: {
                code: 'JOB_NOT_FOUND',
                message: 'Vectorization job not found',
              },
            });
          }

          return reply.send(status);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get vectorization job', error instanceof Error ? error : new Error(msg), { service: 'data-enrichment' });
          return reply.status(statusCode).send({
            error: { code: 'JOB_RETRIEVAL_FAILED', message: msg || 'Failed to retrieve vectorization job' },
          });
        }
      }
    );

    // Batch vectorize shards
    fastify.post<{ Body: BatchVectorizeRequest }>(
      '/api/v1/vectorization/batch',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Batch vectorize multiple shards',
          tags: ['Vectorization'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const batchRequest: BatchVectorizeRequest = {
            ...request.body,
            tenantId,
          };

          const response = await vectorizationService.batchVectorize(batchRequest);

          return reply.status(202).send(response);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to batch vectorize', error instanceof Error ? error : new Error(msg), { service: 'data-enrichment' });
          return reply.status(statusCode).send({
            error: { code: 'BATCH_VECTORIZATION_FAILED', message: msg || 'Failed to batch vectorize shards' },
          });
        }
      }
    );

    // ============================================
    // SHARD EMBEDDING ROUTES
    // ============================================

    // Generate embeddings for shard
    fastify.post<{ Body: { shardId: string; forceRegenerate?: boolean } }>(
      '/api/v1/shard-embeddings/generate',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Generate embeddings for a shard using template',
          tags: ['Shard Embeddings'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { shardId, forceRegenerate } = request.body;
          const tenantId = request.user!.tenantId;

          const result = await shardEmbeddingService.generateEmbeddingsForShard(
            shardId,
            tenantId,
            { forceRegenerate }
          );

          return reply.send(result);
        } catch (error: any) {
          log.error('Failed to generate shard embeddings', error, { service: 'data-enrichment' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'EMBEDDING_GENERATION_FAILED',
              message: error.message || 'Failed to generate shard embeddings',
            },
          });
        }
      }
    );

    // Batch generate embeddings
    fastify.post<{ Body: { shardIds: string[]; forceRegenerate?: boolean; concurrency?: number } }>(
      '/api/v1/shard-embeddings/batch',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Batch generate embeddings for multiple shards',
          tags: ['Shard Embeddings'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { shardIds, forceRegenerate, concurrency } = request.body;
          const tenantId = request.user!.tenantId;

          const result = await shardEmbeddingService.batchGenerateEmbeddings(
            shardIds,
            tenantId,
            { forceRegenerate, concurrency }
          );

          return reply.send(result);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to batch generate embeddings', error instanceof Error ? error : new Error(msg), { service: 'data-enrichment' });
          return reply.status(statusCode).send({
            error: { code: 'BATCH_EMBEDDING_GENERATION_FAILED', message: msg || 'Failed to batch generate embeddings' },
          });
        }
      }
    );

    // Regenerate embeddings for shard type
    fastify.post<{ Body: { shardTypeId: string; forceRegenerate?: boolean } }>(
      '/api/v1/shard-embeddings/regenerate-type',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Regenerate embeddings for all shards of a type',
          tags: ['Shard Embeddings'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { shardTypeId, forceRegenerate } = request.body;
          const tenantId = request.user!.tenantId;

          const result = await shardEmbeddingService.regenerateEmbeddingsForShardType(
            shardTypeId,
            tenantId,
            { forceRegenerate }
          );

          return reply.send(result);
        } catch (error: any) {
          log.error('Failed to regenerate embeddings for shard type', error, { service: 'data-enrichment' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'REGENERATION_FAILED',
              message: error.message || 'Failed to regenerate embeddings for shard type',
            },
          });
        }
      }
    );

    // Get embedding statistics
    fastify.get<{ Querystring: { tenantId?: string } }>(
      '/api/v1/shard-embeddings/statistics',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get embedding statistics for tenant',
          tags: ['Shard Embeddings'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;

          const stats = await shardEmbeddingService.getEmbeddingStats(tenantId);

          return reply.send(stats);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get embedding statistics', error instanceof Error ? error : new Error(msg), { service: 'data-enrichment' });
          return reply.status(statusCode).send({
            error: { code: 'STATISTICS_RETRIEVAL_FAILED', message: msg || 'Failed to retrieve embedding statistics' },
          });
        }
      }
    );

    log.info('Data enrichment routes registered', { service: 'data-enrichment' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'data-enrichment' });
    throw error;
  }
}

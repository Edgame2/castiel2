/**
 * Route registration for data-enrichment module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { EnrichmentService } from '../services/EnrichmentService';
import { VectorizationService } from '../services/VectorizationService';
import {
  EnrichShardRequest,
  BulkEnrichmentRequest,
  EnrichmentProcessorType,
} from '../types/enrichment.types';
import {
  VectorizeShardRequest,
  BatchVectorizeRequest,
} from '../types/vectorization.types';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, _config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const enrichmentService = new EnrichmentService(fastify);
    const vectorizationService = new VectorizationService(fastify);

    // Get enrichment job status
    fastify.get<{ Params: { jobId: string } }>(
      '/api/v1/enrichment/jobs/:jobId',
      {
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Get enrichment job status',
          tags: ['Enrichment'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { jobId } = request.params;
          const tenantId = (request as any).user!.tenantId;

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
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Enrich a shard using enrichment configuration',
          tags: ['Enrichment'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['shardId'],
            properties: {
              shardId: { type: 'string' },
              configId: { type: 'string' },
              processors: { type: 'array', items: { type: 'string' } },
              force: { type: 'boolean' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { shardId, configId, processors, force } = request.body;
          const tenantId = (request as any).user!.tenantId;
          const userId = (request as any).user!.id;

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
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Trigger enrichment for a shard (legacy method)',
          tags: ['Enrichment'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { shardId } = request.body;
          const tenantId = (request as any).user!.tenantId;

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
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Bulk enrich multiple shards',
          tags: ['Enrichment'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = (request as any).user!.tenantId;
          const userId = (request as any).user!.id;

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
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Get enrichment statistics for tenant',
          tags: ['Enrichment'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = (request as any).user!.tenantId;

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
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Vectorize a shard',
          tags: ['Vectorization'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = (request as any).user!.tenantId;
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
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Get vectorization job status',
          tags: ['Vectorization'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { jobId } = request.params;
          const tenantId = (request as any).user!.tenantId;

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
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Batch vectorize multiple shards',
          tags: ['Vectorization'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = (request as any).user!.tenantId;
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

    log.info('Data enrichment routes registered', { service: 'data-enrichment' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'data-enrichment' });
    throw error;
  }
}

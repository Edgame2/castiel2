/**
 * Route registration for data-enrichment module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { EnrichmentService } from '../services/EnrichmentService';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const enrichmentService = new EnrichmentService(fastify);

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
        } catch (error: any) {
          log.error('Failed to get enrichment job', error, { service: 'data-enrichment' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'JOB_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve enrichment job',
            },
          });
        }
      }
    );

    // Trigger enrichment for shard
    fastify.post<{ Body: { shardId: string } }>(
      '/api/v1/enrichment/trigger',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Trigger enrichment for a shard',
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
        } catch (error: any) {
          log.error('Failed to trigger enrichment', error, { service: 'data-enrichment' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'ENRICHMENT_TRIGGER_FAILED',
              message: error.message || 'Failed to trigger enrichment',
            },
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

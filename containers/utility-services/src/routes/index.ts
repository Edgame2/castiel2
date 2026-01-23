/**
 * Route registration for utility_services module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { UtilityService } from '../services/UtilityService';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const utilityService = new UtilityService();

    // Get job status
    fastify.get<{ Params: { jobId: string }; Querystring: { jobType: 'import' | 'export' } }>(
      '/api/v1/utility/jobs/:jobId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get utility job status',
          tags: ['Utility'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { jobId } = request.params;
          const { jobType } = request.query;
          const tenantId = request.user!.tenantId;

          const job = await utilityService.getJobStatus(jobId, tenantId, jobType);

          if (!job) {
            return reply.status(404).send({
              error: {
                code: 'JOB_NOT_FOUND',
                message: 'Job not found',
              },
            });
          }

          return reply.send(job);
        } catch (error: any) {
          log.error('Failed to get job status', error, { service: 'utility-services' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'JOB_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve job status',
            },
          });
        }
      }
    );

    // Create import job
    fastify.post<{ Body: { importType: string; data: any } }>(
      '/api/v1/utility/import',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create import job',
          tags: ['Utility'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { importType, data } = request.body;
          const tenantId = request.user!.tenantId;

          const job = await utilityService.createImportJob(tenantId, importType, data);

          return reply.status(202).send(job);
        } catch (error: any) {
          log.error('Failed to create import job', error, { service: 'utility-services' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'IMPORT_JOB_FAILED',
              message: error.message || 'Failed to create import job',
            },
          });
        }
      }
    );

    // Create export job
    fastify.post<{ Body: { exportType: string; filters?: any } }>(
      '/api/v1/utility/export',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create export job',
          tags: ['Utility'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { exportType, filters } = request.body;
          const tenantId = request.user!.tenantId;

          const job = await utilityService.createExportJob(tenantId, exportType, filters);

          return reply.status(202).send(job);
        } catch (error: any) {
          log.error('Failed to create export job', error, { service: 'utility-services' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'EXPORT_JOB_FAILED',
              message: error.message || 'Failed to create export job',
            },
          });
        }
      }
    );

    log.info('Utility services routes registered', { service: 'utility-services' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'utility-services' });
    throw error;
  }
}

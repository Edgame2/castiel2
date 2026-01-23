/**
 * Route registration for quality_monitoring module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { QualityMonitoringService } from '../services/QualityMonitoringService';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const qualityMonitoringService = new QualityMonitoringService();

    // Get quality metrics
    fastify.get<{ Querystring: { metricType?: string } }>(
      '/api/v1/quality/metrics',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get quality metrics',
          tags: ['Quality Monitoring'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const { metricType } = request.query;

          // Get metrics from database
          const container = getContainer('quality_metrics');
          let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
          const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

          if (metricType) {
            query += ' AND c.metricType = @metricType';
            parameters.push({ name: '@metricType', value: metricType });
          }

          query += ' ORDER BY c.measuredAt DESC';

          const { resources: metrics } = await container.items
            .query({ query, parameters }, { partitionKey: tenantId })
            .fetchAll();

          return reply.send({ metrics: metrics || [] });
        } catch (error: any) {
          log.error('Failed to get quality metrics', error, { service: 'quality-monitoring' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'METRICS_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve quality metrics',
            },
          });
        }
      }
    );

    log.info('Quality monitoring routes registered', { service: 'quality-monitoring' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'quality-monitoring' });
    throw error;
  }
}

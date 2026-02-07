/**
 * Route registration for quality_monitoring module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { QualityMonitoringService } from '../services/QualityMonitoringService.js';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, _config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const qualityMonitoringService = new QualityMonitoringService();

    // Get quality metrics
    fastify.get<{ Querystring: { metricType?: string } }>(
      '/api/v1/quality/metrics',
      {
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Get quality metrics',
          tags: ['Quality Monitoring'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = (request as any).user!.tenantId;
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
            .query({ query, parameters }, { partitionKey: tenantId } as any)
            .fetchAll();

          return reply.send({ metrics: metrics || [] });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get quality metrics', error instanceof Error ? error : new Error(msg), { service: 'quality-monitoring' });
          return reply.status(statusCode).send({
            error: { code: 'METRICS_RETRIEVAL_FAILED', message: msg || 'Failed to retrieve quality metrics' },
          });
        }
      }
    );

    // Record quality metric
    fastify.post<{ Body: { metricType: string; value: number; threshold: number; status: 'normal' | 'warning' | 'critical' } }>(
      '/api/v1/quality/metrics',
      {
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Record quality metric',
          tags: ['Quality Monitoring'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { metricType, value, threshold, status } = request.body;
          const tenantId = (request as any).user!.tenantId;

          await qualityMonitoringService.recordMetric(tenantId, {
            metricType,
            value,
            threshold,
            status,
          });

          return reply.status(204).send();
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to record quality metric', error instanceof Error ? error : new Error(msg), { service: 'quality-monitoring' });
          return reply.status(statusCode).send({
            error: { code: 'METRIC_RECORDING_FAILED', message: msg || 'Failed to record quality metric' },
          });
        }
      }
    );

    // Detect anomaly
    fastify.post<{ Body: { metricType: string; value: number } }>(
      '/api/v1/quality/anomalies/detect',
      {
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Detect quality anomaly',
          tags: ['Quality Monitoring'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { metricType, value } = request.body;
          const tenantId = (request as any).user!.tenantId;

          const anomaly = await qualityMonitoringService.detectAnomaly(tenantId, { metricType, value });

          if (!anomaly) {
            return reply.status(200).send({ anomaly: null, message: 'No anomaly detected' });
          }

          return reply.send({ anomaly });
        } catch (error: any) {
          log.error('Failed to detect anomaly', error, { service: 'quality-monitoring' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'ANOMALY_DETECTION_FAILED',
              message: error.message || 'Failed to detect anomaly',
            },
          });
        }
      }
    );

    // Get anomalies
    fastify.get<{ Querystring: { resolved?: string; severity?: string } }>(
      '/api/v1/quality/anomalies',
      {
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Get quality anomalies',
          tags: ['Quality Monitoring'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = (request as any).user!.tenantId;
          const { resolved, severity } = request.query;

          const container = getContainer('quality_anomalies');
          let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
          const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

          if (resolved !== undefined) {
            query += ' AND c.resolved = @resolved';
            parameters.push({ name: '@resolved', value: resolved === 'true' });
          }

          if (severity) {
            query += ' AND c.severity = @severity';
            parameters.push({ name: '@severity', value: severity });
          }

          query += ' ORDER BY c.detectedAt DESC';

          const { resources: anomalies } = await container.items
            .query({ query, parameters }, { partitionKey: tenantId } as any)
            .fetchAll();

          return reply.send({ anomalies: anomalies || [] });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get anomalies', error instanceof Error ? error : new Error(msg), { service: 'quality-monitoring' });
          return reply.status(statusCode).send({
            error: { code: 'ANOMALIES_RETRIEVAL_FAILED', message: msg || 'Failed to retrieve anomalies' },
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

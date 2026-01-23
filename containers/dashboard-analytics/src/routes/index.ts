/**
 * Route registration for dashboard_analytics module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { DashboardAnalyticsService } from '../services/DashboardAnalyticsService';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const dashboardAnalyticsService = new DashboardAnalyticsService();

    // Record dashboard view
    fastify.post<{ Body: { dashboardId: string; widgetId?: string } }>(
      '/api/v1/dashboard/analytics/view',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Record dashboard view',
          tags: ['Dashboard Analytics'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { dashboardId, widgetId } = request.body;
          const tenantId = request.user!.tenantId;

          await dashboardAnalyticsService.recordView(tenantId, dashboardId, widgetId);

          return reply.status(204).send();
        } catch (error: any) {
          log.error('Failed to record dashboard view', error, { service: 'dashboard-analytics' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'VIEW_RECORDING_FAILED',
              message: error.message || 'Failed to record dashboard view',
            },
          });
        }
      }
    );

    // Get widget cache
    fastify.get<{ Params: { widgetId: string } }>(
      '/api/v1/dashboard/widgets/:widgetId/cache',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get widget cache',
          tags: ['Dashboard Analytics'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { widgetId } = request.params;
          const tenantId = request.user!.tenantId;

          const cache = await dashboardAnalyticsService.getWidgetCache(tenantId, widgetId);

          if (!cache) {
            return reply.status(404).send({
              error: {
                code: 'CACHE_NOT_FOUND',
                message: 'Widget cache not found or expired',
              },
            });
          }

          return reply.send(cache);
        } catch (error: any) {
          log.error('Failed to get widget cache', error, { service: 'dashboard-analytics' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'CACHE_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve widget cache',
            },
          });
        }
      }
    );

    log.info('Dashboard analytics routes registered', { service: 'dashboard-analytics' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'dashboard-analytics' });
    throw error;
  }
}

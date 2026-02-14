import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateRequest, sanitizeString } from '@coder/shared';
import { DashboardService } from '../services/DashboardService';

export async function dashboardRoutes(fastify: FastifyInstance) {
  const dashboardService = new DashboardService();
  fastify.addHook('preHandler', authenticateRequest);

  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const dashboards = await dashboardService.listDashboards({
        tenantId: user.tenantId,
      });
      reply.send(dashboards);
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to list dashboards' });
    }
  });

  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const body = request.body as any;
      const dashboard = await dashboardService.createDashboard({
        name: sanitizeString(body.name),
        config: body.config,
        tenantId: user.tenantId,
      });
      reply.code(201).send(dashboard);
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to create dashboard' });
    }
  });

  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const dashboard = await dashboardService.getDashboard(id);
      if (!dashboard) {
        reply.code(404).send({ error: 'Dashboard not found' });
        return;
      }
      reply.send(dashboard);
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to get dashboard' });
    }
  });

  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;
      const dashboard = await dashboardService.updateDashboard(id, {
        name: body.name ? sanitizeString(body.name) : undefined,
        config: body.config,
      });
      if (!dashboard) {
        reply.code(404).send({ error: 'Dashboard not found' });
        return;
      }
      reply.send(dashboard);
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to update dashboard' });
    }
  });

  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      await dashboardService.deleteDashboard(id);
      reply.code(204).send();
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to delete dashboard' });
    }
  });

  // ===== DASHBOARD ANALYTICS ROUTES (from dashboard-analytics) =====

  // Record dashboard view
  fastify.post<{ Body: { dashboardId: string; widgetId?: string } }>(
    '/analytics/view',
    {
      preHandler: [authenticateRequest()],
      schema: {
        description: 'Record dashboard view',
        tags: ['Dashboard Analytics'],
      } as any,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { dashboardId, widgetId } = request.body as { dashboardId: string; widgetId?: string };
        const user = (request as any).user;
        const tenantId = user.tenantId;

        await dashboardService.recordView(tenantId, dashboardId, widgetId);
        return reply.status(204).send();
      } catch (error: any) {
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
    '/widgets/:widgetId/cache',
    {
      preHandler: [authenticateRequest()],
      schema: {
        description: 'Get widget cache',
        tags: ['Dashboard Analytics'],
      } as any,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { widgetId } = request.params as { widgetId: string };
        const user = (request as any).user;
        const tenantId = user.tenantId;

        const cache = await dashboardService.getWidgetCache(tenantId, widgetId);

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
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CACHE_RETRIEVAL_FAILED',
            message: error.message || 'Failed to retrieve widget cache',
          },
        });
      }
    }
  );
}

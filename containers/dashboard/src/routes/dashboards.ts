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
        organizationId: user.organizationId,
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
        organizationId: user.organizationId,
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
}

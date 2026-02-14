import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { AgentService } from '../services/AgentService';

export async function agentRoutes(fastify: FastifyInstance) {
  const agentService = new AgentService();

  // Register authentication and tenant enforcement middleware
  fastify.addHook('preHandler', async (request, reply) => {
    await authenticateRequest()(request, reply);
    await tenantEnforcementMiddleware()(request, reply);
  });

  // List agents (tenant-scoped)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user?.tenantId ?? (request as any).tenantId;
      if (!tenantId) {
        reply.code(400).send({ error: 'X-Tenant-ID required' });
        return;
      }
      const query = request.query as any;

      const agents = await agentService.listAgents({
        tenantId,
        userId: user.id,
        projectId: query.projectId,
        scope: query.scope,
        limit: query.limit ? parseInt(query.limit, 10) : 50,
        offset: query.offset ? parseInt(query.offset, 10) : 0,
      });

      reply.send(agents);
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to list agents' });
    }
  });

  // Get agent (tenant-scoped)
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const tenantId = user?.tenantId ?? (request as any).tenantId;
      if (!tenantId) {
        reply.code(400).send({ error: 'X-Tenant-ID required' });
        return;
      }
      const agent = await agentService.getAgent(id, tenantId);

      if (!agent) {
        reply.code(404).send({ error: 'Agent not found' });
        return;
      }

      reply.send(agent);
    } catch (error: unknown) {
      reply.code(500).send({ error: 'Failed to get agent' });
    }
  });

  // Execute agent
  fastify.post('/:id/execute', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const body = request.body as any;

      const execution = await agentService.executeAgent({
        agentId: id,
        userId: user.id,
        tenantId: user.tenantId,
        input: body.input,
        context: body.context,
      });

      reply.code(201).send({ execution });
    } catch (error: unknown) {
      reply.code(500).send({ error: 'Failed to execute agent' });
    }
  });
}

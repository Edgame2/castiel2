import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateRequest } from '@coder/shared';
import { ModelService } from '../services/ModelService';

export async function modelRoutes(fastify: FastifyInstance) {
  const modelService = new ModelService();

  // Register authentication middleware
  fastify.addHook('preHandler', authenticateRequest);

  // List available models
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const models = await modelService.listModels();
      reply.send({ models });
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to list models' });
    }
  });

  // Get model details
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const model = await modelService.getModel(id);
      
      if (!model) {
        reply.code(404).send({ error: 'Model not found' });
        return;
      }

      reply.send(model);
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to get model' });
    }
  });
}

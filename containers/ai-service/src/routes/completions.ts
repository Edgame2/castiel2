import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { CompletionService } from '../services/CompletionService';
import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../config';

function getEventPublisher(): EventPublisher {
  const config = loadConfig();
  return new EventPublisher({ url: config.rabbitmq.url, exchange: config.rabbitmq.exchange }, 'ai-service');
}

export async function completionRoutes(fastify: FastifyInstance) {
  const completionService = new CompletionService();
  const eventPublisher = getEventPublisher();

  // Register authentication and tenant enforcement middleware
  fastify.addHook('preHandler', async (request, reply) => {
    await authenticateRequest()(request, reply);
    await tenantEnforcementMiddleware()(request, reply);
  });

  // Create completion
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const body = request.body as any;

      if (!body.messages || !Array.isArray(body.messages)) {
        reply.code(400).send({ error: 'Messages are required and must be an array' });
        return;
      }

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const model = body.model || 'gpt-4';

      const tenantId = (user as any).tenantId || user.organizationId || '';
      // Publish event: completion started
      await eventPublisher.publish('ai.completion.started', tenantId, {
        requestId,
        model,
        organizationId: user.organizationId,
        userId: user.id,
        timestamp: new Date(),
      });

      const startTime = Date.now();

      try {
        const completion = await completionService.complete({
          messages: body.messages,
          model: body.model,
          temperature: body.temperature,
          maxTokens: body.maxTokens,
          stream: body.stream,
          organizationId: user.organizationId,
          userId: user.id,
        });

        const durationMs = Date.now() - startTime;

        // Publish event: completion completed
        await eventPublisher.publish('ai.completion.completed', tenantId, {
          requestId,
          model,
          tokensUsed: completion.usage?.totalTokens || 0,
          durationMs,
          organizationId: user.organizationId,
          timestamp: new Date(),
        });

        reply.send(completion);
      } catch (error: unknown) {
        const durationMs = Date.now() - startTime;
        const msg = error instanceof Error ? error.message : String(error);
        // Publish event: completion failed
        await eventPublisher.publish('ai.completion.failed', tenantId, {
          requestId,
          model,
          error: msg,
          durationMs,
          organizationId: user.organizationId,
          timestamp: new Date(),
        });
        throw error;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.code(500).send({ error: msg || 'Failed to create completion' });
    }
  });
}

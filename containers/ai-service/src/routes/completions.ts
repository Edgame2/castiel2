import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateRequest } from '@coder/shared';
import { CompletionService } from '../services/CompletionService';
import { EventPublisher } from '@coder/shared';

export async function completionRoutes(fastify: FastifyInstance) {
  const completionService = new CompletionService();
  const eventPublisher = new EventPublisher('coder.events');

  // Register authentication middleware
  fastify.addHook('preHandler', authenticateRequest);

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

      // Publish event: completion started
      await eventPublisher.publish({
        type: 'ai.completion.started',
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
        await eventPublisher.publish({
          type: 'ai.completion.completed',
          requestId,
          model,
          tokensUsed: completion.usage?.totalTokens || 0,
          durationMs,
          organizationId: user.organizationId,
          timestamp: new Date(),
        });

        reply.send(completion);
      } catch (error: any) {
        const durationMs = Date.now() - startTime;

        // Publish event: completion failed
        await eventPublisher.publish({
          type: 'ai.completion.failed',
          requestId,
          model,
          error: error.message,
          durationMs,
          organizationId: user.organizationId,
          timestamp: new Date(),
        });

        throw error;
      }
    } catch (error: any) {
      reply.code(500).send({ error: error.message || 'Failed to create completion' });
    }
  });
}

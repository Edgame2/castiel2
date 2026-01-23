import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { NotificationService } from '../services/NotificationService';
import { authenticateRequest } from '@coder/shared';

export async function notificationRoutes(fastify: FastifyInstance) {
  const notificationService = new NotificationService();

  // Register authentication middleware
  fastify.addHook('preHandler', authenticateRequest);

  // Get notifications
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const query = request.query as any;
      
      const notifications = await notificationService.getNotifications({
        userId: query.userId || user.id,
        organizationId: query.organizationId || user.organizationId,
        read: query.read === 'true' ? true : query.read === 'false' ? false : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : 50,
        offset: query.offset ? parseInt(query.offset, 10) : 0,
      });

      reply.send(notifications);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Mark notification as read
  fastify.put('/:id/read', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      
      await notificationService.markAsRead(id, user.id);
      reply.send({ success: true });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Mark all notifications as read
  fastify.put('/read-all', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const query = request.query as any;
      
      await notificationService.markAllAsRead({
        userId: user.id,
        organizationId: query.organizationId || user.organizationId,
      });
      reply.send({ success: true });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Delete notification
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      
      await notificationService.deleteNotification(id, user.id);
      reply.code(204).send();
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });
}

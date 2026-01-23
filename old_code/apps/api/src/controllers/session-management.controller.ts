import type { FastifyReply, FastifyRequest } from 'fastify';
import { SessionManagementService } from '../services/auth/session-management.service.js';
import { getUser } from '../middleware/authenticate.js';

export class SessionManagementController {
  constructor(private readonly sessionManagementService: SessionManagementService) {}

  async listCurrentSessions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const currentSessionId = this.extractSessionId(request);
      const result = await this.sessionManagementService.listUserSessions(
        user.tenantId,
        user.id,
        currentSessionId
      );

      reply.send(result);
    } catch (error) {
      request.log.error({ err: error }, 'Failed to list user sessions');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Unable to list sessions',
      });
    }
  }

  async getCurrentSession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const { sessionId } = request.params as { sessionId: string };
      const currentSessionId = this.extractSessionId(request);

      const session = await this.sessionManagementService.getSessionDetails(
        user.tenantId,
        user.id,
        sessionId,
        currentSessionId
      );

      if (!session) {
        reply.status(404).send({ error: 'Session not found' });
        return;
      }

      reply.send(session);
    } catch (error) {
      request.log.error({ err: error }, 'Failed to fetch session details');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Unable to fetch session details',
      });
    }
  }

  async terminateSession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const { sessionId } = request.params as { sessionId: string };

      const session = await this.sessionManagementService.getSessionDetails(
        user.tenantId,
        user.id,
        sessionId,
        this.extractSessionId(request)
      );

      if (!session) {
        reply.status(404).send({ error: 'Session not found' });
        return;
      }

      const result = await this.sessionManagementService.revokeSession(
        user.tenantId,
        user.id,
        sessionId
      );

      reply.send(result);
    } catch (error) {
      request.log.error({ err: error }, 'Failed to terminate session');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Unable to terminate session',
      });
    }
  }

  async terminateAllSessions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const { excludeCurrentSessionId } = (request.body as { excludeCurrentSessionId?: string }) || {};
      const currentSessionId = excludeCurrentSessionId || this.extractSessionId(request);

      const result = await this.sessionManagementService.revokeAllSessions(
        user.tenantId,
        user.id,
        currentSessionId
      );

      reply.send(result);
    } catch (error) {
      request.log.error({ err: error }, 'Failed to revoke all sessions');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Unable to revoke sessions',
      });
    }
  }

  async listUserSessions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { tenantId, userId } = request.params as { tenantId: string; userId: string };
      const result = await this.sessionManagementService.listUserSessions(tenantId, userId);
      reply.send(result);
    } catch (error) {
      request.log.error({ err: error }, 'Failed to list tenant user sessions');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Unable to list sessions',
      });
    }
  }

  async adminTerminateSession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { tenantId, userId, sessionId } = request.params as {
        tenantId: string;
        userId: string;
        sessionId: string;
      };

      const result = await this.sessionManagementService.revokeSession(
        tenantId,
        userId,
        sessionId
      );

      reply.send(result);
    } catch (error) {
      request.log.error({ err: error }, 'Failed to admin terminate session');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Unable to terminate session',
      });
    }
  }

  async adminTerminateAllSessions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { tenantId, userId } = request.params as { tenantId: string; userId: string };
      const result = await this.sessionManagementService.adminRevokeAllSessions(tenantId, userId);
      reply.send(result);
    } catch (error) {
      request.log.error({ err: error }, 'Failed to admin revoke sessions');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Unable to revoke sessions',
      });
    }
  }

  private extractSessionId(request: FastifyRequest): string | undefined {
    const fromHeader = request.headers['x-session-id'];
    if (typeof fromHeader === 'string' && fromHeader.length > 0) {
      return fromHeader;
    }

    const user = (request as any).user;
    if (user?.claims?.sid && typeof user.claims.sid === 'string') {
      return user.claims.sid;
    }

    return undefined;
  }
}

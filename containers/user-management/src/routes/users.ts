/**
 * User Management Routes
 * 
 * API endpoints for managing user profiles, sessions, and account operations.
 * 
 * Endpoints:
 * - PUT /api/v1/users/me - Update current user profile
 * - GET /api/v1/users/me/sessions - List user sessions
 * - DELETE /api/v1/users/me/sessions/:sessionId - Revoke a session
 * - POST /api/v1/users/me/sessions/revoke-all-others - Revoke all other sessions
 * - POST /api/v1/users/me/deactivate - Deactivate own account
 * - POST /api/v1/users/:userId/deactivate - Deactivate another user (Super Admin only)
 * - POST /api/v1/users/:userId/reactivate - Reactivate user (Super Admin only)
 * - DELETE /api/v1/users/:userId - Delete user (Super Admin only, after 90 days)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateRequest } from '../middleware/auth';
import * as userService from '../services/UserService';
import { getDatabaseClient } from '@coder/shared';
import { log } from '../utils/logger';
import { publishEventSafely, extractEventMetadata, createBaseEvent } from '../events/publishers/UserManagementEventPublisher';
import { UserManagementEvent } from '../types/events';

export async function setupUserRoutes(fastify: FastifyInstance): Promise<void> {
  // Update current user profile
  fastify.put(
    '/api/v1/users/me',
    { preHandler: authenticateRequest },
    async (
      request: FastifyRequest<{
        Body: {
          name?: string;
          firstName?: string;
          lastName?: string;
          phoneNumber?: string;
          avatarUrl?: string;
          function?: string;
          speciality?: string;
          timezone?: string;
          language?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const updates = request.body;

        // Validate that at least one field is being updated
        if (Object.keys(updates).length === 0) {
          reply.code(400).send({ error: 'At least one field must be provided for update' });
          return;
        }

        // Get before state for audit logging
        const db = getDatabaseClient();
        const beforeState = await db.user.findUnique({
          where: { id: requestUser.id },
          select: {
            name: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            avatarUrl: true,
            function: true,
            speciality: true,
            timezone: true,
            language: true,
          },
        });

        const profile = await userService.updateUserProfile(requestUser.id, updates);

        // Publish user.profile_updated event (consumed by logging service for audit logging)
        const organizationId = (request as any).organizationId;
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('user.profile_updated', requestUser.id, organizationId, undefined, {
            userId: requestUser.id,
            changes: updates,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { data: profile };
      } catch (error: any) {
        log.error('Update user profile error', error, { route: '/api/v1/users/me', userId: (request as any).user?.id, service: 'user-management' });

        // Handle specific errors
        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (
          error.message.includes('must be') ||
          error.message.includes('Invalid') ||
          error.message.includes('format')
        ) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to update user profile',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // List user sessions
  fastify.get(
    '/api/v1/users/me/sessions',
    { preHandler: authenticateRequest },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const currentSessionId = (request as any).sessionId || requestUser.sessionId;
        const sessions = await userService.listUserSessions(requestUser.id, currentSessionId);

        return { data: { sessions } };
      } catch (error: any) {
        log.error('List user sessions error', error, { route: '/api/v1/users/me/sessions', userId: (request as any).user?.id, service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to list user sessions',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // Revoke a specific session
  fastify.delete(
    '/api/v1/users/me/sessions/:sessionId',
    { preHandler: authenticateRequest },
    async (
      request: FastifyRequest<{
        Params: {
          sessionId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { sessionId } = request.params;

        await userService.revokeUserSession(requestUser.id, sessionId);

        // Publish user.session_revoked event (consumed by logging service for audit logging)
        const organizationId = (request as any).organizationId;
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('user.session_revoked', requestUser.id, organizationId, undefined, {
            userId: requestUser.id,
            sessionId,
            reason: 'user_initiated',
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { message: 'Session revoked successfully' };
      } catch (error: any) {
        const params = request.params as { sessionId?: string };
        log.error('Revoke session error', error, { route: '/api/v1/users/me/sessions/:sessionId', userId: (request as any).user?.id, sessionId: params?.sessionId, service: 'user-management' });

        // Handle specific errors
        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('does not belong')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to revoke session',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // Revoke all other sessions (keep current)
  fastify.post(
    '/api/v1/users/me/sessions/revoke-all-others',
    { preHandler: authenticateRequest },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const currentSessionId = (request as any).sessionId || requestUser.sessionId;
        
        if (!currentSessionId) {
          reply.code(400).send({ error: 'Current session ID not found' });
          return;
        }

        // Get count before revocation
        const db = getDatabaseClient();
        const sessions = await db.session.findMany({
          where: {
            userId: requestUser.id,
            id: { not: currentSessionId },
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
        });
        const revokedCount = sessions.length;

        await userService.revokeAllOtherSessions(requestUser.id, currentSessionId);

        // Publish user.session_revoked event (consumed by logging service for audit logging)
        if (revokedCount > 0) {
          const organizationId = (request as any).organizationId;
          const metadata = extractEventMetadata(request);
          // Note: This event type might need to be added to the event types
          await publishEventSafely({
            ...createBaseEvent('user.session_revoked', requestUser.id, organizationId, undefined, {
              userId: requestUser.id,
              count: revokedCount,
              reason: 'user_initiated',
            }),
            timestamp: new Date().toISOString(),
            actorId: requestUser.id,
            metadata,
          } as UserManagementEvent);
        }

        return { message: 'All other sessions revoked successfully', revokedCount };
      } catch (error: any) {
        log.error('Revoke all other sessions error', error, { route: '/api/v1/users/me/sessions/revoke-all-others', userId: (request as any).user?.id, service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to revoke sessions',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // List user organizations is available at GET /api/v1/organizations
  // GET /api/v1/users/me/organizations

  // Deactivate own account
  fastify.post(
    '/api/v1/users/me/deactivate',
    { preHandler: authenticateRequest },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        await userService.deactivateUser(requestUser.id, requestUser.id);

        // Publish user.deactivated event
        const organizationId = (request as any).organizationId;
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('user.deactivated', requestUser.id, organizationId, undefined, {
            userId: requestUser.id,
            deactivatedBy: requestUser.id,
            reason: 'self',
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { message: 'Account deactivated successfully' };
      } catch (error: any) {
        log.error('Deactivate account error', error, { route: '/api/v1/users/me/deactivate', userId: (request as any).user?.id, service: 'user-management' });

        // Handle specific errors
        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('already deactivated')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to deactivate account',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // Deactivate another user (Super Admin only)
  fastify.post(
    '/api/v1/users/:userId/deactivate',
    { preHandler: authenticateRequest },
    async (
      request: FastifyRequest<{
        Params: {
          userId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { userId } = request.params;

        // Prevent deactivating yourself (use /api/v1/users/me/deactivate instead)
        if (userId === requestUser.id) {
          reply.code(400).send({ error: 'Use /api/v1/users/me/deactivate to deactivate your own account' });
          return;
        }

        await userService.deactivateUser(userId, requestUser.id);

        // Publish user.deactivated event (consumed by logging service for audit logging)
        const organizationId = (request as any).organizationId;
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('user.deactivated', userId, organizationId, undefined, {
            userId,
            deactivatedBy: requestUser.id,
            reason: 'admin',
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { message: 'User deactivated successfully' };
      } catch (error: any) {
        const params = request.params as { userId?: string };
        log.error('Deactivate user error', error, { route: '/api/v1/users/:userId/deactivate', userId: (request as any).user?.id, targetUserId: params?.userId, service: 'user-management' });

        // Handle specific errors
        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (error.message.includes('already deactivated')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to deactivate user',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // Reactivate user (Super Admin only)
  fastify.post(
    '/api/v1/users/:userId/reactivate',
    { preHandler: authenticateRequest },
    async (
      request: FastifyRequest<{
        Params: {
          userId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { userId } = request.params;

        await userService.reactivateUser(userId, requestUser.id);

        // Publish user.reactivated event (consumed by logging service for audit logging)
        const organizationId = (request as any).organizationId;
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('user.reactivated', userId, organizationId, undefined, {
            userId,
            reactivatedBy: requestUser.id,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { message: 'User reactivated successfully' };
      } catch (error: any) {
        const params = request.params as { userId?: string };
        log.error('Reactivate user error', error, { route: '/api/v1/users/:userId/reactivate', userId: (request as any).user?.id, targetUserId: params?.userId, service: 'user-management' });

        // Handle specific errors
        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (error.message.includes('already active')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to reactivate user',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // Delete user (Super Admin only, after 90 days)
  fastify.delete(
    '/api/v1/users/:userId',
    { preHandler: authenticateRequest },
    async (
      request: FastifyRequest<{
        Params: {
          userId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { userId } = request.params;

        await userService.deleteUser(userId, requestUser.id);

        // Publish user.deleted event (consumed by logging service for audit logging)
        const organizationId = (request as any).organizationId;
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('user.deleted', userId, organizationId, undefined, {
            userId,
            deletedBy: requestUser.id,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { message: 'User deleted successfully' };
      } catch (error: any) {
        const params = request.params as { userId?: string };
        log.error('Delete user error', error, { route: '/api/v1/users/:userId', userId: (request as any).user?.id, targetUserId: params?.userId, service: 'user-management' });

        // Handle specific errors
        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (error.message.includes('must be soft-deleted first')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        if (error.message.includes('days remaining')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to delete user',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // Health check
  fastify.get('/api/v1/users/health', async () => {
    return { status: 'ok', service: 'user-management-service' };
  });
}


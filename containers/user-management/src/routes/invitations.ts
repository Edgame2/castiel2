/**
 * Invitation Routes
 * 
 * API endpoints for managing organization invitations.
 * Per ModuleImplementationGuide Section 7
 * 
 * Endpoints:
 * - POST /api/v1/organizations/:orgId/invitations - Create invitation
 * - GET /api/v1/organizations/:orgId/invitations - List invitations
 * - POST /api/v1/organizations/:orgId/invitations/:invitationId/resend - Resend invitation
 * - DELETE /api/v1/organizations/:orgId/invitations/:invitationId - Cancel invitation
 * - POST /api/v1/invitations/:token/accept - Accept invitation (public endpoint)
 * - POST /api/v1/organizations/:orgId/invitations/bulk - Bulk invite
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import * as invitationService from '../services/InvitationService';
import { getDatabaseClient } from '@coder/shared';
import { log } from '../utils/logger';
import { publishEventSafely, extractEventMetadata, createBaseEvent } from '../events/publishers/UserManagementEventPublisher';
import { UserManagementEvent } from '../types/events';

export async function setupInvitationRoutes(fastify: FastifyInstance): Promise<void> {
  // Create invitation
  fastify.post(
    '/api/v1/organizations/:orgId/invitations',
    {
      preHandler: [
        authenticateRequest,
        requirePermission('users.user.invite', 'organization'),
      ],
    },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
        Body: {
          email?: string; // Optional for link-based invitations
          roleId: string;
          message?: string;
          invitationType?: 'email' | 'link';
          metadata?: Record<string, any>; // Teams to join, etc.
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

        const { orgId } = request.params;
        const { email, roleId, message, invitationType = 'email', metadata } = request.body;

        // Email is required for email-type invitations
        if (invitationType === 'email' && (!email || !email.trim())) {
          reply.code(400).send({ error: 'Email is required for email-type invitations' });
          return;
        }

        if (!roleId || !roleId.trim()) {
          reply.code(400).send({ error: 'Role ID is required' });
          return;
        }

        const invitation = await invitationService.createInvitation(
          orgId,
          email || '',
          roleId,
          requestUser.id,
          message,
          invitationType,
          metadata
        );

        // Publish invitation.created event (notification service will consume it for email sending)
        const metadata_event = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('invitation.created', requestUser.id, orgId, undefined, {
            invitationId: invitation.id,
            organizationId: orgId,
            email: invitation.email,
            invitationType,
            expiresAt: invitation.expiresAt.toISOString(),
            createdBy: requestUser.id,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata: metadata_event,
        } as UserManagementEvent);

        reply.code(201).send({ data: invitation });
      } catch (error: any) {
        const params = request.params as { orgId?: string };
        log.error('Create invitation error', error, { route: '/api/v1/organizations/:orgId/invitations', userId: (request as any).user?.id, organizationId: params?.orgId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (
          error.message.includes('already a member') ||
          error.message.includes('reached its member limit') ||
          error.message.includes('Invalid email') ||
          error.message.includes('required')
        ) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to create invitation',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // List invitations
  fastify.get(
    '/api/v1/organizations/:orgId/invitations',
    {
      preHandler: [
        authenticateRequest,
        requirePermission('users.user.invite', 'organization'),
      ],
    },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
        Querystring: {
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
          email?: string;
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

        const { orgId } = request.params;
        const { status, email } = request.query;

        const filters: invitationService.InvitationFilters = {};
        if (status) {
          filters.status = status;
        }
        if (email) {
          filters.email = email;
        }

        const invitations = await invitationService.listInvitations(orgId, filters);

        return { data: invitations };
      } catch (error: any) {
        const params = request.params as { orgId?: string };
        log.error('List invitations error', error, { route: '/api/v1/organizations/:orgId/invitations', userId: (request as any).user?.id, organizationId: params?.orgId, service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to list invitations',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // Resend invitation
  fastify.post(
    '/api/v1/organizations/:orgId/invitations/:invitationId/resend',
    {
      preHandler: [
        authenticateRequest,
        requirePermission('users.user.invite', 'organization'),
      ],
    },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
          invitationId: string;
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

        const { invitationId } = request.params;

        const invitation = await invitationService.resendInvitation(
          invitationId,
          requestUser.id
        );

        // Publish invitation.resent event (notification service will consume it for email sending)
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('invitation.resent', requestUser.id, invitation.organizationId, undefined, {
            invitationId: invitation.id,
            organizationId: invitation.organizationId,
            email: invitation.email,
            resendCount: invitation.resendCount,
            resentBy: requestUser.id,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { data: invitation };
      } catch (error: any) {
        const params = request.params as { orgId?: string; invitationId?: string };
        log.error('Resend invitation error', error, { route: '/api/v1/organizations/:orgId/invitations/:invitationId/resend', userId: (request as any).user?.id, organizationId: params?.orgId, invitationId: params?.invitationId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (
          error.message.includes('Cannot resend') ||
          error.message.includes('expired') ||
          error.message.includes('Maximum resend limit')
        ) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to resend invitation',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // Cancel invitation
  fastify.delete(
    '/api/v1/organizations/:orgId/invitations/:invitationId',
    {
      preHandler: [
        authenticateRequest,
        requirePermission('users.user.invite', 'organization'),
      ],
    },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
          invitationId: string;
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

        const { invitationId } = request.params;

        // Get invitation info before cancellation for audit log (Prisma client - see server for DB wiring)
        const db = getDatabaseClient() as unknown as { invitation: { findUnique: (args: unknown) => Promise<{ id: string; organizationId: string; email: string } | null> } };
        const invitation = await db.invitation.findUnique({
          where: { id: invitationId },
          select: {
            id: true,
            organizationId: true,
            email: true,
          },
        });

        if (!invitation) {
          reply.code(404).send({ error: 'Invitation not found' });
          return;
        }

        await invitationService.cancelInvitation(invitationId, requestUser.id);

        // Publish invitation.cancelled event (logging service will consume it)
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('invitation.cancelled', requestUser.id, invitation.organizationId, undefined, {
            invitationId: invitation.id,
            organizationId: invitation.organizationId,
            email: invitation.email,
            cancelledBy: requestUser.id,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { message: 'Invitation cancelled successfully' };
      } catch (error: any) {
        const params = request.params as { orgId?: string; invitationId?: string };
        log.error('Cancel invitation error', error, { route: '/api/v1/organizations/:orgId/invitations/:invitationId', userId: (request as any).user?.id, organizationId: params?.orgId, invitationId: params?.invitationId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (error.message.includes('Cannot cancel')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to cancel invitation',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // Accept invitation (public endpoint - no auth required)
  fastify.post(
    '/api/v1/invitations/:token/accept',
    (async (
      request: FastifyRequest<{
        Params: {
          token: string;
        };
        Body: {
          userId?: string; // Optional - if user is already registered
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { token } = request.params;
        const { userId } = request.body;

        // Get invitation by token
        const invitation = await invitationService.getInvitationByToken(token);

        if (!invitation) {
          reply.code(404).send({ error: 'Invitation not found or has expired' });
          return;
        }

        const db = getDatabaseClient() as unknown as {
          organizationMembership: { findFirst: (args: unknown) => Promise<unknown>; create: (args: unknown) => Promise<unknown> };
          invitation: { update: (args: unknown) => Promise<unknown> };
        };

        // If userId provided, user is already registered
        if (userId) {
          // Check if user is already a member
          const existingMembership = await db.organizationMembership.findFirst({
            where: {
              userId,
              organizationId: invitation.organizationId,
              status: 'active',
              deletedAt: null,
            },
          });

          if (existingMembership) {
            reply.code(409).send({ error: 'User is already a member of this organization' });
            return;
          }

          // Create membership
          await db.organizationMembership.create({
            data: {
              userId,
              organizationId: invitation.organizationId,
              roleId: invitation.roleId,
              status: 'active',
              joinedAt: new Date(),
            },
          });

          // Update invitation
          await db.invitation.update({
            where: { id: invitation.id },
            data: {
              status: 'accepted',
              acceptedAt: new Date(),
              invitedUserId: userId,
            },
          });

          // Publish invitation.accepted event (logging service will consume it)
          const metadata = extractEventMetadata(request);
          await publishEventSafely({
            ...createBaseEvent('invitation.accepted', userId, invitation.organizationId, undefined, {
              invitationId: invitation.id,
              organizationId: invitation.organizationId,
              userId,
              roleId: invitation.roleId,
            }),
            timestamp: new Date().toISOString(),
            actorId: userId,
            metadata,
          } as UserManagementEvent);

          return { message: 'Invitation accepted successfully' };
        } else {
          // User is not registered yet - return invitation details for registration flow
          // The frontend will handle user registration, then call this endpoint again with userId
          return {
            data: {
              invitation: {
                id: invitation.id,
                organization: invitation.organization,
                role: invitation.role,
                message: invitation.message,
              },
              requiresRegistration: true,
            },
          };
        }
      } catch (error: any) {
        const params = request.params as { token?: string };
        log.error('Accept invitation error', error, { route: '/api/v1/invitations/:token/accept', token: params?.token, service: 'user-management' });

        if (error.message.includes('not found') || error.message.includes('expired')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('already a member')) {
          reply.code(409).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to accept invitation',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // Bulk invite
  fastify.post(
    '/api/v1/organizations/:orgId/invitations/bulk',
    {
      preHandler: [
        authenticateRequest,
        requirePermission('users.user.invite', 'organization'),
      ],
    },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
        Body: {
          invitations: Array<{
            email: string;
            roleId: string;
            message?: string;
          }>;
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

        const { orgId } = request.params;
        const { invitations } = request.body;

        if (!Array.isArray(invitations) || invitations.length === 0) {
          reply.code(400).send({ error: 'invitations must be a non-empty array' });
          return;
        }

        if (invitations.length > 100) {
          reply.code(400).send({ error: 'Maximum 100 invitations per bulk request' });
          return;
        }

        const results = [];
        const errors = [];

        for (const inv of invitations) {
          try {
            const invitation = await invitationService.createInvitation(
              orgId,
              inv.email,
              inv.roleId,
              requestUser.id,
              inv.message,
              'email'
            );

            results.push({
              email: inv.email,
              invitationId: invitation.id,
              status: 'created',
            });

            // Publish invitation.created event for each
            const metadata = extractEventMetadata(request);
            await publishEventSafely({
              ...createBaseEvent('invitation.created', requestUser.id, orgId, undefined, {
                invitationId: invitation.id,
                organizationId: orgId,
                email: invitation.email,
                invitationType: 'email',
                expiresAt: invitation.expiresAt.toISOString(),
                createdBy: requestUser.id,
              }),
              timestamp: new Date().toISOString(),
              actorId: requestUser.id,
              metadata,
            } as UserManagementEvent);
          } catch (error: any) {
            errors.push({
              email: inv.email,
              error: error.message,
            });
          }
        }

        return {
          data: {
            created: results,
            errors,
            summary: {
              total: invitations.length,
              created: results.length,
              failed: errors.length,
            },
          },
        };
      } catch (error: any) {
        const params = request.params as { orgId?: string };
        log.error('Bulk invite error', error, { route: '/api/v1/organizations/:orgId/invitations/bulk', userId: (request as any).user?.id, organizationId: params?.orgId, service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to create bulk invitations',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );
}


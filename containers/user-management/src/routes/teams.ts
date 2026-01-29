/**
 * Team Routes
 * 
 * API endpoints for managing teams.
 * Per ModuleImplementationGuide Section 7
 * 
 * Endpoints:
 * - POST /api/v1/teams - Create team
 * - GET /api/v1/teams - List user's teams
 * - GET /api/v1/teams/:teamId - Get team details
 * - PUT /api/v1/teams/:teamId - Update team
 * - DELETE /api/v1/teams/:teamId - Delete team
 * - POST /api/v1/teams/:teamId/members - Add team member
 * - DELETE /api/v1/teams/:teamId/members/:userId - Remove team member
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import * as teamService from '../services/TeamService';
import { getDatabaseClient } from '@coder/shared';
import { log } from '../utils/logger';
import { publishEventSafely, extractEventMetadata, createBaseEvent } from '../events/publishers/UserManagementEventPublisher';
import { UserManagementEvent } from '../types/events';

export async function setupTeamRoutes(fastify: FastifyInstance): Promise<void> {
  // Create team
  fastify.post(
    '/api/v1/teams',
    {
      preHandler: [
        authenticateRequest,
        async (request: FastifyRequest, reply: FastifyReply) => {
          // Get organizationId from body or user's active organization membership
          const body = request.body as any;
          const userId = (request as any).user?.id;
          
          if (!userId) {
            reply.code(401).send({ error: 'Not authenticated' });
            return;
          }

          let organizationId = body?.organizationId;
          
          // If not in body, get from user's active organization membership
          if (!organizationId) {
            const db = getDatabaseClient() as unknown as {
              organizationMembership: { findFirst: (args: unknown) => Promise<{ organizationId: string } | null> };
            };
            const membership = await db.organizationMembership.findFirst({
              where: {
                userId,
                status: 'active',
              },
              orderBy: { joinedAt: 'desc' },
              select: { organizationId: true },
            });
            
            if (membership) {
              organizationId = membership.organizationId;
            }
          }

          if (!organizationId) {
            reply.code(400).send({ error: 'Organization context required. Please select an organization or provide organizationId in request.' });
            return;
          }

          // Set organizationId on request for permission check
          (request as any).organizationId = organizationId;
        },
        requirePermission('teams.team.create'),
      ],
    },
    (async (
      request: FastifyRequest<{
        Body: {
          name: string;
          description?: string;
          parentTeamId?: string;
          organizationId?: string;
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

        const { name, description, parentTeamId } = request.body;
        const organizationId = (request as any).organizationId as string;

        if (!name || name.trim().length === 0) {
          reply.code(400).send({ error: 'Team name is required' });
          return;
        }

        const team = await teamService.createTeam(
          organizationId,
          requestUser.id,
          name,
          description,
          parentTeamId
        );

        // Publish team.created event (logging service will consume it)
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('team.created', requestUser.id, organizationId, undefined, {
            teamId: team.id,
            organizationId,
            name: team.name,
            parentTeamId: team.parentTeamId || undefined,
            createdBy: requestUser.id,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        reply.code(201).send({ data: team });
      } catch (error: any) {
        log.error('Create team error', error, { route: '/api/v1/teams', userId: (request as any).user?.id, service: 'user-management' });

        if (error.message.includes('not found') || error.message.includes('must belong')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('must be a member')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (error.message.includes('name must be') || error.message.includes('required')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to create team',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
  }) as any
  );

  // List user's teams
  fastify.get(
    '/api/v1/teams',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Querystring: {
          organizationId?: string;
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

        const { organizationId } = request.query;

        const teams = await teamService.listUserTeams(requestUser.id, organizationId);

        return { data: teams };
      } catch (error: any) {
        log.error('List teams error', error, { route: '/api/v1/teams', userId: (request as any).user?.id, service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to list teams',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
  }) as any
  );

  // Get team details
  fastify.get(
    '/api/v1/teams/:teamId',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: {
          teamId: string;
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

        const { teamId } = request.params;

        const team = await teamService.getTeam(teamId, requestUser.id);

        if (!team) {
          reply.code(404).send({ error: 'Team not found' });
          return;
        }

        return { data: team };
      } catch (error: any) {
        const params = request.params as { teamId?: string };
        log.error('Get team error', error, { route: '/api/v1/teams/:teamId', userId: (request as any).user?.id, teamId: params?.teamId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('not a member')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to get team',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
  }) as any
  );

  // Update team
  fastify.put(
    '/api/v1/teams/:teamId',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: {
          teamId: string;
        };
        Body: {
          name?: string;
          description?: string;
          parentTeamId?: string;
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

        const { teamId } = request.params;
        const updates = request.body;

        if (Object.keys(updates).length === 0) {
          reply.code(400).send({ error: 'At least one field must be provided for update' });
          return;
        }

        // Get before state for audit logging
        void (await teamService.getTeam(teamId));

        const team = await teamService.updateTeam(teamId, requestUser.id, updates);

        // Publish team.updated event (logging service will consume it)
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('team.updated', requestUser.id, team.organizationId || undefined, undefined, {
            teamId: team.id,
            organizationId: team.organizationId || undefined,
            changes: updates,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { data: team };
      } catch (error: any) {
        const params = request.params as { teamId?: string };
        log.error('Update team error', error, { route: '/api/v1/teams/:teamId', userId: (request as any).user?.id, teamId: params?.teamId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (
          error.message.includes('cannot be empty') ||
          error.message.includes('must be') ||
          error.message.includes('cannot be its own parent')
        ) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to update team',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
  }) as any
  );

  // Delete team
  fastify.delete(
    '/api/v1/teams/:teamId',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: {
          teamId: string;
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

        const { teamId } = request.params;

        // Get team info before deletion for audit log
        const team = await teamService.getTeam(teamId);
        if (!team) {
          reply.code(404).send({ error: 'Team not found' });
          return;
        }

        await teamService.deleteTeam(teamId, requestUser.id);

        // Publish team.deleted event (logging service will consume it)
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('team.deleted', requestUser.id, team.organizationId || undefined, undefined, {
            teamId: team.id,
            organizationId: team.organizationId || undefined,
            name: team.name,
            deletedBy: requestUser.id,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { message: 'Team deleted successfully' };
      } catch (error: any) {
        const params = request.params as { teamId?: string };
        log.error('Delete team error', error, { route: '/api/v1/teams/:teamId', userId: (request as any).user?.id, teamId: params?.teamId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (error.message.includes('Cannot delete team with')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to delete team',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
  }) as any
  );

  // Add team member
  fastify.post(
    '/api/v1/teams/:teamId/members',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: {
          teamId: string;
        };
        Body: {
          userId: string;
          role?: string;
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

        const { teamId } = request.params;
        const { userId, role = 'Member' } = request.body;

        if (!userId) {
          reply.code(400).send({ error: 'User ID is required' });
          return;
        }

        // Get team for organizationId
        const team = await teamService.getTeam(teamId);
        if (!team) {
          reply.code(404).send({ error: 'Team not found' });
          return;
        }

        const member = await teamService.addTeamMember(teamId, requestUser.id, userId, role);

        // Publish team.member_added event (logging service will consume it)
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('team.member_added', requestUser.id, team.organizationId || undefined, undefined, {
            teamId: team.id,
            organizationId: team.organizationId || undefined,
            userId,
            role,
            addedBy: requestUser.id,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        reply.code(201).send({ data: member });
      } catch (error: any) {
        const params = request.params as { teamId?: string };
        log.error('Add team member error', error, { route: '/api/v1/teams/:teamId/members', userId: (request as any).user?.id, teamId: params?.teamId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (error.message.includes('already a member')) {
          reply.code(409).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to add team member',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
  }) as any
  );

  // Remove team member
  fastify.delete(
    '/api/v1/teams/:teamId/members/:userId',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: {
          teamId: string;
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

        const { teamId, userId } = request.params;

        // Get team for organizationId
        const team = await teamService.getTeam(teamId);
        if (!team) {
          reply.code(404).send({ error: 'Team not found' });
          return;
        }

        await teamService.removeTeamMember(teamId, requestUser.id, userId);

        // Publish team.member_removed event (logging service will consume it)
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('team.member_removed', requestUser.id, team.organizationId || undefined, undefined, {
            teamId: team.id,
            organizationId: team.organizationId || undefined,
            userId,
            removedBy: requestUser.id,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { message: 'Team member removed successfully' };
      } catch (error: any) {
        const params = request.params as { teamId?: string; userId?: string };
        log.error('Remove team member error', error, { route: '/api/v1/teams/:teamId/members/:userId', userId: (request as any).user?.id, teamId: params?.teamId, memberUserId: params?.userId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (error.message.includes('Cannot remove team creator')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to remove team member',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
  }) as any
  );
}


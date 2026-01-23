/**
 * Team API Routes
 * REST endpoints for team management
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../types/auth.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  TeamService,
  ShardRepository,
  ShardTypeRepository,
  ShardRelationshipService,
  AuditLogService,
  type TeamFilters,
} from '@castiel/api-core';
import { requireAuth } from '../middleware/authorization.js';

interface TeamRoutesOptions {
  monitoring: IMonitoringProvider;
  shardRepository: ShardRepository;
  shardTypeRepository: ShardTypeRepository;
  relationshipService: ShardRelationshipService;
  auditLogService?: AuditLogService;
}

/**
 * Determine HTTP status code based on error type
 */
function getErrorStatusCode(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  
  // Validation errors (400 Bad Request)
  if (
    message.includes('required') ||
    message.includes('invalid') ||
    message.includes('must be') ||
    message.includes('cannot be') ||
    message.includes('circular reference')
  ) {
    return 400;
  }
  
  // Not found errors (404 Not Found)
  if (message.includes('not found') || message.includes('does not exist')) {
    return 404;
  }
  
  // Forbidden errors (403 Forbidden)
  if (message.includes('forbidden') || message.includes('access denied') || message.includes('permission')) {
    return 403;
  }
  
  // Default to 500 for server errors
  return 500;
}

/**
 * Verify user has access to a team (member, manager, or admin)
 */
async function verifyTeamAccess(
  teamService: TeamService,
  userId: string,
  teamId: string,
  tenantId: string,
  userRoles?: string[]
): Promise<boolean> {
  const isMember = await teamService.isUserMemberOfTeam(userId, teamId, tenantId);
  const isManager = await teamService.isUserManagerOfTeam(userId, teamId, tenantId);
  const isAdmin = !!(userRoles?.includes('admin') || userRoles?.includes('super_admin'));
  return !!(isMember || isManager || isAdmin);
}

/**
 * Register team routes
 */
export async function registerTeamRoutes(
  server: FastifyInstance,
  options: TeamRoutesOptions
): Promise<void> {
  const {
    monitoring,
    shardRepository,
    shardTypeRepository,
    relationshipService,
    auditLogService,
  } = options;

  // Initialize service
  const teamService = new TeamService(
    monitoring,
    shardRepository,
    shardTypeRepository,
    relationshipService,
    auditLogService
  );

  // Get authentication decorator
  const authDecorator = (server as any).authenticate;
  if (!authDecorator) {
    server.log.warn('⚠️  Team routes not registered - authentication decorator missing');
    return;
  }

  const authGuards = [authDecorator, requireAuth()];

  // ===============================================
  // TEAM CRUD ROUTES
  // ===============================================

  // POST /api/v1/teams - Create team
  server.post(
    '/api/v1/teams',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Teams'],
        summary: 'Create a new team',
        body: {
          type: 'object',
          required: ['name', 'manager'],
          properties: {
            name: { type: 'string' },
            manager: {
              type: 'object',
              required: ['userId', 'email'],
              properties: {
                userId: { type: 'string' },
                lastname: { type: 'string' },
                firstname: { type: 'string' },
                email: { type: 'string' },
              },
            },
            members: {
              type: 'array',
              items: {
                type: 'object',
                required: ['userId', 'email'],
                properties: {
                  userId: { type: 'string' },
                  lastname: { type: 'string' },
                  firstname: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                  function: { type: 'string' },
                },
              },
            },
            parentTeamId: { type: 'string' },
            externalId: { type: 'string' },
            externalSource: { type: 'string', enum: ['azure_ad', 'okta', 'google', 'manual'] },
            syncEnabled: { type: 'boolean' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const input = request.body as any;
        
        // Validate and sanitize input
        if (!input || typeof input !== 'object') {
          return reply.code(400).send({ error: 'Invalid request body' });
        }
        
        // Trim string fields
        if (input.name && typeof input.name === 'string') {
          input.name = input.name.trim();
        }
        if (input.manager?.email && typeof input.manager.email === 'string') {
          input.manager.email = input.manager.email.trim().toLowerCase();
        }
        if (input.members && Array.isArray(input.members)) {
          input.members = input.members.map((m: any) => ({
            ...m,
            email: m.email && typeof m.email === 'string' ? m.email.trim().toLowerCase() : m.email,
          }));
        }
        
        const team = await teamService.createTeam(
          input,
          authRequest.user.tenantId,
          authRequest.user.id
        );
        return reply.code(201).send(team);
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'teams.createTeam', statusCode });
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(statusCode).send({ 
          error: errorMessage || 'Failed to create team',
          ...(statusCode === 400 && { details: errorMessage }),
        });
      }
    }
  );

  // GET /api/v1/teams/:teamId - Get team
  server.get(
    '/api/v1/teams/:teamId',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Teams'],
        summary: 'Get a team by ID',
        params: {
          type: 'object',
          required: ['teamId'],
          properties: {
            teamId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const { teamId } = request.params as { teamId: string };
        
        // Validate teamId
        if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
          return reply.code(400).send({ error: 'Invalid teamId parameter' });
        }
        
        const team = await teamService.getTeam(teamId.trim(), authRequest.user.tenantId);
        if (!team) {
          return reply.code(404).send({ error: 'Team not found' });
        }
        
        // Verify user has access to the team
        const hasAccess = await verifyTeamAccess(
          teamService,
          authRequest.user.id,
          teamId.trim(),
          authRequest.user.tenantId,
          authRequest.user.roles
        );
        
        if (!hasAccess) {
          return reply.code(403).send({ 
            error: 'Forbidden',
            message: 'You do not have permission to access this team' 
          });
        }
        
        return reply.send(team);
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(errorMessage),
          { operation: 'teams.getTeam', statusCode });
        return reply.code(statusCode).send({ error: errorMessage || 'Failed to get team' });
      }
    }
  );

  // GET /api/v1/teams - List teams
  server.get(
    '/api/v1/teams',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Teams'],
        summary: 'List teams with optional filters',
        querystring: {
          type: 'object',
          properties: {
            managerId: { type: 'string' },
            memberId: { type: 'string' },
            parentTeamId: { type: 'string' },
            externalSource: { type: 'string', enum: ['azure_ad', 'okta', 'google', 'manual'] },
            syncEnabled: { type: 'boolean' },
            isManuallyEdited: { type: 'boolean' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const query = request.query as Record<string, unknown>;
        const filters: TeamFilters = {};
        
        if (query.managerId && typeof query.managerId === 'string') {
          filters.managerId = query.managerId;
        }
        if (query.memberId && typeof query.memberId === 'string') {
          filters.memberId = query.memberId;
        }
        if (query.parentTeamId !== undefined) {
          filters.parentTeamId = query.parentTeamId === 'null' || query.parentTeamId === null ? null : (typeof query.parentTeamId === 'string' ? query.parentTeamId : undefined);
        }
        if (query.externalSource && typeof query.externalSource === 'string') {
          const validSources = ['azure_ad', 'okta', 'google', 'manual'] as const;
          if (validSources.includes(query.externalSource as typeof validSources[number])) {
            filters.externalSource = query.externalSource as typeof validSources[number];
          }
        }
        if (query.syncEnabled !== undefined) {
          filters.syncEnabled = query.syncEnabled === 'true' || query.syncEnabled === true;
        }
        if (query.isManuallyEdited !== undefined) {
          filters.isManuallyEdited = query.isManuallyEdited === 'true' || query.isManuallyEdited === true;
        }

        const teams = await teamService.getTeams(authRequest.user.tenantId, filters as TeamFilters);
        return reply.send(teams);
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(errorMessage),
          { operation: 'teams.getTeams', statusCode });
        return reply.code(statusCode).send({ error: errorMessage || 'Failed to list teams' });
      }
    }
  );

  // PUT /api/v1/teams/:teamId - Update team
  server.put(
    '/api/v1/teams/:teamId',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Teams'],
        summary: 'Update a team',
        params: {
          type: 'object',
          required: ['teamId'],
          properties: {
            teamId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            manager: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                lastname: { type: 'string' },
                firstname: { type: 'string' },
                email: { type: 'string' },
              },
            },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  lastname: { type: 'string' },
                  firstname: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                  function: { type: 'string' },
                },
              },
            },
            parentTeamId: { type: ['string', 'null'] },
            syncEnabled: { type: 'boolean' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const { teamId } = request.params as { teamId: string };
        
        // Validate teamId
        if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
          return reply.code(400).send({ error: 'Invalid teamId parameter' });
        }
        
        // Verify user has permission: must be manager or admin
        const isManager = await teamService.isUserManagerOfTeam(
          authRequest.user.id,
          teamId.trim(),
          authRequest.user.tenantId
        );
        const isAdmin = authRequest.user.roles?.includes('admin') || 
                       authRequest.user.roles?.includes('super_admin');
        
        if (!isManager && !isAdmin) {
          return reply.code(403).send({ 
            error: 'Forbidden',
            message: 'Only team managers or admins can update teams' 
          });
        }
        
        const input = request.body as any;
        
        // Validate and sanitize input
        if (!input || typeof input !== 'object') {
          return reply.code(400).send({ error: 'Invalid request body' });
        }
        
        // Trim string fields
        if (input.name && typeof input.name === 'string') {
          input.name = input.name.trim();
        }
        if (input.manager?.email && typeof input.manager.email === 'string') {
          input.manager.email = input.manager.email.trim().toLowerCase();
        }
        if (input.members && Array.isArray(input.members)) {
          input.members = input.members.map((m: any) => ({
            ...m,
            email: m.email && typeof m.email === 'string' ? m.email.trim().toLowerCase() : m.email,
          }));
        }
        
        const team = await teamService.updateTeam(
          teamId.trim(),
          input,
          authRequest.user.tenantId,
          authRequest.user.id
        );
        return reply.send(team);
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'teams.updateTeam', statusCode });
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(statusCode).send({ error: errorMessage || 'Failed to update team' });
      }
    }
  );

  // DELETE /api/v1/teams/:teamId - Delete team
  server.delete(
    '/api/v1/teams/:teamId',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Teams'],
        summary: 'Delete a team',
        params: {
          type: 'object',
          required: ['teamId'],
          properties: {
            teamId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const { teamId } = request.params as { teamId: string };
        
        // Validate teamId
        if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
          return reply.code(400).send({ error: 'Invalid teamId parameter' });
        }
        
        // Verify user has permission: must be manager or admin
        const isManager = await teamService.isUserManagerOfTeam(
          authRequest.user.id,
          teamId.trim(),
          authRequest.user.tenantId
        );
        const isAdmin = authRequest.user.roles?.includes('admin') || 
                       authRequest.user.roles?.includes('super_admin');
        
        if (!isManager && !isAdmin) {
          return reply.code(403).send({ 
            error: 'Forbidden',
            message: 'Only team managers or admins can delete teams' 
          });
        }
        
        await teamService.deleteTeam(teamId.trim(), authRequest.user.tenantId, authRequest.user.id);
        return reply.code(204).send();
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'teams.deleteTeam', statusCode });
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(statusCode).send({ error: errorMessage || 'Failed to delete team' });
      }
    }
  );

  // ===============================================
  // TEAM HIERARCHY ROUTES
  // ===============================================

  // GET /api/v1/teams/:teamId/parent - Get parent team
  server.get(
    '/api/v1/teams/:teamId/parent',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Teams'],
        summary: 'Get parent team',
        params: {
          type: 'object',
          required: ['teamId'],
          properties: {
            teamId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const { teamId } = request.params as { teamId: string };
        
        // Validate teamId
        if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
          return reply.code(400).send({ error: 'Invalid teamId parameter' });
        }
        
        // Verify user has access to the team
        const isMember = await teamService.isUserMemberOfTeam(
          authRequest.user.id,
          teamId.trim(),
          authRequest.user.tenantId
        );
        const isManager = await teamService.isUserManagerOfTeam(
          authRequest.user.id,
          teamId.trim(),
          authRequest.user.tenantId
        );
        const isAdmin = authRequest.user.roles?.includes('admin') || 
                       authRequest.user.roles?.includes('super_admin');
        
        if (!isMember && !isManager && !isAdmin) {
          return reply.code(403).send({ 
            error: 'Forbidden',
            message: 'You do not have permission to access this team' 
          });
        }
        
        const parentTeam = await teamService.getParentTeam(teamId.trim(), authRequest.user.tenantId);
        if (!parentTeam) {
          return reply.code(404).send({ error: 'Parent team not found' });
        }
        return reply.send(parentTeam);
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'teams.getParentTeam', statusCode });
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(statusCode).send({ error: errorMessage || 'Failed to get parent team' });
      }
    }
  );

  // GET /api/v1/teams/:teamId/children - Get child teams
  server.get(
    '/api/v1/teams/:teamId/children',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Teams'],
        summary: 'Get child teams',
        params: {
          type: 'object',
          required: ['teamId'],
          properties: {
            teamId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const { teamId } = request.params as { teamId: string };
        
        // Validate teamId
        if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
          return reply.code(400).send({ error: 'Invalid teamId parameter' });
        }
        
        // Verify user has access to the team
        const hasAccess = await verifyTeamAccess(
          teamService,
          authRequest.user.id,
          teamId.trim(),
          authRequest.user.tenantId,
          authRequest.user.roles
        );
        
        if (!hasAccess) {
          return reply.code(403).send({ 
            error: 'Forbidden',
            message: 'You do not have permission to access this team' 
          });
        }
        
        const childTeams = await teamService.getChildTeams(teamId.trim(), authRequest.user.tenantId);
        return reply.send(childTeams);
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'teams.getChildTeams', statusCode });
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(statusCode).send({ error: errorMessage || 'Failed to get child teams' });
      }
    }
  );

  // GET /api/v1/teams/:teamId/descendants - Get all descendant teams
  server.get(
    '/api/v1/teams/:teamId/descendants',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Teams'],
        summary: 'Get all descendant teams (recursive)',
        params: {
          type: 'object',
          required: ['teamId'],
          properties: {
            teamId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const { teamId } = request.params as { teamId: string };
        
        // Validate teamId
        if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
          return reply.code(400).send({ error: 'Invalid teamId parameter' });
        }
        
        // Verify user has access to the team
        const hasAccess = await verifyTeamAccess(
          teamService,
          authRequest.user.id,
          teamId.trim(),
          authRequest.user.tenantId,
          authRequest.user.roles
        );
        
        if (!hasAccess) {
          return reply.code(403).send({ 
            error: 'Forbidden',
            message: 'You do not have permission to access this team' 
          });
        }
        
        const descendants = await teamService.getDescendantTeams(teamId.trim(), authRequest.user.tenantId);
        return reply.send(descendants);
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'teams.getDescendantTeams', statusCode });
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(statusCode).send({ error: errorMessage || 'Failed to get descendant teams' });
      }
    }
  );

  // ===============================================
  // TEAM MEMBERS ROUTES
  // ===============================================

  // GET /api/v1/teams/:teamId/members - Get team members
  server.get(
    '/api/v1/teams/:teamId/members',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Teams'],
        summary: 'Get team members',
        params: {
          type: 'object',
          required: ['teamId'],
          properties: {
            teamId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const { teamId } = request.params as { teamId: string };
        
        // Validate teamId
        if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
          return reply.code(400).send({ error: 'Invalid teamId parameter' });
        }
        
        // Verify user has access to the team
        const hasAccess = await verifyTeamAccess(
          teamService,
          authRequest.user.id,
          teamId.trim(),
          authRequest.user.tenantId,
          authRequest.user.roles
        );
        
        if (!hasAccess) {
          return reply.code(403).send({ 
            error: 'Forbidden',
            message: 'You do not have permission to access this team' 
          });
        }
        
        const members = await teamService.getTeamMembers(teamId.trim(), authRequest.user.tenantId);
        return reply.send(members);
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'teams.getTeamMembers', statusCode });
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(statusCode).send({ error: errorMessage || 'Failed to get team members' });
      }
    }
  );

  // GET /api/v1/teams/:teamId/manager - Get team manager
  server.get(
    '/api/v1/teams/:teamId/manager',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Teams'],
        summary: 'Get team manager',
        params: {
          type: 'object',
          required: ['teamId'],
          properties: {
            teamId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const { teamId } = request.params as { teamId: string };
        
        // Validate teamId
        if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
          return reply.code(400).send({ error: 'Invalid teamId parameter' });
        }
        
        // Verify user has access to the team
        const hasAccess = await verifyTeamAccess(
          teamService,
          authRequest.user.id,
          teamId.trim(),
          authRequest.user.tenantId,
          authRequest.user.roles
        );
        
        if (!hasAccess) {
          return reply.code(403).send({ 
            error: 'Forbidden',
            message: 'You do not have permission to access this team' 
          });
        }
        
        const manager = await teamService.getTeamManager(teamId.trim(), authRequest.user.tenantId);
        if (!manager) {
          return reply.code(404).send({ error: 'Team manager not found' });
        }
        return reply.send(manager);
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'teams.getTeamManager', statusCode });
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(statusCode).send({ error: errorMessage || 'Failed to get team manager' });
      }
    }
  );

  // GET /api/v1/teams/:teamId/user-ids - Get all user IDs in team
  server.get(
    '/api/v1/teams/:teamId/user-ids',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Teams'],
        summary: 'Get all user IDs in team (manager + members)',
        params: {
          type: 'object',
          required: ['teamId'],
          properties: {
            teamId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const { teamId } = request.params as { teamId: string };
        
        // Validate teamId
        if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
          return reply.code(400).send({ error: 'Invalid teamId parameter' });
        }
        
        // Verify user has access to the team
        const hasAccess = await verifyTeamAccess(
          teamService,
          authRequest.user.id,
          teamId.trim(),
          authRequest.user.tenantId,
          authRequest.user.roles
        );
        
        if (!hasAccess) {
          return reply.code(403).send({ 
            error: 'Forbidden',
            message: 'You do not have permission to access this team' 
          });
        }
        
        const userIds = await teamService.getTeamUserIds(teamId.trim(), authRequest.user.tenantId);
        return reply.send({ userIds });
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'teams.getTeamUserIds', statusCode });
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(statusCode).send({ error: errorMessage || 'Failed to get team user IDs' });
      }
    }
  );

  // GET /api/v1/teams/:teamId/user-ids/recursive - Get all user IDs including descendants
  server.get(
    '/api/v1/teams/:teamId/user-ids/recursive',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Teams'],
        summary: 'Get all user IDs in team including descendants',
        params: {
          type: 'object',
          required: ['teamId'],
          properties: {
            teamId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const { teamId } = request.params as { teamId: string };
        const userIds = await teamService.getTeamUserIdsRecursive(teamId, authRequest.user.tenantId);
        return reply.send({ userIds });
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'teams.getTeamUserIdsRecursive', statusCode });
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(statusCode).send({ error: errorMessage || 'Failed to get team user IDs recursively' });
      }
    }
  );

  // ===============================================
  // USER-TEAM QUERY ROUTES
  // ===============================================

  // GET /api/v1/users/:userId/teams - Get teams for a user
  server.get(
    '/api/v1/users/:userId/teams',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Teams'],
        summary: 'Get teams for a user (as manager or member)',
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const { userId } = request.params as { userId: string };
        
        // Validate userId
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
          return reply.code(400).send({ error: 'Invalid userId parameter' });
        }
        
        // Security: Users can only view their own teams, or admins can view any user's teams
        const isAdmin = authRequest.user.roles?.includes('admin') || 
                       authRequest.user.roles?.includes('super_admin');
        const isOwnRequest = userId.trim() === authRequest.user.id;
        
        if (!isOwnRequest && !isAdmin) {
          return reply.code(403).send({ 
            error: 'Forbidden',
            message: 'You can only view your own teams' 
          });
        }
        
        const managerTeams = await teamService.getManagerTeams(userId.trim(), authRequest.user.tenantId);
        const memberTeams = await teamService.getUserTeams(userId.trim(), authRequest.user.tenantId);
        return reply.send({
          managerTeams,
          memberTeams,
        });
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'teams.getUserTeams', statusCode });
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(statusCode).send({ error: errorMessage || 'Failed to get user teams' });
      }
    }
  );

  // GET /api/v1/users/:userId/team - Get primary team for a user
  server.get(
    '/api/v1/users/:userId/team',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Teams'],
        summary: 'Get primary team for a user',
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const { userId } = request.params as { userId: string };
        
        // Validate userId
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
          return reply.code(400).send({ error: 'Invalid userId parameter' });
        }
        
        // Security: Users can only view their own team, or admins can view any user's team
        const isAdmin = authRequest.user.roles?.includes('admin') || 
                       authRequest.user.roles?.includes('super_admin');
        const isOwnRequest = userId.trim() === authRequest.user.id;
        
        if (!isOwnRequest && !isAdmin) {
          return reply.code(403).send({ 
            error: 'Forbidden',
            message: 'You can only view your own team' 
          });
        }
        
        const team = await teamService.getTeamForUser(userId.trim(), authRequest.user.tenantId);
        if (!team) {
          return reply.code(404).send({ error: 'No team found for user' });
        }
        return reply.send(team);
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'teams.getTeamForUser', statusCode });
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(statusCode).send({ error: errorMessage || 'Failed to get team for user' });
      }
    }
  );
}


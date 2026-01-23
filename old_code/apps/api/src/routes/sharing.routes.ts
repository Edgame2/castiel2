/**
 * Project Sharing & Collaboration Routes
 * Endpoints for managing project sharing, collaborators, and ownership
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ProjectSharingService } from '../services/project-sharing.service.js';
import { ProjectActivityService } from '../services/project-activity.service.js';
import {
  ShareProjectInput,
  TransferOwnershipInput,
  RevokeAccessInput,
  UpdateCollaboratorRoleInput,
  BulkShareInput,
} from '../types/project-sharing.types.js';
import { ActivityQueryParams } from '../types/project-activity.types.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';

export async function registerSharingRoutes(
  fastify: FastifyInstance,
  sharingService: ProjectSharingService,
  activityService: ProjectActivityService,
) {
  /**
   * POST /api/v1/projects/:projectId/share
   * Share project with a user
   */
  fastify.post<{ Params: { projectId: string }; Body: ShareProjectInput }>(
    '/api/v1/projects/:projectId/share',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { projectId } = request.params as { projectId: string };
        const tenantId = authRequest.user?.tenantId;
        const userId = authRequest.user?.id;
        const displayName = authRequest.user?.email;
        
        if (!tenantId || !userId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        }

        const result = await sharingService.shareWithUser(
          tenantId,
          projectId,
          request.body,
          userId,
          displayName,
        );

        reply.code(201).send(result);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * POST /api/v1/projects/bulk-share
   * Share multiple projects with users in bulk
   */
  fastify.post<{ Body: BulkShareInput }>(
    '/api/v1/projects/bulk-share',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const tenantId = authRequest.user?.tenantId;
        const userId = authRequest.user?.id;
        const displayName = authRequest.user?.email;
        
        if (!tenantId || !userId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        }

        const result = await sharingService.bulkShareProjects(
          tenantId,
          request.body,
          userId,
          displayName,
        );

        reply.code(200).send(result);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * GET /api/v1/projects/:projectId/collaborators
   * Get all collaborators for a project
   */
  fastify.get<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/collaborators',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { projectId } = request.params as { projectId: string };
        const tenantId = authRequest.user?.tenantId;
        
        if (!tenantId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant context' });
        }

        const collaborators = await sharingService.getCollaborators(tenantId, projectId);

        reply.code(200).send(collaborators);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * DELETE /api/v1/projects/:projectId/collaborators/:userId
   * Revoke user access to project
   */
  fastify.delete<{ Params: { projectId: string; userId: string }; Body: RevokeAccessInput }>(
    '/api/v1/projects/:projectId/collaborators/:userId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { projectId, userId } = request.params as { projectId: string; userId: string };
        const tenantId = authRequest.user?.tenantId;
        const actorId = authRequest.user?.id;
        const actorName = authRequest.user?.email;
        
        if (!tenantId || !actorId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        }

        const body = request.body as Partial<RevokeAccessInput>;
        const input: RevokeAccessInput = {
          userId,
          ...body,
        };

        await sharingService.revokeAccess(tenantId, projectId, input, actorId, actorName);

        reply.code(204).send();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * PATCH /api/v1/projects/:projectId/collaborators/:userId/role
   * Update collaborator role
   */
  fastify.patch<{
    Params: { projectId: string; userId: string };
    Body: UpdateCollaboratorRoleInput;
  }>(
    '/api/v1/projects/:projectId/collaborators/:userId/role',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { projectId, userId } = request.params as { projectId: string; userId: string };
        const tenantId = authRequest.user?.tenantId;
        const actorId = authRequest.user?.id;
        const actorName = authRequest.user?.email;
        
        if (!tenantId || !actorId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        }

        const body = request.body as UpdateCollaboratorRoleInput;
        const input: UpdateCollaboratorRoleInput = {
          userId,
          role: body.role,
          reason: body.reason,
          sendNotification: body.sendNotification,
        };

        const result = await sharingService.updateCollaboratorRole(
          tenantId,
          projectId,
          input,
          actorId,
          actorName,
        );

        reply.code(200).send(result);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * POST /api/v1/projects/:projectId/transfer-ownership
   * Transfer project ownership
   */
  fastify.post<{
    Params: { projectId: string };
    Body: TransferOwnershipInput;
  }>(
    '/api/v1/projects/:projectId/transfer-ownership',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { projectId } = request.params as { projectId: string };
        const tenantId = authRequest.user?.tenantId;
        
        if (!tenantId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant context' });
        }
        const actorId = authRequest.user?.id;
        const actorName = authRequest.user?.email;
        
        if (!actorId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing user context' });
        }

        await sharingService.transferOwnership(
          tenantId,
          projectId,
          request.body,
          actorId,
          actorName,
        );

        reply.code(200).send({ message: 'Ownership transferred successfully' });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * GET /api/v1/projects/shared-with-me
   * Get projects shared with current user
   */
  fastify.get(
    '/api/v1/projects/shared-with-me',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const tenantId = authRequest.user?.tenantId;
        const userId = authRequest.user?.id;
        
        if (!tenantId || !userId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        }

        const sharedProjects = await sharingService.getSharedProjects(tenantId, userId);

        reply.code(200).send(sharedProjects);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * GET /api/v1/admin/sharing/statistics?tenantId=:tenantId
   * Get sharing statistics for a tenant (admin only)
   */
  fastify.get<{ Querystring: { tenantId?: string } }>(
    '/api/v1/admin/sharing/statistics',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const query = request.query as { tenantId?: string };
        const tenantId = query.tenantId || authRequest.user?.tenantId;
        
        if (!tenantId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant context' });
        }

        const stats = await sharingService.getSharingStatistics(tenantId);

        reply.code(200).send(stats);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * POST /api/v1/invitations/:invitationToken/accept
   * Accept pending invitation
   */
  fastify.post<{
    Params: { invitationToken: string };
    Body: { projectId: string };
  }>(
    '/api/v1/invitations/:invitationToken/accept',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { invitationToken } = request.params as { invitationToken: string };
        const { projectId } = request.body as { projectId: string };
        const tenantId = authRequest.user?.tenantId;
        const userId = authRequest.user?.id;
        
        if (!tenantId || !userId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        }

        await sharingService.acceptInvitation(tenantId, projectId, userId, invitationToken);

        reply.code(200).send({ message: 'Invitation accepted' });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * POST /api/v1/invitations/:invitationToken/decline
   * Decline pending invitation
   */
  fastify.post<{
    Params: { invitationToken: string };
    Body: { projectId: string };
  }>(
    '/api/v1/invitations/:invitationToken/decline',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { invitationToken } = request.params as { invitationToken: string };
        const { projectId } = request.body as { projectId: string };
        const tenantId = authRequest.user?.tenantId;
        const userId = authRequest.user?.id;
        
        if (!tenantId || !userId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        }

        await sharingService.declineInvitation(tenantId, projectId, userId, invitationToken);

        reply.code(204).send();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );
}

/**
 * Project Activity Routes
 * Endpoints for activity logging, querying, and reporting
 */
export async function registerActivityRoutes(
  fastify: FastifyInstance,
  activityService: ProjectActivityService,
) {
  /**
   * GET /api/v1/projects/:projectId/activities?page=1&limit=20&sortBy=timestamp
   * Get project activities with filtering and pagination
   */
  fastify.get<{
    Params: { projectId: string };
    Querystring: ActivityQueryParams;
  }>(
    '/api/v1/projects/:projectId/activities',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { projectId } = request.params as { projectId: string };
        const tenantId = authRequest.user?.tenantId;
        
        if (!tenantId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant context' });
        }

        const query = request.query as {
          page?: string;
          limit?: string;
          sortBy?: string;
          sortDirection?: string;
          types?: string;
          actorUserId?: string;
          searchText?: string;
        };
        const params: ActivityQueryParams = {
          page: query.page ? parseInt(query.page, 10) : 1,
          limit: query.limit ? parseInt(query.limit, 10) : 20,
          sortBy: (query.sortBy as any) || 'timestamp',
          sortDirection: (query.sortDirection as any) || 'desc',
          types: query.types
            ? query.types.split(',').map((t) => t.trim()) as any
            : undefined,
          actorUserId: query.actorUserId,
          searchText: query.searchText,
        };

        const page = await activityService.getActivities(tenantId, projectId, params);

        reply.code(200).send(page);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * GET /api/v1/projects/:projectId/activities/recent?limit=10
   * Get recent activities (cached)
   */
  fastify.get<{
    Params: { projectId: string };
    Querystring: { limit?: string };
  }>(
    '/api/v1/projects/:projectId/activities/recent',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { projectId } = request.params as { projectId: string };
        const tenantId = authRequest.user?.tenantId;
        
        if (!tenantId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant context' });
        }
        const query = request.query as { limit?: string };
        const limit = query.limit ? parseInt(query.limit, 10) : 10;

        const summaries = await activityService.getRecentActivities(tenantId, projectId, limit);

        reply.code(200).send(summaries);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * GET /api/v1/projects/:projectId/activities/statistics?days=30
   * Get activity statistics
   */
  fastify.get<{
    Params: { projectId: string };
    Querystring: { days?: string };
  }>(
    '/api/v1/projects/:projectId/activities/statistics',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { projectId } = request.params as { projectId: string };
        const tenantId = authRequest.user?.tenantId;
        
        if (!tenantId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant context' });
        }
        const query = request.query as { days?: string };
        const days = query.days ? parseInt(query.days, 10) : 30;

        const stats = await activityService.getStatistics(tenantId, projectId, { days });

        reply.code(200).send(stats);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * GET /api/v1/projects/:projectId/activities/export?format=csv
   * Export activities
   */
  fastify.get<{
    Params: { projectId: string };
    Querystring: { format?: string };
  }>(
    '/api/v1/projects/:projectId/activities/export',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { projectId } = request.params as { projectId: string };
        const tenantId = authRequest.user?.tenantId;
        
        if (!tenantId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant context' });
        }
        const query = request.query as { format?: string };
        const format = (query.format || 'csv') as 'csv' | 'json' | 'pdf';

        if (!['csv', 'json', 'pdf'].includes(format)) {
          return reply.code(400).send({ error: 'Invalid format. Must be csv, json, or pdf.' });
        }

        const exported = await activityService.exportActivities(
          tenantId,
          projectId,
          format,
        );

        reply
          .type(exported.mimeType)
          .header('Content-Disposition', `attachment; filename="${exported.filename}"`)
          .send(exported.data);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );
}

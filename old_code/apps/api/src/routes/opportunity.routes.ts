/**
 * Opportunity API Routes
 * REST endpoints for opportunity management, pipeline, and forecasting
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../types/auth.types.js';
import { OpportunityService } from '../services/opportunity.service.js';
import { requireAuth } from '../middleware/authorization.js';
import { getUser } from '../middleware/authenticate.js';
import type { OpportunityFilters } from '../types/opportunity.types.js';

interface OpportunityRoutesOptions {
  opportunityService: OpportunityService;
}

/**
 * Register opportunity routes
 */
export async function registerOpportunityRoutes(
  server: FastifyInstance,
  options: OpportunityRoutesOptions
): Promise<void> {
  const { opportunityService } = options;

  // Get authentication decorator
  const authDecorator = (server as any).authenticate;
  if (!authDecorator) {
    server.log.warn('⚠️  Opportunity routes not registered - authentication decorator missing');
    return;
  }

  const authGuards = [authDecorator, requireAuth()];

  // ===============================================
  // OPPORTUNITY ROUTES
  // ===============================================

  /**
   * GET /api/v1/opportunities
   * List opportunities owned by the authenticated user
   * Query params:
   *   - limit: number (default: 50)
   *   - offset: number (default: 0)
   *   - continuationToken: string (for pagination)
   *   - ownerId: string (filter by owner, defaults to current user)
   *   - stage: string | string[] (filter by stage)
   *   - status: 'open' | 'won' | 'lost' | string[] (filter by status)
   *   - accountId: string (filter by account)
   *   - riskLevel: 'high' | 'medium' | 'low' | string[] (filter by risk level)
   *   - riskCategory: string | string[] (filter by risk category)
   *   - riskScoreMin: number (filter by minimum risk score)
   *   - riskScoreMax: number (filter by maximum risk score)
   *   - revenueAtRiskMin: number (filter by minimum revenue at risk)
   *   - closeDateFrom: ISO date string (filter by close date from)
   *   - closeDateTo: ISO date string (filter by close date to)
   *   - searchQuery: string (text search in name/description)
   *   - includeRisk: boolean (include risk evaluation in response)
   */
  server.get(
    '/api/v1/opportunities',
    {
      onRequest: authGuards as any,
      schema: {
        tags: ['Opportunities'],
        summary: 'List opportunities',
        description: 'List opportunities owned by the authenticated user with optional filters',
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 200, default: 50 },
            offset: { type: 'number', minimum: 0, default: 0 },
            continuationToken: { type: 'string' },
            ownerId: { type: 'string' },
            stage: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ]
            },
            status: {
              oneOf: [
                { type: 'string', enum: ['open', 'won', 'lost'] },
                { type: 'array', items: { type: 'string', enum: ['open', 'won', 'lost'] } }
              ]
            },
            accountId: { type: 'string' },
            riskLevel: {
              oneOf: [
                { type: 'string', enum: ['high', 'medium', 'low'] },
                { type: 'array', items: { type: 'string', enum: ['high', 'medium', 'low'] } }
              ]
            },
            riskCategory: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ]
            },
            riskScoreMin: { type: 'number', minimum: 0, maximum: 1 },
            riskScoreMax: { type: 'number', minimum: 0, maximum: 1 },
            revenueAtRiskMin: { type: 'number', minimum: 0 },
            closeDateFrom: { type: 'string', format: 'date-time' },
            closeDateTo: { type: 'string', format: 'date-time' },
            searchQuery: { type: 'string' },
            includeRisk: { type: 'boolean', default: false },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request as AuthenticatedRequest);
        const query = request.query as Record<string, unknown>;

        // Build filters
        const filters: OpportunityFilters = {};

        // Owner filter (defaults to current user if not specified)
        filters.ownerId = (typeof query.ownerId === 'string' ? query.ownerId : user.id);

        if (query.stage) {
          filters.stage = Array.isArray(query.stage) 
            ? query.stage.filter((s): s is string => typeof s === 'string')
            : typeof query.stage === 'string' ? [query.stage] : [];
        }

        if (query.status) {
          const statusValues = Array.isArray(query.status)
            ? query.status.filter((s): s is string => typeof s === 'string')
            : typeof query.status === 'string' ? [query.status] : [];
          // Type guard to ensure only valid status values
          const validStatuses = statusValues.filter((s): s is 'open' | 'won' | 'lost' => 
            s === 'open' || s === 'won' || s === 'lost'
          );
          filters.status = validStatuses.length > 0 ? (validStatuses.length === 1 ? validStatuses[0] : validStatuses) : undefined;
        }

        if (query.accountId && typeof query.accountId === 'string') {
          filters.accountId = query.accountId;
        }

        if (query.riskLevel) {
          const riskValues = Array.isArray(query.riskLevel)
            ? query.riskLevel.filter((r): r is string => typeof r === 'string')
            : typeof query.riskLevel === 'string' ? [query.riskLevel] : [];
          // Type guard to ensure only valid risk level values
          const validRiskLevels = riskValues.filter((r): r is 'high' | 'medium' | 'low' => 
            r === 'high' || r === 'medium' || r === 'low'
          );
          filters.riskLevel = validRiskLevels.length > 0 ? (validRiskLevels.length === 1 ? validRiskLevels[0] : validRiskLevels) : undefined;
        }

        if (query.riskCategory) {
          filters.riskCategory = Array.isArray(query.riskCategory)
            ? query.riskCategory.filter((r): r is string => typeof r === 'string')
            : typeof query.riskCategory === 'string' ? [query.riskCategory] : [];
        }

        if (query.riskScoreMin !== undefined) {
          const min = Number(query.riskScoreMin);
          if (!isNaN(min)) {
            filters.riskScoreMin = min;
          }
        }

        if (query.riskScoreMax !== undefined) {
          const max = Number(query.riskScoreMax);
          if (!isNaN(max)) {
            filters.riskScoreMax = max;
          }
        }

        if (query.revenueAtRiskMin !== undefined) {
          filters.revenueAtRiskMin = Number(query.revenueAtRiskMin);
        }

        if (query.closeDateFrom && typeof query.closeDateFrom === 'string') {
          filters.closeDateFrom = new Date(query.closeDateFrom);
        }

        if (query.closeDateTo && typeof query.closeDateTo === 'string') {
          filters.closeDateTo = new Date(query.closeDateTo);
        }

        if (query.searchQuery && typeof query.searchQuery === 'string') {
          filters.searchQuery = query.searchQuery;
        }

        const limit = query.limit ? (typeof query.limit === 'number' ? query.limit : parseInt(String(query.limit), 10)) : 50;
        const result = await opportunityService.listOwnedOpportunities(
          user.id,
          user.tenantId,
          filters,
          {
            limit: isNaN(limit) ? 50 : limit,
            continuationToken: typeof query.continuationToken === 'string' ? query.continuationToken : undefined,
            includeRisk: query.includeRisk === true,
          }
        );

        return reply.code(200).send({
          success: true,
          data: result,
        });
      } catch (error: unknown) {
        server.log.error(error, 'Error listing opportunities');
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(500).send({
          success: false,
          error: errorMessage || 'Failed to list opportunities',
        });
      }
    }
  );

  /**
   * GET /api/v1/opportunities/:id
   * Get opportunity details with related shards
   */
  server.get(
    '/api/v1/opportunities/:id',
    {
      onRequest: authGuards as any,
      schema: {
        tags: ['Opportunities'],
        summary: 'Get opportunity details',
        description: 'Get opportunity with related shards (account, documents, tasks, etc.)',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        querystring: {
          type: 'object',
          properties: {
            includeRelated: { type: 'boolean', default: true },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request as AuthenticatedRequest);
        const params = request.params as { id: string };
        const query = request.query as { includeRelated?: boolean };

        const result = await opportunityService.getOpportunity(
          params.id,
          user.tenantId,
          query.includeRelated !== false
        );

        // Check ownership/access
        const oppData = result.opportunity.structuredData as any;
        
        // Debug logging to understand the issue
        server.log.debug({
          opportunityId: params.id,
          userId: user.id,
          oppOwnerId: oppData?.ownerId,
          shardUserId: result.opportunity.userId,
          ownerIdMatch: oppData?.ownerId === user.id,
          userIdMatch: result.opportunity.userId === user.id,
        }, 'Opportunity access check');
        
        const isOwner = 
          oppData?.ownerId === user.id || 
          result.opportunity.userId === user.id; // Also check shard's userId field
        
        if (!isOwner) {
          // Check ACL permissions if ACL service is available
          // For now, we only allow access to owner. ACL checks can be added later
          // when ACLService is passed to route registration
          server.log.warn({
            opportunityId: params.id,
            userId: user.id,
            oppOwnerId: oppData?.ownerId,
            shardUserId: result.opportunity.userId,
          }, 'Access denied to opportunity');
          
          return reply.code(403).send({
            success: false,
            error: 'Access denied',
            message: 'You do not have permission to access this opportunity',
          });
        }

        return reply.code(200).send({
          success: true,
          data: result,
        });
      } catch (error: unknown) {
        server.log.error(error, 'Error getting opportunity');
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('not found')) {
          return reply.code(404).send({
            success: false,
            error: 'Opportunity not found',
            message: errorMessage,
          });
        }
        return reply.code(500).send({
          success: false,
          error: errorMessage || 'Failed to get opportunity',
        });
      }
    }
  );

  /**
   * GET /api/v1/opportunities/account/:accountId
   * Get opportunities by account
   */
  server.get(
    '/api/v1/opportunities/account/:accountId',
    {
      onRequest: authGuards as any,
      schema: {
        tags: ['Opportunities'],
        summary: 'Get opportunities by account',
        params: {
          type: 'object',
          properties: {
            accountId: { type: 'string' },
          },
          required: ['accountId'],
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 200, default: 100 },
            includeClosed: { type: 'boolean', default: false },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request as AuthenticatedRequest);
        const params = request.params as { accountId: string };
        const query = request.query as { limit?: number; includeClosed?: boolean };

        const opportunities = await opportunityService.getOpportunitiesByAccount(
          params.accountId,
          user.tenantId,
          {
            limit: query.limit || 100,
            includeClosed: query.includeClosed === true,
          }
        );

        return reply.code(200).send({
          success: true,
          data: {
            opportunities,
            count: opportunities.length,
          },
        });
      } catch (error: unknown) {
        server.log.error(error, 'Error getting opportunities by account');
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(500).send({
          success: false,
          error: errorMessage || 'Failed to get opportunities',
        });
      }
    }
  );

  /**
   * PATCH /api/v1/opportunities/:id/stage
   * Update opportunity stage (for kanban drag-and-drop)
   */
  server.patch(
    '/api/v1/opportunities/:id/stage',
    {
      onRequest: authGuards as any,
      schema: {
        tags: ['Opportunities'],
        summary: 'Update opportunity stage',
        description: 'Update the stage of an opportunity (e.g., for kanban drag-and-drop)',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            stage: { type: 'string' },
          },
          required: ['stage'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request as AuthenticatedRequest);
        const params = request.params as { id: string };
        const body = request.body as { stage: string };

        if (!body.stage) {
          return reply.code(400).send({
            success: false,
            error: 'Bad Request',
            message: 'Stage is required',
          });
        }

        const updated = await opportunityService.updateStage(
          params.id,
          body.stage,
          user.tenantId,
          user.id
        );

        return reply.code(200).send({
          success: true,
          data: updated,
        });
      } catch (error: unknown) {
        server.log.error(error, 'Error updating opportunity stage');
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('not found')) {
          return reply.code(404).send({
            success: false,
            error: 'Opportunity not found',
            message: errorMessage,
          });
        }
        return reply.code(500).send({
          success: false,
          error: errorMessage || 'Failed to update opportunity stage',
        });
      }
    }
  );

  // ===============================================
  // TEAM-BASED OPPORTUNITY ROUTES
  // ===============================================

  /**
   * GET /api/v1/teams/:teamId/opportunities
   * List opportunities for a team (all team members' opportunities)
   */
  server.get(
    '/api/v1/teams/:teamId/opportunities',
    {
      onRequest: authGuards as any,
      schema: {
        tags: ['Opportunities', 'Teams'],
        summary: 'List team opportunities',
        description: 'List all opportunities for team members',
        params: {
          type: 'object',
          required: ['teamId'],
          properties: {
            teamId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 200, default: 50 },
            continuationToken: { type: 'string' },
            stage: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            status: { oneOf: [{ type: 'string', enum: ['open', 'won', 'lost'] }, { type: 'array', items: { type: 'string' } }] },
            accountId: { type: 'string' },
            searchQuery: { type: 'string' },
            includeRisk: { type: 'boolean' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request as AuthenticatedRequest);
        const params = request.params as { teamId: string };
        const query = request.query as Record<string, unknown>;

        // Validate teamId
        if (!params.teamId || typeof params.teamId !== 'string' || params.teamId.trim().length === 0) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid teamId parameter',
          });
        }

        // Security: Verify user has access to this team (member, manager, or admin)
        const teamServiceModule = await import('../services/team.service.js');
        const teamService = (server as any).teamService as InstanceType<typeof teamServiceModule.TeamService> | undefined;
        
        if (!teamService) {
          return reply.code(500).send({
            success: false,
            error: 'Internal Server Error',
            message: 'Team service not available',
          });
        }

        const isMember = await teamService.isUserMemberOfTeam(
          user.id,
          params.teamId.trim(),
          user.tenantId
        );
        const isManager = await teamService.isUserManagerOfTeam(
          user.id,
          params.teamId.trim(),
          user.tenantId
        );
        const isAdmin = user.roles?.includes('admin') || user.roles?.includes('super_admin');
        
        if (!isMember && !isManager && !isAdmin) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden',
            message: 'You do not have permission to access this team\'s opportunities',
          });
        }

        const filters: OpportunityFilters = {};
        
        if (query.stage) {
          filters.stage = Array.isArray(query.stage) 
            ? query.stage.filter((s): s is string => typeof s === 'string')
            : typeof query.stage === 'string' ? query.stage : undefined;
        }
        
        if (query.status) {
          const statusValues = Array.isArray(query.status)
            ? query.status.filter((s): s is string => typeof s === 'string')
            : typeof query.status === 'string' ? [query.status] : [];
          const validStatuses = statusValues.filter((s): s is 'open' | 'won' | 'lost' => 
            s === 'open' || s === 'won' || s === 'lost'
          );
          filters.status = validStatuses.length > 0 ? (validStatuses.length === 1 ? validStatuses[0] : validStatuses) : undefined;
        }
        
        if (query.accountId && typeof query.accountId === 'string') {
          filters.accountId = query.accountId;
        }
        
        if (query.searchQuery && typeof query.searchQuery === 'string') {
          filters.searchQuery = query.searchQuery;
        }

        const limit = query.limit ? (typeof query.limit === 'number' ? query.limit : parseInt(String(query.limit), 10)) : 50;
        const result = await opportunityService.listTeamOpportunities(
          params.teamId.trim(),
          user.tenantId,
          user.id,
          filters,
          {
            limit: isNaN(limit) ? 50 : limit,
            continuationToken: typeof query.continuationToken === 'string' ? query.continuationToken : undefined,
            includeRisk: query.includeRisk === true,
          }
        );

        return reply.code(200).send({
          success: true,
          data: result,
        });
      } catch (error: unknown) {
        server.log.error(error, 'Error listing team opportunities');
        const errorMessage = error instanceof Error ? error.message : String(error);
        const statusCode = errorMessage.includes('not found') ? 404 : 
                          errorMessage.includes('Forbidden') ? 403 : 500;
        return reply.code(statusCode).send({
          success: false,
          error: errorMessage || 'Failed to list team opportunities',
        });
      }
    }
  );

  /**
   * GET /api/v1/managers/:managerId/opportunities
   * List opportunities for all teams managed by a user
   */
  server.get(
    '/api/v1/managers/:managerId/opportunities',
    {
      onRequest: authGuards as any,
      schema: {
        tags: ['Opportunities', 'Managers'],
        summary: 'List manager opportunities',
        description: 'List all opportunities for teams managed by a user',
        params: {
          type: 'object',
          required: ['managerId'],
          properties: {
            managerId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 200, default: 50 },
            continuationToken: { type: 'string' },
            stage: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            status: { oneOf: [{ type: 'string', enum: ['open', 'won', 'lost'] }, { type: 'array', items: { type: 'string' } }] },
            accountId: { type: 'string' },
            searchQuery: { type: 'string' },
            includeRisk: { type: 'boolean' },
            includeAllTeams: { type: 'boolean', default: false },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request as AuthenticatedRequest);
        const params = request.params as { managerId: string };
        const query = request.query as Record<string, unknown>;

        // Validate managerId
        if (!params.managerId || typeof params.managerId !== 'string' || params.managerId.trim().length === 0) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid managerId parameter',
          });
        }

        // Security: Users can only view their own manager opportunities, or admins can view any manager's opportunities
        const isAdmin = user.roles?.includes('admin') || user.roles?.includes('super_admin');
        const isOwnRequest = params.managerId.trim() === user.id;
        
        if (!isOwnRequest && !isAdmin) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden',
            message: 'You can only view your own manager opportunities',
          });
        }

        const filters: OpportunityFilters = {};
        
        if (query.stage) {
          filters.stage = Array.isArray(query.stage)
            ? query.stage.filter((s): s is string => typeof s === 'string')
            : typeof query.stage === 'string' ? [query.stage] : [];
        }
        if (query.status) {
          const validStatuses = ['open', 'won', 'lost'] as const;
          filters.status = Array.isArray(query.status)
            ? query.status.filter((s): s is typeof validStatuses[number] => typeof s === 'string' && validStatuses.includes(s as typeof validStatuses[number]))
            : typeof query.status === 'string' && validStatuses.includes(query.status as typeof validStatuses[number]) ? [query.status as typeof validStatuses[number]] : undefined;
        }
        if (query.accountId && typeof query.accountId === 'string') {
          filters.accountId = query.accountId;
        }
        if (query.searchQuery && typeof query.searchQuery === 'string') {
          filters.searchQuery = query.searchQuery;
        }

        const limit = query.limit ? (typeof query.limit === 'number' ? query.limit : parseInt(String(query.limit), 10)) : 50;
        const result = await opportunityService.listManagerOpportunities(
          params.managerId.trim(),
          user.tenantId,
          user.id,
          filters,
          {
            limit: isNaN(limit) ? 50 : limit,
            continuationToken: typeof query.continuationToken === 'string' ? query.continuationToken : undefined,
            includeRisk: query.includeRisk === true,
            includeAllTeams: query.includeAllTeams === true,
          }
        );

        return reply.code(200).send({
          success: true,
          data: result,
        });
      } catch (error: unknown) {
        server.log.error(error, 'Error listing manager opportunities');
        const errorMessage = error instanceof Error ? error.message : String(error);
        const statusCode = errorMessage.includes('not found') ? 404 : 
                          errorMessage.includes('Forbidden') ? 403 : 500;
        return reply.code(statusCode).send({
          success: false,
          error: errorMessage || 'Failed to list manager opportunities',
        });
      }
    }
  );

  server.log.info('✅ Opportunity routes registered');
}


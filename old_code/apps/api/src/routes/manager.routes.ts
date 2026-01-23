/**
 * Manager API Routes
 * REST endpoints for manager dashboard and team management
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../types/auth.types.js';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ManagerDashboardService } from '../services/manager-dashboard.service.js';
import {
  TeamService,
  ShardRepository,
  ShardTypeRepository,
  ShardRelationshipService,
  RiskEvaluationService,
  RiskCatalogService,
  VectorSearchService,
  InsightService,
} from '@castiel/api-core';
import { OpportunityService } from '../services/opportunity.service.js';
import { QuotaService } from '../services/quota.service.js';
import { PipelineAnalyticsService } from '../services/pipeline-analytics.service.js';
import { RevenueAtRiskService } from '../services/revenue-at-risk.service.js';
import { requireAuth } from '../middleware/authorization.js';
import { getUser } from '../middleware/authenticate.js';
import { UserRole } from '@castiel/shared-types';
import type { OpportunityFilters } from '../types/opportunity.types.js';

interface ManagerRoutesOptions {
  monitoring: IMonitoringProvider;
  shardRepository: ShardRepository;
  shardTypeRepository: ShardTypeRepository;
  relationshipService: ShardRelationshipService;
  vectorSearchService: VectorSearchService;
  insightService: InsightService;
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
    message.includes('circular reference') ||
    message.includes('Invalid date')
  ) {
    return 400;
  }
  
  // Not found errors (404 Not Found)
  if (message.includes('not found') || message.includes('does not exist')) {
    return 404;
  }
  
  // Forbidden errors (403 Forbidden) - usually handled explicitly, but catch edge cases
  if (message.includes('forbidden') || message.includes('access denied') || message.includes('permission')) {
    return 403;
  }
  
  // Default to 500 for server errors
  return 500;
}

/**
 * Register manager routes
 */
export async function registerManagerRoutes(
  server: FastifyInstance,
  options: ManagerRoutesOptions
): Promise<void> {
  const {
    monitoring,
    shardRepository,
    shardTypeRepository,
    relationshipService,
    vectorSearchService,
    insightService,
  } = options;

  // Initialize services
  const { TeamService, AuditLogService } = await import('@castiel/api-core');
  const { config } = await import('../config/env.js');
  // Get cosmos database from server or create audit log service with container
  const cosmosDatabase = (server as any).cosmosDatabase;
  const auditLogsContainer = cosmosDatabase?.container('AuditLogs');
  if (!auditLogsContainer) {
    throw new Error('Cosmos DB database or AuditLogs container not available');
  }
  const auditLogService = new AuditLogService(auditLogsContainer, {
    monitoring,
    environment: config.nodeEnv,
    serviceName: 'manager',
  });
  const teamService = new TeamService(
    monitoring,
    shardRepository,
    shardTypeRepository,
    relationshipService,
    auditLogService
  );

  const { OpportunityService } = await import('../services/opportunity.service.js');
  const { RiskCatalogService, RiskEvaluationService } = await import('@castiel/api-core');
  
  const riskCatalogService = new RiskCatalogService(
    monitoring,
    shardRepository,
    shardTypeRepository
  );

  // Initialize Phase 1 services for risk evaluation
  const { ShardValidationService } = await import('../services/shard-validation.service.js');
  const shardValidationService = new ShardValidationService(monitoring);
  await shardValidationService.initialize();

  const { DataQualityService } = await import('../services/data-quality.service.js');
  const dataQualityService = new DataQualityService(shardValidationService, monitoring);

  const { TrustLevelService } = await import('../services/trust-level.service.js');
  const trustLevelService = new TrustLevelService();

  const { RiskAIValidationService } = await import('../services/risk-ai-validation.service.js');
  const riskAIValidationService = new RiskAIValidationService();

  const { RiskExplainabilityService } = await import('../services/risk-explainability.service.js');
  const riskExplainabilityService = new RiskExplainabilityService();

  // Initialize ComprehensiveAuditTrailService for Phase 2 audit logging
  const { ComprehensiveAuditTrailService } = await import('../services/comprehensive-audit-trail.service.js');
  const { CosmosDBService } = await import('@castiel/api-core');
  const cosmosDB = new CosmosDBService();
  const comprehensiveAuditTrailService = new ComprehensiveAuditTrailService(cosmosDB, monitoring);

  const riskEvaluationService = new RiskEvaluationService(
    monitoring,
    shardRepository,
    shardTypeRepository,
    relationshipService,
    riskCatalogService,
    vectorSearchService,
    insightService,
    undefined, // queueService
    dataQualityService,
    trustLevelService,
    riskAIValidationService,
    riskExplainabilityService,
    comprehensiveAuditTrailService
  );

  const { RevenueAtRiskService } = await import('../services/revenue-at-risk.service.js');
  const revenueAtRiskService = new RevenueAtRiskService(
    monitoring,
    shardRepository,
    shardTypeRepository,
    riskEvaluationService
  );

  const opportunityService = new OpportunityService(
    monitoring,
    shardRepository,
    shardTypeRepository,
    relationshipService,
    riskEvaluationService,
    teamService
  );

  const { QuotaService } = await import('../services/quota.service.js');
  const quotaService = new QuotaService(
    monitoring,
    shardRepository,
    shardTypeRepository,
    revenueAtRiskService
  );

  const { PipelineAnalyticsService } = await import('../services/pipeline-analytics.service.js');
  const pipelineAnalyticsService = new PipelineAnalyticsService(
    monitoring,
    opportunityService,
    revenueAtRiskService
  );

  // UserManagementService is optional - pass undefined since it's not decorated on server
  // The service will gracefully handle its absence
  const userManagementService = undefined;

  const managerDashboardService = new ManagerDashboardService(
    monitoring,
    teamService,
    opportunityService,
    quotaService,
    pipelineAnalyticsService,
    revenueAtRiskService,
    userManagementService
  );

  // Get authentication decorator
  const authDecorator = (server as any).authenticate;
  if (!authDecorator) {
    server.log.warn('⚠️  Manager routes not registered - authentication decorator missing');
    return;
  }

  const authGuards = [authDecorator, requireAuth()];

  // ===============================================
  // MANAGER DASHBOARD ROUTES
  // ===============================================

  /**
   * GET /api/v1/manager/dashboard
   * Get manager dashboard data
   */
  server.get(
    '/api/v1/manager/dashboard',
    {
      onRequest: authGuards as any,
      schema: {
        tags: ['Manager'],
        summary: 'Get manager dashboard',
        description: 'Get aggregated dashboard data for a manager (teams, opportunities, quotas, risk)',
        querystring: {
          type: 'object',
          properties: {
            view: { type: 'string', enum: ['my-team', 'all-teams'], default: 'my-team' },
            includeAllTeams: { type: 'boolean', default: false },
            teamId: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request as AuthenticatedRequest);
        
        // Check if user is a manager
        const hasManagerRole = user.roles?.includes(UserRole.MANAGER) || 
                               user.roles?.includes(UserRole.ADMIN) || 
                               user.roles?.includes(UserRole.SUPER_ADMIN);
        if (!hasManagerRole) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden',
            message: 'Manager role required',
          });
        }

        const query = request.query as Record<string, unknown>;
        const options: {
          view?: 'my-team' | 'all-teams';
          includeAllTeams?: boolean;
          teamId?: string;
          period?: { startDate: Date; endDate: Date };
        } = {
          view: (query.view === 'all-teams' ? 'all-teams' : 'my-team'),
          includeAllTeams: query.includeAllTeams === 'true' || query.includeAllTeams === true,
        };

        if (query.teamId && typeof query.teamId === 'string' && query.teamId.trim().length > 0) {
          options.teamId = query.teamId.trim();
        }

        if (query.startDate && query.endDate && typeof query.startDate === 'string' && typeof query.endDate === 'string') {
          const startDate = new Date(query.startDate);
          const endDate = new Date(query.endDate);
          
          // Validate dates
          if (isNaN(startDate.getTime())) {
            return reply.code(400).send({
              success: false,
              error: 'Bad Request',
              message: 'Invalid startDate format',
            });
          }
          
          if (isNaN(endDate.getTime())) {
            return reply.code(400).send({
              success: false,
              error: 'Bad Request',
              message: 'Invalid endDate format',
            });
          }
          
          // Validate date range
          if (startDate > endDate) {
            return reply.code(400).send({
              success: false,
              error: 'Bad Request',
              message: 'startDate must be before endDate',
            });
          }
          
          options.period = {
            startDate,
            endDate,
          };
        }

        const dashboard = await managerDashboardService.getManagerDashboard(
          user.id,
          user.tenantId,
          options
        );

        return reply.code(200).send({
          success: true,
          data: dashboard,
        });
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'manager.getDashboard', statusCode }
        );
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(statusCode).send({
          success: false,
          error: errorMessage || 'Failed to get manager dashboard',
        });
      }
    }
  );

  /**
   * GET /api/v1/manager/teams/:teamId/opportunities
   * Get opportunities for a specific team
   */
  server.get(
    '/api/v1/manager/teams/:teamId/opportunities',
    {
      onRequest: authGuards as any,
      schema: {
        tags: ['Manager', 'Teams'],
        summary: 'Get team opportunities',
        description: 'Get all opportunities for a team managed by the current user',
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
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request as AuthenticatedRequest);
        
        // Check if user is a manager
        const hasManagerRole = user.roles?.includes(UserRole.MANAGER) || 
                               user.roles?.includes(UserRole.ADMIN) || 
                               user.roles?.includes(UserRole.SUPER_ADMIN);
        if (!hasManagerRole) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden',
            message: 'Manager role required',
          });
        }

        const params = request.params as { teamId: string };
        
        // Validate teamId
        if (!params.teamId || typeof params.teamId !== 'string' || params.teamId.trim().length === 0) {
          return reply.code(400).send({
            success: false,
            error: 'Bad Request',
            message: 'Invalid teamId parameter',
          });
        }
        
        const query = request.query as Record<string, unknown>;

        // Verify user manages this team
        const isManager = await teamService.isUserManagerOfTeam(
          user.id,
          params.teamId,
          user.tenantId
        );

        const isAdmin = user.roles?.includes(UserRole.ADMIN) || user.roles?.includes(UserRole.SUPER_ADMIN);
        if (!isManager && !isAdmin) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden',
            message: 'You do not manage this team',
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
          // Type guard to ensure only valid status values
          const validStatuses = statusValues.filter((s): s is 'open' | 'won' | 'lost' => 
            s === 'open' || s === 'won' || s === 'lost'
          );
          filters.status = validStatuses.length > 0 ? (validStatuses.length === 1 ? validStatuses[0] : validStatuses) : undefined;
        }

        // Validate and sanitize limit
        const limit = query.limit 
          ? Math.min(Math.max(1, Number(query.limit)), 200) 
          : 50;

        const result = await opportunityService.listTeamOpportunities(
          params.teamId.trim(),
          user.tenantId,
          user.id,
          filters,
          {
            limit,
            continuationToken: typeof query.continuationToken === 'string' ? query.continuationToken : undefined,
          }
        );

        return reply.code(200).send({
          success: true,
          data: result,
        });
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'manager.getTeamOpportunities', statusCode }
        );
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(statusCode).send({
          success: false,
          error: errorMessage || 'Failed to get team opportunities',
        });
      }
    }
  );

  /**
   * GET /api/v1/manager/teams/:teamId/performance
   * Get team performance metrics
   */
  server.get(
    '/api/v1/manager/teams/:teamId/performance',
    {
      onRequest: authGuards as any,
      schema: {
        tags: ['Manager', 'Teams'],
        summary: 'Get team performance',
        description: 'Get performance metrics for a team (quota, pipeline, risk)',
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
      try {
        const user = getUser(request as AuthenticatedRequest);
        
        // Check if user is a manager
        const hasManagerRole = user.roles?.includes(UserRole.MANAGER) || 
                               user.roles?.includes(UserRole.ADMIN) || 
                               user.roles?.includes(UserRole.SUPER_ADMIN);
        if (!hasManagerRole) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden',
            message: 'Manager role required',
          });
        }

        const params = request.params as { teamId: string };
        
        // Validate teamId
        if (!params.teamId || typeof params.teamId !== 'string' || params.teamId.trim().length === 0) {
          return reply.code(400).send({
            success: false,
            error: 'Bad Request',
            message: 'Invalid teamId parameter',
          });
        }

        // Verify user manages this team
        const isManager = await teamService.isUserManagerOfTeam(
          user.id,
          params.teamId.trim(),
          user.tenantId
        );

        const isAdmin = user.roles?.includes(UserRole.ADMIN) || user.roles?.includes(UserRole.SUPER_ADMIN);
        if (!isManager && !isAdmin) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden',
            message: 'You do not manage this team',
          });
        }

        // Get dashboard filtered by this team
        const dashboard = await managerDashboardService.getManagerDashboard(
          user.id,
          user.tenantId,
          {
            teamId: params.teamId.trim(),
            view: 'my-team',
          }
        );

        // Extract team-specific data
        const teamData = dashboard.teams.find(t => t.id === params.teamId.trim());

        return reply.code(200).send({
          success: true,
          data: {
            team: teamData,
            opportunities: dashboard.opportunities,
            quotas: dashboard.quotas,
            risk: dashboard.risk,
            closedWonLost: dashboard.closedWonLost,
            teamMembers: dashboard.teamMembers,
          },
        });
      } catch (error: unknown) {
        const statusCode = getErrorStatusCode(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'manager.getTeamPerformance', statusCode }
        );
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.code(statusCode).send({
          success: false,
          error: errorMessage || 'Failed to get team performance',
        });
      }
    }
  );

  server.log.info('✅ Manager routes registered');
}


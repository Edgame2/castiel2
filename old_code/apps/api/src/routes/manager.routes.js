/**
 * Manager API Routes
 * REST endpoints for manager dashboard and team management
 */
import { ManagerDashboardService } from '../services/manager-dashboard.service.js';
import { requireAuth } from '../middleware/authorization.js';
import { getUser } from '../middleware/authenticate.js';
import { UserRole } from '@castiel/shared-types';
/**
 * Determine HTTP status code based on error type
 */
function getErrorStatusCode(error) {
    const message = error instanceof Error ? error.message : String(error);
    // Validation errors (400 Bad Request)
    if (message.includes('required') ||
        message.includes('invalid') ||
        message.includes('must be') ||
        message.includes('cannot be') ||
        message.includes('circular reference') ||
        message.includes('Invalid date')) {
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
export async function registerManagerRoutes(server, options) {
    const { monitoring, shardRepository, shardTypeRepository, relationshipService, vectorSearchService, insightService, } = options;
    // Initialize services
    const { TeamService } = await import('../services/team.service.js');
    const { AuditLogService } = await import('../services/audit/audit-log.service.js');
    const auditLogService = new AuditLogService(monitoring, shardRepository);
    const teamService = new TeamService(monitoring, shardRepository, shardTypeRepository, relationshipService, auditLogService);
    const { OpportunityService } = await import('../services/opportunity.service.js');
    const { RiskCatalogService } = await import('../services/risk-catalog.service.js');
    const { RiskEvaluationService } = await import('../services/risk-evaluation.service.js');
    const riskCatalogService = new RiskCatalogService(monitoring, shardRepository, shardTypeRepository);
    const riskEvaluationService = new RiskEvaluationService(monitoring, shardRepository, shardTypeRepository, relationshipService, riskCatalogService, vectorSearchService, insightService);
    const { RevenueAtRiskService } = await import('../services/revenue-at-risk.service.js');
    const revenueAtRiskService = new RevenueAtRiskService(monitoring, shardRepository, shardTypeRepository, riskEvaluationService);
    const opportunityService = new OpportunityService(monitoring, shardRepository, shardTypeRepository, relationshipService, riskEvaluationService, teamService);
    const { QuotaService } = await import('../services/quota.service.js');
    const quotaService = new QuotaService(monitoring, shardRepository, shardTypeRepository, revenueAtRiskService);
    const { PipelineAnalyticsService } = await import('../services/pipeline-analytics.service.js');
    const pipelineAnalyticsService = new PipelineAnalyticsService(monitoring, opportunityService, revenueAtRiskService);
    // UserManagementService is optional - pass undefined since it's not decorated on server
    // The service will gracefully handle its absence
    const userManagementService = undefined;
    const managerDashboardService = new ManagerDashboardService(monitoring, teamService, opportunityService, quotaService, pipelineAnalyticsService, revenueAtRiskService, userManagementService);
    // Get authentication decorator
    const authDecorator = server.authenticate;
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
    server.get('/api/v1/manager/dashboard', {
        onRequest: authGuards,
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
    }, async (request, reply) => {
        try {
            const user = getUser(request);
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
            const query = request.query;
            const options = {
                view: (query.view === 'all-teams' ? 'all-teams' : 'my-team'),
                includeAllTeams: query.includeAllTeams === 'true' || query.includeAllTeams === true,
            };
            if (query.teamId && typeof query.teamId === 'string' && query.teamId.trim().length > 0) {
                options.teamId = query.teamId.trim();
            }
            if (query.startDate && query.endDate) {
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
            const dashboard = await managerDashboardService.getManagerDashboard(user.id, user.tenantId, options);
            return reply.code(200).send({
                success: true,
                data: dashboard,
            });
        }
        catch (error) {
            const statusCode = getErrorStatusCode(error);
            monitoring.trackException(error instanceof Error ? error : new Error(String(error)), { operation: 'manager.getDashboard', statusCode });
            const errorMessage = error instanceof Error ? error.message : String(error);
            return reply.code(statusCode).send({
                success: false,
                error: errorMessage || 'Failed to get manager dashboard',
            });
        }
    });
    /**
     * GET /api/v1/manager/teams/:teamId/opportunities
     * Get opportunities for a specific team
     */
    server.get('/api/v1/manager/teams/:teamId/opportunities', {
        onRequest: authGuards,
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
    }, async (request, reply) => {
        try {
            const user = getUser(request);
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
            const params = request.params;
            // Validate teamId
            if (!params.teamId || typeof params.teamId !== 'string' || params.teamId.trim().length === 0) {
                return reply.code(400).send({
                    success: false,
                    error: 'Bad Request',
                    message: 'Invalid teamId parameter',
                });
            }
            const query = request.query;
            // Verify user manages this team
            const isManager = await teamService.isUserManagerOfTeam(user.id, params.teamId, user.tenantId);
            const isAdmin = user.roles?.includes(UserRole.ADMIN) || user.roles?.includes(UserRole.SUPER_ADMIN);
            if (!isManager && !isAdmin) {
                return reply.code(403).send({
                    success: false,
                    error: 'Forbidden',
                    message: 'You do not manage this team',
                });
            }
            const filters = {};
            if (query.stage) {
                filters.stage = Array.isArray(query.stage) ? query.stage : query.stage;
            }
            if (query.status) {
                filters.status = Array.isArray(query.status) ? query.status : query.status;
            }
            // Validate and sanitize limit
            const limit = query.limit
                ? Math.min(Math.max(1, Number(query.limit)), 200)
                : 50;
            const result = await opportunityService.listTeamOpportunities(params.teamId.trim(), user.tenantId, user.id, filters, {
                limit,
                continuationToken: query.continuationToken,
            });
            return reply.code(200).send({
                success: true,
                data: result,
            });
        }
        catch (error) {
            const statusCode = getErrorStatusCode(error);
            monitoring.trackException(error instanceof Error ? error : new Error(String(error)), { operation: 'manager.getTeamOpportunities', statusCode });
            const errorMessage = error instanceof Error ? error.message : String(error);
            return reply.code(statusCode).send({
                success: false,
                error: errorMessage || 'Failed to get team opportunities',
            });
        }
    });
    /**
     * GET /api/v1/manager/teams/:teamId/performance
     * Get team performance metrics
     */
    server.get('/api/v1/manager/teams/:teamId/performance', {
        onRequest: authGuards,
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
    }, async (request, reply) => {
        try {
            const user = getUser(request);
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
            const params = request.params;
            // Validate teamId
            if (!params.teamId || typeof params.teamId !== 'string' || params.teamId.trim().length === 0) {
                return reply.code(400).send({
                    success: false,
                    error: 'Bad Request',
                    message: 'Invalid teamId parameter',
                });
            }
            // Verify user manages this team
            const isManager = await teamService.isUserManagerOfTeam(user.id, params.teamId.trim(), user.tenantId);
            const isAdmin = user.roles?.includes(UserRole.ADMIN) || user.roles?.includes(UserRole.SUPER_ADMIN);
            if (!isManager && !isAdmin) {
                return reply.code(403).send({
                    success: false,
                    error: 'Forbidden',
                    message: 'You do not manage this team',
                });
            }
            // Get dashboard filtered by this team
            const dashboard = await managerDashboardService.getManagerDashboard(user.id, user.tenantId, {
                teamId: params.teamId.trim(),
                view: 'my-team',
            });
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
        }
        catch (error) {
            const statusCode = getErrorStatusCode(error);
            monitoring.trackException(error instanceof Error ? error : new Error(String(error)), { operation: 'manager.getTeamPerformance', statusCode });
            const errorMessage = error instanceof Error ? error.message : String(error);
            return reply.code(statusCode).send({
                success: false,
                error: errorMessage || 'Failed to get team performance',
            });
        }
    });
    server.log.info('✅ Manager routes registered');
}
//# sourceMappingURL=manager.routes.js.map
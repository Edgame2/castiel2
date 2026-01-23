/**
 * Risk Analysis API Routes
 * REST endpoints for risk evaluation, catalog management, revenue at risk, and early warnings
 */
import { RiskCatalogService } from '../services/risk-catalog.service.js';
import { RiskEvaluationService } from '../services/risk-evaluation.service.js';
import { RevenueAtRiskService } from '../services/revenue-at-risk.service.js';
import { EarlyWarningService } from '../services/early-warning.service.js';
import { requireAuth } from '../middleware/authorization.js';
import { getUser } from '../middleware/authenticate.js';
import { createPermissionGuard } from '../middleware/permission.guard.js';
/**
 * Register risk analysis routes
 */
export async function registerRiskAnalysisRoutes(server, options) {
    const { monitoring, shardRepository, shardTypeRepository, revisionRepository, relationshipService, vectorSearchService, insightService, queueService, roleManagementService, } = options;
    // Initialize services
    const riskCatalogService = new RiskCatalogService(monitoring, shardRepository, shardTypeRepository);
    const riskEvaluationService = new RiskEvaluationService(monitoring, shardRepository, shardTypeRepository, relationshipService, riskCatalogService, vectorSearchService, insightService, queueService // Pass Queue Service (BullMQ) for queueing
    );
    const revenueAtRiskService = new RevenueAtRiskService(monitoring, shardRepository, shardTypeRepository, riskEvaluationService);
    const earlyWarningService = new EarlyWarningService(monitoring, shardRepository, revisionRepository, relationshipService, riskEvaluationService);
    // Get authentication decorator
    const authDecorator = server.authenticate;
    if (!authDecorator) {
        server.log.warn('⚠️  Risk analysis routes not registered - authentication decorator missing');
        return;
    }
    const authGuards = [authDecorator, requireAuth()];
    // Create permission guard if role management service is available
    let checkPermission;
    if (roleManagementService) {
        checkPermission = createPermissionGuard(roleManagementService);
    }
    // ===============================================
    // RISK CATALOG ROUTES
    // ===============================================
    // GET /api/v1/risk-analysis/catalog - Get risk catalog
    server.get('/api/v1/risk-analysis/catalog', {
        onRequest: authGuards,
        schema: {
            tags: ['Risk Analysis'],
            summary: 'Get risk catalog',
            description: 'Retrieves the complete risk catalog for the tenant, including global, industry-specific, and tenant-specific risks',
            querystring: {
                type: 'object',
                properties: {
                    industryId: { type: 'string', description: 'Optional industry ID to filter industry-specific risks' },
                },
            },
            response: {
                200: {
                    type: 'array',
                    description: 'Array of risk catalog entries',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            riskId: { type: 'string' },
                            name: { type: 'string' },
                            description: { type: 'string' },
                            category: { type: 'string', enum: ['Commercial', 'Technical', 'Legal', 'Financial', 'Competitive', 'Operational'] },
                            catalogType: { type: 'string', enum: ['global', 'industry', 'tenant'] },
                            defaultPonderation: { type: 'number' },
                            isActive: { type: 'boolean' },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
                500: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const catalog = await riskCatalogService.getCatalog(authRequest.user.tenantId, request.query.industryId);
            return reply.code(200).send(catalog);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'risk-analysis.getCatalog' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // POST /api/v1/risk-analysis/catalog - Create custom risk
    server.post('/api/v1/risk-analysis/catalog', {
        onRequest: checkPermission ? [...authGuards, checkPermission('shard:create:tenant')] : authGuards,
        schema: {
            tags: ['Risk Analysis'],
            summary: 'Create custom risk',
            description: 'Creates a new tenant-specific risk catalog entry. Requires shard:create:tenant permission.',
            body: {
                type: 'object',
                required: ['riskId', 'name', 'description', 'category', 'defaultPonderation'],
                properties: {
                    catalogType: { type: 'string', enum: ['global', 'industry', 'tenant'], description: 'Type of risk catalog entry (must be tenant for custom risks)' },
                    industryId: { type: 'string', description: 'Industry ID if catalogType is industry' },
                    riskId: { type: 'string', description: 'Unique risk identifier' },
                    name: { type: 'string', description: 'Risk name' },
                    description: { type: 'string', description: 'Risk description' },
                    category: { type: 'string', enum: ['Commercial', 'Technical', 'Legal', 'Financial', 'Competitive', 'Operational'], description: 'Risk category' },
                    defaultPonderation: { type: 'number', minimum: 0, maximum: 1, description: 'Default weight for this risk (0-1)' },
                    sourceShardTypes: { type: 'array', items: { type: 'string' }, description: 'Shard types that can trigger this risk' },
                    detectionRules: { type: 'object', description: 'Risk detection rules' },
                    explainabilityTemplate: { type: 'string', description: 'Template for explaining risk detection' },
                },
            },
            response: {
                201: {
                    type: 'object',
                    description: 'Created risk catalog entry',
                    properties: {
                        id: { type: 'string' },
                        riskId: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        category: { type: 'string' },
                        catalogType: { type: 'string' },
                        defaultPonderation: { type: 'number' },
                        isActive: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                    },
                },
                403: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                    },
                },
                500: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const user = getUser(request);
            const risk = await riskCatalogService.createCustomRisk(authRequest.user.tenantId, authRequest.user.id, request.body, user.roles);
            return reply.code(201).send(risk);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'risk-analysis.createCustomRisk' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // PUT /api/v1/risk-analysis/catalog/:riskId - Update risk
    server.put('/api/v1/risk-analysis/catalog/:riskId', {
        onRequest: checkPermission ? [...authGuards, checkPermission('shard:update:all')] : authGuards,
        schema: {
            tags: ['Risk Analysis'],
            summary: 'Update risk',
            params: {
                type: 'object',
                properties: { riskId: { type: 'string' } },
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    defaultPonderation: { type: 'number' },
                    detectionRules: { type: 'object' },
                    isActive: { type: 'boolean' },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const risk = await riskCatalogService.updateRisk(request.params.riskId, authRequest.user.tenantId, authRequest.user.id, request.body);
            return reply.code(200).send(risk);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'risk-analysis.updateRisk' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // DELETE /api/v1/risk-analysis/catalog/:riskId - Delete risk (tenant-specific only)
    server.delete('/api/v1/risk-analysis/catalog/:riskId', {
        onRequest: checkPermission ? [...authGuards, checkPermission('shard:delete:all')] : authGuards,
        schema: {
            tags: ['Risk Analysis'],
            summary: 'Delete tenant-specific risk',
            params: {
                type: 'object',
                properties: { riskId: { type: 'string' } },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            await riskCatalogService.deleteRisk(request.params.riskId, authRequest.user.tenantId, authRequest.user.id);
            return reply.code(204).send();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'risk-analysis.deleteRisk' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // POST /api/v1/risk-analysis/catalog/:riskId/duplicate - Duplicate global/industry risk to tenant
    server.post('/api/v1/risk-analysis/catalog/:riskId/duplicate', {
        onRequest: checkPermission ? [...authGuards, checkPermission('shard:create:tenant')] : authGuards,
        schema: {
            tags: ['Risk Analysis'],
            summary: 'Duplicate global or industry risk to tenant-specific',
            params: {
                type: 'object',
                properties: { riskId: { type: 'string' } },
            },
            querystring: {
                type: 'object',
                properties: {
                    catalogType: { type: 'string', enum: ['global', 'industry'] },
                    industryId: { type: 'string' },
                    newRiskId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const risk = await riskCatalogService.duplicateRisk(request.params.riskId, request.query.catalogType, request.query.industryId, authRequest.user.tenantId, authRequest.user.id, request.query.newRiskId);
            return reply.code(201).send(risk);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'risk-analysis.duplicateRisk' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // POST /api/v1/risk-analysis/catalog/:riskId/enable - Enable/disable global/industry risk for tenant
    server.post('/api/v1/risk-analysis/catalog/:riskId/enable', {
        onRequest: checkPermission ? [...authGuards, checkPermission('shard:update:all')] : authGuards,
        schema: {
            tags: ['Risk Analysis'],
            summary: 'Enable or disable a global/industry risk for tenant',
            params: {
                type: 'object',
                properties: { riskId: { type: 'string' } },
            },
            querystring: {
                type: 'object',
                properties: {
                    catalogType: { type: 'string', enum: ['global', 'industry'] },
                    industryId: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                required: ['enabled'],
                properties: {
                    enabled: { type: 'boolean' },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            await riskCatalogService.setRiskEnabledForTenant(request.params.riskId, request.query.catalogType, request.query.industryId, authRequest.user.tenantId, authRequest.user.id, request.body.enabled);
            return reply.code(200).send({ success: true });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'risk-analysis.setRiskEnabled' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // ===============================================
    // RISK EVALUATION ROUTES
    // ===============================================
    // POST /api/v1/risk-analysis/opportunities/:opportunityId/evaluate - Evaluate opportunity
    server.post('/api/v1/risk-analysis/opportunities/:opportunityId/evaluate', {
        onRequest: authGuards,
        schema: {
            tags: ['Risk Analysis'],
            summary: 'Evaluate opportunity risks',
            description: 'Evaluates risks for an opportunity. Can process synchronously or queue for async processing.',
            params: {
                type: 'object',
                properties: { opportunityId: { type: 'string', description: 'Opportunity shard ID' } },
            },
            body: {
                type: 'object',
                properties: {
                    forceRefresh: { type: 'boolean', description: 'Force a fresh evaluation even if recent evaluation exists' },
                    includeHistorical: { type: 'boolean', description: 'Include historical risk patterns' },
                    includeAI: { type: 'boolean', description: 'Include AI-powered risk detection' },
                    includeSemanticDiscovery: { type: 'boolean', description: 'Include semantic discovery of risks' },
                    queueAsync: { type: 'boolean', description: 'Queue evaluation for async processing (returns 202 Accepted)' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    description: 'Risk evaluation result (synchronous)',
                    properties: {
                        opportunityId: { type: 'string' },
                        riskScore: { type: 'number', minimum: 0, maximum: 1 },
                        revenueAtRisk: { type: 'number' },
                        risks: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    riskId: { type: 'string' },
                                    riskName: { type: 'string' },
                                    category: { type: 'string' },
                                    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
                                    detected: { type: 'boolean' },
                                    confidence: { type: 'number' },
                                },
                            },
                        },
                        evaluatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                202: {
                    type: 'object',
                    description: 'Evaluation queued for async processing',
                    properties: {
                        message: { type: 'string' },
                        opportunityId: { type: 'string' },
                    },
                },
                404: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                    },
                },
                500: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const body = request.body || {};
            // If queueAsync is true, queue for async processing
            if (body.queueAsync === true) {
                await riskEvaluationService.queueRiskEvaluation(request.params.opportunityId, authRequest.user.tenantId, authRequest.user.id, 'manual', 'normal', {
                    includeHistorical: body.includeHistorical,
                    includeAI: body.includeAI,
                    includeSemanticDiscovery: body.includeSemanticDiscovery,
                });
                return reply.code(202).send({
                    message: 'Risk evaluation queued for processing',
                    opportunityId: request.params.opportunityId,
                });
            }
            // Otherwise, process synchronously
            const evaluation = await riskEvaluationService.evaluateOpportunity(request.params.opportunityId, authRequest.user.tenantId, authRequest.user.id, {
                forceRefresh: body.forceRefresh,
                includeHistorical: body.includeHistorical,
                includeAI: body.includeAI,
                includeSemanticDiscovery: body.includeSemanticDiscovery,
            });
            return reply.code(200).send(evaluation);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'risk-analysis.evaluateOpportunity' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // GET /api/v1/risk-analysis/opportunities/:opportunityId/evolution - Get risk score evolution
    server.get('/api/v1/risk-analysis/opportunities/:opportunityId/evolution', {
        onRequest: authGuards,
        schema: {
            tags: ['Risk Analysis'],
            summary: 'Get risk score evolution over time (global and per category)',
            params: {
                type: 'object',
                properties: { opportunityId: { type: 'string' } },
            },
            querystring: {
                type: 'object',
                properties: {
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                    includeCategories: { type: 'boolean' },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const evolution = await riskEvaluationService.getRiskEvolution(request.params.opportunityId, authRequest.user.tenantId, {
                startDate: request.query.startDate ? new Date(request.query.startDate) : undefined,
                endDate: request.query.endDate ? new Date(request.query.endDate) : undefined,
                includeCategories: request.query.includeCategories !== false,
            });
            return reply.code(200).send(evolution);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'risk-analysis.getRiskEvolution' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // GET /api/v1/risk-analysis/opportunities/:opportunityId/risks/history - Get current and historical risks
    server.get('/api/v1/risk-analysis/opportunities/:opportunityId/risks/history', {
        onRequest: authGuards,
        schema: {
            tags: ['Risk Analysis'],
            summary: 'Get current and historical identified risks',
            params: {
                type: 'object',
                properties: { opportunityId: { type: 'string' } },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const risksHistory = await riskEvaluationService.getRisksWithHistory(request.params.opportunityId, authRequest.user.tenantId);
            return reply.code(200).send(risksHistory);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'risk-analysis.getRisksWithHistory' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // GET /api/v1/risk-analysis/opportunities/:opportunityId/historical-patterns - Get historical patterns
    server.get('/api/v1/risk-analysis/opportunities/:opportunityId/historical-patterns', {
        onRequest: authGuards,
        schema: {
            tags: ['Risk Analysis'],
            summary: 'Get historical patterns for opportunity',
            params: {
                type: 'object',
                properties: { opportunityId: { type: 'string' } },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const patterns = await riskEvaluationService.getHistoricalPatterns(request.params.opportunityId, authRequest.user.tenantId);
            return reply.code(200).send(patterns);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'risk-analysis.getHistoricalPatterns' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // ===============================================
    // REVENUE AT RISK ROUTES
    // ===============================================
    // GET /api/v1/risk-analysis/opportunities/:opportunityId/revenue-at-risk - Calculate revenue at risk for opportunity
    server.get('/api/v1/risk-analysis/opportunities/:opportunityId/revenue-at-risk', {
        onRequest: authGuards,
        schema: {
            tags: ['Risk Analysis'],
            summary: 'Calculate revenue at risk for opportunity',
            description: 'Calculates the potential revenue at risk for a specific opportunity based on risk evaluation',
            params: {
                type: 'object',
                properties: { opportunityId: { type: 'string', description: 'Opportunity shard ID' } },
            },
            response: {
                200: {
                    type: 'object',
                    description: 'Revenue at risk calculation result',
                    properties: {
                        opportunityId: { type: 'string' },
                        dealValue: { type: 'number', description: 'Total deal value' },
                        riskScore: { type: 'number', minimum: 0, maximum: 1, description: 'Overall risk score' },
                        revenueAtRisk: { type: 'number', description: 'Calculated revenue at risk amount' },
                        riskAdjustedValue: { type: 'number', description: 'Risk-adjusted expected value' },
                        currency: { type: 'string', description: 'Currency code' },
                        calculatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                404: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                    },
                },
                500: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const revenueAtRisk = await revenueAtRiskService.calculateForOpportunity(request.params.opportunityId, authRequest.user.tenantId, authRequest.user.id);
            return reply.code(200).send(revenueAtRisk);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'risk-analysis.calculateForOpportunity' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // GET /api/v1/risk-analysis/portfolio/:userId/revenue-at-risk - Calculate revenue at risk for portfolio
    server.get('/api/v1/risk-analysis/portfolio/:userId/revenue-at-risk', {
        onRequest: authGuards,
        schema: {
            tags: ['Risk Analysis'],
            summary: 'Calculate revenue at risk for user portfolio',
            params: {
                type: 'object',
                properties: { userId: { type: 'string' } },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            // Check permission: allow own portfolio or require risk:read:team for others
            const targetUserId = request.params.userId;
            const isOwnPortfolio = targetUserId === authRequest.user.id;
            if (!isOwnPortfolio && checkPermission) {
                // Check if user has team read permission
                await checkPermission('risk:read:team')(request, reply);
            }
            const portfolioRisk = await revenueAtRiskService.calculateForPortfolio(targetUserId, authRequest.user.tenantId);
            return reply.code(200).send(portfolioRisk);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'risk-analysis.calculateForPortfolio' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // GET /api/v1/risk-analysis/teams/:teamId/revenue-at-risk - Calculate revenue at risk for team
    server.get('/api/v1/risk-analysis/teams/:teamId/revenue-at-risk', {
        onRequest: checkPermission ? [...authGuards, checkPermission('risk:read:team')] : authGuards,
        schema: {
            tags: ['Risk Analysis'],
            summary: 'Calculate revenue at risk for team',
            params: {
                type: 'object',
                properties: { teamId: { type: 'string' } },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const teamRisk = await revenueAtRiskService.calculateForTeam(request.params.teamId, authRequest.user.tenantId);
            return reply.code(200).send(teamRisk);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'risk-analysis.calculateForTeam' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // GET /api/v1/risk-analysis/tenant/revenue-at-risk - Calculate revenue at risk for tenant
    // Requires tenant-level risk read access (Director+) or admin
    server.get('/api/v1/risk-analysis/tenant/revenue-at-risk', {
        onRequest: checkPermission ? [...authGuards, checkPermission('risk:read:tenant')] : authGuards,
        schema: {
            tags: ['Risk Analysis'],
            summary: 'Calculate revenue at risk for tenant',
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const tenantRisk = await revenueAtRiskService.calculateForTenant(authRequest.user.tenantId);
            return reply.code(200).send(tenantRisk);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'risk-analysis.calculateForTenant' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // ===============================================
    // EARLY WARNING ROUTES
    // ===============================================
    // POST /api/v1/risk-analysis/opportunities/:opportunityId/early-warnings - Detect early warning signals
    server.post('/api/v1/risk-analysis/opportunities/:opportunityId/early-warnings', {
        onRequest: authGuards,
        schema: {
            tags: ['Risk Analysis'],
            summary: 'Detect early warning signals for opportunity',
            description: 'Detects early warning signals for an opportunity based on risk patterns and historical data',
            params: {
                type: 'object',
                properties: { opportunityId: { type: 'string', description: 'Opportunity shard ID' } },
            },
            response: {
                200: {
                    type: 'object',
                    description: 'Early warning signals detected',
                    properties: {
                        opportunityId: { type: 'string' },
                        signals: {
                            type: 'array',
                            description: 'Array of detected early warning signals',
                            items: {
                                type: 'object',
                                properties: {
                                    signalId: { type: 'string' },
                                    type: { type: 'string', enum: ['risk_increase', 'stale_opportunity', 'missing_followup', 'relationship_cooling', 'competitor_activity'] },
                                    severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                                    message: { type: 'string' },
                                    detectedAt: { type: 'string', format: 'date-time' },
                                    confidence: { type: 'number', minimum: 0, maximum: 1 },
                                },
                            },
                        },
                        detectedAt: { type: 'string', format: 'date-time' },
                    },
                },
                404: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                    },
                },
                500: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const signals = await earlyWarningService.detectSignals(request.params.opportunityId, authRequest.user.tenantId, authRequest.user.id);
            return reply.code(200).send(signals);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'risk-analysis.detectSignals' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    server.log.info('✅ Risk analysis routes registered');
}
//# sourceMappingURL=risk-analysis.routes.js.map
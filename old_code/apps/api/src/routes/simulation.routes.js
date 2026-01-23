/**
 * Simulation API Routes
 * REST endpoints for risk simulation and scenario analysis
 */
import { SimulationService } from '../services/simulation.service.js';
import { RiskEvaluationService } from '../services/risk-evaluation.service.js';
import { RiskCatalogService } from '../services/risk-catalog.service.js';
import { requireAuth } from '../middleware/authorization.js';
import { createPermissionGuard } from '../middleware/permission.guard.js';
/**
 * Register simulation routes
 */
export async function registerSimulationRoutes(server, options) {
    const { monitoring, shardRepository, shardTypeRepository, relationshipService, vectorSearchService, insightService, roleManagementService, } = options;
    // Initialize services
    const riskCatalogService = new RiskCatalogService(monitoring, shardRepository, shardTypeRepository);
    const riskEvaluationService = new RiskEvaluationService(monitoring, shardRepository, shardTypeRepository, relationshipService, riskCatalogService, vectorSearchService, insightService);
    const simulationService = new SimulationService(monitoring, shardRepository, shardTypeRepository, riskEvaluationService);
    // Get authentication decorator
    const authDecorator = server.authenticate;
    if (!authDecorator) {
        server.log.warn('⚠️  Simulation routes not registered - authentication decorator missing');
        return;
    }
    const authGuards = [authDecorator, requireAuth()];
    // Create permission guard if role management service is available
    let checkPermission;
    if (roleManagementService) {
        checkPermission = createPermissionGuard(roleManagementService);
    }
    // ===============================================
    // SIMULATION ROUTES
    // ===============================================
    // Note: Simulations are tied to opportunities. Users can simulate their own opportunities
    // (via shard:read:assigned), managers can simulate team opportunities (via shard:read:team).
    // The service layer validates opportunity access, so we use basic auth here.
    // POST /api/v1/simulations/opportunities/:opportunityId/run - Run simulation
    server.post('/api/v1/simulations/opportunities/:opportunityId/run', {
        onRequest: authGuards,
        schema: {
            tags: ['Simulations'],
            summary: 'Run risk simulation for opportunity',
            params: {
                type: 'object',
                properties: { opportunityId: { type: 'string' } },
            },
            body: {
                type: 'object',
                required: ['modifications'],
                properties: {
                    modifications: {
                        type: 'object',
                        properties: {
                            stage: { type: 'string' },
                            value: { type: 'number' },
                            probability: { type: 'number' },
                            closeDate: { type: 'string', format: 'date-time' },
                            riskFactors: { type: 'array', items: { type: 'object' } },
                        },
                    },
                    description: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const scenario = {
                scenarioName: request.body.scenarioName || request.body.description || 'Simulation scenario',
                modifications: request.body.modifications,
            };
            // Convert date strings to Date objects if present
            if (scenario.modifications?.dealParameters?.closeDate) {
                scenario.modifications.dealParameters.closeDate = new Date(scenario.modifications.dealParameters.closeDate);
            }
            const result = await simulationService.runSimulation(request.params.opportunityId, authRequest.user.tenantId, authRequest.user.id, scenario);
            return reply.code(200).send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'simulations.runSimulation' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // POST /api/v1/simulations/opportunities/:opportunityId/compare - Compare scenarios
    server.post('/api/v1/simulations/opportunities/:opportunityId/compare', {
        onRequest: authGuards,
        schema: {
            tags: ['Simulations'],
            summary: 'Compare multiple simulation scenarios',
            params: {
                type: 'object',
                properties: { opportunityId: { type: 'string' } },
            },
            body: {
                type: 'object',
                required: ['scenarios'],
                properties: {
                    scenarios: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['modifications'],
                            properties: {
                                modifications: { type: 'object' },
                                description: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const scenarios = request.body.scenarios.map((s) => ({
                scenarioName: s.scenarioName || s.description || 'Simulation scenario',
                modifications: s.modifications,
            }));
            // Convert date strings to Date objects
            scenarios.forEach((scenario) => {
                if (scenario.modifications?.dealParameters?.closeDate) {
                    scenario.modifications.dealParameters.closeDate = new Date(scenario.modifications.dealParameters.closeDate);
                }
            });
            const comparison = await simulationService.compareScenarios(request.params.opportunityId, authRequest.user.tenantId, authRequest.user.id, scenarios);
            return reply.code(200).send(comparison);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'simulations.compareScenarios' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // GET /api/v1/simulations/:simulationId - Get simulation
    server.get('/api/v1/simulations/:simulationId', {
        onRequest: authGuards,
        schema: {
            tags: ['Simulations'],
            summary: 'Get simulation by ID',
            params: {
                type: 'object',
                properties: { simulationId: { type: 'string' } },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const simulation = await simulationService.getSimulation(request.params.simulationId, authRequest.user.tenantId);
            if (!simulation) {
                return reply.code(404).send({ error: 'Simulation not found' });
            }
            return reply.code(200).send(simulation);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'simulations.getSimulation' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // GET /api/v1/simulations/opportunities/:opportunityId - List simulations for opportunity
    server.get('/api/v1/simulations/opportunities/:opportunityId', {
        onRequest: authGuards,
        schema: {
            tags: ['Simulations'],
            summary: 'List simulations for opportunity',
            params: {
                type: 'object',
                properties: { opportunityId: { type: 'string' } },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const simulations = await simulationService.listSimulations(request.params.opportunityId, authRequest.user.tenantId);
            return reply.code(200).send(simulations);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'simulations.listSimulations' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    server.log.info('✅ Simulation routes registered');
}
//# sourceMappingURL=simulation.routes.js.map
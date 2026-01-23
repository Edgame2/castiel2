/**
 * Simulation Service
 * Runs risk simulations with modified scenarios
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { RiskEvaluationService } from './risk-evaluation.service.js';
import { RiskCatalogService } from './risk-catalog.service.js';
import type { SimulationScenario, RiskSimulation, ComparisonResult } from '../types/risk-analysis.types.js';
export declare class SimulationService {
    private monitoring;
    private shardRepository;
    private shardTypeRepository;
    private riskEvaluationService;
    private riskCatalogService;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, riskEvaluationService: RiskEvaluationService, riskCatalogService: RiskCatalogService);
    /**
     * Run a risk simulation for an opportunity
     */
    runSimulation(opportunityId: string, tenantId: string, userId: string, scenario: SimulationScenario): Promise<RiskSimulation>;
    /**
     * Compare multiple scenarios
     */
    compareScenarios(opportunityId: string, tenantId: string, userId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>;
    /**
     * Get a simulation by ID
     */
    getSimulation(simulationId: string, tenantId: string): Promise<RiskSimulation | null>;
    /**
     * List all simulations for an opportunity
     */
    listSimulations(opportunityId: string, tenantId: string): Promise<RiskSimulation[]>;
    /**
     * Apply modifications to opportunity data
     */
    private applyModifications;
    /**
     * Evaluate opportunity with modifications applied
     */
    private evaluateWithModifications;
    /**
     * Generate recommendations based on scenario comparison
     */
    private generateRecommendations;
}
//# sourceMappingURL=simulation.service.d.ts.map
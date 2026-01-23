/**
 * Revenue at Risk Service
 * Calculates revenue at risk for opportunities, portfolios, teams, and tenants
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { RiskEvaluationService } from './risk-evaluation.service.js';
import type { RevenueAtRisk, PortfolioRevenueAtRisk, TeamRevenueAtRisk, TenantRevenueAtRisk } from '../types/risk-analysis.types.js';
export declare class RevenueAtRiskService {
    private monitoring;
    private shardRepository;
    private shardTypeRepository;
    private riskEvaluationService;
    private readonly HIGH_RISK_THRESHOLD;
    private readonly MEDIUM_RISK_THRESHOLD;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, riskEvaluationService: RiskEvaluationService);
    /**
     * Calculate revenue at risk for a single opportunity
     */
    calculateForOpportunity(opportunityId: string, tenantId: string, userId: string): Promise<RevenueAtRisk>;
    /**
     * Calculate revenue at risk for a user's portfolio
     */
    calculateForPortfolio(userId: string, tenantId: string): Promise<PortfolioRevenueAtRisk>;
    /**
     * Calculate revenue at risk for a team
     * Note: Team membership is typically stored in relationships or user metadata
     * This is a simplified implementation - may need enhancement based on team structure
     */
    calculateForTeam(teamId: string, tenantId: string): Promise<TeamRevenueAtRisk>;
    /**
     * Calculate revenue at risk for entire tenant
     */
    calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>;
    /**
     * Categorize risk score
     */
    private categorizeRisk;
}
//# sourceMappingURL=revenue-at-risk.service.d.ts.map
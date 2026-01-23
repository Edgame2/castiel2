/**
 * Pipeline Analytics Service
 * Calculates pipeline metrics, closed won/lost, and risk organization
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { OpportunityService } from './opportunity.service.js';
import { RevenueAtRiskService } from './revenue-at-risk.service.js';
import type { PipelineMetrics, ClosedWonMetrics, RiskLevelOrganization, OpportunityRecommendation } from '../types/opportunity.types.js';
export declare class PipelineAnalyticsService {
    private monitoring;
    private opportunityService;
    private revenueAtRiskService;
    private readonly HIGH_RISK_THRESHOLD;
    private readonly MEDIUM_RISK_THRESHOLD;
    constructor(monitoring: IMonitoringProvider, opportunityService: OpportunityService, revenueAtRiskService: RevenueAtRiskService);
    /**
     * Calculate pipeline metrics for a user
     */
    calculatePipelineMetrics(userId: string, tenantId: string, options?: {
        includeClosed?: boolean;
        dateRange?: {
            startDate: Date;
            endDate: Date;
        };
    }): Promise<PipelineMetrics>;
    /**
     * Calculate closed won/lost metrics
     */
    calculateClosedWonLost(userId: string, tenantId: string, period: {
        startDate: Date;
        endDate: Date;
    }): Promise<ClosedWonMetrics>;
    /**
     * Organize pipeline by risk level
     */
    organizeByRiskLevel(userId: string, tenantId: string): Promise<RiskLevelOrganization>;
    /**
     * Generate recommendations for an opportunity
     */
    generateRecommendations(opportunityId: string, tenantId: string, userId: string): Promise<OpportunityRecommendation[]>;
}
//# sourceMappingURL=pipeline-analytics.service.d.ts.map
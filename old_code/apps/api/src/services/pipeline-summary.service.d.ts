/**
 * Pipeline Summary Service
 * Provides high-level summary dashboard with key metrics and risk distribution
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { PipelineAnalyticsService } from './pipeline-analytics.service.js';
import { RevenueAtRiskService } from './revenue-at-risk.service.js';
import type { PipelineMetrics, RiskLevelOrganization } from '../types/opportunity.types.js';
export interface PipelineSummary {
    metrics: PipelineMetrics;
    riskOrganization: RiskLevelOrganization;
    riskDistribution: {
        high: {
            count: number;
            percentage: number;
            value: number;
        };
        medium: {
            count: number;
            percentage: number;
            value: number;
        };
        low: {
            count: number;
            percentage: number;
            value: number;
        };
    };
    topRisks: Array<{
        opportunityId: string;
        opportunityName: string;
        riskScore: number;
        revenueAtRisk: number;
    }>;
    calculatedAt: Date;
}
export declare class PipelineSummaryService {
    private monitoring;
    private pipelineAnalytics;
    private revenueAtRiskService;
    constructor(monitoring: IMonitoringProvider, pipelineAnalytics: PipelineAnalyticsService, revenueAtRiskService: RevenueAtRiskService);
    /**
     * Get comprehensive pipeline summary
     */
    getSummary(userId: string, tenantId: string): Promise<PipelineSummary>;
}
//# sourceMappingURL=pipeline-summary.service.d.ts.map
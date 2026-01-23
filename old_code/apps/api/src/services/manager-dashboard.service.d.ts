/**
 * Manager Dashboard Service
 * Aggregates team metrics for manager dashboard view
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { TeamService } from './team.service.js';
import { OpportunityService } from './opportunity.service.js';
import { QuotaService } from './quota.service.js';
import { PipelineAnalyticsService } from './pipeline-analytics.service.js';
import { RevenueAtRiskService } from './revenue-at-risk.service.js';
import type { UserManagementService } from './auth/user-management.service.js';
import type { ManagerDashboard, ManagerDashboardOptions } from '../types/manager-dashboard.types.js';
export declare class ManagerDashboardService {
    private monitoring;
    private teamService;
    private opportunityService;
    private quotaService;
    private pipelineAnalyticsService;
    private revenueAtRiskService;
    private userManagementService?;
    constructor(monitoring: IMonitoringProvider, teamService: TeamService, opportunityService: OpportunityService, quotaService: QuotaService, pipelineAnalyticsService: PipelineAnalyticsService, revenueAtRiskService: RevenueAtRiskService, userManagementService?: UserManagementService | undefined);
    /**
     * Get manager dashboard data
     */
    getManagerDashboard(managerId: string, tenantId: string, options?: ManagerDashboardOptions): Promise<ManagerDashboard>;
    /**
     * Calculate opportunity metrics
     */
    private calculateOpportunityMetrics;
    /**
     * Calculate stage summary
     */
    private calculateStageSummary;
    /**
     * Calculate risk metrics
     */
    private calculateRiskMetrics;
    /**
     * Get quota metrics
     */
    private getQuotaMetrics;
    /**
     * Calculate closed won/lost
     */
    private calculateClosedWonLost;
    /**
     * Build team summary
     */
    private buildTeamSummary;
    /**
     * Build team member summaries
     */
    private buildTeamMemberSummaries;
    /**
     * Get user quota attainment (helper for parallelization)
     */
    private getUserQuotaAttainment;
    /**
     * Get user information (helper for parallelization)
     */
    private getUserInfo;
    /**
     * Get numeric value from unknown type, safely converting to number
     */
    private getNumericValue;
    /**
     * Create empty dashboard
     */
    private createEmptyDashboard;
}
//# sourceMappingURL=manager-dashboard.service.d.ts.map
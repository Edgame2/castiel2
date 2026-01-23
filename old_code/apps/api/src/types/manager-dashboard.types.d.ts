/**
 * Manager Dashboard Types
 * Type definitions for manager dashboard data aggregation
 */
import type { QuotaPerformance } from './quota.types.js';
/**
 * Team Summary
 */
export interface TeamSummary {
    id: string;
    name: string;
    managerId: string;
    memberCount: number;
    opportunityCount: number;
    totalValue: number;
    expectedRevenue: number;
    revenueAtRisk: number;
    quotaAttainment?: number;
}
/**
 * Stage Summary
 */
export interface StageSummary {
    stage: string;
    count: number;
    totalValue: number;
    expectedRevenue: number;
    revenueAtRisk: number;
}
/**
 * Risk Distribution
 */
export interface RiskDistribution {
    high: number;
    medium: number;
    low: number;
}
/**
 * Team Member Summary
 */
export interface TeamMemberSummary {
    userId: string;
    name: string;
    email: string;
    opportunityCount: number;
    totalValue: number;
    quotaAttainment?: number;
    revenueAtRisk: number;
}
/**
 * Manager Dashboard Data
 */
export interface ManagerDashboard {
    managerId: string;
    tenantId: string;
    teams: TeamSummary[];
    totalTeamMembers: number;
    opportunities: {
        total: number;
        totalValue: number;
        expectedRevenue: number;
        revenueAtRisk: number;
        riskAdjustedValue: number;
        byStage: StageSummary[];
    };
    quotas: {
        teamQuota?: QuotaPerformance;
        individualQuotas: Array<{
            userId: string;
            quota: QuotaPerformance;
        }>;
        totalTarget: number;
        totalActual: number;
        totalForecasted: number;
        totalRiskAdjusted: number;
        attainment: number;
        riskAdjustedAttainment: number;
    };
    risk: {
        totalRevenueAtRisk: number;
        highRiskOpportunities: number;
        mediumRiskOpportunities: number;
        lowRiskOpportunities: number;
        riskDistribution: RiskDistribution;
    };
    closedWonLost: {
        period: {
            startDate: Date;
            endDate: Date;
        };
        won: {
            count: number;
            value: number;
        };
        lost: {
            count: number;
            value: number;
        };
        winRate: number;
    };
    teamMembers: TeamMemberSummary[];
    calculatedAt: Date;
}
/**
 * Manager Dashboard Options
 */
export interface ManagerDashboardOptions {
    view?: 'my-team' | 'all-teams';
    includeAllTeams?: boolean;
    period?: {
        startDate: Date;
        endDate: Date;
    };
    teamId?: string;
}
//# sourceMappingURL=manager-dashboard.types.d.ts.map
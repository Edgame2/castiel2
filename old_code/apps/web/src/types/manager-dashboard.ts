/**
 * Manager Dashboard Types
 * Type definitions for manager dashboard (matches API types)
 */

import type { QuotaPerformance } from './quota';
// PipelineMetrics is not used in this file, removing import
// import type { PipelineMetrics } from './opportunity';
import type { Team } from './team';

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
  // Manager Info
  managerId: string;
  tenantId: string;
  
  // Team Overview
  teams: TeamSummary[];
  totalTeamMembers: number;
  
  // Opportunities
  opportunities: {
    total: number;
    totalValue: number;
    expectedRevenue: number;
    revenueAtRisk: number;
    riskAdjustedValue: number;
    byStage: StageSummary[];
  };
  
  // Quotas
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
  
  // Risk Metrics
  risk: {
    totalRevenueAtRisk: number;
    highRiskOpportunities: number;
    mediumRiskOpportunities: number;
    lowRiskOpportunities: number;
    riskDistribution: RiskDistribution;
  };
  
  // Close Won/Lost
  closedWonLost: {
    period: {
      startDate: string; // ISO string
      endDate: string; // ISO string
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
  
  // Team Members
  teamMembers: TeamMemberSummary[];
  
  // Calculated timestamp
  calculatedAt: string; // ISO string
}

/**
 * Manager Dashboard Options
 */
export interface ManagerDashboardOptions {
  view?: 'my-team' | 'all-teams'; // Default: 'my-team'
  includeAllTeams?: boolean; // Include descendant teams
  period?: {
    startDate: Date;
    endDate: Date;
  };
  teamId?: string; // Filter by specific team
}




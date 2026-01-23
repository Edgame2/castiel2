/**
 * Manager Dashboard Service
 * Aggregates team metrics for manager dashboard view
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { TeamService } from '@castiel/api-core';
import { OpportunityService } from './opportunity.service.js';
import { QuotaService } from './quota.service.js';
import { PipelineAnalyticsService } from './pipeline-analytics.service.js';
import { RevenueAtRiskService } from './revenue-at-risk.service.js';
import type { UserManagementService } from './auth/user-management.service.js';
import type {
  ManagerDashboard,
  ManagerDashboardOptions,
  TeamSummary,
  StageSummary,
  TeamMemberSummary,
} from '../types/manager-dashboard.types.js';
import type { Shard } from '../types/shard.types.js';
import type { Team } from '../types/team.types.js';
import type { Quota, QuotaPerformanceDetails } from '../types/quota.types.js';

export class ManagerDashboardService {
  constructor(
    private monitoring: IMonitoringProvider,
    private teamService: TeamService,
    private opportunityService: OpportunityService,
    private quotaService: QuotaService,
    private pipelineAnalyticsService: PipelineAnalyticsService,
    private revenueAtRiskService: RevenueAtRiskService,
    private userManagementService?: UserManagementService
  ) {}

  /**
   * Get manager dashboard data
   */
  async getManagerDashboard(
    managerId: string,
    tenantId: string,
    options: ManagerDashboardOptions = {}
  ): Promise<ManagerDashboard> {
    const startTime = Date.now();

    try {
      const view = options.view || 'my-team';
      const includeAllTeams = options.includeAllTeams ?? false;

      // Get teams managed by this user
      const managerTeams = await this.teamService.getManagerTeams(managerId, tenantId);

      if (managerTeams.length === 0) {
        // Return empty dashboard if no teams managed
        return this.createEmptyDashboard(managerId, tenantId, options);
      }

      // Filter teams if specific teamId provided
      const teams = options.teamId
        ? managerTeams.filter(t => t.id === options.teamId)
        : managerTeams;

      // Collect all user IDs from managed teams (parallelized for performance)
      const allUserIds = new Set<string>();
      const teamUserMap = new Map<string, string[]>(); // teamId -> userIds

      const teamUserIdsPromises = teams.map(async (team) => {
        const teamUserIds = includeAllTeams
          ? await this.teamService.getTeamUserIdsRecursive(team.id, tenantId)
          : await this.teamService.getTeamUserIds(team.id, tenantId);
        return { teamId: team.id, userIds: teamUserIds };
      });

      const teamUserIdsResults = await Promise.all(teamUserIdsPromises);
      for (const { teamId, userIds } of teamUserIdsResults) {
        if (userIds && Array.isArray(userIds)) {
          userIds.filter(id => id && typeof id === 'string').forEach(id => allUserIds.add(id));
          teamUserMap.set(teamId, userIds.filter(id => id && typeof id === 'string'));
        }
      }

      // Get all opportunities for managed teams (parallelized for performance)
      const opportunityPromises = teams.map(team =>
        this.opportunityService.listTeamOpportunities(
          team.id,
          tenantId,
          managerId,
          {},
          { limit: 1000 }
        )
      );

      const opportunityResults = await Promise.all(opportunityPromises);
      const allOpportunities: Shard[] = [];
      for (const result of opportunityResults) {
        if (result?.opportunities && Array.isArray(result.opportunities)) {
          allOpportunities.push(...result.opportunities);
        }
      }

      // Remove duplicates (opportunities might be in multiple teams)
      const uniqueOpportunities = Array.from(
        new Map(
          allOpportunities
            .filter(opp => opp?.id) // Filter out any opportunities without IDs
            .map(opp => [opp.id, opp])
        ).values()
      );

      // Calculate opportunity metrics
      const opportunityMetrics = this.calculateOpportunityMetrics(uniqueOpportunities);

      // Calculate stage summary
      const stageSummary = this.calculateStageSummary(uniqueOpportunities);

      // Calculate risk metrics
      const riskMetrics = await this.calculateRiskMetrics(
        uniqueOpportunities,
        tenantId,
        managerId
      );

      // Get quotas
      const quotaMetrics = await this.getQuotaMetrics(
        teams,
        Array.from(allUserIds),
        tenantId,
        managerId
      );

      // Calculate close won/lost
      const closedWonLost = await this.calculateClosedWonLost(
        Array.from(allUserIds),
        tenantId,
        options.period
      );

      // Build team summaries
      const teamSummaries = await Promise.all(
        teams.map(team => this.buildTeamSummary(team, teamUserMap.get(team.id) || [], tenantId, managerId))
      );

      // Build team member summaries
      const teamMemberSummaries = await this.buildTeamMemberSummaries(
        Array.from(allUserIds),
        uniqueOpportunities,
        tenantId
      );

      const dashboard: ManagerDashboard = {
        managerId,
        tenantId,
        teams: teamSummaries,
        totalTeamMembers: allUserIds.size,
        opportunities: {
          ...opportunityMetrics,
          byStage: stageSummary,
        },
        quotas: quotaMetrics,
        risk: riskMetrics,
        closedWonLost,
        teamMembers: teamMemberSummaries,
        calculatedAt: new Date(),
      };

      this.monitoring.trackEvent('manager-dashboard.calculated', {
        tenantId,
        managerId,
        teamCount: teams.length,
        opportunityCount: uniqueOpportunities.length,
        durationMs: Date.now() - startTime,
      });

      return dashboard;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'manager-dashboard.getManagerDashboard',
          tenantId,
          managerId,
          durationMs: Date.now() - startTime,
        }
      );
      throw error;
    }
  }

  /**
   * Calculate opportunity metrics
   */
  private calculateOpportunityMetrics(opportunities: Shard[]): {
    total: number;
    totalValue: number;
    expectedRevenue: number;
    revenueAtRisk: number;
    riskAdjustedValue: number;
  } {
    let totalValue = 0;
    let totalExpectedRevenue = 0;
    let totalRevenueAtRisk = 0;

    for (const opp of opportunities) {
      const data = opp.structuredData as Record<string, unknown>;
      const value = this.getNumericValue(data?.value) || this.getNumericValue(data?.amount) || 0;
      const expectedRevenue = this.getNumericValue(data?.expectedRevenue) || value;
      const riskEvaluation = data?.riskEvaluation as Record<string, unknown> | undefined;
      const revenueAtRisk = this.getNumericValue(riskEvaluation?.revenueAtRisk) || 0;

      totalValue += value;
      totalExpectedRevenue += expectedRevenue;
      totalRevenueAtRisk += revenueAtRisk;
    }

    return {
      total: opportunities.length,
      totalValue,
      expectedRevenue: totalExpectedRevenue,
      revenueAtRisk: totalRevenueAtRisk,
      riskAdjustedValue: totalExpectedRevenue - totalRevenueAtRisk,
    };
  }

  /**
   * Calculate stage summary
   */
  private calculateStageSummary(opportunities: Shard[]): StageSummary[] {
    const stageMap = new Map<string, StageSummary>();

    for (const opp of opportunities) {
      const data = opp.structuredData as Record<string, unknown>;
      const stage = (typeof data?.stage === 'string' ? data.stage : 'unknown');
      const value = this.getNumericValue(data?.value) || this.getNumericValue(data?.amount) || 0;
      const expectedRevenue = this.getNumericValue(data?.expectedRevenue) || value;
      const riskEvaluation = data?.riskEvaluation as Record<string, unknown> | undefined;
      const revenueAtRisk = this.getNumericValue(riskEvaluation?.revenueAtRisk) || 0;

      const existing = stageMap.get(stage) || {
        stage,
        count: 0,
        totalValue: 0,
        expectedRevenue: 0,
        revenueAtRisk: 0,
      };

      existing.count++;
      existing.totalValue += value;
      existing.expectedRevenue += expectedRevenue;
      existing.revenueAtRisk += revenueAtRisk;

      stageMap.set(stage, existing);
    }

    return Array.from(stageMap.values());
  }

  /**
   * Calculate risk metrics
   */
  private async calculateRiskMetrics(
    opportunities: Shard[],
    tenantId: string,
    userId: string
  ): Promise<{
    totalRevenueAtRisk: number;
    highRiskOpportunities: number;
    mediumRiskOpportunities: number;
    lowRiskOpportunities: number;
    riskDistribution: { high: number; medium: number; low: number };
  }> {
    let totalRevenueAtRisk = 0;
    let highRisk = 0;
    let mediumRisk = 0;
    let lowRisk = 0;

    for (const opp of opportunities) {
      const data = opp.structuredData as Record<string, unknown>;
      const riskEvaluation = data?.riskEvaluation as Record<string, unknown> | undefined;
      const riskScore = this.getNumericValue(riskEvaluation?.riskScore) || 0;
      const revenueAtRisk = this.getNumericValue(riskEvaluation?.revenueAtRisk) || 0;

      totalRevenueAtRisk += revenueAtRisk;

      if (riskScore >= 0.7) {
        highRisk++;
      } else if (riskScore >= 0.4) {
        mediumRisk++;
      } else {
        lowRisk++;
      }
    }

    return {
      totalRevenueAtRisk,
      highRiskOpportunities: highRisk,
      mediumRiskOpportunities: mediumRisk,
      lowRiskOpportunities: lowRisk,
      riskDistribution: {
        high: highRisk,
        medium: mediumRisk,
        low: lowRisk,
      },
    };
  }

  /**
   * Get quota metrics
   */
  private async getQuotaMetrics(
    teams: Team[],
    userIds: string[],
    tenantId: string,
    managerId: string
  ): Promise<{
    teamQuota?: QuotaPerformanceDetails['performance'];
    individualQuotas: Array<{ userId: string; quota: QuotaPerformanceDetails['performance'] }>;
    totalTarget: number;
    totalActual: number;
    totalForecasted: number;
    totalRiskAdjusted: number;
    attainment: number;
    riskAdjustedAttainment: number;
  }> {
    // Get all quotas for teams and users
    // Note: listQuotas doesn't support array filters, so we'll get all and filter
    const allQuotas = await this.quotaService.listQuotas(tenantId);
    
    // Filter quotas for teams and users
    const teamIds = teams.map(t => t.id);
    const relevantQuotas = allQuotas.filter(q => {
      if (q.quotaType === 'team' && q.teamId && teamIds.includes(q.teamId)) {
        return true;
      }
      if (q.quotaType === 'individual' && q.targetUserId && userIds.includes(q.targetUserId)) {
        return true;
      }
      return false;
    });

    let totalTarget = 0;
    let totalActual = 0;
    let totalForecasted = 0;
    let totalRiskAdjusted = 0;

    const individualQuotas: Array<{ userId: string; quota: QuotaPerformanceDetails['performance'] }> = [];
    let teamQuota: QuotaPerformanceDetails['performance'] | undefined = undefined;

    // Parallelize quota performance calculations for better performance
    const quotaPerformancePromises = relevantQuotas.map(async (quota) => {
      try {
        const performance = await this.quotaService.calculatePerformance(
          quota.id,
          tenantId,
          managerId
        );
        return { quota, performance };
      } catch (error: unknown) {
        // Log but continue with other quotas
        this.monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'manager-dashboard.getQuotaMetrics',
            quotaId: quota.id,
            tenantId,
          }
        );
        return null;
      }
    });

    const quotaResults = await Promise.all(quotaPerformancePromises);

    for (const result of quotaResults) {
      if (!result) {continue;}

      const { quota, performance } = result;

      if (quota.quotaType === 'team') {
        // Use first team quota found (or aggregate if multiple teams have quotas)
        if (!teamQuota && performance?.performance) {
          teamQuota = performance.performance;
        }
        
        if (quota.target?.amount) {
          totalTarget += quota.target.amount;
        }
        if (performance?.performance) {
          totalActual += performance.performance.actual || 0;
          totalForecasted += performance.performance.forecasted || 0;
          totalRiskAdjusted += performance.performance.riskAdjusted || 0;
        }
      } else if (quota.quotaType === 'individual') {
        if (performance?.performance && quota.targetUserId) {
          individualQuotas.push({
            userId: quota.targetUserId,
            quota: performance.performance,
          });
        }
        
        if (quota.target?.amount) {
          totalTarget += quota.target.amount;
        }
        if (performance?.performance) {
          totalActual += performance.performance.actual || 0;
          totalForecasted += performance.performance.forecasted || 0;
          totalRiskAdjusted += performance.performance.riskAdjusted || 0;
        }
      }
    }

    const attainment = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
    const riskAdjustedAttainment = totalTarget > 0 ? (totalRiskAdjusted / totalTarget) * 100 : 0;

    return {
      teamQuota: teamQuota || undefined,
      individualQuotas,
      totalTarget,
      totalActual,
      totalForecasted,
      totalRiskAdjusted,
      attainment,
      riskAdjustedAttainment,
    };
  }

  /**
   * Calculate closed won/lost
   */
  private async calculateClosedWonLost(
    userIds: string[],
    tenantId: string,
    period?: { startDate: Date; endDate: Date }
  ): Promise<{
    period: { startDate: Date; endDate: Date };
    won: { count: number; value: number };
    lost: { count: number; value: number };
    winRate: number;
  }> {
    // Use default period (current quarter) if not provided
    const now = new Date();
    const startDate = period?.startDate || new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endDate = period?.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Aggregate closed won/lost for all users (parallelized for performance)
    let wonCount = 0;
    let wonValue = 0;
    let lostCount = 0;
    let lostValue = 0;

    // Filter valid user IDs and parallelize the calls
    const validUserIds = userIds.filter(id => id && typeof id === 'string');
    
    const metricsPromises = validUserIds.map(async (userId) => {
      try {
        return await this.pipelineAnalyticsService.calculateClosedWonLost(
          userId,
          tenantId,
          { startDate, endDate }
        );
      } catch (error: unknown) {
        // Log but continue with other users
        this.monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'manager-dashboard.calculateClosedWonLost',
            userId,
            tenantId,
          }
        );
        return null;
      }
    });

    const metricsResults = await Promise.all(metricsPromises);

    for (const metrics of metricsResults) {
      if (!metrics) {continue;}
      
      if (metrics.closedWon) {
        wonCount += metrics.closedWon.count || 0;
        wonValue += metrics.closedWon.totalValue || 0;
      }
      if (metrics.closedLost) {
        lostCount += metrics.closedLost.count || 0;
        lostValue += metrics.closedLost.totalValue || 0;
      }
    }

    const total = wonCount + lostCount;
    const winRate = total > 0 ? (wonCount / total) * 100 : 0;

    return {
      period: { startDate, endDate },
      won: { count: wonCount, value: wonValue },
      lost: { count: lostCount, value: lostValue },
      winRate,
    };
  }

  /**
   * Build team summary
   */
  private async buildTeamSummary(
    team: Team,
    userIds: string[],
    tenantId: string,
    managerId: string
  ): Promise<TeamSummary> {
    // Get team opportunities
    const teamOpps = await this.opportunityService.listTeamOpportunities(
      team.id,
      tenantId,
      managerId,
      {},
      { limit: 1000 }
    );

    const opportunities = teamOpps?.opportunities && Array.isArray(teamOpps.opportunities) 
      ? teamOpps.opportunities 
      : [];
    const metrics = this.calculateOpportunityMetrics(opportunities);
    const riskMetrics = await this.calculateRiskMetrics(
      opportunities,
      tenantId,
      managerId
    );

      // Get team quota if exists
      let quotaAttainment: number | undefined;
      try {
        const quotas = await this.quotaService.listQuotas(tenantId, {
          teamId: team.id,
          quotaType: 'team',
        });
      if (quotas.length > 0) {
        const performance = await this.quotaService.calculatePerformance(
          quotas[0].id,
          tenantId,
          managerId
        );
        quotaAttainment = performance.performance.attainment;
      }
    } catch (error: unknown) {
      // Quota not found or error, skip - error already logged by quota service
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'managerDashboard.getTeamQuota',
          teamId: team.id,
          tenantId,
        }
      );
    }

    return {
      id: team.id,
      name: team.name,
      managerId: team.manager?.userId || 'unknown',
      memberCount: userIds.length,
      opportunityCount: metrics.total,
      totalValue: metrics.totalValue,
      expectedRevenue: metrics.expectedRevenue,
      revenueAtRisk: metrics.revenueAtRisk,
      quotaAttainment,
    };
  }

  /**
   * Build team member summaries
   */
  private async buildTeamMemberSummaries(
    userIds: string[],
    allOpportunities: Shard[],
    tenantId: string
  ): Promise<TeamMemberSummary[]> {
    // Parallelize processing of all team members for better performance
    const summaryPromises = userIds.map(async (userId) => {
      // Filter opportunities for this user
      const userOpps = allOpportunities.filter(opp => {
        const data = opp.structuredData as Record<string, unknown>;
        return data?.ownerId === userId;
      });

      const metrics = this.calculateOpportunityMetrics(userOpps);
      
      // Parallelize async operations for this user
      const [riskMetrics, quotaAttainment, userInfo] = await Promise.all([
        this.calculateRiskMetrics(userOpps, tenantId, userId),
        this.getUserQuotaAttainment(userId, tenantId),
        this.getUserInfo(userId, tenantId),
      ]);

      return {
        userId,
        name: userInfo.name,
        email: userInfo.email,
        opportunityCount: metrics.total,
        totalValue: metrics.totalValue,
        quotaAttainment,
        revenueAtRisk: metrics.revenueAtRisk,
      };
    });

    return Promise.all(summaryPromises);
  }

  /**
   * Get user quota attainment (helper for parallelization)
   */
  private async getUserQuotaAttainment(
    userId: string,
    tenantId: string
  ): Promise<number | undefined> {
    try {
      const quotas = await this.quotaService.listQuotas(tenantId, {
        targetUserId: userId,
        quotaType: 'individual',
      });
      if (quotas.length > 0) {
        const performance = await this.quotaService.calculatePerformance(
          quotas[0].id,
          tenantId,
          userId
        );
        return performance.performance.attainment;
      }
    } catch (error: unknown) {
      // Quota not found, skip - error already logged by quota service
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'managerDashboard.getQuota',
          userId,
          tenantId,
        }
      );
    }
    return undefined;
  }

  /**
   * Get user information (helper for parallelization)
   */
  private async getUserInfo(
    userId: string,
    tenantId: string
  ): Promise<{ name: string; email: string }> {
    let userName = userId;
    let userEmail = '';
    
    if (this.userManagementService) {
      try {
        const user = await this.userManagementService.getUserById(tenantId, userId);
        if (user) {
          userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || userId;
          userEmail = user.email || '';
        }
      } catch (error: unknown) {
        // User not found or error fetching, use fallback
        this.monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'managerDashboard.getUserInfo',
            userId,
            tenantId,
          }
        );
      }
    }
    
    return { name: userName, email: userEmail };
  }

  /**
   * Get numeric value from unknown type, safely converting to number
   */
  private getNumericValue(value: unknown): number {
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Create empty dashboard
   */
  private createEmptyDashboard(
    managerId: string,
    tenantId: string,
    options: ManagerDashboardOptions
  ): ManagerDashboard {
    const now = new Date();
    const startDate = options.period?.startDate || new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endDate = options.period?.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      managerId,
      tenantId,
      teams: [],
      totalTeamMembers: 0,
      opportunities: {
        total: 0,
        totalValue: 0,
        expectedRevenue: 0,
        revenueAtRisk: 0,
        riskAdjustedValue: 0,
        byStage: [],
      },
      quotas: {
        individualQuotas: [],
        totalTarget: 0,
        totalActual: 0,
        totalForecasted: 0,
        totalRiskAdjusted: 0,
        attainment: 0,
        riskAdjustedAttainment: 0,
      },
      risk: {
        totalRevenueAtRisk: 0,
        highRiskOpportunities: 0,
        mediumRiskOpportunities: 0,
        lowRiskOpportunities: 0,
        riskDistribution: { high: 0, medium: 0, low: 0 },
      },
      closedWonLost: {
        period: { startDate, endDate },
        won: { count: 0, value: 0 },
        lost: { count: 0, value: 0 },
        winRate: 0,
      },
      teamMembers: [],
      calculatedAt: new Date(),
    };
  }
}


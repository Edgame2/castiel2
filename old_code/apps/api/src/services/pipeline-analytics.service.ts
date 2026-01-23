/**
 * Pipeline Analytics Service
 * Calculates pipeline metrics, closed won/lost, and risk organization
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { OpportunityService } from './opportunity.service.js';
import { RevenueAtRiskService } from './revenue-at-risk.service.js';
import { PipelineHealthService } from './pipeline-health.service.js';
import type {
  PipelineMetrics,
  ClosedWonMetrics,
  RiskLevelOrganization,
  OpportunityRecommendation,
} from '../types/opportunity.types.js';
import type { Shard } from '../types/shard.types.js';

export class PipelineAnalyticsService {
  // Risk score thresholds
  private readonly HIGH_RISK_THRESHOLD = 0.7;
  private readonly MEDIUM_RISK_THRESHOLD = 0.4;

  constructor(
    private monitoring: IMonitoringProvider,
    private opportunityService: OpportunityService,
    private revenueAtRiskService: RevenueAtRiskService,
    private pipelineHealthService?: PipelineHealthService
  ) {}

  /**
   * Calculate pipeline metrics for a user
   */
  async calculatePipelineMetrics(
    userId: string,
    tenantId: string,
    options?: {
      includeClosed?: boolean;
      dateRange?: { startDate: Date; endDate: Date };
    }
  ): Promise<PipelineMetrics> {
    const startTime = Date.now();

    try {
      const filters: any = {
        ownerId: userId,
      };

      if (options?.dateRange) {
        filters.closeDateFrom = options.dateRange.startDate;
        filters.closeDateTo = options.dateRange.endDate;
      }

      if (!options?.includeClosed) {
        filters.status = ['open'];
      }

      const result = await this.opportunityService.listOwnedOpportunities(
        userId,
        tenantId,
        filters,
        { limit: 1000 }
      );

      let totalPipelineValue = 0;
      let totalExpectedRevenue = 0;
      let totalRevenueAtRisk = 0;
      let currency = 'USD';

      for (const opp of result.opportunities) {
        const data = opp.structuredData as any;
        const value = data?.value || 0;
        const expectedRevenue = data?.expectedRevenue || value;
        const oppCurrency = data?.currency || 'USD';

        totalPipelineValue += value;
        totalExpectedRevenue += expectedRevenue;
        currency = oppCurrency; // Use first currency found

        // Get revenue at risk
        const riskEvaluation = data?.riskEvaluation;
        if (riskEvaluation?.revenueAtRisk) {
          totalRevenueAtRisk += riskEvaluation.revenueAtRisk;
        }
      }

      const riskAdjustedValue = totalExpectedRevenue - totalRevenueAtRisk;

      const metrics: PipelineMetrics = {
        userId,
        totalPipelineValue,
        totalExpectedRevenue,
        totalRevenueAtRisk,
        riskAdjustedValue,
        opportunityCount: result.opportunities.length,
        currency,
        calculatedAt: new Date(),
      };

      // Calculate health score if service is available
      if (this.pipelineHealthService) {
        try {
          const health = await this.pipelineHealthService.calculateHealth(tenantId, userId);
          // Add health score to metrics (extend the interface)
          (metrics as any).healthScore = {
            overallScore: health.overallScore,
            status: health.status,
            scoreBreakdown: health.scoreBreakdown,
          };
        } catch (error) {
          this.monitoring.trackException(error as Error, {
            operation: 'pipeline-analytics.calculatePipelineMetrics.health',
            tenantId,
            userId,
          });
        }
      }

      this.monitoring.trackEvent('pipeline-analytics.metrics-calculated', {
        tenantId,
        userId,
        opportunityCount: metrics.opportunityCount,
        totalPipelineValue,
        durationMs: Date.now() - startTime,
        hasHealthScore: !!(metrics as any).healthScore,
      });

      return metrics;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'pipeline-analytics.calculatePipelineMetrics',
          tenantId,
          userId,
        }
      );
      throw error;
    }
  }

  /**
   * Calculate closed won/lost metrics
   */
  async calculateClosedWonLost(
    userId: string,
    tenantId: string,
    period: { startDate: Date; endDate: Date }
  ): Promise<ClosedWonMetrics> {
    const startTime = Date.now();

    try {
      // Get closed won opportunities
      const wonResult = await this.opportunityService.listOwnedOpportunities(
        userId,
        tenantId,
        {
          ownerId: userId,
          status: ['won'],
          closeDateFrom: period.startDate,
          closeDateTo: period.endDate,
        },
        { limit: 1000 }
      );

      // Get closed lost opportunities
      const lostResult = await this.opportunityService.listOwnedOpportunities(
        userId,
        tenantId,
        {
          ownerId: userId,
          status: ['lost'],
          closeDateFrom: period.startDate,
          closeDateTo: period.endDate,
        },
        { limit: 1000 }
      );

      // Calculate won metrics
      let wonCount = 0;
      let wonTotalValue = 0;
      let wonTotalRevenue = 0;

      for (const opp of wonResult.opportunities) {
        const data = opp.structuredData as any;
        wonCount++;
        wonTotalValue += data?.value || 0;
        wonTotalRevenue += data?.actualRevenue || data?.value || 0;
      }

      // Calculate lost metrics
      let lostCount = 0;
      let lostTotalValue = 0;
      const lostReasons: Record<string, number> = {};

      for (const opp of lostResult.opportunities) {
        const data = opp.structuredData as any;
        lostCount++;
        lostTotalValue += data?.value || 0;

        const lostReason = data?.lostReason || 'Unknown';
        lostReasons[lostReason] = (lostReasons[lostReason] || 0) + 1;
      }

      // Calculate win rate
      const totalClosed = wonCount + lostCount;
      const winRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0;

      const metrics: ClosedWonMetrics = {
        userId,
        period,
        closedWon: {
          count: wonCount,
          totalValue: wonTotalValue,
          totalRevenue: wonTotalRevenue,
        },
        closedLost: {
          count: lostCount,
          totalValue: lostTotalValue,
          lostReasons,
        },
        winRate,
        calculatedAt: new Date(),
      };

      this.monitoring.trackEvent('pipeline-analytics.closed-won-lost-calculated', {
        tenantId,
        userId,
        wonCount,
        lostCount,
        winRate,
        durationMs: Date.now() - startTime,
      });

      return metrics;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'pipeline-analytics.calculateClosedWonLost',
          tenantId,
          userId,
        }
      );
      throw error;
    }
  }

  /**
   * Organize pipeline by risk level
   */
  async organizeByRiskLevel(
    userId: string,
    tenantId: string
  ): Promise<RiskLevelOrganization> {
    const startTime = Date.now();

    try {
      const result = await this.opportunityService.listOwnedOpportunities(
        userId,
        tenantId,
        {
          ownerId: userId,
          status: ['open'],
        },
        { limit: 1000 }
      );

      const high: Shard[] = [];
      const medium: Shard[] = [];
      const low: Shard[] = [];

      for (const opp of result.opportunities) {
        const data = opp.structuredData as any;
        const riskEvaluation = data?.riskEvaluation;
        const riskScore = riskEvaluation?.riskScore || 0;

        if (riskScore >= this.HIGH_RISK_THRESHOLD) {
          high.push(opp);
        } else if (riskScore >= this.MEDIUM_RISK_THRESHOLD) {
          medium.push(opp);
        } else {
          low.push(opp);
        }
      }

      // Calculate totals for each risk level
      const calculateTotals = (opportunities: Shard[]) => {
        let totalValue = 0;
        let totalRevenueAtRisk = 0;

        for (const opp of opportunities) {
          const data = opp.structuredData as any;
          totalValue += data?.value || 0;

          const riskEvaluation = data?.riskEvaluation;
          if (riskEvaluation?.revenueAtRisk) {
            totalRevenueAtRisk += riskEvaluation.revenueAtRisk;
          }
        }

        return { totalValue, totalRevenueAtRisk };
      };

      const highTotals = calculateTotals(high);
      const mediumTotals = calculateTotals(medium);
      const lowTotals = calculateTotals(low);

      const organization: RiskLevelOrganization = {
        high: {
          opportunities: high,
          count: high.length,
          ...highTotals,
        },
        medium: {
          opportunities: medium,
          count: medium.length,
          ...mediumTotals,
        },
        low: {
          opportunities: low,
          count: low.length,
          ...lowTotals,
        },
      };

      this.monitoring.trackEvent('pipeline-analytics.organized-by-risk', {
        tenantId,
        userId,
        highCount: high.length,
        mediumCount: medium.length,
        lowCount: low.length,
        durationMs: Date.now() - startTime,
      });

      return organization;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'pipeline-analytics.organizeByRiskLevel',
          tenantId,
          userId,
        }
      );
      throw error;
    }
  }

  /**
   * Generate recommendations for an opportunity
   */
  async generateRecommendations(
    opportunityId: string,
    tenantId: string,
    userId: string
  ): Promise<OpportunityRecommendation[]> {
    const startTime = Date.now();

    try {
      const opportunity = await this.opportunityService.getOpportunity(
        opportunityId,
        tenantId,
        true
      );

      const data = opportunity.opportunity.structuredData as any;
      const riskEvaluation = opportunity.riskEvaluation;
      const recommendations: OpportunityRecommendation[] = [];

      // Risk-based recommendations
      if (riskEvaluation) {
        const riskScore = riskEvaluation.riskScore;
        const risks = riskEvaluation.risks || [];

        if (riskScore >= this.HIGH_RISK_THRESHOLD) {
          recommendations.push({
            id: `risk-high-${opportunityId}`,
            type: 'risk',
            title: 'High Risk Opportunity',
            description: `This opportunity has a high risk score (${(riskScore * 100).toFixed(0)}%). Immediate attention required.`,
            priority: 'high',
            impact: riskScore,
            suggestedActions: [
              'Review all risk factors',
              'Schedule stakeholder meeting',
              'Update close date if needed',
              'Consider discount or additional value proposition',
            ],
            relatedRiskIds: risks.map((r: any) => r.id),
            generatedAt: new Date(),
            generatedBy: 'system',
          });
        }

        // Stage stagnation warning
        const stage = data?.stage || '';
        const lastActivity = opportunity.opportunity.lastActivityAt;
        if (lastActivity) {
          const daysSinceActivity = Math.floor(
            (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceActivity > 14) {
            recommendations.push({
              id: `stagnation-${opportunityId}`,
              type: 'action',
              title: 'Stage Stagnation Detected',
              description: `No activity for ${daysSinceActivity} days. Consider moving to next stage or updating status.`,
              priority: 'medium',
              impact: 0.5,
              suggestedActions: [
                'Schedule follow-up call',
                'Send updated proposal',
                'Check with stakeholders',
              ],
              generatedAt: new Date(),
              generatedBy: 'system',
            });
          }
        }
      }

      // Missing information recommendations
      if (!data?.accountId) {
        recommendations.push({
          id: `missing-account-${opportunityId}`,
          type: 'action',
          title: 'Missing Account Information',
          description: 'This opportunity is not linked to an account. Link it to track relationships.',
          priority: 'low',
          suggestedActions: ['Link to account', 'Create new account if needed'],
          generatedAt: new Date(),
          generatedBy: 'system',
        });
      }

      // Low activity recommendations
      if (opportunity.relatedShards.tasks.length === 0 && opportunity.relatedShards.meetings.length === 0) {
        recommendations.push({
          id: `low-activity-${opportunityId}`,
          type: 'action',
          title: 'Low Activity',
          description: 'No tasks or meetings associated with this opportunity. Consider scheduling activities.',
          priority: 'medium',
          suggestedActions: [
            'Create follow-up task',
            'Schedule discovery call',
            'Add stakeholders',
          ],
          generatedAt: new Date(),
          generatedBy: 'system',
        });
      }

      this.monitoring.trackEvent('pipeline-analytics.recommendations-generated', {
        tenantId,
        opportunityId,
        recommendationCount: recommendations.length,
        durationMs: Date.now() - startTime,
      });

      return recommendations;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'pipeline-analytics.generateRecommendations',
          tenantId,
          opportunityId,
        }
      );
      throw error;
    }
  }
}


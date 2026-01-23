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
    high: { count: number; percentage: number; value: number };
    medium: { count: number; percentage: number; value: number };
    low: { count: number; percentage: number; value: number };
  };
  topRisks: Array<{
    opportunityId: string;
    opportunityName: string;
    riskScore: number;
    revenueAtRisk: number;
  }>;
  calculatedAt: Date;
}

export class PipelineSummaryService {
  constructor(
    private monitoring: IMonitoringProvider,
    private pipelineAnalytics: PipelineAnalyticsService,
    private revenueAtRiskService: RevenueAtRiskService
  ) {}

  /**
   * Get comprehensive pipeline summary
   */
  async getSummary(
    userId: string,
    tenantId: string
  ): Promise<PipelineSummary> {
    const startTime = Date.now();

    try {
      // Get metrics and risk organization in parallel
      const [metrics, riskOrganization] = await Promise.all([
        this.pipelineAnalytics.calculatePipelineMetrics(userId, tenantId),
        this.pipelineAnalytics.organizeByRiskLevel(userId, tenantId),
      ]);

      // Calculate risk distribution percentages
      const totalCount = metrics.opportunityCount;
      const riskDistribution = {
        high: {
          count: riskOrganization.high.count,
          percentage: totalCount > 0 ? (riskOrganization.high.count / totalCount) * 100 : 0,
          value: riskOrganization.high.totalValue,
        },
        medium: {
          count: riskOrganization.medium.count,
          percentage: totalCount > 0 ? (riskOrganization.medium.count / totalCount) * 100 : 0,
          value: riskOrganization.medium.totalValue,
        },
        low: {
          count: riskOrganization.low.count,
          percentage: totalCount > 0 ? (riskOrganization.low.count / totalCount) * 100 : 0,
          value: riskOrganization.low.totalValue,
        },
      };

      // Get top risks (highest revenue at risk)
      const topRisks = [
        ...riskOrganization.high.opportunities,
        ...riskOrganization.medium.opportunities,
      ]
        .map((opp) => {
          const data = opp.structuredData as any;
          const riskEvaluation = data?.riskEvaluation;
          return {
            opportunityId: opp.id,
            opportunityName: data?.name || 'Unnamed Opportunity',
            riskScore: riskEvaluation?.riskScore || 0,
            revenueAtRisk: riskEvaluation?.revenueAtRisk || 0,
          };
        })
        .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk)
        .slice(0, 10); // Top 10

      const summary: PipelineSummary = {
        metrics,
        riskOrganization,
        riskDistribution,
        topRisks,
        calculatedAt: new Date(),
      };

      this.monitoring.trackEvent('pipeline-summary.calculated', {
        tenantId,
        userId,
        opportunityCount: metrics.opportunityCount,
        durationMs: Date.now() - startTime,
      });

      return summary;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'pipeline-summary.getSummary',
          tenantId,
          userId,
        }
      );
      throw error;
    }
  }
}


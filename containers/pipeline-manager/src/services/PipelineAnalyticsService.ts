/**
 * Pipeline Analytics Service
 * Handles pipeline analytics and forecasting
 */

import { getContainer } from '@coder/shared/database';
import { BadRequestError } from '@coder/shared/utils/errors';
import { OpportunityService } from './OpportunityService';
import {
  PipelineAnalytics,
  PipelineForecast,
  Opportunity,
  SalesStage,
  OpportunityStatus,
} from '../types/pipeline.types';

export class PipelineAnalyticsService {
  private opportunityService: OpportunityService;
  private containerName = 'pipeline_opportunities';

  constructor(opportunityService: OpportunityService) {
    this.opportunityService = opportunityService;
  }

  /**
   * Get pipeline analytics
   */
  async getAnalytics(
    tenantId: string,
    filters?: {
      ownerId?: string;
      accountId?: string;
      dateRange?: {
        startDate?: Date;
        endDate?: Date;
      };
    }
  ): Promise<PipelineAnalytics> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    // Exclude closed lost opportunities
    query += ' AND c.structuredData.status != @closedLost';
    parameters.push({ name: '@closedLost', value: OpportunityStatus.LOST });

    if (filters?.ownerId) {
      query += ' AND c.structuredData.ownerId = @ownerId';
      parameters.push({ name: '@ownerId', value: filters.ownerId });
    }

    if (filters?.accountId) {
      query += ' AND c.structuredData.accountId = @accountId';
      parameters.push({ name: '@accountId', value: filters.accountId });
    }

    if (filters?.dateRange?.startDate) {
      query += ' AND c.structuredData.closeDate >= @startDate';
      parameters.push({ name: '@startDate', value: filters.dateRange.startDate });
    }

    if (filters?.dateRange?.endDate) {
      query += ' AND c.structuredData.closeDate <= @endDate';
      parameters.push({ name: '@endDate', value: filters.dateRange.endDate });
    }

    try {
      const { resources } = await container.items.query<Opportunity>({ query, parameters }).fetchAll();

      // Calculate analytics
      const totalOpportunities = resources.length;
      const totalAmount = resources.reduce((sum, opp) => sum + (opp.structuredData.amount || 0), 0);
      const totalExpectedRevenue = resources.reduce(
        (sum, opp) => sum + (opp.structuredData.expectedRevenue || 0),
        0
      );

      // Group by stage
      const byStageMap = new Map<SalesStage, { count: number; amount: number; expectedRevenue: number }>();
      for (const opp of resources) {
        const stage = opp.structuredData.stage;
        const existing = byStageMap.get(stage) || { count: 0, amount: 0, expectedRevenue: 0 };
        byStageMap.set(stage, {
          count: existing.count + 1,
          amount: existing.amount + (opp.structuredData.amount || 0),
          expectedRevenue: existing.expectedRevenue + (opp.structuredData.expectedRevenue || 0),
        });
      }

      const byStage = Array.from(byStageMap.entries()).map(([stage, data]) => ({
        stage,
        ...data,
      }));

      // Group by status
      const byStatusMap = new Map<
        OpportunityStatus,
        { count: number; amount: number }
      >();
      for (const opp of resources) {
        const status = opp.structuredData.status || OpportunityStatus.OPEN;
        const existing = byStatusMap.get(status) || { count: 0, amount: 0 };
        byStatusMap.set(status, {
          count: existing.count + 1,
          amount: existing.amount + (opp.structuredData.amount || 0),
        });
      }

      const byStatus = Array.from(byStatusMap.entries()).map(([status, data]) => ({
        status,
        ...data,
      }));

      // Group by owner
      const byOwnerMap = new Map<
        string,
        { ownerName?: string; count: number; amount: number; expectedRevenue: number }
      >();
      for (const opp of resources) {
        const ownerId = opp.structuredData.ownerId;
        const existing = byOwnerMap.get(ownerId) || {
          ownerName: opp.structuredData.ownerName,
          count: 0,
          amount: 0,
          expectedRevenue: 0,
        };
        byOwnerMap.set(ownerId, {
          ownerName: existing.ownerName || opp.structuredData.ownerName,
          count: existing.count + 1,
          amount: existing.amount + (opp.structuredData.amount || 0),
          expectedRevenue: existing.expectedRevenue + (opp.structuredData.expectedRevenue || 0),
        });
      }

      const byOwner = Array.from(byOwnerMap.entries()).map(([ownerId, data]) => ({
        ownerId,
        ...data,
      }));

      // Calculate win rate (won / (won + lost))
      const won = resources.filter((opp) => opp.structuredData.status === OpportunityStatus.WON).length;
      const lost = resources.filter((opp) => opp.structuredData.status === OpportunityStatus.LOST).length;
      const winRate = won + lost > 0 ? (won / (won + lost)) * 100 : 0;

      // Calculate average deal size
      const averageDealSize = totalOpportunities > 0 ? totalAmount / totalOpportunities : 0;

      // Calculate average sales cycle (simplified - using createdDate to closeDate)
      const closedOpportunities = resources.filter(
        (opp) => opp.structuredData.isClosed && opp.structuredData.closeDate
      );
      let averageSalesCycle = 0;
      if (closedOpportunities.length > 0) {
        const totalDays = closedOpportunities.reduce((sum, opp) => {
          const created = opp.createdAt;
          const closed = opp.structuredData.closeDate!;
          const days = Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0);
        averageSalesCycle = totalDays / closedOpportunities.length;
      }

      return {
        totalOpportunities,
        totalAmount,
        totalExpectedRevenue,
        byStage,
        byStatus,
        byOwner,
        winRate,
        averageDealSize,
        averageSalesCycle,
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate analytics: ${error.message}`);
    }
  }

  /**
   * Get pipeline forecast
   */
  async getForecast(
    tenantId: string,
    period: {
      startDate: Date;
      endDate: Date;
      fiscalYear?: number;
      fiscalQuarter?: number;
    }
  ): Promise<PipelineForecast> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    const query =
      'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.structuredData.closeDate >= @startDate AND c.structuredData.closeDate <= @endDate AND c.structuredData.status != @lost';
    const parameters = [
      { name: '@tenantId', value: tenantId },
      { name: '@startDate', value: period.startDate },
      { name: '@endDate', value: period.endDate },
      { name: '@lost', value: OpportunityStatus.LOST },
    ];

    try {
      const { resources } = await container.items.query<Opportunity>({ query, parameters }).fetchAll();

      // Calculate forecast metrics
      const forecastedRevenue = resources.reduce(
        (sum, opp) => sum + (opp.structuredData.expectedRevenue || 0),
        0
      );

      // Committed revenue (high probability opportunities)
      const committedRevenue = resources
        .filter((opp) => (opp.structuredData.probability || 0) >= 75)
        .reduce((sum, opp) => sum + (opp.structuredData.expectedRevenue || 0), 0);

      // Best case revenue (all opportunities at full amount)
      const bestCaseRevenue = resources.reduce(
        (sum, opp) => sum + (opp.structuredData.amount || 0),
        0
      );

      // Pipeline revenue (all expected revenue)
      const pipelineRevenue = forecastedRevenue;

      // Group by stage
      const byStageMap = new Map<SalesStage, { count: number; revenue: number; probability: number }>();
      for (const opp of resources) {
        const stage = opp.structuredData.stage;
        const existing = byStageMap.get(stage) || { count: 0, revenue: 0, probability: 0 };
        byStageMap.set(stage, {
          count: existing.count + 1,
          revenue: existing.revenue + (opp.structuredData.expectedRevenue || 0),
          probability: existing.probability + (opp.structuredData.probability || 0),
        });
      }

      const byStage = Array.from(byStageMap.entries()).map(([stage, data]) => ({
        stage,
        count: data.count,
        revenue: data.revenue,
        probability: data.count > 0 ? data.probability / data.count : 0,
      }));

      // Calculate confidence (based on average probability)
      const totalProbability = resources.reduce(
        (sum, opp) => sum + (opp.structuredData.probability || 0),
        0
      );
      const confidence = resources.length > 0 ? totalProbability / resources.length : 0;

      return {
        period,
        forecastedRevenue,
        committedRevenue,
        bestCaseRevenue,
        pipelineRevenue,
        byStage,
        confidence,
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate forecast: ${error.message}`);
    }
  }
}


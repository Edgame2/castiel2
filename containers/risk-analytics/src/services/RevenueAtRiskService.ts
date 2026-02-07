/**
 * Revenue at Risk Service
 * Calculates revenue at risk for opportunities, portfolios, teams, and tenants
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import {
  RevenueAtRisk,
  PortfolioRevenueAtRisk,
  TeamRevenueAtRisk,
  TenantRevenueAtRisk,
  RiskEvaluationResult,
} from '../types/risk-analytics.types';
import { RiskEvaluationService } from './RiskEvaluationService.js';
import { publishRiskAnalyticsEvent } from '../events/publishers/RiskAnalyticsEventPublisher.js';
import { v4 as uuidv4 } from 'uuid';

// Risk score thresholds
const HIGH_RISK_THRESHOLD = 0.7;
const MEDIUM_RISK_THRESHOLD = 0.4;

export class RevenueAtRiskService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private riskEvaluationService: RiskEvaluationService;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance, riskEvaluationService?: RiskEvaluationService) {
    this.app = app || null;
    this.config = loadConfig();
    
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.riskEvaluationService = riskEvaluationService || new RiskEvaluationService(app);
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app as any, {
      serviceId: 'risk-analytics',
      serviceName: 'risk-analytics',
      tenantId,
    });
  }

  /**
   * Calculate revenue at risk for a single opportunity
   */
  async calculateForOpportunity(
    opportunityId: string,
    tenantId: string,
    userId: string
  ): Promise<RevenueAtRisk> {
    const startTime = Date.now();

    try {
      // Get opportunity from shard manager
      const token = this.getServiceToken(tenantId);
      const opportunity = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${opportunityId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!opportunity) {
        throw new Error(`Opportunity not found: ${opportunityId}`);
      }

      // Get or evaluate risk
      const opportunityData = opportunity.structuredData || {};
      let riskEvaluation: RiskEvaluationResult | undefined = opportunityData.riskEvaluation;

      // If no evaluation or stale, evaluate now
      if (!riskEvaluation) {
        riskEvaluation = await this.riskEvaluationService.evaluateRisk({
          opportunityId,
          tenantId,
          userId,
          trigger: 'manual',
          options: { includeHistorical: true, includeAI: false },
        });
      }

      // Extract values
      const dealValue = opportunityData.value || 0;
      const currency = opportunityData.currency || 'USD';
      const riskScore = riskEvaluation.riskScore;
      const revenueAtRisk = riskEvaluation.revenueAtRisk || 0;
      const riskAdjustedValue = dealValue - revenueAtRisk;

      const result: RevenueAtRisk = {
        opportunityId,
        dealValue,
        currency,
        riskScore,
        revenueAtRisk,
        riskAdjustedValue,
        calculatedAt: new Date(),
      };

      // Store in database
      const container = getContainer('risk_revenue_at_risk');
      await container.items.create(
        { ...result, id: uuidv4(), tenantId, createdAt: new Date() },
        { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]
      );

      // Publish event
      await publishRiskAnalyticsEvent('revenue-at-risk.calculated', tenantId, {
        opportunityId,
        dealValue,
        revenueAtRisk,
        riskScore,
        durationMs: Date.now() - startTime,
      });

      log.info('Revenue at risk calculated', {
        tenantId,
        opportunityId,
        dealValue,
        revenueAtRisk,
        riskScore,
        durationMs: Date.now() - startTime,
      });

      return result;
    } catch (error: unknown) {
      log.error('Failed to calculate revenue at risk for opportunity', error instanceof Error ? error : new Error(String(error)), { tenantId, opportunityId });
      throw error;
    }
  }

  /**
   * Calculate revenue at risk for a user's portfolio
   */
  async calculateForPortfolio(
    userId: string,
    tenantId: string
  ): Promise<PortfolioRevenueAtRisk> {
    const startTime = Date.now();

    try {
      // Get opportunities owned by user from shard manager
      const token = this.getServiceToken(tenantId);
      const opportunities = await this.shardManagerClient.get<any>(
        `/api/v1/shards?shardType=opportunity&ownerId=${userId}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      // Filter active opportunities
      const activeOpportunities = (opportunities.shards || []).filter((opp: any) => {
        const data = opp.structuredData || {};
        return data.stage !== 'closed_won' && data.stage !== 'closed_lost';
      });

      // Calculate revenue at risk for each opportunity
      const opportunityRisks: RevenueAtRisk[] = [];
      let totalDealValue = 0;
      let totalRevenueAtRisk = 0;
      let highRiskCount = 0;
      let mediumRiskCount = 0;
      let lowRiskCount = 0;

      for (const opportunity of activeOpportunities) {
        try {
          const risk = await this.calculateForOpportunity(opportunity.id, tenantId, userId);
          opportunityRisks.push(risk);
          totalDealValue += risk.dealValue;
          totalRevenueAtRisk += risk.revenueAtRisk;

          // Categorize by risk score
          if (risk.riskScore >= HIGH_RISK_THRESHOLD) {
            highRiskCount++;
          } else if (risk.riskScore >= MEDIUM_RISK_THRESHOLD) {
            mediumRiskCount++;
          } else {
            lowRiskCount++;
          }
        } catch (error: unknown) {
          log.warn('Failed to calculate revenue at risk for opportunity', { error: error instanceof Error ? error.message : String(error), tenantId, userId, opportunityId: opportunity.id });
        }
      }

      const riskAdjustedValue = totalDealValue - totalRevenueAtRisk;

      const result: PortfolioRevenueAtRisk = {
        userId,
        totalDealValue,
        totalRevenueAtRisk,
        riskAdjustedValue,
        opportunityCount: opportunityRisks.length,
        highRiskCount,
        mediumRiskCount,
        lowRiskCount,
        opportunities: opportunityRisks,
      };

      log.info('Portfolio revenue at risk calculated', {
        tenantId,
        userId,
        opportunityCount: opportunityRisks.length,
        totalDealValue,
        totalRevenueAtRisk,
        durationMs: Date.now() - startTime,
      });

      return result;
    } catch (error: unknown) {
      log.error('Failed to calculate portfolio revenue at risk', error instanceof Error ? error : new Error(String(error)), { tenantId, userId });
      throw error;
    }
  }

  /**
   * Calculate revenue at risk for a team
   */
  async calculateForTeam(
    teamId: string,
    tenantId: string
  ): Promise<TeamRevenueAtRisk> {
    const startTime = Date.now();

    try {
      // Get team members from user-management service
      const token = this.getServiceToken(tenantId);
      const team = await this.shardManagerClient.get<any>(
        `/api/v1/teams/${teamId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!team || !team.members) {
        throw new Error(`Team not found: ${teamId}`);
      }

      // Calculate portfolio for each team member
      const members: PortfolioRevenueAtRisk[] = [];
      for (const memberId of team.members) {
        try {
          const memberPortfolio = await this.calculateForPortfolio(memberId, tenantId);
          members.push(memberPortfolio);
        } catch (error: unknown) {
          log.warn('Failed to calculate portfolio for team member', { error: error instanceof Error ? error.message : String(error), tenantId, teamId, userId: memberId });
        }
      }

      // Aggregate team totals
      const totalDealValue = members.reduce((sum, m) => sum + m.totalDealValue, 0);
      const totalRevenueAtRisk = members.reduce((sum, m) => sum + m.totalRevenueAtRisk, 0);
      const riskAdjustedValue = totalDealValue - totalRevenueAtRisk;
      const opportunityCount = members.reduce((sum, m) => sum + m.opportunityCount, 0);

      const result: TeamRevenueAtRisk = {
        teamId,
        totalDealValue,
        totalRevenueAtRisk,
        riskAdjustedValue,
        opportunityCount,
        memberCount: members.length,
        members,
      };

      log.info('Team revenue at risk calculated', {
        tenantId,
        teamId,
        memberCount: members.length,
        opportunityCount,
        totalDealValue,
        totalRevenueAtRisk,
        durationMs: Date.now() - startTime,
      });

      return result;
    } catch (error: unknown) {
      log.error('Failed to calculate team revenue at risk', error instanceof Error ? error : new Error(String(error)), { tenantId, teamId });
      throw error;
    }
  }

  /**
   * Calculate revenue at risk for entire tenant
   */
  async calculateForTenant(
    tenantId: string
  ): Promise<TenantRevenueAtRisk> {
    const startTime = Date.now();

    try {
      // Get all opportunities in tenant
      const token = this.getServiceToken(tenantId);
      const opportunities = await this.shardManagerClient.get<any>(
        `/api/v1/shards?shardType=opportunity&limit=10000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      // Filter active opportunities
      const activeOpportunities = (opportunities.shards || []).filter((opp: any) => {
        const data = opp.structuredData || {};
        return data.stage !== 'closed_won' && data.stage !== 'closed_lost';
      });

      // Group by owner
      const ownerMap = new Map<string, any[]>();
      for (const opportunity of activeOpportunities) {
        const data = opportunity.structuredData || {};
        const ownerId = data.ownerId;
        if (ownerId) {
          if (!ownerMap.has(ownerId)) {
            ownerMap.set(ownerId, []);
          }
          ownerMap.get(ownerId)!.push(opportunity);
        }
      }

      // Calculate portfolios
      const portfolios: PortfolioRevenueAtRisk[] = [];
      for (const [userId] of ownerMap.entries()) {
        try {
          const portfolio = await this.calculateForPortfolio(userId, tenantId);
          portfolios.push(portfolio);
        } catch (error: unknown) {
          log.warn('Failed to calculate portfolio for tenant owner', { error: error instanceof Error ? error.message : String(error), tenantId, userId });
        }
      }

      // Aggregate tenant totals
      const totalDealValue = portfolios.reduce((sum, p) => sum + p.totalDealValue, 0);
      const totalRevenueAtRisk = portfolios.reduce((sum, p) => sum + p.totalRevenueAtRisk, 0);
      const riskAdjustedValue = totalDealValue - totalRevenueAtRisk;
      const opportunityCount = portfolios.reduce((sum, p) => sum + p.opportunityCount, 0);

      // TODO: Group by team when team structure is available
      const teams: TeamRevenueAtRisk[] = [];

      const result: TenantRevenueAtRisk = {
        tenantId,
        totalDealValue,
        totalRevenueAtRisk,
        riskAdjustedValue,
        opportunityCount,
        teamCount: teams.length,
        teams,
      };

      log.info('Tenant revenue at risk calculated', {
        tenantId,
        opportunityCount,
        totalDealValue,
        totalRevenueAtRisk,
        durationMs: Date.now() - startTime,
      });

      return result;
    } catch (error: unknown) {
      log.error('Failed to calculate tenant revenue at risk', error instanceof Error ? error : new Error(String(error)), { tenantId });
      throw error;
    }
  }
}

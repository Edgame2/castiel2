/**
 * Pipeline Health Service
 * Comprehensive health scoring for sales pipeline
 * 
 * Features:
 * - Overall pipeline health score
 * - Stage health analysis
 * - Velocity health
 * - Coverage health
 * - Quality health
 * - Risk health
 * - Improvement recommendations
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { PipelineAnalyticsService } from './pipeline-analytics.service.js';
import { RiskEvaluationService } from './risk-evaluation.service.js';
import { OpportunityService } from './opportunity.service.js';

export type HealthStatus = 'healthy' | 'at_risk' | 'critical' | 'unknown';

export interface PipelineHealthScore {
  healthId: string;
  tenantId: string; // Partition key
  userId?: string;
  teamId?: string;
  overallScore: number; // 0-100
  status: HealthStatus;
  scoreBreakdown: {
    stage: number; // 0-100: Stage distribution health
    velocity: number; // 0-100: Sales velocity health
    coverage: number; // 0-100: Pipeline coverage health
    quality: number; // 0-100: Opportunity quality health
    risk: number; // 0-100: Risk health (inverse of risk)
  };
  stageHealth: Array<{
    stage: string;
    score: number; // 0-100
    opportunities: number;
    value: number;
    averageAge: number; // days
    issues: string[];
  }>;
  velocityHealth: {
    averageDaysInStage: Record<string, number>;
    bottlenecks: Array<{
      stage: string;
      averageDays: number;
      threshold: number;
      severity: 'low' | 'medium' | 'high';
    }>;
    score: number; // 0-100
  };
  coverageHealth: {
    coverageRatio: number; // Pipeline value / quota
    monthsCoverage: number; // Months of pipeline coverage
    score: number; // 0-100
    recommendations: string[];
  };
  qualityHealth: {
    averageQuality: number; // 0-1
    highQualityPercentage: number; // 0-1
    lowQualityPercentage: number; // 0-1
    score: number; // 0-100
  };
  riskHealth: {
    averageRisk: number; // 0-1
    highRiskPercentage: number; // 0-1
    totalRevenueAtRisk: number;
    score: number; // 0-100
  };
  recommendations: Array<{
    type: 'stage' | 'velocity' | 'coverage' | 'quality' | 'risk';
    priority: 'low' | 'medium' | 'high';
    description: string;
    expectedImpact: string;
  }>;
  calculatedAt: Date;
}

/**
 * Pipeline Health Service
 */
export class PipelineHealthService {
  private client: CosmosClient;
  private database: Database;
  private healthContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private pipelineAnalyticsService?: PipelineAnalyticsService;
  private riskEvaluationService?: RiskEvaluationService;
  private opportunityService?: OpportunityService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    pipelineAnalyticsService?: PipelineAnalyticsService,
    riskEvaluationService?: RiskEvaluationService,
    opportunityService?: OpportunityService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.pipelineAnalyticsService = pipelineAnalyticsService;
    this.riskEvaluationService = riskEvaluationService;
    this.opportunityService = opportunityService;

    // Initialize Cosmos client
    const connectionPolicy: ConnectionPolicy = {
      connectionMode: 'Direct' as any, // Best performance (ConnectionMode enum not available in this version)
      requestTimeout: 30000,
      enableEndpointDiscovery: true,
      retryOptions: {
        maxRetryAttemptCount: 9,
        fixedRetryIntervalInMilliseconds: 0,
        maxWaitTimeInSeconds: 30,
      } as RetryOptions,
    };

    this.client = cosmosClient || new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
      connectionPolicy,
    });

    this.database = this.client.database(config.cosmosDb.databaseId);
    this.healthContainer = this.database.container(config.cosmosDb.containers.pipelineHealth);
  }

  /**
   * Calculate comprehensive pipeline health
   */
  async calculateHealth(
    tenantId: string,
    userId?: string,
    teamId?: string
  ): Promise<PipelineHealthScore> {
    const healthId = uuidv4();

    // Get pipeline data
    const pipelineData = await this.getPipelineData(tenantId, userId);

    // Calculate stage health
    const stageHealth = this.calculateStageHealth(pipelineData);

    // Calculate velocity health
    const velocityHealth = this.calculateVelocityHealth(pipelineData);

    // Calculate coverage health
    const coverageHealth = await this.calculateCoverageHealth(tenantId, userId, pipelineData);

    // Calculate quality health
    const qualityHealth = this.calculateQualityHealth(pipelineData);

    // Calculate risk health
    const riskHealth = this.calculateRiskHealth(pipelineData);

    // Calculate overall score
    const overallScore = Math.round(
      stageHealth.score * 0.25 +
      velocityHealth.score * 0.20 +
      coverageHealth.score * 0.20 +
      qualityHealth.score * 0.20 +
      riskHealth.score * 0.15
    );

    const status: HealthStatus = 
      overallScore >= 80 ? 'healthy' :
      overallScore >= 60 ? 'at_risk' :
      overallScore >= 0 ? 'critical' :
      'unknown';

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      stageHealth,
      velocityHealth,
      coverageHealth,
      qualityHealth,
      riskHealth
    );

    const health: PipelineHealthScore = {
      healthId,
      tenantId,
      userId,
      teamId,
      overallScore,
      status,
      scoreBreakdown: {
        stage: stageHealth.score,
        velocity: velocityHealth.score,
        coverage: coverageHealth.score,
        quality: qualityHealth.score,
        risk: riskHealth.score,
      },
      stageHealth: stageHealth.stages,
      velocityHealth,
      coverageHealth,
      qualityHealth,
      riskHealth,
      recommendations,
      calculatedAt: new Date(),
    };

    await this.healthContainer.items.create(health);

    this.monitoring?.trackEvent('pipeline_health.calculated', {
      tenantId,
      userId,
      teamId,
      overallScore,
      status,
    });

    return health;
  }

  // ============================================
  // Health Calculation Methods
  // ============================================

  /**
   * Get pipeline data
   */
  private async getPipelineData(
    tenantId: string,
    userId?: string
  ): Promise<Array<{ stage: string; value: number; age: number; quality: number; risk: number }>> {
    if (!this.opportunityService) {
      return [];
    }

    try {
      const result = await this.opportunityService.listOwnedOpportunities(
        userId || 'system',
        tenantId,
        { ownerId: userId, status: ['open'] },
        { limit: 1000 }
      );

      return result.opportunities.map(opp => {
        const data = opp.structuredData as any;
        const createdDate = data?.createdDate ? new Date(data.createdDate) : new Date();
        const age = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          stage: data?.stage || 'unknown',
          value: data?.value || 0,
          age,
          quality: data?.qualityScore || 0.5,
          risk: data?.riskEvaluation?.overallRisk || 0.5,
        };
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'getPipelineData',
        tenantId,
        userId,
      });
      return [];
    }
  }

  /**
   * Calculate stage health
   */
  private calculateStageHealth(
    pipelineData: Array<{ stage: string; value: number; age: number }>
  ): { score: number; stages: PipelineHealthScore['stageHealth'] } {
    const stageMap = new Map<string, { opportunities: number; value: number; ages: number[] }>();

    pipelineData.forEach(opp => {
      const existing = stageMap.get(opp.stage) || { opportunities: 0, value: 0, ages: [] };
      existing.opportunities += 1;
      existing.value += opp.value;
      existing.ages.push(opp.age);
      stageMap.set(opp.stage, existing);
    });

    const stages: PipelineHealthScore['stageHealth'] = [];
    let totalScore = 0;

    stageMap.forEach((data, stage) => {
      const averageAge = data.ages.length > 0
        ? data.ages.reduce((sum, age) => sum + age, 0) / data.ages.length
        : 0;

      // Score based on distribution and age
      // Ideal: balanced distribution, reasonable age
      const distributionScore = data.opportunities > 0 ? Math.min(1.0, 10 / data.opportunities) : 0;
      const ageScore = averageAge < 60 ? 1.0 : averageAge < 90 ? 0.7 : averageAge < 120 ? 0.4 : 0.1;
      const stageScore = Math.round((distributionScore * 0.5 + ageScore * 0.5) * 100);

      const issues: string[] = [];
      if (averageAge > 90) {
        issues.push(`Average age of ${averageAge.toFixed(0)} days is high`);
      }
      if (data.opportunities === 0) {
        issues.push('No opportunities in this stage');
      }

      stages.push({
        stage,
        score: stageScore,
        opportunities: data.opportunities,
        value: data.value,
        averageAge,
        issues,
      });

      totalScore += stageScore;
    });

    const avgScore = stages.length > 0 ? totalScore / stages.length : 50;

    return {
      score: Math.round(avgScore),
      stages,
    };
  }

  /**
   * Calculate velocity health
   */
  private calculateVelocityHealth(
    pipelineData: Array<{ stage: string; age: number }>
  ): PipelineHealthScore['velocityHealth'] {
    const stageDays = new Map<string, number[]>();

    pipelineData.forEach(opp => {
      const existing = stageDays.get(opp.stage) || [];
      existing.push(opp.age);
      stageDays.set(opp.stage, existing);
    });

    const averageDaysInStage: Record<string, number> = {};
    const bottlenecks: PipelineHealthScore['velocityHealth']['bottlenecks'] = [];

    // Expected days per stage (thresholds)
    const stageThresholds: Record<string, number> = {
      'prospecting': 30,
      'qualification': 20,
      'proposal': 30,
      'negotiation': 20,
      'closed_won': 0,
      'closed_lost': 0,
    };

    stageDays.forEach((ages, stage) => {
      const avgDays = ages.length > 0
        ? ages.reduce((sum, age) => sum + age, 0) / ages.length
        : 0;
      averageDaysInStage[stage] = avgDays;

      const threshold = stageThresholds[stage] || 30;
      if (avgDays > threshold) {
        const severity: 'low' | 'medium' | 'high' = 
          avgDays > threshold * 2 ? 'high' :
          avgDays > threshold * 1.5 ? 'medium' :
          'low';

        bottlenecks.push({
          stage,
          averageDays: avgDays,
          threshold,
          severity,
        });
      }
    });

    // Calculate velocity score (lower bottlenecks = higher score)
    const bottleneckPenalty = bottlenecks.reduce((penalty, b) => {
      const multiplier = b.severity === 'high' ? 0.3 : b.severity === 'medium' ? 0.2 : 0.1;
      return penalty + multiplier;
    }, 0);

    const velocityScore = Math.max(0, Math.min(100, Math.round((1 - bottleneckPenalty) * 100)));

    return {
      averageDaysInStage,
      bottlenecks,
      score: velocityScore,
    };
  }

  /**
   * Calculate coverage health
   */
  private async calculateCoverageHealth(
    tenantId: string,
    userId: string | undefined,
    pipelineData: Array<{ value: number }>
  ): Promise<PipelineHealthScore['coverageHealth']> {
    const totalPipelineValue = pipelineData.reduce((sum, opp) => sum + opp.value, 0);

    // Get quota (would query from QuotaService)
    const quota = 1000000; // Placeholder - would get from quota service
    const coverageRatio = quota > 0 ? totalPipelineValue / quota : 0;

    // Calculate months of coverage (simplified)
    const monthlyQuota = quota / 12;
    const monthsCoverage = monthlyQuota > 0 ? totalPipelineValue / monthlyQuota : 0;

    // Score based on coverage ratio
    // Ideal: 3-5x coverage
    let score = 100;
    const recommendations: string[] = [];

    if (coverageRatio < 2) {
      score = 40;
      recommendations.push('Pipeline coverage is below 2x quota - focus on new opportunity generation');
    } else if (coverageRatio < 3) {
      score = 60;
      recommendations.push('Pipeline coverage is below 3x quota - consider increasing pipeline');
    } else if (coverageRatio > 6) {
      score = 80;
      recommendations.push('Pipeline coverage is very high - focus on quality over quantity');
    } else {
      score = 100;
    }

    return {
      coverageRatio,
      monthsCoverage,
      score,
      recommendations,
    };
  }

  /**
   * Calculate quality health
   */
  private calculateQualityHealth(
    pipelineData: Array<{ quality: number }>
  ): PipelineHealthScore['qualityHealth'] {
    if (pipelineData.length === 0) {
      return {
        averageQuality: 0.5,
        highQualityPercentage: 0,
        lowQualityPercentage: 0,
        score: 50,
      };
    }

    const qualities = pipelineData.map(opp => opp.quality);
    const averageQuality = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
    const highQualityCount = qualities.filter(q => q >= 0.7).length;
    const lowQualityCount = qualities.filter(q => q < 0.4).length;
    const highQualityPercentage = highQualityCount / qualities.length;
    const lowQualityPercentage = lowQualityCount / qualities.length;

    // Score based on average quality and distribution
    const avgScore = averageQuality * 100;
    const distributionPenalty = lowQualityPercentage * 30;
    const score = Math.max(0, Math.min(100, Math.round(avgScore - distributionPenalty)));

    return {
      averageQuality,
      highQualityPercentage,
      lowQualityPercentage,
      score,
    };
  }

  /**
   * Calculate risk health
   */
  private calculateRiskHealth(
    pipelineData: Array<{ risk: number; value: number }>
  ): PipelineHealthScore['riskHealth'] {
    if (pipelineData.length === 0) {
      return {
        averageRisk: 0.5,
        highRiskPercentage: 0,
        totalRevenueAtRisk: 0,
        score: 50,
      };
    }

    const risks = pipelineData.map(opp => opp.risk);
    const averageRisk = risks.reduce((sum, r) => sum + r, 0) / risks.length;
    const highRiskCount = risks.filter(r => r >= 0.7).length;
    const highRiskPercentage = highRiskCount / risks.length;

    // Calculate total revenue at risk
    const totalRevenueAtRisk = pipelineData.reduce((sum, opp) => {
      return sum + (opp.risk * opp.value);
    }, 0);

    // Score is inverse of risk (lower risk = higher score)
    const riskScore = (1 - averageRisk) * 100;
    const highRiskPenalty = highRiskPercentage * 20;
    const score = Math.max(0, Math.min(100, Math.round(riskScore - highRiskPenalty)));

    return {
      averageRisk,
      highRiskPercentage,
      totalRevenueAtRisk,
      score,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    stageHealth: { score: number; stages: PipelineHealthScore['stageHealth'] },
    velocityHealth: PipelineHealthScore['velocityHealth'],
    coverageHealth: PipelineHealthScore['coverageHealth'],
    qualityHealth: PipelineHealthScore['qualityHealth'],
    riskHealth: PipelineHealthScore['riskHealth']
  ): PipelineHealthScore['recommendations'] {
    const recommendations: PipelineHealthScore['recommendations'] = [];

    // Stage recommendations
    if (stageHealth.score < 70) {
      const problematicStages = stageHealth.stages.filter(s => s.score < 60);
      if (problematicStages.length > 0) {
        recommendations.push({
          type: 'stage',
          priority: 'medium',
          description: `Stages with health issues: ${problematicStages.map(s => s.stage).join(', ')}`,
          expectedImpact: 'Could improve pipeline health by 10-15%',
        });
      }
    }

    // Velocity recommendations
    if (velocityHealth.bottlenecks.length > 0) {
      const highSeverity = velocityHealth.bottlenecks.filter(b => b.severity === 'high');
      if (highSeverity.length > 0) {
        recommendations.push({
          type: 'velocity',
          priority: 'high',
          description: `Bottlenecks detected in: ${highSeverity.map(b => b.stage).join(', ')}`,
          expectedImpact: 'Could accelerate pipeline by 15-20%',
        });
      }
    }

    // Coverage recommendations
    if (coverageHealth.recommendations.length > 0) {
      recommendations.push({
        type: 'coverage',
        priority: coverageHealth.score < 60 ? 'high' : 'medium',
        description: coverageHealth.recommendations[0],
        expectedImpact: 'Could improve forecast reliability by 10-15%',
      });
    }

    // Quality recommendations
    if (qualityHealth.score < 70) {
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        description: `Average quality score is ${(qualityHealth.averageQuality * 100).toFixed(0)}% - focus on better qualification`,
        expectedImpact: 'Could improve win rate by 10-15%',
      });
    }

    // Risk recommendations
    if (riskHealth.score < 70) {
      recommendations.push({
        type: 'risk',
        priority: 'high',
        description: `High risk detected: ${(riskHealth.highRiskPercentage * 100).toFixed(0)}% of pipeline is high risk`,
        expectedImpact: 'Could reduce revenue at risk by 20-25%',
      });
    }

    return recommendations;
  }
}

/**
 * Forecast Decomposition Service
 * Breaks down forecasts into components for better understanding
 * 
 * Features:
 * - Time decomposition (trend, seasonality, irregular)
 * - Source decomposition (pipeline, new business, expansions, renewals)
 * - Confidence decomposition (commit, best case, upside, risk)
 * - Driver decomposition (deal quality, velocity, conversion, new business)
 * - Forecast improvement recommendations
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { RevenueForecastService, RevenueForecast } from './revenue-forecast.service.js';
import { QuotaService } from './quota.service.js';

export interface ForecastDecomposition {
  decompositionId: string;
  forecastId: string;
  tenantId: string; // Partition key
  timeDecomposition: {
    trend: number; // Base trend component
    seasonality: number; // Seasonal adjustment
    irregular: number; // Irregular/random component
    trendDirection: 'increasing' | 'decreasing' | 'stable';
    seasonalityPattern?: string; // e.g., "Q4_peak"
  };
  sourceDecomposition: {
    pipeline: number; // Existing pipeline
    newBusiness: number; // New opportunities
    expansions: number; // Expansion revenue
    renewals: number; // Renewal revenue
    percentages: {
      pipeline: number; // 0-1
      newBusiness: number;
      expansions: number;
      renewals: number;
    };
  };
  confidenceDecomposition: {
    commit: number; // High confidence (80%+)
    bestCase: number; // Optimistic scenario
    upside: number; // Additional upside potential
    risk: number; // At-risk amount
    confidenceDistribution: {
      high: number; // 0-1: % of forecast
      medium: number;
      low: number;
    };
  };
  driverDecomposition: {
    dealQuality: number; // Contribution from deal quality
    velocity: number; // Contribution from sales velocity
    conversion: number; // Contribution from conversion rates
    newBusiness: number; // Contribution from new business generation
    driverScores: {
      dealQuality: number; // 0-1
      velocity: number;
      conversion: number;
      newBusiness: number;
    };
  };
  recommendations: Array<{
    type: 'improve_quality' | 'increase_velocity' | 'boost_conversion' | 'generate_new_business';
    priority: 'low' | 'medium' | 'high';
    description: string;
    expectedImpact: string;
  }>;
  createdAt: Date;
}

/**
 * Forecast Decomposition Service
 */
export class ForecastDecompositionService {
  private client: CosmosClient;
  private database: Database;
  private decompositionContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private revenueForecastService?: RevenueForecastService;
  private quotaService?: QuotaService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    revenueForecastService?: RevenueForecastService,
    quotaService?: QuotaService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.revenueForecastService = revenueForecastService;
    this.quotaService = quotaService;

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
    this.decompositionContainer = this.database.container(config.cosmosDb.containers.forecastDecompositions);
  }

  /**
   * Decompose a forecast
   */
  async decomposeForecast(
    tenantId: string,
    forecast: RevenueForecast
  ): Promise<ForecastDecomposition> {
    const decompositionId = uuidv4();

    // Time decomposition
    const timeDecomposition = await this.decomposeTime(forecast);

    // Source decomposition
    const sourceDecomposition = await this.decomposeSource(tenantId, forecast);

    // Confidence decomposition
    const confidenceDecomposition = await this.decomposeConfidence(tenantId, forecast);

    // Driver decomposition
    const driverDecomposition = await this.decomposeDrivers(tenantId, forecast);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      timeDecomposition,
      sourceDecomposition,
      confidenceDecomposition,
      driverDecomposition
    );

    const decomposition: ForecastDecomposition = {
      decompositionId,
      forecastId: `forecast_${Date.now()}`, // Would use actual forecast ID
      tenantId,
      timeDecomposition,
      sourceDecomposition,
      confidenceDecomposition,
      driverDecomposition,
      recommendations,
      createdAt: new Date(),
    };

    await this.decompositionContainer.items.create(decomposition);

    this.monitoring?.trackEvent('forecast_decomposition.decomposed', {
      tenantId,
      decompositionId,
      forecastId: decomposition.forecastId,
    });

    return decomposition;
  }

  // ============================================
  // Decomposition Methods
  // ============================================

  /**
   * Decompose time components
   */
  private async decomposeTime(
    forecast: RevenueForecast
  ): Promise<ForecastDecomposition['timeDecomposition']> {
    // Calculate trend (simplified - would use time series analysis)
    const periods = forecast.byPeriod;
    if (periods.length < 2) {
      return {
        trend: forecast.scenarios.find(s => s.name === 'base')?.revenue || 0,
        seasonality: 0,
        irregular: 0,
        trendDirection: 'stable',
      };
    }

    // Calculate trend (linear regression)
    const revenues = periods.map(p => p.base);
    const trend = this.calculateTrend(revenues);
    
    // Detect seasonality (simplified)
    const seasonality = this.detectSeasonality(periods);
    
    // Calculate irregular component
    const baseRevenue = forecast.scenarios.find(s => s.name === 'base')?.revenue || 0;
    const irregular = baseRevenue - trend - seasonality;

    // Determine trend direction
    const firstHalf = revenues.slice(0, Math.floor(revenues.length / 2));
    const secondHalf = revenues.slice(Math.floor(revenues.length / 2));
    const firstAvg = firstHalf.reduce((sum, r) => sum + r, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + r, 0) / secondHalf.length;
    
    const trendDirection: 'increasing' | 'decreasing' | 'stable' = 
      secondAvg > firstAvg * 1.1 ? 'increasing' :
      secondAvg < firstAvg * 0.9 ? 'decreasing' :
      'stable';

    return {
      trend,
      seasonality,
      irregular,
      trendDirection,
      seasonalityPattern: seasonality > 0 ? 'detected' : undefined,
    };
  }

  /**
   * Decompose source components
   */
  private async decomposeSource(
    tenantId: string,
    forecast: RevenueForecast
  ): Promise<ForecastDecomposition['sourceDecomposition']> {
    // Placeholder - would analyze opportunities by source
    // For now, estimate based on typical distribution
    const baseRevenue = forecast.scenarios.find(s => s.name === 'base')?.revenue || 0;
    
    const pipeline = baseRevenue * 0.6; // 60% from pipeline
    const newBusiness = baseRevenue * 0.25; // 25% from new business
    const expansions = baseRevenue * 0.10; // 10% from expansions
    const renewals = baseRevenue * 0.05; // 5% from renewals

    return {
      pipeline,
      newBusiness,
      expansions,
      renewals,
      percentages: {
        pipeline: 0.6,
        newBusiness: 0.25,
        expansions: 0.10,
        renewals: 0.05,
      },
    };
  }

  /**
   * Decompose confidence components
   */
  private async decomposeConfidence(
    tenantId: string,
    forecast: RevenueForecast
  ): Promise<ForecastDecomposition['confidenceDecomposition']> {
    const base = forecast.scenarios.find(s => s.name === 'base')?.revenue || 0;
    const best = forecast.scenarios.find(s => s.name === 'best')?.revenue || base;
    const worst = forecast.scenarios.find(s => s.name === 'worst-case')?.revenue || base;
    const riskAdjusted = forecast.scenarios.find(s => s.name === 'risk-adjusted')?.revenue || base;

    const commit = riskAdjusted * 0.8; // 80% of risk-adjusted is commit
    const bestCase = best;
    const upside = best - base;
    const risk = base - worst;

    const total = base;
    const highConfidence = commit / total;
    const mediumConfidence = (base - commit) / total;
    const lowConfidence = risk / total;

    return {
      commit,
      bestCase,
      upside,
      risk,
      confidenceDistribution: {
        high: highConfidence,
        medium: mediumConfidence,
        low: lowConfidence,
      },
    };
  }

  /**
   * Decompose driver components
   */
  private async decomposeDrivers(
    tenantId: string,
    forecast: RevenueForecast
  ): Promise<ForecastDecomposition['driverDecomposition']> {
    const baseRevenue = forecast.scenarios.find(s => s.name === 'base')?.revenue || 0;
    
    // Estimate driver contributions (would analyze actual opportunity data)
    const dealQuality = baseRevenue * 0.4; // 40% from deal quality
    const velocity = baseRevenue * 0.3; // 30% from velocity
    const conversion = baseRevenue * 0.2; // 20% from conversion
    const newBusiness = baseRevenue * 0.1; // 10% from new business gen

    // Calculate driver scores (would be based on actual metrics)
    const driverScores = {
      dealQuality: 0.75, // Placeholder
      velocity: 0.70,
      conversion: 0.65,
      newBusiness: 0.60,
    };

    return {
      dealQuality,
      velocity,
      conversion,
      newBusiness,
      driverScores,
    };
  }

  /**
   * Calculate trend
   */
  private calculateTrend(values: number[]): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];

    // Simple linear trend (average)
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Detect seasonality
   */
  private detectSeasonality(
    periods: RevenueForecast['byPeriod']
  ): number {
    // Simplified - would use proper time series decomposition
    // Check for Q4 peak pattern
    const q4Periods = periods.filter(p => p.period.includes('Q4'));
    if (q4Periods.length > 0) {
      const q4Avg = q4Periods.reduce((sum, p) => sum + p.base, 0) / q4Periods.length;
      const otherAvg = periods
        .filter(p => !p.period.includes('Q4'))
        .reduce((sum, p) => sum + p.base, 0) / 
        Math.max(1, periods.length - q4Periods.length);
      
      if (q4Avg > otherAvg * 1.2) {
        return (q4Avg - otherAvg) * 0.5; // Seasonal component
      }
    }

    return 0;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    timeDecomposition: ForecastDecomposition['timeDecomposition'],
    sourceDecomposition: ForecastDecomposition['sourceDecomposition'],
    confidenceDecomposition: ForecastDecomposition['confidenceDecomposition'],
    driverDecomposition: ForecastDecomposition['driverDecomposition']
  ): ForecastDecomposition['recommendations'] {
    const recommendations: ForecastDecomposition['recommendations'] = [];

    // Trend recommendations
    if (timeDecomposition.trendDirection === 'decreasing') {
      recommendations.push({
        type: 'increase_velocity',
        priority: 'high',
        description: 'Forecast trend is decreasing - focus on accelerating deals',
        expectedImpact: 'Could improve forecast by 10-15%',
      });
    }

    // Source recommendations
    if (sourceDecomposition.percentages.newBusiness < 0.2) {
      recommendations.push({
        type: 'generate_new_business',
        priority: 'medium',
        description: 'Low new business contribution - focus on new opportunity generation',
        expectedImpact: 'Could increase forecast by 5-10%',
      });
    }

    // Confidence recommendations
    if (confidenceDecomposition.confidenceDistribution.low > 0.3) {
      recommendations.push({
        type: 'improve_quality',
        priority: 'high',
        description: 'High percentage of low-confidence forecast - improve deal qualification',
        expectedImpact: 'Could reduce forecast risk by 15-20%',
      });
    }

    // Driver recommendations
    if (driverDecomposition.driverScores.dealQuality < 0.7) {
      recommendations.push({
        type: 'improve_quality',
        priority: 'medium',
        description: 'Deal quality score is below optimal - focus on better qualification',
        expectedImpact: 'Could improve forecast accuracy by 10-15%',
      });
    }

    if (driverDecomposition.driverScores.velocity < 0.7) {
      recommendations.push({
        type: 'increase_velocity',
        priority: 'medium',
        description: 'Sales velocity is below optimal - identify and remove bottlenecks',
        expectedImpact: 'Could accelerate forecast by 8-12%',
      });
    }

    return recommendations;
  }
}

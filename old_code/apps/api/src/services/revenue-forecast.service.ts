/**
 * Revenue Forecast Service
 * Forecasts revenue per month, quarter, year, and custom ranges
 * Supports multiple scenarios: best, base, risk-adjusted, worst-case
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { OpportunityService } from './opportunity.service.js';
import { RevenueAtRiskService } from './revenue-at-risk.service.js';
import { ForecastDecompositionService } from './forecast-decomposition.service.js';
import { ConsensusForecastingService } from './consensus-forecasting.service.js';
import { ForecastCommitmentService } from './forecast-commitment.service.js';
import type { Shard } from '../types/shard.types.js';
import type { ForecastPrediction } from '../types/ml.types.js';

export type ForecastPeriod = 'month' | 'quarter' | 'year' | 'custom';

export interface ForecastRange {
  startDate: Date;
  endDate: Date;
}

export interface ForecastScenario {
  name: 'best' | 'base' | 'risk-adjusted' | 'worst-case';
  revenue: number;
  opportunityCount: number;
  currency: string;
}

export interface RevenueForecast {
  period: ForecastPeriod;
  range: ForecastRange;
  scenarios: ForecastScenario[];
  byPeriod: Array<{
    period: string; // e.g., "2024-01", "2024-Q1"
    best: number;
    base: number;
    riskAdjusted: number;
    worstCase: number;
    opportunityCount: number;
  }>;
  calculatedAt: Date;
  // Enhanced fields
  decomposition?: {
    decompositionId: string;
    timeDecomposition?: any;
    sourceDecomposition?: any;
    confidenceDecomposition?: any;
    driverDecomposition?: any;
  };
  consensus?: {
    consensusId: string;
    consensusValue?: number;
    confidence?: number;
    sources?: any[];
  };
  commitment?: {
    analysisId: string;
    commitmentScore?: number;
    sandbaggingDetected?: boolean;
    happyEarsDetected?: boolean;
  };
}

export class RevenueForecastService {
  constructor(
    private monitoring: IMonitoringProvider,
    private opportunityService: OpportunityService,
    private revenueAtRiskService: RevenueAtRiskService,
    private forecastDecompositionService?: ForecastDecompositionService,
    private consensusForecastingService?: ConsensusForecastingService,
    private forecastCommitmentService?: ForecastCommitmentService,
    // Optional: ML services for enhanced forecasting
    private featureStoreService?: import('./ml/feature-store.service.js').FeatureStoreService,
    private modelService?: import('./ml/model.service.js').ModelService
  ) {}

  /**
   * Generate revenue forecast
   */
  async generateForecast(
    userId: string,
    tenantId: string,
    period: ForecastPeriod,
    range?: ForecastRange
  ): Promise<RevenueForecast> {
    const startTime = Date.now();

    try {
      // Determine date range
      const forecastRange = range || this.getDefaultRange(period);

      // Get opportunities in range
      const result = await this.opportunityService.listOwnedOpportunities(
        userId,
        tenantId,
        {
          ownerId: userId,
          status: ['open'],
          closeDateFrom: forecastRange.startDate,
          closeDateTo: forecastRange.endDate,
        },
        { limit: 1000 }
      );

      // Group opportunities by period
      const periodMap = new Map<string, Shard[]>();

      for (const opp of result.opportunities) {
        const data = opp.structuredData as any;
        const closeDate = data?.closeDate ? new Date(data.closeDate) : null;
        if (!closeDate) {continue;}

        const periodKey = this.getPeriodKey(closeDate, period);
        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, []);
        }
        periodMap.get(periodKey)!.push(opp);
      }

      // Calculate scenarios for each period
      // Use ML predictions if available, otherwise fall back to rule-based
      const byPeriod = await Promise.all(
        Array.from(periodMap.entries()).map(async ([periodKey, opportunities]) => {
          return await this.calculatePeriodScenarios(opportunities, periodKey, tenantId);
        })
      );

      // Sort by period
      byPeriod.sort((a, b) => a.period.localeCompare(b.period));

      // Calculate overall scenarios
      // Use ML predictions if available, otherwise fall back to rule-based
      const allOpportunities = result.opportunities;
      const overallScenarios = await this.calculateOverallScenarios(allOpportunities, tenantId);

      const forecast: RevenueForecast = {
        period,
        range: forecastRange,
        scenarios: overallScenarios,
        byPeriod,
        calculatedAt: new Date(),
      };

      // Enhance with decomposition if available
      if (this.forecastDecompositionService) {
        try {
          const decomposition = await this.forecastDecompositionService.decomposeForecast(
            tenantId,
            forecast
          );
          // Add decomposition to forecast metadata
          (forecast as any).decomposition = decomposition;
        } catch (error) {
          this.monitoring.trackException(error as Error, {
            operation: 'revenue-forecast.decomposition',
            tenantId,
          });
        }
      }

      // Enhance with consensus if available
      if (this.consensusForecastingService) {
        try {
          const periodKey = this.getPeriodKey(forecastRange.startDate, period);
          const baseScenario = overallScenarios.find(s => s.name === 'base');
          const consensus = await this.consensusForecastingService.generateConsensus(
            tenantId,
            periodKey,
            [{
              source: 'rep',
              forecast: baseScenario?.revenue || 0,
              confidence: 0.7,
              timestamp: new Date(),
              metadata: { userId },
            }]
          );
          // Add consensus to forecast
          (forecast as any).consensus = consensus;
        } catch (error) {
          this.monitoring.trackException(error as Error, {
            operation: 'revenue-forecast.consensus',
            tenantId,
          });
        }
      }

      // Enhance with commitment analysis if available
      if (this.forecastCommitmentService) {
        try {
          const periodKey = this.getPeriodKey(forecastRange.startDate, period);
          const baseScenario = overallScenarios.find(s => s.name === 'base');
          const bestScenario = overallScenarios.find(s => s.name === 'best');
          const worstScenario = overallScenarios.find(s => s.name === 'worst-case');
          const commitment = await this.forecastCommitmentService.analyzeCommitment(
            tenantId,
            periodKey,
            {
              commit: baseScenario?.revenue || 0,
              bestCase: bestScenario?.revenue || 0,
              upside: (bestScenario?.revenue || 0) - (baseScenario?.revenue || 0),
              risk: (baseScenario?.revenue || 0) - (worstScenario?.revenue || 0),
              total: bestScenario?.revenue || 0,
            },
            userId
          );
          // Add commitment analysis to forecast
          (forecast as any).commitment = commitment;
        } catch (error) {
          this.monitoring.trackException(error as Error, {
            operation: 'revenue-forecast.commitment',
            tenantId,
          });
        }
      }


      this.monitoring.trackEvent('revenue-forecast.generated', {
        tenantId,
        userId,
        period,
        opportunityCount: allOpportunities.length,
        durationMs: Date.now() - startTime,
        hasDecomposition: !!forecast.decomposition,
        hasConsensus: !!forecast.consensus,
        hasCommitment: !!forecast.commitment,
      });

      return forecast;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'revenue-forecast.generateForecast',
          tenantId,
          userId,
          period,
        }
      );
      throw error;
    }
  }

  /**
   * Get default date range for period
   */
  private getDefaultRange(period: ForecastPeriod): ForecastRange {
    const now = new Date();
    const startDate = new Date(now);

    let endDate: Date;

    switch (period) {
      case 'month':
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'year':
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        // Custom - default to next 3 months
        endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0);
    }

    return { startDate, endDate };
  }

  /**
   * Get period key for grouping
   */
  private getPeriodKey(date: Date, period: ForecastPeriod): string {
    switch (period) {
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${date.getFullYear()}-Q${quarter}`;
      case 'year':
        return String(date.getFullYear());
      default:
        // Custom - use month
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  /**
   * Calculate scenarios for a period
   * Uses ML predictions if available, otherwise falls back to rule-based calculation
   */
  private async calculatePeriodScenarios(
    opportunities: Shard[],
    periodKey: string,
    tenantId: string
  ): Promise<RevenueForecast['byPeriod'][0]> {
    let best = 0;
    let base = 0;
    let riskAdjusted = 0;
    let worstCase = 0;
    let mlPredictionsCount = 0;

    // Use ML predictions if services are available
    if (this.featureStoreService && this.modelService) {
      for (const opp of opportunities) {
        try {
          // Extract features
          const featureSet = await this.featureStoreService.extractFeatures(
            opp.id,
            tenantId
          );

          // Get ML forecast prediction
          const mlPrediction = await this.modelService.predictForecast(
            featureSet.features,
            (opp.structuredData as any)?.industry as string | undefined
          );

          // Map ML uncertainty (P10/P50/P90) to scenarios
          // P10 = worst case (10th percentile)
          // P50 = base case (median)
          // P90 = best case (90th percentile)
          worstCase += mlPrediction.uncertainty.p10;
          base += mlPrediction.pointForecast; // P50
          best += mlPrediction.uncertainty.p90;

          // Risk-adjusted uses P50 with risk adjustment
          const data = opp.structuredData as any;
          const riskEvaluation = data?.riskEvaluation;
          const revenueAtRisk = riskEvaluation?.revenueAtRisk || 0;
          riskAdjusted += mlPrediction.pointForecast - revenueAtRisk;

          mlPredictionsCount++;
        } catch (error) {
          // Log but fall back to rule-based for this opportunity
          this.monitoring.trackException(error as Error, {
            operation: 'revenue-forecast.ml_prediction',
            opportunityId: opp.id,
            tenantId,
          });

          // Fall back to rule-based calculation
          const data = opp.structuredData as any;
          const value = data?.value || 0;
          const expectedRevenue = data?.expectedRevenue || value;
          const probability = data?.probability || 0.5;
          const riskEvaluation = data?.riskEvaluation;
          const revenueAtRisk = riskEvaluation?.revenueAtRisk || 0;

          best += value * Math.max(probability, 0.8);
          base += expectedRevenue;
          riskAdjusted += expectedRevenue - revenueAtRisk;
          worstCase += value * Math.min(probability, 0.3);
        }
      }

      // Track ML usage
      if (mlPredictionsCount > 0) {
        this.monitoring.trackMetric('revenue-forecast.ml_predictions_used', mlPredictionsCount, {
          periodKey,
          tenantId,
          totalOpportunities: opportunities.length,
        });
      }
    } else {
      // Rule-based calculation (fallback)
      for (const opp of opportunities) {
        const data = opp.structuredData as any;
        const value = data?.value || 0;
        const expectedRevenue = data?.expectedRevenue || value;
        const probability = data?.probability || 0.5;

        const riskEvaluation = data?.riskEvaluation;
        const riskScore = riskEvaluation?.riskScore || 0;
        const revenueAtRisk = riskEvaluation?.revenueAtRisk || 0;

        // Best case: full value with high probability
        best += value * Math.max(probability, 0.8);

        // Base case: expected revenue
        base += expectedRevenue;

        // Risk-adjusted: expected revenue minus revenue at risk
        riskAdjusted += expectedRevenue - revenueAtRisk;

        // Worst case: low probability or high risk
        worstCase += value * Math.min(probability, 0.3);
      }
    }

    return {
      period: periodKey,
      best,
      base,
      riskAdjusted,
      worstCase,
      opportunityCount: opportunities.length,
    };
  }

  /**
   * Calculate overall scenarios
   * Uses ML predictions if available, otherwise falls back to rule-based calculation
   */
  private async calculateOverallScenarios(
    opportunities: Shard[],
    tenantId: string
  ): Promise<ForecastScenario[]> {
    let best = 0;
    let base = 0;
    let riskAdjusted = 0;
    let worstCase = 0;
    let currency = 'USD';
    let mlPredictionsCount = 0;

    // Use ML predictions if services are available
    if (this.featureStoreService && this.modelService) {
      for (const opp of opportunities) {
        try {
          // Extract features
          const featureSet = await this.featureStoreService.extractFeatures(
            opp.id,
            tenantId
          );

          // Get ML forecast prediction
          const mlPrediction = await this.modelService.predictForecast(
            featureSet.features,
            (opp.structuredData as any)?.industry as string | undefined
          );

          const data = opp.structuredData as any;
          currency = data?.currency || currency;

          // Map ML uncertainty (P10/P50/P90) to scenarios
          worstCase += mlPrediction.uncertainty.p10;
          base += mlPrediction.pointForecast; // P50
          best += mlPrediction.uncertainty.p90;

          // Risk-adjusted uses P50 with risk adjustment
          const riskEvaluation = data?.riskEvaluation;
          const revenueAtRisk = riskEvaluation?.revenueAtRisk || 0;
          riskAdjusted += mlPrediction.pointForecast - revenueAtRisk;

          mlPredictionsCount++;
        } catch (error) {
          // Log but fall back to rule-based for this opportunity
          this.monitoring.trackException(error as Error, {
            operation: 'revenue-forecast.ml_prediction',
            opportunityId: opp.id,
            tenantId,
          });

          // Fall back to rule-based calculation
          const data = opp.structuredData as any;
          const value = data?.value || 0;
          const expectedRevenue = data?.expectedRevenue || value;
          const probability = data?.probability || 0.5;
          currency = data?.currency || currency;

          const riskEvaluation = data?.riskEvaluation;
          const revenueAtRisk = riskEvaluation?.revenueAtRisk || 0;

          best += value * Math.max(probability, 0.8);
          base += expectedRevenue;
          riskAdjusted += expectedRevenue - revenueAtRisk;
          worstCase += value * Math.min(probability, 0.3);
        }
      }

      // Track ML usage
      if (mlPredictionsCount > 0) {
        this.monitoring.trackMetric('revenue-forecast.ml_predictions_used', mlPredictionsCount, {
          tenantId,
          totalOpportunities: opportunities.length,
        });
      }
    } else {
      // Rule-based calculation (fallback)
      for (const opp of opportunities) {
        const data = opp.structuredData as any;
        const value = data?.value || 0;
        const expectedRevenue = data?.expectedRevenue || value;
        const probability = data?.probability || 0.5;
        currency = data?.currency || currency;

        const riskEvaluation = data?.riskEvaluation;
        const riskScore = riskEvaluation?.riskScore || 0;
        const revenueAtRisk = riskEvaluation?.revenueAtRisk || 0;

        // Best case
        best += value * Math.max(probability, 0.8);

        // Base case
        base += expectedRevenue;

        // Risk-adjusted
        riskAdjusted += expectedRevenue - revenueAtRisk;

        // Worst case
        worstCase += value * Math.min(probability, 0.3);
      }
    }

    return [
      {
        name: 'best',
        revenue: best,
        opportunityCount: opportunities.length,
        currency,
      },
      {
        name: 'base',
        revenue: base,
        opportunityCount: opportunities.length,
        currency,
      },
      {
        name: 'risk-adjusted',
        revenue: riskAdjusted,
        opportunityCount: opportunities.length,
        currency,
      },
      {
        name: 'worst-case',
        revenue: worstCase,
        opportunityCount: opportunities.length,
        currency,
      },
    ];
  }

  /**
   * Set ML services for late initialization
   * Allows ML services to be injected after RevenueForecastService is created
   */
  setMLServices(
    featureStoreService: import('./ml/feature-store.service.js').FeatureStoreService,
    modelService: import('./ml/model.service.js').ModelService
  ): void {
    this.featureStoreService = featureStoreService;
    this.modelService = modelService;
  }
}


/**
 * Forecasting Types
 * Type definitions for forecasting service
 */

export interface ForecastDecomposition {
  decompositionId: string;
  forecastId: string;
  tenantId: string;
  timeDecomposition: {
    trend: number;
    seasonality: number;
    irregular: number;
  };
  /** Temporal features (MISSING_FEATURES 5.6): month, quarter, year-end effect */
  temporalFeatures?: { month: number; quarter: number; isYearEnd: boolean };
  /** Industry seasonality multiplier applied to seasonality component (5.6) */
  industrySeasonalityMultiplier?: number;
  industryId?: string | null;
  sourceDecomposition: {
    pipeline: number;
    newBusiness: number;
    expansions: number;
    renewals: number;
  };
  confidenceDecomposition: {
    commit: number;
    bestCase: number;
    upside: number;
    risk: number;
  };
  driverDecomposition: {
    dealQuality: number;
    velocity: number;
    conversion: number;
    newBusiness: number;
  };
  recommendations: string[];
  createdAt: Date | string;
}

export interface ConsensusForecast {
  consensusId: string;
  forecastId: string;
  tenantId: string;
  period: string;
  consensusRevenue: number;
  confidence: number;
  sources: Array<{
    source: string;
    forecast: number;
    weight: number;
    confidence: number;
  }>;
  disagreement: number;
  createdAt: Date | string;
}

export interface ForecastCommitment {
  commitmentId: string;
  forecastId: string;
  tenantId: string;
  commitmentLevel: 'high' | 'medium' | 'low';
  confidence: number;
  factors: Array<{
    factor: string;
    impact: number;
    confidence: number;
  }>;
  createdAt: Date | string;
}

export interface PipelineHealth {
  healthId: string;
  tenantId: string;
  opportunityId?: string;
  qualityScore: number;
  velocityScore: number;
  coverageScore: number;
  riskScore: number;
  maturityScore: number;
  compositeScore: number;
  createdAt: Date | string;
}

export interface LearnedWeights {
  decomposition?: number;
  consensus?: number;
  commitment?: number;
  [key: string]: number | undefined;
}

export interface ModelSelection {
  modelId: string;
  confidence: number;
  version?: string;
}

export interface ForecastRequest {
  opportunityId: string;
  tenantId: string;
  userId?: string;
  workflowId?: string; // For workflow tracking
  period?: string;
  includeDecomposition?: boolean;
  includeConsensus?: boolean;
  includeCommitment?: boolean;
}

export interface ForecastResult {
  forecastId: string;
  opportunityId: string;
  revenueForecast: number;
  confidence: number;
  /** Risk-adjusted revenue when risk_analytics is configured (MISSING_FEATURES 5.1) */
  riskAdjustedRevenue?: number;
  /** Placeholder for industry benchmarking (MISSING_FEATURES 5.6); integrate with analytics when available */
  industryBenchmark?: number;
  decomposition?: ForecastDecomposition;
  consensus?: ConsensusForecast;
  commitment?: ForecastCommitment;
  mlForecast?: {
    pointForecast: number;
    uncertainty?: {
      p10?: number;
      p50?: number;
      p90?: number;
    };
    scenarios?: Array<{
      scenario: string;
      probability: number;
      forecast: number;
    }>;
    confidence?: number;
  };
  calculatedAt: Date;
}

/** Forecast type for accuracy tracking (e.g. revenue, closeDate) */
export type ForecastType = 'revenue' | 'closeDate';

/** Stored prediction for later accuracy comparison */
export interface ForecastPrediction {
  id: string;
  tenantId: string;
  opportunityId: string;
  forecastId: string;
  forecastType: ForecastType;
  predictedValue: number;
  predictedAt: Date | string;
  actualValue?: number;
  actualAt?: Date | string;
  createdAt: Date | string;
}

/** Request to record an actual outcome for a prediction */
export interface RecordActualRequest {
  opportunityId: string;
  forecastType: ForecastType;
  actualValue: number;
  actualAt?: Date | string;
  predictionId?: string;
}

/** Options for accuracy metrics query */
export interface AccuracyMetricsOptions {
  forecastType?: ForecastType;
  startDate?: string; // ISO
  endDate?: string;   // ISO
}

/** Accuracy metrics: MAPE, forecast bias, R² */
export interface ForecastAccuracyMetrics {
  mape: number;           // Mean Absolute Percentage Error (%)
  forecastBias: number;   // mean(actual - predicted); >0 under-forecast, <0 over-forecast
  r2: number;             // R² (coefficient of determination)
  sampleCount: number;
  forecastType?: ForecastType;
  startDate?: string;
  endDate?: string;
}

/** Team-level forecast aggregation (MISSING_FEATURES 5.5) */
export interface TeamForecastAggregateRequest {
  teamId: string;
  opportunityIds: string[];
  startDate?: string;
  endDate?: string;
}

export interface TeamForecastAggregateResult {
  teamId: string;
  totalPipeline: number;
  totalRiskAdjusted?: number;
  opportunityCount: number;
  winRate?: number;
  quotaAttainment?: number;
  period?: { startDate?: string; endDate?: string };
  calculatedAt: Date;
}

/** Tenant-level forecast aggregation (MISSING_FEATURES 5.5) */
export interface TenantForecastAggregateRequest {
  startDate?: string;
  endDate?: string;
}

export interface TenantForecastAggregateResult {
  totalRevenue: number;
  totalRiskAdjusted?: number;
  opportunityCount: number;
  growthRate?: number;
  industryBenchmark?: number;
  period?: { startDate?: string; endDate?: string };
  calculatedAt: Date;
}

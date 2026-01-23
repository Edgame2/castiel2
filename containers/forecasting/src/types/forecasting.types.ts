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
  decomposition?: ForecastDecomposition;
  consensus?: ConsensusForecast;
  commitment?: ForecastCommitment;
  calculatedAt: Date;
}

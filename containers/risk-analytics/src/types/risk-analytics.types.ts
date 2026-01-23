/**
 * Risk Analytics Types
 * Type definitions for risk evaluation and analytics
 */

import { RiskCatalog, DetectedRisk, RiskEvaluation, RiskCategory } from '../../risk-catalog/src/types/risk-catalog.types';

export type DetectionMethod = 'rule' | 'ai' | 'historical' | 'semantic' | 'ml';

export interface LearnedWeights {
  ruleBased?: number;
  ml?: number;
  ai?: number;
  historical?: number;
  [key: string]: number | undefined;
}

export interface ModelSelection {
  modelId: string;
  confidence: number;
  version?: string;
}

export interface RiskEvaluationRequest {
  opportunityId: string;
  tenantId: string;
  userId?: string;
  workflowId?: string; // For workflow tracking
  trigger: 'scheduled' | 'opportunity_updated' | 'shard_created' | 'manual' | 'risk_catalog_created' | 'risk_catalog_updated' | 'workflow';
  priority?: 'high' | 'normal' | 'low';
  options?: {
    includeHistorical?: boolean;
    includeAI?: boolean;
    includeSemanticDiscovery?: boolean;
  };
}

export interface RiskEvaluationResult {
  evaluationId: string;
  opportunityId: string;
  riskScore: number;
  categoryScores: {
    Commercial: number;
    Technical: number;
    Legal: number;
    Financial: number;
    Competitive: number;
    Operational: number;
  };
  detectedRisks: DetectedRisk[];
  revenueAtRisk: number;
  assumptions?: any;
  trustLevel?: 'high' | 'medium' | 'low' | 'unreliable';
  qualityScore?: number;
  calculatedAt: Date;
}

export interface RiskScoringRequest {
  opportunityId: string;
  tenantId: string;
  modelId?: string;
  features?: Record<string, any>;
}

export interface RiskScoringResult {
  scoringId: string;
  opportunityId: string;
  mlRiskScore: number;
  modelId: string;
  confidence: number;
  features?: Record<string, any>;
}

export interface RevenueAtRiskCalculation {
  opportunityId: string;
  revenueAtRisk: number;
  riskScore: number;
  opportunityValue: number;
  calculatedAt: Date;
}

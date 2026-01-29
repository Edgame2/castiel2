/**
 * Explanation and feature importance types (Plan W5 Layer 4, ALL_LAYERS_DETAILED_REQUIREMENTS)
 */

/** Single factor contributing to a prediction (SHAP-like) */
export interface Factor {
  feature: string;
  value: unknown;
  impact: number;
  importance: number;
  category: string;
  description: string;
  unit?: string;
}

/** Stored explanation document (Cosmos, partitionKey = tenantId) */
export interface Explanation {
  id: string;
  tenantId: string;
  predictionId: string;
  opportunityId: string;
  modelId: string;
  baseValue: number;
  prediction: number;
  positiveFactors: Factor[];
  negativeFactors: Factor[];
  shapValues: Record<string, number>;
  confidence: 'low' | 'medium' | 'high';
  detailLevel: string;
  generatedAt: string;
  createdAt: string;
}

/** Global feature importance item (per feature) */
export interface FeatureImportanceItem {
  feature: string;
  importance: number;
  category: string;
  description: string;
  rank: number;
}

/** Stored global feature importance (Cosmos; partitionKey = tenantId; use tenantId 'global' for model-level) */
export interface GlobalFeatureImportance {
  id: string;
  tenantId: string;
  modelId: string;
  featureImportance: FeatureImportanceItem[];
  sampleSize: number;
  calculatedAt: string;
}

/** Request body for POST explain/prediction */
export interface ExplainPredictionRequest {
  predictionId?: string;
  opportunityId?: string;
  modelId?: string;
  evaluationId?: string;
}

/** Request body for POST explain/batch */
export interface ExplainBatchRequest {
  predictionIds?: string[];
  evaluationIds?: string[];
}

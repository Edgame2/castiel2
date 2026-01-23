/**
 * Machine Learning System Types
 * 
 * Type definitions for ML services, models, features, and training
 */

// ============================================================================
// Model Types
// ============================================================================

export type ModelType = 
  | 'risk_scoring'      // Risk score prediction (0-1)
  | 'forecasting'       // Revenue forecasting
  | 'recommendations';   // Recommendation ranking

export type ModelScope = 'global' | 'industry' | 'tenant';

export type ModelStatus = 'training' | 'evaluating' | 'active' | 'deprecated';

export interface MLModel {
  id: string;                        // Azure ML model ID
  name: string;                      // Model name
  modelType: ModelType;
  version: string;                  // Semantic version
  
  // Scope
  scope: ModelScope;
  industryId?: string;              // For industry-specific models
  
  // Azure ML References
  azureMLModelId: string;           // Azure ML model registry ID
  endpointUrl: string;              // Managed endpoint URL
  endpointName: string;             // Managed endpoint name
  
  // Relationships (for fine-tuned models)
  parentModelId?: string;           // Parent model (for industry models)
  performanceImprovement?: number;  // % improvement over parent
  
  trainingDate: Date;
  
  // Performance metrics
  metrics: {
    // Risk Scoring
    r2Score?: number;
    mse?: number;
    mae?: number;
    calibrationError?: number;
    brierScore?: number;
    auc?: number;
    
    // Forecasting
    mape?: number;                  // Mean Absolute Percentage Error
    rmse?: number;
    forecastBias30d?: number;
    forecastBias60d?: number;
    forecastBias90d?: number;
    
    // Recommendations
    ndcg?: number;                  // Normalized Discounted Cumulative Gain
    precision?: number;
    recall?: number;
    ctrUplift?: number;
  };
  
  // Training info
  trainingExamples: number;
  validationExamples: number;
  trainingDurationMs: number;
  
  // Status
  status: ModelStatus;
  isDefault: boolean;
  
  // A/B testing
  abTestTraffic: number;            // Percentage (0-100)
  abTestStartDate?: Date;
  
  // Feature versions used in training
  featureVersions?: Record<string, string>; // featureName -> version
  
  createdAt: Date;
  updatedAt: Date;
  tenantId: string;
}

// ============================================================================
// Feature Types
// ============================================================================

export interface FeatureVersion {
  featureName: string;
  version: string;
  source: string;                   // Source of the feature (e.g., 'opportunity', 'risk_snapshot')
  computationLogicHash: string;     // Hash of computation logic for compatibility checking
  createdAt: Date;
}

export interface FeatureVector {
  [featureName: string]: number | string | boolean | null;
}

export interface MLFeature {
  id: string;
  tenantId: string;
  opportunityId: string;
  featureName: string;
  version: string;
  value: number | string | boolean | null;
  source: string;
  computationLogicHash: string;
  modelVersion?: string;            // Model version this feature was used for
  createdAt: Date;
}

export interface FeatureSet {
  opportunityId: string;
  tenantId: string;
  features: FeatureVector;
  featureVersions: Record<string, string>; // featureName -> version
  modelVersion?: string;
  createdAt: Date;
}

// ============================================================================
// Training Types
// ============================================================================

export type TrainingJobStatus = 
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TrainingJob {
  id: string;
  tenantId: string;
  jobId: string;                     // Azure ML job ID
  modelType: ModelType;
  status: TrainingJobStatus;
  
  // Feature version pinning
  pinnedFeatureVersions: Record<string, string>; // featureName -> version
  
  // Training configuration
  trainingExamples: number;
  validationExamples: number;
  syntheticDataRatio?: number;      // Ratio of synthetic to real data
  
  // Results
  modelId?: string;                 // Created model ID
  metrics?: MLModel['metrics'];
  error?: string;
  
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingJobOptions {
  modelType: ModelType;
  scope?: ModelScope;
  industryId?: string;
  useSyntheticData?: boolean;
  syntheticDataRatio?: number;
  parentModelId?: string;           // For fine-tuning
}

// ============================================================================
// Prediction Types
// ============================================================================

export interface RiskScorePrediction {
  riskScore: number;                // 0-1 calibrated risk score
  rawScore: number;                  // Raw model output (before calibration)
  confidence: number;                // Prediction confidence
  categoryScores?: Record<string, number>; // Category-specific scores
  featureImportance?: Record<string, number>; // SHAP values (future)
  modelVersion: string;
  modelId: string;
  timestamp: Date;
}

export interface ForecastPrediction {
  pointForecast: number;            // P50 (median) forecast
  uncertainty: {
    p10: number;                    // 10th percentile (worst case)
    p50: number;                    // 50th percentile (base case)
    p90: number;                    // 90th percentile (best case)
  };
  confidence: number;
  modelVersion: string;
  modelId: string;
  timestamp: Date;
}

export interface RecommendationPrediction {
  itemId: string;
  score: number;                    // Recommendation score
  rank: number;                      // Rank position
  modelVersion: string;
  modelId: string;
  timestamp: Date;
}

// ============================================================================
// Calibration Types
// ============================================================================

export type CalibrationMethod = 'platt_scaling' | 'isotonic_regression';

export interface CalibrationParameters {
  modelVersion: string;
  method: CalibrationMethod;
  parameters: {
    // Platt Scaling: sigmoid(a * x + b)
    a?: number;
    b?: number;
    
    // Isotonic Regression: piecewise linear function
    thresholds?: number[];
    values?: number[];
  };
  trainedOn: {
    examples: number;
    date: Date;
  };
}

// ============================================================================
// Evaluation Types
// ============================================================================

export interface ModelMetrics {
  modelId: string;
  modelVersion: string;
  modelType: ModelType;
  
  // Performance metrics (same as MLModel.metrics)
  metrics: MLModel['metrics'];
  
  // Drift detection
  drift: {
    featureDistribution?: {
      detected: boolean;
      score: number;                 // KS test or PSI score
      threshold: number;
      lastChecked: Date;
    };
    predictionDistribution?: {
      detected: boolean;
      score: number;
      threshold: number;
      lastChecked: Date;
    };
    outcome?: {
      detected: boolean;
      accuracyDegradation: number;   // % degradation
      threshold: number;
      lastChecked: Date;
    };
  };
  
  // Sample sizes
  evaluationExamples: number;
  timeWindow: {
    start: Date;
    end: Date;
  };
  
  calculatedAt: Date;
}

export interface DriftDetectionResult {
  type: 'feature_distribution' | 'prediction_distribution' | 'outcome';
  detected: boolean;
  score: number;
  threshold: number;
  details?: Record<string, unknown>;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface PredictRiskScoreRequest {
  opportunityId: string;
  tenantId: string;
  industryId?: string;
  includeFeatureImportance?: boolean;
}

export interface PredictRiskScoreResponse {
  prediction: RiskScorePrediction;
  features?: FeatureVector;
}

export interface PredictForecastRequest {
  opportunityId?: string;
  tenantId: string;
  teamId?: string;
  industryId?: string;
  forecastHorizon?: number;         // Days ahead
}

export interface PredictForecastResponse {
  prediction: ForecastPrediction;
  level: 'opportunity' | 'team' | 'tenant';
}

export interface GetRecommendationsRequest {
  userId: string;
  tenantId: string;
  context?: Record<string, unknown>;
  limit?: number;
}

export interface GetRecommendationsResponse {
  recommendations: RecommendationPrediction[];
}

// ============================================================================
// Synthetic Data Types
// ============================================================================

export interface SyntheticDataConfig {
  method: 'smote' | 'statistical_sampling';
  ratio: number;                     // Ratio of synthetic to real data
  minorityClass?: string;            // For SMOTE
}

export interface SyntheticDataResult {
  originalCount: number;
  syntheticCount: number;
  totalCount: number;
  quality: {
    distributionSimilarity: number; // 0-1 score
    statisticalTests: Record<string, number>;
  };
}

/**
 * ML Service types
 * Core data model for machine learning model management
 */

export enum ModelType {
  CLASSIFICATION = 'classification',
  REGRESSION = 'regression',
  CLUSTERING = 'clustering',
  RECOMMENDATION = 'recommendation',
  FORECASTING = 'forecasting',
  ANOMALY_DETECTION = 'anomaly_detection',
}

export enum ModelStatus {
  DRAFT = 'draft',
  TRAINING = 'training',
  EVALUATING = 'evaluating',
  READY = 'ready',
  DEPLOYED = 'deployed',
  ARCHIVED = 'archived',
  FAILED = 'failed',
}

export enum TrainingJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * ML Model
 */
export interface MLModel {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  type: ModelType;
  version: number;
  status: ModelStatus;
  algorithm?: string; // Algorithm used (e.g., 'random_forest', 'neural_network')
  features: string[]; // Feature IDs used by this model
  hyperparameters?: Record<string, any>; // Model hyperparameters
  metrics?: ModelMetrics; // Model performance metrics
  modelPath?: string; // Path to stored model file
  trainingJobId?: string; // Reference to training job
  deployedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  /** Model card limitations (Plan §11.9, §946); optional, used by GET /models/:id/card */
  limitations?: string[];
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/** Model card (Plan §11.9, §946): purpose, input, output, limitations for GET /api/v1/ml/models/:id/card */
export interface ModelCard {
  modelId: string;
  name: string;
  type: ModelType;
  version: number;
  purpose: string;
  input: string[];
  output: string;
  limitations: string[];
}

/**
 * Model Metrics
 */
export interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  auc?: number; // Area Under Curve
  rmse?: number; // Root Mean Squared Error
  mae?: number; // Mean Absolute Error
  r2?: number; // R-squared
  confusionMatrix?: number[][]; // For classification
  featureImportance?: Record<string, number>; // Feature importance scores
  trainingTime?: number; // Training time in seconds
  evaluationTime?: Date;
}

/**
 * Feature
 */
export interface Feature {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  type: 'numeric' | 'categorical' | 'text' | 'datetime' | 'boolean';
  source?: string; // Data source
  transformation?: string; // Transformation applied
  statistics?: {
    mean?: number;
    median?: number;
    std?: number;
    min?: number;
    max?: number;
    uniqueValues?: number;
    nullCount?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Training Job
 */
export interface TrainingJob {
  id: string;
  tenantId: string; // Partition key
  modelId?: string; // Reference to model (if updating existing)
  name: string;
  description?: string;
  modelType: ModelType;
  algorithm: string;
  features: string[]; // Feature IDs
  hyperparameters: Record<string, any>;
  trainingDataPath?: string; // Path to training data
  validationDataPath?: string; // Path to validation data
  status: TrainingJobStatus;
  progress?: number; // 0-100
  metrics?: ModelMetrics; // Training metrics
  error?: string; // Error message if failed
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Model Evaluation
 */
export interface ModelEvaluation {
  id: string;
  tenantId: string; // Partition key
  modelId: string;
  version: number;
  evaluationDataPath?: string;
  metrics: ModelMetrics;
  evaluationDate: Date;
  evaluatedBy: string;
  notes?: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Prediction
 */
export interface Prediction {
  id: string;
  tenantId: string; // Partition key
  modelId: string;
  modelVersion: number;
  input: Record<string, any>; // Input features
  output: any; // Prediction output
  confidence?: number; // Confidence score (0-1)
  metadata?: Record<string, any>;
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create model input
 */
export interface CreateMLModelInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  type: ModelType;
  algorithm?: string;
  features: string[];
  hyperparameters?: Record<string, any>;
}

/**
 * Update model input
 */
export interface UpdateMLModelInput {
  name?: string;
  description?: string;
  status?: ModelStatus;
  metrics?: ModelMetrics;
  modelPath?: string;
  limitations?: string[];
  deployedAt?: Date;
  trainingJobId?: string;
}

/**
 * Create training job input
 */
export interface CreateTrainingJobInput {
  tenantId: string;
  userId: string;
  modelId?: string;
  name: string;
  description?: string;
  modelType: ModelType;
  algorithm: string;
  features: string[];
  hyperparameters: Record<string, any>;
  trainingDataPath?: string;
  validationDataPath?: string;
}

/**
 * Create prediction input
 */
export interface CreatePredictionInput {
  tenantId: string;
  modelId: string;
  modelVersion?: number;
  input: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Drift metrics (Plan W6 Layer 8 – Learning Loop).
 * Persisted per model/tenant for evaluation/drift API.
 */
export interface DriftMetrics {
  id: string;
  tenantId: string;
  modelId: string;
  metric: string; // e.g. 'psi', 'feature_drift'
  value: number;
  baselineVersion?: number;
  currentVersion?: number;
  segment?: string;
  recordedAt: string;
  metadata?: Record<string, unknown>;
}/**
 * Improvement opportunity (Plan W6 Layer 8 – ContinuousLearningService).
 * Suggestions for model improvement (retrain, add features, threshold, etc.).
 */
export interface ImprovementOpportunity {
  id: string;
  tenantId: string;
  modelId: string;
  type: string; // e.g. 'retrain', 'add_feature', 'threshold', 'drift_recovery'
  priority: 'low' | 'medium' | 'high';
  reason: string;
  suggestedAction?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  acknowledgedAt?: string;
}
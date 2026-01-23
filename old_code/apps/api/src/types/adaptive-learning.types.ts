/**
 * Adaptive Learning Types
 * Type definitions for the adaptive learning system that replaces hardcoded weights and parameters
 */

// ============================================
// Core Types
// ============================================

export type ServiceType = 'risk' | 'forecast' | 'recommendations';

export type TenantValue = 'high' | 'medium' | 'low';

export type LearningStage = 'bootstrap' | 'initial' | 'transition' | 'mature';

export interface Context {
  industry?: string;
  dealSize?: string;
  stage?: string;
  dealValue?: number;
  itemType?: string;
  userRole?: string;
  [key: string]: any; // Allow additional context fields
}

// ============================================
// Component Weight Learning
// ============================================

export interface ComponentWeightLearning {
  // Identity
  id: string; // UUID
  tenantId: string; // Partition key
  contextKey: string; // e.g., "tech:large:proposal"
  serviceType: ServiceType;

  // Weights
  defaultWeights: Record<string, number>; // Original defaults
  learnedWeights: Record<string, number>; // Learned weights
  activeWeights: Record<string, number>; // Currently used (blend)
  blendRatio: number; // 0-1: How much learned vs default

  // Learning metrics
  examples: number; // Number of training examples
  lastExampleTimestamp: Date;
  learningRate: number; // Current learning rate

  // Performance tracking
  performance: {
    accuracy: number; // Current accuracy
    baseline: number; // Baseline (default) accuracy
    improvement: number; // % improvement over baseline
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  };

  // Validation
  validated: boolean; // Passed statistical validation?
  validatedAt?: Date;
  validationResults?: ValidationResult;
  lastValidatedExamples?: number; // Examples count at last validation

  // Versioning & history
  version: number; // For optimistic concurrency
  previousVersion?: string; // Link to previous version (rollback)
  createdAt: Date;
  updatedAt: Date;

  // Rollback tracking
  rolledBack?: boolean;
  rollbackReason?: string;
  rollbackAt?: Date;

  // Audit & metadata
  createdBy: string; // System user
  modifiedBy: string;
  tags: string[]; // For filtering/grouping
  notes?: string; // Optional annotations
}

export interface WeightUpdate {
  tenantId: string;
  contextKey: string;
  serviceType: ServiceType;
  component: string;
  outcome: number; // 0-1: success/failure or performance metric
  timestamp: Date;
}

// ============================================
// Model Selection Learning
// ============================================

export interface ModelSelectionLearning {
  id: string;
  tenantId: string; // Partition key
  modelType: ServiceType;
  contextKey: string;

  models: {
    global: ModelMetadata;
    industry?: ModelMetadata;
    tenant?: ModelMetadata;
  };

  selectionCriteria: {
    dataSufficiency: number; // Learned threshold
    performanceImprovement: number; // Learned threshold (%)
  };

  performance: {
    globalModelAccuracy: number;
    bestModel: string; // 'global' | 'industry' | 'tenant'
    improvement: number; // % improvement over global
  };

  graduationState: {
    stage: 'global' | 'industry' | 'tenant';
    examples: number;
    readyForGraduation: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface ModelMetadata {
  modelId: string;
  version: string;
  accuracy: number;
  lastTrained: Date;
  examplesUsed: number;
}

// ============================================
// Signal Weighting
// ============================================

export interface SignalWeightLearning {
  id: string;
  tenantId: string; // Partition key
  signalType: 'explicit' | 'implicit' | 'time_spent' | 'action_taken' | 'dismissal' | 'engagement';
  weights: Record<string, number>; // Signal-specific weights
  reliability: number; // 0-1: How reliable this signal is
  examples: number;
  lastUpdated: Date;
}

// ============================================
// Feature Importance
// ============================================

export interface FeatureImportanceLearning {
  id: string;
  tenantId: string; // Partition key
  contextKey: string;
  features: Record<string, number>; // Feature name -> importance score
  learnedFrom: 'shap' | 'correlation' | 'mutual_information';
  examples: number;
  lastUpdated: Date;
}

// ============================================
// Learning Outcomes
// ============================================

export interface LearningOutcome {
  id: string;
  tenantId: string; // Partition key
  serviceType: ServiceType;
  contextKey: string;
  predictionId: string; // ID of the prediction made
  prediction: any; // The actual prediction
  actualOutcome: number; // 0-1: Actual result
  componentScores: Record<string, number>; // Individual component scores
  weights: Record<string, number>; // Weights used for this prediction
  timestamp: Date;
  outcomeType: 'success' | 'failure' | 'partial';
}

// ============================================
// Parameter History
// ============================================

export interface ParameterHistory {
  id: string;
  tenantId: string; // Partition key
  paramType: 'weights' | 'model_selection' | 'signal_weights' | 'feature_importance';
  contextKey: string;
  snapshot: any; // Full parameter snapshot
  performance: {
    accuracy: number;
    improvement: number;
  };
  version: number;
  createdAt: Date;
  reason: 'update' | 'rollback' | 'validation';
}

// ============================================
// Validation
// ============================================

export interface ValidationResult {
  validated: boolean;
  reason?: string;
  confidence: number; // 0-1
  lowerBound: number;
  upperBound: number;
  medianImprovement: number;
  sampleSize: number;
  validatedAt: Date;
}

export interface ValidationCriteria {
  minimumSampleSize: number; // Default: 30
  confidenceLevel: number; // Default: 0.95
  minimumImprovement: number; // Default: 0.05 (5%)
}

// ============================================
// Learning Curve Configuration
// ============================================

export interface LearningCurveStage {
  examples: [number, number]; // [min, max] or [min, Infinity]
  learnedWeight: number; // 0-1: How much to use learned params
  defaultWeight: number; // 0-1: How much to use defaults
}

export const LEARNING_CURVE: Record<LearningStage, LearningCurveStage> = {
  bootstrap: { examples: [0, 100], learnedWeight: 0.0, defaultWeight: 1.0 },
  initial: { examples: [100, 500], learnedWeight: 0.3, defaultWeight: 0.7 },
  transition: { examples: [500, 1000], learnedWeight: 0.8, defaultWeight: 0.2 },
  mature: { examples: [1000, Infinity], learnedWeight: 0.95, defaultWeight: 0.05 },
} as const;

// ============================================
// Default Weights
// ============================================

export const DEFAULT_RISK_WEIGHTS = {
  ml: 0.9,
  rules: 1.0,
  llm: 0.8,
  historical: 0.9,
} as const;

export const DEFAULT_RECOMMENDATION_WEIGHTS = {
  vectorSearch: 0.4,
  collaborative: 0.3,
  temporal: 0.2,
  content: 0.1,
} as const;

export const DEFAULT_FORECAST_WEIGHTS = {
  opportunityLevel: 0.5,
  historicalPattern: 0.3,
  velocity: 0.2,
} as const;

// ============================================
// Rollback
// ============================================

export interface RollbackDecision {
  shouldRollback: boolean;
  reason?: string;
  degradation?: number; // % degradation
  userIssues?: number; // Number of user-reported issues
  anomalyScore?: number; // 0-1: Anomaly detection score
  failureRate?: number; // 0-1: Recent failure rate
}

// ============================================
// Thompson Sampling
// ============================================

export interface ThompsonSamplingState {
  component: string;
  alpha: number; // Successes
  beta: number; // Failures
  lastUpdated: Date;
}

// ============================================
// Conflict Resolution Learning Types
// ============================================

export type ConflictResolutionStrategy = 'highest_confidence' | 'rule_priority' | 'merged' | 'learned';

export interface ConflictResolutionLearning {
  id: string; // UUID
  tenantId: string; // Partition key
  contextKey: string; // e.g., "tech:large:proposal"
  
  // Conflict context
  method1: string; // First detection method
  method2: string; // Second detection method
  conflictType: string; // Type of conflict
  
  // Resolution strategy
  defaultStrategy: ConflictResolutionStrategy; // Original default
  learnedStrategy?: ConflictResolutionStrategy; // Learned strategy
  activeStrategy: ConflictResolutionStrategy; // Currently used (blend)
  blendRatio: number; // 0-1: How much learned vs default
  
  // Learning metrics
  examples: number; // Number of conflict resolutions
  lastExampleTimestamp: Date;
  learningRate: number; // Current learning rate
  
  // Performance tracking
  performance: {
    accuracy: number; // Current accuracy of resolution
    baseline: number; // Baseline (default) accuracy
    improvement: number; // % improvement over baseline
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  };
  
  // Validation
  validated: boolean;
  validatedAt?: Date;
  validationResults?: ValidationResult;
  lastValidatedExamples?: number;
  
  // Versioning & history
  version: number;
  previousVersion?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Rollback tracking
  rolledBack?: boolean;
  rollbackReason?: string;
  rollbackAt?: Date;
  
  // Audit & metadata
  createdBy: string;
  modifiedBy: string;
  tags: string[];
  notes?: string;
}

export interface ConflictResolution {
  conflictId: string;
  tenantId: string;
  opportunityId: string;
  method1: string;
  method2: string;
  conflictDescription: string;
  resolutionStrategy: ConflictResolutionStrategy;
  resolution: string;
  resolvedAt: Date;
  outcome?: number; // 0-1: success/failure or performance metric
  outcomeRecordedAt?: Date;
}

// ============================================
// Counterfactual Types
// ============================================

export interface CounterfactualScenario {
  scenarioId: string;
  tenantId: string;
  opportunityId: string;
  changes: Record<string, any>;
  predictedOutcome: {
    riskScore: number;
    winProbability: number;
    revenue: number;
  };
  feasibility: number;
  confidence: number;
  validated?: boolean;
  actualOutcome?: 'won' | 'lost' | 'cancelled';
  validationAccuracy?: number;
  validatedAt?: Date;
  createdAt: Date;
}

// ============================================
// Hierarchical Memory Types
// ============================================

export type MemoryTier = 'immediate' | 'session' | 'temporal' | 'relational' | 'global';

export interface MemoryTierConfig {
  tier: MemoryTier;
  ttl: number; // TTL in seconds
  maxSize: number; // Maximum number of records
  storage: 'redis' | 'cosmos' | 'both'; // Where to store
}

export interface MemoryRecord {
  id: string;
  tenantId: string; // Partition key
  tier: MemoryTier;
  content: any; // Memory content (flexible structure)
  relevanceScore: number; // 0-1: How relevant this memory is
  accessedAt: Date;
  accessCount: number;
  contextKey: string; // Context where this memory is relevant
  tags: string[]; // Tags for filtering
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date; // When moved to archive
}

export interface MemoryRetrievalResult {
  records: MemoryRecord[];
  tier: MemoryTier;
  relevanceScore: number; // Average relevance
  retrievalTime: number; // ms
}

// ============================================
// Cache Keys
// ============================================

export interface AdaptiveLearningCacheKeys {
  componentWeights: (tenantId: string, contextKey: string) => string;
  modelSelection: (tenantId: string, contextKey: string) => string;
  signalWeights: (tenantId: string, contextKey: string) => string;
  featureImportance: (tenantId: string, contextKey: string) => string;
  learningMeta: (tenantId: string, paramType: string) => string;
  performance: (tenantId: string, contextKey: string, window: string) => string;
}

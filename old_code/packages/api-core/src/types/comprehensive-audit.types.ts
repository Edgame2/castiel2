/**
 * Comprehensive Audit Trail Types
 * Types for distributed tracing, data lineage, AI interaction logging, and decision audit trails
 * Used for Phase 2: Robustness - Comprehensive Audit Trail
 */

import type { RiskEvaluationAssumptions } from './risk-analysis.types.js';
import type { DetectionMethod } from './risk-analysis.types.js';

/**
 * Token usage information
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Comprehensive audit log entry
 * Captures full traceability for risk evaluations and AI interactions
 */
export interface ComprehensiveAuditLogEntry {
  id: string;
  traceId: string;
  parentTraceId?: string;
  timestamp: Date;
  operation: AuditOperation;
  tenantId: string;
  userId: string;
  
  // Input/Output data (sanitized)
  inputData?: any;
  outputData?: any;
  
  // Assumptions and context
  assumptions?: RiskEvaluationAssumptions;
  
  // Data lineage
  dataLineage?: DataLineage;
  
  // AI interaction details
  aiInteraction?: AIInteractionLog;
  
  // Decision trail
  decisionTrail?: DecisionTrail;
  
  // Performance metrics
  durationMs: number;
  success: boolean;
  error?: string;
  errorCode?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Partition key for Cosmos DB
  partitionKey: string; // tenantId
}

/**
 * Audit operation types
 */
export type AuditOperation =
  | 'risk_evaluation'
  | 'risk_detection'
  | 'risk_score_calculation'
  | 'ai_chat_generation'
  | 'ai_context_assembly'
  | 'ai_grounding'
  | 'ai_validation'
  | 'ai_tool_execution' // Tool execution audit
  | 'data_quality_check'
  | 'trust_level_calculation'
  | 'pii_redaction'; // Phase 3.1: PII redaction audit

/**
 * Data lineage tracking
 * Tracks where data came from and how it was transformed
 */
export interface DataLineage {
  sourceSystems: Array<{
    system: string;
    syncTimestamp: Date;
    lastSyncTimestamp?: Date;
    syncMethod?: string;
  }>;
  transformations: Array<{
    step: string;
    description: string;
    timestamp: Date;
    inputFields?: string[];
    outputFields?: string[];
  }>;
  fieldProvenance: Record<string, {
    source: string;
    sourceField?: string;
    transformation?: string;
    confidence?: number;
  }>;
  qualityScores: Record<string, {
    score: number;
    timestamp: Date;
    method: string;
  }>;
}

/**
 * AI interaction log
 * Captures full details of AI model interactions
 */
export interface AIInteractionLog {
  // Model information
  modelName: string;
  modelVersion?: string;
  provider: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  
  // Prompt information (sanitized)
  prompt: string;
  systemPrompt?: string;
  promptTemplateId?: string;
  promptVersion?: string;
  
  // Response information
  response: string;
  responseFormat?: string;
  
  // Grounding results
  groundingResults?: {
    grounded: boolean;
    groundingScore: number;
    citations: Array<{
      id: string;
      sourceShardId: string;
      confidence: number;
      verified: boolean;
    }>;
    unverifiedClaims?: string[];
  };
  
  // Validation outcomes
  validationOutcomes?: {
    schemaValid: boolean;
    contentValid: boolean;
    businessLogicValid: boolean;
    warnings?: string[];
    errors?: string[];
  };
  
  // Token usage
  tokenUsage: TokenUsage;
  
  // Timing information
  timing: {
    promptMs: number;
    completionMs: number;
    totalMs: number;
    streaming?: boolean;
    chunksReceived?: number;
  };
  
  // Context information
  contextInfo?: {
    totalTokens: number;
    sourceCount: number;
    truncated: boolean;
    truncatedSections?: string[];
    averageRelevance?: number;
  };
  
  // Error information
  error?: {
    code: string;
    message: string;
    type: string;
    retryable: boolean;
  };
}

/**
 * Decision trail
 * Tracks decision-making process for risk evaluations
 */
export interface DecisionTrail {
  // Detection methods used
  detectionMethods: DetectionMethod[];
  
  // Rule-based detection details
  matchedRules?: Array<{
    riskId: string;
    ruleId: string;
    ruleType: string;
    matchedConditions: string[];
    confidence: number;
  }>;
  
  // AI reasoning
  aiReasoning?: string;
  aiConfidence?: number;
  
  // Historical patterns
  historicalPatterns?: Array<{
    similarOpportunityId: string;
    similarityScore: number;
    outcome: 'won' | 'lost';
    riskFactors: string[];
  }>;
  
  // Semantic matches
  semanticMatches?: Array<{
    shardId: string;
    shardType: string;
    similarityScore: number;
    matchedContent?: string;
  }>;
  
  // Conflicts and resolutions
  conflicts?: Array<{
    method1: DetectionMethod;
    method2: DetectionMethod;
    conflict: string;
    resolution: string;
    resolutionMethod: 'highest_confidence' | 'rule_priority' | 'manual' | 'merged';
  }>;
  
  // Score calculation breakdown
  scoreCalculation: {
    steps: Array<{
      step: string;
      description: string;
      inputValues: Record<string, number>;
      formula: string;
      result: number;
      category?: string;
    }>;
    categoryScores: Record<string, {
      score: number;
      contribution: number;
      risks: Array<{
        riskId: string;
        contribution: number;
        confidence: number;
        ponderation: number;
      }>;
    }>;
    confidenceAdjustments: Array<{
      factor: string;
      adjustment: number;
      reason: string;
      source: string;
    }>;
    finalScore: number;
    formula: string; // Documented formula
  };
  
  // Data quality impact
  dataQualityImpact?: {
    qualityScore: number;
    completeness: number;
    staleness: number;
    missingFields: string[];
    missingRelationships: string[];
    impactOnScore: number;
  };
  
  // Trust level factors
  trustLevelFactors?: Array<{
    factor: string;
    value: number | boolean | string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }>;
}

/**
 * Query interface for comprehensive audit logs
 */
export interface ComprehensiveAuditLogQuery {
  tenantId: string;
  traceId?: string;
  parentTraceId?: string;
  operation?: AuditOperation | AuditOperation[];
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  hasError?: boolean;
  minDurationMs?: number;
  maxDurationMs?: number;
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'durationMs';
  orderDirection?: 'asc' | 'desc';
  
  // Filter by AI interaction details
  modelName?: string;
  provider?: string;
  
  // Filter by decision trail
  detectionMethod?: DetectionMethod;
  riskId?: string;
  
  // Filter by data lineage
  sourceSystem?: string;
}

/**
 * Response for audit log queries
 */
export interface ComprehensiveAuditLogQueryResponse {
  entries: ComprehensiveAuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Statistics for audit logs
 */
export interface ComprehensiveAuditLogStats {
  totalEntries: number;
  operations: Record<AuditOperation, number>;
  successRate: number;
  averageDurationMs: number;
  errorRate: number;
  byModel: Record<string, {
    count: number;
    averageDurationMs: number;
    successRate: number;
  }>;
  byDetectionMethod: Record<DetectionMethod, number>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

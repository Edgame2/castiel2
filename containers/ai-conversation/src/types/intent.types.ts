/**
 * Intent Analysis Types
 * Types for intent classification and analysis
 */

export type InsightType =
  | 'summary'
  | 'analysis'
  | 'comparison'
  | 'recommendation'
  | 'prediction'
  | 'extraction'
  | 'search'
  | 'generation';

export interface ContextScope {
  // Primary target
  shardId?: string;
  shardTypeId?: string;

  // Broader scope
  projectId?: string;
  companyId?: string;
  portfolioId?: string;

  // Time constraints
  timeRange?: {
    from: Date;
    to: Date;
  };

  // Filters
  tags?: string[];
  status?: string[];

  // Limits
  maxShards?: number;
  maxTokens?: number;
}

export interface ExtractedEntity {
  type: 'shard' | 'shard_type' | 'time_range' | 'metric' | 'action' | 'comparison_target';
  value: string;
  shardId?: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface IntentAnalysisResult {
  // Classification
  insightType: InsightType;
  confidence: number;

  // Multi-intent support
  isMultiIntent?: boolean;
  secondaryIntents?: Array<{
    type: InsightType;
    confidence: number;
    query?: string;
  }>;

  // Extracted entities
  entities: ExtractedEntity[];

  // Resolved scope
  scope: ContextScope;

  // Template recommendation
  suggestedTemplateId?: string;

  // Complexity assessment
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTokens: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

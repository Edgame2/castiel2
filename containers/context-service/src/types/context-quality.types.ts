/**
 * Context Quality Types
 * Types for context quality assessment
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

export interface ContextQuality {
  totalTokens: number;
  tokenLimit: number;
  truncated: boolean;
  truncatedSections?: string[];
  sourceCount: number;
  sourceTypes: string[];
  averageRelevance: number;
  relevanceDistribution: Array<{ range: string; count: number }>;
  missingExpectedSources: string[];
  completeness: number; // 0-1
  warnings: Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    impact?: string;
    remediation?: string;
  }>;
  qualityScore: number; // 0-1 overall
  meetsMinimumRequirements: boolean;
  minimumRequirements?: MinimumContextRequirements;
}

export interface MinimumContextRequirements {
  minSourceCount: number;
  minRelevanceScore: number;
  requiredSourceTypes?: string[];
  minTokens?: number;
  allowEmpty?: boolean;
}

export interface AssembledContext {
  primary?: {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    content: any;
  };
  related?: Array<{
    shardId: string;
    shardName: string;
    shardTypeId: string;
    content: any;
  }>;
  ragChunks?: Array<{
    id: string;
    shardId: string;
    shardName: string;
    shardTypeId: string;
    content: string;
    score?: number;
    tokenCount?: number;
    [key: string]: any;
  }>;
  sources?: Array<{
    id: string;
    shardId: string;
    shardName: string;
    shardTypeId: string;
    content: string;
    type?: string;
    score?: number;
  }>;
  metadata?: {
    templateId?: string;
    templateName?: string;
    totalTokens?: number;
    sourceCount?: number;
    assembledAt?: Date;
    truncationInfo?: {
      truncated: boolean;
      originalTokenCount: number;
      finalTokenCount: number;
      truncatedSections: string[];
      summarizedSections: string[];
    };
    cacheStalenessInfo?: {
      isStale: boolean;
      isCriticallyStale: boolean;
      ageMs: number;
      cachedAt: Date;
    };
    [key: string]: any;
  };
  formattedContext?: string;
}

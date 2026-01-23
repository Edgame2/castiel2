/**
 * Intent Pattern Types
 * Types for managing intent classification patterns
 */

import type { InsightType } from './ai-insights.types.js';

/**
 * Intent Pattern
 * Defines patterns for classifying user queries into intent types
 */
export interface IntentPattern {
  id: string;
  name: string;
  description: string;
  
  // Classification
  intentType: InsightType;
  subtype?: string;
  
  // Matching rules
  patterns: string[];              // Regex pattern strings (stored as strings, converted to RegExp at runtime)
  keywords: string[];              // Required keywords
  phrases: string[];               // Common phrases
  
  // Weighting
  priority: number;                // 1-10 (higher = checked first)
  confidenceWeight: number;        // Multiplier for confidence score (default: 1.0)
  
  // Context requirements
  requiresContext?: {
    shardTypes?: string[];         // Only match in certain contexts
    userRoles?: string[];            // Only for certain roles
  };
  
  // Exclusions
  excludePatterns?: string[];      // Don't match if these patterns present
  
  // Performance tracking
  metrics: {
    totalMatches: number;
    accuracyRate: number;          // % correctly classified (0-1)
    avgConfidence: number;          // Average confidence when matched (0-1)
    lastMatched?: Date;
  };
  
  // Metadata
  source: 'manual' | 'llm_assisted' | 'auto_learned';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isActive: boolean;
  
  // Cosmos DB fields
  tenantId: string;                // Always 'SYSTEM' for system patterns
  partitionKey: string;            // Always 'SYSTEM'
  type: 'intent-pattern';
}

/**
 * Create Intent Pattern Input
 */
export interface CreateIntentPatternInput {
  name: string;
  description: string;
  intentType: InsightType;
  subtype?: string;
  patterns: string[];
  keywords?: string[];
  phrases?: string[];
  priority?: number;
  confidenceWeight?: number;
  requiresContext?: {
    shardTypes?: string[];
    userRoles?: string[];
  };
  excludePatterns?: string[];
  isActive?: boolean;
}

/**
 * Update Intent Pattern Input
 */
export interface UpdateIntentPatternInput {
  name?: string;
  description?: string;
  intentType?: InsightType;
  subtype?: string;
  patterns?: string[];
  keywords?: string[];
  phrases?: string[];
  priority?: number;
  confidenceWeight?: number;
  requiresContext?: {
    shardTypes?: string[];
    userRoles?: string[];
  };
  excludePatterns?: string[];
  isActive?: boolean;
}

/**
 * List Intent Patterns Options
 */
export interface ListIntentPatternsOptions {
  intentType?: InsightType;
  isActive?: boolean;
  minAccuracy?: number;
  sortBy?: 'accuracy' | 'coverage' | 'createdAt' | 'priority';
  limit?: number;
  offset?: number;
}

/**
 * Test Pattern Input
 */
export interface TestPatternInput {
  pattern: Partial<IntentPattern>;
  testQueries: string[];
}

/**
 * Test Pattern Result
 */
export interface TestPatternResult {
  query: string;
  matched: boolean;
  confidence: number;
  intentType: InsightType;
  matchedPattern?: string;
  matchedKeywords?: string[];
}

/**
 * LLM Suggest Pattern Input
 */
export interface SuggestPatternFromSamplesInput {
  samples: string[];
  targetIntent: InsightType;
  targetSubtype?: string;
}

/**
 * LLM Suggested Pattern
 */
export interface SuggestedPattern {
  pattern: string;                 // Regex pattern string
  confidence: number;
  reasoning: string;
  coverage: number;                // Number of samples matched
  matches?: Array<{
    query: string;
    matched: boolean;
  }>;
}

/**
 * LLM Suggest Pattern Response
 */
export interface SuggestPatternFromSamplesResponse {
  suggestedPatterns: SuggestedPattern[];
  keywords: string[];
  phrases: string[];
  explanation: string;
}

/**
 * Pattern Performance Metrics
 */
export interface PatternPerformanceMetrics {
  totalPatterns: number;
  activePatterns: number;
  avgAccuracy: number;
  totalClassifications: number;
  misclassifications: {
    total: number;
    topMisclassifiedQueries: Array<{
      query: string;
      predictedIntent: InsightType;
      actualIntent?: InsightType;
      confidence: number;
      frequency: number;
    }>;
  };
}

/**
 * Pattern List Response
 */
export interface PatternListResponse {
  patterns: IntentPattern[];
  metrics: PatternPerformanceMetrics;
  total: number;
  limit: number;
  offset: number;
}







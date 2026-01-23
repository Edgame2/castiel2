/**
 * Citation Validation Types
 * Phase 3.2: Citation Validation System
 */

import type { Citation, VerifiedClaim } from './ai-insights.types.js';

/**
 * Citation validation result
 */
export interface CitationValidationResult {
  citation: Citation;
  valid: boolean;
  confidence: number; // 0-1, confidence in validation
  issues: CitationIssue[];
  sourceVerified: boolean;
  semanticScore: number; // 0-1, semantic similarity between claim and citation
  sourceExists: boolean;
  contentMatches: boolean;
}

/**
 * Citation validation issues
 */
export interface CitationIssue {
  type: CitationIssueType;
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion?: string;
}

/**
 * Types of citation issues
 */
export enum CitationIssueType {
  WEAK_SEMANTIC_MATCH = 'weak_semantic_match', // Low similarity score
  SOURCE_NOT_FOUND = 'source_not_found', // Source shard doesn't exist
  CONTENT_MISMATCH = 'content_mismatch', // Citation text doesn't match source content
  SOURCE_DELETED = 'source_deleted', // Source was deleted
  SOURCE_UPDATED = 'source_updated', // Source was updated after citation
  INVALID_SHARD_ID = 'invalid_shard_id', // Shard ID is invalid
  MISSING_FIELD = 'missing_field', // Required field missing in citation
}

/**
 * Citation completeness analysis
 */
export interface CitationCompletenessResult {
  totalClaims: number;
  citedClaims: number;
  uncitedClaims: Array<{
    claim: string;
    requiresCitation: boolean;
    reason: string;
  }>;
  overcitationCount: number; // Too many citations for a single claim
  coverageScore: number; // 0-1, what % of claims are cited
  completeness: 'complete' | 'partial' | 'incomplete';
}

/**
 * Citation quality metrics
 */
export interface CitationQualityMetrics {
  validationSuccessRate: number; // 0-1, % of citations that passed validation
  averageConfidence: number; // 0-1, average confidence across all citations
  averageSemanticScore: number; // 0-1, average semantic similarity
  sourceVerificationRate: number; // 0-1, % of sources that were verified
  issueCount: number;
  issueBreakdown: Record<CitationIssueType, number>;
  coverageScore: number; // From completeness analysis
  timestamp: Date;
}

/**
 * Citation validation configuration
 */
export interface CitationValidationConfig {
  tenantId: string;
  enabled: boolean;
  
  // Semantic validation thresholds
  minSemanticScore: number; // Minimum similarity for valid citation (default: 0.7)
  weakSemanticThreshold: number; // Threshold for weak match warning (default: 0.5)
  
  // Source verification
  verifySourceExistence: boolean; // Check if source exists
  verifyContentMatch: boolean; // Check if citation text matches source
  trackSourceVersion: boolean; // Track source version in citations
  
  // Completeness requirements
  requireCitationsForFacts: boolean; // Require citations for factual claims
  allowUncitedGeneralStatements: boolean; // Allow general statements without citations
  maxCitationsPerClaim: number; // Flag overcitation (default: 3)
  
  // Invalid citation handling
  invalidCitationAction: 'reject' | 'warn' | 'allow'; // What to do with invalid citations
  weakCitationAction: 'warn' | 'allow'; // What to do with weak citations
  
  // Quality tracking
  trackQualityMetrics: boolean; // Track quality metrics over time
  
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

/**
 * Source verification result
 */
export interface SourceVerificationResult {
  sourceId: string;
  exists: boolean;
  accessible: boolean;
  contentMatches: boolean;
  versionMatch: boolean;
  currentVersion?: string;
  citedVersion?: string;
  lastUpdated?: Date;
  issues: string[];
}

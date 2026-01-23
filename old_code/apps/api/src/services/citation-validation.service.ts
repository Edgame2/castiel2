/**
 * Citation Validation Service
 * Phase 3.2: Citation Validation System
 * 
 * Validates citations to ensure they actually support claims, verifies sources,
 * checks citation completeness, and tracks quality metrics.
 */

import type { IMonitoringProvider } from '@castiel/monitoring';
import type { ShardRepository } from '@castiel/api-core';
import type {
  Citation,
  VerifiedClaim,
  AssembledContext,
} from '../types/ai-insights.types.js';
import {
  CitationValidationResult,
  CitationIssue,
  CitationIssueType,
  CitationCompletenessResult,
  CitationQualityMetrics,
  CitationValidationConfig,
  SourceVerificationResult,
} from '../types/citation-validation.types.js';

/**
 * Default validation configuration
 * Phase 3.2: Exported for use in other services
 */
export const DEFAULT_CITATION_VALIDATION_CONFIG: Omit<CitationValidationConfig, 'tenantId' | 'createdAt' | 'updatedAt' | 'updatedBy'> = {
  enabled: true,
  minSemanticScore: 0.7,
  weakSemanticThreshold: 0.5,
  verifySourceExistence: true,
  verifyContentMatch: true,
  trackSourceVersion: false, // Phase 3.2: Can be enabled for future version tracking
  requireCitationsForFacts: true,
  allowUncitedGeneralStatements: true,
  maxCitationsPerClaim: 3,
  invalidCitationAction: 'warn',
  weakCitationAction: 'warn',
  trackQualityMetrics: true,
};

export class CitationValidationService {
  private configs: Map<string, CitationValidationConfig> = new Map(); // tenantId -> config

  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository?: ShardRepository
  ) {}

  /**
   * Configure citation validation for a tenant
   */
  async configureValidation(
    tenantId: string,
    config: Partial<CitationValidationConfig>,
    userId: string
  ): Promise<void> {
    const existingConfig = this.configs.get(tenantId);
    const newConfig: CitationValidationConfig = {
      tenantId,
      ...DEFAULT_CITATION_VALIDATION_CONFIG,
      ...existingConfig,
      ...config,
      updatedAt: new Date(),
      updatedBy: userId,
      createdAt: existingConfig?.createdAt ?? new Date(),
    };

    this.configs.set(tenantId, newConfig);

    this.monitoring.trackEvent('citation-validation.config-updated', {
      tenantId,
      enabled: newConfig.enabled,
      minSemanticScore: newConfig.minSemanticScore,
    });
  }

  /**
   * Get validation configuration for a tenant
   */
  getConfig(tenantId: string): CitationValidationConfig | null {
    return this.configs.get(tenantId) || null;
  }

  /**
   * Phase 3.2: Validate citations semantically and verify sources
   */
  async validateCitations(
    citations: Citation[],
    claims: VerifiedClaim[],
    context: AssembledContext,
    tenantId: string
  ): Promise<CitationValidationResult[]> {
    const config = this.getConfig(tenantId);
    
    if (!config || !config.enabled) {
      // Return all citations as valid if validation is disabled
      return citations.map(citation => ({
        citation,
        valid: true,
        confidence: citation.confidence,
        issues: [],
        sourceVerified: false,
        semanticScore: citation.confidence,
        sourceExists: true,
        contentMatches: true,
      }));
    }

    const results: CitationValidationResult[] = [];

    for (const citation of citations) {
      const result = await this.validateCitation(
        citation,
        claims,
        context,
        config,
        tenantId
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Phase 3.2: Validate a single citation
   */
  private async validateCitation(
    citation: Citation,
    claims: VerifiedClaim[],
    context: AssembledContext,
    config: CitationValidationConfig,
    tenantId: string
  ): Promise<CitationValidationResult> {
    const issues: CitationIssue[] = [];
    let semanticScore = citation.confidence;
    let sourceVerified = false;
    let sourceExists = true;
    let contentMatches = true;

    // 1. Semantic validation - verify claim-citation alignment
    const claimForCitation = this.findClaimForCitation(citation, claims);
    if (claimForCitation) {
      semanticScore = this.calculateSemanticSimilarity(
        claimForCitation.claim,
        citation.text
      );

      if (semanticScore < config.minSemanticScore) {
        issues.push({
          type: CitationIssueType.WEAK_SEMANTIC_MATCH,
          severity: semanticScore < config.weakSemanticThreshold ? 'high' : 'medium',
          message: `Citation has low semantic similarity (${(semanticScore * 100).toFixed(1)}%) to claim`,
          suggestion: 'Citation may not adequately support the claim. Consider finding a better source.',
        });
      }
    }

    // 2. Source verification
    if (config.verifySourceExistence && citation.source.shardId) {
      const verification = await this.verifySource(
        citation.source.shardId,
        tenantId,
        citation.text,
        config
      );

      sourceExists = verification.exists;
      sourceVerified = verification.exists && verification.accessible;
      contentMatches = verification.contentMatches;

      if (!verification.exists) {
        issues.push({
          type: CitationIssueType.SOURCE_NOT_FOUND,
          severity: 'high',
          message: `Source shard ${citation.source.shardId} not found`,
          suggestion: 'Source may have been deleted or citation ID is incorrect.',
        });
      } else if (!verification.accessible) {
        issues.push({
          type: CitationIssueType.INVALID_SHARD_ID,
          severity: 'high',
          message: `Source shard ${citation.source.shardId} is not accessible`,
          suggestion: 'User may not have permission to access this source.',
        });
      } else if (!verification.contentMatches && config.verifyContentMatch) {
        issues.push({
          type: CitationIssueType.CONTENT_MISMATCH,
          severity: 'medium',
          message: 'Citation text does not match source content',
          suggestion: 'Source content may have changed or citation text is incorrect.',
        });
      }

      if (verification.issues.length > 0) {
        for (const issue of verification.issues) {
          issues.push({
            type: CitationIssueType.SOURCE_UPDATED,
            severity: 'low',
            message: issue,
          });
        }
      }
    }

    // 3. Determine validity
    const hasHighSeverityIssues = issues.some(i => i.severity === 'high');
    const hasMediumSeverityIssues = issues.some(i => i.severity === 'medium');
    
    let valid = true;
    if (config.invalidCitationAction === 'reject' && hasHighSeverityIssues) {
      valid = false;
    } else if (config.invalidCitationAction === 'warn' && hasHighSeverityIssues) {
      valid = true; // Still valid but with warnings
    }

    // Apply weak citation action
    if (semanticScore < config.minSemanticScore && config.weakCitationAction === 'warn') {
      // Already added as issue above
    }

    return {
      citation,
      valid,
      confidence: Math.min(semanticScore, citation.confidence),
      issues,
      sourceVerified,
      semanticScore,
      sourceExists,
      contentMatches,
    };
  }

  /**
   * Phase 3.2: Verify source exists and content matches
   */
  private async verifySource(
    shardId: string,
    tenantId: string,
    citedText: string,
    config: CitationValidationConfig
  ): Promise<SourceVerificationResult> {
    const result: SourceVerificationResult = {
      sourceId: shardId,
      exists: false,
      accessible: false,
      contentMatches: false,
      versionMatch: true, // Default to true if version tracking disabled
      issues: [],
    };

    if (!this.shardRepository) {
      // ShardRepository not available, skip verification
      result.exists = true; // Assume exists if we can't verify
      result.accessible = true;
      result.contentMatches = true;
      return result;
    }

    try {
      const shard = await this.shardRepository.findById(shardId, tenantId);
      
      if (!shard) {
        result.exists = false;
        result.issues.push('Source shard not found');
        return result;
      }

      result.exists = true;
      result.accessible = true;
      result.lastUpdated = shard.updatedAt;

      // Verify content match if enabled
      if (config.verifyContentMatch) {
        const shardContent = JSON.stringify(shard.structuredData || {});
        const similarity = this.calculateSemanticSimilarity(citedText, shardContent);
        result.contentMatches = similarity >= config.minSemanticScore;

        if (!result.contentMatches) {
          result.issues.push(`Content similarity is ${(similarity * 100).toFixed(1)}%, below threshold`);
        }
      } else {
        result.contentMatches = true; // Skip content verification
      }

      // Phase 3.2: Version tracking (when shard versioning is available)
      if (config.trackSourceVersion) {
        // Future enhancement: Implement version tracking when shard versioning is available
        // For now, assume version match (default behavior)
        result.versionMatch = true;
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'citation-validation.verify-source',
        tenantId,
        shardId,
      });
      result.exists = false;
      result.accessible = false;
      result.issues.push(`Error verifying source: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Phase 3.2: Check citation completeness
   */
  checkCitationCompleteness(
    claims: VerifiedClaim[],
    citations: Citation[],
    config: CitationValidationConfig
  ): CitationCompletenessResult {
    const citedClaimIds = new Set<string>();
    const citationCountPerClaim = new Map<string, number>();
    const uncitedClaims: CitationCompletenessResult['uncitedClaims'] = [];

    // Map citations to claims
    for (const citation of citations) {
      // Find claims that reference this citation
      for (const claim of claims) {
        if (claim.sources.includes(citation.id)) {
          citedClaimIds.add(claim.claim);
          citationCountPerClaim.set(
            claim.claim,
            (citationCountPerClaim.get(claim.claim) || 0) + 1
          );
        }
      }
    }

    // Find uncited claims
    for (const claim of claims) {
      if (!citedClaimIds.has(claim.claim)) {
        const requiresCitation = 
          config.requireCitationsForFacts && 
          (claim.category === 'factual' || claim.category === 'analytical');
        
        if (requiresCitation || !config.allowUncitedGeneralStatements) {
          uncitedClaims.push({
            claim: claim.claim,
            requiresCitation,
            reason: requiresCitation
              ? 'Factual or analytical claim requires citation'
              : 'Citation completeness check failed',
          });
        }
      }
    }

    // Check for overcitation
    let overcitationCount = 0;
    for (const [claim, count] of citationCountPerClaim.entries()) {
      if (count > config.maxCitationsPerClaim) {
        overcitationCount++;
      }
    }

    const citedClaims = citedClaimIds.size;
    const totalClaims = claims.length;
    const coverageScore = totalClaims > 0 ? citedClaims / totalClaims : 1.0;

    let completeness: 'complete' | 'partial' | 'incomplete' = 'complete';
    if (uncitedClaims.length > 0) {
      completeness = coverageScore < 0.5 ? 'incomplete' : 'partial';
    }

    return {
      totalClaims,
      citedClaims,
      uncitedClaims,
      overcitationCount,
      coverageScore,
      completeness,
    };
  }

  /**
   * Phase 3.2: Calculate citation quality metrics
   */
  calculateQualityMetrics(
    validationResults: CitationValidationResult[],
    completenessResult: CitationCompletenessResult
  ): CitationQualityMetrics {
    if (validationResults.length === 0) {
      return {
        validationSuccessRate: 1.0,
        averageConfidence: 1.0,
        averageSemanticScore: 1.0,
        sourceVerificationRate: 1.0,
        issueCount: 0,
        issueBreakdown: {} as Record<CitationIssueType, number>,
        coverageScore: completenessResult.coverageScore,
        timestamp: new Date(),
      };
    }

    const validCount = validationResults.filter(r => r.valid).length;
    const validationSuccessRate = validationResults.length > 0
      ? validCount / validationResults.length
      : 1.0;

    const averageConfidence = validationResults.reduce(
      (sum, r) => sum + r.confidence,
      0
    ) / validationResults.length;

    const averageSemanticScore = validationResults.reduce(
      (sum, r) => sum + r.semanticScore,
      0
    ) / validationResults.length;

    const verifiedCount = validationResults.filter(r => r.sourceVerified).length;
    const sourceVerificationRate = validationResults.length > 0
      ? verifiedCount / validationResults.length
      : 1.0;

    const allIssues = validationResults.flatMap(r => r.issues);
    const issueBreakdown = {} as Record<CitationIssueType, number>;
    for (const issue of allIssues) {
      issueBreakdown[issue.type] = (issueBreakdown[issue.type] || 0) + 1;
    }

    return {
      validationSuccessRate,
      averageConfidence,
      averageSemanticScore,
      sourceVerificationRate,
      issueCount: allIssues.length,
      issueBreakdown,
      coverageScore: completenessResult.coverageScore,
      timestamp: new Date(),
    };
  }

  /**
   * Find claim that corresponds to a citation
   */
  private findClaimForCitation(
    citation: Citation,
    claims: VerifiedClaim[]
  ): VerifiedClaim | undefined {
    // Find claim that references this citation
    return claims.find(claim => claim.sources.includes(citation.id));
  }

  /**
   * Calculate semantic similarity between two texts
   * Uses improved Jaccard similarity with word importance weighting
   */
  private calculateSemanticSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) {
      return 0;
    }

    const normalize = (s: string): string[] => {
      return s
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2) // Filter out very short words
        .filter((w) => !['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(w));
    };

    const words1 = normalize(text1);
    const words2 = normalize(text2);

    if (words1.length === 0 && words2.length === 0) {
      return 1;
    }
    if (words1.length === 0 || words2.length === 0) {
      return 0;
    }

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    // Calculate Jaccard similarity
    const intersection = new Set([...set1].filter(w => set2.has(w)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) {
      return 0;
    }

    const jaccard = intersection.size / union.size;

    // Boost score if key terms match (longer words are more important)
    const keyTerms1 = words1.filter(w => w.length > 4);
    const keyTerms2 = words2.filter(w => w.length > 4);
    const matchingKeyTerms = keyTerms1.filter(w => keyTerms2.includes(w)).length;
    const keyTermBoost = keyTerms1.length > 0
      ? matchingKeyTerms / Math.max(keyTerms1.length, keyTerms2.length)
      : 0;

    // Weighted combination: 70% Jaccard, 30% key term match
    return Math.min(1, jaccard * 0.7 + keyTermBoost * 0.3);
  }
}

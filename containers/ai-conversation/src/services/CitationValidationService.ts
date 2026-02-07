/**
 * Citation Validation Service
 * Phase 3.2: Citation Validation System
 * 
 * Validates citations to ensure they actually support claims, verifies sources,
 * checks citation completeness, and tracks quality metrics.
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { Citation, VerifiedClaim } from './GroundingService.js';
import { AssembledContext } from './ContextAssemblyService.js';
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
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private app: FastifyInstance | null = null;
  private configs: Map<string, CitationValidationConfig> = new Map(); // tenantId -> config

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'ai-conversation',
      serviceName: 'ai-conversation',
      tenantId,
    });
  }

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

    // Store in database for persistence
    try {
      const container = getContainer('conversation_citation_configs');
      await container.items.upsert({
        ...newConfig,
        id: tenantId,
        tenantId,
      });
    } catch (error: any) {
      log.warn('Failed to persist citation validation config', {
        error: error.message,
        tenantId,
        service: 'ai-conversation',
      });
    }

    log.info('Citation validation config updated', {
      tenantId,
      enabled: newConfig.enabled,
      minSemanticScore: newConfig.minSemanticScore,
      service: 'ai-conversation',
    });
  }

  /**
   * Get validation configuration for a tenant
   */
  async getConfig(tenantId: string): Promise<CitationValidationConfig | null> {
    // Check in-memory cache first
    if (this.configs.has(tenantId)) {
      return this.configs.get(tenantId) || null;
    }

    // Load from database
    try {
      const container = getContainer('conversation_citation_configs');
      const { resource } = await container.item(tenantId, tenantId).read();
      
      if (resource) {
        this.configs.set(tenantId, resource as CitationValidationConfig);
        return resource as CitationValidationConfig;
      }
    } catch (error: any) {
      log.warn('Failed to load citation validation config', {
        error: error.message,
        tenantId,
        service: 'ai-conversation',
      });
    }

    return null;
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
    const config = await this.getConfig(tenantId);
    
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
        claimForCitation.text,
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
    if (config.verifySourceExistence && citation.shardId) {
      const verification = await this.verifySource(
        citation.shardId,
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
          message: `Source shard ${citation.shardId} not found`,
          suggestion: 'Source may have been deleted or citation ID is incorrect.',
        });
      } else if (!verification.accessible) {
        issues.push({
          type: CitationIssueType.INVALID_SHARD_ID,
          severity: 'high',
          message: `Source shard ${citation.shardId} is not accessible`,
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

    try {
      const token = this.getServiceToken(tenantId);
      const shardResponse = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${shardId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      
      if (!shardResponse) {
        result.exists = false;
        result.issues.push('Source shard not found');
        return result;
      }

      result.exists = true;
      result.accessible = true;
      result.lastUpdated = shardResponse.updatedAt ? new Date(shardResponse.updatedAt) : undefined;

      // Verify content match if enabled
      if (config.verifyContentMatch) {
        const shardContent = JSON.stringify(shardResponse.structuredData || {});
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
    } catch (error: any) {
      log.error('Failed to verify source', error, {
        tenantId,
        shardId,
        service: 'ai-conversation',
      });
      result.exists = false;
      result.accessible = false;
      result.issues.push(`Error verifying source: ${error.message}`);
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
          citedClaimIds.add(claim.id);
          citationCountPerClaim.set(
            claim.id,
            (citationCountPerClaim.get(claim.id) || 0) + 1
          );
        }
      }
    }

    // Find uncited claims
    for (const claim of claims) {
      if (!citedClaimIds.has(claim.id)) {
        const requiresCitation = 
          config.requireCitationsForFacts && 
          (claim.category === 'factual' || claim.category === 'analytical');
        
        if (requiresCitation || !config.allowUncitedGeneralStatements) {
          uncitedClaims.push({
            claim: claim.text,
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
    for (const [claimId, count] of citationCountPerClaim.entries()) {
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

  /**
   * Legacy method: Validate citation (backward compatibility)
   */
  async validateCitationLegacy(tenantId: string, citation: Citation): Promise<{
    citationId: string;
    valid: boolean;
    issues: string[];
    confidence: number;
  }> {
    const config = await this.getConfig(tenantId) || {
      ...DEFAULT_CITATION_VALIDATION_CONFIG,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: 'system',
    };

    const result = await this.validateCitation(
      citation,
      [],
      {
        id: '',
        tenantId,
        query: '',
        sources: [],
        topics: [],
        clusters: [],
        qualityScore: 0,
        qualityLevel: 'low',
        tokenCount: 0,
        createdAt: new Date().toISOString(),
      },
      config,
      tenantId
    );

    return {
      citationId: citation.id,
      valid: result.valid,
      issues: result.issues.map(i => i.message),
      confidence: result.confidence,
    };
  }

  /**
   * Legacy method: Validate all citations (backward compatibility)
   */
  async validateCitationsLegacy(tenantId: string, citations: Citation[]): Promise<Array<{
    citationId: string;
    valid: boolean;
    issues: string[];
    confidence: number;
  }>> {
    return Promise.all(citations.map(c => this.validateCitationLegacy(tenantId, c)));
  }
}

/**
 * Context Quality Service
 * Assesses context quality for AI Chat responses
 * Tracks tokens, truncation, sources, relevance, and completeness
 * Phase 2.4: Enhanced with minimum context requirements and edge case handling
 */

import type { AssembledContext } from '../types/ai-insights.types.js';
import type { InsightType } from '../types/ai-insights.types.js';

export interface ContextQuality {
  totalTokens: number;
  tokenLimit: number;
  truncated: boolean;
  truncatedSections?: string[]; // Which sections were truncated
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
    remediation?: string; // Guidance for improving context
  }>;
  qualityScore: number; // 0-1 overall
  meetsMinimumRequirements: boolean; // Phase 2.4: Whether context meets minimum requirements
  minimumRequirements?: MinimumContextRequirements; // Phase 2.4: Applied minimum requirements
}

/**
 * Minimum context requirements per operation type
 * Phase 2.4: Context Edge Case Handling
 */
export interface MinimumContextRequirements {
  minSourceCount: number;
  minRelevanceScore: number;
  requiredSourceTypes?: string[];
  minTokens?: number;
  allowEmpty?: boolean; // Whether empty context is allowed for this operation
}

/**
 * Context quality thresholds per insight type
 * Phase 2.4: Context Edge Case Handling
 */
const INSIGHT_TYPE_REQUIREMENTS: Record<InsightType, MinimumContextRequirements> = {
  summary: {
    minSourceCount: 1, // Summary can work with minimal context
    minRelevanceScore: 0.3,
    allowEmpty: false,
  },
  analysis: {
    minSourceCount: 3, // Analysis needs more context
    minRelevanceScore: 0.5,
    minTokens: 500,
    allowEmpty: false,
  },
  comparison: {
    minSourceCount: 2, // Comparison needs at least 2 sources
    minRelevanceScore: 0.5,
    minTokens: 300,
    allowEmpty: false,
  },
  recommendation: {
    minSourceCount: 3, // Recommendations need substantial context
    minRelevanceScore: 0.6,
    minTokens: 800,
    allowEmpty: false,
  },
  prediction: {
    minSourceCount: 5, // Predictions need historical data
    minRelevanceScore: 0.6,
    minTokens: 1000,
    allowEmpty: false,
  },
  extraction: {
    minSourceCount: 1, // Extraction can work with single source
    minRelevanceScore: 0.4,
    allowEmpty: false,
  },
  search: {
    minSourceCount: 0, // Search can work with empty context (will search)
    minRelevanceScore: 0.0,
    allowEmpty: true,
  },
  generation: {
    minSourceCount: 2, // Generation needs some context
    minRelevanceScore: 0.4,
    minTokens: 400,
    allowEmpty: false,
  },
};

export class ContextQualityService {
  /**
   * Assess context quality comprehensively
   * Phase 2.4: Enhanced with operation-specific minimum requirements
   */
  assessContextQuality(
    context: AssembledContext,
    expectedSources?: string[],
    tokenLimit?: number,
    insightType?: InsightType
  ): ContextQuality {
    const warnings: Array<{
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high';
      impact?: string;
      remediation?: string;
    }> = [];

    // Calculate token counts
    const primaryTokens = this.estimateTokens(context.primary?.content || {});
    const relatedTokens = context.related.reduce((sum, r) => 
      sum + this.estimateTokens(r.content || {}), 0
    );
    const ragTokens = context.ragChunks.reduce((sum, c) => 
      sum + (c.tokenCount || this.estimateTokens(c.content)), 0
    );
    const totalTokens = primaryTokens + relatedTokens + ragTokens;

    // Phase 2.4: Detect truncation (check metadata for truncation info)
    let truncated = false;
    const truncatedSections: string[] = [];
    const truncationInfo = (context.metadata as any)?.truncationInfo;
    
    if (truncationInfo && truncationInfo.truncated) {
      truncated = true;
      truncatedSections.push(...truncationInfo.truncatedSections);
      
      if (truncationInfo.summarizedSections.length > 0) {
        truncatedSections.push(...truncationInfo.summarizedSections.map((s: string) => `Summarized: ${s}`));
      }
      
      warnings.push({
        type: 'truncation',
        message: `Context was intelligently truncated from ${truncationInfo.originalTokenCount} to ${truncationInfo.finalTokenCount} tokens`,
        severity: 'medium',
        impact: 'Some content was truncated or summarized to fit token limits. Key information was preserved, but some details may be missing.',
        remediation: truncationInfo.summarizedSections.length > 0
          ? 'Some sections were summarized to preserve key information. Consider expanding the token limit or refining your query to focus on specific information.'
          : 'Content was truncated to fit token limits. Consider expanding the token limit or refining your query to focus on specific information.',
      });
    } else if (tokenLimit && totalTokens > tokenLimit) {
      // Fallback: detect truncation by token count if truncation info not available
      truncated = true;
      truncatedSections.push('Context exceeded token limit');
      warnings.push({
        type: 'truncation',
        message: `Context was truncated from ${totalTokens} to ${tokenLimit} tokens`,
        severity: 'medium',
        impact: 'Some relevant information may have been excluded, potentially affecting response accuracy',
        remediation: 'Consider expanding the token limit or refining your query to focus on specific information.',
      });
    }

    // Source analysis
    const sourceTypes = new Set<string>();
    context.related.forEach(r => {
      if (r.shardTypeId) sourceTypes.add(r.shardTypeId);
    });
    context.ragChunks.forEach(c => {
      if (c.shardTypeId) sourceTypes.add(c.shardTypeId);
    });

    // Relevance analysis
    const relevanceScores = context.ragChunks
      .map(c => c.score || 0)
      .filter(s => s > 0);
    const averageRelevance = relevanceScores.length > 0
      ? relevanceScores.reduce((sum, s) => sum + s, 0) / relevanceScores.length
      : 0;

    // Relevance distribution
    const relevanceDistribution = [
      { range: '0.0-0.5', count: relevanceScores.filter(s => s >= 0 && s < 0.5).length },
      { range: '0.5-0.7', count: relevanceScores.filter(s => s >= 0.5 && s < 0.7).length },
      { range: '0.7-0.9', count: relevanceScores.filter(s => s >= 0.7 && s < 0.9).length },
      { range: '0.9-1.0', count: relevanceScores.filter(s => s >= 0.9 && s <= 1.0).length },
    ];

    // Check for missing expected sources
    const missingExpectedSources: string[] = [];
    if (expectedSources) {
      const foundSourceTypes = Array.from(sourceTypes);
      for (const expected of expectedSources) {
        if (!foundSourceTypes.includes(expected)) {
          missingExpectedSources.push(expected);
          warnings.push({
            type: 'missing_source',
            message: `Expected source type ${expected} not found in context`,
            severity: 'medium',
            impact: 'Response may lack information from this source type',
          });
        }
      }
    }

    // Calculate completeness
    const sourceCount = context.related.length + context.ragChunks.length;
    const minExpectedSources = expectedSources?.length || 3;
    const completeness = Math.min(1.0, sourceCount / minExpectedSources);

    // Phase 2.4: Check for fallback usage in RAG chunks
    const fallbackChunks = context.ragChunks.filter((chunk: any) => chunk._fallbackInfo);
    if (fallbackChunks.length > 0) {
      const fallbackInfo = (fallbackChunks[0] as any)._fallbackInfo;
      warnings.push({
        type: 'vector_search_fallback',
        message: fallbackInfo.reason || 'Vector search fallback was used',
        severity: fallbackInfo.vectorSearchFailed ? 'high' : 'medium',
        impact: 'Results may be less relevant as they were retrieved using fallback methods (keyword search or cached queries)',
        remediation: 'Vector search may be unavailable or returned insufficient results. Try refining your query or expanding the search scope.',
      });
    }

    // Phase 2.4: Check for stale cache usage
    const staleCacheChunks = context.ragChunks.filter((chunk: any) => chunk._fromStaleCache);
    const cacheStalenessInfo = (context.metadata as any)?.cacheStalenessInfo;
    if (staleCacheChunks.length > 0 || cacheStalenessInfo) {
      const stalenessInfo = cacheStalenessInfo || {
        isStale: true,
        isCriticallyStale: false,
        ageMs: (staleCacheChunks[0] as any)?._cacheAgeMs || 0,
        cachedAt: (staleCacheChunks[0] as any)?._cachedAt ? new Date((staleCacheChunks[0] as any)._cachedAt) : new Date(),
      };

      const ageMinutes = Math.floor(stalenessInfo.ageMs / 60000);
      warnings.push({
        type: 'stale_cache',
        message: `Context includes cached data from ${ageMinutes} minute(s) ago${stalenessInfo.isCriticallyStale ? ' (critically stale)' : stalenessInfo.isStale ? ' (stale)' : ''}`,
        severity: stalenessInfo.isCriticallyStale ? 'high' : stalenessInfo.isStale ? 'medium' : 'low',
        impact: stalenessInfo.isCriticallyStale
          ? 'Context is significantly outdated and may not reflect recent changes. Response accuracy may be compromised.'
          : stalenessInfo.isStale
          ? 'Context may be slightly outdated and may not reflect the most recent information.'
          : 'Context is from cache but still within acceptable freshness threshold.',
        remediation: stalenessInfo.isCriticallyStale
          ? 'Consider refreshing the query or waiting a moment for cache to update. Critical information may have changed.'
          : 'Context is cached but still relatively fresh. For the most up-to-date information, try rephrasing your query slightly.',
      });
    }

    // Phase 2.4: Get minimum requirements based on insight type
    const minimumRequirements = insightType
      ? INSIGHT_TYPE_REQUIREMENTS[insightType]
      : {
          minSourceCount: 3,
          minRelevanceScore: 0.5,
          allowEmpty: false,
        };

    // Phase 2.4: Check if context meets minimum requirements
    const meetsMinSourceCount = sourceCount >= minimumRequirements.minSourceCount;
    const meetsMinRelevance = averageRelevance >= minimumRequirements.minRelevanceScore || relevanceScores.length === 0;
    const meetsMinTokens = !minimumRequirements.minTokens || totalTokens >= minimumRequirements.minTokens;
    const meetsMinimumRequirements = meetsMinSourceCount && meetsMinRelevance && meetsMinTokens;

    // Phase 2.4: Check required source types
    if (minimumRequirements.requiredSourceTypes && minimumRequirements.requiredSourceTypes.length > 0) {
      const foundSourceTypes = Array.from(sourceTypes);
      const missingRequired = minimumRequirements.requiredSourceTypes.filter(
        req => !foundSourceTypes.includes(req)
      );
      if (missingRequired.length > 0) {
        warnings.push({
          type: 'missing_required_source',
          message: `Required source types missing: ${missingRequired.join(', ')}`,
          severity: 'high',
          impact: 'Response may be incomplete or inaccurate without these source types',
          remediation: `Add sources of type: ${missingRequired.join(', ')}`,
        });
      }
    }

    // Phase 2.4: Enhanced empty context handling
    if (sourceCount === 0) {
      if (minimumRequirements.allowEmpty) {
        warnings.push({
          type: 'empty_context_allowed',
          message: 'No sources available in context, but this operation type allows empty context',
          severity: 'low',
          impact: 'Response will be generated without system data grounding',
        });
      } else {
        warnings.push({
          type: 'empty_context',
          message: 'No sources available in context',
          severity: 'high',
          impact: 'Response cannot be grounded in system data and may contain hallucinations',
          remediation: 'Try refining your query, expanding the search scope, or adding relevant documents to the system',
        });
      }
    }

    // Phase 2.4: Enhanced low source count warning with operation-specific thresholds
    if (!meetsMinSourceCount && sourceCount > 0) {
      warnings.push({
        type: 'insufficient_source_count',
        message: `Only ${sourceCount} source(s) available, but ${minimumRequirements.minSourceCount} are recommended for ${insightType || 'this operation'}`,
        severity: sourceCount === 0 ? 'high' : 'medium',
        impact: 'Response may lack sufficient context and could be less accurate',
        remediation: `Try expanding your query or search scope to find more relevant sources`,
      });
    }

    // Phase 2.4: Enhanced low relevance warning with operation-specific thresholds
    if (!meetsMinRelevance && relevanceScores.length > 0) {
      warnings.push({
        type: 'insufficient_relevance',
        message: `Average relevance score is ${(averageRelevance * 100).toFixed(0)}%, but ${(minimumRequirements.minRelevanceScore * 100).toFixed(0)}% is recommended`,
        severity: averageRelevance < 0.3 ? 'high' : 'medium',
        impact: 'Response may be based on less relevant information',
        remediation: 'Try refining your query to be more specific or use different keywords',
      });
    }

    // Phase 2.4: Check minimum token requirements
    if (!meetsMinTokens && minimumRequirements.minTokens) {
      warnings.push({
        type: 'insufficient_tokens',
        message: `Context has ${totalTokens} tokens, but ${minimumRequirements.minTokens} are recommended`,
        severity: 'medium',
        impact: 'Response may lack sufficient detail',
        remediation: 'Try including more related documents or expanding the context scope',
      });
    }


    // Calculate overall quality score
    const qualityScore = this.calculateQualityScore(
      completeness,
      averageRelevance,
      sourceCount,
      truncated,
      missingExpectedSources.length
    );

    return {
      totalTokens,
      tokenLimit: tokenLimit || totalTokens,
      truncated,
      truncatedSections: truncatedSections.length > 0 ? truncatedSections : undefined,
      sourceCount,
      sourceTypes: Array.from(sourceTypes),
      averageRelevance,
      relevanceDistribution,
      missingExpectedSources,
      completeness,
      warnings,
      qualityScore,
      meetsMinimumRequirements, // Phase 2.4
      minimumRequirements, // Phase 2.4
    };
  }

  /**
   * Get minimum context requirements for an insight type
   * Phase 2.4: Context Edge Case Handling
   */
  getMinimumRequirements(insightType: InsightType): MinimumContextRequirements {
    return INSIGHT_TYPE_REQUIREMENTS[insightType];
  }

  /**
   * Check if context meets minimum requirements for an operation
   * Phase 2.4: Context Edge Case Handling
   */
  checkMinimumRequirements(
    context: AssembledContext,
    insightType: InsightType
  ): {
    meets: boolean;
    failures: string[];
    warnings: string[];
  } {
    const requirements = INSIGHT_TYPE_REQUIREMENTS[insightType];
    const sourceCount = context.related.length + context.ragChunks.length;
    const failures: string[] = [];
    const warnings: string[] = [];

    // Check source count
    if (sourceCount < requirements.minSourceCount) {
      if (sourceCount === 0 && !requirements.allowEmpty) {
        failures.push(`Empty context not allowed for ${insightType} operations`);
      } else {
        warnings.push(`Insufficient sources: ${sourceCount} < ${requirements.minSourceCount} required`);
      }
    }

    // Check relevance
    const relevanceScores = context.ragChunks
      .map(c => c.score || 0)
      .filter(s => s > 0);
    if (relevanceScores.length > 0) {
      const avgRelevance = relevanceScores.reduce((sum, s) => sum + s, 0) / relevanceScores.length;
      if (avgRelevance < requirements.minRelevanceScore) {
        warnings.push(`Low relevance: ${(avgRelevance * 100).toFixed(0)}% < ${(requirements.minRelevanceScore * 100).toFixed(0)}% required`);
      }
    }

    // Check tokens
    const totalTokens = this.estimateTokens(context.primary?.content || {}) +
      context.related.reduce((sum, r) => sum + this.estimateTokens(r.content || {}), 0) +
      context.ragChunks.reduce((sum, c) => sum + (c.tokenCount || this.estimateTokens(c.content)), 0);
    if (requirements.minTokens && totalTokens < requirements.minTokens) {
      warnings.push(`Insufficient tokens: ${totalTokens} < ${requirements.minTokens} required`);
    }

    // Check required source types
    const sourceTypes = new Set<string>();
    context.related.forEach(r => {
      if (r.shardTypeId) sourceTypes.add(r.shardTypeId);
    });
    context.ragChunks.forEach(c => {
      if (c.shardTypeId) sourceTypes.add(c.shardTypeId);
    });
    if (requirements.requiredSourceTypes) {
      const missing = requirements.requiredSourceTypes.filter(
        req => !sourceTypes.has(req)
      );
      if (missing.length > 0) {
        warnings.push(`Missing required source types: ${missing.join(', ')}`);
      }
    }

    return {
      meets: failures.length === 0,
      failures,
      warnings,
    };
  }

  /**
   * Estimate token count for content
   */
  private estimateTokens(content: any): number {
    if (typeof content === 'string') {
      // Rough estimate: ~4 characters per token
      return Math.ceil(content.length / 4);
    }
    if (typeof content === 'object' && content !== null) {
      const jsonString = JSON.stringify(content);
      return Math.ceil(jsonString.length / 4);
    }
    return 0;
  }

  /**
   * Calculate overall quality score (0-1)
   */
  private calculateQualityScore(
    completeness: number,
    averageRelevance: number,
    sourceCount: number,
    truncated: boolean,
    missingSourcesCount: number
  ): number {
    // Weight factors
    const completenessWeight = 0.3;
    const relevanceWeight = 0.3;
    const sourceCountWeight = 0.2;
    const truncationPenalty = truncated ? 0.15 : 0;
    const missingSourcesPenalty = Math.min(0.1, missingSourcesCount * 0.02);

    // Source count score (more is better, but with diminishing returns)
    const sourceCountScore = Math.min(1.0, sourceCount / 5);

    // Calculate score
    const score = 
      completeness * completenessWeight +
      averageRelevance * relevanceWeight +
      sourceCountScore * sourceCountWeight -
      truncationPenalty -
      missingSourcesPenalty;

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, score));
  }
}

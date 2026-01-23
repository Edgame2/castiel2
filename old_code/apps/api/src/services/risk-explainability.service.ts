/**
 * Risk Explainability Service
 * Generates structured explanations for risk detections
 * Replaces concatenated string explanations with structured format
 */

import type {
  RiskCatalog,
  RiskExplainability,
  DetectionMethod,
  HistoricalPattern,
} from '../types/risk-analysis.types.js';

export interface SemanticMatch {
  shardId: string;
  shardType: string;
  similarityScore: number;
}

export class RiskExplainabilityService {
  /**
   * Generate structured explanation for rule-based detection
   */
  generateRuleBasedExplanation(
    riskDef: RiskCatalog,
    matchedRules: string[],
    triggeringValues: Record<string, any>,
    sourceShardIds: string[]
  ): RiskExplainability {
    const summary = `Risk detected by rule-based analysis: ${riskDef.name}`;
    
    const standard = `This risk was identified through rule-based detection. ` +
      `The following rules matched: ${matchedRules.join(', ')}. ` +
      `Triggering values: ${JSON.stringify(triggeringValues)}.`;

    const detailed = `Rule-based detection identified ${riskDef.name} (${riskDef.category}) risk. ` +
      `Detection rules: ${JSON.stringify(riskDef.detectionRules)}. ` +
      `Matched conditions: ${matchedRules.join('; ')}. ` +
      `Field values that triggered detection: ${JSON.stringify(triggeringValues)}.`;

    return {
      detectionMethod: 'rule',
      confidence: 0.8, // Rule-based detections are generally high confidence
      evidence: {
        sourceShards: sourceShardIds,
        matchedRules,
      },
      reasoning: {
        summary,
        standard,
        detailed,
        technical: `Rule type: ${riskDef.detectionRules.type}. ` +
          `Conditions: ${JSON.stringify(riskDef.detectionRules.conditions)}. ` +
          `Confidence threshold: ${riskDef.detectionRules.confidenceThreshold}.`,
      },
      assumptions: [
        'Rule definitions are accurate and up-to-date',
        'Input data is correctly formatted',
      ],
      confidenceContributors: [
        { factor: 'Rule match certainty', contribution: 0.6 },
        { factor: 'Data quality', contribution: 0.2 },
        { factor: 'Rule definition quality', contribution: 0.2 },
      ],
    };
  }

  /**
   * Generate structured explanation for AI-powered detection
   */
  generateAIExplanation(
    aiReasoning: string,
    confidence: number,
    sourceShards: string[],
    riskDef: RiskCatalog
  ): RiskExplainability {
    const summary = `AI analysis identified ${riskDef.name} risk with ${(confidence * 100).toFixed(0)}% confidence`;
    
    const standard = `This risk was identified through AI-powered analysis. ` +
      `${aiReasoning.substring(0, 200)}${aiReasoning.length > 200 ? '...' : ''}`;

    const detailed = `AI-powered detection identified ${riskDef.name} (${riskDef.category}) risk. ` +
      `AI reasoning: ${aiReasoning}. ` +
      `Confidence level: ${(confidence * 100).toFixed(1)}%. ` +
      `Based on analysis of ${sourceShards.length} source shard(s).`;

    return {
      detectionMethod: 'ai',
      confidence,
      evidence: {
        sourceShards,
        aiReasoning,
      },
      reasoning: {
        summary,
        standard,
        detailed,
        technical: `AI model analysis. Confidence: ${confidence}. ` +
          `Source shards: ${sourceShards.join(', ')}. ` +
          `Full reasoning: ${aiReasoning}`,
      },
      assumptions: [
        'AI model is properly calibrated',
        'Context provided to AI was complete and accurate',
        'AI reasoning is based on available evidence',
      ],
      confidenceContributors: [
        { factor: 'AI model confidence', contribution: confidence },
        { factor: 'Evidence quality', contribution: 0.2 },
        { factor: 'Context completeness', contribution: 0.1 },
      ],
    };
  }

  /**
   * Generate structured explanation for historical pattern detection
   */
  generateHistoricalExplanation(
    patterns: HistoricalPattern[],
    riskDef: RiskCatalog
  ): RiskExplainability {
    const patternCount = patterns.length;
    const avgSimilarity = patterns.reduce((sum, p) => sum + p.similarityScore, 0) / patternCount;
    const lostCount = patterns.filter(p => p.outcome === 'lost').length;
    const winRate = patterns.reduce((sum, p) => sum + p.winRate, 0) / patternCount;

    const summary = `Historical pattern analysis: ${patternCount} similar opportunity(ies) found, ` +
      `${lostCount} were lost (${((lostCount / patternCount) * 100).toFixed(0)}% loss rate)`;

    const standard = `This risk was identified through historical pattern matching. ` +
      `Found ${patternCount} similar past opportunities with average similarity of ${(avgSimilarity * 100).toFixed(0)}%. ` +
      `${lostCount} of these opportunities were lost, indicating a ${((lostCount / patternCount) * 100).toFixed(0)}% loss rate.`;

    const detailed = `Historical pattern detection identified ${riskDef.name} (${riskDef.category}) risk. ` +
      `Analysis found ${patternCount} similar past opportunities: ` +
      patterns.map(p => 
        `Opportunity ${p.similarOpportunityId} (similarity: ${(p.similarityScore * 100).toFixed(0)}%, ` +
        `outcome: ${p.outcome}, win rate: ${(p.winRate * 100).toFixed(0)}%)`
      ).join('; ') + '.';

    return {
      detectionMethod: 'historical',
      confidence: Math.min(0.9, avgSimilarity * 0.8 + (lostCount / patternCount) * 0.2),
      evidence: {
        sourceShards: [],
        historicalPatterns: patterns.map(p => ({
          similarOpportunityId: p.similarOpportunityId,
          similarityScore: p.similarityScore,
          outcome: p.outcome,
        })),
      },
      reasoning: {
        summary,
        standard,
        detailed,
        technical: `Pattern count: ${patternCount}. ` +
          `Average similarity: ${(avgSimilarity * 100).toFixed(1)}%. ` +
          `Loss rate: ${((lostCount / patternCount) * 100).toFixed(1)}%. ` +
          `Average win rate: ${(winRate * 100).toFixed(1)}%.`,
      },
      assumptions: [
        'Historical data is representative of current situation',
        'Similarity scoring is accurate',
        'Past outcomes are predictive of future outcomes',
      ],
      confidenceContributors: [
        { factor: 'Pattern similarity', contribution: avgSimilarity },
        { factor: 'Loss rate', contribution: lostCount / patternCount },
        { factor: 'Sample size', contribution: Math.min(0.3, patternCount / 10) },
      ],
    };
  }

  /**
   * Generate structured explanation for semantic detection
   */
  generateSemanticExplanation(
    matches: SemanticMatch[],
    riskDef: RiskCatalog
  ): RiskExplainability {
    const matchCount = matches.length;
    const avgSimilarity = matches.reduce((sum, m) => sum + m.similarityScore, 0) / matchCount;

    const summary = `Semantic analysis found ${matchCount} related shard(s) with average similarity of ${(avgSimilarity * 100).toFixed(0)}%`;

    const standard = `This risk was identified through semantic similarity analysis. ` +
      `Found ${matchCount} related shard(s) that are semantically similar to known risk patterns. ` +
      `Average similarity score: ${(avgSimilarity * 100).toFixed(0)}%.`;

    const detailed = `Semantic detection identified ${riskDef.name} (${riskDef.category}) risk. ` +
      `Semantic analysis found ${matchCount} related shard(s): ` +
      matches.map(m => 
        `${m.shardType} (${m.shardId}) with similarity ${(m.similarityScore * 100).toFixed(0)}%`
      ).join('; ') + '.';

    return {
      detectionMethod: 'semantic',
      confidence: avgSimilarity * 0.7, // Semantic matches are generally lower confidence
      evidence: {
        sourceShards: matches.map(m => m.shardId),
        semanticMatches: matches,
      },
      reasoning: {
        summary,
        standard,
        detailed,
        technical: `Semantic match count: ${matchCount}. ` +
          `Average similarity: ${(avgSimilarity * 100).toFixed(1)}%. ` +
          `Matches: ${JSON.stringify(matches)}.`,
      },
      assumptions: [
        'Semantic similarity scoring is accurate',
        'Vector embeddings capture relevant risk patterns',
        'Similar content indicates similar risk profile',
      ],
      confidenceContributors: [
        { factor: 'Semantic similarity', contribution: avgSimilarity },
        { factor: 'Match count', contribution: Math.min(0.2, matchCount / 5) },
        { factor: 'Shard type relevance', contribution: 0.1 },
      ],
    };
  }

  /**
   * Merge multiple explanations when same risk detected by multiple methods
   */
  mergeExplanations(
    explanations: RiskExplainability[]
  ): RiskExplainability {
    if (explanations.length === 0) {
      throw new Error('Cannot merge empty explanations array');
    }

    if (explanations.length === 1) {
      return explanations[0];
    }

    // Determine primary detection method (prefer rule > historical > ai > semantic)
    const methodPriority: Record<DetectionMethod, number> = {
      rule: 4,
      historical: 3,
      ai: 2,
      semantic: 1,
    };

    const primaryExplanation = explanations.reduce((prev, curr) => 
      methodPriority[curr.detectionMethod] > methodPriority[prev.detectionMethod] ? curr : prev
    );

    // Merge evidence
    const allSourceShards = new Set<string>();
    const allMatchedRules: string[] = [];
    const allHistoricalPatterns: Array<{
      similarOpportunityId: string;
      similarityScore: number;
      outcome: 'won' | 'lost';
    }> = [];
    const allSemanticMatches: Array<{
      shardId: string;
      shardType: string;
      similarityScore: number;
    }> = [];
    let aiReasoning: string | undefined;

    for (const exp of explanations) {
      exp.evidence.sourceShards.forEach(shard => allSourceShards.add(shard));
      if (exp.evidence.matchedRules) {
        allMatchedRules.push(...exp.evidence.matchedRules);
      }
      if (exp.evidence.historicalPatterns) {
        allHistoricalPatterns.push(...exp.evidence.historicalPatterns);
      }
      if (exp.evidence.semanticMatches) {
        allSemanticMatches.push(...exp.evidence.semanticMatches);
      }
      if (exp.evidence.aiReasoning) {
        aiReasoning = exp.evidence.aiReasoning;
      }
    }

    // Calculate merged confidence (weighted average)
    const avgConfidence = explanations.reduce((sum, exp) => sum + exp.confidence, 0) / explanations.length;
    const mergedConfidence = Math.min(0.95, avgConfidence + (explanations.length - 1) * 0.05);

    // Merge reasoning
    const summary = `Risk detected by ${explanations.length} method(s): ${explanations.map(e => e.detectionMethod).join(', ')}`;
    const standard = `This risk was identified through multiple detection methods: ` +
      explanations.map(e => `${e.detectionMethod} (${(e.confidence * 100).toFixed(0)}% confidence)`).join(', ') + '. ' +
      primaryExplanation.reasoning.standard;
    
    const detailed = `Multi-method detection identified this risk. ` +
      explanations.map((e, i) => 
        `Method ${i + 1} (${e.detectionMethod}): ${e.reasoning.detailed}`
      ).join('\n\n');

    // Merge assumptions
    const allAssumptions = new Set<string>();
    for (const exp of explanations) {
      exp.assumptions.forEach(a => allAssumptions.add(a));
    }

    // Merge confidence contributors
    const contributorMap = new Map<string, number>();
    for (const exp of explanations) {
      for (const contrib of exp.confidenceContributors) {
        const existing = contributorMap.get(contrib.factor) || 0;
        contributorMap.set(contrib.factor, existing + contrib.contribution);
      }
    }
    const mergedContributors = Array.from(contributorMap.entries())
      .map(([factor, contribution]) => ({
        factor,
        contribution: contribution / explanations.length, // Average
      }))
      .sort((a, b) => b.contribution - a.contribution);

    return {
      detectionMethod: primaryExplanation.detectionMethod,
      confidence: mergedConfidence,
      evidence: {
        sourceShards: Array.from(allSourceShards),
        matchedRules: allMatchedRules.length > 0 ? allMatchedRules : undefined,
        aiReasoning,
        historicalPatterns: allHistoricalPatterns.length > 0 ? allHistoricalPatterns : undefined,
        semanticMatches: allSemanticMatches.length > 0 ? allSemanticMatches : undefined,
      },
      reasoning: {
        summary,
        standard,
        detailed,
        technical: `Merged from ${explanations.length} detection methods. ` +
          `Primary method: ${primaryExplanation.detectionMethod}. ` +
          `Confidence: ${(mergedConfidence * 100).toFixed(1)}%. ` +
          explanations.map((e, i) => 
            `Method ${i + 1}: ${e.reasoning.technical}`
          ).join('\n'),
      },
      assumptions: Array.from(allAssumptions),
      confidenceContributors: mergedContributors,
    };
  }
}

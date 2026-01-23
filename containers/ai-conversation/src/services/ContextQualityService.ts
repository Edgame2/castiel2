/**
 * Context Quality Service
 * Assesses quality of assembled context
 */

import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { AssembledContext } from './ContextAssemblyService';

export interface QualityAssessment {
  score: number;
  level: 'high' | 'medium' | 'low';
  metrics: {
    relevance: number;
    coverage: number;
    diversity: number;
    recency: number;
  };
  recommendations: string[];
}

export class ContextQualityService {
  private config: ReturnType<typeof loadConfig>;

  constructor() {
    this.config = loadConfig();
  }

  /**
   * Assess context quality
   */
  async assessQuality(context: AssembledContext): Promise<QualityAssessment> {
    try {
      const relevance = this.calculateRelevance(context);
      const coverage = this.calculateCoverage(context);
      const diversity = this.calculateDiversity(context);
      const recency = this.calculateRecency(context);

      const score = (relevance * 0.4 + coverage * 0.3 + diversity * 0.2 + recency * 0.1) * 100;
      const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

      const recommendations: string[] = [];
      if (relevance < 0.6) recommendations.push('Improve source relevance filtering');
      if (coverage < 0.5) recommendations.push('Expand context coverage');
      if (diversity < 0.4) recommendations.push('Increase source diversity');

      return {
        score,
        level,
        metrics: { relevance, coverage, diversity, recency },
        recommendations,
      };
    } catch (error: any) {
      log.error('Failed to assess context quality', error, {
        service: 'ai-conversation',
      });
      throw error;
    }
  }

  private calculateRelevance(context: AssembledContext): number {
    if (context.sources.length === 0) return 0;
    return context.sources.reduce((sum, s) => sum + s.relevanceScore, 0) / context.sources.length;
  }

  private calculateCoverage(context: AssembledContext): number {
    return Math.min(context.topics.length / 5, 1);
  }

  private calculateDiversity(context: AssembledContext): number {
    const uniqueTypes = new Set(context.sources.map(s => s.shardTypeId));
    return Math.min(uniqueTypes.size / 3, 1);
  }

  private calculateRecency(context: AssembledContext): number {
    // Assume recent if context was created recently
    const age = Date.now() - new Date(context.createdAt).getTime();
    return Math.max(0, 1 - age / (24 * 60 * 60 * 1000)); // Decay over 24 hours
  }
}

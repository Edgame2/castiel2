/**
 * Feedback Learning Service
 * Continuous improvement from user feedback on AI responses
 * Analyzes patterns in feedback to improve prompts, model selection, and context retrieval
 */

import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';

// ============================================
// Types
// ============================================

export interface FeedbackEntry {
  id: string;
  tenantId: string;
  userId: string;
  
  // Context
  conversationId: string;
  messageId: string;
  query: string;
  response: string;
  
  // Model info
  modelId: string;
  insightType?: string;
  contextTemplateId?: string;
  
  // Feedback
  rating: 'positive' | 'negative' | 'neutral';
  thumbs?: 'up' | 'down';
  score?: number;  // 1-5
  categories?: FeedbackCategory[];
  comment?: string;
  wasRegenerated?: boolean;
  
  // Metrics at time of response
  latencyMs?: number;
  tokensUsed?: number;
  
  createdAt: Date;
}

export type FeedbackCategory =
  | 'accurate'
  | 'helpful'
  | 'clear'
  | 'complete'
  | 'inaccurate'
  | 'unhelpful'
  | 'confusing'
  | 'incomplete'
  | 'too_long'
  | 'too_short'
  | 'off_topic'
  | 'outdated'
  | 'hallucination';

export interface FeedbackAnalysis {
  period: string;
  totalFeedback: number;
  
  // Ratings
  positiveRate: number;
  negativeRate: number;
  averageScore: number;
  
  // Categories
  topPositiveCategories: Array<{ category: string; count: number }>;
  topNegativeCategories: Array<{ category: string; count: number }>;
  
  // By dimension
  byModel: Record<string, ModelFeedback>;
  byInsightType: Record<string, TypeFeedback>;
  byTimeOfDay: Record<string, number>;
  
  // Patterns
  problematicPatterns: ProblematicPattern[];
  successPatterns: SuccessPattern[];
  
  // Recommendations
  recommendations: LearningRecommendation[];
}

export interface ModelFeedback {
  modelId: string;
  totalResponses: number;
  positiveRate: number;
  negativeRate: number;
  avgScore: number;
  regenerationRate: number;
}

export interface TypeFeedback {
  insightType: string;
  totalResponses: number;
  positiveRate: number;
  negativeRate: number;
  avgScore: number;
  topIssues: string[];
}

export interface ProblematicPattern {
  pattern: string;
  occurrences: number;
  negativeFeedbackRate: number;
  examples: string[];
  suggestedFix: string;
}

export interface SuccessPattern {
  pattern: string;
  occurrences: number;
  positiveFeedbackRate: number;
  characteristics: string[];
}

export interface LearningRecommendation {
  id: string;
  type: 'prompt' | 'model' | 'context' | 'retrieval';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  expectedImpact: string;
  evidence: string[];
}

export interface PromptImprovement {
  templateId: string;
  originalPrompt: string;
  improvedPrompt: string;
  reason: string;
  expectedImprovement: number;
  basedOnFeedback: string[];
}

// ============================================
// Service
// ============================================

export class FeedbackLearningService {
  private readonly FEEDBACK_KEY = 'ai:feedback:';
  private readonly ANALYSIS_KEY = 'ai:feedback:analysis:';
  private readonly PATTERNS_KEY = 'ai:feedback:patterns:';
  private readonly IMPLICIT_SIGNAL_KEY = 'ai:feedback:implicit:';

  constructor(
    private readonly redis: Redis,
    private readonly monitoring: IMonitoringProvider
  ) {}

  // ============================================
  // Feedback Collection
  // ============================================

  /**
   * Record user feedback
   */
  async recordFeedback(feedback: Omit<FeedbackEntry, 'id' | 'createdAt'>): Promise<FeedbackEntry> {
    const entry: FeedbackEntry = {
      ...feedback,
      id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    // Store in tenant-specific list
    const key = `${this.FEEDBACK_KEY}${feedback.tenantId}`;
    await this.redis.lpush(key, JSON.stringify(entry));
    await this.redis.ltrim(key, 0, 9999); // Keep last 10k entries

    // Update real-time counters
    await this.updateCounters(entry);

    // Check for patterns (async, non-blocking)
    this.detectPatterns(entry).catch((error) => {
      this.monitoring.trackException(error as Error, {
        operation: 'feedback-learning.detect-patterns',
        entryId: entry.id,
      });
    });

    this.monitoring.trackEvent('feedback.recorded', {
      tenantId: feedback.tenantId,
      rating: feedback.rating,
      categories: feedback.categories ? JSON.stringify(feedback.categories) : undefined,
      modelId: feedback.modelId,
    });

    return entry;
  }

  /**
   * Record implicit signal (time spent, actions taken, dismissals, engagement)
   */
  async recordImplicitSignal(
    tenantId: string,
    userId: string,
    signalType: 'time_spent' | 'action_taken' | 'dismissal' | 'engagement',
    signalData: {
      value: number; // Normalized 0-1
      context?: {
        opportunityId?: string;
        recommendationId?: string;
        conversationId?: string;
        [key: string]: any;
      };
    }
  ): Promise<void> {
    const signal = {
      id: `implicit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      userId,
      signalType,
      value: signalData.value,
      context: signalData.context || {},
      timestamp: new Date(),
    };

    // Store in tenant-specific list
    const key = `${this.IMPLICIT_SIGNAL_KEY}${tenantId}:${userId}`;
    await this.redis.lpush(key, JSON.stringify(signal));
    await this.redis.ltrim(key, 0, 9999); // Keep last 10k entries

    this.monitoring.trackEvent('feedback.implicit_signal', {
      tenantId,
      userId,
      signalType,
      value: signalData.value,
    });
  }

  /**
   * Get user expertise level based on feedback patterns
   */
  async getUserExpertise(userId: string, tenantId: string): Promise<'novice' | 'intermediate' | 'expert'> {
    // Get user's feedback history
    const feedback = await this.getFeedback(tenantId, {
      limit: 100,
    });

    const userFeedback = feedback.filter((f) => f.userId === userId);

    if (userFeedback.length < 10) {
      return 'novice';
    }

    // Calculate expertise based on:
    // 1. Feedback consistency (experts give more consistent feedback)
    // 2. Feedback quality (experts provide more detailed feedback)
    // 3. Usage patterns (experts use system more effectively)

    const hasDetailedFeedback = userFeedback.some((f) => f.comment && f.comment.length > 50);
    const avgScore = userFeedback.reduce((sum, f) => sum + (f.score || 3), 0) / userFeedback.length;
    const feedbackVariance = this.calculateVariance(userFeedback.map((f) => f.score || 3));

    // Simple heuristic: experts have lower variance and higher average scores
    if (hasDetailedFeedback && feedbackVariance < 1.0 && avgScore > 4.0) {
      return 'expert';
    }

    if (userFeedback.length > 50 && avgScore > 3.5) {
      return 'intermediate';
    }

    return 'novice';
  }

  /**
   * Get signal reliability score
   */
  async getSignalReliability(signalType: string, tenantId: string): Promise<number> {
    // This would integrate with SignalWeightingService
    // For now, return default reliability
    return 0.5;
  }

  /**
   * Calculate variance of array
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Get feedback entries
   */
  async getFeedback(
    tenantId: string,
    options?: {
      limit?: number;
      rating?: 'positive' | 'negative' | 'neutral';
      modelId?: string;
      insightType?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<FeedbackEntry[]> {
    const key = `${this.FEEDBACK_KEY}${tenantId}`;
    const all = await this.redis.lrange(key, 0, options?.limit || 1000);
    
    let entries: FeedbackEntry[] = all.map(item => JSON.parse(item));

    // Apply filters
    if (options?.rating) {
      entries = entries.filter(e => e.rating === options.rating);
    }
    if (options?.modelId) {
      entries = entries.filter(e => e.modelId === options.modelId);
    }
    if (options?.insightType) {
      entries = entries.filter(e => e.insightType === options.insightType);
    }
    if (options?.startDate) {
      entries = entries.filter(e => new Date(e.createdAt) >= options.startDate!);
    }
    if (options?.endDate) {
      entries = entries.filter(e => new Date(e.createdAt) <= options.endDate!);
    }

    return entries;
  }

  // ============================================
  // Analysis
  // ============================================

  /**
   * Analyze feedback patterns
   */
  async analyzeFeedback(tenantId: string, period: 'day' | 'week' | 'month'): Promise<FeedbackAnalysis> {
    const periodDays = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    
    const entries = await this.getFeedback(tenantId, {
      limit: 10000,
      startDate,
    });

    if (entries.length === 0) {
      return this.emptyAnalysis(period);
    }

    // Basic metrics
    const positive = entries.filter(e => e.rating === 'positive').length;
    const negative = entries.filter(e => e.rating === 'negative').length;
    const withScore = entries.filter(e => e.score !== undefined);
    const avgScore = withScore.length > 0
      ? withScore.reduce((sum, e) => sum + (e.score || 0), 0) / withScore.length
      : 0;

    // Category analysis
    const positiveCats: Record<string, number> = {};
    const negativeCats: Record<string, number> = {};
    
    for (const entry of entries) {
      for (const cat of entry.categories || []) {
        if (entry.rating === 'positive') {
          positiveCats[cat] = (positiveCats[cat] || 0) + 1;
        } else if (entry.rating === 'negative') {
          negativeCats[cat] = (negativeCats[cat] || 0) + 1;
        }
      }
    }

    // Model analysis
    const byModel: Record<string, ModelFeedback> = {};
    const modelGroups = this.groupBy(entries, 'modelId');
    
    for (const [modelId, modelEntries] of Object.entries(modelGroups)) {
      const modelPositive = modelEntries.filter(e => e.rating === 'positive').length;
      const modelNegative = modelEntries.filter(e => e.rating === 'negative').length;
      const modelWithScore = modelEntries.filter(e => e.score !== undefined);
      const modelRegens = modelEntries.filter(e => e.wasRegenerated).length;

      byModel[modelId] = {
        modelId,
        totalResponses: modelEntries.length,
        positiveRate: modelPositive / modelEntries.length,
        negativeRate: modelNegative / modelEntries.length,
        avgScore: modelWithScore.length > 0
          ? modelWithScore.reduce((sum, e) => sum + (e.score || 0), 0) / modelWithScore.length
          : 0,
        regenerationRate: modelRegens / modelEntries.length,
      };
    }

    // Insight type analysis
    const byInsightType: Record<string, TypeFeedback> = {};
    const typeGroups = this.groupBy(entries.filter(e => e.insightType), 'insightType');
    
    for (const [type, typeEntries] of Object.entries(typeGroups)) {
      const typePositive = typeEntries.filter(e => e.rating === 'positive').length;
      const typeNegative = typeEntries.filter(e => e.rating === 'negative').length;
      const typeNegCats = typeEntries
        .filter(e => e.rating === 'negative')
        .flatMap(e => e.categories || []);

      byInsightType[type] = {
        insightType: type,
        totalResponses: typeEntries.length,
        positiveRate: typePositive / typeEntries.length,
        negativeRate: typeNegative / typeEntries.length,
        avgScore: 0,
        topIssues: [...new Set(typeNegCats)].slice(0, 5),
      };
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(entries, byModel, byInsightType);

    // Detect patterns
    const problematicPatterns = await this.detectProblematicPatterns(entries);
    const successPatterns = await this.detectSuccessPatterns(entries);

    return {
      period,
      totalFeedback: entries.length,
      positiveRate: positive / entries.length,
      negativeRate: negative / entries.length,
      averageScore: avgScore,
      topPositiveCategories: Object.entries(positiveCats)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      topNegativeCategories: Object.entries(negativeCats)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      byModel,
      byInsightType,
      byTimeOfDay: {},
      problematicPatterns,
      successPatterns,
      recommendations,
    };
  }

  /**
   * Get model-specific feedback insights
   */
  async getModelInsights(tenantId: string, modelId: string): Promise<{
    feedback: ModelFeedback;
    recentIssues: string[];
    suggestions: string[];
  }> {
    const entries = await this.getFeedback(tenantId, { modelId, limit: 500 });
    
    if (entries.length === 0) {
      return {
        feedback: {
          modelId,
          totalResponses: 0,
          positiveRate: 0,
          negativeRate: 0,
          avgScore: 0,
          regenerationRate: 0,
        },
        recentIssues: [],
        suggestions: [],
      };
    }

    const positive = entries.filter(e => e.rating === 'positive').length;
    const negative = entries.filter(e => e.rating === 'negative').length;
    const regens = entries.filter(e => e.wasRegenerated).length;
    const withScore = entries.filter(e => e.score !== undefined);

    const negativeCategories = entries
      .filter(e => e.rating === 'negative')
      .flatMap(e => e.categories || []);

    const suggestions: string[] = [];
    
    if (negativeCategories.includes('too_long')) {
      suggestions.push('Consider reducing max_tokens or adding conciseness instructions');
    }
    if (negativeCategories.includes('hallucination')) {
      suggestions.push('Increase grounding requirements and citation enforcement');
    }
    if (negativeCategories.includes('incomplete')) {
      suggestions.push('Improve context retrieval to provide more relevant information');
    }

    return {
      feedback: {
        modelId,
        totalResponses: entries.length,
        positiveRate: positive / entries.length,
        negativeRate: negative / entries.length,
        avgScore: withScore.length > 0
          ? withScore.reduce((sum, e) => sum + (e.score || 0), 0) / withScore.length
          : 0,
        regenerationRate: regens / entries.length,
      },
      recentIssues: [...new Set(negativeCategories)].slice(0, 10),
      suggestions,
    };
  }

  // ============================================
  // Learning & Improvement
  // ============================================

  /**
   * Generate prompt improvements based on feedback
   */
  async suggestPromptImprovements(
    tenantId: string,
    templateId: string
  ): Promise<PromptImprovement[]> {
    const entries = await this.getFeedback(tenantId, {
      limit: 1000,
    });

    const templateEntries = entries.filter(e => e.contextTemplateId === templateId);
    if (templateEntries.length < 10) {
      return []; // Not enough data
    }

    const negativeEntries = templateEntries.filter(e => e.rating === 'negative');
    const improvements: PromptImprovement[] = [];

    // Analyze negative feedback patterns
    const issueCategories = negativeEntries.flatMap(e => e.categories || []);
    const issueCounts: Record<string, number> = {};
    
    for (const cat of issueCategories) {
      issueCounts[cat] = (issueCounts[cat] || 0) + 1;
    }

    // Generate improvements based on top issues
    const sortedIssues = Object.entries(issueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    for (const [issue, count] of sortedIssues) {
      const improvement = this.getPromptImprovement(issue, count, negativeEntries.length);
      if (improvement) {
        improvements.push({
          templateId,
          originalPrompt: '',
          improvedPrompt: improvement.suggestion,
          reason: improvement.reason,
          expectedImprovement: improvement.expectedImprovement,
          basedOnFeedback: negativeEntries.slice(0, 5).map(e => e.id),
        });
      }
    }

    return improvements;
  }

  // ============================================
  // Private Methods
  // ============================================

  private async updateCounters(entry: FeedbackEntry): Promise<void> {
    const dateKey = new Date().toISOString().split('T')[0];
    const countersKey = `${this.FEEDBACK_KEY}counters:${entry.tenantId}:${dateKey}`;

    await this.redis.hincrby(countersKey, 'total', 1);
    await this.redis.hincrby(countersKey, entry.rating, 1);
    
    if (entry.modelId) {
      await this.redis.hincrby(countersKey, `model:${entry.modelId}`, 1);
    }
    
    await this.redis.expire(countersKey, 90 * 24 * 60 * 60); // 90 days
  }

  private async detectPatterns(entry: FeedbackEntry): Promise<void> {
    // Pattern detection for automatic learning
    // This would use NLP/ML in production
  }

  private async detectProblematicPatterns(entries: FeedbackEntry[]): Promise<ProblematicPattern[]> {
    const patterns: ProblematicPattern[] = [];
    const negativeEntries = entries.filter(e => e.rating === 'negative');

    if (negativeEntries.length < 5) {return patterns;}

    // Check for common issues
    const hallucinations = negativeEntries.filter(e => 
      e.categories?.includes('hallucination')
    );
    
    if (hallucinations.length > negativeEntries.length * 0.2) {
      patterns.push({
        pattern: 'Frequent hallucinations',
        occurrences: hallucinations.length,
        negativeFeedbackRate: hallucinations.length / negativeEntries.length,
        examples: hallucinations.slice(0, 3).map(e => e.response.substring(0, 100)),
        suggestedFix: 'Increase grounding requirements and add source verification',
      });
    }

    const tooLong = negativeEntries.filter(e => e.categories?.includes('too_long'));
    if (tooLong.length > negativeEntries.length * 0.15) {
      patterns.push({
        pattern: 'Responses too verbose',
        occurrences: tooLong.length,
        negativeFeedbackRate: tooLong.length / negativeEntries.length,
        examples: [],
        suggestedFix: 'Add conciseness instructions to prompts',
      });
    }

    return patterns;
  }

  private async detectSuccessPatterns(entries: FeedbackEntry[]): Promise<SuccessPattern[]> {
    const patterns: SuccessPattern[] = [];
    const positiveEntries = entries.filter(e => e.rating === 'positive');

    if (positiveEntries.length < 5) {return patterns;}

    // Analyze what makes responses successful
    const helpfulEntries = positiveEntries.filter(e => e.categories?.includes('helpful'));
    
    if (helpfulEntries.length > positiveEntries.length * 0.5) {
      patterns.push({
        pattern: 'Actionable responses',
        occurrences: helpfulEntries.length,
        positiveFeedbackRate: helpfulEntries.length / positiveEntries.length,
        characteristics: ['Specific recommendations', 'Clear next steps'],
      });
    }

    return patterns;
  }

  private generateRecommendations(
    entries: FeedbackEntry[],
    byModel: Record<string, ModelFeedback>,
    byInsightType: Record<string, TypeFeedback>
  ): LearningRecommendation[] {
    const recommendations: LearningRecommendation[] = [];

    // Model recommendations
    for (const [modelId, feedback] of Object.entries(byModel)) {
      if (feedback.negativeRate > 0.3) {
        recommendations.push({
          id: `rec_${modelId}`,
          type: 'model',
          priority: 'high',
          title: `High negative feedback for ${modelId}`,
          description: `This model has a ${(feedback.negativeRate * 100).toFixed(0)}% negative feedback rate`,
          expectedImpact: 'Reduce negative feedback by 20-40%',
          evidence: [`${feedback.totalResponses} responses analyzed`],
        });
      }

      if (feedback.regenerationRate > 0.25) {
        recommendations.push({
          id: `rec_regen_${modelId}`,
          type: 'model',
          priority: 'medium',
          title: `High regeneration rate for ${modelId}`,
          description: `${(feedback.regenerationRate * 100).toFixed(0)}% of responses are regenerated`,
          expectedImpact: 'Improve first-response quality',
          evidence: [`${feedback.totalResponses} responses analyzed`],
        });
      }
    }

    // Insight type recommendations
    for (const [type, feedback] of Object.entries(byInsightType)) {
      if (feedback.negativeRate > 0.25) {
        recommendations.push({
          id: `rec_type_${type}`,
          type: 'prompt',
          priority: feedback.negativeRate > 0.4 ? 'high' : 'medium',
          title: `Improve ${type} insight prompts`,
          description: `${type} insights have ${(feedback.negativeRate * 100).toFixed(0)}% negative feedback`,
          expectedImpact: 'Improve satisfaction for this insight type',
          evidence: feedback.topIssues,
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private getPromptImprovement(
    issue: string,
    count: number,
    totalNegative: number
  ): { suggestion: string; reason: string; expectedImprovement: number } | null {
    const improvements: Record<string, { suggestion: string; reason: string; expectedImprovement: number }> = {
      too_long: {
        suggestion: 'Add instruction: "Be concise. Limit response to 2-3 paragraphs unless more detail is specifically requested."',
        reason: 'Users find responses too verbose',
        expectedImprovement: 0.2,
      },
      hallucination: {
        suggestion: 'Add instruction: "Only provide information that can be directly verified from the provided context. If information is not available, say so."',
        reason: 'Responses contain unverified claims',
        expectedImprovement: 0.3,
      },
      incomplete: {
        suggestion: 'Add instruction: "Ensure all aspects of the question are addressed. If the question has multiple parts, address each one."',
        reason: 'Responses missing key information',
        expectedImprovement: 0.15,
      },
      off_topic: {
        suggestion: 'Add instruction: "Stay focused on the specific question asked. Do not include tangential information."',
        reason: 'Responses diverge from the question',
        expectedImprovement: 0.2,
      },
      confusing: {
        suggestion: 'Add instruction: "Structure your response clearly with headers or bullet points when appropriate. Use simple language."',
        reason: 'Users find responses hard to understand',
        expectedImprovement: 0.15,
      },
    };

    return improvements[issue] || null;
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const value = String(item[key] || 'unknown');
      groups[value] = groups[value] || [];
      groups[value].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private emptyAnalysis(period: string): FeedbackAnalysis {
    return {
      period,
      totalFeedback: 0,
      positiveRate: 0,
      negativeRate: 0,
      averageScore: 0,
      topPositiveCategories: [],
      topNegativeCategories: [],
      byModel: {},
      byInsightType: {},
      byTimeOfDay: {},
      problematicPatterns: [],
      successPatterns: [],
      recommendations: [],
    };
  }
}

// ============================================
// Factory
// ============================================

export function createFeedbackLearningService(
  redis: Redis,
  monitoring: IMonitoringProvider
): FeedbackLearningService {
  return new FeedbackLearningService(redis, monitoring);
}












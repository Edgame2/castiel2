/**
 * Feedback Learning Service
 * Continuous improvement from user feedback on AI responses
 * Analyzes patterns in feedback to improve prompts, model selection, and context retrieval
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
export interface FeedbackEntry {
    id: string;
    tenantId: string;
    userId: string;
    conversationId: string;
    messageId: string;
    query: string;
    response: string;
    modelId: string;
    insightType?: string;
    contextTemplateId?: string;
    rating: 'positive' | 'negative' | 'neutral';
    thumbs?: 'up' | 'down';
    score?: number;
    categories?: FeedbackCategory[];
    comment?: string;
    wasRegenerated?: boolean;
    latencyMs?: number;
    tokensUsed?: number;
    createdAt: Date;
}
export type FeedbackCategory = 'accurate' | 'helpful' | 'clear' | 'complete' | 'inaccurate' | 'unhelpful' | 'confusing' | 'incomplete' | 'too_long' | 'too_short' | 'off_topic' | 'outdated' | 'hallucination';
export interface FeedbackAnalysis {
    period: string;
    totalFeedback: number;
    positiveRate: number;
    negativeRate: number;
    averageScore: number;
    topPositiveCategories: Array<{
        category: string;
        count: number;
    }>;
    topNegativeCategories: Array<{
        category: string;
        count: number;
    }>;
    byModel: Record<string, ModelFeedback>;
    byInsightType: Record<string, TypeFeedback>;
    byTimeOfDay: Record<string, number>;
    problematicPatterns: ProblematicPattern[];
    successPatterns: SuccessPattern[];
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
export declare class FeedbackLearningService {
    private readonly redis;
    private readonly monitoring;
    private readonly FEEDBACK_KEY;
    private readonly ANALYSIS_KEY;
    private readonly PATTERNS_KEY;
    constructor(redis: Redis, monitoring: IMonitoringProvider);
    /**
     * Record user feedback
     */
    recordFeedback(feedback: Omit<FeedbackEntry, 'id' | 'createdAt'>): Promise<FeedbackEntry>;
    /**
     * Get feedback entries
     */
    getFeedback(tenantId: string, options?: {
        limit?: number;
        rating?: 'positive' | 'negative' | 'neutral';
        modelId?: string;
        insightType?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<FeedbackEntry[]>;
    /**
     * Analyze feedback patterns
     */
    analyzeFeedback(tenantId: string, period: 'day' | 'week' | 'month'): Promise<FeedbackAnalysis>;
    /**
     * Get model-specific feedback insights
     */
    getModelInsights(tenantId: string, modelId: string): Promise<{
        feedback: ModelFeedback;
        recentIssues: string[];
        suggestions: string[];
    }>;
    /**
     * Generate prompt improvements based on feedback
     */
    suggestPromptImprovements(tenantId: string, templateId: string): Promise<PromptImprovement[]>;
    private updateCounters;
    private detectPatterns;
    private detectProblematicPatterns;
    private detectSuccessPatterns;
    private generateRecommendations;
    private getPromptImprovement;
    private groupBy;
    private emptyAnalysis;
}
export declare function createFeedbackLearningService(redis: Redis, monitoring: IMonitoringProvider): FeedbackLearningService;
//# sourceMappingURL=feedback-learning.service.d.ts.map
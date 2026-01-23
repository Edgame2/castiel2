/**
 * Prompt A/B Testing Service
 * Manages prompt A/B test experiments, variant selection, and metrics tracking
 */
import { AIInsightsCosmosService } from './ai-insights/cosmos.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { PromptABTest, PromptABTestStatus, CreatePromptABTestInput, UpdatePromptABTestInput, PromptABTestResult } from '../types/prompt-ab-test.types.js';
import { InsightType } from '../types/ai-insights.types.js';
/**
 * Prompt A/B Testing Service
 */
export declare class PromptABTestService {
    private readonly cosmosService;
    private readonly monitoring;
    constructor(cosmosService: AIInsightsCosmosService, monitoring: IMonitoringProvider);
    /**
     * Create a new prompt A/B test experiment
     */
    createExperiment(tenantId: string, input: CreatePromptABTestInput, userId: string): Promise<PromptABTest>;
    /**
     * Get an experiment by ID
     */
    getExperiment(tenantId: string, experimentId: string): Promise<PromptABTest | null>;
    /**
     * List experiments
     */
    listExperiments(tenantId: string, options?: {
        status?: PromptABTestStatus;
        insightType?: InsightType;
        limit?: number;
        continuationToken?: string;
    }): Promise<{
        items: PromptABTest[];
        continuationToken?: string;
        hasMore: boolean;
    }>;
    /**
     * Update an experiment
     */
    updateExperiment(tenantId: string, experimentId: string, input: UpdatePromptABTestInput, userId: string): Promise<PromptABTest>;
    /**
     * Start an experiment
     */
    startExperiment(tenantId: string, experimentId: string, userId: string): Promise<PromptABTest>;
    /**
     * Pause an experiment
     */
    pauseExperiment(tenantId: string, experimentId: string, userId: string): Promise<PromptABTest>;
    /**
     * Complete an experiment
     */
    completeExperiment(tenantId: string, experimentId: string, userId: string): Promise<PromptABTest>;
    /**
     * Select a variant for a user (deterministic based on userId)
     */
    selectVariant(tenantId: string, userId: string, insightType: InsightType, slug?: string): Promise<{
        promptId: string;
        variantId: string;
        experimentId?: string;
    } | null>;
    /**
     * Record an experiment event (exposure, success, failure, feedback)
     */
    recordEvent(tenantId: string, experimentId: string, userId: string, event: {
        eventType: 'exposure' | 'success' | 'failure' | 'feedback';
        metrics: {
            tokensUsed?: number;
            latencyMs?: number;
            cost?: number;
            quality?: number;
            userFeedback?: number;
            feedbackType?: 'positive' | 'negative' | 'neutral';
        };
        context?: {
            insightId?: string;
            conversationId?: string;
            intent?: string;
        };
    }): Promise<void>;
    /**
     * Calculate experiment results
     */
    calculateResults(tenantId: string, experimentId: string): Promise<PromptABTest['results']>;
    /**
     * Get experiment results with detailed metrics
     */
    getResults(tenantId: string, experimentId: string): Promise<PromptABTestResult>;
    /**
     * Find active experiments matching criteria
     */
    private findActiveExperiments;
    /**
     * Check if user matches targeting criteria
     */
    private matchesTargeting;
    /**
     * Get or create assignment (deterministic based on userId)
     */
    private getOrCreateAssignment;
    /**
     * Get assignment
     */
    private getAssignment;
    /**
     * Update assignment
     */
    private updateAssignment;
    /**
     * Get experiment events
     */
    private getExperimentEvents;
    /**
     * Update experiment metrics (async aggregation)
     */
    private updateExperimentMetrics;
    /**
     * Calculate variant metrics from events
     */
    private calculateVariantMetrics;
    /**
     * Calculate statistical significance (simplified t-test)
     */
    private calculateStatisticalSignificance;
    /**
     * Get metric value from variant results
     */
    private getMetricValue;
    /**
     * Calculate percentile
     */
    private percentile;
    /**
     * Hash string to number (deterministic)
     */
    private hashString;
    /**
     * Validate status transition
     */
    private validateStatusTransition;
}
//# sourceMappingURL=prompt-ab-test.service.d.ts.map
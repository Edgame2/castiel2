/**
 * Prompt A/B Testing Types
 * Types for managing prompt A/B test experiments
 */
import { BaseDocument } from '../services/ai-insights/cosmos.service.js';
import { InsightType } from './ai-insights.types.js';
/**
 * Prompt A/B Test Experiment Status
 */
export declare enum PromptABTestStatus {
    Draft = "draft",
    Active = "active",
    Paused = "paused",
    Completed = "completed",
    Cancelled = "cancelled"
}
/**
 * Prompt Variant in an A/B Test
 */
export interface PromptVariant {
    variantId: string;
    promptId: string;
    promptSlug: string;
    name: string;
    trafficPercentage: number;
    description?: string;
}
/**
 * Variant Metrics
 */
export interface VariantMetrics {
    impressions: number;
    successfulResponses: number;
    failedResponses: number;
    averageTokens: number;
    averageLatencyMs: number;
    userFeedbackScore: number;
    positiveFeedback: number;
    negativeFeedback: number;
    totalCost: number;
    lastUsedAt?: Date;
}
/**
 * Prompt A/B Test Experiment
 */
export interface PromptABTest extends BaseDocument {
    type: 'promptABTest';
    name: string;
    description?: string;
    hypothesis?: string;
    insightType: InsightType;
    slug?: string;
    variants: PromptVariant[];
    trafficSplit: {
        [variantId: string]: number;
    };
    primaryMetric: 'quality' | 'latency' | 'satisfaction' | 'cost' | 'success_rate';
    successCriteria?: {
        metric: string;
        operator: '>' | '>=' | '<' | '<=';
        threshold: number;
        confidenceLevel: number;
    };
    targeting?: {
        tenantIds?: string[];
        userIds?: string[];
        tags?: string[];
    };
    status: PromptABTestStatus;
    startDate?: Date;
    endDate?: Date;
    minDuration?: number;
    minSamplesPerVariant?: number;
    metrics: {
        [variantId: string]: VariantMetrics;
    };
    results?: {
        winner?: string;
        statisticalSignificance?: number;
        confidenceLevel?: number;
        improvement?: number;
        completedAt?: Date;
    };
    createdBy: {
        userId: string;
        at: Date;
    };
    updatedBy?: {
        userId: string;
        at: Date;
    };
}
/**
 * Create Prompt A/B Test Input
 */
export interface CreatePromptABTestInput {
    name: string;
    description?: string;
    hypothesis?: string;
    insightType: InsightType;
    slug?: string;
    variants: Array<{
        variantId: string;
        promptId: string;
        promptSlug: string;
        name: string;
        trafficPercentage: number;
        description?: string;
    }>;
    primaryMetric: 'quality' | 'latency' | 'satisfaction' | 'cost' | 'success_rate';
    successCriteria?: {
        metric: string;
        operator: '>' | '>=' | '<' | '<=';
        threshold: number;
        confidenceLevel: number;
    };
    targeting?: {
        tenantIds?: string[];
        userIds?: string[];
        tags?: string[];
    };
    minDuration?: number;
    minSamplesPerVariant?: number;
}
/**
 * Update Prompt A/B Test Input
 */
export interface UpdatePromptABTestInput {
    name?: string;
    description?: string;
    hypothesis?: string;
    status?: PromptABTestStatus;
    variants?: PromptVariant[];
    trafficSplit?: {
        [variantId: string]: number;
    };
    successCriteria?: {
        metric: string;
        operator: '>' | '>=' | '<' | '<=';
        threshold: number;
        confidenceLevel: number;
    };
    targeting?: {
        tenantIds?: string[];
        userIds?: string[];
        tags?: string[];
    };
    endDate?: Date;
}
/**
 * Experiment Assignment (for deterministic variant selection)
 */
export interface ExperimentAssignment extends BaseDocument {
    type: 'experimentAssignment';
    experimentId: string;
    userId: string;
    variantId: string;
    assignedAt: Date;
    firstExposure?: Date;
    lastExposure?: Date;
    exposureCount: number;
}
/**
 * Experiment Event (for tracking metrics)
 */
export interface ExperimentEvent extends BaseDocument {
    type: 'experimentEvent';
    experimentId: string;
    assignmentId: string;
    userId: string;
    variantId: string;
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
    timestamp: Date;
}
/**
 * Prompt A/B Test Result
 */
export interface PromptABTestResult {
    experimentId: string;
    name: string;
    status: PromptABTestStatus;
    variants: Array<{
        variantId: string;
        name: string;
        metrics: VariantMetrics;
    }>;
    comparison?: {
        winner?: string;
        improvement?: number;
        statisticalSignificance?: number;
        confidenceLevel?: number;
    };
    charts?: {
        qualityOverTime?: Array<{
            date: string;
            control: number;
            treatment: number;
        }>;
        latencyDistribution?: Array<{
            range: string;
            control: number;
            treatment: number;
        }>;
        satisfactionBreakdown?: {
            control: {
                positive: number;
                neutral: number;
                negative: number;
            };
            treatment: {
                positive: number;
                neutral: number;
                negative: number;
            };
        };
    };
}
//# sourceMappingURL=prompt-ab-test.types.d.ts.map
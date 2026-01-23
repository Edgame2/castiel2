/**
 * Explainable AI (XAI) Service
 * Provides transparency into AI reasoning and decision-making
 * Helps users understand why AI gave specific responses
 */
import { IMonitoringProvider } from '@castiel/monitoring';
export interface ExplanationRequest {
    tenantId: string;
    responseId: string;
    response: string;
    query: string;
    context: ContextSource[];
    modelId: string;
    reasoning?: string;
}
export interface ContextSource {
    id: string;
    type: 'shard' | 'document' | 'web' | 'system';
    name: string;
    content: string;
    relevanceScore: number;
    usedInResponse: boolean;
}
export interface Explanation {
    id: string;
    responseId: string;
    summary: string;
    reasoningSteps: ReasoningStep[];
    sourceAttribution: SourceAttribution[];
    confidenceBreakdown: ConfidenceBreakdown;
    keyFactors: KeyFactor[];
    limitations: Limitation[];
    alternatives?: AlternativeInterpretation[];
    debug?: DebugInfo;
}
export interface ReasoningStep {
    stepNumber: number;
    type: 'understanding' | 'retrieval' | 'analysis' | 'synthesis' | 'validation';
    description: string;
    details?: string;
    confidence: number;
    duration?: number;
}
export interface SourceAttribution {
    sourceId: string;
    sourceName: string;
    sourceType: string;
    contribution: 'primary' | 'supporting' | 'background';
    relevance: number;
    excerpts: AttributedExcerpt[];
}
export interface AttributedExcerpt {
    text: string;
    usedForClaim: string;
    startIndex: number;
    endIndex: number;
}
export interface ConfidenceBreakdown {
    overall: number;
    factors: {
        sourceQuality: number;
        sourceCoverage: number;
        queryClarity: number;
        responseCoherence: number;
        groundingStrength: number;
    };
    explanation: string;
}
export interface KeyFactor {
    factor: string;
    influence: 'positive' | 'negative' | 'neutral';
    weight: number;
    description: string;
}
export interface Limitation {
    type: 'data_gap' | 'uncertainty' | 'assumption' | 'scope' | 'timeliness';
    description: string;
    impact: 'low' | 'medium' | 'high';
    mitigation?: string;
}
export interface AlternativeInterpretation {
    interpretation: string;
    probability: number;
    reasoning: string;
}
export interface DebugInfo {
    modelUsed: string;
    promptTokens: number;
    completionTokens: number;
    temperature: number;
    retrievalLatencyMs: number;
    generationLatencyMs: number;
    cacheHit: boolean;
    routingDecision?: string;
}
export declare class ExplainableAIService {
    private readonly monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Generate an explanation for an AI response
     */
    generateExplanation(request: ExplanationRequest): Promise<Explanation>;
    /**
     * Generate a simplified explanation for end users
     */
    generateSimpleExplanation(request: ExplanationRequest): Promise<{
        summary: string;
        sources: string[];
        confidence: string;
        limitations: string[];
    }>;
    private extractReasoningSteps;
    private analyzeSourceAttribution;
    private calculateConfidence;
    private identifyKeyFactors;
    private identifyLimitations;
    private generateAlternatives;
    private extractTopic;
    private findExcerpts;
    private determineContribution;
    private assessQueryClarity;
    private assessResponseCoherence;
    private generateConfidenceExplanation;
    private getFactorImprovement;
    private getConfidenceLabel;
    private generateSummary;
}
export declare function createExplainableAIService(monitoring: IMonitoringProvider): ExplainableAIService;
//# sourceMappingURL=explainable-ai.service.d.ts.map
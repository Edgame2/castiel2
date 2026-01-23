/**
 * Chain-of-Thought Reasoning Service
 * Implements step-by-step reasoning for complex queries
 * Breaks down complex questions into logical steps for better accuracy
 */
import { IMonitoringProvider } from '@castiel/monitoring';
export interface ReasoningRequest {
    tenantId: string;
    query: string;
    context: string[];
    insightType?: string;
    maxSteps?: number;
    showReasoning?: boolean;
}
export interface ReasoningStep {
    stepNumber: number;
    type: StepType;
    description: string;
    input: string;
    output: string;
    confidence: number;
    timeMs: number;
}
export type StepType = 'decompose' | 'retrieve' | 'analyze' | 'synthesize' | 'calculate' | 'compare' | 'conclude' | 'verify';
export interface ReasoningChain {
    originalQuery: string;
    steps: ReasoningStep[];
    finalAnswer: string;
    totalSteps: number;
    totalTimeMs: number;
    overallConfidence: number;
    reasoning?: string;
}
export interface ReasoningConfig {
    maxSteps: number;
    minConfidence: number;
    enableVerification: boolean;
    showReasoning: boolean;
    parallelSteps: boolean;
}
export declare class ChainOfThoughtService {
    private readonly llmService;
    private readonly monitoring;
    private config;
    constructor(llmService: {
        complete: (prompt: string, options?: any) => Promise<string>;
    }, monitoring: IMonitoringProvider, config?: Partial<ReasoningConfig>);
    /**
     * Execute chain-of-thought reasoning for a complex query
     */
    reason(request: ReasoningRequest): Promise<ReasoningChain>;
    private decompose;
    private analyzeSubQuestion;
    private synthesize;
    private verify;
    private parseSubQuestions;
    private mapQuestionType;
    private extractConfidence;
    private extractAccuracy;
    private extractCorrectedAnswer;
    private cleanAnswer;
    private buildReasoningExplanation;
    private getStepTitle;
    private createSimpleResponse;
    private createErrorResponse;
}
export declare function createChainOfThoughtService(llmService: {
    complete: (prompt: string, options?: any) => Promise<string>;
}, monitoring: IMonitoringProvider, config?: Partial<ReasoningConfig>): ChainOfThoughtService;
//# sourceMappingURL=chain-of-thought.service.d.ts.map
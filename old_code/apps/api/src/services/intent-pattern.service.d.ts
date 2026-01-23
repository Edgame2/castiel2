/**
 * Intent Pattern Service
 * Manages intent classification patterns with LLM-assisted generation
 */
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { IntentPattern, CreateIntentPatternInput, UpdateIntentPatternInput, ListIntentPatternsOptions, TestPatternInput, TestPatternResult, SuggestPatternFromSamplesInput, SuggestPatternFromSamplesResponse, PatternPerformanceMetrics, PatternListResponse } from '../types/intent-pattern.types.js';
import { UnifiedAIClient } from './ai/unified-ai-client.service.js';
import { AIConnectionService } from './ai-connection.service.js';
export declare class IntentPatternService {
    private monitoring;
    private unifiedAIClient?;
    private aiConnectionService?;
    private repository;
    constructor(monitoring: IMonitoringProvider, unifiedAIClient?: UnifiedAIClient | undefined, aiConnectionService?: AIConnectionService);
    /**
     * Initialize repository (ensure container exists)
     */
    initialize(): Promise<void>;
    /**
     * Create a new intent pattern
     */
    create(input: CreateIntentPatternInput, createdBy: string): Promise<IntentPattern>;
    /**
     * Get pattern by ID
     */
    findById(id: string): Promise<IntentPattern | null>;
    /**
     * List patterns with filters
     */
    list(options?: ListIntentPatternsOptions): Promise<PatternListResponse>;
    /**
     * Update pattern
     */
    update(id: string, input: UpdateIntentPatternInput, updatedBy: string): Promise<IntentPattern>;
    /**
     * Delete pattern
     */
    delete(id: string): Promise<void>;
    /**
     * Test pattern against sample queries
     */
    testPattern(input: TestPatternInput): Promise<TestPatternResult[]>;
    /**
     * LLM-assisted pattern generation from sample queries
     */
    suggestPatternFromSamples(input: SuggestPatternFromSamplesInput, tenantId?: string): Promise<SuggestPatternFromSamplesResponse>;
    /**
     * Get performance metrics for all patterns
     */
    getPerformanceMetrics(): Promise<PatternPerformanceMetrics>;
    /**
     * Get active patterns for intent classification
     * Used by IntentAnalyzerService
     */
    getActivePatterns(): Promise<IntentPattern[]>;
    /**
     * Record pattern match (for metrics tracking)
     */
    recordMatch(patternId: string, confidence: number, wasCorrect: boolean): Promise<void>;
}
//# sourceMappingURL=intent-pattern.service.d.ts.map
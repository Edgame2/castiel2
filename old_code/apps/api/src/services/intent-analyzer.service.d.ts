/**
 * Intent Analyzer Service
 * Analyzes user queries to determine intent, extract entities, and resolve scope
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { AIModelSelectionService } from './ai/ai-model-selection.service.js';
import { UnifiedAIClient } from './ai/unified-ai-client.service.js';
import { InsightType, IntentAnalysisResult, ContextScope } from '../types/ai-insights.types.js';
import type { ConversationMessage } from '../types/conversation.types.js';
/**
 * Intent Analyzer Service
 */
export declare class IntentAnalyzerService {
    private monitoring;
    private shardRepository;
    private shardTypeRepository;
    private redis?;
    private aiModelSelection?;
    private unifiedAIClient?;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, redis?: Redis | undefined, aiModelSelection?: AIModelSelectionService | undefined, unifiedAIClient?: UnifiedAIClient | undefined);
    /**
     * Analyze user query to determine intent
     * Enhanced with follow-up detection and conversation context
     */
    analyze(query: string, tenantId: string, context?: {
        conversationHistory?: string[] | ConversationMessage[];
        conversationMessages?: ConversationMessage[];
        previousIntent?: IntentAnalysisResult;
        previousResponse?: string;
        currentScope?: ContextScope;
        userPreferences?: Record<string, unknown>;
    }): Promise<IntentAnalysisResult>;
    /**
     * Attempt LLM-based intent classification. Falls back to null if unavailable/errors.
     */
    private classifyIntentWithLLM;
    /**
     * Detect multi-intent queries and decompose them
     * Returns null if not multi-intent, otherwise returns primary intent with secondary intents
     */
    private detectMultiIntent;
    /**
     * Parse LLM JSON output for multi-intent detection
     */
    private parseMultiIntentOutput;
    /**
     * Parse LLM JSON output for intent classification
     * Enhanced to handle various response formats (JSON, markdown code blocks, etc.)
     * Supports zero-shot classification with robust error handling
     */
    private parseLLMIntentOutput;
    /**
     * Classify insight type from query
     */
    private classifyInsightType;
    /**
     * Extract entities from query
     */
    private extractEntities;
    /**
     * Resolve entity references to shard IDs
     */
    private resolveEntityReferences;
    /**
     * Determine optimal context scope
     */
    private determineScope;
    /**
     * Parse time range string to date range
     */
    private parseTimeRange;
    /**
     * Estimate complexity and tokens
     */
    private estimateComplexity;
    /**
     * Suggest appropriate template based on intent and scope
     */
    private suggestTemplate;
    /**
     * Detect follow-up questions
     */
    isFollowUp(query: string, conversationHistory?: string[]): boolean;
    /**
     * Resolve pronouns and references in follow-up queries using conversation history
     * Uses LLM-based resolution when available, falls back to pattern-based
     */
    private resolveFollowUpReferences;
    /**
     * Merge follow-up context with previous scope
     */
    mergeFollowUpContext(currentQuery: string, previousScope: ContextScope, previousType: InsightType): {
        mergedQuery: string;
        mergedScope: ContextScope;
    };
}
//# sourceMappingURL=intent-analyzer.service.d.ts.map
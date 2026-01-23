/**
 * Insight Service
 * Main orchestrator for AI insight generation
 * Coordinates intent analysis, context assembly, LLM execution, and grounding
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { IntentAnalyzerService } from './intent-analyzer.service.js';
import { ContextTemplateService } from './context-template.service.js';
import { ConversationService } from './conversation.service.js';
import { AzureOpenAIService } from './azure-openai.service.js';
import { WebSearchContextIntegrationService } from './web-search/web-search-context-integration.service.js';
import { GroundingService } from './grounding.service.js';
import { AIModelSelectionService } from './ai/ai-model-selection.service.js';
import { UnifiedAIClient } from './ai/unified-ai-client.service.js';
import { AIConnectionService } from './ai/ai-connection.service.js';
import { AIToolExecutorService } from './ai/ai-tool-executor.service.js';
import { AIConfigService } from './ai-config.service.js';
import { PromptResolverService } from './ai-insights/prompt-resolver.service.js';
import { ContextAwareQueryParserService } from './context-aware-query-parser.service.js';
import { TenantProjectConfigService } from './tenant-project-config.service.js';
export interface IVectorSearchProvider {
    search(request: {
        tenantId: string;
        query: string;
        topK?: number;
        minScore?: number;
        projectId?: string;
        shardTypeIds?: string[];
    }): Promise<{
        results: {
            shardId: string;
            shardTypeId: string;
            shard?: {
                name: string;
            };
            content: string;
            chunkIndex?: number;
            score: number;
            highlight?: string;
        }[];
    }>;
}
import { InsightRequest, InsightResponse, InsightStreamEvent, QuickInsightRequest, QuickInsightResponse, Suggestion, ModelUnavailableResponse } from '../types/ai-insights.types.js';
/**
 * Insight Service - Main Orchestrator
 */
export declare class InsightService {
    private monitoring;
    private shardRepository;
    private shardTypeRepository;
    private intentAnalyzer;
    private contextTemplateService;
    private conversationService;
    private azureOpenAI;
    private groundingService?;
    private vectorSearch?;
    private webSearchContextIntegration?;
    private redis?;
    private aiModelSelection?;
    private unifiedAIClient?;
    private aiConnectionService?;
    private shardRelationshipService?;
    private promptResolver?;
    private contextAwareQueryParser?;
    private toolExecutor?;
    private aiConfigService?;
    private tenantProjectConfigService?;
    private projectContextService?;
    private multimodalAssetService?;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, intentAnalyzer: IntentAnalyzerService, contextTemplateService: ContextTemplateService, conversationService: ConversationService, azureOpenAI: AzureOpenAIService, groundingService?: GroundingService | undefined, vectorSearch?: IVectorSearchProvider | undefined, webSearchContextIntegration?: WebSearchContextIntegrationService | undefined, redis?: Redis | undefined, aiModelSelection?: AIModelSelectionService | undefined, unifiedAIClient?: UnifiedAIClient | undefined, aiConnectionService?: AIConnectionService | undefined, shardRelationshipService?: any | undefined, // ShardRelationshipService
    promptResolver?: PromptResolverService | undefined, // PromptResolverService - optional, falls back to hardcoded prompts if not available
    contextAwareQueryParser?: ContextAwareQueryParserService | undefined, // ContextAwareQueryParserService - optional, for shard-specific Q&A
    toolExecutor?: AIToolExecutorService | undefined, // AIToolExecutorService - optional, for function calling
    aiConfigService?: AIConfigService | undefined, // AIConfigService - optional, for cost tracking
    tenantProjectConfigService?: TenantProjectConfigService | undefined, // TenantProjectConfigService - optional, for tenant-specific token limits
    multimodalAssetService?: any);
    /**
     * Set multimodal asset service (for late initialization)
     */
    setMultimodalAssetService(service: any): void;
    /**
     * Generate insight (non-streaming)
     */
    generate(tenantId: string, userId: string, request: InsightRequest): Promise<InsightResponse | ModelUnavailableResponse>;
    /**
     * Generate insight with streaming
     */
    generateStream(tenantId: string, userId: string, request: InsightRequest): AsyncGenerator<InsightStreamEvent>;
    /**
     * Generate quick insight for a shard
     */
    quickInsight(tenantId: string, userId: string, request: QuickInsightRequest): Promise<QuickInsightResponse>;
    /**
     * Get suggested questions for a shard
     */
    getSuggestions(tenantId: string, shardId: string, limit?: number): Promise<Suggestion[]>;
    /**
     * Manage conversation memory with token limits
     * Keeps system messages + recent messages, summarizes older ones if needed
     */
    private manageConversationTokens;
    /**
     * Summarize old messages to preserve context
     */
    private summarizeMessages;
    /**
     * Assemble context for insight generation
     * Optimized for global scope with tenant-wide RAG and caching
     */
    private assembleContext;
    /**
     * Format context for LLM consumption
     */
    private formatContextForLLM;
    /**
     * Format multi-modal asset context for LLM
     */
    private formatAssetContextForLLM;
    /**
     * Get multimodal asset context chunks
     */
    private getMultimodalAssetContext;
    /**
     * Build system and user prompts
     * Uses PromptResolverService if available, falls back to hardcoded prompts
     */
    private buildPrompts;
    /**
     * Build default user prompt template
     */
    private buildDefaultUserPrompt;
    /**
     * Execute LLM call with function calling support
     */
    private executeLLM;
    /**
     * Ground response with citations
     */
    private groundResponse;
    /**
     * Generate follow-up suggestions
     */
    private generateSuggestions;
    /**
     * Format suggested action message for model unavailable errors
     */
    private formatSuggestedAction;
    /**
     * Save insight to conversation
     */
    private saveToConversation;
    /**
     * Estimate cost based on usage
     */
    private estimateCost;
    /**
     * Record cost usage for an insight generation
     */
    private recordCostUsage;
    /**
     * Rerank RAG chunks using semantic relevance scoring
     * Uses LLM to score each chunk's relevance to the query
     */
    private rerankRAGChunks;
    /**
     * Estimate token count
     */
    private estimateTokens;
}
//# sourceMappingURL=insight.service.d.ts.map
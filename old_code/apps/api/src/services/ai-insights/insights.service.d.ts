/**
 * AI Insights Service
 * Main orchestrator for the AI Insights pipeline
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import type { InsightRequest, InsightResponse, InsightStatus, StreamChunk } from '../../types/ai-insights.types';
import { AIInsightsCosmosService } from './cosmos.service';
import { IntentAnalyzerService } from '../ai/intent-analyzer.service';
import { ContextTemplateService } from '../ai/context-template.service';
import { ModelRouterService } from '../ai/model-router.service';
import { ConversationService } from '../ai/conversation.service';
/**
 * Main AI Insights Service
 * Orchestrates the complete insight generation pipeline:
 * 1. Intent Analysis
 * 2. Context Assembly
 * 3. Model Selection & Generation
 * 4. Grounding & Citation
 * 5. Storage & Delivery
 */
export declare class InsightsService {
    private monitoring;
    private cosmosService;
    private intentAnalyzer;
    private contextService;
    private modelRouter;
    private conversationService;
    constructor(monitoring: IMonitoringProvider, cosmosService: AIInsightsCosmosService, intentAnalyzer: IntentAnalyzerService, contextService: ContextTemplateService, modelRouter: ModelRouterService, conversationService: ConversationService);
    /**
     * Generate a new insight (non-streaming)
     */
    generateInsight(request: InsightRequest): Promise<InsightResponse>;
    /**
     * Generate insight with streaming (Server-Sent Events)
     */
    generateInsightStream(request: InsightRequest, onChunk: (chunk: StreamChunk) => void): Promise<InsightResponse>;
    /**
     * Get insight by ID
     */
    getInsight(tenantId: string, insightId: string, userId: string): Promise<InsightResponse | null>;
    /**
     * List insights with pagination
     */
    listInsights(tenantId: string, userId: string, options?: {
        limit?: number;
        continuationToken?: string;
        status?: InsightStatus;
    }): Promise<any>;
    /**
     * Delete insight
     */
    deleteInsight(tenantId: string, insightId: string, userId: string): Promise<void>;
    /**
     * Step 1: Analyze user intent
     */
    private analyzeIntent;
    /**
     * Step 2: Assemble context from shards
     */
    private assembleContext;
    /**
     * Step 3a: Select appropriate model
     */
    private selectModel;
    /**
     * Step 3b: Generate insight (non-streaming)
     */
    private generate;
    /**
     * Step 3c: Generate insight (streaming)
     */
    private generateStream;
    /**
     * Step 4: Ground response with citations
     */
    private ground;
    /**
     * Extract statements from generated content
     */
    private extractStatements;
    /**
     * Verify a statement against context
     */
    private verifyStatement;
    /**
     * Step 5: Store insight in Cosmos DB
     */
    private storeInsight;
    /**
     * Build system prompt based on intent
     */
    private buildSystemPrompt;
    /**
     * Build user prompt with context
     */
    private buildUserPrompt;
    /**
     * Get conversation history
     */
    private getConversationHistory;
}
//# sourceMappingURL=insights.service.d.ts.map
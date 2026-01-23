// @ts-nocheck
/**
 * AI Insights Service
 * Main orchestrator for the AI Insights pipeline
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import type { Container } from '@azure/cosmos';
import type {
    InsightRequest,
    InsightResponse,
    InsightStatus,
    StreamChunk,
    IntentAnalysisResult,
    AssembledContext,
    GroundingResult,
    PerformanceMetrics,
} from '../../types/ai-insights.types';
import { AIInsightsCosmosService } from './cosmos.service';
import { IntentAnalyzerService } from '../ai/intent-analyzer.service';
import { ContextTemplateService } from '../ai/context-template.service';
import { ModelRouterService } from '../ai/model-router.service';
import { ConversationService } from '../ai/conversation.service';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeUserInput } from '../../utils/input-sanitization.js';

/**
 * Main AI Insights Service
 * Orchestrates the complete insight generation pipeline:
 * 1. Intent Analysis
 * 2. Context Assembly
 * 3. Model Selection & Generation
 * 4. Grounding & Citation
 * 5. Storage & Delivery
 */
export class InsightsService {
    private monitoring: IMonitoringProvider;
    private cosmosService: AIInsightsCosmosService;
    private intentAnalyzer: IntentAnalyzerService;
    private contextService: ContextTemplateService;
    private modelRouter: ModelRouterService;
    private conversationService: ConversationService;

    constructor(
        monitoring: IMonitoringProvider,
        cosmosService: AIInsightsCosmosService,
        intentAnalyzer: IntentAnalyzerService,
        contextService: ContextTemplateService,
        modelRouter: ModelRouterService,
        conversationService: ConversationService
    ) {
        this.monitoring = monitoring;
        this.cosmosService = cosmosService;
        this.intentAnalyzer = intentAnalyzer;
        this.contextService = contextService;
        this.modelRouter = modelRouter;
        this.conversationService = conversationService;
    }

    /**
     * Generate a new insight (non-streaming)
     */
    async generateInsight(request: InsightRequest): Promise<InsightResponse> {
        const startTime = Date.now();
        const insightId = uuidv4();
        const conversationId = request.conversationId || uuidv4();

        try {
            // Initialize performance tracking
            const perf: Partial<PerformanceMetrics> = {
                intentAnalysisMs: 0,
                contextAssemblyMs: 0,
                modelGenerationMs: 0,
                groundingMs: 0,
                totalMs: 0,
                tokensUsed: { prompt: 0, completion: 0, total: 0 },
            };

            // Step 1: Analyze Intent
            const intentStart = Date.now();
            const intent = await this.analyzeIntent(request);
            perf.intentAnalysisMs = Date.now() - intentStart;

            // Step 2: Assemble Context
            const contextStart = Date.now();
            const context = await this.assembleContext(request, intent);
            perf.contextAssemblyMs = Date.now() - contextStart;

            // Step 3: Select Model & Generate
            const generateStart = Date.now();
            const modelInfo = await this.selectModel(request, intent);
            const generation = await this.generate(request, intent, context, modelInfo);
            perf.modelGenerationMs = Date.now() - generateStart;

            // Step 4: Ground & Verify
            const groundingStart = Date.now();
            const grounding = await this.ground(generation.content, context);
            perf.groundingMs = Date.now() - groundingStart;

            // Update token usage
            perf.tokensUsed = {
                prompt: generation.promptTokens,
                completion: generation.completionTokens,
                total: generation.promptTokens + generation.completionTokens,
            };

            // Calculate cost (if available)
            if (modelInfo.pricing) {
                perf.cost = {
                    amount:
                        (perf.tokensUsed.prompt / 1000) * modelInfo.pricing.promptPer1k +
                        (perf.tokensUsed.completion / 1000) * modelInfo.pricing.completionPer1k,
                    currency: 'USD',
                };
            }

            // Total time
            perf.totalMs = Date.now() - startTime;

            // Build response
            const response: InsightResponse = {
                id: insightId,
                tenantId: request.tenantId,
                userId: request.userId,
                conversationId,
                query: request.query,
                insightType: intent.insightType,
                status: 'completed',
                result: generation.content,
                citations: grounding.citations,
                context,
                intent,
                performance: perf,
                model: modelInfo,
                grounding: grounding.result,
                createdAt: new Date(),
                completedAt: new Date(),
            };

            // Step 5: Store Insight
            await this.storeInsight(response);

            // Track success
            this.monitoring.trackEvent('InsightGenerated', {
                insightId,
                tenantId: request.tenantId,
                userId: request.userId,
                insightType: intent.insightType,
                durationMs: perf.totalMs,
                tokensUsed: perf.tokensUsed.total,
                groundingScore: grounding.result.overallScore,
            });

            return response;
        } catch (error: any) {
            // Track failure
            this.monitoring.trackException(error, {
                insightId,
                tenantId: request.tenantId,
                userId: request.userId,
                query: request.query,
            });

            // Return error response
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorCode = (error && typeof error === 'object' && 'code' in error) 
                ? (error as { code?: string }).code || 'INSIGHT_GENERATION_ERROR'
                : 'INSIGHT_GENERATION_ERROR';
            const errorDetails = (error && typeof error === 'object' && 'details' in error)
                ? (error as { details?: unknown }).details
                : undefined;

            const errorResponse: InsightResponse = {
                id: insightId,
                tenantId: request.tenantId,
                userId: request.userId,
                conversationId,
                query: request.query,
                insightType: 'search',
                status: 'failed',
                citations: [],
                context: {} as any,
                intent: {} as any,
                performance: {
                    intentAnalysisMs: 0,
                    contextAssemblyMs: 0,
                    modelGenerationMs: 0,
                    groundingMs: 0,
                    totalMs: Date.now() - startTime,
                    tokensUsed: { prompt: 0, completion: 0, total: 0 },
                },
                model: {} as any,
                grounding: {
                    overallScore: 0,
                    citationsFound: 0,
                    citationsExpected: 0,
                    groundedStatements: 0,
                    totalStatements: 0,
                    hallucinationRisk: 'high',
                    verificationDetails: [],
                },
                createdAt: new Date(),
                error: {
                    code: errorCode,
                    message: errorMessage,
                    details: errorDetails,
                },
            };

            // Store failed insight for debugging
            await this.storeInsight(errorResponse);

            throw error;
        }
    }

    /**
     * Generate insight with streaming (Server-Sent Events)
     */
    async generateInsightStream(
        request: InsightRequest,
        onChunk: (chunk: StreamChunk) => void
    ): Promise<InsightResponse> {
        const startTime = Date.now();
        const insightId = uuidv4();
        const conversationId = request.conversationId || uuidv4();

        try {
            const perf: Partial<PerformanceMetrics> = {
                intentAnalysisMs: 0,
                contextAssemblyMs: 0,
                modelGenerationMs: 0,
                groundingMs: 0,
                totalMs: 0,
                tokensUsed: { prompt: 0, completion: 0, total: 0 },
            };

            // Step 1: Analyze Intent (stream)
            const intentStart = Date.now();
            const intent = await this.analyzeIntent(request);
            perf.intentAnalysisMs = Date.now() - intentStart;
            onChunk({
                type: 'intent',
                data: intent,
                timestamp: new Date(),
            });

            // Step 2: Assemble Context (stream)
            const contextStart = Date.now();
            const context = await this.assembleContext(request, intent);
            perf.contextAssemblyMs = Date.now() - contextStart;
            onChunk({
                type: 'context',
                data: {
                    shards: context.shards.length,
                    tokens: context.totalTokens,
                },
                timestamp: new Date(),
            });

            // Step 3: Select Model & Generate (stream tokens)
            const generateStart = Date.now();
            const modelInfo = await this.selectModel(request, intent);
            let fullContent = '';
            const generation = await this.generateStream(
                request,
                intent,
                context,
                modelInfo,
                (token: string) => {
                    fullContent += token;
                    onChunk({
                        type: 'token',
                        data: { token },
                        timestamp: new Date(),
                    });
                }
            );
            perf.modelGenerationMs = Date.now() - generateStart;

            // Step 4: Ground & Verify (stream citations)
            const groundingStart = Date.now();
            const grounding = await this.ground(fullContent, context);
            perf.groundingMs = Date.now() - groundingStart;
            onChunk({
                type: 'citation',
                data: grounding.citations,
                timestamp: new Date(),
            });

            // Grounding result
            onChunk({
                type: 'grounding',
                data: grounding.result,
                timestamp: new Date(),
            });

            // Update token usage
            perf.tokensUsed = {
                prompt: generation.promptTokens,
                completion: generation.completionTokens,
                total: generation.promptTokens + generation.completionTokens,
            };

            // Calculate cost
            if (modelInfo.pricing) {
                perf.cost = {
                    amount:
                        (perf.tokensUsed.prompt / 1000) * modelInfo.pricing.promptPer1k +
                        (perf.tokensUsed.completion / 1000) * modelInfo.pricing.completionPer1k,
                    currency: 'USD',
                };
            }

            perf.totalMs = Date.now() - startTime;

            // Build response
            const response: InsightResponse = {
                id: insightId,
                tenantId: request.tenantId,
                userId: request.userId,
                conversationId,
                query: request.query,
                insightType: intent.insightType,
                status: 'completed',
                result: fullContent,
                citations: grounding.citations,
                context,
                intent,
                performance: perf,
                model: modelInfo,
                grounding: grounding.result,
                createdAt: new Date(),
                completedAt: new Date(),
            };

            // Store insight
            await this.storeInsight(response);

            // Send complete event
            onChunk({
                type: 'complete',
                data: response,
                timestamp: new Date(),
            });

            // Track success
            this.monitoring.trackEvent('InsightGeneratedStream', {
                insightId,
                tenantId: request.tenantId,
                userId: request.userId,
                insightType: intent.insightType,
                durationMs: perf.totalMs,
                tokensUsed: perf.tokensUsed.total,
                groundingScore: grounding.result.overallScore,
            });

            return response;
        } catch (error: any) {
            this.monitoring.trackException(error, {
                insightId,
                tenantId: request.tenantId,
                userId: request.userId,
                query: request.query,
            });

            // Send error event
            onChunk({
                type: 'error',
                data: {
                    code: error.code || 'INSIGHT_GENERATION_ERROR',
                    message: error.message,
                },
                timestamp: new Date(),
            });

            throw error;
        }
    }

    /**
     * Get insight by ID
     */
    async getInsight(tenantId: string, insightId: string, userId: string): Promise<InsightResponse | null> {
        const container = this.cosmosService.getFeedbackContainer();
        const partitionKey = this.cosmosService.buildPartitionKey(tenantId, insightId, userId);

        return await this.cosmosService.read<InsightResponse>(container, insightId, partitionKey);
    }

    /**
     * List insights with pagination
     */
    async listInsights(
        tenantId: string,
        userId: string,
        options: {
            limit?: number;
            continuationToken?: string;
            status?: InsightStatus;
        } = {}
    ) {
        const container = this.cosmosService.getFeedbackContainer();
        const querySpec = {
            query: `
        SELECT * FROM c 
        WHERE c.tenantId = @tenantId 
        AND c.userId = @userId
        ${options.status ? 'AND c.status = @status' : ''}
        ORDER BY c.createdAt DESC
      `,
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@userId', value: userId },
                ...(options.status ? [{ name: '@status', value: options.status }] : []),
            ],
        };

        return await this.cosmosService.query<InsightResponse>(container, querySpec, {
            maxItems: options.limit || 20,
            continuationToken: options.continuationToken,
        });
    }

    /**
     * Delete insight
     */
    async deleteInsight(tenantId: string, insightId: string, userId: string): Promise<void> {
        const container = this.cosmosService.getFeedbackContainer();
        const partitionKey = this.cosmosService.buildPartitionKey(tenantId, insightId, userId);

        await this.cosmosService.delete(container, insightId, partitionKey);

        this.monitoring.trackEvent('InsightDeleted', {
            insightId,
            tenantId,
            userId,
        });
    }

    // =========================================================================
    // Private Helper Methods
    // =========================================================================

    /**
     * Step 1: Analyze user intent
     */
    private async analyzeIntent(request: InsightRequest): Promise<IntentAnalysisResult> {
        const startTime = Date.now();

        try {
            // Use existing IntentAnalyzerService
            const result = await this.intentAnalyzer.analyzeIntent(request.query, {
                tenantId: request.tenantId,
                userId: request.userId,
                shardId: request.shardId,
                shardType: request.shardType,
                conversationHistory: request.conversationId
                    ? await this.getConversationHistory(request.conversationId, request.tenantId)
                    : [],
            });

            this.monitoring.trackMetric('IntentAnalysisDuration', Date.now() - startTime, {
                tenantId: request.tenantId,
                insightType: result.insightType,
            });

            return result;
        } catch (error: any) {
            this.monitoring.trackException(error, {
                tenantId: request.tenantId,
                query: request.query,
            });
            throw error;
        }
    }

    /**
     * Step 2: Assemble context from shards
     */
    private async assembleContext(
        request: InsightRequest,
        intent: IntentAnalysisResult
    ): Promise<AssembledContext> {
        const startTime = Date.now();

        try {
            // Use existing ContextTemplateService
            const context = await this.contextService.assembleContext({
                tenantId: request.tenantId,
                userId: request.userId,
                query: request.query,
                scope: intent.scope,
                targetShardIds: intent.targetShardIds,
                targetShardTypes: intent.targetShardTypes,
                maxTokens: request.maxTokens || 4000,
            });

            this.monitoring.trackMetric('ContextAssemblyDuration', Date.now() - startTime, {
                tenantId: request.tenantId,
                shardsIncluded: context.shards.length,
                totalTokens: context.totalTokens,
            });

            return context;
        } catch (error: any) {
            this.monitoring.trackException(error, {
                tenantId: request.tenantId,
                query: request.query,
            });
            throw error;
        }
    }

    /**
     * Step 3a: Select appropriate model
     */
    private async selectModel(request: InsightRequest, intent: IntentAnalysisResult) {
        try {
            // Use existing ModelRouterService
            const model = await this.modelRouter.selectModel({
                tenantId: request.tenantId,
                userId: request.userId,
                insightType: intent.insightType,
                complexity: intent.entities.length > 3 ? 'complex' : 'simple',
                modelId: request.modelId, // User override
            });

            return {
                id: model.id,
                provider: model.provider,
                name: model.name,
                version: model.version,
                temperature: request.temperature ?? model.defaultTemperature ?? 0.7,
                maxTokens: request.maxTokens ?? model.defaultMaxTokens ?? 2000,
                pricing: model.pricing,
            };
        } catch (error: any) {
            this.monitoring.trackException(error, {
                tenantId: request.tenantId,
                insightType: intent.insightType,
            });
            throw error;
        }
    }

    /**
     * Step 3b: Generate insight (non-streaming)
     */
    private async generate(
        request: InsightRequest,
        intent: IntentAnalysisResult,
        context: AssembledContext,
        modelInfo: any
    ) {
        const startTime = Date.now();

        try {
            // Build system prompt
            const systemPrompt = this.buildSystemPrompt(intent);

            // Build user prompt
            const userPrompt = this.buildUserPrompt(request.query, context);

            // Call model
            const response = await this.modelRouter.generate({
                tenantId: request.tenantId,
                modelId: modelInfo.id,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: modelInfo.temperature,
                maxTokens: modelInfo.maxTokens,
                stream: false,
            });

            this.monitoring.trackMetric('ModelGenerationDuration', Date.now() - startTime, {
                tenantId: request.tenantId,
                modelId: modelInfo.id,
                tokensUsed: response.usage.totalTokens,
            });

            return {
                content: response.content,
                promptTokens: response.usage.promptTokens,
                completionTokens: response.usage.completionTokens,
            };
        } catch (error: any) {
            this.monitoring.trackException(error, {
                tenantId: request.tenantId,
                modelId: modelInfo.id,
            });
            throw error;
        }
    }

    /**
     * Step 3c: Generate insight (streaming)
     */
    private async generateStream(
        request: InsightRequest,
        intent: IntentAnalysisResult,
        context: AssembledContext,
        modelInfo: any,
        onToken: (token: string) => void
    ) {
        const startTime = Date.now();

        try {
            const systemPrompt = this.buildSystemPrompt(intent);
            const userPrompt = this.buildUserPrompt(request.query, context);

            const response = await this.modelRouter.generateStream(
                {
                    tenantId: request.tenantId,
                    modelId: modelInfo.id,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature: modelInfo.temperature,
                    maxTokens: modelInfo.maxTokens,
                },
                onToken
            );

            this.monitoring.trackMetric('ModelGenerationDurationStream', Date.now() - startTime, {
                tenantId: request.tenantId,
                modelId: modelInfo.id,
                tokensUsed: response.usage.totalTokens,
            });

            return {
                content: response.content,
                promptTokens: response.usage.promptTokens,
                completionTokens: response.usage.completionTokens,
            };
        } catch (error: any) {
            this.monitoring.trackException(error, {
                tenantId: request.tenantId,
                modelId: modelInfo.id,
            });
            throw error;
        }
    }

    /**
     * Step 4: Ground response with citations
     */
    private async ground(content: string, context: AssembledContext) {
        const startTime = Date.now();

        try {
            // Extract potential citations from content
            const statements = this.extractStatements(content);

            // Verify each statement against context
            const verificationDetails = await Promise.all(
                statements.map((statement) => this.verifyStatement(statement, context))
            );

            // Count grounded statements
            const groundedStatements = verificationDetails.filter((v) => v.grounded).length;
            const totalStatements = statements.length;

            // Build citations
            const citations = verificationDetails
                .filter((v) => v.grounded && v.sources.length > 0)
                .map((v, index) => ({
                    shardId: context.shards.find((s) => v.sources.includes(s.id))?.id || '',
                    shardType: context.shards.find((s) => v.sources.includes(s.id))?.type || '',
                    title: context.shards.find((s) => v.sources.includes(s.id))?.title,
                    excerpt: v.statement.substring(0, 200),
                    relevanceScore: v.confidence,
                }));

            // Calculate overall score
            const overallScore = totalStatements > 0 ? groundedStatements / totalStatements : 1.0;

            // Determine hallucination risk
            let hallucinationRisk: 'low' | 'medium' | 'high' = 'low';
            if (overallScore < 0.5) {hallucinationRisk = 'high';}
            else if (overallScore < 0.75) {hallucinationRisk = 'medium';}

            const result: GroundingResult = {
                overallScore,
                citationsFound: citations.length,
                citationsExpected: Math.ceil(totalStatements * 0.3), // Expect ~30% citation rate
                groundedStatements,
                totalStatements,
                hallucinationRisk,
                verificationDetails,
            };

            this.monitoring.trackMetric('GroundingDuration', Date.now() - startTime, {
                overallScore,
                hallucinationRisk,
            });

            return { result, citations };
        } catch (error: any) {
            this.monitoring.trackException(error, {
                context: 'grounding',
            });

            // Return minimal grounding on error
            return {
                result: {
                    overallScore: 0.5,
                    citationsFound: 0,
                    citationsExpected: 0,
                    groundedStatements: 0,
                    totalStatements: 0,
                    hallucinationRisk: 'medium' as const,
                    verificationDetails: [],
                },
                citations: [],
            };
        }
    }

    /**
     * Extract statements from generated content
     */
    private extractStatements(content: string): string[] {
        // Split by sentence boundaries
        return content
            .split(/[.!?]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 10); // Ignore very short fragments
    }

    /**
     * Verify a statement against context
     */
    private async verifyStatement(statement: string, context: AssembledContext) {
        // Simple verification: check if statement words appear in context shards
        const statementWords = statement.toLowerCase().split(/\s+/);
        const matchingShards: string[] = [];
        let maxConfidence = 0;

        for (const shard of context.shards) {
            const shardContent = JSON.stringify(shard.content).toLowerCase();
            const matchingWords = statementWords.filter((word) => shardContent.includes(word));
            const confidence = matchingWords.length / statementWords.length;

            if (confidence > 0.3) {
                // 30% word overlap threshold
                matchingShards.push(shard.id);
                maxConfidence = Math.max(maxConfidence, confidence);
            }
        }

        return {
            statement,
            grounded: matchingShards.length > 0,
            confidence: maxConfidence,
            sources: matchingShards,
            reasoning: matchingShards.length > 0
                ? `Statement verified against ${matchingShards.length} shard(s)`
                : 'No matching context found',
        };
    }

    /**
     * Step 5: Store insight in Cosmos DB
     */
    private async storeInsight(response: InsightResponse): Promise<void> {
        const container = this.cosmosService.getFeedbackContainer();

        const document = {
            id: response.id,
            tenantId: response.tenantId,
            partitionKey: this.cosmosService.buildPartitionKey(
                response.tenantId,
                response.id,
                response.userId
            ),
            type: 'insight',
            ...response,
        };

        await this.cosmosService.create(container, document);
    }

    /**
     * Build system prompt based on intent
     */
    private buildSystemPrompt(intent: IntentAnalysisResult): string {
        const basePrompt = `You are an AI assistant specialized in generating insights from structured data.

Your task is to provide a ${intent.insightType} based on the provided context.

Guidelines:
- Be accurate and cite your sources
- Use clear, professional language
- Structure your response logically
- Highlight key findings prominently
- Include relevant data points and statistics
- Avoid speculation beyond the provided context`;

        // Add type-specific instructions
        const typeInstructions: Record<string, string> = {
            summary: '\n- Focus on the most important points\n- Keep it concise but comprehensive',
            analysis:
                '\n- Provide deep analysis\n- Identify patterns and trends\n- Explain implications',
            comparison:
                '\n- Highlight similarities and differences\n- Use structured comparisons\n- Provide balanced perspectives',
            recommendation:
                '\n- Provide actionable recommendations\n- Explain the reasoning\n- Consider trade-offs',
            prediction:
                '\n- Base predictions on historical data\n- Acknowledge uncertainties\n- Provide confidence levels',
            extraction:
                '\n- Extract specific data points\n- Format data clearly\n- Ensure completeness',
            search: '\n- Find relevant information\n- Rank by relevance\n- Provide context',
            clarification:
                '\n- Address the specific question\n- Provide clear explanations\n- Offer examples',
        };

        return basePrompt + (typeInstructions[intent.insightType] || '');
    }

    /**
     * Build user prompt with context
     */
    private buildUserPrompt(query: string, context: AssembledContext): string {
        // Sanitize user query to prevent prompt injection
        const sanitizedQuery = sanitizeUserInput(query);

        const contextText = context.shards
            .map((shard, index) => {
                return `
Source ${index + 1}: ${shard.title || shard.type} (ID: ${shard.id})
${shard.content}
---`;
            })
            .join('\n');

        return `Context Information:
${contextText}

User Query: ${sanitizedQuery}

Please provide a comprehensive response based on the context provided above.`;
    }

    /**
     * Get conversation history
     */
    private async getConversationHistory(conversationId: string, tenantId: string) {
        try {
            const conversation = await this.conversationService.getConversation(conversationId, tenantId);
            return conversation?.messages || [];
        } catch (error) {
            this.monitoring.trackException(error as Error, {
                conversationId,
                tenantId,
            });
            return [];
        }
    }
}

// @ts-nocheck - Optional service, not used by workers
/**
 * Insight Service
 * Main orchestrator for AI insight generation
 * Coordinates intent analysis, context assembly, LLM execution, and grounding
 */
import { v4 as uuidv4 } from 'uuid';
import { filterRagByAllowedIds } from './ai-insights/rag-filter.util.js';
import { ProjectContextService } from './ai-insights/project-context.service.js';
import { sanitizeUserInput } from '../utils/input-sanitization.js';
// Configuration
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4000;
const RAG_TOP_K = 10;
const RAG_MIN_SCORE = 0.7;
// Global chat optimization
const GLOBAL_RAG_TOP_K = 15; // More results for global scope
const GLOBAL_RAG_MIN_SCORE = 0.65; // Slightly lower threshold for broader search
const GLOBAL_CONTEXT_CACHE_TTL = 300; // 5 minutes cache for global context
// Fallback system prompts by insight type (used when prompt resolver is not available or fails)
const FALLBACK_SYSTEM_PROMPTS = {
    summary: `You are an expert business analyst. Provide clear, concise summaries that highlight the most important information. Structure your response with key points and takeaways.`,
    analysis: `You are an expert business analyst. Analyze the provided information thoroughly, identifying patterns, risks, opportunities, and key insights. Support your analysis with specific data points.`,
    comparison: `You are an expert at comparative analysis. Compare the provided items objectively, highlighting similarities, differences, strengths, and weaknesses. Use structured comparisons when helpful.`,
    recommendation: `You are a strategic advisor. Based on the context provided, offer specific, actionable recommendations. Prioritize your suggestions and explain the reasoning behind each.`,
    prediction: `You are a forecasting expert. Based on historical data and current trends, provide informed predictions. Always indicate confidence levels and key assumptions.`,
    extraction: `You are a data extraction specialist. Extract the requested information accurately and completely. Present extracted data in a clear, organized format.`,
    search: `You are a research assistant. Find and present relevant information from the provided context. Cite your sources and highlight the most relevant findings.`,
    generation: `You are a skilled content creator. Generate high-quality content based on the provided context and requirements. Match the requested tone and format.`,
};
// Grounding instructions
const GROUNDING_INSTRUCTION = `
IMPORTANT: Ground your response in the provided context.
- Only make claims that can be supported by the context
- When citing specific facts, use inline citations like [1], [2], etc.
- If information is not available in the context, say so clearly
- Distinguish between facts from context and your analysis/inference
`;
/**
 * Insight Service - Main Orchestrator
 */
export class InsightService {
    monitoring;
    shardRepository;
    shardTypeRepository;
    intentAnalyzer;
    contextTemplateService;
    conversationService;
    azureOpenAI;
    groundingService;
    vectorSearch;
    webSearchContextIntegration;
    redis;
    aiModelSelection;
    unifiedAIClient;
    aiConnectionService;
    shardRelationshipService;
    promptResolver;
    contextAwareQueryParser;
    toolExecutor;
    aiConfigService;
    tenantProjectConfigService;
    projectContextService;
    multimodalAssetService;
    constructor(monitoring, shardRepository, shardTypeRepository, intentAnalyzer, contextTemplateService, conversationService, azureOpenAI, groundingService, vectorSearch, webSearchContextIntegration, redis, aiModelSelection, unifiedAIClient, aiConnectionService, shardRelationshipService, // ShardRelationshipService
    promptResolver, // PromptResolverService - optional, falls back to hardcoded prompts if not available
    contextAwareQueryParser, // ContextAwareQueryParserService - optional, for shard-specific Q&A
    toolExecutor, // AIToolExecutorService - optional, for function calling
    aiConfigService, // AIConfigService - optional, for cost tracking
    tenantProjectConfigService, // TenantProjectConfigService - optional, for tenant-specific token limits
    multimodalAssetService // MultimodalAssetService - optional, for including assets in context
    ) {
        this.monitoring = monitoring;
        this.shardRepository = shardRepository;
        this.shardTypeRepository = shardTypeRepository;
        this.intentAnalyzer = intentAnalyzer;
        this.contextTemplateService = contextTemplateService;
        this.conversationService = conversationService;
        this.azureOpenAI = azureOpenAI;
        this.groundingService = groundingService;
        this.vectorSearch = vectorSearch;
        this.webSearchContextIntegration = webSearchContextIntegration;
        this.redis = redis;
        this.aiModelSelection = aiModelSelection;
        this.unifiedAIClient = unifiedAIClient;
        this.aiConnectionService = aiConnectionService;
        this.shardRelationshipService = shardRelationshipService;
        this.promptResolver = promptResolver;
        this.contextAwareQueryParser = contextAwareQueryParser;
        this.toolExecutor = toolExecutor;
        this.aiConfigService = aiConfigService;
        this.tenantProjectConfigService = tenantProjectConfigService;
        this.multimodalAssetService = multimodalAssetService;
        // Initialize ProjectContextService if dependencies are available
        if (this.shardRelationshipService) {
            this.projectContextService = new ProjectContextService(this.shardRepository, this.shardTypeRepository, this.shardRelationshipService, this.monitoring, this.vectorSearch // Cast to VectorSearchService if available
            );
        }
    }
    /**
     * Set multimodal asset service (for late initialization)
     */
    setMultimodalAssetService(service) {
        this.multimodalAssetService = service;
    }
    // ============================================
    // Main Generation Methods
    // ============================================
    /**
     * Generate insight (non-streaming)
     */
    async generate(tenantId, userId, request) {
        const startTime = Date.now();
        const requestId = uuidv4();
        this.monitoring.trackEvent('insight.generate.start', {
            tenantId,
            userId,
            query: request.query,
            modelId: request.modelId,
            requestId,
        });
        try {
            // 1. Retrieve conversation history if conversationId is provided
            let conversationHistory;
            if (request.conversationId) {
                try {
                    const messagesResult = await this.conversationService.getMessages(request.conversationId, tenantId, {
                        limit: 50, // Get more messages initially, will be token-managed
                        includeArchived: false, // Only active messages
                    });
                    const rawMessages = messagesResult.messages || [];
                    // Apply token management to conversation history
                    // Get tenant-specific token limit, fallback to request option, then default to 4000
                    let maxConversationTokens = request.options?.maxConversationTokens;
                    if (!maxConversationTokens && this.tenantProjectConfigService) {
                        try {
                            const tenantConfig = await this.tenantProjectConfigService.getTenantConfig(tenantId);
                            maxConversationTokens = tenantConfig.chatTokenLimit;
                        }
                        catch (error) {
                            this.monitoring.trackException(error, {
                                operation: 'insight.get-tenant-token-limit',
                                tenantId,
                            });
                            // Fall through to default
                        }
                    }
                    maxConversationTokens = maxConversationTokens || 4000;
                    conversationHistory = await this.manageConversationTokens(rawMessages, maxConversationTokens);
                    this.monitoring.trackEvent('insight.conversation-history-loaded', {
                        tenantId,
                        conversationId: request.conversationId,
                        originalMessageCount: rawMessages.length,
                        optimizedMessageCount: conversationHistory.length,
                        maxTokens: maxConversationTokens,
                    });
                }
                catch (error) {
                    this.monitoring.trackException(error, {
                        operation: 'insight.load-conversation-history',
                        tenantId,
                        conversationId: request.conversationId,
                    });
                    // Continue without conversation history if retrieval fails
                    conversationHistory = undefined;
                }
            }
            // 2. Sanitize user query to prevent prompt injection
            const sanitizedQuery = sanitizeUserInput(request.query);
            // Validate query length to prevent token exhaustion
            if (sanitizedQuery.length > 10000) {
                throw new Error('Query exceeds maximum length of 10000 characters');
            }
            // 3. Analyze intent with full conversation context
            this.monitoring.trackEvent('insight.analyzing-intent', {
                tenantId,
                userId,
                requestId,
                hasConversationHistory: !!conversationHistory,
            });
            // Extract previous intent and response from conversation history if available
            let previousIntent;
            let previousResponse;
            if (conversationHistory && conversationHistory.length > 0) {
                // Get last assistant message for previous response
                const lastAssistantMessage = conversationHistory
                    .filter(m => m.role === 'assistant')
                    .slice(-1)[0];
                if (lastAssistantMessage) {
                    previousResponse = lastAssistantMessage.content;
                }
                // Note: previousIntent would need to be stored in conversation metadata
                // For now, we'll rely on conversation history strings for context
            }
            const intent = await this.intentAnalyzer.analyze(sanitizedQuery, tenantId, {
                conversationHistory, // Pass both string[] and ConversationMessage[] support
                conversationMessages: conversationHistory, // Pass full message objects
                previousIntent, // Will be undefined for now, but structure is ready
                previousResponse,
                currentScope: request.scope,
            });
            this.monitoring.trackEvent('insight.intent-analyzed', {
                tenantId,
                userId,
                requestId,
                insightType: intent.insightType,
                confidence: intent.confidence,
            });
            // 3. Select optimal model using AI Model Selection Service
            let modelId;
            let modelName;
            if (this.aiModelSelection) {
                const selectionResult = await this.aiModelSelection.selectModel({
                    tenantId,
                    userId,
                    query: sanitizedQuery,
                    insightType: intent.insightType,
                    contextSize: request.options?.maxTokens || 4000,
                    requiredContentType: request.requiredContentType,
                    allowFallback: request.allowContentFallback ?? true,
                    maxCostUSD: request.budget?.maxCostUSD,
                    preferQuality: request.budget?.preferEconomy ? 'economy' : 'standard',
                    modelId: request.modelId,
                });
                if (!selectionResult.success) {
                    return {
                        success: false,
                        error: selectionResult.error,
                        message: selectionResult.message,
                        requestedContentType: request.requiredContentType,
                        availableAlternatives: selectionResult.suggestions.map(s => ({
                            modelId: '',
                            modelName: '',
                            contentType: 'text',
                            reason: s,
                        })),
                        availableTypes: selectionResult.availableTypes,
                        suggestedAction: this.formatSuggestedAction(selectionResult),
                    };
                }
                modelId = selectionResult.model.id;
                modelName = selectionResult.model.name;
                this.monitoring.trackEvent('insight.model-selected', {
                    tenantId,
                    userId,
                    modelId,
                    modelName,
                    reason: selectionResult.reason,
                    estimatedCost: selectionResult.estimatedCost,
                });
            }
            else {
                // Fallback if model selection service not available
                modelId = request.modelId || 'gpt-4o';
                modelName = modelId;
                // Store modelId for error handling
                this.lastSelectedModelId = modelId;
            }
            // 4. Assemble context (may parse query and detect entities)
            const context = await this.assembleContext(tenantId, intent, request);
            // 5. Use enhanced query if available (from entity parsing), otherwise use sanitized query
            // The enhanced query includes entity context injected by ContextAwareQueryParserService
            // Note: enhancedQuery should already be sanitized if it contains user input
            const queryToUse = context.metadata?.enhancedQuery || sanitizedQuery;
            // 6. Build prompts (now async to support prompt resolver)
            const { systemPrompt, userPrompt, experimentId, variantId } = await this.buildPrompts(tenantId, userId, intent, context, queryToUse, request.options, request.projectId || request.scope?.projectId);
            // 6. Execute LLM with function calling support
            // Tools are enabled by default unless explicitly disabled
            const toolsEnabled = request.options?.toolsEnabled !== false;
            const llmStartTime = Date.now();
            let llmResponse;
            let generationSuccess = false;
            try {
                llmResponse = await this.executeLLM(tenantId, userId, modelId, systemPrompt, userPrompt, request.options?.temperature, request.options?.maxTokens, request.projectId || request.scope?.projectId, toolsEnabled, request.userRoles // Pass user roles for permission checking in tool execution
                );
                generationSuccess = true;
            }
            catch (error) {
                // Record failure metric for A/B test if applicable
                if (experimentId && variantId && this.promptResolver) {
                    await this.promptResolver.recordABTestMetric(tenantId, userId, experimentId, variantId, {
                        eventType: 'failure',
                        metrics: {
                            latencyMs: Date.now() - llmStartTime,
                        },
                        context: {
                            insightId: requestId,
                            intent: intent.insightType,
                        },
                    }).catch((err) => {
                        // Non-blocking - don't fail the request if metric recording fails
                        this.monitoring.trackException(err, {
                            operation: 'insight.recordABTestMetric.failure',
                            tenantId,
                            experimentId,
                        });
                    });
                }
                throw error; // Re-throw to be handled by outer try-catch
            }
            // 7. Ground response
            // Validate content before grounding
            const content = llmResponse.content || '';
            if (!content.trim()) {
                this.monitoring.trackEvent('insight.empty_content', {
                    tenantId,
                    userId,
                    modelId,
                });
                throw new Error('AI model returned empty content');
            }
            // Validate content length to prevent memory exhaustion (max 500KB)
            const MAX_RESPONSE_LENGTH = 500000; // 500KB
            if (content.length > MAX_RESPONSE_LENGTH) {
                this.monitoring.trackEvent('insight.content_too_large', {
                    tenantId,
                    userId,
                    modelId,
                    contentLength: content.length,
                    maxLength: MAX_RESPONSE_LENGTH,
                });
                throw new Error(`AI model returned content exceeding maximum length of ${MAX_RESPONSE_LENGTH} characters`);
            }
            const grounded = await this.groundResponse(content, context);
            // 8. Generate suggestions
            const suggestedQuestions = this.generateSuggestions(intent, context);
            // 9. Build response
            // Initialize finalConversationId early (will be updated if conversation is auto-created)
            let finalConversationId = request.conversationId;
            const response = {
                content: grounded.groundedContent,
                format: request.options?.format || 'detailed',
                citations: grounded.citations,
                confidence: grounded.overallConfidence,
                groundingScore: grounded.groundingScore,
                sources: context.related.map(chunk => ({
                    shardId: chunk.shardId,
                    shardName: chunk.shardName,
                    shardTypeId: chunk.shardTypeId,
                    relevance: 1, // Could be enhanced with relevance scoring
                })),
                suggestedQuestions,
                usage: llmResponse.usage,
                cost: this.estimateCost(llmResponse.usage, modelId),
                latencyMs: Date.now() - startTime,
                insightType: intent.insightType,
                model: modelId,
                templateId: context.metadata.templateId,
                createdAt: new Date(),
                conversationId: finalConversationId, // Include conversationId in response for client reference
            };
            // 9a. Record cost usage if AIConfigService is available
            if (generationSuccess && this.aiConfigService && llmResponse.provider) {
                await this.recordCostUsage(tenantId, userId, llmResponse.provider, modelId, llmResponse.usage, response.cost, Date.now() - llmStartTime, {
                    conversationId: request.conversationId,
                    insightType: intent.insightType,
                    connectionId: llmResponse.connectionId,
                }).catch((err) => {
                    // Non-blocking - don't fail the request if cost recording fails
                    this.monitoring.trackException(err, {
                        operation: 'insight.recordCostUsage',
                        tenantId,
                    });
                });
            }
            // 9b. Record A/B test success metric if applicable
            if (generationSuccess && experimentId && variantId && this.promptResolver) {
                await this.promptResolver.recordABTestMetric(tenantId, userId, experimentId, variantId, {
                    eventType: 'success',
                    metrics: {
                        tokensUsed: llmResponse.usage.total,
                        latencyMs: Date.now() - llmStartTime,
                        cost: response.cost,
                        quality: grounded.groundingScore, // Use grounding score as quality proxy
                    },
                    context: {
                        insightId: requestId,
                        conversationId: request.conversationId,
                        intent: intent.insightType,
                    },
                }).catch((err) => {
                    // Non-blocking - don't fail the request if metric recording fails
                    this.monitoring.trackException(err, {
                        operation: 'insight.recordABTestMetric.success',
                        tenantId,
                        experimentId,
                    });
                });
            }
            // 10. Ensure conversation exists and save to it
            // Auto-create conversation if not provided to ensure all chat interactions are persisted
            // (finalConversationId already initialized above)
            if (!finalConversationId) {
                try {
                    // Create a new conversation for this chat session
                    const newConversation = await this.conversationService.create(tenantId, userId, {
                        title: request.query.substring(0, 100), // Use first 100 chars of query as title
                        visibility: 'private',
                        assistantId: request.assistantId,
                        templateId: request.templateId,
                        defaultModelId: modelId,
                        linkedShards: request.scope?.shardId ? [request.scope.shardId] : undefined,
                        tags: request.projectId ? [`project:${request.projectId}`] : undefined,
                    });
                    finalConversationId = newConversation.id;
                    // Update response with the new conversation ID
                    response.conversationId = finalConversationId;
                    this.monitoring.trackEvent('insight.conversation-auto-created', {
                        tenantId,
                        userId,
                        conversationId: finalConversationId,
                        hasProject: !!request.projectId,
                    });
                }
                catch (error) {
                    // Non-blocking: if conversation creation fails, log but continue
                    this.monitoring.trackException(error, {
                        operation: 'insight.auto-create-conversation',
                        tenantId,
                        userId,
                    });
                }
            }
            // Save to conversation if we have a conversationId (either provided or auto-created)
            if (finalConversationId) {
                await this.saveToConversation(finalConversationId, tenantId, userId, request.query, response, modelId, context);
            }
            this.monitoring.trackEvent('insight.generated', {
                requestId,
                tenantId,
                userId,
                insightType: intent.insightType,
                model: modelId,
                latencyMs: response.latencyMs,
                tokens: llmResponse.usage.total,
                groundingScore: grounded.groundingScore,
            });
            // Record model performance for learning (non-blocking)
            if (this.aiModelSelection) {
                const tokensPerSecond = llmResponse.usage.total > 0 && response.latencyMs > 0
                    ? (llmResponse.usage.total / response.latencyMs) * 1000
                    : undefined;
                this.aiModelSelection.recordModelPerformance(modelId, {
                    latencyMs: response.latencyMs,
                    tokensPerSecond,
                    success: true,
                    // satisfactionScore can be added later when feedback is collected
                }).catch((error) => {
                    // Non-critical, just log
                    this.monitoring.trackException(error, {
                        operation: 'insight.recordModelPerformance',
                        modelId,
                    });
                });
            }
            return response;
        }
        catch (error) {
            // Record model performance failure (if model was selected)
            // Note: modelId may not be defined if error occurred before model selection
            const errorModelId = this.lastSelectedModelId || request.modelId;
            if (this.aiModelSelection && errorModelId) {
                this.aiModelSelection.recordModelPerformance(errorModelId, {
                    latencyMs: Date.now() - startTime,
                    success: false,
                }).catch((error) => {
                    this.monitoring.trackException(error, {
                        operation: 'insight.recordIntentAnalysis',
                        tenantId,
                        userId,
                    });
                });
            }
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'insight.generate',
                requestId,
                tenantId,
                userId,
            });
            throw error;
        }
    }
    /**
     * Generate insight with streaming
     */
    async *generateStream(tenantId, userId, request) {
        const startTime = Date.now();
        const messageId = uuidv4();
        try {
            // 1. Sanitize user query to prevent prompt injection (must be done first)
            const sanitizedQuery = sanitizeUserInput(request.query);
            // Validate query length to prevent token exhaustion
            if (sanitizedQuery.length > 10000) {
                yield {
                    type: 'error',
                    code: 'INVALID_INPUT',
                    message: 'Query exceeds maximum length of 10000 characters',
                };
                return;
            }
            // 2. Select model
            const conversationId = request.conversationId || uuidv4();
            let modelId;
            if (this.aiModelSelection) {
                const selectionResult = await this.aiModelSelection.selectModel({
                    tenantId,
                    userId,
                    query: sanitizedQuery,
                    contextSize: request.options?.maxTokens || 4000,
                    requiredContentType: request.requiredContentType,
                    allowFallback: request.allowContentFallback ?? true,
                    maxCostUSD: request.budget?.maxCostUSD,
                    preferQuality: request.budget?.preferEconomy ? 'economy' : 'standard',
                    modelId: request.modelId,
                });
                if (!selectionResult.success) {
                    yield {
                        type: 'error',
                        code: selectionResult.error || 'MODEL_SELECTION_ERROR',
                        message: selectionResult.message || 'Failed to select model',
                    };
                    return;
                }
                modelId = selectionResult.model.id;
            }
            else {
                modelId = request.modelId || 'gpt-4o';
            }
            // 3. Emit start event
            yield {
                type: 'start',
                messageId,
                conversationId,
                model: modelId,
            };
            // 4. Analyze intent
            const intent = await this.intentAnalyzer.analyze(sanitizedQuery, tenantId, {
                currentScope: request.scope,
            });
            // 3. Assemble context (may parse query and detect entities)
            const context = await this.assembleContext(tenantId, intent, request);
            // 4. Emit context event
            yield {
                type: 'context',
                sources: context.related,
                ragChunks: context.ragChunks,
            };
            // 5. Use enhanced query if available (from entity parsing), otherwise use sanitized query
            // Note: enhancedQuery should already be sanitized if it contains user input
            const queryToUse = context.metadata?.enhancedQuery || sanitizedQuery;
            // 6. Build prompts (now async to support prompt resolver)
            const { systemPrompt, userPrompt } = await this.buildPrompts(tenantId, userId, intent, context, queryToUse, request.options);
            // 6. Stream LLM response
            let fullContent = '';
            let chunkIndex = 0;
            let usage = { prompt: 0, completion: 0, total: 0 };
            let provider;
            let connectionId;
            // Check if tools are available - if so, use non-streaming executeLLM which supports tool calls
            // Note: userRoles not available in streaming context, will be checked at execution time
            const tools = this.toolExecutor
                ? await this.toolExecutor.getAvailableTools({
                    tenantId,
                    userId,
                    userRoles: request.userRoles, // Optional user roles for permission checking
                    projectId: request.projectId || request.scope?.projectId,
                })
                : undefined;
            const useToolCalling = tools && tools.length > 0;
            // Use streaming when available and no tool calling, otherwise fall back to non-streaming with tool support
            if (this.unifiedAIClient && this.aiConnectionService && !useToolCalling) {
                try {
                    // Get AI connection with credentials for the model
                    const connectionResult = await this.aiConnectionService.getConnectionWithCredentialsForModel(modelId, tenantId);
                    if (connectionResult) {
                        const { connection, model, apiKey } = connectionResult;
                        provider = model.provider;
                        connectionId = connection.id;
                        // Use streaming if available
                        if (this.unifiedAIClient.chatStream) {
                            for await (const chunk of this.unifiedAIClient.chatStream(connection, apiKey, {
                                messages: [
                                    { role: 'system', content: systemPrompt },
                                    { role: 'user', content: userPrompt },
                                ],
                                temperature: request.options?.temperature ?? DEFAULT_TEMPERATURE,
                                maxTokens: request.options?.maxTokens ?? DEFAULT_MAX_TOKENS,
                                stream: true,
                            })) {
                                if (chunk.delta) {
                                    fullContent += chunk.delta;
                                    yield {
                                        type: 'delta',
                                        content: chunk.delta,
                                        index: chunkIndex++,
                                    };
                                }
                                if (chunk.done) {
                                    // Use actual usage from API if available, otherwise estimate
                                    if (chunk.usage) {
                                        usage = {
                                            prompt: chunk.usage.promptTokens,
                                            completion: chunk.usage.completionTokens,
                                            total: chunk.usage.totalTokens,
                                        };
                                    }
                                    else {
                                        // Fallback to estimation if usage not provided
                                        usage = {
                                            prompt: this.estimateTokens(systemPrompt + userPrompt),
                                            completion: this.estimateTokens(fullContent),
                                            total: this.estimateTokens(systemPrompt + userPrompt + fullContent),
                                        };
                                    }
                                    break;
                                }
                            }
                        }
                        else {
                            // Fall back to non-streaming
                            const llmResponse = await this.executeLLM(tenantId, userId, modelId, systemPrompt, userPrompt, request.options?.temperature, request.options?.maxTokens, request.projectId || request.scope?.projectId, true, // toolsEnabled
                            request.userRoles // Pass user roles for permission checking
                            );
                            fullContent = llmResponse.content;
                            usage = llmResponse.usage;
                            // Emit content in chunks for demo
                            const chunkSize = 100;
                            for (let i = 0; i < fullContent.length; i += chunkSize) {
                                yield {
                                    type: 'delta',
                                    content: fullContent.substring(i, i + chunkSize),
                                    index: chunkIndex++,
                                };
                            }
                        }
                    }
                    else {
                        // No connection found, fall back to non-streaming
                        const llmResponse = await this.executeLLM(tenantId, userId, modelId, systemPrompt, userPrompt, request.options?.temperature, request.options?.maxTokens, request.projectId || request.scope?.projectId, true, // toolsEnabled
                        request.userRoles // Pass user roles for permission checking
                        );
                        fullContent = llmResponse.content;
                        usage = llmResponse.usage;
                        // Emit content in chunks for demo
                        const chunkSize = 100;
                        for (let i = 0; i < fullContent.length; i += chunkSize) {
                            yield {
                                type: 'delta',
                                content: fullContent.substring(i, i + chunkSize),
                                index: chunkIndex++,
                            };
                        }
                    }
                }
                catch (error) {
                    // If streaming fails, fall back to non-streaming
                    this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                        operation: 'insight.generateStream.streaming',
                        modelId,
                        tenantId,
                    });
                    const llmResponse = await this.executeLLM(tenantId, userId, modelId, systemPrompt, userPrompt, request.options?.temperature, request.options?.maxTokens, request.projectId || request.scope?.projectId, true, // toolsEnabled
                    request.userRoles // Pass user roles for permission checking
                    );
                    fullContent = llmResponse.content;
                    usage = llmResponse.usage;
                    // Emit content in chunks for demo
                    const chunkSize = 100;
                    for (let i = 0; i < fullContent.length; i += chunkSize) {
                        yield {
                            type: 'delta',
                            content: fullContent.substring(i, i + chunkSize),
                            index: chunkIndex++,
                        };
                    }
                }
            }
            else {
                // No UnifiedAIClient available, use non-streaming fallback
                const llmResponse = await this.executeLLM(tenantId, userId, modelId, systemPrompt, userPrompt, request.options?.temperature, request.options?.maxTokens, request.projectId || request.scope?.projectId, true, // toolsEnabled
                request.userRoles // Pass user roles for permission checking
                );
                fullContent = llmResponse.content;
                usage = llmResponse.usage;
                // Emit content in chunks for demo
                const chunkSize = 100;
                for (let i = 0; i < fullContent.length; i += chunkSize) {
                    yield {
                        type: 'delta',
                        content: fullContent.substring(i, i + chunkSize),
                        index: chunkIndex++,
                    };
                }
            }
            // 7. Ground response
            // Validate content length to prevent memory exhaustion (max 500KB)
            const MAX_RESPONSE_LENGTH = 500000; // 500KB
            if (fullContent.length > MAX_RESPONSE_LENGTH) {
                this.monitoring.trackEvent('insight.content_too_large', {
                    tenantId,
                    userId,
                    modelId,
                    contentLength: fullContent.length,
                    maxLength: MAX_RESPONSE_LENGTH,
                });
                yield {
                    type: 'error',
                    code: 'CONTENT_TOO_LARGE',
                    message: `AI model returned content exceeding maximum length of ${MAX_RESPONSE_LENGTH} characters`,
                };
                return;
            }
            const grounded = await this.groundResponse(fullContent, context);
            // 8. Emit citations
            if (grounded.citations.length > 0) {
                yield {
                    type: 'citation',
                    citations: grounded.citations,
                };
            }
            // 9. Ensure conversation exists (auto-create if needed)
            // Auto-create conversation if not provided to ensure all chat interactions are persisted
            let finalConversationId = request.conversationId || conversationId;
            if (!request.conversationId && conversationId) {
                // conversationId was auto-generated, need to create the conversation
                try {
                    const newConversation = await this.conversationService.create(tenantId, userId, {
                        title: request.query.substring(0, 100), // Use first 100 chars of query as title
                        visibility: 'private',
                        assistantId: request.assistantId,
                        templateId: request.templateId,
                        defaultModelId: modelId,
                        linkedShards: request.scope?.shardId ? [request.scope.shardId] : undefined,
                        tags: request.projectId ? [`project:${request.projectId}`] : undefined,
                    });
                    finalConversationId = newConversation.id;
                    this.monitoring.trackEvent('insight.conversation-auto-created.stream', {
                        tenantId,
                        userId,
                        conversationId: finalConversationId,
                        hasProject: !!request.projectId,
                    });
                }
                catch (error) {
                    // Non-blocking: if conversation creation fails, log but continue
                    this.monitoring.trackException(error, {
                        operation: 'insight.auto-create-conversation.stream',
                        tenantId,
                        userId,
                    });
                }
            }
            // 10. Build final response
            const response = {
                content: grounded.groundedContent,
                format: request.options?.format || 'detailed',
                citations: grounded.citations,
                confidence: grounded.overallConfidence,
                groundingScore: grounded.groundingScore,
                sources: context.related.map(chunk => ({
                    shardId: chunk.shardId,
                    shardName: chunk.shardName,
                    shardTypeId: chunk.shardTypeId,
                    relevance: 1,
                })),
                suggestedQuestions: this.generateSuggestions(intent, context),
                usage,
                cost: this.estimateCost(usage, modelId),
                latencyMs: Date.now() - startTime,
                insightType: intent.insightType,
                model: modelId,
                templateId: context.metadata.templateId,
                createdAt: new Date(),
                conversationId: finalConversationId, // Include conversationId in response for client reference
            };
            // 11. Emit complete event
            yield {
                type: 'complete',
                response,
            };
            // 11. Record cost usage if AIConfigService is available
            if (this.aiConfigService && provider) {
                await this.recordCostUsage(tenantId, userId, provider, modelId, usage, response.cost, response.latencyMs, {
                    conversationId: finalConversationId,
                    insightType: intent.insightType,
                    connectionId,
                }).catch((err) => {
                    // Non-blocking - don't fail the request if cost recording fails
                    this.monitoring.trackException(err, {
                        operation: 'insight.recordCostUsage.stream',
                        tenantId,
                    });
                });
            }
            // 12. Save to conversation if we have a conversationId (either provided or auto-created)
            if (finalConversationId) {
                await this.saveToConversation(finalConversationId, tenantId, userId, request.query, response, modelId, context);
            }
            this.monitoring.trackEvent('insight.streamed', {
                tenantId,
                userId,
                insightType: intent.insightType,
                model: modelId,
                latencyMs: response.latencyMs,
            });
        }
        catch (error) {
            yield {
                type: 'error',
                code: 'GENERATION_ERROR',
                message: error.message,
            };
            this.monitoring.trackException(error, {
                operation: 'insight.generateStream',
                tenantId,
                userId,
            });
        }
    }
    /**
     * Generate quick insight for a shard
     */
    async quickInsight(tenantId, userId, request) {
        const startTime = Date.now();
        // Map quick insight type to insight type
        const insightTypeMap = {
            summary: 'summary',
            key_points: 'extraction',
            risks: 'analysis',
            opportunities: 'analysis',
            next_steps: 'recommendation',
            comparison: 'comparison',
            trends: 'analysis',
            custom: 'analysis',
        };
        // Build custom prompt based on quick insight type
        const customPrompts = {
            summary: 'Provide a brief summary of this item.',
            key_points: 'Extract and list the key points from this item.',
            risks: 'Identify and analyze the risks associated with this item.',
            opportunities: 'Identify opportunities and potential benefits.',
            next_steps: 'Recommend the next steps and action items.',
            comparison: 'Compare this item with similar items in the context.',
            trends: 'Analyze trends and patterns related to this item.',
        };
        const query = request.customPrompt || customPrompts[request.type] || 'Analyze this item.';
        const response = await this.generate(tenantId, userId, {
            query,
            scope: { shardId: request.shardId },
            options: {
                format: request.options?.format || 'brief',
                maxTokens: request.options?.maxLength || 1000,
            },
            modelId: request.options?.modelId,
        });
        // Validate content is not empty
        const content = response.content || '';
        if (!content.trim()) {
            this.monitoring.trackEvent('insight.empty_content', {
                tenantId,
                userId,
                shardId: request.shardId,
                type: request.type,
            });
            throw new Error('AI model returned empty content for shard insight');
        }
        return {
            id: uuidv4(),
            shardId: request.shardId,
            type: request.type,
            content: content.trim(),
            format: response.format,
            sources: response.sources,
            confidence: response.confidence,
            groundingScore: response.groundingScore,
            usage: response.usage,
            cost: response.cost,
            latencyMs: Date.now() - startTime,
            suggestedQuestions: response.suggestedQuestions,
            suggestedActions: response.suggestedActions,
            createdAt: new Date(),
        };
    }
    /**
     * Get suggested questions for a shard
     */
    async getSuggestions(tenantId, shardId, limit = 5) {
        // Get shard info
        const shard = await this.shardRepository.findById(shardId, tenantId);
        if (!shard) {
            return [];
        }
        // Get shard type
        const shardType = await this.shardTypeRepository.findById(shard.shardTypeId, tenantId);
        const typeName = shardType?.name || shard.shardTypeId;
        // Generate contextual suggestions based on shard type
        const suggestions = [];
        // Common suggestions
        suggestions.push({
            question: `Summarize ${shard.name}`,
            category: 'summary',
            priority: 1,
        });
        // Type-specific suggestions
        if (typeName === 'c_project') {
            suggestions.push({ question: 'What are the main risks for this project?', category: 'analysis', priority: 2 }, { question: 'What are the next steps?', category: 'extraction', priority: 3 }, { question: 'How is the project progressing?', category: 'analysis', priority: 4 });
        }
        else if (typeName === 'c_company') {
            suggestions.push({ question: 'What opportunities exist with this company?', category: 'analysis', priority: 2 }, { question: 'Who are the key contacts?', category: 'extraction', priority: 3 }, { question: 'What is our relationship history?', category: 'summary', priority: 4 });
        }
        else if (typeName === 'c_opportunity') {
            suggestions.push({ question: 'What is the likelihood of closing this deal?', category: 'prediction', priority: 2 }, { question: 'What are the blockers?', category: 'analysis', priority: 3 }, { question: 'Compare with similar opportunities', category: 'comparison', priority: 4 });
        }
        else if (typeName === 'c_document') {
            suggestions.push({ question: 'What are the key points in this document?', category: 'extraction', priority: 2 }, { question: 'Summarize the main findings', category: 'summary', priority: 3 });
        }
        return suggestions.slice(0, limit);
    }
    // ============================================
    // Internal Methods
    // ============================================
    /**
     * Manage conversation memory with token limits
     * Keeps system messages + recent messages, summarizes older ones if needed
     */
    async manageConversationTokens(messages, maxTokens = 4000) {
        if (messages.length === 0) {
            return messages;
        }
        // Calculate total tokens
        const totalTokens = messages.reduce((sum, msg) => {
            return sum + this.estimateTokens(msg.content);
        }, 0);
        // If under limit, return as-is
        if (totalTokens <= maxTokens) {
            return messages;
        }
        // Strategy: Keep system prompt + recent messages + summary of old messages
        const systemMessages = messages.filter(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');
        // Keep last 10 messages (or all if less than 10)
        const keepRecentCount = Math.min(10, userMessages.length);
        const recentMessages = userMessages.slice(-keepRecentCount);
        const oldMessages = userMessages.slice(0, -keepRecentCount);
        // If no old messages, just return system + recent
        if (oldMessages.length === 0) {
            return [...systemMessages, ...recentMessages];
        }
        // Summarize old messages if AI client is available
        let summary;
        if (this.unifiedAIClient && oldMessages.length > 0) {
            try {
                summary = await this.summarizeMessages(oldMessages);
                this.monitoring.trackEvent('insight.conversation-summarized', {
                    oldMessageCount: oldMessages.length,
                    summaryLength: summary.length,
                });
            }
            catch (error) {
                this.monitoring.trackException(error, {
                    operation: 'insight.summarizeMessages',
                });
                // Continue without summary if summarization fails
            }
        }
        // Construct optimized message list
        const optimizedMessages = [...systemMessages];
        if (summary) {
            optimizedMessages.push({
                id: uuidv4(),
                conversationId: messages[0]?.conversationId || '',
                role: 'system',
                content: `Previous conversation summary: ${summary}`,
                contentType: 'text',
                status: 'complete',
                createdAt: new Date(),
                updatedAt: new Date(),
                branchIndex: 0,
            });
        }
        optimizedMessages.push(...recentMessages);
        const finalTokens = optimizedMessages.reduce((sum, msg) => {
            return sum + this.estimateTokens(msg.content);
        }, 0);
        this.monitoring.trackEvent('insight.conversation-tokens-optimized', {
            originalTokens: totalTokens,
            finalTokens,
            originalMessageCount: messages.length,
            finalMessageCount: optimizedMessages.length,
            summarized: !!summary,
        });
        return optimizedMessages;
    }
    /**
     * Summarize old messages to preserve context
     */
    async summarizeMessages(messages) {
        if (!this.unifiedAIClient) {
            throw new Error('UnifiedAIClient not available for summarization');
        }
        const conversationText = messages
            .map(m => {
            const role = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System';
            return `${role}: ${m.content}`;
        })
            .join('\n\n');
        const summaryPrompt = `Summarize this conversation history in 2-3 sentences, preserving key context, decisions, and important information:

${conversationText}

Summary:`;
        try {
            const response = await this.unifiedAIClient.chat({
                messages: [
                    { role: 'system', content: 'You are a conversation summarization assistant.' },
                    { role: 'user', content: summaryPrompt },
                ],
                maxTokens: 150,
                temperature: 0.3,
            });
            const summary = (response.content || '').trim();
            if (!summary) {
                // If LLM returned empty content, use fallback
                const userMessages = messages.filter(m => m.role === 'user').slice(0, 3);
                return `Previous conversation about: ${userMessages.map(m => m.content.substring(0, 50)).join(', ')}...`;
            }
            return summary;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'insight.summarizeMessages.llm',
            });
            // Fallback to simple summary
            const userMessages = messages.filter(m => m.role === 'user').slice(0, 3);
            return `Previous conversation about: ${userMessages.map(m => m.content.substring(0, 50)).join(', ')}...`;
        }
    }
    /**
     * Assemble context for insight generation
     * Optimized for global scope with tenant-wide RAG and caching
     */
    async assembleContext(tenantId, intent, request) {
        const chunks = [];
        const ragChunks = [];
        // Parse query for entity references (shard-specific Q&A)
        let parsedQuery = null;
        let singleShardDetected = false;
        if (this.contextAwareQueryParser && !request.scope?.shardId) {
            // Only parse if shardId not explicitly provided (let explicit scope take precedence)
            // Sanitize query before parsing to prevent prompt injection
            const queryToParse = sanitizeUserInput(request.query);
            try {
                parsedQuery = await this.contextAwareQueryParser.parseQuery(queryToParse, tenantId, request.projectId || request.scope?.projectId);
                // Check if single shard question detected
                if (parsedQuery.hasEntityReferences && parsedQuery.entities.length === 1) {
                    singleShardDetected = true;
                    this.monitoring.trackEvent('insight.single-shard-detected', {
                        tenantId,
                        shardId: parsedQuery.entities[0].shardId,
                        shardType: parsedQuery.entities[0].shardType,
                        query: request.query.substring(0, 100),
                    });
                }
                else if (parsedQuery.hasEntityReferences && parsedQuery.entities.length > 1) {
                    this.monitoring.trackEvent('insight.multi-shard-detected', {
                        tenantId,
                        entityCount: parsedQuery.entities.length,
                        query: request.query.substring(0, 100),
                    });
                }
            }
            catch (error) {
                // Non-blocking: if parsing fails, continue with normal context assembly
                this.monitoring.trackException(error, {
                    component: 'InsightService',
                    operation: 'assembleContext.parseQuery',
                    tenantId,
                });
            }
        }
        // Get primary shard if specified (explicit scope) or detected from query
        let primaryChunk;
        const shardIdToUse = request.scope?.shardId || (singleShardDetected && parsedQuery ? parsedQuery.entities[0].shardId : undefined);
        if (shardIdToUse) {
            const shard = await this.shardRepository.findById(shardIdToUse, tenantId);
            if (shard) {
                const shardType = await this.shardTypeRepository.findById(shard.shardTypeId, tenantId);
                primaryChunk = {
                    shardId: shard.id,
                    shardName: shard.name,
                    shardTypeId: shard.shardTypeId,
                    shardTypeName: shardType?.displayName || shard.shardTypeId,
                    content: shard.structuredData || {},
                    tokenCount: this.estimateTokens(shard.structuredData),
                };
                chunks.push(primaryChunk);
                // If single shard detected, use entity context from parser (more optimized)
                if (singleShardDetected && parsedQuery && parsedQuery.entityContext.length > 0) {
                    const entityCtx = parsedQuery.entityContext[0];
                    // Merge entity context content into primary chunk
                    primaryChunk.content = {
                        ...primaryChunk.content,
                        ...entityCtx.fields,
                        _entityContent: entityCtx.content, // Add extracted content
                    };
                }
            }
        }
        else if (parsedQuery && parsedQuery.hasEntityReferences && parsedQuery.entities.length > 1) {
            // Multiple entities detected - add all entity contexts
            for (const entityCtx of parsedQuery.entityContext) {
                const shard = await this.shardRepository.findById(entityCtx.shardId, tenantId);
                if (shard) {
                    const shardType = await this.shardTypeRepository.findById(shard.shardTypeId, tenantId);
                    chunks.push({
                        shardId: entityCtx.shardId,
                        shardName: entityCtx.name,
                        shardTypeId: entityCtx.shardType,
                        shardTypeName: shardType?.displayName || entityCtx.shardType,
                        content: {
                            ...shard.structuredData,
                            ...entityCtx.fields,
                            _entityContent: entityCtx.content,
                        },
                        tokenCount: this.estimateTokens(shard.structuredData),
                        relationshipType: 'entity-reference',
                    });
                }
            }
        }
        // Template-aware context assembly
        // Automatically select and use templates based on intent and scope
        let selectedTemplate = null;
        let templateMetadata = null;
        if (this.contextTemplateService) {
            // Determine shard type for template selection
            const shardTypeName = primaryChunk?.shardTypeId ||
                (request.scope?.shardId ?
                    (await this.shardRepository.findById(request.scope.shardId, tenantId))?.shardTypeId :
                    undefined);
            if (shardTypeName) {
                // Select template automatically based on intent and scope
                selectedTemplate = await this.contextTemplateService.selectTemplate(tenantId, {
                    preferredTemplateId: request.templateId, // User-specified takes precedence
                    assistantId: request.assistantId,
                    shardTypeName,
                    insightType: intent.insightType, // Intent-based selection
                    scopeMode: request.scopeMode, // Scope-based selection
                    query: request.query, // Query text for enhanced template matching
                });
                if (selectedTemplate) {
                    templateMetadata = selectedTemplate.structuredData;
                    this.monitoring.trackEvent('insight.template-selected', {
                        tenantId,
                        templateId: selectedTemplate.id,
                        templateName: templateMetadata.name,
                        insightType: intent.insightType,
                        shardType: shardTypeName,
                        scopeMode: request.scopeMode,
                        autoSelected: !request.templateId, // True if automatically selected
                    });
                }
            }
            // Use template for context assembly if we have a primary shard
            if (selectedTemplate && primaryChunk) {
                const templateResult = await this.contextTemplateService.assembleContext(primaryChunk.shardId, tenantId, {
                    templateId: selectedTemplate.id,
                    assistantId: request.assistantId,
                });
                if (templateResult.success && templateResult.context) {
                    // Add related shards from template
                    for (const [relType, relatedShards] of Object.entries(templateResult.context.related)) {
                        for (const relShard of relatedShards) {
                            // Avoid duplicates
                            if (!chunks.some(c => c.shardId === relShard.id)) {
                                chunks.push({
                                    shardId: relShard.id,
                                    shardName: relShard.name || relShard.id,
                                    shardTypeId: relShard.shardTypeId,
                                    shardTypeName: relShard.shardTypeId,
                                    content: relShard,
                                    tokenCount: this.estimateTokens(relShard),
                                    relationshipType: relType,
                                });
                            }
                        }
                    }
                }
            }
        }
        // If project-scoped, use optimized ProjectContextService for related shards
        const projectId = request.projectId || request.scope?.projectId;
        if (request.scopeMode === 'project' && projectId && this.projectContextService) {
            try {
                const projectContext = await this.projectContextService.assembleProjectContext(tenantId, projectId, request.query, {
                    maxTokens: (request.maxTokens || DEFAULT_MAX_TOKENS) - (primaryChunk?.tokenCount || 0) - chunks.reduce((sum, c) => sum + c.tokenCount, 0),
                    minRelevance: RAG_MIN_SCORE,
                    includeUnlinked: true,
                    unlinkedFraction: 0.2,
                    shardTypeFilter: ['c_document', 'c_documentChunk', 'c_note'],
                    maxRelatedShards: 50,
                });
                // Add project chunk if not already present
                if (projectContext.projectChunk && !chunks.some(c => c.shardId === projectContext.projectChunk.shardId)) {
                    chunks.push(projectContext.projectChunk);
                }
                // Add related chunks (deduplicate with existing chunks)
                const existingIds = new Set(chunks.map(c => c.shardId));
                for (const relatedChunk of projectContext.relatedChunks) {
                    if (!existingIds.has(relatedChunk.shardId)) {
                        chunks.push(relatedChunk);
                        existingIds.add(relatedChunk.shardId);
                    }
                }
                // Add optimized RAG chunks (will be merged with vector search results below)
                for (const ragChunk of projectContext.ragChunks) {
                    if (!ragChunks.some(r => r.shardId === ragChunk.shardId)) {
                        ragChunks.push(ragChunk);
                    }
                }
                // Priority ordering: primary > project > related > RAG
                const { sortProjectRelatedChunks } = await import('./ai-insights/project-context.util.js');
                const primary = primaryChunk ? [primaryChunk] : [];
                const project = chunks.filter(c => c.shardId === projectId);
                const related = sortProjectRelatedChunks(chunks.filter(c => c.shardId !== projectId && !primary.some(p => p.shardId === c.shardId)));
                chunks.splice(0, chunks.length, ...primary, ...project, ...related);
                this.monitoring.trackEvent('insight.project.contextOptimized', {
                    tenantId,
                    projectId,
                    relatedShardCount: projectContext.relatedChunks.length,
                    ragChunkCount: projectContext.ragChunks.length,
                    totalTokens: projectContext.totalTokens,
                });
            }
            catch (err) {
                this.monitoring.trackException(err, {
                    operation: 'insight.project.assembleContext',
                    tenantId,
                    projectId,
                });
                // Continue with fallback logic below
            }
        }
        // Perform RAG search if vector search is available
        // Skip RAG for single-shard questions (optimization)
        // For project mode, ProjectContextService already handles RAG internally, but we can supplement with additional search
        const shouldSkipRAG = singleShardDetected && primaryChunk; // Skip RAG if single shard question detected
        const isProjectMode = request.scopeMode === 'project' && projectId;
        // Only perform additional RAG if:
        // 1. Not in project mode (global mode) OR
        // 2. In project mode but ProjectContextService didn't provide RAG chunks (fallback)
        const shouldPerformRAG = this.vectorSearch && !shouldSkipRAG && (!isProjectMode || ragChunks.length === 0);
        if (shouldPerformRAG) {
            try {
                // Check cache for global context if in global mode
                let cachedGlobalContext = null;
                if (request.scopeMode === 'global' && this.redis) {
                    const queryHash = crypto.createHash('sha256')
                        .update(`${tenantId}:${request.query}`)
                        .digest('hex');
                    const cacheKey = `global-context:${tenantId}:${queryHash}`;
                    try {
                        const cached = await this.redis.get(cacheKey);
                        if (cached) {
                            try {
                                cachedGlobalContext = JSON.parse(cached);
                                this.monitoring.trackEvent('insight.global-context.cache-hit', {
                                    tenantId,
                                    queryHash,
                                });
                            }
                            catch (parseError) {
                                this.monitoring.trackException(parseError instanceof Error ? parseError : new Error(String(parseError)), {
                                    operation: 'insight.global-context.parse-cache',
                                    tenantId,
                                });
                            }
                        }
                    }
                    catch (redisError) {
                        // Redis error - continue without cache, don't fail the request
                        this.monitoring.trackException(redisError instanceof Error ? redisError : new Error(String(redisError)), {
                            operation: 'insight.global-context.redis-get',
                            tenantId,
                        });
                    }
                }
                if (cachedGlobalContext) {
                    ragChunks.push(...cachedGlobalContext);
                }
                else {
                    // For project mode: get project-linked shard IDs for post-filtering with 20% unlinked allowance
                    let projectShardIds = [];
                    if (isProjectMode) {
                        try {
                            const projectShard = await this.shardRepository.findById(projectId, tenantId);
                            if (projectShard?.internal_relationships) {
                                projectShardIds = projectShard.internal_relationships
                                    .filter(rel => rel?.shardId && ['c_document', 'c_documentChunk', 'c_note'].includes(rel.shardTypeId))
                                    .map(rel => rel.shardId);
                            }
                        }
                        catch (err) {
                            this.monitoring.trackException(err, {
                                operation: 'insight.rag.getProjectShards',
                                tenantId,
                                projectId,
                            });
                        }
                    }
                    // Template-aware RAG configuration
                    // Use template's RAG config if available, otherwise use defaults
                    const templateRAGConfig = templateMetadata?.sources?.rag;
                    const ragTopK = templateRAGConfig?.maxChunks ||
                        (isGlobal ? GLOBAL_RAG_TOP_K : (isProjectMode ? RAG_TOP_K * 2 : RAG_TOP_K));
                    const ragMinScore = templateRAGConfig?.minScore ||
                        (isGlobal ? GLOBAL_RAG_MIN_SCORE : RAG_MIN_SCORE);
                    // Use optimized parameters for global scope
                    const isGlobal = request.scopeMode === 'global';
                    // Project-aware RAG: Pass projectId to vector search for project-scoped context
                    // This ensures RAG retrieval is limited to project-linked shards when in project mode
                    const ragResults = await this.vectorSearch.search({
                        tenantId,
                        query: request.query,
                        topK: ragTopK,
                        minScore: ragMinScore,
                        projectId: isProjectMode ? projectId : undefined, // Only filter by project in project mode
                        shardTypeIds: templateMetadata?.sources?.rag?.shardTypeIds, // Use template's shard type filter if available
                    });
                    for (const result of ragResults.results) {
                        ragChunks.push({
                            id: uuidv4(),
                            shardId: result.shardId,
                            shardName: result.shard?.name || result.shardId,
                            shardTypeId: result.shardTypeId,
                            content: result.content,
                            chunkIndex: result.chunkIndex || 0,
                            score: result.score,
                            highlight: result.highlight,
                            tokenCount: this.estimateTokens(result.content),
                        });
                    }
                    // Apply semantic reranking if enabled and we have enough chunks
                    // Reranking improves relevance by using LLM to score query-document relevance
                    const shouldRerank = ragChunks.length > 3 && request.options?.enableReranking !== false;
                    if (shouldRerank && this.unifiedAIClient && this.aiConnectionService) {
                        try {
                            const reranked = await this.rerankRAGChunks(tenantId, request.query, ragChunks, intent.insightType);
                            ragChunks.splice(0, ragChunks.length, ...reranked);
                            this.monitoring.trackEvent('insight.rag.reranked', {
                                tenantId,
                                originalCount: ragResults.results.length,
                                rerankedCount: reranked.length,
                                insightType: intent.insightType,
                            });
                        }
                        catch (error) {
                            // Non-blocking: if reranking fails, continue with original order
                            this.monitoring.trackException(error, {
                                operation: 'insight.rag.rerank',
                                tenantId,
                            });
                        }
                    }
                    // For project mode: apply 20% unlinked allowance filter
                    if (isProjectMode && projectShardIds.length > 0 && ragChunks.length > 0) {
                        const allowedIds = new Set([projectId, ...projectShardIds]);
                        const before = ragChunks.length;
                        const kept = filterRagByAllowedIds(ragChunks, allowedIds, 0.2);
                        ragChunks.splice(0, ragChunks.length, ...kept);
                        this.monitoring.trackEvent('insight.rag.filteredByProject', {
                            tenantId,
                            projectId,
                            total: before,
                            kept: kept.length,
                            linkedCount: kept.filter(c => allowedIds.has(c.shardId)).length,
                            unlinkedCount: kept.filter(c => !allowedIds.has(c.shardId)).length,
                        });
                    }
                    // Cache global context for future use
                    if (isGlobal && this.redis && ragChunks.length > 0) {
                        const queryHash = crypto.createHash('sha256')
                            .update(`${tenantId}:${request.query}`)
                            .digest('hex');
                        const cacheKey = `global-context:${tenantId}:${queryHash}`;
                        try {
                            await this.redis.setex(cacheKey, GLOBAL_CONTEXT_CACHE_TTL, JSON.stringify(ragChunks));
                            this.monitoring.trackEvent('insight.global-context.cached', {
                                tenantId,
                                queryHash,
                                chunkCount: ragChunks.length,
                            });
                        }
                        catch (redisError) {
                            // Redis error - log but don't fail the request
                            this.monitoring.trackException(redisError instanceof Error ? redisError : new Error(String(redisError)), {
                                operation: 'insight.global-context.redis-setex',
                                tenantId,
                            });
                        }
                    }
                }
            }
            catch (error) {
                // RAG is optional, continue without it
                this.monitoring.trackEvent('insight.rag.failed', { tenantId, error: error.message });
            }
        }
        // Integrate web search context if available
        if (this.webSearchContextIntegration && (request.projectId || request.scope?.projectId)) {
            try {
                const webSearchResult = await this.webSearchContextIntegration.integrateWebSearchContext(tenantId, (request.projectId || request.scope?.projectId), intent, request.query, {
                    primary: primaryChunk || {
                        shardId: '',
                        shardName: 'Query Context',
                        shardTypeId: '',
                        shardTypeName: '',
                        content: {},
                        tokenCount: 0,
                    },
                    related: chunks,
                    ragChunks,
                    metadata: {
                        templateId: request.templateId || 'default',
                        templateName: 'Default',
                        totalTokens: 0,
                        sourceCount: chunks.length + ragChunks.length,
                        assembledAt: new Date(),
                    },
                    formattedContext: '',
                }, {
                    enableDeepSearch: request.options?.enableDeepSearch,
                    deepSearchPages: request.options?.deepSearchPages,
                    minRelevanceScore: 0.65,
                    maxChunks: 10,
                });
                if (webSearchResult.triggered && webSearchResult.ragChunks.length > 0) {
                    // Merge web search RAG chunks with existing ones
                    ragChunks.push(...webSearchResult.ragChunks);
                    // Log web search integration
                    this.monitoring.trackEvent('insight.websearch.integrated', {
                        tenantId,
                        query: request.query,
                        ...this.webSearchContextIntegration.formatMetadataForLogging(webSearchResult),
                    });
                }
            }
            catch (error) {
                // Web search is optional, continue without it
                this.monitoring.trackEvent('insight.websearch.failed', {
                    tenantId,
                    error: error.message,
                });
            }
        }
        // Format context for LLM
        // Apply token budget management: target 1500-2000 tokens for context (best practice)
        // Priority: primary > project > related > RAG (unlinked trimmed first)
        const targetContextTokens = request.options?.maxTokens
            ? Math.min(Math.max(1500, Math.floor(request.options.maxTokens * 0.5)), 2000) // Target 50% of maxTokens, clamped to 1500-2000
            : 2000; // Default target
        const maxContextTokens = request.options?.maxTokens
            ? Math.max(1500, Math.floor(request.options.maxTokens * 0.8)) // Allow up to 80% for context
            : DEFAULT_MAX_TOKENS;
        const primary = primaryChunk ? primaryChunk : chunks[0];
        const related = chunks.slice(1);
        const totalTokens = () => {
            const primaryTokens = primary ? primary.tokenCount : 0;
            const relatedTokens = related.reduce((acc, r) => acc + (r.tokenCount || 0), 0);
            const ragTokens = ragChunks.reduce((acc, r) => acc + (r.tokenCount || 0), 0);
            return primaryTokens + relatedTokens + ragTokens;
        };
        // Deduplicate RAG chunks by shardId (keep highest score per shard)
        const ragChunksByShard = new Map();
        for (const chunk of ragChunks) {
            const existing = ragChunksByShard.get(chunk.shardId);
            if (!existing || chunk.score > existing.score) {
                ragChunksByShard.set(chunk.shardId, chunk);
            }
        }
        ragChunks.splice(0, ragChunks.length, ...Array.from(ragChunksByShard.values()));
        // Sort RAG chunks by score (highest first) for priority trimming
        ragChunks.sort((a, b) => b.score - a.score);
        // Trim to target: prioritize keeping primary and related, trim RAG first
        if (totalTokens() > targetContextTokens) {
            // First, trim unlinked RAG chunks (those not in related chunks' shardIds)
            const relatedShardIds = new Set(related.map(c => c.shardId));
            const unlinkedRag = ragChunks.filter(c => !relatedShardIds.has(c.shardId));
            const linkedRag = ragChunks.filter(c => relatedShardIds.has(c.shardId));
            // Trim unlinked RAG chunks by lowest score first
            while (unlinkedRag.length > 0 && totalTokens() > targetContextTokens) {
                unlinkedRag.pop();
                ragChunks.splice(0, ragChunks.length, ...linkedRag, ...unlinkedRag);
            }
            // If still over budget, trim linked RAG chunks
            if (totalTokens() > targetContextTokens && linkedRag.length > 0) {
                while (linkedRag.length > 0 && totalTokens() > targetContextTokens) {
                    linkedRag.pop();
                    ragChunks.splice(0, ragChunks.length, ...linkedRag, ...unlinkedRag);
                }
            }
            // If still over budget, trim related chunks (keep earlier ones which are likely closer relationships)
            if (totalTokens() > maxContextTokens && related.length > 0) {
                while (related.length > 0 && totalTokens() > maxContextTokens) {
                    related.pop();
                }
            }
        }
        // Final check: ensure we don't exceed maxContextTokens
        if (totalTokens() > maxContextTokens) {
            // Last resort: trim RAG chunks aggressively
            while (ragChunks.length > 0 && totalTokens() > maxContextTokens) {
                ragChunks.pop();
            }
        }
        // Retrieve multi-modal assets if available
        const assetChunks = await this.getMultimodalAssetContext(tenantId, request.conversationId, request.scope?.shardId);
        // Add asset chunks to related chunks
        if (assetChunks.length > 0) {
            related.push(...assetChunks);
            this.monitoring.trackEvent('insight.multimodal-assets-included', {
                tenantId,
                conversationId: request.conversationId,
                shardId: request.scope?.shardId,
                assetCount: assetChunks.length,
            });
        }
        const formattedContext = this.formatContextForLLM(primary, related, ragChunks);
        const assetContext = this.formatAssetContextForLLM(assetChunks);
        const fullFormattedContext = formattedContext + (assetContext ? '\n' + assetContext : '');
        return {
            primary: primary || {
                shardId: '',
                shardName: 'Query Context',
                shardTypeId: '',
                shardTypeName: '',
                content: {},
                tokenCount: 0,
            },
            related,
            ragChunks,
            metadata: {
                templateId: request.templateId || 'default',
                templateName: 'Default',
                totalTokens: this.estimateTokens(fullFormattedContext),
                sourceCount: chunks.length + ragChunks.length + assetChunks.length,
                assembledAt: new Date(),
                // Store enhanced query if available (for use in prompt building)
                enhancedQuery: parsedQuery?.enhancedQuery,
                singleShardDetected,
            }, // Type assertion to allow enhancedQuery in metadata
            formattedContext: fullFormattedContext,
        };
    }
    /**
     * Format context for LLM consumption
     */
    formatContextForLLM(primary, related, ragChunks) {
        const sections = [];
        // Primary context
        if (primary && primary.content && typeof primary.content === 'object' && Object.keys(primary.content).length > 0) {
            sections.push(`## Primary Context: ${primary.shardName}`);
            sections.push(`Type: ${primary.shardTypeName}`);
            sections.push(JSON.stringify(primary.content, null, 2));
        }
        // Related context
        if (related.length > 0) {
            sections.push('\n## Related Information');
            for (const chunk of related) {
                sections.push(`\n### ${chunk.shardName} (${chunk.shardTypeName})`);
                if (chunk.relationshipType) {
                    sections.push(`Relationship: ${chunk.relationshipType}`);
                }
                sections.push(JSON.stringify(chunk.content, null, 2));
            }
        }
        // RAG chunks
        if (ragChunks.length > 0) {
            sections.push('\n## Retrieved Documents');
            for (let i = 0; i < ragChunks.length; i++) {
                const chunk = ragChunks[i];
                sections.push(`\n[${i + 1}] ${chunk.shardName} (relevance: ${(chunk.score * 100).toFixed(0)}%)`);
                sections.push(chunk.content);
            }
        }
        return sections.join('\n');
    }
    /**
     * Format multi-modal asset context for LLM
     */
    formatAssetContextForLLM(assetChunks) {
        if (assetChunks.length === 0) {
            return '';
        }
        const sections = [];
        sections.push('\n## Attached Media Files');
        for (const chunk of assetChunks) {
            sections.push(`\n### ${chunk.shardName} (${chunk.shardTypeName})`);
            const content = chunk.content;
            if (content.text) {
                sections.push(`Extracted Text: ${content.text}`);
            }
            if (content.transcription) {
                sections.push(`Transcription: ${content.transcription}`);
            }
            if (content.description) {
                sections.push(`Description: ${content.description}`);
            }
            if (content.summary) {
                sections.push(`Summary: ${content.summary}`);
            }
            if (content.keyInsights && Array.isArray(content.keyInsights)) {
                sections.push(`Key Insights: ${content.keyInsights.join(', ')}`);
            }
            if (content.tags && Array.isArray(content.tags)) {
                sections.push(`Tags: ${content.tags.join(', ')}`);
            }
        }
        return sections.join('\n');
    }
    /**
     * Get multimodal asset context chunks
     */
    async getMultimodalAssetContext(tenantId, conversationId, shardId) {
        if (!this.multimodalAssetService) {
            return [];
        }
        try {
            // Build options for listing assets
            const options = {
                limit: 50, // Limit to 50 assets to avoid token overflow
            };
            if (conversationId) {
                options.attachedTo = { conversationId };
            }
            else if (shardId) {
                options.attachedTo = { shardId };
            }
            else {
                // No context to filter by, return empty
                return [];
            }
            // Get assets from the service
            const assets = await this.multimodalAssetService.listAssets(tenantId, options);
            // Convert assets to ContextChunk format
            const chunks = assets
                .filter((asset) => {
                // Only include processed assets with extracted content
                return (asset.processingStatus === 'completed' &&
                    (asset.extracted?.text ||
                        asset.extracted?.transcription ||
                        asset.analysis?.summary ||
                        asset.analysis?.description));
            })
                .map((asset) => {
                // Extract relevant content from asset
                const content = {
                    assetType: asset.assetType,
                    url: asset.url,
                };
                // Add extracted text if available
                if (asset.extracted?.text) {
                    content.text = asset.extracted.text;
                }
                // Add transcription if available
                if (asset.extracted?.transcription) {
                    content.transcription = asset.extracted.transcription;
                }
                // Add analysis results
                if (asset.analysis) {
                    if (asset.analysis.summary) {
                        content.summary = asset.analysis.summary;
                    }
                    if (asset.analysis.description) {
                        content.description = asset.analysis.description;
                    }
                    if (asset.analysis.keyInsights) {
                        content.keyInsights = asset.analysis.keyInsights;
                    }
                    if (asset.extracted?.tags) {
                        content.tags = asset.extracted.tags;
                    }
                }
                // Estimate token count
                const textContent = [
                    content.text,
                    content.transcription,
                    content.summary,
                    content.description,
                ]
                    .filter(Boolean)
                    .join(' ');
                const tokenCount = this.estimateTokens(textContent);
                return {
                    shardId: asset.id,
                    shardName: asset.filename || asset.id,
                    shardTypeId: 'multimodal_asset',
                    shardTypeName: 'Multimodal Asset',
                    content,
                    tokenCount,
                    relationshipType: 'attached_asset',
                    depth: 0,
                };
            });
            return chunks;
        }
        catch (error) {
            // Log error but don't fail the entire request
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'insight.getMultimodalAssetContext',
                tenantId,
                conversationId,
                shardId,
            });
            return [];
        }
    }
    /**
     * Build system and user prompts
     * Uses PromptResolverService if available, falls back to hardcoded prompts
     */
    async buildPrompts(tenantId, userId, intent, context, query, options, projectId) {
        let systemPrompt;
        let userPrompt;
        let experimentId;
        let variantId;
        // Try to use PromptResolverService if available
        if (this.promptResolver) {
            try {
                const promptSlug = `insights-${intent.insightType}`;
                const promptResult = await this.promptResolver.resolveAndRender({
                    tenantId,
                    userId,
                    slug: promptSlug,
                    insightType: intent.insightType,
                    projectId, // Pass projectId for project-specific prompts
                    variables: {
                        userQuery: sanitizeUserInput(query),
                        context: context.formattedContext,
                    },
                });
                if (promptResult) {
                    // Use resolved prompt
                    systemPrompt = promptResult.renderedSystemPrompt || '';
                    userPrompt = promptResult.renderedUserPrompt || '';
                    // Validate prompts are not empty
                    if (!systemPrompt.trim() && !userPrompt.trim()) {
                        this.monitoring.trackEvent('insight.prompt-empty-after-render', {
                            tenantId,
                            userId,
                            promptSlug,
                            insightType: intent.insightType,
                        });
                        // Fall through to fallback prompts
                        systemPrompt = '';
                        userPrompt = '';
                    }
                    else {
                        // Extract A/B test metadata if available
                        experimentId = promptResult.experimentId;
                        variantId = promptResult.variantId;
                        // Track prompt usage (analytics is now handled by PromptResolverService)
                        this.monitoring.trackEvent('insight.prompt-resolved', {
                            tenantId,
                            userId,
                            promptId: promptResult.prompt.id,
                            promptSlug,
                            sourceScope: promptResult.sourceScope,
                            insightType: intent.insightType,
                            experimentId,
                            variantId,
                        });
                    }
                }
                else {
                    // Fallback to hardcoded prompts if resolution fails
                    systemPrompt = FALLBACK_SYSTEM_PROMPTS[intent.insightType];
                    userPrompt = this.buildDefaultUserPrompt(context, query);
                    // Fallback tracking is now handled by PromptResolverService
                    this.monitoring.trackEvent('insight.prompt-fallback', {
                        tenantId,
                        userId,
                        promptSlug,
                        insightType: intent.insightType,
                        reason: 'prompt-not-found',
                    });
                }
            }
            catch (error) {
                // Fallback to hardcoded prompts on error
                this.monitoring.trackException(error, {
                    tenantId,
                    userId,
                    operation: 'prompt-resolution',
                    insightType: intent.insightType,
                });
                systemPrompt = FALLBACK_SYSTEM_PROMPTS[intent.insightType];
                userPrompt = this.buildDefaultUserPrompt(context, query);
                this.monitoring.trackEvent('insight.prompt-fallback', {
                    tenantId,
                    userId,
                    insightType: intent.insightType,
                    reason: 'resolution-error',
                });
            }
        }
        else {
            // No prompt resolver available, use hardcoded prompts
            systemPrompt = FALLBACK_SYSTEM_PROMPTS[intent.insightType];
            userPrompt = this.buildDefaultUserPrompt(context, query);
        }
        // Final validation: ensure at least one prompt is not empty
        if (!systemPrompt.trim() && !userPrompt.trim()) {
            this.monitoring.trackException(new Error('Both system and user prompts are empty'), {
                operation: 'insight.buildPrompts',
                tenantId,
                userId,
                insightType: intent.insightType,
            });
            // Use minimal fallback to prevent complete failure
            systemPrompt = FALLBACK_SYSTEM_PROMPTS[intent.insightType] || 'You are a helpful assistant.';
            userPrompt = this.buildDefaultUserPrompt(context, query) || query;
        }
        // Add grounding instructions (always add, even for resolved prompts)
        systemPrompt += '\n' + GROUNDING_INSTRUCTION;
        // Add format instructions
        if (options?.format === 'brief') {
            systemPrompt += '\n\nKeep your response concise and to the point.';
        }
        else if (options?.format === 'bullets') {
            systemPrompt += '\n\nFormat your response as bullet points.';
        }
        else if (options?.format === 'table') {
            systemPrompt += '\n\nUse tables where appropriate to organize information.';
        }
        // Add reasoning instructions
        if (options?.includeReasoning) {
            systemPrompt += '\n\nExplain your reasoning step by step.';
        }
        return { systemPrompt, userPrompt, experimentId, variantId };
    }
    /**
     * Build default user prompt template
     */
    buildDefaultUserPrompt(context, query) {
        // Sanitize user query to prevent prompt injection
        const sanitizedQuery = sanitizeUserInput(query);
        return `
CONTEXT:
${context.formattedContext}

USER QUESTION:
${sanitizedQuery}

Please provide a helpful response based on the context above.
`.trim();
    }
    /**
     * Execute LLM call with function calling support
     */
    async executeLLM(tenantId, userId, modelId, systemPrompt, userPrompt, temperature, maxTokens, projectId, toolsEnabled = true, // Enable tools by default
    userRoles // Optional user roles for permission checking in tool execution
    ) {
        // Use UnifiedAIClient if available, otherwise fall back to Azure OpenAI
        if (this.unifiedAIClient && this.aiConnectionService) {
            try {
                // Get AI connection with credentials for the model
                const connectionResult = await this.aiConnectionService.getConnectionWithCredentialsForModel(modelId, tenantId);
                if (!connectionResult) {
                    this.monitoring.trackEvent('insight.no-connection', {
                        modelId,
                        tenantId,
                        message: `No AI connection found for model: ${modelId}`,
                    });
                    throw new Error(`No AI connection found for model: ${modelId}. Please configure an AI connection in Settings > AI Connections.`);
                }
                const { connection, model, apiKey } = connectionResult;
                this.monitoring.trackEvent('insight.calling-unified-client', {
                    modelId,
                    provider: connection.endpoint,
                    connectionId: connection.id,
                });
                // Get available tools if tool executor is available and tools are enabled
                const tools = this.toolExecutor && toolsEnabled
                    ? await this.toolExecutor.getAvailableTools({
                        tenantId,
                        userId,
                        userRoles, // Optional user roles for permission checking
                        projectId,
                    })
                    : undefined;
                // Build initial messages
                const messages = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ];
                const totalUsage = { prompt: 0, completion: 0, total: 0 };
                const maxToolCallIterations = 5; // Prevent infinite loops
                let iterations = 0;
                const finalToolCalls = [];
                // Tool calling loop
                while (iterations < maxToolCallIterations) {
                    iterations++;
                    // Call unified client
                    const result = await this.unifiedAIClient.chat(connection, apiKey, {
                        messages,
                        temperature: temperature ?? DEFAULT_TEMPERATURE,
                        maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
                        tools: tools && iterations === 1 ? tools : undefined, // Only send tools on first iteration
                    });
                    // Accumulate usage
                    totalUsage.prompt += result.usage.promptTokens;
                    totalUsage.completion += result.usage.completionTokens;
                    totalUsage.total += result.usage.totalTokens;
                    // If no tool calls, return the result
                    if (!result.toolCalls || result.toolCalls.length === 0) {
                        this.monitoring.trackEvent('insight.unified-client-success', {
                            modelId,
                            tokensUsed: totalUsage.total,
                            toolCallIterations: iterations,
                        });
                        return {
                            content: result.content || '',
                            usage: totalUsage,
                            toolCalls: finalToolCalls.length > 0 ? finalToolCalls : undefined,
                            provider: model.provider,
                            connectionId: connection.id,
                        };
                    }
                    // Track tool calls
                    finalToolCalls.push(...result.toolCalls);
                    // Execute tool calls
                    if (this.toolExecutor && result.toolCalls.length > 0) {
                        this.monitoring.trackEvent('insight.tool-calls-detected', {
                            modelId,
                            toolCallCount: result.toolCalls.length,
                            iteration: iterations,
                        });
                        // Add assistant message with tool calls
                        messages.push({
                            role: 'assistant',
                            content: result.content,
                            toolCalls: result.toolCalls,
                        });
                        // Execute all tool calls
                        const toolResults = await this.toolExecutor.executeToolCalls(result.toolCalls, {
                            tenantId,
                            userId,
                            userRoles, // Pass user roles for permission checking
                            projectId,
                        });
                        // Add tool result messages
                        for (const toolResult of toolResults) {
                            messages.push({
                                role: 'tool',
                                content: toolResult.error
                                    ? JSON.stringify({ error: toolResult.error })
                                    : JSON.stringify(toolResult.result),
                                toolCallId: toolResult.toolCallId,
                            });
                        }
                        // Continue loop to get final response
                        continue;
                    }
                    else {
                        // Tool calls requested but no executor available
                        this.monitoring.trackEvent('insight.tool-calls-ignored', {
                            modelId,
                            reason: 'tool-executor-not-available',
                        });
                        break;
                    }
                }
                // If we exhausted iterations, get final response without tools
                this.monitoring.trackEvent('insight.unified-client-success', {
                    modelId,
                    tokensUsed: totalUsage.total,
                    toolCallIterations: iterations,
                    warning: iterations >= maxToolCallIterations ? 'max-iterations-reached' : undefined,
                });
                // Get final response without tools to complete the conversation
                const finalResult = await this.unifiedAIClient.chat(connection, apiKey, {
                    messages,
                    temperature: temperature ?? DEFAULT_TEMPERATURE,
                    maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
                });
                totalUsage.prompt += finalResult.usage.promptTokens;
                totalUsage.completion += finalResult.usage.completionTokens;
                totalUsage.total += finalResult.usage.totalTokens;
                return {
                    content: finalResult.content || '',
                    usage: totalUsage,
                    toolCalls: finalToolCalls.length > 0 ? finalToolCalls : undefined,
                    provider: model.provider,
                    connectionId: connection.id,
                };
            }
            catch (error) {
                this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                    operation: 'insight.executeLLM.unified-client',
                    modelId,
                    tenantId,
                });
                throw error;
            }
        }
        // Fallback: Use Azure OpenAI service (if configured)
        this.monitoring.trackEvent('insight.fallback-azure-openai', {
            modelId,
            reason: 'UnifiedAIClient or AIConnectionService not available',
        });
        try {
            const result = await this.azureOpenAI.complete(`${systemPrompt}\n\n${userPrompt}`, {
                temperature: temperature ?? DEFAULT_TEMPERATURE,
                maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
            });
            // For Azure OpenAI fallback, provider is 'azure_openai'
            return {
                content: result.text,
                usage: {
                    prompt: result.usage?.prompt_tokens || 0,
                    completion: result.usage?.completion_tokens || 0,
                    total: result.usage?.total_tokens || 0,
                },
                provider: 'azure_openai',
            };
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'insight.executeLLM.azure-openai-fallback',
                modelId,
            });
            throw new Error('No AI service configured. Please set up an AI connection or configure Azure OpenAI credentials.');
        }
    }
    /**
     * Ground response with citations
     */
    async groundResponse(content, context) {
        // Use GroundingService if available for advanced fact verification
        if (this.groundingService) {
            try {
                const grounded = await this.groundingService.ground(content, context);
                // Log grounding metrics
                this.monitoring.trackEvent('insight.grounded', {
                    claimsCount: grounded.claims.length,
                    citationCount: grounded.citations.length,
                    groundingScore: grounded.groundingScore,
                    hallucinationsDetected: grounded.warnings.length,
                });
                return grounded;
            }
            catch (error) {
                this.monitoring.trackException(error, {
                    operation: 'grounding',
                });
                // Fall back to simple grounding
            }
        }
        // Fallback: Simple citation extraction from [1], [2] markers
        const citations = [];
        // Extract existing citation references [1], [2], etc.
        const citationPattern = /\[(\d+)\]/g;
        const matches = content.matchAll(citationPattern);
        for (const match of matches) {
            const index = parseInt(match[1], 10) - 1;
            if (index >= 0 && index < context.ragChunks.length) {
                const chunk = context.ragChunks[index];
                citations.push({
                    id: `cite_${index + 1}`,
                    text: chunk.content.substring(0, 200),
                    source: {
                        shardId: chunk.shardId,
                        shardName: chunk.shardName,
                        shardTypeId: chunk.shardTypeId,
                    },
                    confidence: chunk.score,
                    matchType: 'exact',
                });
            }
        }
        // Calculate simple grounding score
        const groundingScore = citations.length > 0 ? Math.min(citations.length / 5, 1) * 0.8 + 0.2 : 0.5;
        return {
            originalContent: content,
            groundedContent: content,
            citations,
            overallConfidence: groundingScore,
            groundingScore,
            claims: [],
            warnings: [],
        };
    }
    /**
     * Generate follow-up suggestions
     */
    generateSuggestions(intent, context) {
        const suggestions = [];
        // Based on insight type
        switch (intent.insightType) {
            case 'summary':
                suggestions.push('Tell me more about the key points');
                suggestions.push('What are the risks?');
                break;
            case 'analysis':
                suggestions.push('What are the recommendations?');
                suggestions.push('Compare with similar items');
                break;
            case 'recommendation':
                suggestions.push('What are the risks of these recommendations?');
                suggestions.push('Can you prioritize these?');
                break;
            default:
                suggestions.push('Tell me more');
                suggestions.push('What else should I know?');
        }
        return suggestions.slice(0, 3);
    }
    /**
     * Format suggested action message for model unavailable errors
     */
    formatSuggestedAction(result) {
        if (result.error === 'NO_CONNECTIONS') {
            return '💡 **Action Required**: Set up AI model connections in Settings > AI Models';
        }
        if (result.error === 'NO_CAPABILITY') {
            return `💡 **${result.requestedContentType} generation is not available**\n\n` +
                `Available capabilities: ${result.availableTypes.join(', ')}\n\n` +
                `To enable ${result.requestedContentType} generation:\n` +
                `1. Go to Settings > AI Models\n` +
                `2. Add a connection for a ${result.requestedContentType} generation model\n` +
                `3. Configure your credentials and endpoint`;
        }
        return 'Please contact your administrator to configure AI models.';
    }
    /**
     * Save insight to conversation
     */
    async saveToConversation(conversationId, tenantId, userId, query, response, modelId, context) {
        try {
            // Add user message
            await this.conversationService.addMessage(conversationId, tenantId, userId, {
                content: query,
                contentType: 'text',
            });
            // Fetch connection name from AI Connection Service
            let connectionName;
            if (this.aiConnectionService && modelId) {
                try {
                    const connection = await this.aiConnectionService.getConnectionForModel(modelId, tenantId);
                    if (connection) {
                        connectionName = connection.name;
                    }
                }
                catch (error) {
                    // If we can't fetch the connection, just continue without the name
                    this.monitoring.trackEvent('insight.connectionNameFetchFailed', {
                        modelId,
                        tenantId,
                        error: error.message,
                    });
                }
            }
            // Validate content is not empty before adding to conversation
            const content = response.content || '';
            if (!content.trim()) {
                this.monitoring.trackEvent('insight.empty_content', {
                    tenantId,
                    userId,
                    conversationId,
                    modelId,
                });
                throw new Error('AI model returned empty content for conversation message');
            }
            // Add assistant message
            await this.conversationService.addAssistantMessage(conversationId, tenantId, {
                content: content.trim(),
                contentType: 'markdown',
                modelId,
                connectionName,
                tokens: response.usage,
                cost: response.cost,
                latencyMs: response.latencyMs,
                contextSources: context.ragChunks.map(chunk => ({
                    id: uuidv4(),
                    query,
                    chunks: [
                        {
                            shardId: chunk.shardId,
                            shardTypeId: chunk.shardTypeId,
                            shardName: chunk.shardName,
                            chunkIndex: chunk.chunkIndex,
                            content: chunk.content,
                            score: chunk.score,
                        },
                    ],
                    retrievedAt: new Date(),
                    totalChunks: context.ragChunks.length,
                    totalTokens: context.metadata.totalTokens,
                })),
            });
        }
        catch (error) {
            // Don't fail the main request if conversation save fails
            this.monitoring.trackException(error, {
                operation: 'insight.saveToConversation',
                conversationId,
                tenantId,
            });
        }
    }
    /**
     * Estimate cost based on usage
     */
    estimateCost(usage, modelId) {
        // Approximate pricing per 1M tokens
        const pricing = {
            'gpt-4o': { input: 2.5, output: 10 },
            'gpt-4o-mini': { input: 0.15, output: 0.6 },
            'gpt-4': { input: 30, output: 60 },
            'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
        };
        const model = pricing[modelId] || pricing['gpt-4o'];
        const inputCost = (usage.prompt / 1_000_000) * model.input;
        const outputCost = (usage.completion / 1_000_000) * model.output;
        return inputCost + outputCost;
    }
    /**
     * Record cost usage for an insight generation
     */
    async recordCostUsage(tenantId, userId, provider, model, usage, estimatedCost, durationMs, metadata) {
        if (!this.aiConfigService) {
            return; // No cost tracking service available
        }
        try {
            await this.aiConfigService.recordUsage({
                tenantId,
                userId,
                provider,
                model,
                operation: 'chat',
                promptTokens: usage.prompt,
                completionTokens: usage.completion,
                totalTokens: usage.total,
                estimatedCost,
                requestedAt: new Date(),
                durationMs,
                source: 'assistant',
                sourceId: metadata.conversationId,
                insightType: metadata.insightType,
                conversationId: metadata.conversationId,
                connectionId: metadata.connectionId,
            });
            // Track cost as custom metric for Grafana dashboard
            this.monitoring.trackMetric('ai_insights_cost', estimatedCost, {
                tenantId,
                userId,
                provider,
                model,
                insightType: metadata.insightType,
                conversationId: metadata.conversationId,
            });
            // Track token usage as custom metrics
            this.monitoring.trackMetric('ai_insights_input_tokens', usage.prompt, {
                tenantId,
                userId,
                provider,
                model,
                insightType: metadata.insightType,
            });
            this.monitoring.trackMetric('ai_insights_output_tokens', usage.completion, {
                tenantId,
                userId,
                provider,
                model,
                insightType: metadata.insightType,
            });
            this.monitoring.trackEvent('insight.cost-recorded', {
                tenantId,
                userId,
                provider,
                model,
                tokens: usage.total,
                cost: estimatedCost,
                insightType: metadata.insightType,
            });
        }
        catch (error) {
            // Log but don't throw - cost tracking is non-critical
            this.monitoring.trackException(error, {
                operation: 'insight.recordCostUsage',
                tenantId,
                provider,
                model,
            });
        }
    }
    /**
     * Rerank RAG chunks using semantic relevance scoring
     * Uses LLM to score each chunk's relevance to the query
     */
    async rerankRAGChunks(tenantId, query, chunks, insightType) {
        if (chunks.length === 0) {
            return chunks;
        }
        // Limit to top 20 chunks for reranking (to avoid excessive LLM calls)
        const chunksToRerank = chunks.slice(0, 20);
        // Use a lightweight model for reranking (if available) or fall back to default
        const rerankModelId = 'gpt-4o-mini'; // Lightweight model for cost efficiency
        try {
            // Get connection for reranking model
            const connectionResult = await this.aiConnectionService.getConnectionWithCredentialsForModel(rerankModelId, tenantId);
            if (!connectionResult) {
                // Fallback: return original order if no connection available
                return chunks;
            }
            const { connection, apiKey } = connectionResult;
            // Build prompt for relevance scoring
            const systemPrompt = `You are a relevance scorer. Rate how relevant each document chunk is to the user's query on a scale of 0.0 to 1.0.

Query: "${query}"
Insight Type: ${insightType}

Return ONLY a JSON array of scores, one per chunk, in the same order as provided. Example: [0.85, 0.72, 0.91, ...]`;
            const chunksText = chunksToRerank.map((chunk, idx) => {
                // Truncate content to ~200 tokens to keep prompt manageable
                const content = chunk.content.length > 800 ? chunk.content.substring(0, 800) + '...' : chunk.content;
                return `[${idx}] ${chunk.shardName || chunk.shardId}\n${content}`;
            }).join('\n\n');
            const userPrompt = `Rate the relevance of these ${chunksToRerank.length} document chunks:\n\n${chunksText}`;
            // Call LLM for scoring
            const result = await this.unifiedAIClient.chat(connection, apiKey, {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.1, // Low temperature for consistent scoring
                maxTokens: 500, // Small response (just scores)
            });
            // Parse scores from LLM response
            let scores = [];
            try {
                // Try to extract JSON array from response
                const jsonMatch = result.content.match(/\[[\d.,\s]+\]/);
                if (jsonMatch) {
                    scores = JSON.parse(jsonMatch[0]);
                }
                else {
                    // Fallback: try parsing the entire response as JSON
                    scores = JSON.parse(result.content);
                }
            }
            catch (parseError) {
                // If parsing fails, use original scores
                this.monitoring.trackEvent('insight.rag.rerank.parseFailed', {
                    tenantId,
                    response: result.content.substring(0, 100),
                });
                return chunks;
            }
            // Ensure we have the right number of scores
            if (scores.length !== chunksToRerank.length) {
                this.monitoring.trackEvent('insight.rag.rerank.scoreMismatch', {
                    tenantId,
                    expected: chunksToRerank.length,
                    received: scores.length,
                });
                return chunks;
            }
            // Combine original chunks with reranking scores
            // Use weighted average: 70% rerank score, 30% original vector score
            const reranked = chunksToRerank.map((chunk, idx) => ({
                ...chunk,
                originalScore: chunk.score,
                rerankScore: scores[idx],
                score: (scores[idx] * 0.7) + (chunk.score * 0.3), // Weighted combination
            }));
            // Sort by new combined score
            reranked.sort((a, b) => b.score - a.score);
            // Combine with remaining chunks (if any) that weren't reranked
            const remaining = chunks.slice(20);
            return [...reranked, ...remaining];
        }
        catch (error) {
            // If reranking fails, return original order
            this.monitoring.trackException(error, {
                operation: 'insight.rerankRAGChunks',
                tenantId,
            });
            return chunks;
        }
    }
    /**
     * Estimate token count
     */
    estimateTokens(data) {
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        return Math.ceil(str.length / 4); // Rough estimate: 4 chars per token
    }
}
//# sourceMappingURL=insight.service.js.map
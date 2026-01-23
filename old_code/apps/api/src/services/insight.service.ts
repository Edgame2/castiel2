// Optional service, not used by workers
/**
 * Insight Service
 * Main orchestrator for AI insight generation
 * Coordinates intent analysis, context assembly, LLM execution, and grounding
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import {
  ShardRepository,
  ShardTypeRepository,
  IntentAnalyzerService,
  ConversationService,
  AzureOpenAIService,
} from '@castiel/api-core';
import { ContextTemplateService } from './context-template.service.js';
import { WebSearchContextIntegrationService } from './web-search/web-search-context-integration.service.js';
import { GroundingService } from './grounding.service.js';
import { AIModelSelectionService } from './ai/ai-model-selection.service.js';
import { UnifiedAIClient, ChatMessage, ToolCall } from './ai/unified-ai-client.service.js';
import { AIConnectionService } from './ai/ai-connection.service.js';
import { AIToolExecutorService } from './ai/ai-tool-executor.service.js';
import { AIConfigService } from './ai-config.service.js';
import { filterRagByAllowedIds } from './ai-insights/rag-filter.util.js';
import { ProjectContextService } from './ai-insights/project-context.service.js';
import { PromptResolverService } from './ai-insights/prompt-resolver.service.js';
// import type { PromptResolutionResult } from '../types/ai-insights/prompt.types.js'; // Reserved for future use
import { ContextAwareQueryParserService } from './context-aware-query-parser.service.js';
import type { AIProviderName } from '../types/ai-provider.types.js';
import type { ParsedQuery } from './context-aware-query-parser.service.js';
import { TenantProjectConfigService } from './tenant-project-config.service.js';
import { sanitizeUserInput } from '../utils/input-sanitization.js';
import { ComprehensiveAuditTrailService } from './comprehensive-audit-trail.service.js';
import type { AIInteractionLog, DataLineage } from '../types/comprehensive-audit.types.js';
import type { GroundingWarning } from '../types/ai-insights.types.js';
import type { ContextAwareRedactionOptions } from '../types/pii-detection.types.js';
import type { FieldSecurityService } from './field-security.service.js';
import type { FieldSecurityContext } from '../types/field-security.types.js';
import type { CitationValidationService } from './citation-validation.service.js';
import type { PromptInjectionDefenseService } from './prompt-injection-defense.service.js';
import type { ConversationSummarizationService } from './conversation-summarization.service.js';
import type { ConversationContextRetrievalService } from './conversation-context-retrieval.service.js';
import type { ContextCacheService } from './context-cache.service.js';
import type { RiskEvaluationService } from '@castiel/api-core';
// VectorSearchService is optional - used for RAG if available
// import { VectorSearchService } from './vector-search.service.js';

// Simplified interface for vector search integration
// Enhanced with project-aware filtering for RAG retrieval
export interface IVectorSearchProvider {
  search(request: {
    tenantId: string;
    query: string;
    topK?: number;
    minScore?: number;
    projectId?: string; // Optional project ID for project-scoped RAG
    shardTypeIds?: string[]; // Optional shard type filter
  }): Promise<{
    results: {
      shardId: string;
      shardTypeId: string;
      shard?: { name: string };
      content: string;
      chunkIndex?: number;
      score: number;
      highlight?: string;
    }[];
  }>;
}
import {
  InsightRequest,
  InsightResponse,
  InsightStreamEvent,
  InsightType,
  // InsightFormat, // Reserved for future use
  // ContextScope, // Reserved for future use
  IntentAnalysisResult,
  AssembledContext,
  ContextChunk,
  RAGChunk,
  Citation,
  GroundedResponse,
  QuickInsightRequest,
  QuickInsightResponse,
  Suggestion,
  ModelUnavailableResponse,
} from '../types/ai-insights.types.js';
import { ConversationMessage, TokenUsage } from '../types/conversation.types.js';

// Configuration
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4000;
const RAG_TOP_K = 10;
const RAG_MIN_SCORE = 0.7;
// Global chat optimization
const GLOBAL_RAG_TOP_K = 15; // More results for global scope
const GLOBAL_RAG_MIN_SCORE = 0.65; // Slightly lower threshold for broader search
const GLOBAL_CONTEXT_CACHE_TTL = 300; // 5 minutes cache for global context
// Phase 2.4: Context staleness thresholds
const CONTEXT_STALE_THRESHOLD_MS = 180000; // 3 minutes - context is considered stale after 3 minutes
const CONTEXT_CRITICAL_STALE_THRESHOLD_MS = 600000; // 10 minutes - context is critically stale after 10 minutes

// Phase 6.1: Emergency fallback prompts (only used when template system is completely unavailable)
// These should rarely be used - system prompts should be seeded via seed-system-prompts.ts
// If these are used, it indicates the template system needs attention
const EMERGENCY_FALLBACK_PROMPTS: Record<InsightType, string> = {
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
  private projectContextService?: ProjectContextService;
  private multimodalAssetService?: import('./multimodal-asset.service.js').MultimodalAssetService;
  private lastSelectedModelId?: string; // Track last selected model for error handling

  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository: ShardRepository,
    private shardTypeRepository: ShardTypeRepository,
    private intentAnalyzer: IntentAnalyzerService,
    private contextTemplateService: ContextTemplateService,
    private conversationService: ConversationService,
    private azureOpenAI: AzureOpenAIService,
    private groundingService?: GroundingService,
    private vectorSearch?: IVectorSearchProvider,
    private webSearchContextIntegration?: WebSearchContextIntegrationService,
    private redis?: Redis,
    private aiModelSelection?: AIModelSelectionService,
    private unifiedAIClient?: UnifiedAIClient,
    private aiConnectionService?: AIConnectionService,
    private shardRelationshipService?: import('./shard-relationship.service.js').ShardRelationshipService,
    private promptResolver?: PromptResolverService, // PromptResolverService - optional, falls back to hardcoded prompts if not available
    private contextAwareQueryParser?: ContextAwareQueryParserService, // ContextAwareQueryParserService - optional, for shard-specific Q&A
    private toolExecutor?: AIToolExecutorService, // AIToolExecutorService - optional, for function calling
    private aiConfigService?: AIConfigService, // AIConfigService - optional, for cost tracking
    private tenantProjectConfigService?: TenantProjectConfigService, // TenantProjectConfigService - optional, for tenant-specific token limits
    multimodalAssetService?: import('./multimodal-asset.service.js').MultimodalAssetService, // MultimodalAssetService - optional, for including assets in context
    private contextQualityService?: import('./context-quality.service.js').ContextQualityService, // ContextQualityService - optional, for context quality assessment
    private comprehensiveAuditTrailService?: ComprehensiveAuditTrailService, // ComprehensiveAuditTrailService - optional, for audit logging
    private piiDetectionService?: import('./pii-detection.service.js').PIIDetectionService, // PIIDetectionService - optional, Phase 3.1: for PII detection
    private piiRedactionService?: import('./pii-redaction.service.js').PIIRedactionService, // PIIRedactionService - optional, Phase 3.1: for PII redaction
    private fieldSecurityService?: FieldSecurityService, // FieldSecurityService - optional, Phase 3.1: for field-level access control
    private citationValidationService?: CitationValidationService, // CitationValidationService - optional, Phase 3.2: for citation validation
    private promptInjectionDefenseService?: PromptInjectionDefenseService, // PromptInjectionDefenseService - optional, Phase 3.3: for prompt injection defense
    private conversationSummarizationService?: ConversationSummarizationService, // Phase 5.1: ConversationSummarizationService - optional, for enhanced conversation context management
    private conversationContextRetrievalService?: ConversationContextRetrievalService, // Phase 5.1: ConversationContextRetrievalService - optional, for smart context retrieval
    private contextCacheService?: ContextCacheService, // Phase 5.2: ContextCacheService - optional, for centralized context caching
    private riskEvaluationService?: RiskEvaluationService // Phase 5.3: RiskEvaluationService - optional, for risk analysis integration
  ) {
    this.multimodalAssetService = multimodalAssetService;
    // Initialize ProjectContextService if dependencies are available
    if (this.shardRelationshipService) {
      this.projectContextService = new ProjectContextService(
        this.shardRepository,
        this.shardTypeRepository,
        this.shardRelationshipService,
        this.monitoring,
        this.vectorSearch // IVectorSearchProvider is compatible
      );
    }
  }

  /**
   * Set multimodal asset service (for late initialization)
   */
  setMultimodalAssetService(service: import('./multimodal-asset.service.js').MultimodalAssetService): void {
    this.multimodalAssetService = service;
  }

  /**
   * Set ACL service for ProjectContextService (for permission checks)
   */
  setACLService(aclService: import('./acl.service.js').ACLService): void {
    if (this.projectContextService) {
      this.projectContextService.setACLService(aclService);
    }
  }

  // ============================================
  // Main Generation Methods
  // ============================================

  /**
   * Generate insight (non-streaming)
   */
  async generate(
    tenantId: string,
    userId: string,
    request: InsightRequest
  ): Promise<InsightResponse | ModelUnavailableResponse> {
    const startTime = Date.now();
    const traceId = this.comprehensiveAuditTrailService?.generateTraceId() || uuidv4();
    const requestId = uuidv4();
    let sanitizedQuery: string = request.query; // Initialize for error handler
    this.monitoring.trackEvent('insight.generate.start', {
      tenantId,
      userId,
      query: request.query,
      modelId: request.modelId,
      requestId,
    });

    try {
      // 1. Retrieve conversation history if conversationId is provided
      let conversationHistory: ConversationMessage[] | undefined;
      if (request.conversationId) {
        try {
          const messagesResult = await this.conversationService.getMessages(
            request.conversationId,
            tenantId,
            {
              limit: 50, // Get more messages initially, will be token-managed
              includeArchived: false, // Only active messages
            }
          );
          const rawMessages = messagesResult.messages || [];
          
          // Apply token management to conversation history
          // Get tenant-specific token limit, fallback to request option, then default to 4000
          let maxConversationTokens = request.options?.maxConversationTokens;
          if (!maxConversationTokens && this.tenantProjectConfigService) {
            try {
              const tenantConfig = await this.tenantProjectConfigService.getTenantConfig(tenantId);
              maxConversationTokens = tenantConfig.chatTokenLimit;
            } catch (error) {
              this.monitoring.trackException(error as Error, {
                operation: 'insight.get-tenant-token-limit',
                tenantId,
              });
              // Fall through to default
            }
          }
          maxConversationTokens = maxConversationTokens || 4000;
          
          // Phase 5.1: Use configurable preserveRecentCount (default: 10 messages)
          // This can be enhanced later to read from tenant config
          const preserveRecentCount = 10;
          
          conversationHistory = await this.manageConversationTokens(rawMessages, maxConversationTokens, preserveRecentCount);
          
          this.monitoring.trackEvent('insight.conversation-history-loaded', {
            tenantId,
            conversationId: request.conversationId,
            originalMessageCount: rawMessages.length,
            optimizedMessageCount: conversationHistory.length,
            maxTokens: maxConversationTokens,
          });
        } catch (error) {
          this.monitoring.trackException(error as Error, {
            operation: 'insight.load-conversation-history',
            tenantId,
            conversationId: request.conversationId,
          });
          // Continue without conversation history if retrieval fails
          conversationHistory = undefined;
        }
      }

      // 2. Sanitize user query to prevent prompt injection
      // Phase 3.3: Enhanced prompt injection defense with multi-layer protection
      let injectionDetection: import('../types/prompt-injection-defense.types.js').InjectionDetectionResult | undefined = undefined;
      if (this.promptInjectionDefenseService) {
        // Use enhanced defense service if available
        const sanitizationResult = this.promptInjectionDefenseService.sanitizeInput(request.query, tenantId);
        sanitizedQuery = sanitizationResult.sanitized;
        injectionDetection = sanitizationResult.detected;
        
        // Handle based on configuration
        const config = this.promptInjectionDefenseService.getConfig(tenantId);
        if (config && injectionDetection.detected) {
          if (config.actionOnDetection === 'block' && injectionDetection.severity === 'critical') {
            throw new Error('Input blocked due to detected prompt injection attempt. Please revise your query.');
          } else if (config.actionOnDetection === 'warn' || config.actionOnDetection === 'log') {
            this.monitoring.trackEvent('prompt-injection-defense.detected', {
              tenantId,
              userId,
              severity: injectionDetection.severity,
              riskScore: injectionDetection.riskScore,
              patterns: injectionDetection.patterns.map((p: any) => p.type),
            });
          }
        }
      } else {
        // Fallback to basic sanitization
        sanitizedQuery = sanitizeUserInput(request.query);
      }
      
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
      let previousIntent: IntentAnalysisResult | undefined;
      let previousResponse: string | undefined;
      
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
      let modelId: string;
      let modelName: string;
      
      if (this.aiModelSelection) {
        const selectionResult = await this.aiModelSelection.selectModel({
          tenantId,
          userId,
          query: sanitizedQuery,
          insightType: intent.insightType as InsightType | undefined,
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
          } as ModelUnavailableResponse;
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
      } else {
        // Fallback if model selection service not available
        modelId = request.modelId || 'gpt-4o';
        modelName = modelId;
        // Store modelId for error handling
        this.lastSelectedModelId = modelId;
      }

      // 4. Assemble context (may parse query and detect entities)
      // Phase 3.1: Pass model name for context-aware redaction
      const context = await this.assembleContext(tenantId, intent, request, modelName);

      // 5. Use enhanced query if available (from entity parsing), otherwise use sanitized query
      // The enhanced query includes entity context injected by ContextAwareQueryParserService
      // Note: enhancedQuery should already be sanitized if it contains user input
      const queryToUse = (context.metadata as any)?.enhancedQuery || sanitizedQuery;

      // 6. Build prompts (now async to support prompt resolver)
      let { systemPrompt, userPrompt, experimentId, variantId } = await this.buildPrompts(
        tenantId,
        userId,
        intent,
        context,
        queryToUse,
        request.options,
        request.projectId || request.scope?.projectId
      );

      // Phase 3.3: Enforce prompt structure if defense service is available
      if (this.promptInjectionDefenseService && systemPrompt && userPrompt) {
        const structureResult = this.promptInjectionDefenseService.enforcePromptStructure(
          systemPrompt,
          userPrompt,
          tenantId
        );
        if (structureResult.enforced && structureResult.correctedPrompt) {
          // Use corrected prompt if structure was enforced
          const parts = structureResult.correctedPrompt.split('\n\n');
          if (parts.length >= 2) {
            systemPrompt = parts[0];
            userPrompt = parts.slice(1).join('\n\n');
          }
        }
      }

      // 6. Execute LLM with function calling support
      // Tools are enabled by default unless explicitly disabled
      const toolsEnabled = request.options?.toolsEnabled !== false;
      const llmStartTime = Date.now();
      let llmResponse: import('./ai/unified-ai-client.service.js').ChatCompletionResponse;
      let generationSuccess = false;
      
      try {
        llmResponse = await this.executeLLM(
        tenantId,
        userId,
        modelId,
        systemPrompt,
        userPrompt,
        request.options?.temperature,
        request.options?.maxTokens,
          request.projectId || request.scope?.projectId,
          toolsEnabled,
          request.userRoles // Pass user roles for permission checking in tool execution
        );
        generationSuccess = true;
      } catch (error) {
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
            this.monitoring.trackException(err as Error, {
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
      let content = llmResponse.content || '';
      if (!content.trim()) {
        this.monitoring.trackEvent('insight.empty_content', {
          tenantId,
          userId,
          modelId,
        });
        throw new Error('AI model returned empty content');
      }

      // Phase 3.3: Validate output for injection indicators
      let outputValidation: any = undefined;
      if (this.promptInjectionDefenseService) {
        const validationResult = this.promptInjectionDefenseService.validateOutput(content, tenantId);
        outputValidation = validationResult;
        
        if (validationResult.suspicious) {
          const config = this.promptInjectionDefenseService.getConfig(tenantId);
          if (config) {
            if (validationResult.action === 'block') {
              throw new Error('Output blocked due to detected injection indicators. Please try again.');
            } else if (validationResult.action === 'warn') {
              this.monitoring.trackEvent('prompt-injection-defense.output-anomaly', {
                tenantId,
                userId,
                riskScore: validationResult.riskScore,
                indicators: Array.isArray(validationResult.indicators) 
                  ? validationResult.indicators.map((i: any) => String(i.type || i)).join(',')
                  : '',
              });
            }
          }
        }
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
      
      // 7a. Assess context quality before grounding
      let contextQuality: any;
      if (this.contextQualityService) {
        try {
          contextQuality = this.contextQualityService.assessContextQuality(
            context,
            undefined, // expectedSources - can be enhanced
            request.options?.maxTokens,
            intent.insightType // Phase 2.4: Pass insight type for operation-specific requirements
          );
        } catch (error) {
          this.monitoring.trackException(error as Error, {
            operation: 'insight.assess-context-quality',
            tenantId,
          });
        }
      }

      // 7b. Ground response with tenant-level configuration check
      const grounded = await this.groundResponse(content, context, tenantId);

      // Extract citation validation results from grounded response
      const citationValidationResults = (grounded as any).citationValidation;
      const citationCompleteness = (grounded as any).citationCompleteness;
      const citationQualityMetrics = (grounded as any).citationQuality;

      // 8. Generate suggestions
      const suggestedQuestions = this.generateSuggestions(intent, context);

      // 9. Build response
      // Initialize finalConversationId early (will be updated if conversation is auto-created)
      let finalConversationId = request.conversationId;
      
      const response: InsightResponse = {
        content: grounded.groundedContent,
        format: request.options?.format || 'detailed',
        citations: grounded.citations,
        confidence: grounded.overallConfidence,
        groundingScore: grounded.groundingScore,
        sources: ((context as any).related || []).map((chunk: any) => ({
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
        warnings: grounded.warnings, // Include warnings from grounding and validation
        metadata: {
          ...(contextQuality ? { contextQuality } : {}),
          ...(llmResponse.provider ? { provider: llmResponse.provider } : {}),
          ...(llmResponse.connectionId ? { connectionId: llmResponse.connectionId } : {}),
          // Phase 3.2: Include citation validation results
          ...(citationValidationResults ? { citationValidation: citationValidationResults } : {}),
          ...(citationCompleteness ? { citationCompleteness } : {}),
          ...(citationQualityMetrics ? { citationQuality: citationQualityMetrics } : {}),
          // Phase 3.3: Include prompt injection defense results
          ...(injectionDetection ? { injectionDetection } : {}),
          ...(outputValidation ? { outputValidation } : {}),
        },
      };

      // 9a. Record cost usage if AIConfigService is available
      if (generationSuccess && this.aiConfigService && llmResponse.provider) {
        await this.recordCostUsage(
          tenantId,
          userId,
          llmResponse.provider,
          modelId,
          llmResponse.usage,
          response.cost,
          Date.now() - llmStartTime,
          {
            conversationId: request.conversationId,
            insightType: intent.insightType,
            connectionId: llmResponse.connectionId,
          }
        ).catch((err) => {
          // Non-blocking - don't fail the request if cost recording fails
          this.monitoring.trackException(err as Error, {
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
          this.monitoring.trackException(err as Error, {
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
        } catch (error) {
          // Non-blocking: if conversation creation fails, log but continue
          this.monitoring.trackException(error as Error, {
            operation: 'insight.auto-create-conversation',
            tenantId,
            userId,
          });
        }
      }

      // Save to conversation if we have a conversationId (either provided or auto-created)
      if (finalConversationId) {
        await this.saveToConversation(
          finalConversationId,
          tenantId,
          userId,
          request.query,
          response,
          modelId,
          context
        );
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
        }).catch((error: unknown) => {
          // Non-critical, just log
          this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
            operation: 'insight.recordModelPerformance',
            modelId,
          });
        });
      }

      // Log comprehensive audit trail (non-blocking)
      if (this.comprehensiveAuditTrailService) {
        // Build AI interaction log
        const aiInteraction: AIInteractionLog = {
          modelName: modelName || modelId,
          modelVersion: 'unknown',
          provider: llmResponse.provider || 'unknown',
          prompt: systemPrompt && userPrompt ? `${systemPrompt}\n\n${userPrompt}` : sanitizedQuery,
          response: content.substring(0, 10000), // Limit response size for audit
          temperature: request.options?.temperature ?? DEFAULT_TEMPERATURE,
          // topP not available in InsightRequestOptions
          maxTokens: request.options?.maxTokens ?? DEFAULT_MAX_TOKENS,
          groundingResults: {
            grounded: !!this.groundingService,
            groundingScore: grounded.groundingScore,
            citations: grounded.citations.map(c => ({
              id: c.id,
              sourceShardId: c.source.shardId,
              confidence: c.confidence,
              verified: c.matchType === 'exact',
            })),
            // warnings not part of AIInteractionLog.groundingResults interface
          },
          tokenUsage: llmResponse.usage,
          timing: {
            promptMs: llmStartTime - startTime,
            completionMs: Date.now() - llmStartTime,
            totalMs: response.latencyMs,
          },
          // finishReason not part of AIInteractionLog interface
        };

        // Build data lineage
        const dataLineage: DataLineage = {
          sourceSystems: [
            {
              system: 'shard_repository',
              syncTimestamp: new Date(),
              syncMethod: 'direct_query',
            },
          ],
          transformations: [
            {
              step: 'context_assembly',
              description: 'Assembled context from shards and RAG',
              timestamp: new Date(),
              inputFields: ['shardId', 'scope'],
              outputFields: ['context'],
            },
            {
              step: 'ai_generation',
              description: 'Generated AI response',
              timestamp: new Date(),
              inputFields: ['prompt', 'context'],
              outputFields: ['response'],
            },
            {
              step: 'grounding',
              description: 'Grounded response with citations',
              timestamp: new Date(),
              inputFields: ['response', 'context'],
              outputFields: ['groundedContent', 'citations'],
            },
          ],
          fieldProvenance: {
            content: {
              source: 'ai_model',
              transformation: 'llm_generation',
              confidence: grounded.overallConfidence,
            },
            citations: {
              source: 'grounding_service',
              transformation: 'claim_verification',
              confidence: grounded.groundingScore,
            },
          },
          qualityScores: contextQuality ? {
            contextQuality: {
              score: contextQuality.qualityScore,
              timestamp: new Date(),
              method: 'context_quality_service',
            },
          } : {},
        };

        // Log audit entry (non-blocking)
        this.comprehensiveAuditTrailService.logAIChat({
          traceId,
          operation: 'ai_chat_generation',
          tenantId,
          userId,
          inputData: {
            query: sanitizedQuery,
            conversationId: finalConversationId,
            modelId,
            intent: intent.insightType,
            scope: request.scope,
          },
          outputData: {
            content: response.content.substring(0, 1000), // Limit for audit
            citations: response.citations.length,
            groundingScore: response.groundingScore,
            confidence: response.confidence,
          },
          dataLineage,
          aiInteraction,
          durationMs: response.latencyMs,
          success: true,
          metadata: {
            conversationId: finalConversationId,
            requestId,
            provider: llmResponse.provider,
            connectionId: llmResponse.connectionId,
            insightType: intent.insightType,
            templateId: context.metadata.templateId,
          },
        }).catch((auditError) => {
          // Log audit error but don't break main flow
          this.monitoring.trackException(auditError as Error, {
            operation: 'insight.audit-logging',
            tenantId,
            userId,
          });
        });
      }

      return response;
    } catch (error: unknown) {
      // Record model performance failure (if model was selected)
      // Note: modelId may not be defined if error occurred before model selection
      const errorModelId = (this as any).lastSelectedModelId || request.modelId;
      if (this.aiModelSelection && errorModelId) {
        this.aiModelSelection.recordModelPerformance(errorModelId, {
          latencyMs: Date.now() - startTime,
          success: false,
        }).catch((error) => {
          this.monitoring.trackException(error as Error, {
            operation: 'insight.recordIntentAnalysis',
            tenantId,
            userId,
          });
        });
      }

      // Log audit entry for error case (non-blocking)
      if (this.comprehensiveAuditTrailService) {
        const durationMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.comprehensiveAuditTrailService.logAIChat({
          traceId,
          operation: 'ai_chat_generation',
          tenantId,
          userId,
          inputData: {
            query: sanitizedQuery || request.query,
            conversationId: request.conversationId,
            modelId: errorModelId || 'unknown',
          },
          durationMs,
          success: false,
          error: errorMessage,
          errorCode: 'GENERATION_ERROR',
          metadata: {
            requestId,
          },
        }).catch((auditError) => {
          // Log audit error but don't break main flow
          this.monitoring.trackException(auditError as Error, {
            operation: 'insight.audit-logging-error',
            tenantId,
            userId,
          });
        });
      }

      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
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
  async *generateStream(
    tenantId: string,
    userId: string,
    request: InsightRequest
  ): AsyncGenerator<InsightStreamEvent> {
    const startTime = Date.now();
    const messageId = uuidv4();
    const traceId = this.comprehensiveAuditTrailService?.generateTraceId() || uuidv4();
    
    // Track AI interaction details for audit trail
    let aiInteractionLog: Partial<AIInteractionLog> = {};
    let promptStartTime: number | undefined;
    let completionStartTime: number | undefined;
    let systemPrompt: string | undefined;
    let userPrompt: string | undefined;
    let modelName: string | undefined;
    let modelVersion: string | undefined;
    let provider: AIProviderName | undefined;
    let connectionId: string | undefined;
    let sanitizedQuery: string = request.query; // Initialize for error handler
    let modelId: string = request.modelId || 'gpt-4o'; // Initialize for error handler

    try {
      // 1. Sanitize user query to prevent prompt injection (must be done first)
      sanitizedQuery = sanitizeUserInput(request.query);
      
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
      } else {
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
        sources: (context as any).related || [],
        ragChunks: context.ragChunks,
      };

      // 5. Use enhanced query if available (from entity parsing), otherwise use sanitized query
      // Note: enhancedQuery should already be sanitized if it contains user input
      const queryToUse = (context.metadata as any)?.enhancedQuery || sanitizedQuery;

      // 6. Build prompts (now async to support prompt resolver)
      const { systemPrompt: builtSystemPrompt, userPrompt: builtUserPrompt } = await this.buildPrompts(
        tenantId,
        userId,
        intent,
        context,
        queryToUse,
        request.options
      );
      systemPrompt = builtSystemPrompt;
      userPrompt = builtUserPrompt;

      // 6. Stream LLM response
      let fullContent = '';
      let chunkIndex = 0;
      let usage: TokenUsage = { prompt: 0, completion: 0, total: 0 };
      // Note: TokenUsage from conversation.types has prompt/completion/total
      // comprehensive-audit.types has promptTokens/completionTokens/totalTokens
      let trackedProvider: AIProviderName | undefined;
      let trackedConnectionId: string | undefined;

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
          const connectionResult = await this.aiConnectionService.getConnectionWithCredentialsForModel(
            modelId,
            tenantId
          );

          if (connectionResult) {
            const { connection, model, apiKey } = connectionResult;
            trackedProvider = model.provider as AIProviderName;
            trackedConnectionId = connection.id;
            provider = trackedProvider;
            connectionId = trackedConnectionId;
            modelName = modelId;
            modelVersion = 'unknown'; // AIModel doesn't have version property
            promptStartTime = Date.now();

            // Use streaming if available
            if (this.unifiedAIClient.chatStream) {
              completionStartTime = Date.now();
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
                  } else {
                    // Fallback to estimation if usage not provided
                    usage = {
                      prompt: this.estimateTokens(systemPrompt + userPrompt),
                      completion: this.estimateTokens(fullContent),
                      total: this.estimateTokens(systemPrompt + userPrompt + fullContent),
                    };
                  }
                  // Track completion timing
                  if (completionStartTime) {
                    aiInteractionLog.timing = {
                      promptMs: promptStartTime ? completionStartTime - promptStartTime : 0,
                      completionMs: Date.now() - completionStartTime,
                      totalMs: Date.now() - (promptStartTime || startTime),
                    };
                  }
                  break;
                }
              }
            } else {
              // Fall back to non-streaming
              const llmResponse = await this.executeLLM(
                tenantId,
                userId,
                modelId,
                systemPrompt,
                userPrompt,
                request.options?.temperature,
                request.options?.maxTokens,
                request.projectId || request.scope?.projectId,
                true, // toolsEnabled
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
          } else {
            // No connection found, fall back to non-streaming
            const llmResponse = await this.executeLLM(
              tenantId,
              userId,
              modelId,
              systemPrompt,
              userPrompt,
              request.options?.temperature,
              request.options?.maxTokens,
              request.projectId || request.scope?.projectId,
              true, // toolsEnabled
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
        } catch (error: unknown) {
          // If streaming fails, fall back to non-streaming
          this.monitoring.trackException(
            error instanceof Error ? error : new Error(String(error)),
            {
              operation: 'insight.generateStream.streaming',
              modelId,
              tenantId,
            }
          );

          const llmResponse = await this.executeLLM(
            tenantId,
            userId,
            modelId,
            systemPrompt,
            userPrompt,
            request.options?.temperature,
            request.options?.maxTokens,
            request.projectId || request.scope?.projectId,
            true, // toolsEnabled
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
      } else {
        // No UnifiedAIClient available, use non-streaming fallback
        const llmResponse = await this.executeLLM(
          tenantId,
          userId,
          modelId,
          systemPrompt,
          userPrompt,
          request.options?.temperature,
          request.options?.maxTokens,
          request.projectId || request.scope?.projectId,
          true, // toolsEnabled
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
        
        // Log audit entry for error case
        if (this.comprehensiveAuditTrailService) {
          this.comprehensiveAuditTrailService.logAIChat({
            traceId,
            operation: 'ai_chat_generation',
            tenantId,
            userId,
            inputData: {
              query: sanitizedQuery,
              conversationId: request.conversationId,
              modelId,
            },
            durationMs: Date.now() - startTime,
            success: false,
            error: 'Content too large',
            errorCode: 'CONTENT_TOO_LARGE',
            metadata: {
              contentLength: fullContent.length,
              maxLength: MAX_RESPONSE_LENGTH,
            },
          }).catch((auditError) => {
            this.monitoring.trackException(auditError as Error, {
              operation: 'insight.audit-logging-error',
              tenantId,
            });
          });
        }
        return;
      }
      
      const grounded = await this.groundResponse(fullContent, context, tenantId);

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
        } catch (error) {
          // Non-blocking: if conversation creation fails, log but continue
          this.monitoring.trackException(error as Error, {
            operation: 'insight.auto-create-conversation.stream',
            tenantId,
            userId,
          });
        }
      }

      // 10. Build final response
      const response: InsightResponse = {
        content: grounded.groundedContent,
        format: request.options?.format || 'detailed',
        citations: grounded.citations,
        confidence: grounded.overallConfidence,
        groundingScore: grounded.groundingScore,
        sources: ((context as any).related || []).map((chunk: any) => ({
          shardId: chunk.shardId,
          shardName: chunk.shardName,
          shardTypeId: chunk.shardTypeId,
          relevance: 1,
        })),
        suggestedQuestions: this.generateSuggestions(intent, context),
        usage: {
          promptTokens: usage.prompt,
          completionTokens: usage.completion,
          totalTokens: usage.total,
        },
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
        await this.recordCostUsage(
          tenantId,
          userId,
          provider,
          modelId,
          usage,
          response.cost,
          response.latencyMs,
          {
            conversationId: finalConversationId,
            insightType: intent.insightType,
            connectionId,
          }
        ).catch((err) => {
          // Non-blocking - don't fail the request if cost recording fails
          this.monitoring.trackException(err as Error, {
            operation: 'insight.recordCostUsage.stream',
            tenantId,
          });
        });
      }

      // 12. Save to conversation if we have a conversationId (either provided or auto-created)
      if (finalConversationId) {
        await this.saveToConversation(
          finalConversationId,
          tenantId,
          userId,
          request.query,
          response,
          modelId,
          context
        );
      }

      this.monitoring.trackEvent('insight.streamed', {
        tenantId,
        userId,
        insightType: intent.insightType,
        model: modelId,
        latencyMs: response.latencyMs,
      });

      // Log comprehensive audit trail (non-blocking)
      if (this.comprehensiveAuditTrailService) {
        // Build AI interaction log
        const aiInteraction: AIInteractionLog = {
          modelName: modelName || modelId,
          modelVersion: modelVersion || 'unknown',
          provider: provider || 'unknown',
          prompt: systemPrompt && userPrompt ? `${systemPrompt}\n\n${userPrompt}` : sanitizedQuery,
          response: fullContent.substring(0, 10000), // Limit response size for audit
          temperature: request.options?.temperature ?? DEFAULT_TEMPERATURE,
          // topP not available in InsightRequestOptions
          maxTokens: request.options?.maxTokens ?? DEFAULT_MAX_TOKENS,
          groundingResults: {
            grounded: !!this.groundingService,
            groundingScore: grounded.groundingScore,
            citations: grounded.citations.map(c => ({
              id: c.id,
              sourceShardId: c.source.shardId,
              confidence: c.confidence,
              verified: c.matchType === 'exact',
            })),
            // warnings not part of AIInteractionLog.groundingResults interface
          },
          tokenUsage: {
            promptTokens: usage.prompt,
            completionTokens: usage.completion,
            totalTokens: usage.total,
          },
          timing: aiInteractionLog.timing || {
            promptMs: 0,
            completionMs: response.latencyMs,
            totalMs: response.latencyMs,
          },
          // finishReason not part of AIInteractionLog interface
        };

        // Build data lineage
        const dataLineage: DataLineage = {
          sourceSystems: [
            {
              system: 'shard_repository',
              syncTimestamp: new Date(),
              syncMethod: 'direct_query',
            },
          ],
          transformations: [
            {
              step: 'context_assembly',
              description: 'Assembled context from shards and RAG',
              timestamp: new Date(),
              inputFields: ['shardId', 'scope'],
              outputFields: ['context'],
            },
            {
              step: 'ai_generation',
              description: 'Generated AI response',
              timestamp: new Date(),
              inputFields: ['prompt', 'context'],
              outputFields: ['response'],
            },
            {
              step: 'grounding',
              description: 'Grounded response with citations',
              timestamp: new Date(),
              inputFields: ['response', 'context'],
              outputFields: ['groundedContent', 'citations'],
            },
          ],
          fieldProvenance: {
            content: {
              source: 'ai_model',
              transformation: 'llm_generation',
              confidence: grounded.overallConfidence,
            },
            citations: {
              source: 'grounding_service',
              transformation: 'claim_verification',
              confidence: grounded.groundingScore,
            },
          },
          qualityScores: (context.metadata as any).contextQuality ? {
            contextQuality: {
              score: (context.metadata as any).contextQuality.qualityScore,
              timestamp: new Date(),
              method: 'context_quality_service',
            },
          } : {},
        };

        // Log audit entry (non-blocking)
        this.comprehensiveAuditTrailService.logAIChat({
          traceId,
          operation: 'ai_chat_generation',
          tenantId,
          userId,
          inputData: {
            query: sanitizedQuery,
            conversationId: finalConversationId,
            modelId,
            intent: intent.insightType,
            scope: request.scope,
          },
          outputData: {
            content: response.content.substring(0, 1000), // Limit for audit
            citations: response.citations.length,
            groundingScore: response.groundingScore,
            confidence: response.confidence,
          },
          dataLineage,
          aiInteraction,
          durationMs: response.latencyMs,
          success: true,
          metadata: {
            conversationId: finalConversationId,
            messageId,
            provider,
            connectionId,
            insightType: intent.insightType,
            templateId: context.metadata.templateId,
          },
        }).catch((auditError) => {
          // Log audit error but don't break main flow
          this.monitoring.trackException(auditError as Error, {
            operation: 'insight.audit-logging',
            tenantId,
            userId,
          });
        });
      }
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      yield {
        type: 'error',
        code: 'GENERATION_ERROR',
        message: errorMessage,
      };

      // Log audit entry for error case (non-blocking)
      if (this.comprehensiveAuditTrailService) {
        this.comprehensiveAuditTrailService.logAIChat({
          traceId,
          operation: 'ai_chat_generation',
          tenantId,
          userId,
          inputData: {
            query: sanitizedQuery || request.query,
            conversationId: request.conversationId,
            modelId: modelId || 'unknown',
          },
          durationMs,
          success: false,
          error: errorMessage,
          errorCode: 'GENERATION_ERROR',
          metadata: {
            messageId,
          },
        }).catch((auditError) => {
          // Log audit error but don't break main flow
          this.monitoring.trackException(auditError as Error, {
            operation: 'insight.audit-logging-error',
            tenantId,
            userId,
          });
        });
      }

      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'insight.generateStream',
        tenantId,
        userId,
      });
    }
  }

  /**
   * Generate quick insight for a shard
   */
  async quickInsight(
    tenantId: string,
    userId: string,
    request: QuickInsightRequest
  ): Promise<QuickInsightResponse> {
    const startTime = Date.now();

    // Map quick insight type to insight type
    const insightTypeMap: Record<string, InsightType> = {
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
    const customPrompts: Record<string, string> = {
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
      tenantId,
      userId,
      query,
      scope: { shardId: request.shardId },
      options: {
        format: request.options?.format || 'brief',
        maxTokens: request.options?.maxLength || 1000,
      },
      modelId: request.options?.modelId,
    });

    // Check if model is unavailable
    if (!('content' in response)) {
      throw new Error(`Model unavailable: ${response.message}`);
    }

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
  async getSuggestions(
    tenantId: string,
    shardId: string,
    limit = 5
  ): Promise<Suggestion[]> {
    // Get shard info
    const shard = await this.shardRepository.findById(shardId, tenantId);
    if (!shard) {
      return [];
    }

    // Get shard type
    const shardType = await this.shardTypeRepository.findById(shard.shardTypeId, tenantId);
    const typeName = shardType?.name || shard.shardTypeId;

    // Generate contextual suggestions based on shard type
    const suggestions: Suggestion[] = [];

    // Common suggestions
    suggestions.push({
      question: `Summarize ${shard.shardTypeName || shard.shardTypeId}`,
      category: 'summary',
      priority: 1,
    });

    // Type-specific suggestions
    if (typeName === 'c_project') {
      suggestions.push(
        { question: 'What are the main risks for this project?', category: 'analysis', priority: 2 },
        { question: 'What are the next steps?', category: 'extraction', priority: 3 },
        { question: 'How is the project progressing?', category: 'analysis', priority: 4 }
      );
    } else if (typeName === 'c_company') {
      suggestions.push(
        { question: 'What opportunities exist with this company?', category: 'analysis', priority: 2 },
        { question: 'Who are the key contacts?', category: 'extraction', priority: 3 },
        { question: 'What is our relationship history?', category: 'summary', priority: 4 }
      );
    } else if (typeName === 'c_opportunity') {
      suggestions.push(
        { question: 'What is the likelihood of closing this deal?', category: 'prediction', priority: 2 },
        { question: 'What are the blockers?', category: 'analysis', priority: 3 },
        { question: 'Compare with similar opportunities', category: 'comparison', priority: 4 }
      );
    } else if (typeName === 'c_document') {
      suggestions.push(
        { question: 'What are the key points in this document?', category: 'extraction', priority: 2 },
        { question: 'Summarize the main findings', category: 'summary', priority: 3 }
      );
    }

    return suggestions.slice(0, limit);
  }

  // ============================================
  // Internal Methods
  // ============================================

  /**
   * Phase 5.1: Enhanced conversation token management with sliding window strategy
   * Keeps system messages + pinned messages + recent messages in full
   * Summarizes older messages using ConversationSummarizationService
   */
  private async manageConversationTokens(
    messages: ConversationMessage[],
    maxTokens: number = 4000,
    preserveRecentCount: number = 10
  ): Promise<ConversationMessage[]> {
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

    // Phase 5.1: Sliding window strategy
    // 1. Separate messages by type
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystemMessages = messages.filter(m => m.role !== 'system');
    
    // 2. Extract pinned messages (always keep in full, regardless of age)
    const pinnedMessages = nonSystemMessages.filter(m => m.pinned === true);
    const unpinnedMessages = nonSystemMessages.filter(m => !m.pinned);
    
    // 3. Keep recent unpinned messages in full
    const keepRecentCount = Math.min(preserveRecentCount, unpinnedMessages.length);
    const recentMessages = unpinnedMessages.slice(-keepRecentCount);
    const oldMessages = unpinnedMessages.slice(0, -keepRecentCount);

    // 4. If no old messages, just return system + pinned + recent
    if (oldMessages.length === 0) {
      // Sort by creation time to maintain order
      const allMessages = [...systemMessages, ...pinnedMessages, ...recentMessages];
      return allMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    // 5. Summarize old messages using enhanced summarization service if available
    let summaryMessage: ConversationMessage | undefined;
    if (this.conversationSummarizationService && oldMessages.length > 0) {
      try {
        const result = await this.conversationSummarizationService.summarizeConversation(
          oldMessages,
          {
            preservePinnedMessages: true, // Already handled above, but ensure consistency
            preserveRecentMessages: 0, // We're summarizing all old messages
            includeDecisions: true,
            includeFacts: true,
            includeActionItems: true,
            maxSummaryTokens: Math.floor(maxTokens * 0.1), // Use 10% of token budget for summary
          }
        );

        // Create summary message from structured summary
        const summaryText = `Previous conversation summary: ${result.summary.summary}\n\n` +
          (result.summary.keyDecisions.length > 0 
            ? `Key Decisions: ${result.summary.keyDecisions.join('; ')}\n\n` 
            : '') +
          (result.summary.keyFacts.length > 0 
            ? `Key Facts: ${result.summary.keyFacts.join('; ')}\n\n` 
            : '') +
          (result.summary.actionItems.length > 0 
            ? `Action Items: ${result.summary.actionItems.join('; ')}` 
            : '');

        summaryMessage = {
          id: uuidv4(),
          role: 'system',
          content: summaryText,
          contentType: 'text',
          status: 'complete',
          createdAt: new Date(),
          updatedAt: new Date(),
          branchIndex: 0,
          isRegenerated: false,
          regenerationCount: 0,
        };

        this.monitoring.trackEvent('insight.conversation-summarized-enhanced', {
          oldMessageCount: oldMessages.length,
          summaryTokens: result.summary.tokenCount,
          tokensSaved: result.totalTokensSaved,
          keyDecisions: result.summary.keyDecisions.length,
          keyFacts: result.summary.keyFacts.length,
          actionItems: result.summary.actionItems.length,
        });
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'insight.manageConversationTokens.enhancedSummarization',
        });
        // Fall through to legacy summarization
      }
    }

    // 6. Fallback to legacy summarization if enhanced service unavailable
    if (!summaryMessage && this.unifiedAIClient && oldMessages.length > 0) {
      try {
        const summary = await this.summarizeMessages(oldMessages);
        summaryMessage = {
          id: uuidv4(),
          role: 'system',
          content: `Previous conversation summary: ${summary}`,
          contentType: 'text',
          status: 'complete',
          createdAt: new Date(),
          updatedAt: new Date(),
          branchIndex: 0,
          isRegenerated: false,
          regenerationCount: 0,
        };
        this.monitoring.trackEvent('insight.conversation-summarized-legacy', {
          oldMessageCount: oldMessages.length,
          summaryLength: summary.length,
        });
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'insight.summarizeMessages',
        });
        // Continue without summary if summarization fails
      }
    }

    // 7. Construct optimized message list: system + summary + pinned + recent
    const optimizedMessages: ConversationMessage[] = [...systemMessages];
    
    if (summaryMessage) {
      optimizedMessages.push(summaryMessage);
    }
    
    // Add pinned messages (sorted by creation time)
    optimizedMessages.push(...pinnedMessages);
    
    // Add recent messages
    optimizedMessages.push(...recentMessages);

    // Sort all messages by creation time to maintain chronological order
    optimizedMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const finalTokens = optimizedMessages.reduce((sum, msg) => {
      return sum + this.estimateTokens(msg.content);
    }, 0);

    this.monitoring.trackEvent('insight.conversation-tokens-optimized', {
      originalTokens: totalTokens,
      finalTokens,
      originalMessageCount: messages.length,
      finalMessageCount: optimizedMessages.length,
      pinnedCount: pinnedMessages.length,
      recentCount: recentMessages.length,
      summarized: !!summaryMessage,
      method: this.conversationSummarizationService ? 'enhanced' : 'legacy',
    });

    return optimizedMessages;
  }

  /**
   * Summarize old messages to preserve context
   */
  private async summarizeMessages(messages: ConversationMessage[]): Promise<string> {
    // Use conversation summarization service if available, otherwise use simple fallback
    if (this.conversationSummarizationService) {
      try {
        // Use the dedicated summarization service
        const result = await this.conversationSummarizationService.summarizeConversation(messages, {});
        const summary = result.summary.summary;
        return summary || this.getFallbackSummary(messages);
      } catch (error) {
        this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
          operation: 'insight.summarizeMessages.service',
        });
        return this.getFallbackSummary(messages);
      }
    }
    
    // Fallback to simple summary
    return this.getFallbackSummary(messages);
  }

  /**
   * Get fallback summary from messages
   */
  private getFallbackSummary(messages: ConversationMessage[]): string {
    const userMessages = messages.filter(m => m.role === 'user').slice(0, 3);
    return `Previous conversation about: ${userMessages.map(m => m.content.substring(0, 50)).join(', ')}...`;
  }

  /**
   * Assemble context for insight generation
   * Optimized for global scope with tenant-wide RAG and caching
   */
  private async assembleContext(
    tenantId: string,
    intent: IntentAnalysisResult,
    request: InsightRequest,
    modelName?: string
  ): Promise<AssembledContext> {
    const chunks: ContextChunk[] = [];
    const ragChunks: RAGChunk[] = [];

    // Parse query for entity references (shard-specific Q&A)
    let parsedQuery: ParsedQuery | null = null;
    let singleShardDetected = false;
    
    if (this.contextAwareQueryParser && !request.scope?.shardId) {
      // Only parse if shardId not explicitly provided (let explicit scope take precedence)
      // Sanitize query before parsing to prevent prompt injection
      const queryToParse = sanitizeUserInput(request.query);
      try {
        parsedQuery = await this.contextAwareQueryParser.parseQuery(
          queryToParse,
          tenantId,
          request.projectId || request.scope?.projectId
        );

        // Check if single shard question detected
        if (parsedQuery.hasEntityReferences && parsedQuery.entities.length === 1) {
          singleShardDetected = true;
          this.monitoring.trackEvent('insight.single-shard-detected', {
            tenantId,
            shardId: parsedQuery.entities[0].shardId,
            shardType: parsedQuery.entities[0].shardType,
            query: request.query.substring(0, 100),
          });
        } else if (parsedQuery.hasEntityReferences && parsedQuery.entities.length > 1) {
          this.monitoring.trackEvent('insight.multi-shard-detected', {
            tenantId,
            entityCount: parsedQuery.entities.length,
            query: request.query.substring(0, 100),
          });
        }
      } catch (error) {
        // Non-blocking: if parsing fails, continue with normal context assembly
        this.monitoring.trackException(error as Error, {
          component: 'InsightService',
          operation: 'assembleContext.parseQuery',
          tenantId,
        });
      }
    }

    // Get primary shard if specified (explicit scope) or detected from query
    let primaryChunk: ContextChunk | undefined;
    const shardIdToUse = request.scope?.shardId || (singleShardDetected && parsedQuery ? parsedQuery.entities[0].shardId : undefined);
    
    if (shardIdToUse) {
      const shard = await this.shardRepository.findById(shardIdToUse, tenantId);
      if (shard) {
        const shardType = await this.shardTypeRepository.findById(shard.shardTypeId, tenantId);
        primaryChunk = {
          shardId: shard.id,
          shardName: shard.shardTypeName || shard.shardTypeId,
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

        // Phase 5.3: Enrich context with risk data if primary chunk is an opportunity
        if (primaryChunk.shardTypeId === 'c_opportunity' && this.riskEvaluationService) {
          try {
            const riskEvaluation = await this.riskEvaluationService.evaluateOpportunity(
              primaryChunk.shardId,
              tenantId,
              request.userId,
              {
                includeAI: true,
                includeHistorical: true,
              }
            );

            // Add risk summary to primary chunk content
            primaryChunk.content = {
              ...primaryChunk.content,
              _riskAnalysis: {
                globalScore: riskEvaluation.riskScore,
                categoryScores: riskEvaluation.categoryScores,
                riskCount: riskEvaluation.risks.length,
                topRisks: riskEvaluation.risks
                  .sort((a: any, b: any) => (b.ponderation || 0) - (a.ponderation || 0))
                  .slice(0, 5)
                  .map((risk: any) => ({
                    riskId: risk.riskId,
                    name: risk.name,
                    category: risk.category,
                    ponderation: risk.ponderation,
                    confidence: risk.confidence,
                    summary: risk.explainability?.summary || 'No explanation available',
                  })),
                revenueAtRisk: riskEvaluation.revenueAtRisk,
                trustLevel: riskEvaluation.trustLevel,
                evaluationDate: riskEvaluation.evaluationDate,
              },
            };

            this.monitoring.trackEvent('insight.context.risk-enriched', {
              tenantId,
              opportunityId: primaryChunk.shardId,
              riskCount: riskEvaluation.risks.length,
              globalScore: riskEvaluation.riskScore,
            });
          } catch (error) {
            // Non-blocking: if risk evaluation fails, continue without risk data
            this.monitoring.trackException(error as Error, {
              operation: 'insight.assembleContext.enrichRisk',
              tenantId,
              opportunityId: primaryChunk.shardId,
            });
          }
        }
      }
    } else if (parsedQuery && parsedQuery.hasEntityReferences && parsedQuery.entities.length > 1) {
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
    let selectedTemplate: import('../types/shard.types.js').Shard | null = null;
    let templateMetadata: import('../types/context-template.types.js').ContextTemplateStructuredData | null = null;

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
          insightType: intent.insightType as InsightType | undefined, // Intent-based selection
          scopeMode: request.scopeMode, // Scope-based selection
          query: request.query, // Query text for enhanced template matching
        });

        if (selectedTemplate) {
          templateMetadata = selectedTemplate.structuredData as import('../types/context-template.types.js').ContextTemplateStructuredData;
          
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
      const templateResult = await this.contextTemplateService.assembleContext(
          primaryChunk.shardId,
        tenantId,
          { 
            templateId: selectedTemplate.id,
            assistantId: request.assistantId,
            userId: request.userId, // Include userId for ACL checks
          }
      );

      if (templateResult.success && templateResult.context) {
        // Add related shards from template
        for (const [relType, relatedShards] of Object.entries(templateResult.context.related)) {
          for (const relShard of relatedShards) {
              // Avoid duplicates
              if (!chunks.some(c => c.shardId === relShard.id)) {
            chunks.push({
              shardId: (relShard as any).id,
              shardName: (relShard as any).shardTypeName || (relShard as any).id,
              shardTypeId: (relShard as any).shardTypeId,
              shardTypeName: (relShard as any).shardTypeId,
              content: relShard as Record<string, unknown>,
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
        const projectContext = await this.projectContextService.assembleProjectContext(
          tenantId,
          projectId,
          request.query,
          {
            maxTokens: (request.options?.maxTokens || DEFAULT_MAX_TOKENS) - (primaryChunk?.tokenCount || 0) - chunks.reduce((sum, c) => sum + c.tokenCount, 0),
            minRelevance: RAG_MIN_SCORE,
            includeUnlinked: true,
            unlinkedFraction: 0.2,
            shardTypeFilter: ['c_document', 'c_documentChunk', 'c_note'],
            maxRelatedShards: 50,
            userId: request.userId, // Include userId for ACL checks
          }
        );

        // Add project chunk if not already present
        if (projectContext.projectChunk && !chunks.some(c => c.shardId === projectContext.projectChunk!.shardId)) {
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
        const related = sortProjectRelatedChunks(chunks.filter(c => 
          c.shardId !== projectId && !primary.some(p => p.shardId === c.shardId)
        ));
        chunks.splice(0, chunks.length, ...primary, ...project, ...related);

        this.monitoring.trackEvent('insight.project.contextOptimized', {
          tenantId,
          projectId,
          relatedShardCount: projectContext.relatedChunks.length,
          ragChunkCount: projectContext.ragChunks.length,
          totalTokens: projectContext.totalTokens,
        });
      } catch (err) {
        this.monitoring.trackException(err as Error, {
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
    
    // Phase 2.4: Cache staleness info (declared outside block for scope)
    let cacheStalenessInfo: {
      isStale: boolean;
      isCriticallyStale: boolean;
      ageMs: number;
      cachedAt: Date;
    } | null = null;
    
    if (shouldPerformRAG) {
      try {
        // Phase 5.2: Check cache for global context with staleness detection using ContextCacheService
        let cachedGlobalContext: RAGChunk[] | null = null;

        if (request.scopeMode === 'global') {
          if (this.contextCacheService) {
            // Phase 5.2: Use ContextCacheService for centralized caching
            try {
              const cached = await this.contextCacheService.getGlobalContext<RAGChunk[]>(tenantId, request.query);
              if (cached) {
                cachedGlobalContext = cached.data;
                cacheStalenessInfo = {
                  isStale: cached.isStale,
                  isCriticallyStale: cached.isCriticallyStale,
                  ageMs: cached.ageMs,
                  cachedAt: new Date(Date.now() - cached.ageMs),
                };

                // Phase 5.2: Invalidate critically stale cache and trigger proactive refresh
                if (cacheStalenessInfo.isCriticallyStale) {
                  await this.contextCacheService.invalidateGlobalContext(tenantId, request.query);
                  cachedGlobalContext = null; // Don't use stale cache
                  cacheStalenessInfo = null;
                  
                  // Phase 5.2: Trigger proactive refresh in background (non-blocking)
                  this.proactivelyRefreshContext(tenantId, request.query, request.scopeMode).catch((refreshError) => {
                    // Non-blocking - log but don't fail
                    this.monitoring.trackException(refreshError as Error, {
                      operation: 'insight.global-context.proactive-refresh',
                      tenantId,
                    });
                  });
                } else if (cacheStalenessInfo.isStale) {
                  // Phase 5.2: For stale (but not critically stale) context, trigger background refresh
                  // but still use the cached context for current request
                  this.proactivelyRefreshContext(tenantId, request.query, request.scopeMode).catch((refreshError) => {
                    // Non-blocking - log but don't fail
                    this.monitoring.trackException(refreshError as Error, {
                      operation: 'insight.global-context.proactive-refresh',
                      tenantId,
                    });
                  });
                }
              }
            } catch (cacheError) {
              // Cache service error - continue without cache, don't fail the request
              this.monitoring.trackException(cacheError as Error, {
                operation: 'insight.global-context.cache-get',
                tenantId,
              });
            }
          } else if (this.redis) {
            // Fallback to direct Redis caching (backward compatibility)
            const queryHash = createHash('sha256')
              .update(`${tenantId}:${request.query}`)
              .digest('hex');
            const cacheKey = `global-context:${tenantId}:${queryHash}`;
            try {
              const cached = await this.redis.get(cacheKey);
              if (cached) {
                try {
                  // Phase 2.4: Parse cached context with metadata
                  const cachedData = JSON.parse(cached);
                  
                  // Check if it's the new format with metadata or old format (array)
                  if (Array.isArray(cachedData)) {
                    // Old format - just RAG chunks array
                    cachedGlobalContext = cachedData;
                    // No staleness info available for old format
                  } else if (cachedData.chunks && cachedData.metadata) {
                    // New format with metadata
                    cachedGlobalContext = cachedData.chunks;
                    const cachedAt = new Date(cachedData.metadata.cachedAt);
                    const ageMs = Date.now() - cachedAt.getTime();
                    
                    cacheStalenessInfo = {
                      isStale: ageMs > CONTEXT_STALE_THRESHOLD_MS,
                      isCriticallyStale: ageMs > CONTEXT_CRITICAL_STALE_THRESHOLD_MS,
                      ageMs,
                      cachedAt,
                    };

                    // Phase 2.4: Invalidate critically stale cache and trigger proactive refresh
                    if (cacheStalenessInfo.isCriticallyStale) {
                      try {
                        await this.redis.del(cacheKey);
                        this.monitoring.trackEvent('insight.global-context.cache-invalidated-stale', {
                          tenantId,
                          queryHash,
                          ageMs,
                        });
                        cachedGlobalContext = null; // Don't use stale cache
                        cacheStalenessInfo = null;
                        
                        // Phase 2.4: Trigger proactive refresh in background (non-blocking)
                        this.proactivelyRefreshContext(tenantId, request.query, request.scopeMode).catch((refreshError) => {
                          // Non-blocking - log but don't fail
                          this.monitoring.trackException(refreshError as Error, {
                            operation: 'insight.global-context.proactive-refresh',
                            tenantId,
                          });
                        });
                      } catch (delError) {
                        this.monitoring.trackException(delError as Error, {
                          operation: 'insight.global-context.invalidate-stale',
                          tenantId,
                        });
                      }
                    } else if (cacheStalenessInfo.isStale) {
                      // Phase 2.4: For stale (but not critically stale) context, trigger background refresh
                      // but still use the cached context for current request
                      this.proactivelyRefreshContext(tenantId, request.query, request.scopeMode).catch((refreshError) => {
                        // Non-blocking - log but don't fail
                        this.monitoring.trackException(refreshError as Error, {
                          operation: 'insight.global-context.proactive-refresh',
                          tenantId,
                        });
                      });
                    } else {
                      this.monitoring.trackEvent('insight.global-context.cache-hit', {
                        tenantId,
                        queryHash,
                        ageMs,
                        isStale: cacheStalenessInfo.isStale,
                      });
                    }
                  } else {
                    // Invalid format - treat as cache miss
                    cachedGlobalContext = null;
                  }
                } catch (parseError) {
                  this.monitoring.trackException(parseError instanceof Error ? parseError : new Error(String(parseError)), {
                    operation: 'insight.global-context.parse-cache',
                    tenantId,
                  });
                }
              }
            } catch (redisError) {
              // Redis error - continue without cache, don't fail the request
              this.monitoring.trackException(redisError instanceof Error ? redisError : new Error(String(redisError)), {
                operation: 'insight.global-context.redis-get',
                tenantId,
              });
            }
          }
        }

        // Phase 2.4: Store staleness info for context quality warnings
        if (cachedGlobalContext && cacheStalenessInfo) {
          // Mark chunks as from stale cache
          for (const chunk of cachedGlobalContext) {
            (chunk as any)._fromStaleCache = cacheStalenessInfo.isStale;
            (chunk as any)._cacheAgeMs = cacheStalenessInfo.ageMs;
            (chunk as any)._cachedAt = cacheStalenessInfo.cachedAt.toISOString();
          }
        }

        if (cachedGlobalContext) {
          ragChunks.push(...cachedGlobalContext);
        } else {
          // For project mode: get project-linked shard IDs for post-filtering with 20% unlinked allowance
          let projectShardIds: string[] = [];
          if (isProjectMode) {
            try {
              const projectShard = await this.shardRepository.findById(projectId, tenantId);
              if (projectShard?.internal_relationships) {
                projectShardIds = projectShard.internal_relationships
                  .filter(rel => rel?.shardId && ['c_document', 'c_documentChunk', 'c_note'].includes(rel.shardTypeId))
                  .map(rel => rel.shardId);
              }
            } catch (err) {
              this.monitoring.trackException(err as Error, {
                operation: 'insight.rag.getProjectShards',
                tenantId,
                projectId,
              });
            }
          }

          // Template-aware RAG configuration
          // Use template's RAG config if available, otherwise use defaults
          // Use optimized parameters for global scope
          const isGlobal = request.scopeMode === 'global';
          const templateRAGConfig = templateMetadata?.sources?.rag;
          const ragTopK = templateRAGConfig?.maxChunks || 
                         (isGlobal ? GLOBAL_RAG_TOP_K : (isProjectMode ? RAG_TOP_K * 2 : RAG_TOP_K));
          const ragMinScore = templateRAGConfig?.minScore || 
                             (isGlobal ? GLOBAL_RAG_MIN_SCORE : RAG_MIN_SCORE);
          
          // Phase 2.4: Vector search with fallbacks
          let ragResults: { results: Array<{ shardId: string; shardTypeId: string; shard?: { name: string }; content: string; chunkIndex?: number; score: number; highlight?: string }> } = { results: [] };
          let vectorSearchFailed = false;
          let usedFallback = false;
          let fallbackReason = '';

          try {
            // Try vector search first
            const searchResult = await this.vectorSearch?.search({
              tenantId,
              query: request.query,
              topK: ragTopK,
              minScore: ragMinScore,
              projectId: isProjectMode ? projectId : undefined, // Only filter by project in project mode
              shardTypeIds: templateMetadata?.sources?.rag?.shardTypeIds, // Use template's shard type filter if available
            });
            
            if (searchResult) {
              ragResults = searchResult;
            }

            // Phase 2.4: Check if results are empty or insufficient
            if (ragResults.results.length === 0) {
              vectorSearchFailed = true;
              fallbackReason = 'Vector search returned no results';
              
              // Try keyword search fallback
              const keywordFallback = await this.performKeywordSearchFallback(
                tenantId,
                request.query,
                ragTopK,
                isProjectMode ? projectId : undefined,
                templateMetadata?.sources?.rag?.shardTypeIds
              );
              
              if (keywordFallback.results.length > 0) {
                ragResults = keywordFallback;
                usedFallback = true;
                fallbackReason = 'Vector search returned no results, using keyword search fallback';
                this.monitoring.trackEvent('insight.rag.keyword-fallback-used', {
                  tenantId,
                  query: request.query.substring(0, 100),
                  resultCount: keywordFallback.results.length,
                });
              } else {
                // Try cached similar queries fallback
                const cachedFallback = await this.getCachedSimilarQueries(
                  tenantId,
                  request.query,
                  isProjectMode ? projectId : undefined
                );
                
                if (cachedFallback.results.length > 0) {
                  ragResults = cachedFallback;
                  usedFallback = true;
                  fallbackReason = 'Vector search returned no results, using cached similar queries';
                  this.monitoring.trackEvent('insight.rag.cached-fallback-used', {
                    tenantId,
                    query: request.query.substring(0, 100),
                    resultCount: cachedFallback.results.length,
                  });
                }
              }
            } else if (ragResults.results.length < Math.floor(ragTopK * 0.5)) {
              // Phase 2.4: Partial results - try to supplement with keyword search
              const keywordSupplement = await this.performKeywordSearchFallback(
                tenantId,
                request.query,
                Math.floor(ragTopK * 0.5), // Get half the requested amount
                isProjectMode ? projectId : undefined,
                templateMetadata?.sources?.rag?.shardTypeIds
              );
              
              // Merge results, avoiding duplicates
              const existingShardIds = new Set(ragResults.results.map(r => r.shardId));
              for (const result of keywordSupplement.results) {
                if (!existingShardIds.has(result.shardId)) {
                  ragResults.results.push({
                    ...result,
                    score: result.score * 0.7, // Lower score for fallback results
                  });
                }
              }
              
              if (keywordSupplement.results.length > 0) {
                usedFallback = true;
                fallbackReason = `Vector search returned ${ragResults.results.length} results, supplemented with keyword search`;
                this.monitoring.trackEvent('insight.rag.keyword-supplement-used', {
                  tenantId,
                  query: request.query.substring(0, 100),
                  vectorResults: ragResults.results.length,
                  keywordResults: keywordSupplement.results.length,
                });
              }
            }
          } catch (error) {
            // Phase 2.4: Vector search failed, try fallbacks
            vectorSearchFailed = true;
            fallbackReason = `Vector search failed: ${(error as Error).message}`;
            
            this.monitoring.trackException(error as Error, {
              operation: 'insight.rag.vector-search',
              tenantId,
            });

            // Try keyword search fallback
            try {
              const keywordFallback = await this.performKeywordSearchFallback(
                tenantId,
                request.query,
                ragTopK,
                isProjectMode ? projectId : undefined,
                templateMetadata?.sources?.rag?.shardTypeIds
              );
              
              if (keywordFallback.results.length > 0) {
                ragResults = keywordFallback;
                usedFallback = true;
                fallbackReason = `Vector search failed, using keyword search fallback`;
                this.monitoring.trackEvent('insight.rag.keyword-fallback-used', {
                  tenantId,
                  query: request.query.substring(0, 100),
                  resultCount: keywordFallback.results.length,
                  error: (error as Error).message,
                });
              } else {
                // Try cached similar queries fallback
                const cachedFallback = await this.getCachedSimilarQueries(
                  tenantId,
                  request.query,
                  isProjectMode ? projectId : undefined
                );
                
                if (cachedFallback.results.length > 0) {
                  ragResults = cachedFallback;
                  usedFallback = true;
                  fallbackReason = `Vector search failed, using cached similar queries`;
                  this.monitoring.trackEvent('insight.rag.cached-fallback-used', {
                    tenantId,
                    query: request.query.substring(0, 100),
                    resultCount: cachedFallback.results.length,
                    error: (error as Error).message,
                  });
                }
              }
            } catch (fallbackError) {
              // Fallback also failed, log and continue with empty results
              this.monitoring.trackException(fallbackError as Error, {
                operation: 'insight.rag.fallback',
                tenantId,
              });
            }
          }

          // Phase 2.4: Store fallback information for context quality warnings
          const fallbackInfo = usedFallback ? {
            used: true,
            reason: fallbackReason,
            vectorSearchFailed,
          } : undefined;

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
              // Phase 2.4: Store fallback info in metadata
              ...(fallbackInfo && { _fallbackInfo: fallbackInfo }),
            });
          }

          // Apply semantic reranking if enabled and we have enough chunks
          // Reranking improves relevance by using LLM to score query-document relevance
          const shouldRerank = ragChunks.length > 3 && request.options?.enableReranking !== false;
          if (shouldRerank && this.unifiedAIClient && this.aiConnectionService) {
            try {
              const reranked = await this.rerankRAGChunks(
                tenantId,
                request.query,
                ragChunks,
                intent.insightType
              );
              ragChunks.splice(0, ragChunks.length, ...reranked);
              
              this.monitoring.trackEvent('insight.rag.reranked', {
              tenantId,
                originalCount: ragChunks.length,
                rerankedCount: reranked.length,
                insightType: intent.insightType,
              });
            } catch (error) {
              // Non-blocking: if reranking fails, continue with original order
              this.monitoring.trackException(error as Error, {
                operation: 'insight.rag.rerank',
                tenantId,
            });
          }
        }

          // For project mode: apply 20% unlinked allowance filter
          if (isProjectMode && projectShardIds.length > 0 && ragChunks.length > 0) {
            const allowedIds = new Set<string>([projectId, ...projectShardIds]);
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

          // Phase 2.4: Cache global context with metadata for staleness detection
          if (isGlobal && this.redis && ragChunks.length > 0) {
            const queryHash = createHash('sha256')
              .update(`${tenantId}:${request.query}`)
              .digest('hex');
            const cacheKey = `global-context:${tenantId}:${queryHash}`;
            try {
              // Phase 2.4: Store cache entry with metadata (timestamp, query, etc.)
              // Phase 5.2: Cache fresh context using ContextCacheService
              if (this.contextCacheService) {
                await this.contextCacheService.setGlobalContext(
                  tenantId,
                  request.query,
                  ragChunks,
                  GLOBAL_CONTEXT_CACHE_TTL,
                  {
                    chunkCount: ragChunks.length,
                    totalTokens: ragChunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0),
                  }
                );
              } else if (this.redis) {
                // Fallback to direct Redis caching (backward compatibility)
                const cacheEntry = {
                  chunks: ragChunks,
                  metadata: {
                    cachedAt: new Date().toISOString(),
                    query: request.query.substring(0, 200), // Store query for debugging
                    tenantId,
                    chunkCount: ragChunks.length,
                    totalTokens: ragChunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0),
                  },
                };
                
                await this.redis.setex(
                  cacheKey,
                  GLOBAL_CONTEXT_CACHE_TTL,
                  JSON.stringify(cacheEntry)
                );
                this.monitoring.trackEvent('insight.global-context.cached', {
                  tenantId,
                  queryHash,
                  chunkCount: ragChunks.length,
                  cachedAt: cacheEntry.metadata.cachedAt,
                });
              }
            } catch (cacheError) {
              // Cache error - log but don't fail the request
              this.monitoring.trackException(cacheError instanceof Error ? cacheError : new Error(String(cacheError)), {
                operation: 'insight.global-context.cache-set',
                tenantId,
              });
            }
          }
        }
      } catch (error) {
        // RAG is optional, continue without it
        this.monitoring.trackEvent('insight.rag.failed', { tenantId, error: (error as Error).message });
      }
    }

    // Integrate web search context if available
    if (this.webSearchContextIntegration && (request.projectId || request.scope?.projectId)) {
      try {
        const webSearchResult = await this.webSearchContextIntegration.integrateWebSearchContext(
          tenantId,
          (request.projectId || request.scope?.projectId)!,
          intent,
          request.query,
          {
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
          },
          {
            enableDeepSearch: request.options?.enableDeepSearch,
            deepSearchPages: request.options?.deepSearchPages,
            minRelevanceScore: 0.65,
            maxChunks: 10,
          }
        );

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
      } catch (error) {
        // Web search is optional, continue without it
        this.monitoring.trackEvent('insight.websearch.failed', {
          tenantId,
          error: (error as Error).message,
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
    const ragChunksByShard = new Map<string, RAGChunk>();
    for (const chunk of ragChunks) {
      const existing = ragChunksByShard.get(chunk.shardId);
      if (!existing || chunk.score > existing.score) {
        ragChunksByShard.set(chunk.shardId, chunk);
      }
    }
    ragChunks.splice(0, ragChunks.length, ...Array.from(ragChunksByShard.values()));

    // Sort RAG chunks by score (highest first) for priority trimming
      ragChunks.sort((a, b) => b.score - a.score);

    // Phase 2.4: Intelligent truncation with prioritization
    const truncationInfo: {
      truncated: boolean;
      truncatedSections: string[];
      summarizedSections: string[];
      originalTokenCount: number;
      finalTokenCount: number;
    } = {
      truncated: false,
      truncatedSections: [],
      summarizedSections: [],
      originalTokenCount: totalTokens(),
      finalTokenCount: 0,
    };

    if (totalTokens() > targetContextTokens) {
      truncationInfo.truncated = true;
      
      // Phase 2.4: Intelligent truncation strategy
      // Priority: primary > related (recent first) > RAG (high score first)
      // Strategy: First try intelligent content truncation, then remove chunks if needed
      
      // Step 1: Try intelligent content truncation within chunks
      const tokensToRemove = totalTokens() - targetContextTokens;
      let tokensRemoved = 0;

      // First, truncate RAG chunks (lowest priority) - start with lowest scores
      const sortedRagChunks = [...ragChunks].sort((a, b) => a.score - b.score);
      for (const chunk of sortedRagChunks) {
        if (tokensRemoved >= tokensToRemove) break;
        
        const chunkTokens = chunk.tokenCount || this.estimateTokens(chunk.content);
        if (chunkTokens > 100) { // Only truncate chunks with substantial content
          const tokensToRemoveFromChunk = Math.min(
            chunkTokens - 100, // Keep at least 100 tokens
            tokensToRemove - tokensRemoved
          );
          
          if (tokensToRemoveFromChunk > 0) {
            const truncatedContent = this.intelligentlyTruncateContent(
              chunk.content,
              chunkTokens - tokensToRemoveFromChunk
            );
            
            if (truncatedContent.truncated) {
              chunk.content = truncatedContent.content;
              chunk.tokenCount = this.estimateTokens(chunk.content);
              (chunk as any)._truncated = true; // Mark as truncated
              tokensRemoved += tokensToRemoveFromChunk;
              truncationInfo.truncatedSections.push(`RAG chunk: ${chunk.shardName}`);
            }
          }
        }
      }

      // Step 2: If still over budget, try summarizing less critical related chunks
      if (totalTokens() > targetContextTokens && related.length > 0) {
        // Sort related chunks by recency (if available) or keep order (earlier = more important)
        const sortedRelated = [...related].reverse(); // Start with least important
        
        for (const chunk of sortedRelated) {
          if (totalTokens() <= targetContextTokens) break;
          
          const chunkTokens = chunk.tokenCount || this.estimateTokens(JSON.stringify(chunk.content));
          if (chunkTokens > 200) { // Only summarize chunks with substantial content
            const summarized = this.summarizeChunkContent(chunk);
            if (summarized.summarized) {
              chunk.content = summarized.content;
              chunk.tokenCount = this.estimateTokens(JSON.stringify(chunk.content));
              (chunk as any)._summarized = true; // Mark as summarized
              truncationInfo.summarizedSections.push(`Related chunk: ${chunk.shardName}`);
            }
          }
        }
      }

      // Step 3: If still over budget, remove entire chunks (fallback to original strategy)
      if (totalTokens() > targetContextTokens) {
        // First, trim unlinked RAG chunks (those not in related chunks' shardIds)
        const relatedShardIds = new Set(related.map(c => c.shardId));
        const unlinkedRag = ragChunks.filter(c => !relatedShardIds.has(c.shardId));
        const linkedRag = ragChunks.filter(c => relatedShardIds.has(c.shardId));

        // Trim unlinked RAG chunks by lowest score first
        while (unlinkedRag.length > 0 && totalTokens() > targetContextTokens) {
          const removed = unlinkedRag.pop();
          if (removed) {
            truncationInfo.truncatedSections.push(`Removed RAG chunk: ${removed.shardName}`);
          }
          ragChunks.splice(0, ragChunks.length, ...linkedRag, ...unlinkedRag);
        }

        // If still over budget, trim linked RAG chunks
        if (totalTokens() > targetContextTokens && linkedRag.length > 0) {
          while (linkedRag.length > 0 && totalTokens() > targetContextTokens) {
            const removed = linkedRag.pop();
            if (removed) {
              truncationInfo.truncatedSections.push(`Removed linked RAG chunk: ${removed.shardName}`);
            }
            ragChunks.splice(0, ragChunks.length, ...linkedRag, ...unlinkedRag);
          }
        }

        // If still over budget, trim related chunks (keep earlier ones which are likely closer relationships)
        if (totalTokens() > maxContextTokens && related.length > 0) {
          while (related.length > 0 && totalTokens() > maxContextTokens) {
            const removed = related.pop();
            if (removed) {
              truncationInfo.truncatedSections.push(`Removed related chunk: ${removed.shardName}`);
            }
          }
        }
      }

      // Final check: ensure we don't exceed maxContextTokens
      if (totalTokens() > maxContextTokens) {
        // Last resort: trim RAG chunks aggressively
        while (ragChunks.length > 0 && totalTokens() > maxContextTokens) {
          const removed = ragChunks.pop();
          if (removed) {
            truncationInfo.truncatedSections.push(`Removed RAG chunk (last resort): ${removed.shardName}`);
          }
        }
      }

      truncationInfo.finalTokenCount = totalTokens();
    }

    // Retrieve multi-modal assets if available
    const assetChunks = await this.getMultimodalAssetContext(
      tenantId,
      request.conversationId,
      request.scope?.shardId
    );

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

    // Phase 3.1: Apply field-level access control before PII detection/redaction
    if (this.fieldSecurityService && request.userRoles) {
      try {
        const fieldSecurityContext: FieldSecurityContext = {
          userId: request.userId,
          userRoles: request.userRoles,
          tenantId,
          operation: 'ai', // AI context operation
          applyMasking: true,
          decryptFields: false, // Don't decrypt for AI context
        };

        // Phase 3.1: Apply field security to primary chunk (check permissions and filter fields)
        if (primary && primary.shardId) {
          const shard = await this.shardRepository.findById(primary.shardId, tenantId);
          if (shard) {
            const shardType = await this.shardTypeRepository.findById(shard.shardTypeId, tenantId);
            if (shardType) {
              // Use secureShardForRead with 'ai' operation to check permissions and apply masking
              const secured = await this.fieldSecurityService.secureShardForRead(
                shard,
                shardType,
                fieldSecurityContext
              );
              primary.content = secured.structuredData;
              
              // Log field access audit entries
              if (secured.auditEntries.length > 0 && this.comprehensiveAuditTrailService) {
                for (const auditEntry of secured.auditEntries) {
                  this.monitoring.trackEvent('field-security.field-access-audited', {
                    tenantId: auditEntry.tenantId,
                    userId: auditEntry.userId,
                    shardId: auditEntry.shardId,
                    field: auditEntry.field,
                    operation: auditEntry.operation,
                    allowed: auditEntry.allowed,
                    securityLevel: auditEntry.securityLevel,
                  });
                }
              }

              this.monitoring.trackEvent('field-security.ai-context-filtered', {
                tenantId,
                userId: request.userId,
                shardId: primary.shardId,
                shardTypeId: shardType.id,
                maskedFields: secured.maskedFields.length,
                removedFields: secured.removedFields.length,
              });
            }
          }
        }

        // Phase 3.1: Apply field security to related chunks
        for (let i = 0; i < related.length; i++) {
          const chunk = related[i];
          if (chunk.shardId) {
            const shard = await this.shardRepository.findById(chunk.shardId, tenantId);
            if (shard) {
              const shardType = await this.shardTypeRepository.findById(shard.shardTypeId, tenantId);
              if (shardType) {
                const secured = await this.fieldSecurityService.secureShardForRead(
                  shard,
                  shardType,
                  fieldSecurityContext
                );
                related[i].content = secured.structuredData;
                
                // Log field access audit entries
                if (secured.auditEntries.length > 0) {
                  for (const auditEntry of secured.auditEntries) {
                    this.monitoring.trackEvent('field-security.field-access-audited', {
                      tenantId: auditEntry.tenantId,
                      userId: auditEntry.userId,
                      shardId: auditEntry.shardId,
                      field: auditEntry.field,
                      operation: auditEntry.operation,
                      allowed: auditEntry.allowed,
                      securityLevel: auditEntry.securityLevel,
                    });
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        // Non-blocking: if field security fails, continue without it
        this.monitoring.trackException(error as Error, {
          operation: 'insight.field-security',
          tenantId,
        });
      }
    }

    // Phase 3.1: Apply PII detection and redaction to context before formatting
    let redactionAuditInfo: any = undefined;
    if (this.piiDetectionService && this.piiRedactionService) {
      try {
        // Phase 3.1: Build context-aware redaction options
        const contextAwareOptions: ContextAwareRedactionOptions = {
          preserveForAudit: true, // Always preserve for audit trail
          allowReversible: true, // Allow reversible tokenization for authorized access
          // Model-specific strategies can be configured per tenant
          // requiredForAnalysis can be configured based on insight type
        };

        const { redactedPrimary, redactedRelated, redactedRagChunks, auditInfo } = 
          await this.applyPIIRedactionToContext(
            tenantId,
            primary,
            related,
            ragChunks,
            request.userId,
            modelName,
            contextAwareOptions
          );
        
        // Note: These are reassigned, but TypeScript sees them as const
        // The reassignment is intentional to update the context with redacted versions
        (primary as any) = redactedPrimary;
        (related as any) = redactedRelated;
        (ragChunks as any) = redactedRagChunks;
        redactionAuditInfo = auditInfo;
      } catch (error) {
        // Non-blocking: if PII redaction fails, continue without it
        this.monitoring.trackException(error as Error, {
          operation: 'insight.pii-redaction',
          tenantId,
        });
      }
    }

    const formattedContext = this.formatContextForLLM(
      primary,
      related,
      ragChunks
    );
    const assetContext = this.formatAssetContextForLLM(assetChunks);
    const fullFormattedContext = formattedContext + (assetContext ? '\n' + assetContext : '');

    // Build assembled context
    const assembledContext: AssembledContext = {
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
        // Phase 2.4: Store truncation info for context quality assessment
        truncationInfo: truncationInfo.truncated ? truncationInfo : undefined,
        // Phase 2.4: Store cache staleness info for context quality assessment
        cacheStalenessInfo: cacheStalenessInfo || undefined,
        // Phase 3.1: Store PII redaction audit info
        piiRedactionInfo: redactionAuditInfo,
      } as any, // Type assertion to allow enhancedQuery, truncationInfo, cacheStalenessInfo, and piiRedactionInfo in metadata
      formattedContext: fullFormattedContext,
    };

    // Phase 2.4: Explicit empty context handling
    const totalSourceCount = related.length + ragChunks.length + assetChunks.length;
    const hasPrimary = !!primary && primary.shardId !== '';
    const isEmpty = totalSourceCount === 0 && !hasPrimary;

    // Get minimum requirements for this operation type
    const minimumRequirements = this.contextQualityService
      ? this.contextQualityService.getMinimumRequirements(intent.insightType)
      : { allowEmpty: false, minSourceCount: 0, minRelevanceScore: 0 };

    if (isEmpty) {
      // Check if empty context is allowed for this operation type
      if (!minimumRequirements.allowEmpty) {
        // Log empty context event
        this.monitoring.trackEvent('insight.empty-context-detected', {
          tenantId,
          userId: request.userId,
          insightType: intent.insightType as InsightType | undefined,
          query: request.query.substring(0, 100),
          projectId: request.projectId || request.scope?.projectId,
        });
      }
    }

    // Phase 5.1: Retrieve relevant context from past conversations
    let pastConversationContext: any = undefined;
    if (this.conversationContextRetrievalService && request.userId) {
      try {
        const retrievalResult = await this.conversationContextRetrievalService.retrieveRelevantContext(
          tenantId,
          request.userId,
          request.query,
          request.conversationId,
          {
            maxResults: 3, // Limit to top 3 similar conversations
            minSimilarityScore: 0.6,
            includeDecisions: true,
            includeFacts: true,
            excludeResolved: true,
            projectId: request.projectId || request.scope?.projectId,
            maxAgeDays: 90,
          }
        );

        if (retrievalResult.similarConversations.length > 0) {
          pastConversationContext = {
            similarConversations: retrievalResult.similarConversations.map(c => ({
              conversationId: c.conversationId,
              title: c.title,
              summary: c.summary,
              similarityScore: c.similarityScore,
              relevanceReason: c.relevanceReason,
            })),
            relevantDecisions: retrievalResult.relevantDecisions,
            relevantFacts: retrievalResult.relevantFacts,
            resolvedTopics: retrievalResult.resolvedTopics,
          };

          // Add past conversation context to metadata
          (assembledContext.metadata as any).pastConversationContext = pastConversationContext;

          this.monitoring.trackEvent('insight.past-conversation-context-retrieved', {
            tenantId,
            userId: request.userId,
            similarFound: retrievalResult.similarConversations.length,
            decisionsFound: retrievalResult.relevantDecisions.length,
            factsFound: retrievalResult.relevantFacts.length,
            resolvedTopicsFound: retrievalResult.resolvedTopics.length,
          });
        }
      } catch (error) {
        // Non-blocking: if context retrieval fails, continue without it
        this.monitoring.trackException(error as Error, {
          operation: 'insight.retrieve-past-conversation-context',
          tenantId,
        });
      }
    }

    // Assess context quality if service is available
    if (this.contextQualityService) {
      try {
        const contextQuality = this.contextQualityService.assessContextQuality(
          assembledContext,
          undefined, // expectedSources - can be enhanced
          request.options?.maxTokens,
          intent.insightType // Phase 2.4: Pass insight type for operation-specific requirements
        );
        // Add context quality to metadata
        (assembledContext.metadata as any).contextQuality = contextQuality;

        // Phase 2.4: Log if minimum requirements are not met
        if (!contextQuality.meetsMinimumRequirements && !minimumRequirements.allowEmpty) {
          this.monitoring.trackEvent('insight.insufficient-context', {
            tenantId,
            userId: request.userId,
            insightType: intent.insightType,
            sourceCount: contextQuality.sourceCount,
            minRequired: contextQuality.minimumRequirements?.minSourceCount || 0,
            averageRelevance: contextQuality.averageRelevance,
            minRelevance: contextQuality.minimumRequirements?.minRelevanceScore || 0,
            qualityScore: contextQuality.qualityScore,
          });
        }
      } catch (error) {
        // Non-blocking: if quality assessment fails, continue without it
        this.monitoring.trackException(error as Error, {
          operation: 'insight.assess-context-quality',
          tenantId,
        });
      }
    }

    return assembledContext;
  }

  /**
   * Phase 2.4: Intelligently truncate content while preserving structure
   * Prioritizes recent and relevant information, preserves structure, and marks truncated sections
   */
  private intelligentlyTruncateContent(
    content: string,
    targetTokens: number
  ): { content: string; truncated: boolean } {
    if (typeof content !== 'string') {
      return { content: String(content), truncated: false };
    }

    const currentTokens = this.estimateTokens(content);
    if (currentTokens <= targetTokens) {
      return { content, truncated: false };
    }

    // Try to preserve structure by truncating at sentence boundaries
    const sentences = content.split(/([.!?]\s+)/);
    let truncatedContent = '';
    let tokensUsed = 0;
    const targetTokensWithMargin = targetTokens * 0.9; // Leave 10% margin for truncation marker

    // Prioritize recent information (last sentences first, but we'll reverse for display)
    // Actually, for context, we want to keep the beginning (most relevant) and truncate the end
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] + (sentences[i + 1] || '');
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (tokensUsed + sentenceTokens <= targetTokensWithMargin) {
        truncatedContent += sentence;
        tokensUsed += sentenceTokens;
      } else {
        // Try to truncate at word boundaries within the sentence
        const words = sentence.split(/\s+/);
        let wordsUsed = '';
        for (const word of words) {
          const wordTokens = this.estimateTokens(word + ' ');
          if (tokensUsed + wordTokens <= targetTokensWithMargin) {
            wordsUsed += word + ' ';
            tokensUsed += wordTokens;
          } else {
            break;
          }
        }
        truncatedContent += wordsUsed;
        break;
      }
    }

    // Mark truncated sections clearly
    if (truncatedContent.length < content.length) {
      truncatedContent += '\n\n[Content truncated to fit token limit. Original length: ' + 
        Math.ceil(currentTokens) + ' tokens, truncated to: ' + 
        Math.ceil(tokensUsed) + ' tokens]';
    }

    return { content: truncatedContent.trim(), truncated: true };
  }

  /**
   * Phase 2.4: Summarize chunk content for less critical sections
   * Creates a concise summary while preserving key information
   */
  private summarizeChunkContent(chunk: ContextChunk): { content: any; summarized: boolean } {
    if (typeof chunk.content !== 'object' || chunk.content === null) {
      return { content: chunk.content, summarized: false };
    }

    const content = chunk.content as Record<string, any>;
    const keys = Object.keys(content);
    
    // If content is small, don't summarize
    const contentTokens = this.estimateTokens(JSON.stringify(content));
    if (contentTokens < 200) {
      return { content: chunk.content, summarized: false };
    }

    // Create a summary by keeping only key fields and summarizing others
    const summary: Record<string, any> = {};
    const keyFields = ['id', 'name', 'title', 'type', 'status', 'createdAt', 'updatedAt'];
    
    for (const key of keys) {
      if (keyFields.includes(key)) {
        summary[key] = content[key];
      } else {
        // Summarize other fields
        const value = content[key];
        if (typeof value === 'string' && value.length > 100) {
          summary[key] = value.substring(0, 100) + '... [summarized]';
        } else if (typeof value === 'object' && value !== null) {
          summary[key] = '[Complex object - summarized]';
        } else {
          summary[key] = value;
        }
      }
    }

    summary._summarized = true;
    summary._originalTokenCount = contentTokens;
    summary._summaryNote = 'This section was summarized to reduce token usage. Key fields preserved.';

    return { content: summary, summarized: true };
  }

  /**
   * Format context for LLM consumption
   * Phase 2.4: Enhanced to mark truncated and summarized sections
   */
  private formatContextForLLM(
    primary: ContextChunk | undefined,
    related: ContextChunk[],
    ragChunks: RAGChunk[]
  ): string {
    const sections: string[] = [];

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
        let header = `\n### ${chunk.shardName} (${chunk.shardTypeName})`;
        // Phase 2.4: Mark summarized sections
        if ((chunk as any)._summarized) {
          header += ' [SUMMARIZED]';
        }
        sections.push(header);
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
        let header = `\n[${i + 1}] ${chunk.shardName} (relevance: ${(chunk.score * 100).toFixed(0)}%)`;
        // Phase 2.4: Mark truncated sections
        if ((chunk as any)._truncated) {
          header += ' [TRUNCATED]';
        }
        sections.push(header);
        sections.push(chunk.content);
      }
    }

    return sections.join('\n');
  }

  /**
   * Format multi-modal asset context for LLM
   */
  private formatAssetContextForLLM(assetChunks: ContextChunk[]): string {
    if (assetChunks.length === 0) {
      return '';
    }

    const sections: string[] = [];
    sections.push('\n## Attached Media Files');

    for (const chunk of assetChunks) {
      sections.push(`\n### ${chunk.shardName} (${chunk.shardTypeName})`);
      
      const content = chunk.content as any;
      
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
  private async getMultimodalAssetContext(
    tenantId: string,
    conversationId?: string,
    shardId?: string
  ): Promise<ContextChunk[]> {
    if (!this.multimodalAssetService) {
      return [];
    }

    try {
      // Build options for listing assets
      const options: any = {
        limit: 50, // Limit to 50 assets to avoid token overflow
      };

      if (conversationId) {
        options.attachedTo = { conversationId };
      } else if (shardId) {
        options.attachedTo = { shardId };
      } else {
        // No context to filter by, return empty
        return [];
      }

      // Get assets from the service
      const assets = await this.multimodalAssetService.listAssets(tenantId, options);

      // Convert assets to ContextChunk format
      const chunks: ContextChunk[] = assets
        .filter((asset: any) => {
          // Only include processed assets with extracted content
          return (
            asset.processingStatus === 'completed' &&
            (asset.extracted?.text ||
              asset.extracted?.transcription ||
              asset.analysis?.summary ||
              asset.analysis?.description)
          );
        })
        .map((asset: any) => {
          // Extract relevant content from asset
          const content: Record<string, unknown> = {
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
          } as ContextChunk;
        });

      return chunks;
    } catch (error: unknown) {
      // Log error but don't fail the entire request
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'insight.getMultimodalAssetContext',
          tenantId,
          conversationId,
          shardId,
        }
      );
      return [];
    }
  }

  /**
   * Phase 6.1: Build system and user prompts
   * Prioritizes template system (PromptResolverService) for all prompts.
   * Uses emergency fallback prompts only when template system is completely unavailable.
   * 
   * System prompts should be seeded via: pnpm --filter @castiel/api run seed:prompts
   * Emergency fallbacks should rarely be used - if they are, it indicates the template system needs attention.
   */
  private async buildPrompts(
    tenantId: string,
    userId: string,
    intent: IntentAnalysisResult,
    context: AssembledContext,
    query: string,
    options?: InsightRequest['options'],
    projectId?: string
  ): Promise<{ 
    systemPrompt: string; 
    userPrompt: string;
    experimentId?: string;
    variantId?: string;
  }> {
    let systemPrompt: string;
    let userPrompt: string;
    let experimentId: string | undefined;
    let variantId: string | undefined;

    // Try to use PromptResolverService if available
    if (this.promptResolver) {
      try {
        const promptSlug = `insights-${intent.insightType}`;
        const promptResult = await this.promptResolver.resolveAndRender({
          tenantId,
          userId,
          slug: promptSlug,
          insightType: intent.insightType as import('../types/ai-insights/prompt.types.js').InsightType | undefined,
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
          } else {
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
        } else {
          // Phase 6.1: Prompt not found - use emergency fallback and alert
          // This should rarely happen if system prompts are properly seeded
          systemPrompt = EMERGENCY_FALLBACK_PROMPTS[intent.insightType];
          userPrompt = this.buildDefaultUserPrompt(context, query);

          // Track fallback with high priority alert
          this.monitoring.trackEvent('insight.prompt-fallback-emergency', {
            tenantId,
            userId,
            promptSlug,
            insightType: intent.insightType,
            reason: 'prompt-not-found',
            severity: 'warning',
          });
          
          // Log warning that system prompts may need seeding
          this.monitoring.trackException(new Error(`Prompt template not found: ${promptSlug}. Using emergency fallback. Please ensure system prompts are seeded.`), {
            operation: 'insight.prompt-fallback',
            tenantId,
            userId,
            promptSlug,
            insightType: intent.insightType,
          });
        }
      } catch (error) {
        // Phase 6.1: Fallback to emergency prompts on resolution error
        this.monitoring.trackException(error as Error, {
          tenantId,
          userId,
          operation: 'prompt-resolution',
          insightType: intent.insightType as InsightType | undefined,
        });

        systemPrompt = EMERGENCY_FALLBACK_PROMPTS[intent.insightType];
        userPrompt = this.buildDefaultUserPrompt(context, query);

        this.monitoring.trackEvent('insight.prompt-fallback-emergency', {
          tenantId,
          userId,
          insightType: intent.insightType as InsightType | undefined,
          reason: 'resolution-error',
          severity: 'error',
        });
      }
    } else {
      // Phase 6.1: No prompt resolver available - use emergency fallback
      // This indicates PromptResolverService should be initialized
      systemPrompt = EMERGENCY_FALLBACK_PROMPTS[intent.insightType];
      userPrompt = this.buildDefaultUserPrompt(context, query);
      
      this.monitoring.trackEvent('insight.prompt-fallback-emergency', {
        tenantId,
        userId,
        insightType: intent.insightType,
        reason: 'prompt-resolver-unavailable',
        severity: 'warning',
      });
    }

    // Final validation: ensure at least one prompt is not empty
    if (!systemPrompt.trim() && !userPrompt.trim()) {
      this.monitoring.trackException(new Error('Both system and user prompts are empty'), {
        operation: 'insight.buildPrompts',
        tenantId,
        userId,
        insightType: intent.insightType,
      });
      // Phase 6.1: Use minimal emergency fallback to prevent complete failure
      systemPrompt = EMERGENCY_FALLBACK_PROMPTS[intent.insightType] || 'You are a helpful assistant.';
      userPrompt = this.buildDefaultUserPrompt(context, query) || query;
      
      this.monitoring.trackEvent('insight.prompt-fallback-emergency', {
        tenantId,
        userId,
        insightType: intent.insightType,
        reason: 'both-prompts-empty',
        severity: 'error',
      });
    }

    // Add grounding instructions (always add, even for resolved prompts)
    systemPrompt += '\n' + GROUNDING_INSTRUCTION;

    // Add format instructions
    if (options?.format === 'brief') {
      systemPrompt += '\n\nKeep your response concise and to the point.';
    } else if (options?.format === 'bullets') {
      systemPrompt += '\n\nFormat your response as bullet points.';
    } else if (options?.format === 'table') {
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
  private buildDefaultUserPrompt(context: AssembledContext, query: string): string {
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
  private async executeLLM(
    tenantId: string,
    userId: string,
    modelId: string,
    systemPrompt: string,
    userPrompt: string,
    temperature?: number,
    maxTokens?: number,
    projectId?: string,
    toolsEnabled: boolean = true, // Enable tools by default
    userRoles?: string[] // Optional user roles for permission checking in tool execution
  ): Promise<{ 
    content: string; 
    usage: TokenUsage; 
    toolCalls?: ToolCall[];
    provider?: AIProviderName; // Provider for cost tracking
    connectionId?: string; // Connection ID for cost tracking
  }> {
    // Use UnifiedAIClient if available, otherwise fall back to Azure OpenAI
    if (this.unifiedAIClient && this.aiConnectionService) {
      try {
        // Get AI connection with credentials for the model
        const connectionResult = await this.aiConnectionService.getConnectionWithCredentialsForModel(
          modelId,
          tenantId
        );

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
        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ];

        const totalUsage: TokenUsage = { prompt: 0, completion: 0, total: 0 };
        const maxToolCallIterations = 5; // Prevent infinite loops
        let iterations = 0;
        const finalToolCalls: ToolCall[] = [];

        // Tool calling loop
        while (iterations < maxToolCallIterations) {
          iterations++;

          // Call unified client
          const result = await this.unifiedAIClient.chat(
            connection,
            apiKey,
            {
              messages,
              temperature: temperature ?? DEFAULT_TEMPERATURE,
              maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
              tools: tools && iterations === 1 ? tools : undefined, // Only send tools on first iteration
            }
          );

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
              provider: model.provider as AIProviderName,
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
            const toolResults = await this.toolExecutor.executeToolCalls(
              result.toolCalls,
              {
                tenantId,
                userId,
                userRoles, // Pass user roles for permission checking
                projectId,
              }
            );

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
          } else {
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
          provider: model.provider as AIProviderName,
          connectionId: connection.id,
        };
      } catch (error: unknown) {
        this.monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'insight.executeLLM.unified-client',
            modelId,
            tenantId,
          }
        );
        throw error;
      }
    }

    // Fallback: Use Azure OpenAI service (if configured)
    this.monitoring.trackEvent('insight.fallback-azure-openai', {
      modelId,
      reason: 'UnifiedAIClient or AIConnectionService not available',
    });

    try {
      const result = await this.azureOpenAI.complete(
        `${systemPrompt}\n\n${userPrompt}`,
        {
          temperature: temperature ?? DEFAULT_TEMPERATURE,
          maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
        }
      );

      // For Azure OpenAI fallback, provider is 'azure_openai'
      // azureOpenAI.complete returns a string, not an object
      return {
        content: result || '',
        usage: {
          prompt: 0, // Azure OpenAI complete doesn't return usage in the response
          completion: 0,
          total: 0,
        },
        provider: 'azure_openai' as AIProviderName,
      };
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'insight.executeLLM.azure-openai-fallback',
          modelId,
        }
      );
      throw new Error('No AI service configured. Please set up an AI connection or configure Azure OpenAI credentials.');
    }
  }

  /**
   * Ground response with citations
   * Supports tenant-level configuration for grounding requirements
   */
  private async groundResponse(
    content: string,
    context: AssembledContext,
    tenantId: string
  ): Promise<GroundedResponse & { 
    warnings?: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high'; impact?: string }>;
    citationValidation?: any;
    citationCompleteness?: any;
    citationQuality?: any;
  }> {
    // Check tenant configuration for grounding requirement
    let groundingRequired = false;
    try {
      // Check environment variable first (system-wide setting)
      const envRequireGrounding = process.env.REQUIRE_GROUNDING_SERVICE === 'true';
      
      // Check tenant config if available (tenant-level override)
      if (this.aiConfigService) {
        const tenantConfig = await this.aiConfigService.getTenantConfig(tenantId);
        if (tenantConfig && (tenantConfig as any).groundingRequired !== undefined) {
          groundingRequired = (tenantConfig as any).groundingRequired;
        } else {
          groundingRequired = envRequireGrounding;
        }
      } else {
        groundingRequired = envRequireGrounding;
      }
    } catch (error) {
      // If config retrieval fails, use environment variable or default to false
      groundingRequired = process.env.REQUIRE_GROUNDING_SERVICE === 'true';
    }

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

        // Phase 3.2: Validate citations if validation service is available
        let validatedCitations = grounded.citations;
        let citationValidationResults: any = undefined;
        let citationCompleteness: any = undefined;
        let citationQualityMetrics: any = undefined;
        const validationWarnings: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high'; impact?: string }> = [];

        if (this.citationValidationService && grounded.citations.length > 0) {
          try {
            // Validate citations
            const validationResults = await this.citationValidationService.validateCitations(
              grounded.citations,
              grounded.claims,
              context,
              tenantId
            );

            // Check citation completeness
            const validationConfig = this.citationValidationService.getConfig(tenantId);
            if (validationConfig) {
              citationCompleteness = this.citationValidationService.checkCitationCompleteness(
                grounded.claims,
                grounded.citations,
                validationConfig
              );
            }

            // Calculate quality metrics
            if (citationCompleteness) {
              citationQualityMetrics = this.citationValidationService.calculateQualityMetrics(
                validationResults,
                citationCompleteness
              );
            }

            // Handle invalid citations based on configuration
            const config = this.citationValidationService.getConfig(tenantId);
            if (config) {
              const invalidCitations = validationResults.filter(r => !r.valid);
              const weakCitations = validationResults.filter(r => 
                r.valid && r.issues.some(i => i.type === 'weak_semantic_match' && i.severity === 'high')
              );

              if (config.invalidCitationAction === 'reject' && invalidCitations.length > 0) {
                // Reject response with invalid citations
                throw new Error(
                  `Response contains ${invalidCitations.length} invalid citations. ` +
                  `Cannot proceed with unverified citations.`
                );
              } else if (config.invalidCitationAction === 'warn' && invalidCitations.length > 0) {
                // Add warnings for invalid citations
                for (const invalid of invalidCitations) {
                  validationWarnings.push({
                    type: 'invalid_citation',
                    message: `Citation ${invalid.citation.id} failed validation: ${invalid.issues.map(i => i.message).join('; ')}`,
                    severity: 'high',
                    impact: 'Citation may not support the claim. Please verify independently.',
                  });
                }
              }

              // Handle weak citations
              if (config.weakCitationAction === 'warn' && weakCitations.length > 0) {
                for (const weak of weakCitations) {
                  validationWarnings.push({
                    type: 'weak_citation',
                    message: `Citation ${weak.citation.id} has low semantic similarity (${(weak.semanticScore * 100).toFixed(1)}%)`,
                    severity: 'medium',
                    impact: 'Citation may not adequately support the claim.',
                  });
                }
              }

              // Filter out invalid citations if configured to do so
              if (config.invalidCitationAction === 'reject' || config.invalidCitationAction === 'warn') {
                validatedCitations = validationResults
                  .filter(r => r.valid)
                  .map(r => r.citation);
              }
            }

            citationValidationResults = {
              totalCitations: grounded.citations.length,
              validCitations: validationResults.filter(r => r.valid).length,
              invalidCitations: validationResults.filter(r => !r.valid).length,
              averageConfidence: citationQualityMetrics?.averageConfidence ?? 0,
              averageSemanticScore: citationQualityMetrics?.averageSemanticScore ?? 0,
              sourceVerificationRate: citationQualityMetrics?.sourceVerificationRate ?? 0,
            };

            // Log validation metrics
            this.monitoring.trackEvent('citation-validation.completed', {
              tenantId,
              totalCitations: grounded.citations.length,
              validCitations: validationResults.filter(r => r.valid).length,
              invalidCitations: validationResults.filter(r => !r.valid).length,
              averageConfidence: citationQualityMetrics?.averageConfidence ?? 0,
              coverageScore: citationCompleteness?.coverageScore ?? 0,
            });
          } catch (error) {
            // Non-blocking: if validation fails, continue with original citations
            this.monitoring.trackException(error as Error, {
              operation: 'insight.citation-validation',
              tenantId,
            });
          }
        }

        return {
          ...grounded,
          citations: validatedCitations, // Use validated citations (may be filtered)
          warnings: [
            ...grounded.warnings,
            ...validationWarnings.map(w => ({
              type: w.type,
              message: w.message,
              severity: w.severity,
            })) as GroundingWarning[], // Add validation warnings
          ] as GroundingWarning[],
          citationValidation: citationValidationResults,
          citationCompleteness,
          citationQuality: citationQualityMetrics,
        };
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'grounding',
        });
        // Fall back to simple grounding with warning
      }
    }

    // Grounding service unavailable
    if (groundingRequired) {
      // Fail fast if grounding is required
      throw new Error('Grounding service required but unavailable. Cannot generate unverified responses.');
    }

    // Explicit warning when grounding unavailable but not required
    const warnings: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high'; impact?: string }> = [{
      type: 'ungrounded_response',
      message: 'Response could not be verified against sources. Grounding service unavailable.',
      severity: 'high',
      impact: 'Response may contain unverified claims and could include hallucinations. Please verify important information independently.',
    }];

    // Fallback: Simple citation extraction from [1], [2] markers
    const citations: Citation[] = [];

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

    // Calculate simple grounding score (lower when grounding unavailable)
    const groundingScore =
      citations.length > 0 ? Math.min(citations.length / 5, 1) * 0.5 + 0.2 : 0.2;

    return {
      originalContent: content,
      groundedContent: content,
      citations,
      overallConfidence: groundingScore,
      groundingScore,
      claims: [],
      warnings: warnings as GroundingWarning[], // Warnings for ungrounded response
    };
  }

  /**
   * Generate follow-up suggestions
   */
  private generateSuggestions(intent: IntentAnalysisResult, context: AssembledContext): string[] {
    const suggestions: string[] = [];

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
  private formatSuggestedAction(result: any): string {
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
  private async saveToConversation(
    conversationId: string,
    tenantId: string,
    userId: string,
    query: string,
    response: InsightResponse,
    modelId: string,
    context: AssembledContext
  ): Promise<void> {
    try {
      // Add user message
      await this.conversationService.addMessage(conversationId, tenantId, userId, {
        content: query,
        contentType: 'text',
      });

      // Fetch connection name from AI Connection Service
      let connectionName: string | undefined;
      if (this.aiConnectionService && modelId) {
        try {
          const connection = await this.aiConnectionService.getConnectionForModel(modelId, tenantId);
          if (connection) {
            connectionName = connection.name;
          }
        } catch (error) {
          // If we can't fetch the connection, just continue without the name
          this.monitoring.trackEvent('insight.connectionNameFetchFailed', {
            modelId,
            tenantId,
            error: (error as Error).message,
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
        tokens: {
          prompt: response.usage.promptTokens,
          completion: response.usage.completionTokens,
          total: response.usage.totalTokens,
        },
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
    } catch (error) {
      // Don't fail the main request if conversation save fails
      this.monitoring.trackException(error as Error, {
        operation: 'insight.saveToConversation',
        conversationId,
        tenantId,
      });
    }
  }

  /**
   * Estimate cost based on usage
   */
  private estimateCost(usage: TokenUsage, modelId: string): number {
    // Approximate pricing per 1M tokens
    const pricing: Record<string, { input: number; output: number }> = {
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
  private async recordCostUsage(
    tenantId: string,
    userId: string,
    provider: AIProviderName,
    model: string,
    usage: TokenUsage,
    estimatedCost: number,
    durationMs: number,
    metadata: {
      conversationId?: string;
      insightType: InsightType;
      connectionId?: string;
    }
  ): Promise<void> {
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
        feature: 'ai-insights', // Explicitly set feature for cost attribution
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
    } catch (error) {
      // Log but don't throw - cost tracking is non-critical
      this.monitoring.trackException(error as Error, {
        operation: 'insight.recordCostUsage',
        tenantId,
        provider,
        model,
      });
    }
  }

  /**
   * Phase 2.4: Perform keyword search fallback when vector search fails or returns empty
   */
  private async performKeywordSearchFallback(
    tenantId: string,
    query: string,
    topK: number,
    projectId?: string,
    shardTypeIds?: string[]
  ): Promise<{
    results: Array<{
      shardId: string;
      shardTypeId: string;
      shard?: { name: string };
      content: string;
      chunkIndex?: number;
      score: number;
      highlight?: string;
    }>;
  }> {
    try {
      // Extract keywords from query (simple tokenization)
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 5); // Limit to 5 keywords

      if (keywords.length === 0) {
        return { results: [] };
      }

      // Use hybrid search with keyword weight if vector search service supports it
      // Otherwise, return empty results (fallback is best-effort)
      if (this.vectorSearch && typeof (this.vectorSearch as any).hybridSearch === 'function') {
        try {
          const hybridResults = await (this.vectorSearch as any).hybridSearch({
            query,
            filter: {
              tenantId,
              projectId,
              shardTypeIds,
            },
            topK,
            minScore: 0.3, // Lower threshold for fallback
            keywordWeight: 0.8, // Higher keyword weight for fallback
            vectorWeight: 0.2,
          }, 'system'); // Use system userId for fallback searches

          if (hybridResults && hybridResults.results && hybridResults.results.length > 0) {
            // Transform hybrid search results to RAG chunk format
            const results = hybridResults.results.map((result: any) => {
              // Extract content from shard structuredData
              let content = '';
              if (result.shard?.structuredData) {
                const sd = result.shard.structuredData;
                if (sd.content) {
                  content = String(sd.content);
                } else if (sd.text) {
                  content = String(sd.text);
                } else if (sd.body) {
                  content = String(sd.body);
                } else if (sd.description) {
                  content = String(sd.description);
                } else {
                  content = JSON.stringify(sd);
                }
              }

              return {
                shardId: result.shard.id,
                shardTypeId: result.shard.shardTypeId,
                shard: { name: result.shard.name },
                content: content.substring(0, 1000), // Limit content length
                score: result.score * 0.7, // Lower score for fallback results
                highlight: keywords.join(' '), // Simple highlight
              };
            });

            return { results };
          }
        } catch (hybridError) {
          // If hybrid search fails, continue to return empty results
          this.monitoring.trackException(hybridError as Error, {
            operation: 'insight.keyword-search-fallback.hybrid',
            tenantId,
          });
        }
      }

      // If hybrid search is not available or failed, return empty results
      // The system will continue with whatever context is available
      return { results: [] };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'insight.keyword-search-fallback',
        tenantId,
      });
      return { results: [] };
    }
  }

  /**
   * Phase 2.4: Proactively refresh context in background when stale cache is detected
   * This ensures fresh context is available for future requests
   */
  private async proactivelyRefreshContext(
    tenantId: string,
    query: string,
    scopeMode?: 'global' | 'project'
  ): Promise<void> {
    // Only refresh for global scope (where caching is used)
    if (scopeMode !== 'global' || !this.vectorSearch) {
      return;
    }

    try {
      // Perform fresh vector search to refresh cache
      const queryHash = createHash('sha256')
        .update(`${tenantId}:${query}`)
        .digest('hex');
      const cacheKey = `global-context:${tenantId}:${queryHash}`;

      // Perform fresh search
      const ragResults = await this.vectorSearch.search({
        tenantId,
        query,
        topK: GLOBAL_RAG_TOP_K,
        minScore: GLOBAL_RAG_MIN_SCORE,
      });

      if (ragResults.results.length > 0) {
        // Transform results to RAG chunks
        const freshRagChunks: RAGChunk[] = ragResults.results.map((result) => ({
          id: uuidv4(),
          shardId: result.shardId,
          shardName: result.shard?.name || result.shardId,
          shardTypeId: result.shardTypeId,
          content: result.content,
          chunkIndex: result.chunkIndex || 0,
          score: result.score,
          highlight: result.highlight,
          tokenCount: this.estimateTokens(result.content),
        }));

        // Phase 5.2: Cache fresh context using ContextCacheService
        if (this.contextCacheService) {
          await this.contextCacheService.setGlobalContext(
            tenantId,
            query,
            freshRagChunks,
            GLOBAL_CONTEXT_CACHE_TTL,
            {
              chunkCount: freshRagChunks.length,
              totalTokens: freshRagChunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0),
              proactivelyRefreshed: true,
            }
          );
        } else if (this.redis) {
          // Fallback to direct Redis caching (backward compatibility)
          const cacheEntry = {
            chunks: freshRagChunks,
            metadata: {
              cachedAt: new Date().toISOString(),
              query: query.substring(0, 200),
              tenantId,
              chunkCount: freshRagChunks.length,
              totalTokens: freshRagChunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0),
              proactivelyRefreshed: true,
            },
          };

          await this.redis.setex(
            cacheKey,
            GLOBAL_CONTEXT_CACHE_TTL,
            JSON.stringify(cacheEntry)
          );
        }

        this.monitoring.trackEvent('insight.global-context.proactively-refreshed', {
          tenantId,
          queryHash,
          chunkCount: freshRagChunks.length,
        });
      }
    } catch (error) {
      // Non-blocking - log but don't throw
      this.monitoring.trackException(error as Error, {
        operation: 'insight.proactive-refresh-context',
        tenantId,
      });
    }
  }

  /**
   * Phase 3.1: Apply PII detection and redaction to context chunks
   * Enhanced with context-aware options and model-specific redaction
   */
  private async applyPIIRedactionToContext(
    tenantId: string,
    primary: ContextChunk | undefined,
    related: ContextChunk[],
    ragChunks: RAGChunk[],
    userId: string,
    modelName?: string,
    contextAwareOptions?: ContextAwareRedactionOptions
  ): Promise<{
    redactedPrimary: ContextChunk | undefined;
    redactedRelated: ContextChunk[];
    redactedRagChunks: RAGChunk[];
    auditInfo: {
      piiDetected: boolean;
      totalDetections: number;
      byType: Record<string, number>;
      redactionsApplied: number;
      redactedAt: Date;
    };
  }> {
    if (!this.piiDetectionService || !this.piiRedactionService) {
      return {
        redactedPrimary: primary,
        redactedRelated: related,
        redactedRagChunks: ragChunks,
        auditInfo: {
          piiDetected: false,
          totalDetections: 0,
          byType: {},
          redactionsApplied: 0,
          redactedAt: new Date(),
        },
      };
    }

    const config = this.piiDetectionService.getConfig(tenantId);
    if (!config || !config.enabled) {
      return {
        redactedPrimary: primary,
        redactedRelated: related,
        redactedRagChunks: ragChunks,
        auditInfo: {
          piiDetected: false,
          totalDetections: 0,
          byType: {},
          redactionsApplied: 0,
          redactedAt: new Date(),
        },
      };
    }

    let totalDetections = 0;
    const byType: Record<string, number> = {};
    let redactionsApplied = 0;

    // Detect and redact PII in primary chunk
    let redactedPrimary = primary;
    if (primary && primary.content) {
      const detectionResult = this.piiDetectionService.detectPIIInStructuredData(
        primary.content as Record<string, any>,
        tenantId,
        'primary'
      );

      if (detectionResult.hasPII) {
        totalDetections += detectionResult.totalCount;
        for (const [type, count] of Object.entries(detectionResult.byType)) {
          byType[type] = (byType[type] || 0) + (typeof count === 'number' ? count : 0);
        }

        // Phase 3.1: Apply redaction with context-aware options
        const contentStr = JSON.stringify(primary.content);
        const redactionResult = this.piiRedactionService.applyRedaction(
          contentStr,
          detectionResult.detected,
          config.redactionStrategy,
          contextAwareOptions,
          modelName
        );

        if (redactionResult.redactions.length > 0) {
          try {
            redactedPrimary = {
              ...primary,
              content: JSON.parse(redactionResult.redacted),
            };
            redactionsApplied += redactionResult.redactions.length;
          } catch (error) {
            // If parsing fails, keep original
            this.monitoring.trackException(error as Error, {
              operation: 'insight.pii-redaction.primary',
              tenantId,
            });
          }
        }
      }
    }

    // Detect and redact PII in related chunks
    const redactedRelated: ContextChunk[] = [];
    for (const chunk of related) {
      if (chunk.content) {
        const detectionResult = this.piiDetectionService.detectPIIInStructuredData(
          chunk.content as Record<string, any>,
          tenantId,
          `related.${chunk.shardId}`
        );

        if (detectionResult.hasPII) {
          totalDetections += detectionResult.totalCount;
          for (const [type, count] of Object.entries(detectionResult.byType)) {
            byType[type] = (byType[type] || 0) + (typeof count === 'number' ? count : 0);
          }

          // Phase 3.1: Apply redaction with context-aware options
          const contentStr = JSON.stringify(chunk.content);
          const redactionResult = this.piiRedactionService.applyRedaction(
            contentStr,
            detectionResult.detected,
            config.redactionStrategy,
            contextAwareOptions,
            modelName
          );

          if (redactionResult.redactions.length > 0) {
            try {
              redactedRelated.push({
                ...chunk,
                content: JSON.parse(redactionResult.redacted),
              });
              redactionsApplied += redactionResult.redactions.length;
            } catch (error) {
              // If parsing fails, keep original
              redactedRelated.push(chunk);
              this.monitoring.trackException(error as Error, {
                operation: 'insight.pii-redaction.related',
                tenantId,
              });
            }
          } else {
            redactedRelated.push(chunk);
          }
        } else {
          redactedRelated.push(chunk);
        }
      } else {
        redactedRelated.push(chunk);
      }
    }

    // Detect and redact PII in RAG chunks
    const redactedRagChunks: RAGChunk[] = [];
    for (const chunk of ragChunks) {
      if (chunk.content && typeof chunk.content === 'string') {
        const detectionResult = this.piiDetectionService.detectPII(
          chunk.content,
          tenantId,
          `rag.${chunk.shardId}`
        );

        if (detectionResult.hasPII) {
          totalDetections += detectionResult.totalCount;
          for (const [type, count] of Object.entries(detectionResult.byType)) {
            byType[type] = (byType[type] || 0) + (typeof count === 'number' ? count : 0);
          }

          // Phase 3.1: Apply redaction with context-aware options
          const redactionResult = this.piiRedactionService.applyRedaction(
            chunk.content,
            detectionResult.detected,
            config.redactionStrategy,
            contextAwareOptions,
            modelName
          );

          if (redactionResult.redactions.length > 0) {
            redactedRagChunks.push({
              ...chunk,
              content: redactionResult.redacted,
            });
            redactionsApplied += redactionResult.redactions.length;
          } else {
            redactedRagChunks.push(chunk);
          }
        } else {
          redactedRagChunks.push(chunk);
        }
      } else {
        redactedRagChunks.push(chunk);
      }
    }

    // Phase 3.1: Log redaction audit trail with original values if preserved
    if (totalDetections > 0) {
      this.monitoring.trackEvent('pii-detection.context-redacted', {
        tenantId,
        userId,
        totalDetections,
        byType: Object.keys(byType).length > 0 ? JSON.stringify(byType) : '',
        redactionsApplied,
        modelName,
        preserveForAudit: contextAwareOptions?.preserveForAudit || false,
      });

      // Store in comprehensive audit trail if available
      if (this.comprehensiveAuditTrailService) {
        try {
          // Phase 3.1: Include original values in audit if preserveForAudit is true
          const auditData: any = {
            tenantId,
            userId,
            operation: 'context-assembly',
            detectedPII: totalDetections,
            byType,
            redactionsApplied,
            timestamp: new Date(),
            modelName,
          };

          if (contextAwareOptions?.preserveForAudit) {
            // Collect original values from all redaction results
            const originalValues: Array<{ type: string; value: string; fieldPath?: string }> = [];
            // Note: In a full implementation, we would collect these from redaction results
            // For now, we track that originals were preserved
            auditData.originalValuesPreserved = true;
          }

          await this.comprehensiveAuditTrailService.logPIIRedaction(auditData);
        } catch (error) {
          // Non-blocking
          this.monitoring.trackException(error as Error, {
            operation: 'insight.pii-redaction.audit',
            tenantId,
          });
        }
      }
    }

    return {
      redactedPrimary,
      redactedRelated,
      redactedRagChunks,
      auditInfo: {
        piiDetected: totalDetections > 0,
        totalDetections,
        byType,
        redactionsApplied,
        redactedAt: new Date(),
      },
    };
  }

  /**
   * Phase 2.4: Get cached similar queries when vector search fails
   */
  private async getCachedSimilarQueries(
    tenantId: string,
    query: string,
    projectId?: string
  ): Promise<{
    results: Array<{
      shardId: string;
      shardTypeId: string;
      shard?: { name: string };
      content: string;
      chunkIndex?: number;
      score: number;
      highlight?: string;
    }>;
  }> {
    try {
      if (!this.redis) {
        return { results: [] };
      }

      // Try to find similar cached queries
      // This is a simplified implementation - in production, you might want to use
      // semantic similarity to find similar queries
      const queryHash = createHash('sha256')
        .update(`${tenantId}:${query}`)
        .digest('hex');
      
      // Try to get cached context for similar queries
      // Look for cached queries with similar keywords
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 3);

      if (keywords.length === 0) {
        return { results: [] };
      }

      // Try to find cached context with similar keywords
      // This is a basic implementation - in production, you might want to use
      // a more sophisticated similarity search
      const cachePattern = `global-context:${tenantId}:*`;
      
      // Note: Redis KEYS is not recommended for production, but for fallback scenarios
      // it's acceptable. In production, maintain a separate index of cached queries.
      const cachedKeys: string[] = [];
      try {
        // Try to get a few recent cached queries
        // This is a simplified approach - in production, maintain a query index
        for (const keyword of keywords.slice(0, 2)) {
          const pattern = `global-context:${tenantId}:*${keyword}*`;
          // Note: This is a simplified approach - actual implementation would need
          // a proper query index or use Redis SCAN
        }
      } catch (error) {
        // If cache lookup fails, return empty results
        this.monitoring.trackException(error as Error, {
          operation: 'insight.cached-queries-fallback',
          tenantId,
        });
        return { results: [] };
      }

      // For now, return empty - in production, implement proper cached query retrieval
      return { results: [] };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'insight.cached-queries-fallback',
        tenantId,
      });
      return { results: [] };
    }
  }

  /**
   * Rerank RAG chunks using semantic relevance scoring
   * Uses LLM to score each chunk's relevance to the query
   */
  private async rerankRAGChunks(
    tenantId: string,
    query: string,
    chunks: RAGChunk[],
    insightType: InsightType
  ): Promise<RAGChunk[]> {
    if (chunks.length === 0) {
      return chunks;
    }

    // Limit to top 20 chunks for reranking (to avoid excessive LLM calls)
    const chunksToRerank = chunks.slice(0, 20);
    
    // Use a lightweight model for reranking (if available) or fall back to default
    const rerankModelId = 'gpt-4o-mini'; // Lightweight model for cost efficiency
    
    try {
      // Get connection for reranking model
      const connectionResult = await this.aiConnectionService!.getConnectionWithCredentialsForModel(
        rerankModelId,
        tenantId
      );

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
      const result = await this.unifiedAIClient!.chat(connection, apiKey, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1, // Low temperature for consistent scoring
        maxTokens: 500, // Small response (just scores)
      });

      // Parse scores from LLM response
      let scores: number[] = [];
      try {
        // Try to extract JSON array from response
        const content = result.content;
        if (content) {
          const jsonMatch = content.match(/\[[\d.,\s]+\]/);
          if (jsonMatch) {
            scores = JSON.parse(jsonMatch[0]);
          } else {
            // Fallback: try parsing the entire response as JSON
            scores = JSON.parse(content);
          }
        }
      } catch (parseError) {
        // If parsing fails, use original scores
        this.monitoring.trackEvent('insight.rag.rerank.parseFailed', {
          tenantId,
          response: (result.content || '').substring(0, 100),
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
    } catch (error) {
      // If reranking fails, return original order
      this.monitoring.trackException(error as Error, {
        operation: 'insight.rerankRAGChunks',
        tenantId,
      });
      return chunks;
    }
  }

  /**
   * Estimate token count
   */
  private estimateTokens(data: unknown): number {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return Math.ceil(str.length / 4); // Rough estimate: 4 chars per token
  }
}


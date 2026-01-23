// @ts-nocheck - Optional service, not used by workers
/**
 * Intent Analyzer Service
 * Analyzes user queries to determine intent, extract entities, and resolve scope
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import {
  ShardRepository,
  ShardTypeRepository,
} from '@castiel/api-core';
import { AIModelSelectionService } from './ai/ai-model-selection.service.js';
import { UnifiedAIClient } from './ai/unified-ai-client.service.js';
import {
  InsightType,
  IntentAnalysisResult,
  ExtractedEntity,
  ContextScope,
} from '../types/ai-insights.types.js';
import type { ConversationMessage } from '../types/conversation.types.js';

// Intent classification patterns
const INTENT_PATTERNS: Record<InsightType, RegExp[]> = {
  summary: [
    /summarize|summary|overview|brief|tldr|recap|digest/i,
    /what happened|what's new|catch me up|bring me up to speed/i,
    /give me (a |an )?(quick |brief )?(summary|overview)/i,
  ],
  analysis: [
    /analyze|analysis|examine|evaluate|assess|review/i,
    /what (are|is) the (risks?|opportunities|issues|problems|challenges)/i,
    /health|status|performance|progress/i,
    /strengths?|weaknesses?|swot/i,
  ],
  comparison: [
    /compare|comparison|versus|vs\.?|difference|similar|better/i,
    /how does .+ compare to/i,
    /which (one |is )?(better|worse|bigger|smaller)/i,
  ],
  recommendation: [
    /recommend|suggestion|suggest|advise|advice|should|what to do/i,
    /next steps?|action items?|priorities/i,
    /how (can|should|do) (i|we)/i,
  ],
  prediction: [
    /predict|forecast|estimate|project|expect|likely|probability/i,
    /will .+ (happen|succeed|fail|close|win)/i,
    /what (will|might|could) happen/i,
  ],
  extraction: [
    /extract|find|get|list|show|give me|pull out/i,
    /who (is|are)|what (is|are) the/i,
    /names?|contacts?|emails?|numbers?|dates?/i,
  ],
  search: [
    /search|find|look for|locate|where/i,
    /anything (about|related|mentioning)/i,
  ],
  generation: [
    /write|create|draft|generate|compose|make/i,
    /email|report|document|proposal|summary/i,
  ],
};

// Entity extraction patterns
const ENTITY_PATTERNS = {
  project: /project\s+["']?([^"'\s,]+)["']?/i,
  company: /company\s+["']?([^"'\s,]+)["']?|(?:at|for|from)\s+["']?([^"'\s,]+)["']?/i,
  contact: /contact\s+["']?([^"'\s,]+)["']?/i,
  opportunity: /opportunity\s+["']?([^"'\s,]+)["']?|deal\s+["']?([^"'\s,]+)["']?/i,
  timeRange: {
    relative: /(today|yesterday|this week|last week|this month|last month|this quarter|last quarter|this year|last year)/i,
    range: /(from|between)\s+(\d{4}-\d{2}-\d{2})\s+(to|and)\s+(\d{4}-\d{2}-\d{2})/i,
    past: /(past|last)\s+(\d+)\s+(days?|weeks?|months?|years?)/i,
  },
  metric: /(revenue|cost|profit|margin|growth|count|total|average|sum|number of)/i,
};

// Complexity estimation
const COMPLEXITY_THRESHOLDS = {
  simple: { maxEntities: 1, maxRelationships: 1, estimatedTokens: 2000 },
  moderate: { maxEntities: 3, maxRelationships: 3, estimatedTokens: 5000 },
  complex: { maxEntities: Infinity, maxRelationships: Infinity, estimatedTokens: 10000 },
};

/**
 * Intent Analyzer Service
 */
export class IntentAnalyzerService {
  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository: ShardRepository,
    private shardTypeRepository: ShardTypeRepository,
    private redis?: Redis,
    private aiModelSelection?: AIModelSelectionService,
    private unifiedAIClient?: UnifiedAIClient
  ) {}

  /**
   * Analyze user query to determine intent
   * Enhanced with follow-up detection and conversation context
   */
  async analyze(
    query: string,
    tenantId: string,
    context: {
      conversationHistory?: string[] | ConversationMessage[]; // Support both string[] and ConversationMessage[]
      conversationMessages?: ConversationMessage[]; // Full message objects for better context
      previousIntent?: IntentAnalysisResult; // Previous intent result for follow-up detection
      previousResponse?: string; // Previous assistant response
      currentScope?: ContextScope;
      userPreferences?: Record<string, unknown>;
    } = {}
  ): Promise<IntentAnalysisResult> {
    const startTime = Date.now();

    try {
      // 0. Detect and handle follow-up queries
      let processedQuery = query;
      let mergedScope = context.currentScope;
      let isFollowUpQuery = false;

      // Convert conversation history to strings if needed
      const historyStrings = context.conversationHistory
        ? context.conversationHistory.map(h => 
            typeof h === 'string' ? h : (h).content
          )
        : [];

      // Use full message objects if available, otherwise use strings
      const conversationMessages = context.conversationMessages || 
        (context.conversationHistory?.filter(h => typeof h !== 'string')) ||
        [];

      // Check if this is a follow-up query
      if (this.isFollowUp(query, historyStrings) && (context.previousIntent || conversationMessages.length > 0)) {
        isFollowUpQuery = true;
        this.monitoring.trackEvent('intent.follow-up-detected', {
          tenantId,
          query: query.substring(0, 100),
        });

        // Resolve pronouns and references in follow-up query
        if (conversationMessages.length > 0) {
          processedQuery = await this.resolveFollowUpReferences(query, conversationMessages, tenantId);
        }

        // Merge context with previous intent if available
        if (context.previousIntent) {
          const merged = this.mergeFollowUpContext(processedQuery, context.previousIntent.scope, context.previousIntent.insightType);
          processedQuery = merged.mergedQuery;
          mergedScope = merged.mergedScope;
        }
      }

      // 1. Classify intent type (LLM-assisted if available, else pattern-based)
      // Use processed query (with resolved references) for classification
      // Check for multi-intent queries first
      const multiIntentResult = await this.detectMultiIntent(processedQuery, tenantId, historyStrings);
      const llmResult = multiIntentResult || await this.classifyIntentWithLLM(processedQuery, tenantId, historyStrings);
      const { type, confidence, isMultiIntent, secondaryIntents } = llmResult || this.classifyInsightType(processedQuery, historyStrings);

      // 2. Extract entities (use processed query with resolved references)
      const entities = await this.extractEntities(processedQuery, tenantId);

      // 3. Resolve entity references to shard IDs
      const resolvedEntities = await this.resolveEntityReferences(entities, tenantId);

      // 4. Determine scope (use merged scope if follow-up detected)
      const scope = this.determineScope(resolvedEntities, mergedScope || context.currentScope);

      // 5. Estimate complexity
      const { complexity, estimatedTokens } = this.estimateComplexity(type, scope, resolvedEntities);

      // 6. Suggest template
      const suggestedTemplateId = this.suggestTemplate(type, scope);

      const result: IntentAnalysisResult = {
        insightType: type,
        confidence,
        isMultiIntent: isMultiIntent || false,
        secondaryIntents: secondaryIntents || undefined,
        entities: resolvedEntities,
        scope,
        suggestedTemplateId,
        complexity,
        estimatedTokens,
      };

      this.monitoring.trackEvent('intent.analyzed', {
        tenantId,
        insightType: type,
        confidence,
        entityCount: entities.length,
        complexity,
        isFollowUp: isFollowUpQuery,
        durationMs: Date.now() - startTime,
      });

      return result;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'intent.analyze',
        tenantId,
        query: query.substring(0, 100),
      });
      throw error;
    }
  }

  /**
   * Attempt LLM-based intent classification. Falls back to null if unavailable/errors.
   */
  private async classifyIntentWithLLM(
    query: string,
    tenantId: string,
    conversationHistory?: string[]
  ): Promise<{ type: InsightType; confidence: number } | null> {
    if (!this.aiModelSelection || !this.unifiedAIClient) {
      return null;
    }

    try {
      const selectionResult = await this.aiModelSelection.selectModel({
        tenantId,
        userId: 'system',
        query,
        contextSize: 500,
        requiredContentType: 'text',
        allowFallback: true,
        preferQuality: 'economy',
      });

      if (!selectionResult.success) {
        this.monitoring.trackEvent('intent.llm-selection-unavailable', {
          tenantId,
          reason: selectionResult.error,
        });
        return null;
      }

      const conn = selectionResult.connection;

      // Enhanced zero-shot classification prompt with better structure
      const systemPrompt = [
        'You are an expert intent classifier for enterprise knowledge management systems.',
        '',
        'Your task is to classify user queries into one of these intent types:',
        '- summary: User wants a concise overview, recap, or TL;DR',
        '- analysis: User wants deep analysis, insights, risk assessment, or evaluation',
        '- comparison: User wants to compare multiple items, options, or scenarios',
        '- recommendation: User wants advice, suggestions, next steps, or actionable guidance',
        '- prediction: User wants forecasts, projections, or likelihood assessments',
        '- extraction: User wants specific data points, facts, or structured information extracted',
        '- search: User is looking for information, documents, or resources',
        '- generation: User wants content created, written, or composed',
        '',
        'Guidelines:',
        '- Choose the most specific intent that matches the query',
        '- Consider the user\'s primary goal, not just keywords',
        '- For ambiguous queries, choose the most likely intent based on context',
        '- Confidence should reflect how certain you are (0.0-1.0)',
        '',
        'Return ONLY valid JSON with these exact fields:',
        '{"insightType":"<type>","confidence":<0.0-1.0>}',
        'Do not include explanations, markdown, or extra keys. Use lowercase for type.',
      ].join('\n');

      const historyText = conversationHistory && conversationHistory.length
        ? `\n\nRecent conversation context (last ${Math.min(3, conversationHistory.length)} messages):\n` +
          conversationHistory.slice(-3).map((m, i) => `${i + 1}. ${m}`).join('\n')
        : '';

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: `Classify this query:${historyText}\n\nQuery: "${query}"\n\nRespond with JSON only.` },
      ];

      // Use low temperature for consistent classification (zero-shot)
      // Request JSON format for structured output
      const response = await this.unifiedAIClient.chat(
        conn.connection,
        conn.apiKey,
        {
          messages,
          temperature: 0.1, // Very low temperature for consistent classification
          maxTokens: 150, // Reduced since we only need JSON
          topP: 1,
          stream: false,
          stopSequences: ['\n\n', '\n}'], // Stop after JSON object
          // Note: responseFormat: 'json_object' would be ideal but depends on model support
        }
      );

      const parsed = this.parseLLMIntentOutput(response.content);
      if (!parsed) {
        this.monitoring.trackEvent('intent.llm-parse-failed', {
          tenantId,
        });
        return null;
      }

      this.monitoring.trackEvent('intent.llm-classified', {
        tenantId,
        insightType: parsed.type,
        confidence: parsed.confidence,
        model: response.model,
      });

      return parsed;
    } catch (err: any) {
      this.monitoring.trackException(err, {
        operation: 'intent.classify.llm',
        tenantId,
      });
      return null;
    }
  }

  /**
   * Detect multi-intent queries and decompose them
   * Returns null if not multi-intent, otherwise returns primary intent with secondary intents
   */
  private async detectMultiIntent(
    query: string,
    tenantId: string,
    conversationHistory?: string[]
  ): Promise<{ 
    type: InsightType; 
    confidence: number;
    isMultiIntent: boolean;
    secondaryIntents?: Array<{ type: InsightType; confidence: number; query?: string }>;
  } | null> {
    if (!this.aiModelSelection || !this.unifiedAIClient) {
      return null; // Fall back to single intent if LLM not available
    }

    try {
      const selectionResult = await this.aiModelSelection.selectModel({
        tenantId,
        userId: 'system',
        query,
        contextSize: 1000,
        requiredContentType: 'text',
        allowFallback: true,
        preferQuality: 'economy',
      });

      if (!selectionResult.success) {
        return null;
      }

      const conn = selectionResult.connection;

      // Enhanced zero-shot multi-intent detection prompt
      const systemPrompt = [
        'You are an expert intent classifier for enterprise knowledge management systems.',
        '',
        'Your task is to detect if a user query contains MULTIPLE distinct intents.',
        '',
        'A multi-intent query asks for multiple different things in a single query, for example:',
        '- "What are the risks in this deal and should I be worried?" → analysis + recommendation',
        '- "Summarize this project and compare it to last quarter" → summary + comparison',
        '- "What are the key points and what should I do next?" → extraction + recommendation',
        '- "Analyze the market trends and predict next quarter revenue" → analysis + prediction',
        '',
        'Single-intent queries have ONE clear primary goal:',
        '- "What are the risks?" → analysis only',
        '- "Should I proceed?" → recommendation only',
        '- "Summarize the meeting" → summary only',
        '',
        'Available intent types:',
        '- summary: Overview, recap, TL;DR',
        '- analysis: Deep analysis, insights, risk assessment',
        '- comparison: Compare items, options, scenarios',
        '- recommendation: Advice, suggestions, next steps',
        '- prediction: Forecasts, projections, likelihood',
        '- extraction: Extract specific data points',
        '- search: Find information or resources',
        '- generation: Create or write content',
        '',
        'Response format:',
        'If MULTIPLE intents detected, return:',
        '{"isMultiIntent": true, "primaryIntent": {"type": "<type>", "confidence": <0.0-1.0>}, "secondaryIntents": [{"type": "<type>", "confidence": <0.0-1.0>, "query": "<decomposed sub-query>"}]}',
        '',
        'If SINGLE intent, return:',
        '{"isMultiIntent": false, "primaryIntent": {"type": "<type>", "confidence": <0.0-1.0>}}',
        '',
        'Return ONLY valid JSON, no explanations or markdown. Use lowercase for type.',
      ].join('\n');

      const historyText = conversationHistory && conversationHistory.length
        ? `Recent conversation (last ${Math.min(3, conversationHistory.length)} messages):\n` +
          conversationHistory.slice(-3).map((m, i) => `#${i+1}: ${m}`).join('\n')
        : '';

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: `${historyText ? historyText + '\n\n' : ''}User query: ${query}\n\nAnalyze for multiple intents and respond with JSON only.` },
      ];

      const response = await this.unifiedAIClient.chat(
        conn.connection,
        conn.apiKey,
        {
          messages,
          temperature: 0.1, // Low temperature for consistent classification
          maxTokens: 300,
          topP: 1,
          stream: false,
          stopSequences: ['\n\n']
        }
      );

      const parsed = this.parseMultiIntentOutput(response.content);
      if (!parsed || !parsed.isMultiIntent) {
        // Not multi-intent, return null to fall back to single intent classification
        return null;
      }

      this.monitoring.trackEvent('intent.multi-intent-detected', {
        tenantId,
        primaryIntent: parsed.primaryIntent.type,
        secondaryIntentCount: parsed.secondaryIntents?.length || 0,
      });

      return {
        type: parsed.primaryIntent.type,
        confidence: parsed.primaryIntent.confidence,
        isMultiIntent: true,
        secondaryIntents: parsed.secondaryIntents?.map(si => ({
          type: si.type,
          confidence: si.confidence,
          query: si.query,
        })),
      };
    } catch (err: any) {
      this.monitoring.trackException(err, {
        operation: 'intent.detectMultiIntent',
        tenantId,
      });
      return null; // Fall back to single intent on error
    }
  }

  /**
   * Parse LLM JSON output for multi-intent detection
   */
  private parseMultiIntentOutput(text: string): {
    isMultiIntent: boolean;
    primaryIntent: { type: InsightType; confidence: number };
    secondaryIntents?: Array<{ type: InsightType; confidence: number; query?: string }>;
  } | null {
    try {
      // Extract JSON substring if model added prose
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const json = jsonMatch ? jsonMatch[0] : text;
      const obj = JSON.parse(json);

      const isMultiIntent = Boolean(obj.isMultiIntent);
      if (!isMultiIntent) {
        return null;
      }

      const primaryIntent = obj.primaryIntent || obj.primary;
      if (!primaryIntent || !primaryIntent.type) {
        return null;
      }

      const rawPrimaryType = String(primaryIntent.type).toLowerCase();
      const allowed: InsightType[] = [
        'summary', 'analysis', 'comparison', 'recommendation', 'prediction', 'extraction', 'search', 'generation'
      ];

      if (!allowed.includes(rawPrimaryType as InsightType)) {
        return null;
      }

      const secondaryIntents = obj.secondaryIntents || [];
      const parsedSecondary: Array<{ type: InsightType; confidence: number; query?: string }> = [];

      for (const si of secondaryIntents) {
        const rawType = String(si.type || '').toLowerCase();
        if (allowed.includes(rawType as InsightType)) {
          parsedSecondary.push({
            type: rawType as InsightType,
            confidence: Math.max(0, Math.min(1, Number(si.confidence) || 0.5)),
            query: si.query ? String(si.query) : undefined,
          });
        }
      }

      return {
        isMultiIntent: true,
        primaryIntent: {
          type: rawPrimaryType as InsightType,
          confidence: Math.max(0, Math.min(1, Number(primaryIntent.confidence) || 0.5)),
        },
        secondaryIntents: parsedSecondary.length > 0 ? parsedSecondary : undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse LLM JSON output for intent classification
   * Enhanced to handle various response formats (JSON, markdown code blocks, etc.)
   * Supports zero-shot classification with robust error handling
   */
  private parseLLMIntentOutput(text: string): { type: InsightType; confidence: number } | null {
    try {
      // Clean the text - remove markdown code blocks if present
      let cleanedText = text.trim();
      
      // Remove markdown code blocks (```json ... ``` or ``` ... ```)
      cleanedText = cleanedText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      
      // Try to extract JSON object from response
      // Look for JSON object pattern: { ... }
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // If no JSON found, try to parse the entire cleaned text
        cleanedText = cleanedText;
      } else {
        cleanedText = jsonMatch[0];
      }

      const parsed = JSON.parse(cleanedText);
      
      // Extract and validate intent type (support multiple field names)
      const rawType = String(parsed.insightType || parsed.type || parsed.intent || '').toLowerCase().trim();
      if (!rawType) {
        return null;
      }

      // Validate type is one of the allowed InsightTypes
      const validTypes: InsightType[] = [
        'summary',
        'analysis',
        'comparison',
        'recommendation',
        'prediction',
        'extraction',
        'search',
        'generation',
      ];
      
      if (validTypes.includes(rawType as InsightType)) {
        // Valid type found
        const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.8));
        return { 
          type: rawType as InsightType, 
          confidence 
        };
      }

      // Try to map common variations to valid types
      const typeMap: Record<string, InsightType> = {
        'summarize': 'summary',
        'summarization': 'summary',
        'summarise': 'summary',
        'analyze': 'analysis',
        'analysze': 'analysis', // Common typo
        'compare': 'comparison',
        'recommend': 'recommendation',
        'recommendations': 'recommendation',
        'suggest': 'recommendation',
        'predict': 'prediction',
        'forecast': 'prediction',
        'extract': 'extraction',
        'find': 'search',
        'search': 'search',
        'lookup': 'search',
        'generate': 'generation',
        'create': 'generation',
        'write': 'generation',
        'draft': 'generation',
        'compose': 'generation',
      };
      
      const mappedType = typeMap[rawType];
      if (mappedType) {
        // Use slightly lower confidence for mapped types (0.7 default vs 0.8 for exact match)
        const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.7));
        return {
          type: mappedType,
          confidence,
        };
      }

      // Type not recognized
      this.monitoring.trackEvent('intent.llm-invalid-type', {
        rawType,
        textPreview: text.substring(0, 100),
      });
      return null;
    } catch (error) {
      // Log parsing error for debugging
      this.monitoring.trackEvent('intent.llm-parse-error', {
        error: error instanceof Error ? error.message : String(error),
        textLength: text.length,
        textPreview: text.substring(0, 100),
      });
      return null;
    }
  }

  /**
   * Classify insight type from query
   */
  private classifyInsightType(
    query: string,
    conversationHistory?: string[]
  ): { type: InsightType; confidence: number; isMultiIntent?: boolean; secondaryIntents?: Array<{ type: InsightType; confidence: number; query?: string }> } {
    const scores: Record<InsightType, number> = {
      summary: 0,
      analysis: 0,
      comparison: 0,
      recommendation: 0,
      prediction: 0,
      extraction: 0,
      search: 0,
      generation: 0,
    };

    // Score based on pattern matching
    for (const [type, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          scores[type as InsightType] += 1;
        }
      }
    }

    // Boost based on conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      const lastMessages = conversationHistory.slice(-3);
      for (const message of lastMessages) {
        for (const [type, patterns] of Object.entries(INTENT_PATTERNS)) {
          for (const pattern of patterns) {
            if (pattern.test(message)) {
              scores[type as InsightType] += 0.3; // Smaller boost from history
            }
          }
        }
      }
    }

    // Find highest scoring type
    let maxType: InsightType = 'summary'; // Default
    let maxScore = 0;

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxType = type as InsightType;
      }
    }

    // Calculate confidence (0-1)
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? Math.min(maxScore / totalScore + 0.3, 1) : 0.5;

    return { type: maxType, confidence };
  }

  /**
   * Extract entities from query
   */
  private async extractEntities(query: string, tenantId: string): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];

    // Extract project mentions
    const projectMatch = ENTITY_PATTERNS.project.exec(query);
    if (projectMatch) {
      entities.push({
        type: 'shard',
        value: projectMatch[1],
        confidence: 0.8,
        startIndex: projectMatch.index,
        endIndex: projectMatch.index + projectMatch[0].length,
      });
    }

    // Extract company mentions
    const companyMatch = ENTITY_PATTERNS.company.exec(query);
    if (companyMatch) {
      entities.push({
        type: 'shard',
        value: companyMatch[1] || companyMatch[2],
        confidence: 0.7,
        startIndex: companyMatch.index,
        endIndex: companyMatch.index + companyMatch[0].length,
      });
    }

    // Extract time ranges
    const relativeTimeMatch = ENTITY_PATTERNS.timeRange.relative.exec(query);
    if (relativeTimeMatch) {
      entities.push({
        type: 'time_range',
        value: relativeTimeMatch[1],
        confidence: 0.9,
        startIndex: relativeTimeMatch.index,
        endIndex: relativeTimeMatch.index + relativeTimeMatch[0].length,
      });
    }

    const pastTimeMatch = ENTITY_PATTERNS.timeRange.past.exec(query);
    if (pastTimeMatch) {
      entities.push({
        type: 'time_range',
        value: `${pastTimeMatch[2]} ${pastTimeMatch[3]}`,
        confidence: 0.9,
        startIndex: pastTimeMatch.index,
        endIndex: pastTimeMatch.index + pastTimeMatch[0].length,
      });
    }

    // Extract metrics
    const metricMatch = ENTITY_PATTERNS.metric.exec(query);
    if (metricMatch) {
      entities.push({
        type: 'metric',
        value: metricMatch[1],
        confidence: 0.8,
        startIndex: metricMatch.index,
        endIndex: metricMatch.index + metricMatch[0].length,
      });
    }

    return entities;
  }

  /**
   * Resolve entity references to shard IDs
   */
  private async resolveEntityReferences(
    entities: ExtractedEntity[],
    tenantId: string
  ): Promise<ExtractedEntity[]> {
    const resolved: ExtractedEntity[] = [];

    for (const entity of entities) {
      if (entity.type === 'shard' && !entity.shardId) {
        // Try to find matching shard by name
        const searchResult = await this.shardRepository.list({
          filter: { tenantId },
          search: entity.value,
          limit: 5,
        });

        if (searchResult.shards.length > 0) {
          // Find best match - filter out shards without names
          const shardsWithNames = searchResult.shards.filter(s => s.name);
          const exactMatch = shardsWithNames.find(
            s => s.name.toLowerCase() === entity.value.toLowerCase()
          );
          const shard = exactMatch || shardsWithNames[0] || searchResult.shards[0];

          resolved.push({
            ...entity,
            shardId: shard.id,
            confidence: exactMatch ? 0.95 : 0.7,
          });
        } else {
          resolved.push(entity);
        }
      } else {
        resolved.push(entity);
      }
    }

    return resolved;
  }

  /**
   * Determine optimal context scope
   */
  private determineScope(
    entities: ExtractedEntity[],
    currentScope?: ContextScope
  ): ContextScope {
    const scope: ContextScope = {
      ...currentScope,
    };

    // Extract shard IDs from entities
    const shardEntities = entities.filter(e => e.type === 'shard' && e.shardId);
    if (shardEntities.length > 0) {
      scope.shardId = shardEntities[0].shardId;
    }

    // Extract time range from entities
    const timeEntities = entities.filter(e => e.type === 'time_range');
    if (timeEntities.length > 0) {
      scope.timeRange = this.parseTimeRange(timeEntities[0].value);
    }

    return scope;
  }

  /**
   * Parse time range string to date range
   */
  private parseTimeRange(value: string): { from: Date; to: Date } {
    const now = new Date();
    const to = new Date(now);
    const from = new Date(now);

    value = value.toLowerCase();

    if (value === 'today') {
      from.setHours(0, 0, 0, 0);
    } else if (value === 'yesterday') {
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 1);
      to.setHours(23, 59, 59, 999);
    } else if (value === 'this week') {
      from.setDate(from.getDate() - from.getDay());
      from.setHours(0, 0, 0, 0);
    } else if (value === 'last week') {
      from.setDate(from.getDate() - from.getDay() - 7);
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - to.getDay() - 1);
      to.setHours(23, 59, 59, 999);
    } else if (value === 'this month') {
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
    } else if (value === 'last month') {
      from.setMonth(from.getMonth() - 1);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      to.setDate(0); // Last day of previous month
      to.setHours(23, 59, 59, 999);
    } else if (value === 'this quarter') {
      const quarter = Math.floor(from.getMonth() / 3);
      from.setMonth(quarter * 3);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
    } else if (value === 'last quarter') {
      const quarter = Math.floor(from.getMonth() / 3) - 1;
      from.setMonth(quarter * 3);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      to.setMonth((quarter + 1) * 3);
      to.setDate(0);
      to.setHours(23, 59, 59, 999);
    } else if (value === 'this year') {
      from.setMonth(0);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
    } else if (value === 'last year') {
      from.setFullYear(from.getFullYear() - 1);
      from.setMonth(0);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      to.setMonth(0);
      to.setDate(0);
      to.setHours(23, 59, 59, 999);
    } else {
      // Parse "X days/weeks/months/years"
      const match = /(\d+)\s*(days?|weeks?|months?|years?)/.exec(value);
      if (match) {
        const amount = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();

        if (unit.startsWith('day')) {
          from.setDate(from.getDate() - amount);
        } else if (unit.startsWith('week')) {
          from.setDate(from.getDate() - amount * 7);
        } else if (unit.startsWith('month')) {
          from.setMonth(from.getMonth() - amount);
        } else if (unit.startsWith('year')) {
          from.setFullYear(from.getFullYear() - amount);
        }
      }
    }

    return { from, to };
  }

  /**
   * Estimate complexity and tokens
   */
  private estimateComplexity(
    type: InsightType,
    scope: ContextScope,
    entities: ExtractedEntity[]
  ): { complexity: 'simple' | 'moderate' | 'complex'; estimatedTokens: number } {
    const entityCount = entities.length;
    const hasTimeRange = !!scope.timeRange;
    const hasMultipleShards = entities.filter(e => e.type === 'shard').length > 1;

    // Base tokens by insight type
    const baseTokens: Record<InsightType, number> = {
      summary: 2000,
      analysis: 4000,
      comparison: 5000,
      recommendation: 3000,
      prediction: 4000,
      extraction: 2000,
      search: 1500,
      generation: 3000,
    };

    let estimatedTokens = baseTokens[type];

    // Adjust based on complexity factors
    if (hasTimeRange) {estimatedTokens += 1000;}
    if (hasMultipleShards) {estimatedTokens += 2000;}
    if (entityCount > 3) {estimatedTokens += 1000;}

    // Determine complexity level
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';

    if (hasMultipleShards || entityCount > 3 || estimatedTokens > 5000) {
      complexity = 'complex';
    } else if (hasTimeRange || entityCount > 1 || estimatedTokens > 2500) {
      complexity = 'moderate';
    }

    return { complexity, estimatedTokens };
  }

  /**
   * Suggest appropriate template based on intent and scope
   */
  private suggestTemplate(type: InsightType, scope: ContextScope): string | undefined {
    // Map insight types to template prefixes
    const templateMap: Record<InsightType, string> = {
      summary: 'tpl_summary',
      analysis: 'tpl_analysis',
      comparison: 'tpl_comparison',
      recommendation: 'tpl_recommendation',
      prediction: 'tpl_prediction',
      extraction: 'tpl_extraction',
      search: 'tpl_search',
      generation: 'tpl_generation',
    };

    // If we have a specific shard type in scope, append it
    if (scope.shardTypeId) {
      return `${templateMap[type]}_${scope.shardTypeId.replace('c_', '')}`;
    }

    return templateMap[type];
  }

  /**
   * Detect follow-up questions
   */
  isFollowUp(query: string, conversationHistory?: string[]): boolean {
    if (!conversationHistory || conversationHistory.length === 0) {
      return false;
    }

    // Patterns that indicate follow-up
    const followUpPatterns = [
      /^(and|also|what about|how about|tell me more|more details|explain|elaborate)/i,
      /^(yes|no|sure|okay|ok|right|exactly)/i,
      /^(that|this|it|they|them|those|these)\b/i,
      /\b(mentioned|said|told|referred)\b/i,
      /^why\b|^how\b|^when\b|^who\b|^where\b/i,
    ];

    return followUpPatterns.some(pattern => pattern.test(query.trim()));
  }

  /**
   * Resolve pronouns and references in follow-up queries using conversation history
   * Uses LLM-based resolution when available, falls back to pattern-based
   */
  private async resolveFollowUpReferences(
    query: string,
    conversationMessages: ConversationMessage[],
    tenantId: string
  ): Promise<string> {
    if (conversationMessages.length === 0) {
      return query;
    }

    // Extract last user message and assistant response
    const userMessages = conversationMessages.filter(m => m.role === 'user');
    const assistantMessages = conversationMessages.filter(m => m.role === 'assistant');

    const lastUserMessage = userMessages[userMessages.length - 1];
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];

    // Try LLM-based resolution if available
    if (this.unifiedAIClient && this.aiModelSelection && (lastUserMessage || lastAssistantMessage)) {
      try {
        const selectionResult = await this.aiModelSelection.selectModel({
          tenantId,
          userId: 'system',
          query,
          contextSize: 1000, // Increased context size for better resolution
          requiredContentType: 'text',
          allowFallback: true,
          preferQuality: 'economy',
        });

        if (selectionResult.success) {
          // Use more conversation context (last 3 exchanges) for better resolution
          const recentMessages = conversationMessages.slice(-6); // Last 3 exchanges (user + assistant pairs)
          const conversationContext = recentMessages
            .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n\n');

          const resolutionPrompt = `Given this conversation history, rewrite the follow-up query to be standalone and clear by resolving all pronouns (it, that, this, they, them, those, these) and references.

Conversation History:
${conversationContext}

Follow-up Query: ${query}

Instructions:
- Replace pronouns with the specific entities they refer to
- Expand abbreviated references (e.g., "it" -> "the project", "they" -> "the team members")
- Make the query self-contained so it can be understood without the conversation history
- Preserve the intent and meaning of the original query

Rewritten Query (standalone, with all references resolved):`;

          const response = await this.unifiedAIClient.chat(
            selectionResult.connection.connection,
            selectionResult.connection.apiKey,
            {
              messages: [
                { role: 'system', content: 'You are a query resolution assistant. Rewrite follow-up queries to be standalone by resolving pronouns and references. Return only the rewritten query, no explanations.' },
                { role: 'user', content: resolutionPrompt },
              ],
              maxTokens: 200, // Increased for more complex resolutions
              temperature: 0.2, // Low temperature for consistent rewriting
            }
          );

          const resolvedQuery = response.content.trim();
          
          // Validate that resolution actually happened (query should be different or longer)
          if (resolvedQuery && resolvedQuery.length > query.length * 0.5) {
            this.monitoring.trackEvent('intent.follow-up-resolved-llm', {
              tenantId,
              originalQuery: query.substring(0, 100),
              resolvedQuery: resolvedQuery.substring(0, 100),
              contextMessages: recentMessages.length,
            });

            return resolvedQuery;
          } else {
            // Resolution seems invalid, fall through to pattern-based
            this.monitoring.trackEvent('intent.follow-up-resolved-llm-invalid', {
              tenantId,
              originalQuery: query.substring(0, 100),
              resolvedQuery: resolvedQuery.substring(0, 100),
            });
          }
        }
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'intent.resolveFollowUpReferences.llm',
          tenantId,
        });
        // Fall through to pattern-based resolution
      }
    }

    // Fallback: Enhanced pattern-based resolution
    let resolvedQuery = query;

    // Extract entities and topics from conversation history (use last 3 messages for better context)
    const recentContext = conversationMessages.slice(-3);
    const allContextText = recentContext.map(m => m.content).join(' ');
    
    // Extract potential entities (capitalized words, quoted strings, project/company names)
    const entityPatterns = [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g, // Capitalized phrases
      /["']([^"']+)["']/g, // Quoted strings
      /(?:project|company|contact|opportunity|deal)\s+["']?([^"'\s,]+)["']?/gi, // Explicit entity mentions
    ];
    
    const extractedEntities: string[] = [];
    for (const pattern of entityPatterns) {
      const matches = allContextText.matchAll(pattern);
      for (const match of matches) {
        const entity = match[1] || match[0];
        if (entity && entity.length > 2 && !extractedEntities.includes(entity)) {
          extractedEntities.push(entity);
        }
      }
    }

    // Resolve common pronouns and references with better context
    if (/^(it|that|this)\b/i.test(query)) {
      // Try to find the most recent entity or topic
      if (extractedEntities.length > 0) {
        // Use the most recently mentioned entity
        resolvedQuery = query.replace(/^(it|that|this)\b/i, extractedEntities[extractedEntities.length - 1]);
      } else if (lastUserMessage) {
        // Extract main topic from last user message (first noun phrase)
        const topicMatch = lastUserMessage.content.match(/\b(the|a|an)?\s*([A-Z][a-z]+(?:\s+[a-z]+)*)/);
        if (topicMatch) {
          const topic = topicMatch[2] || lastUserMessage.content.split(/\s+/).slice(0, 5).join(' ');
          resolvedQuery = query.replace(/^(it|that|this)\b/i, topic);
        } else {
          const topic = lastUserMessage.content.split(/\s+/).slice(0, 5).join(' ');
          resolvedQuery = query.replace(/^(it|that|this)\b/i, topic);
        }
      } else if (lastAssistantMessage) {
        // Fallback to assistant message if no user message
        const topic = lastAssistantMessage.content.split(/\s+/).slice(0, 5).join(' ');
        resolvedQuery = query.replace(/^(it|that|this)\b/i, topic);
      }
    }

    if (/\b(they|them|those|these)\b/i.test(query)) {
      // Replace plural pronouns with reference to last mentioned entities
      if (extractedEntities.length > 0) {
        // Use multiple entities if available, or the last one
        const entitiesText = extractedEntities.length > 1 
          ? extractedEntities.slice(-2).join(' and ')
          : extractedEntities[extractedEntities.length - 1];
        resolvedQuery = query.replace(/\b(they|them|those|these)\b/i, entitiesText);
      } else if (lastUserMessage) {
        // Try to extract entities from last message
        const entities = lastUserMessage.content.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g) || [];
        if (entities.length > 0) {
          resolvedQuery = query.replace(/\b(they|them|those|these)\b/i, entities[entities.length - 1]);
        }
      }
    }

    // Resolve "what about X?" to reference previous context
    if (/^(what about|how about)\s+/i.test(query)) {
      const aboutMatch = query.match(/^(what about|how about)\s+(.+)/i);
      if (aboutMatch && lastUserMessage) {
        // Enhance query with context from previous message
        resolvedQuery = `${aboutMatch[2]} (in context of: ${lastUserMessage.content.substring(0, 100)})`;
      }
    }

    // Resolve "more details" or "elaborate" to reference previous topic
    if (/^(more|details?|elaborate|explain more)\b/i.test(query)) {
      if (lastUserMessage) {
        resolvedQuery = `Provide more details about: ${lastUserMessage.content}`;
      }
    }

    this.monitoring.trackEvent('intent.follow-up-resolved-pattern', {
      originalQuery: query.substring(0, 100),
      resolvedQuery: resolvedQuery.substring(0, 100),
    });

    return resolvedQuery;
  }

  /**
   * Merge follow-up context with previous scope
   */
  mergeFollowUpContext(
    currentQuery: string,
    previousScope: ContextScope,
    previousType: InsightType
  ): { mergedQuery: string; mergedScope: ContextScope } {
    // Keep previous scope but allow new entities to override
    const mergedScope = { ...previousScope };

    // Prepend context reference if query uses pronouns
    let mergedQuery = currentQuery;
    if (/^(it|they|this|that)\b/i.test(currentQuery)) {
      // Enhance query with context from previous scope
      if (previousScope.shardId) {
        mergedQuery = `${currentQuery} (referring to shard ${previousScope.shardId})`;
      } else if (previousScope.projectId) {
        mergedQuery = `${currentQuery} (referring to project ${previousScope.projectId})`;
      }
    }

    return { mergedQuery, mergedScope };
  }
}












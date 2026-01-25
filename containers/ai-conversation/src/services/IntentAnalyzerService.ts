/**
 * Intent Analyzer Service
 * Analyzes user queries to determine intent, extract entities, and resolve scope
 * Enhanced with LLM-based classification, multi-intent detection, and follow-up handling
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import {
  InsightType,
  IntentAnalysisResult,
  ExtractedEntity,
  ContextScope,
  ConversationMessage,
} from '../types/intent.types';

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

export class IntentAnalyzerService {
  private config: ReturnType<typeof loadConfig>;
  private aiServiceClient: ServiceClient;
  private shardManagerClient: ServiceClient;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();

    this.aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'ai-conversation',
      serviceName: 'ai-conversation',
      tenantId,
    });
  }

  /**
   * Analyze user query to determine intent
   * Enhanced with follow-up detection and conversation context
   */
  async analyze(
    query: string,
    tenantId: string,
    context: {
      conversationHistory?: string[] | ConversationMessage[];
      conversationMessages?: ConversationMessage[];
      previousIntent?: IntentAnalysisResult;
      previousResponse?: string;
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
        ? context.conversationHistory.map((h) =>
            typeof h === 'string' ? h : (h as ConversationMessage).content
          )
        : [];

      // Use full message objects if available
      const conversationMessages =
        context.conversationMessages ||
        (context.conversationHistory?.filter((h) => typeof h !== 'string') as ConversationMessage[]) ||
        [];

      // Check if this is a follow-up query
      if (
        this.isFollowUp(query, historyStrings) &&
        (context.previousIntent || conversationMessages.length > 0)
      ) {
        isFollowUpQuery = true;
        log.info('Follow-up query detected', {
          tenantId,
          query: query.substring(0, 100),
          service: 'ai-conversation',
        });

        // Resolve pronouns and references in follow-up query
        if (conversationMessages.length > 0) {
          processedQuery = await this.resolveFollowUpReferences(query, conversationMessages, tenantId);
        }

        // Merge context with previous intent if available
        if (context.previousIntent) {
          const merged = this.mergeFollowUpContext(
            processedQuery,
            context.previousIntent.scope,
            context.previousIntent.insightType
          );
          processedQuery = merged.mergedQuery;
          mergedScope = merged.mergedScope;
        }
      }

      // 1. Classify intent type (LLM-assisted if available, else pattern-based)
      const multiIntentResult = await this.detectMultiIntent(processedQuery, tenantId, historyStrings);
      const llmResult =
        multiIntentResult || (await this.classifyIntentWithLLM(processedQuery, tenantId, historyStrings));
      const { type, confidence, isMultiIntent, secondaryIntents } =
        llmResult || this.classifyInsightType(processedQuery, historyStrings);

      // 2. Extract entities
      const entities = await this.extractEntities(processedQuery, tenantId);

      // 3. Resolve entity references to shard IDs
      const resolvedEntities = await this.resolveEntityReferences(entities, tenantId);

      // 4. Determine scope
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

      log.info('Intent analyzed', {
        tenantId,
        insightType: type,
        confidence,
        entityCount: entities.length,
        complexity,
        isFollowUp: isFollowUpQuery,
        durationMs: Date.now() - startTime,
        service: 'ai-conversation',
      });

      return result;
    } catch (error: any) {
      log.error('Failed to analyze intent', error, {
        operation: 'intent.analyze',
        tenantId,
        query: query.substring(0, 100),
        service: 'ai-conversation',
      });
      throw error;
    }
  }

  /**
   * Attempt LLM-based intent classification
   */
  private async classifyIntentWithLLM(
    query: string,
    tenantId: string,
    conversationHistory?: string[]
  ): Promise<{ type: InsightType; confidence: number } | null> {
    try {
      const token = this.getServiceToken(tenantId);

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

      const historyText =
        conversationHistory && conversationHistory.length
          ? `\n\nRecent conversation context (last ${Math.min(3, conversationHistory.length)} messages):\n` +
            conversationHistory.slice(-3).map((m, i) => `${i + 1}. ${m}`).join('\n')
          : '';

      const response = await this.aiServiceClient.post<any>(
        '/api/ai/completions',
        {
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Classify this query:${historyText}\n\nQuery: "${query}"\n\nRespond with JSON only.`,
            },
          ],
          temperature: 0.1,
          maxTokens: 150,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const content = response.choices?.[0]?.message?.content || response.completion || response.text || '';
      const parsed = this.parseLLMIntentOutput(content);
      if (!parsed) {
        return null;
      }

      return parsed;
    } catch (err: any) {
      log.warn('LLM intent classification failed', {
        error: err.message,
        tenantId,
        service: 'ai-conversation',
      });
      return null;
    }
  }

  /**
   * Detect multi-intent queries
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
    try {
      const token = this.getServiceToken(tenantId);

      const systemPrompt = [
        'You are an expert intent classifier for enterprise knowledge management systems.',
        '',
        'Your task is to detect if a user query contains MULTIPLE distinct intents.',
        '',
        'A multi-intent query asks for multiple different things in a single query, for example:',
        '- "What are the risks in this deal and should I be worried?" → analysis + recommendation',
        '- "Summarize this project and compare it to last quarter" → summary + comparison',
        '',
        'Available intent types:',
        '- summary, analysis, comparison, recommendation, prediction, extraction, search, generation',
        '',
        'Response format:',
        'If MULTIPLE intents detected, return:',
        '{"isMultiIntent": true, "primaryIntent": {"type": "<type>", "confidence": <0.0-1.0>}, "secondaryIntents": [{"type": "<type>", "confidence": <0.0-1.0>}]}',
        '',
        'If SINGLE intent, return:',
        '{"isMultiIntent": false, "primaryIntent": {"type": "<type>", "confidence": <0.0-1.0>}}',
        '',
        'Return ONLY valid JSON, no explanations or markdown. Use lowercase for type.',
      ].join('\n');

      const historyText =
        conversationHistory && conversationHistory.length
          ? `Recent conversation (last ${Math.min(3, conversationHistory.length)} messages):\n` +
            conversationHistory.slice(-3).map((m, i) => `#${i + 1}: ${m}`).join('\n')
          : '';

      const response = await this.aiServiceClient.post<any>(
        '/api/ai/completions',
        {
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `${historyText ? historyText + '\n\n' : ''}User query: ${query}\n\nAnalyze for multiple intents and respond with JSON only.`,
            },
          ],
          temperature: 0.1,
          maxTokens: 300,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const content = response.choices?.[0]?.message?.content || response.completion || response.text || '';
      const parsed = this.parseMultiIntentOutput(content);
      if (!parsed || !parsed.isMultiIntent) {
        return null;
      }

      return {
        type: parsed.primaryIntent.type,
        confidence: parsed.primaryIntent.confidence,
        isMultiIntent: true,
        secondaryIntents: parsed.secondaryIntents?.map((si) => ({
          type: si.type,
          confidence: si.confidence,
          query: si.query,
        })),
      };
    } catch (err: any) {
      log.warn('Multi-intent detection failed', {
        error: err.message,
        tenantId,
        service: 'ai-conversation',
      });
      return null;
    }
  }

  /**
   * Parse LLM JSON output for intent classification
   */
  private parseLLMIntentOutput(text: string): { type: InsightType; confidence: number } | null {
    try {
      let cleanedText = text.trim();
      cleanedText = cleanedText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const rawType = String(parsed.insightType || parsed.type || parsed.intent || '').toLowerCase().trim();
      if (!rawType) {
        return null;
      }

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
        const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.8));
        return { type: rawType as InsightType, confidence };
      }

      // Map common variations
      const typeMap: Record<string, InsightType> = {
        summarize: 'summary',
        analyze: 'analysis',
        compare: 'comparison',
        recommend: 'recommendation',
        predict: 'prediction',
        extract: 'extraction',
        find: 'search',
        generate: 'generation',
      };

      const mappedType = typeMap[rawType];
      if (mappedType) {
        const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.7));
        return { type: mappedType, confidence };
      }

      return null;
    } catch (error) {
      return null;
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
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const obj = JSON.parse(jsonMatch[0]);
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
        'summary',
        'analysis',
        'comparison',
        'recommendation',
        'prediction',
        'extraction',
        'search',
        'generation',
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
   * Classify insight type from query (pattern-based fallback)
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
              scores[type as InsightType] += 0.3;
            }
          }
        }
      }
    }

    // Find highest scoring type
    let maxType: InsightType = 'summary';
    let maxScore = 0;

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxType = type as InsightType;
      }
    }

    // Calculate confidence
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
        startIndex: projectMatch.index || 0,
        endIndex: (projectMatch.index || 0) + projectMatch[0].length,
      });
    }

    // Extract company mentions
    const companyMatch = ENTITY_PATTERNS.company.exec(query);
    if (companyMatch) {
      entities.push({
        type: 'shard',
        value: companyMatch[1] || companyMatch[2],
        confidence: 0.7,
        startIndex: companyMatch.index || 0,
        endIndex: (companyMatch.index || 0) + companyMatch[0].length,
      });
    }

    // Extract time ranges
    const relativeTimeMatch = ENTITY_PATTERNS.timeRange.relative.exec(query);
    if (relativeTimeMatch) {
      entities.push({
        type: 'time_range',
        value: relativeTimeMatch[1],
        confidence: 0.9,
        startIndex: relativeTimeMatch.index || 0,
        endIndex: (relativeTimeMatch.index || 0) + relativeTimeMatch[0].length,
      });
    }

    const pastTimeMatch = ENTITY_PATTERNS.timeRange.past.exec(query);
    if (pastTimeMatch) {
      entities.push({
        type: 'time_range',
        value: `${pastTimeMatch[2]} ${pastTimeMatch[3]}`,
        confidence: 0.9,
        startIndex: pastTimeMatch.index || 0,
        endIndex: (pastTimeMatch.index || 0) + pastTimeMatch[0].length,
      });
    }

    // Extract metrics
    const metricMatch = ENTITY_PATTERNS.metric.exec(query);
    if (metricMatch) {
      entities.push({
        type: 'metric',
        value: metricMatch[1],
        confidence: 0.8,
        startIndex: metricMatch.index || 0,
        endIndex: (metricMatch.index || 0) + metricMatch[0].length,
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
        try {
          const token = this.getServiceToken(tenantId);
          const response = await this.shardManagerClient.get<any>(
            `/api/v1/shards?tenantId=${tenantId}&search=${encodeURIComponent(entity.value)}&limit=5`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'X-Tenant-ID': tenantId,
              },
            }
          );

          const shards = response.shards || response.data || [];
          if (shards.length > 0) {
            const shardsWithNames = shards.filter((s: any) => s.name);
            const exactMatch = shardsWithNames.find(
              (s: any) => s.name.toLowerCase() === entity.value.toLowerCase()
            );
            const shard = exactMatch || shardsWithNames[0] || shards[0];

            resolved.push({
              ...entity,
              shardId: shard.id,
              confidence: exactMatch ? 0.95 : 0.7,
            });
          } else {
            resolved.push(entity);
          }
        } catch (error) {
          log.warn('Failed to resolve entity reference', {
            error: error instanceof Error ? error.message : String(error),
            entity: entity.value,
            tenantId,
            service: 'ai-conversation',
          });
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
  private determineScope(entities: ExtractedEntity[], currentScope?: ContextScope): ContextScope {
    const scope: ContextScope = {
      ...currentScope,
    };

    // Extract shard IDs from entities
    const shardEntities = entities.filter((e) => e.type === 'shard' && e.shardId);
    if (shardEntities.length > 0) {
      scope.shardId = shardEntities[0].shardId;
    }

    // Extract time range from entities
    const timeEntities = entities.filter((e) => e.type === 'time_range');
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
      to.setDate(0);
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
    const hasMultipleShards = entities.filter((e) => e.type === 'shard').length > 1;

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
    if (hasTimeRange) {
      estimatedTokens += 1000;
    }
    if (hasMultipleShards) {
      estimatedTokens += 2000;
    }
    if (entityCount > 3) {
      estimatedTokens += 1000;
    }

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

    const followUpPatterns = [
      /^(and|also|what about|how about|tell me more|more details|explain|elaborate)/i,
      /^(yes|no|sure|okay|ok|right|exactly)/i,
      /^(that|this|it|they|them|those|these)\b/i,
      /\b(mentioned|said|told|referred)\b/i,
      /^why\b|^how\b|^when\b|^who\b|^where\b/i,
    ];

    return followUpPatterns.some((pattern) => pattern.test(query.trim()));
  }

  /**
   * Resolve pronouns and references in follow-up queries
   */
  private async resolveFollowUpReferences(
    query: string,
    conversationMessages: ConversationMessage[],
    tenantId: string
  ): Promise<string> {
    if (conversationMessages.length === 0) {
      return query;
    }

    // Try LLM-based resolution
    try {
      const token = this.getServiceToken(tenantId);
      const recentMessages = conversationMessages.slice(-6);
      const conversationContext = recentMessages
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const resolutionPrompt = `Given this conversation history, rewrite the follow-up query to be standalone and clear by resolving all pronouns (it, that, this, they, them, those, these) and references.

Conversation History:
${conversationContext}

Follow-up Query: ${query}

Instructions:
- Replace pronouns with the specific entities they refer to
- Expand abbreviated references
- Make the query self-contained
- Preserve the intent and meaning

Rewritten Query (standalone, with all references resolved):`;

      const response = await this.aiServiceClient.post<any>(
        '/api/ai/completions',
        {
          messages: [
            {
              role: 'system',
              content:
                'You are a query resolution assistant. Rewrite follow-up queries to be standalone by resolving pronouns and references. Return only the rewritten query, no explanations.',
            },
            { role: 'user', content: resolutionPrompt },
          ],
          maxTokens: 200,
          temperature: 0.2,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const content = response.choices?.[0]?.message?.content || response.completion || response.text || '';
      const resolvedQuery = content.trim();

      if (resolvedQuery && resolvedQuery.length > query.length * 0.5) {
        return resolvedQuery;
      }
    } catch (error) {
      log.warn('LLM follow-up resolution failed, using pattern-based', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        service: 'ai-conversation',
      });
    }

    // Fallback: Pattern-based resolution
    let resolvedQuery = query;
    const recentContext = conversationMessages.slice(-3);
    const allContextText = recentContext.map((m) => m.content).join(' ');

    const entityPatterns = [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
      /["']([^"']+)["']/g,
      /(?:project|company|contact|opportunity|deal)\s+["']?([^"'\s,]+)["']?/gi,
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

    const userMessages = conversationMessages.filter((m) => m.role === 'user');
    const assistantMessages = conversationMessages.filter((m) => m.role === 'assistant');
    const lastUserMessage = userMessages[userMessages.length - 1];
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];

    if (/^(it|that|this)\b/i.test(query)) {
      if (extractedEntities.length > 0) {
        resolvedQuery = query.replace(/^(it|that|this)\b/i, extractedEntities[extractedEntities.length - 1]);
      } else if (lastUserMessage) {
        const topic = lastUserMessage.content.split(/\s+/).slice(0, 5).join(' ');
        resolvedQuery = query.replace(/^(it|that|this)\b/i, topic);
      }
    }

    if (/\b(they|them|those|these)\b/i.test(query)) {
      if (extractedEntities.length > 0) {
        const entitiesText =
          extractedEntities.length > 1
            ? extractedEntities.slice(-2).join(' and ')
            : extractedEntities[extractedEntities.length - 1];
        resolvedQuery = query.replace(/\b(they|them|those|these)\b/i, entitiesText);
      }
    }

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
    const mergedScope = { ...previousScope };

    let mergedQuery = currentQuery;
    if (/^(it|they|this|that)\b/i.test(currentQuery)) {
      if (previousScope.shardId) {
        mergedQuery = `${currentQuery} (referring to shard ${previousScope.shardId})`;
      } else if (previousScope.projectId) {
        mergedQuery = `${currentQuery} (referring to project ${previousScope.projectId})`;
      }
    }

    return { mergedQuery, mergedScope };
  }

  /**
   * Legacy method for backward compatibility
   */
  async analyzeIntent(tenantId: string, query: string): Promise<{
    intent: string;
    confidence: number;
    entities: Array<{ type: string; value: string }>;
    category: 'question' | 'command' | 'request' | 'clarification' | 'other';
  }> {
    const result = await this.analyze(query, tenantId);
    return {
      intent: result.insightType,
      confidence: result.confidence,
      entities: result.entities.map((e) => ({ type: e.type, value: e.value })),
      category: 'question',
    };
  }
}

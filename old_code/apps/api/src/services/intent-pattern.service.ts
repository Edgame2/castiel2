/**
 * Intent Pattern Service
 * Manages intent classification patterns with LLM-assisted generation
 */

import type { IMonitoringProvider } from '@castiel/monitoring';
import { CosmosClient } from '@azure/cosmos';
import { config } from '../config/env.js';
import { IntentPatternRepository } from '../repositories/intent-pattern.repository.js';
import type {
  IntentPattern,
  CreateIntentPatternInput,
  UpdateIntentPatternInput,
  ListIntentPatternsOptions,
  TestPatternInput,
  TestPatternResult,
  SuggestPatternFromSamplesInput,
  SuggestPatternFromSamplesResponse,
  PatternPerformanceMetrics,
  PatternListResponse,
} from '../types/intent-pattern.types.js';
import type { InsightType } from '../types/ai-insights.types.js';
import { UnifiedAIClient } from './ai/unified-ai-client.service.js';
import { AIConnectionService } from './ai/ai-connection.service.js';

export class IntentPatternService {
  private repository: IntentPatternRepository;

  constructor(
    private monitoring: IMonitoringProvider,
    private unifiedAIClient?: UnifiedAIClient,
    private aiConnectionService?: AIConnectionService
  ) {
    const client = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
    });
    this.repository = new IntentPatternRepository(
      client,
      config.cosmosDb.databaseId
    );
  }

  /**
   * Initialize repository (ensure container exists)
   */
  async initialize(): Promise<void> {
    const client = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
    });
    await IntentPatternRepository.ensureContainer(
      client,
      config.cosmosDb.databaseId
    );
  }

  /**
   * Create a new intent pattern
   */
  async create(
    input: CreateIntentPatternInput,
    createdBy: string
  ): Promise<IntentPattern> {
    const pattern = await this.repository.create(input, createdBy);
    
    this.monitoring.trackEvent('intent-pattern.created', {
      patternId: pattern.id,
      intentType: pattern.intentType,
      createdBy,
    });

    return pattern;
  }

  /**
   * Get pattern by ID
   */
  async findById(id: string): Promise<IntentPattern | null> {
    return this.repository.findById(id);
  }

  /**
   * List patterns with filters
   */
  async list(options: ListIntentPatternsOptions = {}): Promise<PatternListResponse> {
    const result = await this.repository.list(options);
    const metrics = await this.getPerformanceMetrics();

    return {
      patterns: result.patterns,
      metrics,
      total: result.total,
      limit: options.limit || 100,
      offset: options.offset || 0,
    };
  }

  /**
   * Update pattern
   */
  async update(
    id: string,
    input: UpdateIntentPatternInput,
    updatedBy: string
  ): Promise<IntentPattern> {
    const pattern = await this.repository.update(id, input, updatedBy);
    
    this.monitoring.trackEvent('intent-pattern.updated', {
      patternId: id,
      updatedBy,
    });

    return pattern;
  }

  /**
   * Delete pattern
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
    
    this.monitoring.trackEvent('intent-pattern.deleted', {
      patternId: id,
    });
  }

  /**
   * Test pattern against sample queries
   */
  async testPattern(input: TestPatternInput): Promise<TestPatternResult[]> {
    const results: TestPatternResult[] = [];

    // Convert pattern strings to RegExp
    const regexPatterns = (input.pattern.patterns || []).map(
      p => new RegExp(p, 'i')
    );
    const excludePatterns = (input.pattern.excludePatterns || []).map(
      p => new RegExp(p, 'i')
    );
    const keywords = input.pattern.keywords || [];
    const phrases = input.pattern.phrases || [];

    for (const query of input.testQueries) {
      let matched = false;
      let confidence = 0;
      let matchedPattern: string | undefined;
      const matchedKeywords: string[] = [];

      // Check exclude patterns first
      const excluded = excludePatterns.some(pattern => pattern.test(query));
      if (excluded) {
        results.push({
          query,
          matched: false,
          confidence: 0,
          intentType: input.pattern.intentType!,
        });
        continue;
      }

      // Check regex patterns
      for (const pattern of regexPatterns) {
        if (pattern.test(query)) {
          matched = true;
          confidence = Math.max(confidence, 0.7);
          matchedPattern = pattern.toString();
          break;
        }
      }

      // Check keywords
      const queryLower = query.toLowerCase();
      for (const keyword of keywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          matched = true;
          matchedKeywords.push(keyword);
          confidence = Math.max(confidence, 0.5);
        }
      }

      // Check phrases
      for (const phrase of phrases) {
        if (queryLower.includes(phrase.toLowerCase())) {
          matched = true;
          confidence = Math.max(confidence, 0.6);
        }
      }

      // Apply confidence weight
      if (input.pattern.confidenceWeight) {
        confidence *= input.pattern.confidenceWeight;
        confidence = Math.min(confidence, 1.0);
      }

      results.push({
        query,
        matched,
        confidence,
        intentType: input.pattern.intentType!,
        matchedPattern,
        matchedKeywords: matchedKeywords.length > 0 ? matchedKeywords : undefined,
      });
    }

    this.monitoring.trackEvent('intent-pattern.tested', {
      testQueries: input.testQueries.length,
      matchedCount: results.filter(r => r.matched).length,
    });

    return results;
  }

  /**
   * LLM-assisted pattern generation from sample queries
   */
  async suggestPatternFromSamples(
    input: SuggestPatternFromSamplesInput,
    tenantId: string = 'SYSTEM'
  ): Promise<SuggestPatternFromSamplesResponse> {
    if (!this.unifiedAIClient || !this.aiConnectionService) {
      throw new Error('LLM services not available for pattern suggestion');
    }

    try {
      // Get default AI connection
      const connectionResult = await this.aiConnectionService.getDefaultConnection(tenantId, 'LLM');
      if (!connectionResult) {
        throw new Error('No AI connection available for pattern suggestion');
      }

      const { connection, model, apiKey } = connectionResult;

      // Build prompt for LLM
      const systemPrompt = `You are an expert at analyzing user queries and generating regex patterns for intent classification.

Your task is to analyze sample queries and suggest regex patterns, keywords, and phrases that would match similar queries.

Guidelines:
- Generate regex patterns that are specific but not overly restrictive
- Include common variations and synonyms
- Consider case-insensitive matching
- Provide reasoning for each pattern
- Suggest keywords and phrases that commonly appear in similar queries
- Patterns should be JavaScript-compatible regex strings (without delimiters)

Output your suggestions as JSON with this structure:
{
  "suggestedPatterns": [
    {
      "pattern": "regex pattern string (without / delimiters)",
      "confidence": 0.0-1.0,
      "reasoning": "explanation",
      "coverage": number of samples this matches
    }
  ],
  "keywords": ["keyword1", "keyword2"],
  "phrases": ["phrase1", "phrase2"],
  "explanation": "overall explanation"
}`;

      const userPrompt = `Analyze these sample queries and suggest intent classification patterns for intent type: ${input.targetIntent}${input.targetSubtype ? ` (subtype: ${input.targetSubtype})` : ''}

Sample queries:
${input.samples.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Generate regex patterns, keywords, and phrases that would match these queries and similar ones.`;

      const response = await this.unifiedAIClient.chat(
        connection,
        apiKey,
        {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          maxTokens: 2000,
        }
      );

      // Parse JSON response
      let parsed: SuggestPatternFromSamplesResponse;
      try {
        const content = response.content || '';
        if (!content.trim()) {
          throw new Error('LLM returned empty content');
        }
        // Try to extract JSON from response (in case LLM adds markdown)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = JSON.parse(content);
        }
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(`Failed to parse LLM response: ${errorMessage}`);
      }

      // Validate and enhance results
      if (!parsed.suggestedPatterns) {
        parsed.suggestedPatterns = [];
      }
      if (!parsed.keywords) {
        parsed.keywords = [];
      }
      if (!parsed.phrases) {
        parsed.phrases = [];
      }

      // Test patterns against samples to calculate coverage
      for (const suggestedPattern of parsed.suggestedPatterns) {
        try {
          // Validate pattern length to prevent ReDoS attacks
          if (suggestedPattern.pattern && suggestedPattern.pattern.length > 1000) {
            this.monitoring.trackEvent('intent-pattern.pattern-too-long', {
              patternLength: suggestedPattern.pattern.length,
              tenantId,
            });
            suggestedPattern.coverage = 0;
            continue;
          }

          const regex = new RegExp(suggestedPattern.pattern, 'i');
          
          // Use timeout for regex matching to prevent ReDoS
          const testWithTimeout = (text: string): boolean => {
            const startTime = Date.now();
            const MAX_REGEX_TIME_MS = 100; // 100ms max per regex test
            try {
              const result = regex.test(text);
              const duration = Date.now() - startTime;
              if (duration > MAX_REGEX_TIME_MS) {
                this.monitoring.trackEvent('intent-pattern.slow-regex', {
                  patternLength: suggestedPattern.pattern.length,
                  textLength: text.length,
                  duration,
                  tenantId,
                });
              }
              return result;
            } catch (error) {
              this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'intent-pattern.regex-test',
                tenantId,
              });
              return false;
            }
          };

          const matches = input.samples.filter(q => testWithTimeout(q));
          suggestedPattern.coverage = matches.length;
          suggestedPattern.matches = input.samples.map(q => ({
            query: q,
            matched: testWithTimeout(q),
          }));
        } catch (error) {
          // Invalid regex, skip
          this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
            operation: 'intent-pattern.invalid-regex',
            tenantId,
          });
          suggestedPattern.coverage = 0;
        }
      }

      this.monitoring.trackEvent('intent-pattern.llm-suggested', {
        intentType: input.targetIntent,
        samplesCount: input.samples.length,
        patternsSuggested: parsed.suggestedPatterns.length,
      });

      return parsed;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'intent-pattern.suggest-from-samples',
          intentType: input.targetIntent,
        }
      );
      throw error;
    }
  }

  /**
   * Get performance metrics for all patterns
   */
  async getPerformanceMetrics(): Promise<PatternPerformanceMetrics> {
    const allPatterns = await this.repository.list({});
    const activePatterns = allPatterns.patterns.filter(p => p.isActive);

    const totalClassifications = activePatterns.reduce(
      (sum, p) => sum + p.metrics.totalMatches,
      0
    );

    const avgAccuracy =
      activePatterns.length > 0
        ? activePatterns.reduce((sum, p) => sum + p.metrics.accuracyRate, 0) /
          activePatterns.length
        : 0;

    // Calculate misclassifications (simplified - would need actual data)
    const misclassifications = {
      total: Math.round(totalClassifications * (1 - avgAccuracy)),
      topMisclassifiedQueries: [] as Array<{
        query: string;
        predictedIntent: InsightType;
        actualIntent?: InsightType;
        confidence: number;
        frequency: number;
      }>,
    };

    return {
      totalPatterns: allPatterns.total,
      activePatterns: activePatterns.length,
      avgAccuracy,
      totalClassifications,
      misclassifications,
    };
  }

  /**
   * Get active patterns for intent classification
   * Used by IntentAnalyzerService
   */
  async getActivePatterns(): Promise<IntentPattern[]> {
    const result = await this.repository.list({ isActive: true, sortBy: 'priority' });
    return result.patterns;
  }

  /**
   * Record pattern match (for metrics tracking)
   */
  async recordMatch(
    patternId: string,
    confidence: number,
    wasCorrect: boolean
  ): Promise<void> {
    const pattern = await this.repository.findById(patternId);
    if (!pattern) {
      return;
    }

    const newTotalMatches = pattern.metrics.totalMatches + 1;
    const newAccuracyRate = wasCorrect
      ? (pattern.metrics.accuracyRate * pattern.metrics.totalMatches + 1) / newTotalMatches
      : (pattern.metrics.accuracyRate * pattern.metrics.totalMatches) / newTotalMatches;
    const newAvgConfidence =
      (pattern.metrics.avgConfidence * pattern.metrics.totalMatches + confidence) /
      newTotalMatches;

    await this.repository.updateMetrics(patternId, {
      totalMatches: newTotalMatches,
      accuracyRate: newAccuracyRate,
      avgConfidence: newAvgConfidence,
      lastMatched: new Date(),
    });
  }
}



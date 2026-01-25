/**
 * Conversation Summarization Service
 * Summarizes conversations to manage token limits
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { ConversationMessage } from '../types/conversation.types';

export interface SummarizationRequest {
  messages: ConversationMessage[];
  preservePinnedMessages?: boolean;
  preserveRecentMessages?: number;
  includeDecisions?: boolean;
  includeFacts?: boolean;
  includeActionItems?: boolean;
  maxSummaryTokens?: number;
}

export interface ConversationSummary {
  id: string;
  tenantId: string;
  conversationId: string;
  summary: string;
  keyDecisions: string[];
  keyFacts: string[];
  topics: string[];
  entities: string[];
  actionItems: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  messageRange?: {
    startIndex: number;
    endIndex: number;
    messageIds: string[];
  };
  tokenCount: number;
  totalTokensSaved: number;
  originalMessageCount: number;
  createdAt: Date | string;
}

export interface SummarizationResult {
  summary: ConversationSummary;
  messagesToSummarize: ConversationMessage[];
  messagesToKeep: ConversationMessage[];
  totalTokensSaved: number;
}

export class ConversationSummarizationService {
  private config: ReturnType<typeof loadConfig>;
  private aiServiceClient: ServiceClient;
  private app: FastifyInstance | null = null;
  private readonly DEFAULT_PRESERVE_RECENT = 10;
  private readonly DEFAULT_MAX_SUMMARY_TOKENS = 500;
  private readonly DEFAULT_PRESERVE_PINNED = true;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    
    this.aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 60000,
      retries: 2,
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
   * Summarize conversation with intelligent message separation
   */
  async summarizeConversation(
    tenantId: string,
    conversationId: string,
    request: SummarizationRequest
  ): Promise<SummarizationResult> {
    const startTime = Date.now();

    try {
      log.info('Summarizing conversation', {
        tenantId,
        conversationId,
        messageCount: request.messages.length,
        service: 'ai-conversation',
      });

      const preserveRecent = request.preserveRecentMessages ?? this.DEFAULT_PRESERVE_RECENT;
      const preservePinned = request.preservePinnedMessages ?? this.DEFAULT_PRESERVE_PINNED;
      const maxSummaryTokens = request.maxSummaryTokens ?? this.DEFAULT_MAX_SUMMARY_TOKENS;

      // Separate messages into those to keep and those to summarize
      const { messagesToKeep, messagesToSummarize } = this.separateMessages(
        request.messages,
        preserveRecent,
        preservePinned
      );

      if (messagesToSummarize.length === 0) {
        return {
          summary: {
            id: conversationId + '_summary',
            tenantId,
            conversationId,
            summary: '',
            keyDecisions: [],
            keyFacts: [],
            topics: [],
            entities: [],
            actionItems: [],
            sentiment: 'neutral',
            messageRange: {
              startIndex: 0,
              endIndex: 0,
              messageIds: [],
            },
            tokenCount: 0,
            totalTokensSaved: 0,
            originalMessageCount: request.messages.length,
            createdAt: new Date(),
          },
          messagesToSummarize: [],
          messagesToKeep: request.messages,
          totalTokensSaved: 0,
        };
      }

      // Generate summary using AI if available, otherwise use rule-based
      let summary: ConversationSummary;
      if (messagesToSummarize.length > 5) {
        // Use AI for better quality when we have enough messages
        summary = await this.generateAISummary(tenantId, conversationId, messagesToSummarize, request);
      } else {
        // Use rule-based summarization for small sets
        summary = this.generateRuleBasedSummary(tenantId, conversationId, messagesToSummarize, request);
      }

      // Calculate token savings
      const originalTokens = this.estimateTokens(messagesToSummarize);
      const tokensSaved = originalTokens - summary.tokenCount;

      log.info('Conversation summarized', {
        tenantId,
        conversationId,
        messageCount: messagesToSummarize.length,
        keptCount: messagesToKeep.length,
        summaryTokens: summary.tokenCount,
        originalTokens,
        tokensSaved,
        durationMs: Date.now() - startTime,
        service: 'ai-conversation',
      });

      return {
        summary,
        messagesToSummarize,
        messagesToKeep,
        totalTokensSaved: tokensSaved,
      };
    } catch (error: any) {
      log.error('Failed to summarize conversation', error, {
        tenantId,
        conversationId,
        service: 'ai-conversation',
      });
      throw error;
    }
  }

  /**
   * Separate messages into those to keep and those to summarize
   */
  private separateMessages(
    messages: ConversationMessage[],
    preserveRecent: number,
    preservePinned: boolean
  ): {
    messagesToKeep: ConversationMessage[];
    messagesToSummarize: ConversationMessage[];
  } {
    const messagesToKeep: ConversationMessage[] = [];
    const messagesToSummarize: ConversationMessage[] = [];

    // Sort messages by creation time (oldest first)
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );

    // Keep recent messages
    const recentMessages = sortedMessages.slice(-preserveRecent);
    const olderMessages = sortedMessages.slice(0, -preserveRecent);

    // Process older messages
    for (const message of olderMessages) {
      if (preservePinned && (message as any).pinned) {
        messagesToKeep.push(message);
      } else {
        messagesToSummarize.push(message);
      }
    }

    // Always keep recent messages
    messagesToKeep.push(...recentMessages);

    return {
      messagesToKeep: messagesToKeep.sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      ),
      messagesToSummarize: messagesToSummarize.sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      ),
    };
  }

  /**
   * Generate AI-powered summary
   */
  private async generateAISummary(
    tenantId: string,
    conversationId: string,
    messages: ConversationMessage[],
    request: SummarizationRequest
  ): Promise<ConversationSummary> {
    try {
      const token = this.getServiceToken(tenantId);

      const messagesText = messages
        .map((m, idx) => {
          const role = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System';
          return `[${idx + 1}] ${role}: ${m.content}`;
        })
        .join('\n\n');

      const includeDecisions = request.includeDecisions !== false;
      const includeFacts = request.includeFacts !== false;
      const includeActionItems = request.includeActionItems !== false;

      const prompt = `Summarize the following conversation. Extract and preserve:
${includeDecisions ? '- Key decisions made\n' : ''}${includeFacts ? '- Important facts established\n' : ''}${includeActionItems ? '- Action items identified\n' : ''}- Main topics discussed
- Important entities mentioned
- Overall sentiment

Conversation:
${messagesText}

Provide a JSON response with:
{
  "summary": "High-level summary (2-3 sentences)",
  "keyDecisions": ["decision1", "decision2", ...],
  "keyFacts": ["fact1", "fact2", ...],
  "topics": ["topic1", "topic2", ...],
  "entities": ["entity1", "entity2", ...],
  "actionItems": ["action1", "action2", ...],
  "sentiment": "positive" | "neutral" | "negative"
}`;

      const response = await this.aiServiceClient.post<any>(
        '/api/ai/completions',
        {
          messages: [
            {
              role: 'system',
              content:
                'You are a conversation summarization expert. Extract key information while preserving important details. Return only valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          maxTokens: request.maxSummaryTokens || this.DEFAULT_MAX_SUMMARY_TOKENS,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      // Parse JSON response
      let parsed: any;
      try {
        const content =
          response.choices?.[0]?.message?.content ||
          response.completion ||
          response.text ||
          '';
        const cleanedContent = content.trim();
        // Try to extract JSON from markdown code blocks if present
        const jsonMatch = cleanedContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          parsed = JSON.parse(cleanedContent);
        }
      } catch (parseError) {
        log.warn('Failed to parse AI summary response, using rule-based fallback', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          tenantId,
          service: 'ai-conversation',
        });
        return this.generateRuleBasedSummary(tenantId, conversationId, messages, request);
      }

      const summaryText = parsed.summary || 'No summary generated';
      const summaryTokens = this.estimateTokens(summaryText);

      return {
        id: conversationId + '_summary',
        tenantId,
        conversationId,
        summary: summaryText,
        keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [],
        keyFacts: Array.isArray(parsed.keyFacts) ? parsed.keyFacts : [],
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment)
          ? parsed.sentiment
          : 'neutral',
        messageRange: {
          startIndex: 0,
          endIndex: messages.length - 1,
          messageIds: messages.map((m) => m.id || ''),
        },
        tokenCount: summaryTokens,
        totalTokensSaved: 0, // Will be calculated by caller
        originalMessageCount: messages.length,
        createdAt: new Date(),
      };
    } catch (error: any) {
      log.warn('AI summary generation failed, using rule-based fallback', {
        error: error.message,
        tenantId,
        service: 'ai-conversation',
      });
      return this.generateRuleBasedSummary(tenantId, conversationId, messages, request);
    }
  }

  /**
   * Generate rule-based summary (fallback when AI is unavailable)
   */
  private generateRuleBasedSummary(
    tenantId: string,
    conversationId: string,
    messages: ConversationMessage[],
    request: SummarizationRequest
  ): ConversationSummary {
    const userMessages = messages.filter((m) => m.role === 'user');
    const assistantMessages = messages.filter((m) => m.role === 'assistant');

    // Extract topics
    const topics = this.extractTopics(messages);

    // Extract entities
    const entities = this.extractEntities(messages);

    // Simple sentiment analysis
    const sentiment = this.analyzeSentiment(messages);

    // Build summary
    const summary =
      `Conversation with ${userMessages.length} user messages and ${assistantMessages.length} assistant responses. ` +
      `Topics discussed: ${topics.slice(0, 3).join(', ')}.`;

    // Extract key facts
    const keyFacts: string[] = [];
    for (const msg of assistantMessages) {
      if (msg.content.length > 50 && msg.content.length < 500) {
        keyFacts.push(msg.content.substring(0, 200));
      }
      if (keyFacts.length >= 5) break;
    }

    // Extract decisions and action items
    const keyDecisions = request.includeDecisions
      ? this.extractDecisionsPattern(messages)
      : [];
    const actionItems = request.includeActionItems
      ? this.extractActionItemsPattern(messages)
      : [];

    const summaryTokens = this.estimateTokens(summary);

    return {
      id: conversationId + '_summary',
      tenantId,
      conversationId,
      summary,
      keyDecisions: keyDecisions.slice(0, 5),
      keyFacts: keyFacts.slice(0, 5),
      topics: topics.slice(0, 5),
      entities: entities.slice(0, 10),
      actionItems: actionItems.slice(0, 5),
      sentiment,
      messageRange: {
        startIndex: 0,
        endIndex: messages.length - 1,
        messageIds: messages.map((m) => m.id || ''),
      },
      tokenCount: summaryTokens,
      totalTokensSaved: 0, // Will be calculated by caller
      originalMessageCount: messages.length,
      createdAt: new Date(),
    };
  }

  /**
   * Extract topics from messages
   */
  private extractTopics(messages: ConversationMessage[]): string[] {
    const topicKeywords = new Map<string, number>();
    const commonWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'can',
    ]);

    for (const message of messages) {
      const words = message.content
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 4 && !commonWords.has(w));

      for (const word of words) {
        topicKeywords.set(word, (topicKeywords.get(word) || 0) + 1);
      }
    }

    // Return top topics by frequency
    return Array.from(topicKeywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Extract entities from messages
   */
  private extractEntities(messages: ConversationMessage[]): string[] {
    const entities = new Set<string>();

    for (const message of messages) {
      // Match potential entity patterns
      const entityPatterns = [
        /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, // Capitalized names
        /\b[a-z]+-[a-z]+-[a-z]+\b/g, // Kebab-case IDs
        /\b[a-z]+_[a-z]+_[a-z]+\b/g, // Snake_case IDs
      ];

      for (const pattern of entityPatterns) {
        const matches = message.content.match(pattern);
        if (matches) {
          for (const match of matches) {
            if (match.length > 3) {
              entities.add(match);
            }
          }
        }
      }
    }

    return Array.from(entities).slice(0, 20);
  }

  /**
   * Analyze sentiment
   */
  private analyzeSentiment(messages: ConversationMessage[]): 'positive' | 'neutral' | 'negative' {
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'perfect',
      'awesome',
      'thanks',
      'thank you',
      'helpful',
      'yes',
      'agree',
    ];
    const negativeWords = [
      'bad',
      'wrong',
      'error',
      'failed',
      'problem',
      'issue',
      'no',
      'disagree',
      'unhappy',
      'disappointed',
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const message of messages) {
      const content = message.content.toLowerCase();
      for (const word of positiveWords) {
        if (content.includes(word)) positiveCount++;
      }
      for (const word of negativeWords) {
        if (content.includes(word)) negativeCount++;
      }
    }

    if (positiveCount > negativeCount * 1.5) return 'positive';
    if (negativeCount > positiveCount * 1.5) return 'negative';
    return 'neutral';
  }

  /**
   * Extract decisions using pattern matching
   */
  private extractDecisionsPattern(messages: ConversationMessage[]): string[] {
    const decisions: string[] = [];
    const decisionKeywords = [
      'decided',
      'decision',
      'choose',
      'selected',
      'will do',
      'going to',
      'plan to',
    ];

    for (const message of messages) {
      const content = message.content.toLowerCase();
      for (const keyword of decisionKeywords) {
        if (content.includes(keyword)) {
          const sentences = message.content.split(/[.!?]+/);
          const decisionSentence = sentences.find((s) => s.toLowerCase().includes(keyword));
          if (decisionSentence && decisionSentence.trim().length > 10) {
            decisions.push(decisionSentence.trim());
          }
        }
      }
    }

    return decisions.slice(0, 5);
  }

  /**
   * Extract action items using pattern matching
   */
  private extractActionItemsPattern(messages: ConversationMessage[]): string[] {
    const actionItems: string[] = [];
    const actionPatterns = [
      /(?:need to|should|must|will|going to)\s+([^.!?]+)/gi,
      /(?:action|task|todo|do|implement|create|add|fix|update|change)\s*:?\s*([^.!?]+)/gi,
    ];

    for (const message of messages) {
      for (const pattern of actionPatterns) {
        const matches = message.content.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && match[1].trim().length > 10) {
            actionItems.push(match[1].trim());
          }
        }
      }
    }

    return actionItems.slice(0, 10);
  }


  /**
   * Estimate token count
   */
  private estimateTokens(text: string | ConversationMessage[]): number {
    if (Array.isArray(text)) {
      return text.reduce((sum, m) => sum + Math.ceil((m.content?.length || 0) / 4), 0);
    }
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

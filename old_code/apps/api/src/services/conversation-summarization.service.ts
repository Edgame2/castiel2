/**
 * Conversation Summarization Service
 * Phase 5.1: Conversation Context Management
 * 
 * Provides intelligent conversation summarization that:
 * - Preserves key decisions and facts
 * - Removes redundant information
 * - Maintains conversation coherence
 * - Supports sliding window context strategy
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import type { ConversationMessage } from '../types/conversation.types.js';
import type { UnifiedAIClient } from './ai/unified-ai-client.service.js';

export interface ConversationSummary {
  summary: string;                      // High-level summary of the conversation
  keyDecisions: string[];              // Important decisions made
  keyFacts: string[];                  // Important facts established
  topics: string[];                    // Main topics discussed
  entities: string[];                  // Important entities mentioned
  actionItems: string[];               // Action items identified
  sentiment: 'positive' | 'neutral' | 'negative';
  messageRange: {                      // Which messages this summary covers
    startIndex: number;
    endIndex: number;
    messageIds: string[];
  };
  createdAt: Date;
  tokenCount: number;                  // Estimated tokens in summary
}

export interface SummarizationOptions {
  preservePinnedMessages?: boolean;     // Always include pinned messages (default: true)
  preserveRecentMessages?: number;      // Number of recent messages to keep in full (default: 10)
  maxSummaryTokens?: number;            // Maximum tokens for summary (default: 500)
  includeDecisions?: boolean;           // Extract key decisions (default: true)
  includeFacts?: boolean;               // Extract key facts (default: true)
  includeActionItems?: boolean;         // Extract action items (default: true)
}

export interface SummarizationResult {
  summary: ConversationSummary;
  messagesToSummarize: ConversationMessage[];  // Messages that were summarized
  messagesToKeep: ConversationMessage[];      // Messages kept in full
  totalTokensSaved: number;                    // Estimated tokens saved
}

export class ConversationSummarizationService {
  private readonly DEFAULT_PRESERVE_RECENT = 10;
  private readonly DEFAULT_MAX_SUMMARY_TOKENS = 500;
  private readonly DEFAULT_PRESERVE_PINNED = true;

  constructor(
    private monitoring: IMonitoringProvider,
    private unifiedAIClient?: UnifiedAIClient
  ) {}

  /**
   * Generate intelligent summary of conversation messages
   * Preserves key decisions, facts, and maintains coherence
   */
  async summarizeConversation(
    messages: ConversationMessage[],
    options: SummarizationOptions = {}
  ): Promise<SummarizationResult> {
    const startTime = Date.now();
    
    const preserveRecent = options.preserveRecentMessages ?? this.DEFAULT_PRESERVE_RECENT;
    const preservePinned = options.preservePinnedMessages ?? this.DEFAULT_PRESERVE_PINNED;
    const maxSummaryTokens = options.maxSummaryTokens ?? this.DEFAULT_MAX_SUMMARY_TOKENS;

    // Separate messages into those to keep and those to summarize
    const { messagesToKeep, messagesToSummarize } = this.separateMessages(
      messages,
      preserveRecent,
      preservePinned
    );

    if (messagesToSummarize.length === 0) {
      // Nothing to summarize
      return {
        summary: {
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
          createdAt: new Date(),
          tokenCount: 0,
        },
        messagesToSummarize: [],
        messagesToKeep: messages,
        totalTokensSaved: 0,
      };
    }

    // Generate summary using AI if available, otherwise use rule-based summarization
    let summary: ConversationSummary;
    if (this.unifiedAIClient && messagesToSummarize.length > 5) {
      // Use AI for better quality when we have enough messages
      summary = await this.generateAISummary(messagesToSummarize, options);
    } else {
      // Use rule-based summarization for small sets or when AI is unavailable
      summary = this.generateRuleBasedSummary(messagesToSummarize, options);
    }

    // Calculate tokens saved
    const originalTokens = this.estimateTokens(messagesToSummarize);
    const summaryTokens = summary.tokenCount;
    const tokensSaved = originalTokens - summaryTokens;

    this.monitoring.trackEvent('conversation.summarized', {
      messageCount: messagesToSummarize.length,
      keptCount: messagesToKeep.length,
      summaryTokens,
      originalTokens,
      tokensSaved,
      durationMs: Date.now() - startTime,
      method: this.unifiedAIClient ? 'ai' : 'rule-based',
    });

    return {
      summary,
      messagesToSummarize,
      messagesToKeep,
      totalTokensSaved: tokensSaved,
    };
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
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    // Keep recent messages
    const recentMessages = sortedMessages.slice(-preserveRecent);
    const olderMessages = sortedMessages.slice(0, -preserveRecent);

    // Process older messages
    for (const message of olderMessages) {
      if (preservePinned && message.pinned) {
        messagesToKeep.push(message);
      } else {
        messagesToSummarize.push(message);
      }
    }

    // Always keep recent messages
    messagesToKeep.push(...recentMessages);

    return {
      messagesToKeep: messagesToKeep.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      ),
      messagesToSummarize: messagesToSummarize.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      ),
    };
  }

  /**
   * Generate AI-powered summary
   */
  private async generateAISummary(
    messages: ConversationMessage[],
    options: SummarizationOptions
  ): Promise<ConversationSummary> {
    if (!this.unifiedAIClient) {
      throw new Error('UnifiedAIClient not available for AI summarization');
    }

    // Build prompt for summarization
    const messagesText = messages
      .map((m, idx) => {
        const role = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System';
        return `[${idx + 1}] ${role}: ${m.content}`;
      })
      .join('\n\n');

    const includeDecisions = options.includeDecisions !== false;
    const includeFacts = options.includeFacts !== false;
    const includeActionItems = options.includeActionItems !== false;

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

    try {
      // UnifiedAIClient uses chat method, not generate
      // This needs to be refactored to use chat() with proper connection
      const response = await (this.unifiedAIClient as any).chat?.({
        messages: [
          {
            role: 'system',
            content: 'You are a conversation summarization expert. Extract key information while preserving important details.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent summaries
        maxTokens: options.maxSummaryTokens ?? this.DEFAULT_MAX_SUMMARY_TOKENS,
      });

      // Parse JSON response
      let parsed: any;
      try {
        const content = response.content.trim();
        // Try to extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          parsed = JSON.parse(content);
        }
      } catch (parseError) {
        // Fallback to rule-based if parsing fails
        this.monitoring.trackException(parseError as Error, {
          operation: 'conversation-summarization.parseAIResponse',
        });
        return this.generateRuleBasedSummary(messages, options);
      }

      return {
        summary: parsed.summary || 'No summary generated',
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
          messageIds: messages.map(m => m.id),
        },
        createdAt: new Date(),
        tokenCount: this.estimateTokens(parsed.summary || ''),
      };
    } catch (error) {
      // Fallback to rule-based if AI fails
      this.monitoring.trackException(error as Error, {
        operation: 'conversation-summarization.generateAISummary',
      });
      return this.generateRuleBasedSummary(messages, options);
    }
  }

  /**
   * Generate rule-based summary (fallback when AI is unavailable)
   */
  private generateRuleBasedSummary(
    messages: ConversationMessage[],
    options: SummarizationOptions
  ): ConversationSummary {
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    // Extract topics from message content
    const topics = this.extractTopics(messages);
    
    // Extract entities (simple pattern matching)
    const entities = this.extractEntities(messages);

    // Simple sentiment analysis (keyword-based)
    const sentiment = this.analyzeSentiment(messages);

    // Build summary
    const summary = `Conversation with ${userMessages.length} user messages and ${assistantMessages.length} assistant responses. ` +
      `Topics discussed: ${topics.slice(0, 3).join(', ')}.`;

    // Extract key facts (from assistant messages with high confidence)
    const keyFacts: string[] = [];
    for (const msg of assistantMessages) {
      if (msg.content.length > 50 && msg.content.length < 500) {
        // Medium-length messages often contain facts
        keyFacts.push(msg.content.substring(0, 200));
      }
      if (keyFacts.length >= 5) break; // Limit to 5 facts
    }

    // Extract action items (look for imperative language)
    const actionItems = this.extractActionItems(messages);

    return {
      summary,
      keyDecisions: [], // Rule-based can't reliably extract decisions
      keyFacts: keyFacts.slice(0, 5),
      topics: topics.slice(0, 5),
      entities: entities.slice(0, 10),
      actionItems: actionItems.slice(0, 5),
      sentiment,
      messageRange: {
        startIndex: 0,
        endIndex: messages.length - 1,
        messageIds: messages.map(m => m.id),
      },
      createdAt: new Date(),
      tokenCount: this.estimateTokens(summary),
    };
  }

  /**
   * Extract topics from messages (simple keyword extraction)
   */
  private extractTopics(messages: ConversationMessage[]): string[] {
    const topicKeywords = new Map<string, number>();
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can']);

    for (const message of messages) {
      const words = message.content
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 4 && !commonWords.has(w));

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
   * Extract entities (simple pattern matching for names, IDs, etc.)
   */
  private extractEntities(messages: ConversationMessage[]): string[] {
    const entities = new Set<string>();

    for (const message of messages) {
      // Match potential entity patterns (capitalized words, IDs, etc.)
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
   * Analyze sentiment (simple keyword-based)
   */
  private analyzeSentiment(messages: ConversationMessage[]): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['good', 'great', 'excellent', 'perfect', 'awesome', 'thanks', 'thank you', 'helpful', 'yes', 'agree'];
    const negativeWords = ['bad', 'wrong', 'error', 'failed', 'problem', 'issue', 'no', 'disagree', 'unhappy', 'disappointed'];

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
   * Extract action items (look for imperative language)
   */
  private extractActionItems(messages: ConversationMessage[]): string[] {
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
   * Estimate token count for text
   */
  private estimateTokens(text: string | ConversationMessage[]): number {
    if (Array.isArray(text)) {
      return text.reduce((sum, msg) => sum + this.estimateTokens(msg.content), 0);
    }
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

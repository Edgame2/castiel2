/**
 * Conversation Context Retrieval Service
 * Phase 5.1: Conversation Context Management
 * 
 * Provides smart context retrieval to:
 * - Find similar past conversations
 * - Bring forward related decisions and facts
 * - Avoid repeating resolved topics
 * - Retrieve relevant context from conversation history
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import type { ConversationService } from './conversation.service.js';
import type { MemoryContextService } from './memory-context.service.js';
import type { IVectorSearchProvider } from './insight.service.js';
import type { Shard } from '../types/shard.types.js';
import type { ConversationMemory } from './memory-context.service.js';

export interface SimilarConversation {
  conversationId: string;
  title: string;
  summary?: string;
  similarityScore: number;
  keyDecisions?: string[];
  keyFacts?: string[];
  topics?: string[];
  createdAt: Date;
  lastActivityAt?: Date;
  relevanceReason: string; // Why this conversation is relevant
}

export interface ContextRetrievalOptions {
  maxResults?: number; // Maximum number of similar conversations to return (default: 5)
  minSimilarityScore?: number; // Minimum similarity score threshold (default: 0.6)
  includeDecisions?: boolean; // Include key decisions from past conversations (default: true)
  includeFacts?: boolean; // Include key facts from past conversations (default: true)
  excludeResolved?: boolean; // Exclude conversations marked as resolved (default: true)
  projectId?: string; // Filter by project ID if provided
  maxAgeDays?: number; // Maximum age of conversations to consider (default: 90)
}

export interface ContextRetrievalResult {
  similarConversations: SimilarConversation[];
  relevantDecisions: string[]; // Aggregated key decisions from similar conversations
  relevantFacts: string[]; // Aggregated key facts from similar conversations
  resolvedTopics: string[]; // Topics that were resolved in past conversations
  totalConversationsSearched: number;
}

export class ConversationContextRetrievalService {
  private readonly DEFAULT_MAX_RESULTS = 5;
  private readonly DEFAULT_MIN_SIMILARITY = 0.6;
  private readonly DEFAULT_MAX_AGE_DAYS = 90;

  constructor(
    private monitoring: IMonitoringProvider,
    private conversationService: ConversationService,
    private memoryContextService?: MemoryContextService,
    private vectorSearch?: IVectorSearchProvider
  ) {}

  /**
   * Find similar past conversations and retrieve relevant context
   */
  async retrieveRelevantContext(
    tenantId: string,
    userId: string,
    query: string,
    currentConversationId?: string,
    options: ContextRetrievalOptions = {}
  ): Promise<ContextRetrievalResult> {
    const startTime = Date.now();
    const maxResults = options.maxResults ?? this.DEFAULT_MAX_RESULTS;
    const minSimilarity = options.minSimilarityScore ?? this.DEFAULT_MIN_SIMILARITY;
    const maxAgeDays = options.maxAgeDays ?? this.DEFAULT_MAX_AGE_DAYS;

    const similarConversations: SimilarConversation[] = [];
    const relevantDecisions: string[] = [];
    const relevantFacts: string[] = [];
    const resolvedTopics: string[] = [];

    try {
      // 1. Get user's past conversations
      const pastConversations = await this.getPastConversations(
        tenantId,
        userId,
        currentConversationId,
        maxAgeDays,
        options.projectId
      );

      if (pastConversations.length === 0) {
        return {
          similarConversations: [],
          relevantDecisions: [],
          relevantFacts: [],
          resolvedTopics: [],
          totalConversationsSearched: 0,
        };
      }

      // 2. Find similar conversations using multiple strategies
      const similarityResults = await this.findSimilarConversations(
        tenantId,
        query,
        pastConversations,
        minSimilarity
      );

      // 3. Process similar conversations and extract context
      for (const result of similarityResults.slice(0, maxResults)) {
        const conversation = result.conversation;
        const data = conversation.structuredData as any;

        // Get conversation memory if available
        let memory: ConversationMemory | null = null;
        if (this.memoryContextService) {
          try {
            memory = await this.memoryContextService.getConversationMemory(
              conversation.id,
              tenantId
            );
          } catch (error) {
            // Non-blocking: continue without memory
          }
        }

        const similarConv: SimilarConversation = {
          conversationId: conversation.id,
          title: data.title || 'Untitled Conversation',
          summary: data.summary || memory?.summary,
          similarityScore: result.similarity,
          keyDecisions: memory?.decisions || (data.summaryData?.keyDecisions as string[]),
          keyFacts: memory?.keyPoints || (data.summaryData?.keyFacts as string[]),
          topics: memory?.entitiesMentioned || (data.summaryData?.topics as string[]),
          createdAt: new Date(conversation.createdAt),
          lastActivityAt: data.lastActivityAt ? new Date(data.lastActivityAt) : undefined,
          relevanceReason: this.generateRelevanceReason(result.similarity, data, memory),
        };

        similarConversations.push(similarConv);

        // Extract decisions and facts
        if (options.includeDecisions !== false && similarConv.keyDecisions) {
          relevantDecisions.push(...similarConv.keyDecisions);
        }
        if (options.includeFacts !== false && similarConv.keyFacts) {
          relevantFacts.push(...similarConv.keyFacts);
        }

        // Check if conversation was resolved (indicates resolved topics)
        if (options.excludeResolved !== false && data.status === 'resolved') {
          if (similarConv.topics) {
            resolvedTopics.push(...similarConv.topics);
          }
        }
      }

      // Deduplicate decisions and facts
      const uniqueDecisions = Array.from(new Set(relevantDecisions));
      const uniqueFacts = Array.from(new Set(relevantFacts));
      const uniqueResolvedTopics = Array.from(new Set(resolvedTopics));

      this.monitoring.trackEvent('conversation-context.retrieved', {
        tenantId,
        userId,
        queryLength: query.length,
        conversationsSearched: pastConversations.length,
        similarFound: similarConversations.length,
        decisionsFound: uniqueDecisions.length,
        factsFound: uniqueFacts.length,
        resolvedTopicsFound: uniqueResolvedTopics.length,
        durationMs: Date.now() - startTime,
      });

      return {
        similarConversations,
        relevantDecisions: uniqueDecisions.slice(0, 10), // Limit to top 10
        relevantFacts: uniqueFacts.slice(0, 10), // Limit to top 10
        resolvedTopics: uniqueResolvedTopics.slice(0, 10), // Limit to top 10
        totalConversationsSearched: pastConversations.length,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'conversation-context-retrieval.retrieveRelevantContext',
        tenantId,
        userId,
      });

      // Return empty result on error
      return {
        similarConversations: [],
        relevantDecisions: [],
        relevantFacts: [],
        resolvedTopics: [],
        totalConversationsSearched: 0,
      };
    }
  }

  /**
   * Get past conversations for a user
   */
  private async getPastConversations(
    tenantId: string,
    userId: string,
    excludeConversationId?: string,
    maxAgeDays?: number,
    projectId?: string
  ): Promise<Shard[]> {
    try {
      const fromDate = maxAgeDays
        ? new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)
        : undefined;

      const result = await this.conversationService.list(tenantId, userId, {
        limit: 100, // Get up to 100 conversations for similarity search
        fromDate,
        tags: projectId ? [`project:${projectId}`] : undefined,
      });

      // Filter out current conversation if provided
      return result.conversations.filter(
        c => c.id !== excludeConversationId
      );
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'conversation-context-retrieval.getPastConversations',
        tenantId,
        userId,
      });
      return [];
    }
  }

  /**
   * Find similar conversations using multiple strategies
   */
  private async findSimilarConversations(
    tenantId: string,
    query: string,
    conversations: Shard[],
    minSimilarity: number
  ): Promise<Array<{ conversation: Shard; similarity: number; method: string }>> {
    const results: Array<{ conversation: Shard; similarity: number; method: string }> = [];

    // Strategy 1: Semantic similarity using vector search (if available)
    if (this.vectorSearch && conversations.length > 0) {
      try {
        const vectorResults = await this.vectorSearch.search({
          tenantId,
          query,
          topK: Math.min(10, conversations.length),
          minScore: minSimilarity,
          shardTypeIds: ['c_conversation'],
        });

        // Map vector search results to conversations
        for (const result of vectorResults.results) {
          const conversation = conversations.find(c => c.id === result.shardId);
          if (conversation) {
            results.push({
              conversation,
              similarity: result.score,
              method: 'vector-search',
            });
          }
        }
      } catch (error) {
        // Non-blocking: fall through to keyword matching
        this.monitoring.trackException(error as Error, {
          operation: 'conversation-context-retrieval.vectorSearch',
          tenantId,
        });
      }
    }

    // Strategy 2: Keyword-based similarity (fallback or supplement)
    const keywordResults = this.findSimilarByKeywords(query, conversations, minSimilarity);
    
    // Merge results, avoiding duplicates
    const seenIds = new Set(results.map(r => r.conversation.id));
    for (const keywordResult of keywordResults) {
      if (!seenIds.has(keywordResult.conversation.id)) {
        results.push(keywordResult);
      } else {
        // Update existing result if keyword similarity is higher
        const existing = results.find(r => r.conversation.id === keywordResult.conversation.id);
        if (existing && keywordResult.similarity > existing.similarity) {
          existing.similarity = keywordResult.similarity;
          existing.method = 'keyword';
        }
      }
    }

    // Sort by similarity (highest first)
    return results.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Find similar conversations using keyword matching
   */
  private findSimilarByKeywords(
    query: string,
    conversations: Shard[],
    minSimilarity: number
  ): Array<{ conversation: Shard; similarity: number; method: string }> {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower
      .split(/\s+/)
      .filter(term => term.length > 2)
      .slice(0, 10); // Limit to 10 terms

    if (queryTerms.length === 0) {
      return [];
    }

    const results: Array<{ conversation: Shard; similarity: number; method: string }> = [];

    for (const conversation of conversations) {
      const data = conversation.structuredData as any;
      let matchScore = 0;
      let totalTerms = queryTerms.length;

      // Check title
      if (data.title) {
        const titleLower = data.title.toLowerCase();
        for (const term of queryTerms) {
          if (titleLower.includes(term)) {
            matchScore += 2; // Title matches are weighted higher
          }
        }
      }

      // Check summary
      if (data.summary) {
        const summaryLower = data.summary.toLowerCase();
        for (const term of queryTerms) {
          if (summaryLower.includes(term)) {
            matchScore += 1;
          }
        }
      }

      // Check message content (sample first few messages)
      if (data.messages && data.messages.length > 0) {
        const sampleMessages = data.messages.slice(0, 5); // Check first 5 messages
        for (const message of sampleMessages) {
          if (message.content) {
            const contentLower = message.content.toLowerCase();
            for (const term of queryTerms) {
              if (contentLower.includes(term)) {
                matchScore += 0.5; // Message matches are weighted lower
              }
            }
          }
        }
      }

      // Calculate similarity score (0-1)
      const similarity = Math.min(1, matchScore / (totalTerms * 2)); // Normalize by max possible score

      if (similarity >= minSimilarity) {
        results.push({
          conversation,
          similarity,
          method: 'keyword',
        });
      }
    }

    return results;
  }

  /**
   * Generate a human-readable reason for why a conversation is relevant
   */
  private generateRelevanceReason(
    similarity: number,
    data: any,
    memory: ConversationMemory | null
  ): string {
    if (similarity >= 0.9) {
      return 'Highly similar topic and content';
    } else if (similarity >= 0.7) {
      return 'Similar topic discussed';
    } else if (memory?.decisions && memory.decisions.length > 0) {
      return 'Contains relevant decisions';
    } else if (memory?.keyPoints && memory.keyPoints.length > 0) {
      return 'Contains relevant facts';
    } else if (data.summary) {
      return 'Related conversation summary';
    } else {
      return 'Similar keywords found';
    }
  }
}

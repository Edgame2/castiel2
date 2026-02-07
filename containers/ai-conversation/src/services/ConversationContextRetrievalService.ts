/**
 * Conversation Context Retrieval Service
 * Provides smart context retrieval to find similar past conversations
 * and bring forward related decisions and facts
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { ContextAssemblyService } from './ContextAssemblyService.js';
import { ConversationService } from './ConversationService.js';
import {
  ContextRetrievalOptions,
  ContextRetrievalResult,
  SimilarConversation,
} from '../types/conversation-context-retrieval.types.js';

export class ConversationContextRetrievalService {
  private config: ReturnType<typeof loadConfig>;
  private contextAssemblyService: ContextAssemblyService;
  private conversationService: ConversationService;
  private searchServiceClient: ServiceClient;
  private app: FastifyInstance | null = null;
  private readonly DEFAULT_MAX_RESULTS = 5;
  private readonly DEFAULT_MIN_SIMILARITY = 0.6;
  private readonly DEFAULT_MAX_AGE_DAYS = 90;

  constructor(conversationService: ConversationService, app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    this.contextAssemblyService = new ContextAssemblyService(app);
    this.conversationService = conversationService;

    this.searchServiceClient = new ServiceClient({
      baseURL: this.config.services.search_service?.url || '',
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
   * Retrieve context for conversation (basic method)
   */
  async retrieveContext(
    tenantId: string,
    conversationId: string,
    query: string,
    options?: { maxTokens?: number; minRelevance?: number }
  ) {
    try {
      // Get conversation to find linked shards
      const container = getContainer('conversation_conversations');
      const { resource: conversation } = await container.item(conversationId, tenantId).read();

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Extract linked shard IDs from conversation metadata
      const linkedShardIds =
        conversation.linkedShardIds || conversation.metadata?.linkedShardIds || [];

      // Assemble context using context assembly service
      const context = await this.contextAssemblyService.assembleContext(tenantId, {
        query,
        shardIds: linkedShardIds,
        maxTokens: options?.maxTokens,
        minRelevance: options?.minRelevance,
      });

      return context;
    } catch (error: any) {
      log.error('Failed to retrieve conversation context', error, {
        tenantId,
        conversationId,
        service: 'ai-conversation',
      });
      throw error;
    }
  }

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

        const similarConv: SimilarConversation = {
          conversationId: conversation.id,
          title: data.title || 'Untitled Conversation',
          summary: data.summary || data.summaryData?.summary,
          similarityScore: result.similarity,
          keyDecisions: data.summaryData?.keyDecisions || [],
          keyFacts: data.summaryData?.keyFacts || [],
          topics: data.summaryData?.topics || [],
          createdAt: new Date(conversation.createdAt),
          lastActivityAt: data.lastActivityAt ? new Date(data.lastActivityAt) : undefined,
          relevanceReason: this.generateRelevanceReason(result.similarity, data),
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

      log.info('Conversation context retrieved', {
        tenantId,
        userId,
        queryLength: query.length,
        conversationsSearched: pastConversations.length,
        similarFound: similarConversations.length,
        decisionsFound: uniqueDecisions.length,
        factsFound: uniqueFacts.length,
        resolvedTopicsFound: uniqueResolvedTopics.length,
        durationMs: Date.now() - startTime,
        service: 'ai-conversation',
      });

      return {
        similarConversations,
        relevantDecisions: uniqueDecisions.slice(0, 10),
        relevantFacts: uniqueFacts.slice(0, 10),
        resolvedTopics: uniqueResolvedTopics.slice(0, 10),
        totalConversationsSearched: pastConversations.length,
      };
    } catch (error: any) {
      log.error('Failed to retrieve relevant context', error, {
        tenantId,
        userId,
        service: 'ai-conversation',
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
  ): Promise<any[]> {
    try {
      const fromDate = maxAgeDays
        ? new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)
        : undefined;

      const result = await this.conversationService.listConversations(tenantId, userId, {
        limit: 100,
        status: 'active',
      });

      // Filter by date and exclude current conversation
      let conversations = result.conversations || [];
      if (excludeConversationId) {
        conversations = conversations.filter((c) => c.id !== excludeConversationId);
      }
      if (fromDate) {
        conversations = conversations.filter(
          (c) => new Date(c.createdAt) >= fromDate
        );
      }

      return conversations;
    } catch (error: any) {
      log.warn('Failed to get past conversations', {
        error: error.message,
        tenantId,
        userId,
        service: 'ai-conversation',
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
    conversations: any[],
    minSimilarity: number
  ): Promise<Array<{ conversation: any; similarity: number; method: string }>> {
    const results: Array<{ conversation: any; similarity: number; method: string }> = [];

    // Strategy 1: Semantic similarity using search service (if available)
    if (conversations.length > 0) {
      try {
        const token = this.getServiceToken(tenantId);
        const searchResponse = await this.searchServiceClient.post<any>(
          '/api/v1/search/vector',
          {
            query,
            topK: Math.min(10, conversations.length),
            minScore: minSimilarity,
            shardTypeIds: ['c_conversation'],
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          }
        );

        // Map search results to conversations
        const searchResults = searchResponse.results || searchResponse.data || [];
        for (const result of searchResults) {
          const conversation = conversations.find((c) => c.id === result.shardId || c.id === result.id);
          if (conversation && result.score >= minSimilarity) {
            results.push({
              conversation,
              similarity: result.score,
              method: 'vector-search',
            });
          }
        }
      } catch (error: any) {
        log.warn('Vector search failed, using keyword matching', {
          error: error.message,
          tenantId,
          service: 'ai-conversation',
        });
      }
    }

    // Strategy 2: Keyword-based similarity (fallback or supplement)
    const keywordResults = this.findSimilarByKeywords(query, conversations, minSimilarity);

    // Merge results, avoiding duplicates
    const seenIds = new Set(results.map((r) => r.conversation.id));
    for (const keywordResult of keywordResults) {
      if (!seenIds.has(keywordResult.conversation.id)) {
        results.push(keywordResult);
      } else {
        // Update existing result if keyword similarity is higher
        const existing = results.find((r) => r.conversation.id === keywordResult.conversation.id);
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
    conversations: any[],
    minSimilarity: number
  ): Array<{ conversation: any; similarity: number; method: string }> {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower
      .split(/\s+/)
      .filter((term) => term.length > 2)
      .slice(0, 10);

    if (queryTerms.length === 0) {
      return [];
    }

    const results: Array<{ conversation: any; similarity: number; method: string }> = [];

    for (const conversation of conversations) {
      const data = conversation.structuredData || conversation;
      let matchScore = 0;
      const totalTerms = queryTerms.length;

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
        const sampleMessages = data.messages.slice(0, 5);
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
      const similarity = Math.min(1, matchScore / (totalTerms * 2));

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
  private generateRelevanceReason(similarity: number, data: any): string {
    if (similarity >= 0.9) {
      return 'Highly similar topic and content';
    } else if (similarity >= 0.7) {
      return 'Similar topic discussed';
    } else if (data.summaryData?.keyDecisions && data.summaryData.keyDecisions.length > 0) {
      return 'Contains relevant decisions';
    } else if (data.summaryData?.keyFacts && data.summaryData.keyFacts.length > 0) {
      return 'Contains relevant facts';
    } else if (data.summary) {
      return 'Related conversation summary';
    } else {
      return 'Similar keywords found';
    }
  }
}

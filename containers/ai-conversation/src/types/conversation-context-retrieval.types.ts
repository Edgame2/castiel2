/**
 * Conversation Context Retrieval Types
 */

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
  relevanceReason: string;
}

export interface ContextRetrievalOptions {
  maxResults?: number;
  minSimilarityScore?: number;
  maxAgeDays?: number;
  projectId?: string;
  includeDecisions?: boolean;
  includeFacts?: boolean;
  excludeResolved?: boolean;
}

export interface ContextRetrievalResult {
  similarConversations: SimilarConversation[];
  relevantDecisions: string[];
  relevantFacts: string[];
  resolvedTopics: string[];
  totalConversationsSearched: number;
}

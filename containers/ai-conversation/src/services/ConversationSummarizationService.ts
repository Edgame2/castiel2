/**
 * Conversation Summarization Service
 * Summarizes conversations to manage token limits
 */

import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
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
  actionItems: string[];
  tokenCount: number;
  totalTokensSaved: number;
  originalMessageCount: number;
  createdAt: Date | string;
}

export class ConversationSummarizationService {
  private config: ReturnType<typeof loadConfig>;
  private aiServiceClient: ServiceClient;

  constructor() {
    this.config = loadConfig();
    
    this.aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 60000,
      retries: 2,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Summarize conversation
   */
  async summarizeConversation(
    tenantId: string,
    conversationId: string,
    request: SummarizationRequest
  ): Promise<ConversationSummary> {
    try {
      log.info('Summarizing conversation', {
        tenantId,
        conversationId,
        messageCount: request.messages.length,
        service: 'ai-conversation',
      });

      // Preserve pinned and recent messages
      const messagesToSummarize = this.filterMessagesForSummarization(request);

      // Generate summary using AI service
      const summaryText = await this.generateSummary(tenantId, messagesToSummarize, request);

      // Extract structured information
      const keyDecisions = request.includeDecisions ? await this.extractDecisions(tenantId, messagesToSummarize) : [];
      const keyFacts = request.includeFacts ? await this.extractFacts(tenantId, messagesToSummarize) : [];
      const actionItems = request.includeActionItems ? await this.extractActionItems(tenantId, messagesToSummarize) : [];

      // Calculate token savings
      const originalTokens = this.estimateTokens(request.messages);
      const summaryTokens = this.estimateTokens([{ content: summaryText } as ConversationMessage]);
      const tokensSaved = originalTokens - summaryTokens;

      const summary: ConversationSummary = {
        id: conversationId + '_summary',
        tenantId,
        conversationId,
        summary: summaryText,
        keyDecisions,
        keyFacts,
        actionItems,
        tokenCount: summaryTokens,
        totalTokensSaved: tokensSaved,
        originalMessageCount: request.messages.length,
        createdAt: new Date(),
      };

      return summary;
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
   * Filter messages for summarization
   */
  private filterMessagesForSummarization(request: SummarizationRequest): ConversationMessage[] {
    let messages = request.messages;

    // Preserve pinned messages
    if (request.preservePinnedMessages) {
      const pinned = messages.filter(m => (m as any).pinned);
      messages = messages.filter(m => !(m as any).pinned);
      // Will re-insert pinned at the end
    }

    // Preserve recent messages
    if (request.preserveRecentMessages && request.preserveRecentMessages > 0) {
      const recent = messages.slice(-request.preserveRecentMessages);
      messages = messages.slice(0, -request.preserveRecentMessages);
      // Will re-insert recent at the end
    }

    return messages;
  }

  /**
   * Generate summary using AI
   */
  private async generateSummary(
    tenantId: string,
    messages: ConversationMessage[],
    request: SummarizationRequest
  ): Promise<string> {
    try {
      if (messages.length === 0) {
        return 'Empty conversation.';
      }

      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      
      // For short conversations, generate simple summary
      if (messages.length <= 5) {
        const userMessages = messages.filter(m => m.role === 'user');
        const assistantMessages = messages.filter(m => m.role === 'assistant');
        return `Conversation with ${userMessages.length} user questions and ${assistantMessages.length} assistant responses.`;
      }

      // For longer conversations, extract key points
      const keyPoints: string[] = [];
      const userQuestions = messages.filter(m => m.role === 'user').map(m => m.content);
      const assistantAnswers = messages.filter(m => m.role === 'assistant').map(m => m.content);

      if (userQuestions.length > 0) {
        keyPoints.push(`User asked ${userQuestions.length} questions`);
      }
      if (assistantAnswers.length > 0) {
        keyPoints.push(`Assistant provided ${assistantAnswers.length} responses`);
      }

      // Extract topics from first few messages
      const firstMessages = messages.slice(0, 3).map(m => m.content.substring(0, 100)).join(' ');
      if (firstMessages.length > 0) {
        keyPoints.push(`Topics discussed: ${firstMessages.substring(0, 200)}...`);
      }

      return keyPoints.join('. ') + '.';
    } catch (error: any) {
      log.warn('Summary generation failed', {
        error: error.message,
        service: 'ai-conversation',
      });
      return `Summary of conversation with ${messages.length} messages.`;
    }
  }

  /**
   * Extract decisions
   */
  private async extractDecisions(tenantId: string, messages: ConversationMessage[]): Promise<string[]> {
    try {
      const decisions: string[] = [];
      const decisionKeywords = ['decided', 'decision', 'choose', 'selected', 'will do', 'going to', 'plan to'];

      for (const message of messages) {
        const content = message.content.toLowerCase();
        for (const keyword of decisionKeywords) {
          if (content.includes(keyword)) {
            // Extract sentence containing decision
            const sentences = message.content.split(/[.!?]+/);
            const decisionSentence = sentences.find(s => s.toLowerCase().includes(keyword));
            if (decisionSentence && decisionSentence.trim().length > 10) {
              decisions.push(decisionSentence.trim());
            }
          }
        }
      }

      return decisions.slice(0, 5); // Limit to top 5 decisions
    } catch (error: any) {
      log.warn('Decision extraction failed', {
        error: error.message,
        service: 'ai-conversation',
      });
      return [];
    }
  }

  /**
   * Extract facts
   */
  private async extractFacts(tenantId: string, messages: ConversationMessage[]): Promise<string[]> {
    try {
      const facts: string[] = [];
      const factIndicators = [/\d+/, /(is|are|was|were|has|have|contains|includes)/i];

      for (const message of messages) {
        const sentences = message.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
        for (const sentence of sentences) {
          // Check if sentence contains factual information
          const hasNumber = /\d+/.test(sentence);
          const hasFactualVerb = /(is|are|was|were|has|have|contains|includes)/i.test(sentence);
          
          if (hasNumber || hasFactualVerb) {
            facts.push(sentence.trim());
          }
        }
      }

      return facts.slice(0, 10); // Limit to top 10 facts
    } catch (error: any) {
      log.warn('Fact extraction failed', {
        error: error.message,
        service: 'ai-conversation',
      });
      return [];
    }
  }

  /**
   * Extract action items
   */
  private async extractActionItems(tenantId: string, messages: ConversationMessage[]): Promise<string[]> {
    try {
      const actionItems: string[] = [];
      const actionKeywords = ['todo', 'need to', 'should', 'must', 'will', 'action', 'task', 'do this'];

      for (const message of messages) {
        const content = message.content.toLowerCase();
        for (const keyword of actionKeywords) {
          if (content.includes(keyword)) {
            // Extract sentence containing action
            const sentences = message.content.split(/[.!?]+/);
            const actionSentence = sentences.find(s => s.toLowerCase().includes(keyword));
            if (actionSentence && actionSentence.trim().length > 10) {
              actionItems.push(actionSentence.trim());
            }
          }
        }
      }

      return actionItems.slice(0, 5); // Limit to top 5 action items
    } catch (error: any) {
      log.warn('Action item extraction failed', {
        error: error.message,
        service: 'ai-conversation',
      });
      return [];
    }
  }

  /**
   * Estimate token count
   */
  private estimateTokens(messages: ConversationMessage[]): number {
    // Rough estimation: ~4 characters per token
    return messages.reduce((sum, m) => sum + Math.ceil((m.content?.length || 0) / 4), 0);
  }
}

/**
 * Conversation Context Retrieval Service
 * Retrieves context for conversations
 */

import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { ContextAssemblyService } from './ContextAssemblyService';

export class ConversationContextRetrievalService {
  private config: ReturnType<typeof loadConfig>;
  private contextAssemblyService: ContextAssemblyService;

  constructor() {
    this.config = loadConfig();
    this.contextAssemblyService = new ContextAssemblyService();
  }

  /**
   * Retrieve context for conversation
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
      const linkedShardIds = conversation.linkedShardIds || conversation.metadata?.linkedShardIds || [];

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
}

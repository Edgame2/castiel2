/**
 * Conversation Service
 * Manages AI conversations with context assembly and grounding
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import {
  Conversation,
  CreateConversationInput,
  SendMessageInput,
  ConversationMessage,
  ConversationStructuredData,
  MessageRole,
  MessageStatus,
  ConversationStatus,
  ConversationVisibility,
} from '../types/conversation.types';
import { publishConversationEvent } from '../events/publishers/ConversationEventPublisher';
import { v4 as uuidv4 } from 'uuid';
import { FastifyInstance } from 'fastify';

const CONVERSATION_TYPE_NAME = 'c_conversation';

export class ConversationService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private aiServiceClient: ServiceClient;
  private contextServiceClient: ServiceClient;
  private _embeddingsClient: ServiceClient;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 60000, // Longer timeout for AI calls
      retries: 2,
      circuitBreaker: { enabled: true },
    });

    this.contextServiceClient = new ServiceClient({
      baseURL: this.config.services.context_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this._embeddingsClient = new ServiceClient({
      baseURL: this.config.services.embeddings?.url || '',
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
      // If app not available, return empty - will be handled by gateway/service mesh
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'ai-conversation',
      serviceName: 'ai-conversation',
      tenantId,
    });
  }

  /**
   * Ensure conversation shard type exists
   */
  private async ensureConversationShardType(tenantId: string): Promise<string> {
    try {
      const token = this.getServiceToken(tenantId);
      
      // Check if shard type exists
      const shardTypes = await this.shardManagerClient.get<any[]>(
        `/api/v1/shard-types?limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (Array.isArray(shardTypes)) {
        const existing = shardTypes.find(st => st.name === CONVERSATION_TYPE_NAME);
        if (existing) {
          return existing.id;
        }
      }

      // Create shard type if it doesn't exist
      const shardTypeInput = {
        name: CONVERSATION_TYPE_NAME,
        displayName: 'Conversation',
        description: 'AI conversation with messages and context',
        category: 'conversation',
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            status: { type: 'string', enum: ['active', 'archived', 'deleted'] },
            visibility: { type: 'string', enum: ['private', 'shared', 'public'] },
            participants: { type: 'array' },
            messages: { type: 'array' },
            stats: { type: 'object' },
          },
        },
        schemaFormat: 'rich',
        isCustom: false,
        isGlobal: true,
      };

      const created = await this.shardManagerClient.post(
        '/api/v1/shard-types',
        shardTypeInput,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      return created.id;
    } catch (error: any) {
      log.error('Failed to ensure conversation shard type', error, {
        tenantId,
        service: 'ai-conversation',
      });
      throw error;
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    tenantId: string,
    userId: string,
    input: CreateConversationInput
  ): Promise<Conversation> {
    try {
      log.info('Creating conversation', {
        tenantId,
        userId,
        title: input.title,
        service: 'ai-conversation',
      });

      // Ensure shard type exists
      const shardTypeId = await this.ensureConversationShardType(tenantId);

      // Build structured data
      const now = new Date();
      const structuredData: ConversationStructuredData = {
        title: input.title || 'New Conversation',
        status: 'active',
        visibility: input.visibility || 'private',
        assistantId: input.assistantId,
        templateId: input.templateId,
        defaultModelId: input.defaultModelId,
        participants: [
          {
            userId,
            role: 'owner',
            joinedAt: now,
            isActive: true,
          },
        ],
        messages: [],
        stats: {
          messageCount: 0,
          userMessageCount: 0,
          assistantMessageCount: 0,
          toolCallCount: 0,
          totalTokens: 0,
          totalCost: 0,
          averageLatencyMs: 0,
          participantCount: 1,
          branchCount: 0,
          feedbackCount: 0,
          lastActivityAt: now,
        },
        participantCount: 1,
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0,
        lastActivityAt: now,
        tags: input.tags,
      };

      // Create shard via shard-manager
      const token = this.getServiceToken(tenantId);
      const shard = await this.shardManagerClient.post<any>(
        '/api/v1/shards',
        {
          shardTypeId,
          structuredData,
          status: 'active',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      // Handle linked shards (relationships)
      if (input.linkedShards && input.linkedShards.length > 0) {
        for (const linkedShardId of input.linkedShards) {
          try {
            await this.shardManagerClient.post(
              `/api/v1/shards/${shard.id}/relationships`,
              {
                targetShardId: linkedShardId,
                relationshipType: 'related_to',
                bidirectional: true,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'X-Tenant-ID': tenantId,
                },
              }
            );
          } catch (error: any) {
            log.warn('Failed to create relationship', {
              error: error.message,
              conversationId: shard.id,
              linkedShardId,
              service: 'ai-conversation',
            });
          }
        }
      }

      // Handle initial message if provided
      if (input.initialMessage) {
        await this.sendMessage(shard.id, tenantId, userId, input.initialMessage);
      }

      // Publish event
      await publishConversationEvent('conversation.created', tenantId, {
        conversationId: shard.id,
        userId,
        title: structuredData.title,
      });

      const conversation: Conversation = {
        id: shard.id,
        tenantId: shard.tenantId,
        structuredData,
        createdAt: shard.createdAt,
        updatedAt: shard.updatedAt,
      };

      return conversation;
    } catch (error: any) {
      log.error('Failed to create conversation', error, {
        tenantId,
        userId,
        service: 'ai-conversation',
      });
      throw error;
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversation(
    conversationId: string,
    tenantId: string,
    options?: {
      includeMessages?: boolean;
      messageLimit?: number;
    }
  ): Promise<Conversation | null> {
    try {
      const token = this.getServiceToken(tenantId);
      const shard = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!shard) {
        return null;
      }

      // Optionally limit messages
      if (options?.includeMessages === false) {
        shard.structuredData.messages = [];
      } else if (options?.messageLimit) {
        const messages = shard.structuredData.messages || [];
        shard.structuredData.messages = messages.slice(-options.messageLimit);
      }

      return {
        id: shard.id,
        tenantId: shard.tenantId,
        structuredData: shard.structuredData,
        createdAt: shard.createdAt,
        updatedAt: shard.updatedAt,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      log.error('Failed to get conversation', error, {
        conversationId,
        tenantId,
        service: 'ai-conversation',
      });
      throw error;
    }
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    conversationId: string,
    tenantId: string,
    userId: string,
    input: SendMessageInput
  ): Promise<ConversationMessage> {
    try {
      log.info('Sending message', {
        conversationId,
        tenantId,
        userId,
        service: 'ai-conversation',
      });

      // Get conversation
      const conversation = await this.getConversation(conversationId, tenantId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Create user message
      const userMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'user',
        userId,
        content: input.content,
        contentType: input.contentType || 'text',
        status: 'complete',
        createdAt: new Date(),
      };

      // Add user message to conversation
      conversation.structuredData.messages.push(userMessage);
      conversation.structuredData.stats.messageCount++;
      conversation.structuredData.stats.userMessageCount++;
      conversation.structuredData.lastActivityAt = new Date();

      // Update conversation shard
      const token = this.getServiceToken(tenantId);
      await this.shardManagerClient.put(
        `/api/v1/shards/${conversationId}`,
        {
          structuredData: conversation.structuredData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      // Publish message added event
      await publishConversationEvent('conversation.message.added', tenantId, {
        conversationId,
        messageId: userMessage.id,
        role: 'user',
      });

      // Generate AI response if needed
      if (input.includeContext !== false) {
        await this.generateAIResponse(conversationId, tenantId, userId, input.modelId);
      }

      return userMessage;
    } catch (error: any) {
      log.error('Failed to send message', error, {
        conversationId,
        tenantId,
        userId,
        service: 'ai-conversation',
      });
      throw error;
    }
  }

  /**
   * Generate AI response for conversation
   */
  private async generateAIResponse(
    conversationId: string,
    tenantId: string,
    _userId: string,
    modelId?: string
  ): Promise<void> {
    try {
      // Get conversation with recent messages
      const conversation = await this.getConversation(conversationId, tenantId, {
        messageLimit: 50, // Last 50 messages for context
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Assemble context
      const context = await this.assembleContext(conversation, tenantId);

      // Create assistant message placeholder
      const assistantMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'assistant',
        modelId: modelId || conversation.structuredData.defaultModelId,
        content: '',
        contentType: 'text',
        status: 'streaming',
        createdAt: new Date(),
      };

      // Call AI service
      const token = this.getServiceToken(tenantId);
      const aiResponse = await this.aiServiceClient.post<any>(
        '/api/v1/ai/completions',
        {
          messages: conversation.structuredData.messages
            .slice(-10) // Last 10 messages for prompt
            .map(m => ({
              role: m.role,
              content: m.content,
            })),
          context: context.sources,
          modelId: modelId || conversation.structuredData.defaultModelId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      // Update assistant message
      assistantMessage.content = aiResponse.content || aiResponse.text || '';
      assistantMessage.status = 'complete';
      assistantMessage.tokens = aiResponse.tokens;
      assistantMessage.cost = aiResponse.cost;
      assistantMessage.latencyMs = aiResponse.latencyMs;
      assistantMessage.contextSources = context.sources;

      // Add assistant message to conversation
      conversation.structuredData.messages.push(assistantMessage);
      conversation.structuredData.stats.messageCount++;
      conversation.structuredData.stats.assistantMessageCount++;
      if (assistantMessage.tokens) {
        conversation.structuredData.stats.totalTokens += assistantMessage.tokens.total;
      }
      if (assistantMessage.cost) {
        conversation.structuredData.stats.totalCost += assistantMessage.cost;
      }
      conversation.structuredData.lastActivityAt = new Date();

      // Update conversation shard
      await this.shardManagerClient.put(
        `/api/v1/shards/${conversationId}`,
        {
          structuredData: conversation.structuredData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      // Publish context assembled event
      await publishConversationEvent('conversation.context.assembled', tenantId, {
        conversationId,
        contextSources: context.sources.length,
      });

      // Publish message added event
      await publishConversationEvent('conversation.message.added', tenantId, {
        conversationId,
        messageId: assistantMessage.id,
        role: 'assistant',
      });
    } catch (error: any) {
      log.error('Failed to generate AI response', error, {
        conversationId,
        tenantId,
        service: 'ai-conversation',
      });
      throw error;
    }
  }

  /**
   * Assemble context for conversation
   */
  private async assembleContext(
    conversation: Conversation,
    tenantId: string
  ): Promise<{ sources: any[] }> {
    try {
      // Get linked shards
      const token = this.getServiceToken(tenantId);
      const relationships = await this.shardManagerClient.get<any[]>(
        `/api/v1/shards/${conversation.id}/relationships`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      // Get latest user message for context query
      const userMessages = conversation.structuredData.messages.filter(m => m.role === 'user');
      const latestUserMessage = userMessages[userMessages.length - 1];

      if (!latestUserMessage) {
        return { sources: [] };
      }

      // Call context service to assemble context
      const context = await this.contextServiceClient.post<any>(
        '/api/v1/context/assemble',
        {
          query: latestUserMessage.content,
          linkedShardIds: relationships.map(r => r.targetShardId || r.sourceShardId),
          tenantId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      return {
        sources: context.sources || [],
      };
    } catch (error: any) {
      log.warn('Failed to assemble context, continuing without context', {
        error: error.message,
        conversationId: conversation.id,
        tenantId,
        service: 'ai-conversation',
      });
      return { sources: [] };
    }
  }

  /**
   * List conversations for user
   */
  async listConversations(
    tenantId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: ConversationStatus;
    }
  ): Promise<{ conversations: Conversation[]; total: number }> {
    try {
      const token = this.getServiceToken(tenantId);
      
      // Query conversations via shard-manager
      const queryParams = new URLSearchParams({
        shardTypeName: CONVERSATION_TYPE_NAME,
        limit: String(options?.limit || 50),
      });
      
      if (options?.status) {
        queryParams.append('status', options.status);
      }

      const response = await this.shardManagerClient.get<{ items: any[]; total: number }>(
        `/api/v1/shards?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      // Filter conversations where user is a participant
      const conversations = (response.items || [])
        .filter(shard => {
          const data = shard.structuredData as ConversationStructuredData;
          return data.participants?.some(p => p.userId === userId && p.isActive);
        })
        .map(shard => ({
          id: shard.id,
          tenantId: shard.tenantId,
          structuredData: shard.structuredData,
          createdAt: shard.createdAt,
          updatedAt: shard.updatedAt,
        }));

      return {
        conversations,
        total: conversations.length,
      };
    } catch (error: any) {
      log.error('Failed to list conversations', error, {
        tenantId,
        userId,
        service: 'ai-conversation',
      });
      throw error;
    }
  }

  /**
   * Update conversation
   */
  async updateConversation(
    conversationId: string,
    tenantId: string,
    updates: {
      title?: string;
      visibility?: ConversationVisibility;
      status?: ConversationStatus;
      tags?: string[];
    }
  ): Promise<Conversation> {
    try {
      const conversation = await this.getConversation(conversationId, tenantId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Update structured data
      if (updates.title !== undefined) {
        conversation.structuredData.title = updates.title;
      }
      if (updates.visibility !== undefined) {
        conversation.structuredData.visibility = updates.visibility;
      }
      if (updates.status !== undefined) {
        conversation.structuredData.status = updates.status;
      }
      if (updates.tags !== undefined) {
        conversation.structuredData.tags = updates.tags;
      }

      // Update shard
      const token = this.getServiceToken(tenantId);
      const updated = await this.shardManagerClient.put(
        `/api/v1/shards/${conversationId}`,
        {
          structuredData: conversation.structuredData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        structuredData: updated.structuredData,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } catch (error: any) {
      log.error('Failed to update conversation', error, {
        conversationId,
        tenantId,
        service: 'ai-conversation',
      });
      throw error;
    }
  }
}

// Type safety improvements - removed @ts-nocheck
/**
 * Conversation Service
 * Manages AI conversations (c_conversation shards)
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { Shard, CreateShardInput, ShardStatus, ShardSource } from '../types/shard.types.js';
import {
  ConversationStructuredData,
  ConversationMessage,
  ConversationParticipant,
  ConversationStats,
  MessageRole,
  MessageContentType,
  MessageStatus,
  ConversationStatus,
  ConversationVisibility,
  ParticipantRole,
  CreateConversationInput,
  UpdateConversationInput,
  SendMessageInput,
  EditMessageInput,
  AddFeedbackInput,
  ConversationQueryOptions,
  MessageFeedback,
  TokenUsage,
  MessageEdit,
  MessageComment,
  AddCommentInput,
  UpdateCommentInput,
  ConversationAnalytics,
  ConversationTopic,
  ConversationEntity,
  ConversationQualityMetrics,
  ConversationConfig,
  UpdateConversationConfigInput,
  MessageAttachment,
  AttachmentType,
} from '../types/conversation.types.js';
import { v4 as uuidv4 } from 'uuid';
import { ConversationSummarizationService } from './conversation-summarization.service.js';

// Conversation ShardType name
const CONVERSATION_TYPE_NAME = 'c_conversation';
const ARCHIVED_MESSAGE_TYPE_NAME = 'c_conversationMessage';

// Cache prefix
const CACHE_PREFIX = 'conversation:';
const CACHE_TTL = 300; // 5 minutes
const ARCHIVED_MESSAGES_CACHE_TTL = 600; // 10 minutes (archived messages change less frequently)

// Message archiving configuration
const DEFAULT_MESSAGE_LIMIT = 1000; // Total messages before archiving
const KEEP_RECENT_MESSAGES = 100; // Keep last N messages in main shard
const ARCHIVE_BATCH_SIZE = 200; // Archive messages in batches of N

// Shard size monitoring (Cosmos DB has 2MB limit per document)
const MAX_SHARD_SIZE_BYTES = 1.5 * 1024 * 1024; // 1.5MB (safety margin before 2MB limit)
const SHARD_SIZE_WARNING_THRESHOLD = 1.2 * 1024 * 1024; // 1.2MB (warn before archiving)

// Smart summarization configuration
const AUTO_SUMMARY_TRIGGER_INTERVAL = 20; // Generate summary every N messages
const SUMMARY_MAX_MESSAGES = 50; // Include last N messages in summary context

// Edit history configuration
const DEFAULT_EDIT_HISTORY_RETENTION = 10; // Default: keep last 10 edits per message
const CONVERSATION_CONFIG_CACHE_PREFIX = 'conversation:config:';
const CONVERSATION_CONFIG_CACHE_TTL = 3600; // 1 hour

// Export format types
export type ConversationExportFormat = 'pdf' | 'markdown' | 'json';

export interface ConversationExportOptions {
  includeArchived?: boolean;
  includeEditHistory?: boolean;
  includeContextSources?: boolean;
  fromDate?: Date;
  toDate?: Date;
  format: ConversationExportFormat;
}

export interface ConversationExportResult {
  format: ConversationExportFormat;
  content: string | Buffer;
  mimeType: string;
  filename: string;
  size: number;
}

/**
 * Conversation Service
 */
export class ConversationService {
  private conversationRealtimeService?: any; // ConversationRealtimeService - optional for real-time updates
  private notificationService?: any; // NotificationService - optional for notifications
  private userService?: any; // UserService - optional for user lookups
  private summarizationService?: ConversationSummarizationService; // Phase 5.1: Enhanced summarization
  private userFeedbackService?: any; // Phase 6.2: UserFeedbackService - optional for feedback analysis and improvement

  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository: ShardRepository,
    private shardTypeRepository: ShardTypeRepository,
    private redis?: Redis,
    private unifiedAIClient?: any, // UnifiedAIClient - optional for AI summarization
    private aiConnectionService?: any, // AIConnectionService - optional for AI summarization
    private conversionService?: any, // ConversionService - optional for PDF export
    private shardRelationshipService?: any, // ShardRelationshipService - optional for threading
    conversationRealtimeService?: any, // ConversationRealtimeService - optional for real-time updates
    notificationService?: any, // NotificationService - optional for notifications
    userService?: any, // UserService - optional for user lookups
    summarizationService?: ConversationSummarizationService, // Phase 5.1: Enhanced summarization
    userFeedbackService?: any // Phase 6.2: UserFeedbackService - optional for feedback analysis and improvement
  ) {
    this.conversationRealtimeService = conversationRealtimeService;
    this.notificationService = notificationService;
    this.userService = userService;
    this.summarizationService = summarizationService;
    this.userFeedbackService = userFeedbackService;
  }

  // ============================================
  // Conversation CRUD
  // ============================================

  /**
   * Create a new conversation from a template
   */
  async createFromTemplate(
    tenantId: string,
    userId: string,
    templateId: string,
    variables?: Record<string, string>,
    projectId?: string,
    linkedShards?: string[]
  ): Promise<Shard> {
    // Get the conversation template
    const templateShard = await this.shardRepository.findById(templateId, tenantId);
    if (!templateShard) {
      throw new Error('Conversation template not found');
    }

    // Verify it's a conversation template
    const templateType = await this.shardTypeRepository.findById(templateShard.shardTypeId, tenantId);
    if (templateType?.name !== 'c_conversationTemplate') {
      throw new Error('Invalid template type');
    }

    const templateData = templateShard.structuredData as any;

    // Check if template requires project scope
    if (templateData.projectScope === 'required' && !projectId) {
      throw new Error('This template requires a project to be specified');
    }

    // Render initial message with variables
    let initialMessage = templateData.initialMessage || '';
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        initialMessage = initialMessage.replace(new RegExp(placeholder, 'g'), value);
      }
    }

    // Render title suggestion
    let title = templateData.titleSuggestion || 'New Conversation';
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        title = title.replace(new RegExp(placeholder, 'g'), value);
      }
    }

    // Build tags (include project tag if projectId provided)
    const tags: string[] = [...(templateData.defaultTags || [])];
    if (projectId) {
      tags.push(`project:${projectId}`);
    }

    // Create conversation input
    const input: CreateConversationInput = {
      title,
      assistantId: templateData.assistantId,
      templateId: templateData.contextTemplateId, // Context template for RAG
      defaultModelId: templateData.defaultModelId,
      tags,
      visibility: 'private', // Default to private, user can change later
      linkedShards: linkedShards || [], // Support linked shards passed as parameter
    };

    // Create the conversation
    const conversation = await this.create(tenantId, userId, input);

    // Add initial message if provided
    if (initialMessage.trim()) {
      await this.addMessage(conversation.id, tenantId, userId, {
        content: initialMessage,
        contentType: 'text',
      });
    }

    this.monitoring.trackEvent('conversation.createdFromTemplate', {
      conversationId: conversation.id,
      templateId,
      tenantId,
      userId,
      hasProject: !!projectId,
    });

    return conversation;
  }

  /**
   * Create a new conversation
   */
  async create(
    tenantId: string,
    userId: string,
    input: CreateConversationInput
  ): Promise<Shard> {
    const now = new Date();

    // Get the conversation ShardType ID
    const shardTypeId = await this.getConversationShardTypeId(tenantId);

    // Initialize structured data
    const structuredData: ConversationStructuredData = {
      title: input.title || 'New Conversation',
      summary: undefined,
      status: ShardStatus.ACTIVE,
      visibility: input.visibility || 'private',

      assistantId: input.assistantId,
      templateId: input.templateId,
      defaultModelId: input.defaultModelId,

      // Threading (if provided)
      threadId: input.threadId,
      parentConversationId: input.parentConversationId,
      threadTopic: input.threadTopic,
      threadOrder: input.threadOrder,

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

      // Denormalized stats for quick access
      participantCount: 1,
      messageCount: 0,
      totalTokens: 0,
      totalCost: 0,
      lastActivityAt: now,

      tags: input.tags,
    };

    // Create shard input
    const createInput: CreateShardInput = {
      tenantId,
      shardTypeId,
      structuredData,
      status: ShardStatus.ACTIVE,
      createdBy: userId,
    };

    // Create the shard
    const shard = await this.shardRepository.create(createInput);

    // Handle linked shards (relationships)
    if (input.linkedShards && input.linkedShards.length > 0 && this.shardRelationshipService) {
      try {
        // Import RelationshipType to use the correct type
        const { RelationshipType } = await import('../types/shard-edge.types.js');

        // Validate and deduplicate linked shard IDs
        const uniqueLinkedShardIds = Array.from(new Set(input.linkedShards));
        
        // Filter out self-references (conversation cannot link to itself)
        const validLinkedShardIds = uniqueLinkedShardIds.filter(
          linkedShardId => linkedShardId !== shard.id
        );

        if (validLinkedShardIds.length === 0) {
          // All were self-references or duplicates, skip relationship creation
          this.monitoring.trackEvent('conversation.linkedShards.filtered', {
            conversationId: shard.id,
            originalCount: input.linkedShards.length,
            filteredCount: 0,
            reason: 'self_reference_or_duplicates',
          });
        } else {
          // Validate that linked shards exist before attempting to create relationships
          const validationResults = await Promise.allSettled(
            validLinkedShardIds.map(async (linkedShardId) => {
              const targetShard = await this.shardRepository.findById(linkedShardId, tenantId);
              return { linkedShardId, exists: !!targetShard };
            })
          );

          // Filter to only valid shards that exist
          const existingShardIds: string[] = [];
          for (let i = 0; i < validationResults.length; i++) {
            const result = validationResults[i];
            if (result.status === 'fulfilled' && result.value.exists) {
              existingShardIds.push(validLinkedShardIds[i]);
            } else {
              this.monitoring.trackEvent('conversation.linkedShard.notFound', {
                conversationId: shard.id,
                linkedShardId: validLinkedShardIds[i],
                tenantId,
              });
            }
          }

          if (existingShardIds.length > 0) {
            // Get conversation shard type name for relationship metadata
            const conversationShardType = await this.shardTypeRepository.findById(shardTypeId, tenantId);
            const conversationShardTypeName = conversationShardType?.name || shardTypeId;

            // Create relationships between conversation and linked shards
            for (const linkedShardId of existingShardIds) {
              try {
                // The service will enrich the input with shard type info from the shards,
                // but we need to provide placeholder values to satisfy the interface
                await this.shardRelationshipService.createRelationship({
                  tenantId,
                  sourceShardId: shard.id,
                  sourceShardTypeId: shardTypeId,
                  sourceShardTypeName: conversationShardTypeName,
                  targetShardId: linkedShardId,
                  targetShardTypeId: '', // Will be enriched by service from target shard
                  targetShardTypeName: '', // Will be enriched by service from target shard
                  relationshipType: RelationshipType.RELATED_TO,
                  bidirectional: true, // Conversations are related to linked shards bidirectionally
                  createdBy: userId,
                  metadata: {
                    source: 'conversation_creation',
                    conversationId: shard.id,
                  },
                });
              } catch (error: any) {
                // Log but don't fail conversation creation if relationship creation fails
                // (e.g., relationship already exists, etc.)
                this.monitoring.trackException(error as Error, {
                  operation: 'conversation.createLinkedShardRelationship',
                  conversationId: shard.id,
                  linkedShardId,
                });
              }
            }
          }
        }
      } catch (error) {
        // Log but don't fail conversation creation if relationship service setup fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.setupLinkedShardRelationships',
          conversationId: shard.id,
        });
      }
    }

    // Handle initial message if provided
    if (input.initialMessage) {
      // Convert attachments to MessageAttachment format if provided
      const attachments: MessageAttachment[] | undefined = input.initialMessage.attachments?.map((att, idx) => ({
        id: `temp-${idx}`,
        type: att.type as AttachmentType || 'file',
        name: att.name,
        url: att.url,
        mimeType: att.mimeType,
        size: 0, // Size not provided in input
      }));
      await this.addMessage(shard.id, tenantId, userId, {
        content: input.initialMessage.content,
        contentType: input.initialMessage.contentType || 'text',
        attachments,
      });
    }

    this.monitoring.trackEvent('conversation.created', {
      conversationId: shard.id,
      tenantId,
      userId,
      visibility: structuredData.visibility,
    });

    // Record metrics event
    await this.recordConversationEvent({
      type: 'created',
      conversationId: shard.id,
      tenantId,
      userId,
      status: structuredData.status,
      visibility: structuredData.visibility,
      messageCount: 0,
      timestamp: now,
    });

    return shard;
  }

  /**
   * Get a conversation by ID
   */
  async get(
    conversationId: string,
    tenantId: string,
    options?: {
      includeMessages?: boolean;
      messageLimit?: number;
      messageOffset?: number;
      includeLinkedShards?: boolean;
    }
  ): Promise<Shard | null> {
    const shard = await this.shardRepository.findById(conversationId, tenantId);

    if (!shard) {return null;}

    // Verify it's a conversation
    const shardType = await this.shardTypeRepository.findById(shard.shardTypeId, tenantId);
    if (shardType?.name !== CONVERSATION_TYPE_NAME) {
      return null;
    }

    // Optionally limit messages returned
    if (options?.includeMessages === false) {
      const data = shard.structuredData as ConversationStructuredData;
      data.messages = [];
    } else if (options?.messageLimit || options?.messageOffset) {
      const data = shard.structuredData as ConversationStructuredData;
      const offset = options.messageOffset || 0;
      const limit = options.messageLimit || 50;
      data.messages = data.messages.slice(offset, offset + limit);
    }

    return shard;
  }

  /**
   * Get linked shards for a conversation
   */
  async getLinkedShards(
    conversationId: string,
    tenantId: string
  ): Promise<Array<{ edge: { id: string; relationshipType: string; label?: string; sourceShardId: string; targetShardId: string; createdAt: Date }; shard: Shard }>> {
    if (!this.shardRelationshipService) {
      return [];
    }

    try {
      const { RelationshipType } = await import('../types/shard-edge.types.js');
      
      const relatedShards = await this.shardRelationshipService.getRelatedShards(
        tenantId,
        conversationId,
        'both',
        {
          relationshipType: RelationshipType.RELATED_TO,
        }
      );

      return relatedShards;
    } catch (error) {
      // Log but don't fail the request if relationship lookup fails
      this.monitoring.trackException(error as Error, {
        operation: 'conversation.getLinkedShards',
        conversationId,
        tenantId,
      });
      return [];
    }
  }

  /**
   * Get linked shards count for a conversation
   */
  async getLinkedShardsCount(
    conversationId: string,
    tenantId: string
  ): Promise<number> {
    if (!this.shardRelationshipService) {
      return 0;
    }

    try {
      const { RelationshipType } = await import('../types/shard-edge.types.js');
      
      const relationships = await this.shardRelationshipService.getRelationships(
        tenantId,
        conversationId,
        'both',
        {
          relationshipType: RelationshipType.RELATED_TO,
        }
      );

      return relationships.length;
    } catch (error) {
      // Log but don't fail the request if relationship lookup fails
      this.monitoring.trackException(error as Error, {
        operation: 'conversation.getLinkedShardsCount',
        conversationId,
        tenantId,
      });
      return 0;
    }
  }

  /**
   * Update a conversation
   */
  async update(
    conversationId: string,
    tenantId: string,
    userId: string,
    input: UpdateConversationInput
  ): Promise<Shard> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;

    // Handle linked shards management (add/remove relationships)
    if (this.shardRelationshipService && (input.addLinkedShards || input.removeLinkedShards)) {
      try {
        const { RelationshipType } = await import('../types/shard-edge.types.js');
        const shardTypeId = shard.shardTypeId;
        const conversationShardType = await this.shardTypeRepository.findById(shardTypeId, tenantId);
        const conversationShardTypeName = conversationShardType?.name || shardTypeId;

        // Remove linked shards (delete relationships)
        if (input.removeLinkedShards && input.removeLinkedShards.length > 0) {
          for (const linkedShardId of input.removeLinkedShards) {
            try {
              await this.shardRelationshipService.deleteRelationshipBetween(
                tenantId,
                conversationId,
                linkedShardId,
                RelationshipType.RELATED_TO
              );
            } catch (error: any) {
              // Log but don't fail update if relationship deletion fails
              this.monitoring.trackException(error as Error, {
                operation: 'conversation.removeLinkedShardRelationship',
                conversationId,
                linkedShardId,
              });
            }
          }
        }

        // Add linked shards (create relationships)
        if (input.addLinkedShards && input.addLinkedShards.length > 0) {
          // Validate and deduplicate linked shard IDs
          const uniqueLinkedShardIds = Array.from(new Set(input.addLinkedShards));
          
          // Filter out self-references (conversation cannot link to itself)
          const validLinkedShardIds = uniqueLinkedShardIds.filter(
            linkedShardId => linkedShardId !== conversationId
          );

          if (validLinkedShardIds.length > 0) {
            // Validate that linked shards exist before attempting to create relationships
            const validationResults = await Promise.allSettled(
              validLinkedShardIds.map(async (linkedShardId) => {
                const targetShard = await this.shardRepository.findById(linkedShardId, tenantId);
                return { linkedShardId, exists: !!targetShard };
              })
            );

            // Filter to only valid shards that exist
            const existingShardIds: string[] = [];
            for (let i = 0; i < validationResults.length; i++) {
              const result = validationResults[i];
              if (result.status === 'fulfilled' && result.value.exists) {
                existingShardIds.push(validLinkedShardIds[i]);
              } else {
                this.monitoring.trackEvent('conversation.linkedShard.notFound', {
                  conversationId,
                  linkedShardId: validLinkedShardIds[i],
                  tenantId,
                });
              }
            }

            // Create relationships for existing shards
            for (const linkedShardId of existingShardIds) {
              try {
                await this.shardRelationshipService.createRelationship({
                  tenantId,
                  sourceShardId: conversationId,
                  sourceShardTypeId: shardTypeId,
                  sourceShardTypeName: conversationShardTypeName,
                  targetShardId: linkedShardId,
                  targetShardTypeId: '', // Will be enriched by service from target shard
                  targetShardTypeName: '', // Will be enriched by service from target shard
                  relationshipType: RelationshipType.RELATED_TO,
                  bidirectional: true,
                  createdBy: userId,
                  metadata: {
                    source: 'conversation_update',
                    conversationId,
                  },
                });
              } catch (error: any) {
                // Log but don't fail update if relationship creation fails
                // (e.g., relationship already exists, etc.)
                this.monitoring.trackException(error as Error, {
                  operation: 'conversation.addLinkedShardRelationship',
                  conversationId,
                  linkedShardId,
                });
              }
            }
          }
        }
      } catch (error) {
        // Log but don't fail conversation update if relationship service setup fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.manageLinkedShardRelationships',
          conversationId,
        });
      }
    }

    // Track status change for metrics
    const previousStatus = data.status;
    const statusChanged = input.status !== undefined && input.status !== previousStatus;

    // Update fields
    if (input.title !== undefined) {data.title = input.title;}
    if (input.summary !== undefined) {data.summary = input.summary;}
    if (input.visibility !== undefined) {data.visibility = input.visibility;}
    if (input.status !== undefined) {data.status = input.status;}
    if (input.assistantId !== undefined) {data.assistantId = input.assistantId;}
    if (input.templateId !== undefined) {data.templateId = input.templateId;}
    if (input.defaultModelId !== undefined) {data.defaultModelId = input.defaultModelId;}
    if (input.tags !== undefined) {data.tags = input.tags;}

    // Update shard
    // Tags are stored in structuredData, not as a separate property
    if (input.tags !== undefined) {
      data.tags = input.tags;
    }
    const updated = await this.shardRepository.update(conversationId, tenantId, {
      structuredData: data,
    });

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);

    // Record metrics if status changed to archived
    if (statusChanged && input.status === 'archived') {
      await this.recordConversationEvent({
        type: 'archived',
        conversationId,
        tenantId,
        userId,
        status: input.status,
        timestamp: new Date(),
      });
    }

    this.monitoring.trackEvent('conversation.updated', {
      conversationId,
      tenantId,
      userId,
      updatedFields: Object.keys(input).join(','),
    });

    // Broadcast real-time event
    if (this.conversationRealtimeService) {
      try {
        await this.conversationRealtimeService.broadcastConversationUpdated(
          conversationId,
          tenantId,
          userId
        );
      } catch (error) {
        // Don't fail the request if broadcasting fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.broadcastConversationUpdated',
          conversationId,
          tenantId,
        });
      }
    }

    if (!updated) {
      throw new Error('Failed to update conversation');
    }
    return updated;
  }

  /**
   * Delete (or archive) a conversation
   */
  async delete(
    conversationId: string,
    tenantId: string,
    userId: string,
    permanent = false
  ): Promise<void> {
    if (permanent) {
      await this.shardRepository.delete(conversationId, tenantId);
    } else {
      // Soft delete - set status to deleted
      await this.update(conversationId, tenantId, userId, { status: 'deleted' });
    }

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);

    this.monitoring.trackEvent('conversation.deleted', {
      conversationId,
      tenantId,
      userId,
      permanent,
    });
  }

  /**
   * List conversations for a user
   */
  async list(
    tenantId: string,
    userId: string,
    options: ConversationQueryOptions = {}
  ): Promise<{ conversations: Shard[]; total: number; hasMore: boolean }> {
    const shardTypeId = await this.getConversationShardTypeId(tenantId);

    // Build filter
    const filter: Record<string, unknown> = {
      tenantId,
      shardTypeId,
    };

    // Status filter
    if (options.status && options.status.length > 0) {
      // Will be filtered post-query
    }

    const limit = options.limit || 20;
    const offset = options.offset || 0;

    // Query shards
    // Note: ShardListOptions uses continuationToken, not offset
    const result = await this.shardRepository.list({
      filter: {
        ...filter,
        tenantId, // Ensure tenantId is included
      },
      limit: limit + 1, // Get one extra to check hasMore
      orderBy: (options.orderBy === 'messageCount' || options.orderBy === 'lastActivityAt' ? 'updatedAt' : (options.orderBy || 'updatedAt')) as 'createdAt' | 'updatedAt',
      orderDirection: options.orderDirection || 'desc',
    });

    let conversations = result.shards;

    // Apply filters that couldn't be done at query level
    if (options.status && options.status.length > 0) {
      conversations = conversations.filter(c => {
        const data = c.structuredData as ConversationStructuredData;
        return options.status!.includes(data.status);
      });
    }

    if (options.visibility && options.visibility.length > 0) {
      conversations = conversations.filter(c => {
        const data = c.structuredData as ConversationStructuredData;
        return options.visibility!.includes(data.visibility);
      });
    }

    if (options.participantId) {
      conversations = conversations.filter(c => {
        const data = c.structuredData as ConversationStructuredData;
        return data.participants.some(p => p.userId === options.participantId);
      });
    }

    if (options.assistantId) {
      conversations = conversations.filter(c => {
        const data = c.structuredData as ConversationStructuredData;
        return data.assistantId === options.assistantId;
      });
    }

    if (options.tags && options.tags.length > 0) {
      conversations = conversations.filter(c => {
        const data = c.structuredData as ConversationStructuredData;
        const tags = data.tags || [];
        return options.tags!.some(tag => tags.includes(tag));
      });
    }

    if (options.search) {
      const search = options.search.toLowerCase();
      const searchTerms = search.split(/\s+/).filter(term => term.length > 0);
      
      conversations = conversations.filter(c => {
        const data = c.structuredData as ConversationStructuredData;
        
        // Search in title and summary
        const titleMatch = data.title?.toLowerCase().includes(search);
        const summaryMatch = data.summary?.toLowerCase().includes(search);
        
        // Search in message content (user and assistant messages)
        let messageMatch = false;
        if (data.messages && data.messages.length > 0) {
          // Check if any message content contains search terms
          messageMatch = data.messages.some(message => {
            if (!message.content) {return false;}
            const content = message.content.toLowerCase();
            // Match all search terms (AND logic) or any term (OR logic for single word)
            if (searchTerms.length === 1) {
              return content.includes(searchTerms[0]);
            } else {
              // For multiple terms, all must be present (AND)
              return searchTerms.every(term => content.includes(term));
            }
          });
        }
        
        return titleMatch || summaryMatch || messageMatch;
      });
    }

    // Date filters
    if (options.fromDate) {
      conversations = conversations.filter(c => new Date(c.createdAt) >= options.fromDate!);
    }
    if (options.toDate) {
      conversations = conversations.filter(c => new Date(c.createdAt) <= options.toDate!);
    }

    // Filter conversations by user access (security: only show conversations user can read)
    // This ensures users only see conversations they have access to based on visibility rules
    // Optimized: check access directly using already-loaded shards instead of re-fetching
    // IMPORTANT: This must happen before pagination to ensure accurate counts
    conversations = conversations.filter(conv => {
      const data = conv.structuredData as ConversationStructuredData;
      
      // Check visibility
      if (data.visibility === 'public') {
        // Public - anyone in tenant can read
        return true;
      }
      
      if (data.visibility === 'shared') {
        // Shared - only participants can read
        const participant = data.participants.find(p => p.userId === userId && p.isActive);
        return !!participant;
      }
      
      // Private - only owner can read
      const participant = data.participants.find(p => p.userId === userId && p.isActive);
      return participant?.role === 'owner';
    });

    // Filter by linked shard (if specified)
    if (options.linkedShardId && this.shardRelationshipService) {
      try {
        const { RelationshipType } = await import('../types/shard-edge.types.js');
        
        // Get all relationships where the linked shard is involved
        // We need to find conversations that have a RELATED_TO relationship with the specified shard
        const relationships = await this.shardRelationshipService.getRelationships(
          tenantId,
          options.linkedShardId,
          'both',
          {
            relationshipType: RelationshipType.RELATED_TO,
          }
        );

        // Extract conversation IDs from relationships
        // Since relationships are bidirectional, we need to check both source and target
        const linkedConversationIds = new Set<string>();
        for (const rel of relationships) {
          // The linked shard could be source or target, so we need to get the other side
          if (rel.sourceShardId === options.linkedShardId) {
            linkedConversationIds.add(rel.targetShardId);
          } else if (rel.targetShardId === options.linkedShardId) {
            linkedConversationIds.add(rel.sourceShardId);
          }
        }

        // Filter conversations to only those linked to the specified shard
        conversations = conversations.filter(c => linkedConversationIds.has(c.id));
      } catch (error) {
        // Log but don't fail the request if relationship lookup fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.list.filterByLinkedShard',
          tenantId,
          linkedShardId: options.linkedShardId,
        });
        // If filtering fails, return empty results to avoid showing unrelated conversations
        conversations = [];
      }
    }

    // Check if there are more (after all filters)
    const hasMore = conversations.length > limit;
    if (hasMore) {
      conversations = conversations.slice(0, limit);
    }

    // Optionally fetch linked shards counts
    if (options.includeLinkedShardsCount && this.shardRelationshipService) {
      try {
        // Fetch counts in parallel for all conversations
        const countPromises = conversations.map(conv =>
          this.getLinkedShardsCount(conv.id, tenantId).catch((error) => {
            this.monitoring?.trackException(error as Error, { 
              operation: 'conversation.getLinkedShardsCount',
              conversationId: conv.id,
              tenantId 
            });
            return 0;
          })
        );
        const counts = await Promise.all(countPromises);

        // Attach counts to conversations (as metadata, not in structuredData)
        conversations.forEach((conv, index) => {
          (conv as any).linkedShardsCount = counts[index];
        });
      } catch (error) {
        // Log but don't fail the request if count fetching fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.list.getLinkedShardsCounts',
          tenantId,
          conversationCount: conversations.length,
        });
        // Set counts to 0 on error
        conversations.forEach(conv => {
          (conv as any).linkedShardsCount = 0;
        });
      }
    }

    return {
      conversations,
      total: result.count || conversations.length,
      hasMore,
    };
  }

  // ============================================
  // Message Management
  // ============================================

  /**
   * Add a message to the conversation
   */
  async addMessage(
    conversationId: string,
    tenantId: string,
    userId: string,
    input: SendMessageInput,
    messageOverrides?: Partial<ConversationMessage>
  ): Promise<ConversationMessage> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;

    // Check if conversation is archived (read-only)
    if (data.status === 'archived') {
      throw new Error('Cannot add messages to archived conversation. Please unarchive it first.');
    }

    const now = new Date();

    // Create message
    const message: ConversationMessage = {
      id: uuidv4(),
      parentId: input.parentId,
      branchIndex: input.parentId ? this.getNextBranchIndex(data.messages, input.parentId) : 0,

      role: 'user',
      userId,
      modelId: input.modelId,

      content: input.content,
      contentType: input.contentType || 'text',

      attachments: input.attachments?.map(a => ({
        ...a,
        id: uuidv4(),
      })),

      status: 'complete',
      isRegenerated: false,
      regenerationCount: 0,

      createdAt: now,

      // Extract mentions from content
      mentions: this.extractMentions(input.content),

      ...messageOverrides,
    };

    // Add message to array
    data.messages.push(message);

    // Update stats
    data.messageCount = data.messages.length;
    data.lastActivityAt = now;
    if (data.stats) {
      data.stats.messageCount = data.messages.length;
      data.stats.lastActivityAt = now;
      if (message.role === 'user') {
        data.stats.userMessageCount++;
      } else if (message.role === 'assistant') {
        data.stats.assistantMessageCount++;
      }
    }

    // Check if archiving is needed (after adding message)
    // Check both message count and shard size
    const messageLimit = (data as any).messageLimit || DEFAULT_MESSAGE_LIMIT;
    const shouldArchiveByCount = data.messages.length > messageLimit;
    
    // Estimate shard size before saving
    const estimatedSize = this.estimateShardSize(shard, data);
    const shouldArchiveBySize = estimatedSize >= MAX_SHARD_SIZE_BYTES;
    
    if (shouldArchiveByCount || shouldArchiveBySize) {
      // Archive old messages before saving
      await this.archiveOldMessages(conversationId, tenantId, userId, data, shouldArchiveBySize);
      
      // Re-estimate size after archiving
      const sizeAfterArchive = this.estimateShardSize(shard, data);
      if (sizeAfterArchive >= SHARD_SIZE_WARNING_THRESHOLD) {
        this.monitoring.trackEvent('conversation.shard.size.warning', {
          conversationId,
          tenantId,
          sizeBytes: sizeAfterArchive,
          messageCount: data.messages.length,
        });
      }
    }

    // Save
    await this.shardRepository.update(conversationId, tenantId, {
      structuredData: data,
    });

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);

    this.monitoring.trackEvent('conversation.message.added', {
      conversationId,
      messageId: message.id,
      tenantId,
      userId,
      role: message.role,
    });

    // Record metrics event
    await this.recordConversationEvent({
      type: 'message_added',
      conversationId,
      tenantId,
      userId,
      messageCount: data.messages.length,
      cost: message.cost,
      tokens: message.tokens?.total,
      timestamp: now,
    });

    // Broadcast real-time event
    if (this.conversationRealtimeService) {
      try {
        await this.conversationRealtimeService.broadcastMessageAdded(
          conversationId,
          tenantId,
          userId,
          message
        );
      } catch (error) {
        // Don't fail the request if broadcasting fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.broadcastMessageAdded',
          conversationId,
          tenantId,
        });
      }
    }

    // Auto-generate summary if enabled and threshold reached
    // Only trigger after assistant messages (complete conversation turns)
    if (message.role === 'assistant') {
      try {
        const config = await this.getConversationConfig(tenantId);
        if (config.autoSummarizeEnabled) {
          const messageCount = data.messages.length;
          const threshold = config.autoSummarizeThreshold || 50;
          
          // Check if we've reached a threshold interval (e.g., every 50 messages)
          const lastSummaryMessageCount = (data as any).lastSummaryMessageCount || 0;
          const messagesSinceLastSummary = messageCount - lastSummaryMessageCount;
          
          if (messagesSinceLastSummary >= threshold) {
            // Trigger auto-summarization asynchronously (don't block the response)
            this.autoGenerateSummary(conversationId, tenantId, data).catch(error => {
              // Log error but don't fail the request
              this.monitoring.trackException(error as Error, {
                operation: 'conversation.autoGenerateSummary',
                conversationId,
                tenantId,
                messageCount,
              });
            });
            
            // Track that we triggered a summary
            (data as any).lastSummaryMessageCount = messageCount;
            await this.shardRepository.update(conversationId, tenantId, {
              structuredData: data,
            });
          }
        }
      } catch (error) {
        // Don't fail the request if auto-summarization check fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.autoSummarizeCheck',
          conversationId,
          tenantId,
        });
      }
    }

    return message;
  }

  /**
   * Add an assistant message (usually from AI generation)
   */
  async addAssistantMessage(
    conversationId: string,
    tenantId: string,
    input: {
      content: string;
      contentType?: MessageContentType;
      modelId: string;
      connectionName?: string;
      parentId?: string;
      toolCalls?: ConversationMessage['toolCalls'];
      contextSources?: ConversationMessage['contextSources'];
      tokens?: TokenUsage;
      cost?: number;
      latencyMs?: number;
    }
  ): Promise<ConversationMessage> {
    return this.addMessage(
      conversationId,
      tenantId,
      'system', // System user
      {
        content: input.content,
        contentType: input.contentType || 'markdown',
        parentId: input.parentId,
        modelId: input.modelId,
      },
      {
        role: 'assistant',
        userId: undefined,
        connectionName: input.connectionName,
        toolCalls: input.toolCalls,
        contextSources: input.contextSources,
        tokens: input.tokens,
        cost: input.cost,
        latencyMs: input.latencyMs,
      }
    );
  }

  /**
   * Update a message (e.g., status, content during streaming)
   */
  async updateMessage(
    conversationId: string,
    tenantId: string,
    messageId: string,
    updates: Partial<ConversationMessage>
  ): Promise<ConversationMessage> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;
    const messageIndex = data.messages.findIndex(m => m.id === messageId);

    if (messageIndex === -1) {
      throw new Error('Message not found');
    }

    // Update message
    const message = data.messages[messageIndex];
    Object.assign(message, updates, { updatedAt: new Date() });

    // Update stats if tokens/cost changed
    if (updates.tokens || updates.cost) {
      this.recalculateStats(data);
    }

    // Save
    await this.shardRepository.update(conversationId, tenantId, {
      structuredData: data,
    });

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);

    // Broadcast real-time event if message content was updated
    if (this.conversationRealtimeService && (updates.content || updates.status)) {
      try {
        await this.conversationRealtimeService.broadcastMessageEdited(
          conversationId,
          tenantId,
          message.userId || 'system',
          message
        );
      } catch (error) {
        // Don't fail the request if broadcasting fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.broadcastMessageEdited',
          conversationId,
          tenantId,
          messageId,
        });
      }
    }

    return message;
  }

  /**
   * Edit a user message (with edit history tracking)
   * Includes conflict resolution for edits during streaming
   */
  async editMessage(
    conversationId: string,
    tenantId: string,
    messageId: string,
    userId: string,
    input: EditMessageInput
  ): Promise<ConversationMessage> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    // Check access - all participants can edit
    const data = shard.structuredData as ConversationStructuredData;
    const participant = data.participants.find(p => p.userId === userId && p.isActive);
    if (!participant) {
      throw new Error('User is not a participant in this conversation');
    }

    const messageIndex = data.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
      throw new Error('Message not found');
    }

    const message = data.messages[messageIndex];

    // Only user messages can be edited
    if (message.role !== 'user') {
      throw new Error('Only user messages can be edited');
    }

    // ============================================
    // Conflict Detection
    // ============================================

    // Check if the next message is currently streaming
    const nextMessageIndex = messageIndex + 1;
    if (nextMessageIndex < data.messages.length) {
      const nextMessage = data.messages[nextMessageIndex];
      if (nextMessage.status === 'streaming' || nextMessage.status === 'pending') {
        throw new Error(
          'Cannot edit message while assistant is generating a response. Please wait for the response to complete.'
        );
      }
    }

    // Check for optimistic locking (if message was updated since last read)
    if (input.expectedUpdatedAt && message.updatedAt) {
      const expectedTime = new Date(input.expectedUpdatedAt).getTime();
      const actualTime = new Date(message.updatedAt).getTime();
      if (Math.abs(actualTime - expectedTime) > 1000) { // 1 second tolerance
        throw new Error(
          'Message was modified by another user. Please refresh and try again.'
        );
      }
    }

    // Check if message is being edited by another user (using Redis lock)
    const lockKey = `conversation:edit:${conversationId}:${messageId}`;
    if (this.redis) {
      const lockValue = await this.redis.get(lockKey);
      if (lockValue && lockValue !== userId) {
        throw new Error(
          'Message is currently being edited by another user. Please try again in a moment.'
        );
      }

      // Acquire lock (expires in 30 seconds)
      await this.redis.setex(lockKey, 30, userId);
    }

    try {
      const now = new Date();
      const previousContent = message.content;

    // Initialize edit history if needed
    if (!message.editHistory) {
      message.editHistory = [];
      // Store original content on first edit
      message.originalContent = previousContent;
    }

    // Create edit history entry
    const editEntry: MessageEdit = {
      id: uuidv4(),
      editedAt: now,
      editedBy: userId,
      previousContent,
      newContent: input.content,
      reason: input.reason,
    };

    // Add to edit history
    message.editHistory.push(editEntry);

    // Get tenant config for edit history retention
    const maxEditHistory = await this.getEditHistoryRetention(tenantId);
    if (message.editHistory.length > maxEditHistory) {
      message.editHistory = message.editHistory.slice(-maxEditHistory);
    }

    // Update message content
    message.content = input.content;
    message.editedAt = now;
    message.editedBy = userId;
    message.updatedAt = now;

    // Update conversation
    data.lastActivityAt = now;
    if (data.stats) {
      data.stats.lastActivityAt = now;
    }

    // Save
    await this.shardRepository.update(conversationId, tenantId, {
      structuredData: data,
    });

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);

    this.monitoring.trackEvent('conversation.message.edited', {
      conversationId,
      messageId,
      tenantId,
      userId,
      editCount: message.editHistory.length,
    });

    // Broadcast real-time event
    if (this.conversationRealtimeService) {
      try {
        await this.conversationRealtimeService.broadcastMessageEdited(
          conversationId,
          tenantId,
          userId,
          message
        );
      } catch (error) {
        // Don't fail the request if broadcasting fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.broadcastMessageEdited',
          conversationId,
          tenantId,
          messageId,
        });
      }
    }

    return message;
    } finally {
      // Release lock
      if (this.redis) {
        await this.redis.del(lockKey);
      }
    }
  }

  /**
   * Regenerate the immediate next assistant response after a message edit
   * According to plan: only regenerate the immediate next response, not all subsequent
   */
  async regenerateResponseAfterEdit(
    conversationId: string,
    tenantId: string,
    editedMessageId: string,
    userId: string
  ): Promise<{ editedMessage: ConversationMessage; nextMessage?: ConversationMessage }> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;
    const editedMessageIndex = data.messages.findIndex(m => m.id === editedMessageId);

    if (editedMessageIndex === -1) {
      throw new Error('Edited message not found');
    }

    const editedMessage = data.messages[editedMessageIndex];

    // Find the immediate next assistant response
    const nextMessageIndex = editedMessageIndex + 1;
    if (nextMessageIndex >= data.messages.length) {
      // No next message, return edited message only
      return { editedMessage };
    }

    const nextMessage = data.messages[nextMessageIndex];

    // Only regenerate if it's an assistant message
    if (nextMessage.role !== 'assistant') {
      return { editedMessage, nextMessage };
    }

    // ============================================
    // Conflict Detection
    // ============================================

    // Check if message is currently streaming
    if (nextMessage.status === 'streaming' || nextMessage.status === 'pending') {
      throw new Error(
        'Cannot regenerate response while it is currently being generated. Please wait for it to complete.'
      );
    }

    // Check if message is being regenerated by another user
    const lockKey = `conversation:regenerate:${conversationId}:${nextMessage.id}`;
    if (this.redis) {
      const lockValue = await this.redis.get(lockKey);
      if (lockValue && lockValue !== userId) {
        throw new Error(
          'Response is currently being regenerated by another user. Please try again in a moment.'
        );
      }

      // Acquire lock (expires in 60 seconds - regeneration can take longer)
      await this.redis.setex(lockKey, 60, userId);
    }

    try {
      // Mark the next message for regeneration
      // The actual regeneration will be handled by the insight service
      // This method just marks it and returns the message to be regenerated
      nextMessage.status = 'pending';
      nextMessage.isRegenerated = true;
      nextMessage.regeneratedFrom = nextMessage.id;
      nextMessage.regenerationCount = (nextMessage.regenerationCount || 0) + 1;
      nextMessage.updatedAt = new Date();

      // Save
      await this.shardRepository.update(conversationId, tenantId, {
        structuredData: data,
      });

      // Invalidate cache
      await this.invalidateCache(conversationId, tenantId);

      this.monitoring.trackEvent('conversation.message.regenerate_after_edit', {
        conversationId,
        editedMessageId,
        nextMessageId: nextMessage.id,
        tenantId,
        userId,
      });

      return { editedMessage, nextMessage };
    } finally {
      // Release lock
      if (this.redis) {
        await this.redis.del(lockKey);
      }
    }
  }

  /**
   * Get messages with pagination (includes archived messages with lazy-loading)
   * Optimized for performance: only loads archived messages needed for the requested page
   */
  async getMessages(
    conversationId: string,
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      branchIndex?: number;
      afterMessageId?: string;
      includeArchived?: boolean;
      fields?: string[]; // Optional: only return specified fields for performance
    } = {}
  ): Promise<{ messages: ConversationMessage[]; total: number; hasMore: boolean }> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    // Get active messages (always loaded)
    let activeMessages = [...data.messages]; // Copy to avoid mutating

    // Filter by branch
    if (options.branchIndex !== undefined) {
      activeMessages = activeMessages.filter(m => m.branchIndex === options.branchIndex);
    }

    // Filter after message ID
    if (options.afterMessageId) {
      const afterIndex = activeMessages.findIndex(m => m.id === options.afterMessageId);
      if (afterIndex !== -1) {
        activeMessages = activeMessages.slice(afterIndex + 1);
      }
    }

    // If not including archived, return only active messages
    if (!options.includeArchived) {
      const total = activeMessages.length;
      const paginatedMessages = activeMessages.slice(offset, offset + limit);

      return {
        messages: this.selectFields(paginatedMessages, options.fields),
        total,
        hasMore: offset + paginatedMessages.length < total,
      };
    }

    // ============================================
    // Lazy-load archived messages (only what's needed)
    // ============================================

    // Get archived message shard relationships
    const archivedRelations = shard.internal_relationships?.filter(
      rel => rel.shardTypeId === ARCHIVED_MESSAGE_TYPE_NAME
    ) || [];

    if (archivedRelations.length === 0) {
      // No archived messages, return only active
      const total = activeMessages.length;
      const paginatedMessages = activeMessages.slice(offset, offset + limit);

      return {
        messages: this.selectFields(paginatedMessages, options.fields),
        total,
        hasMore: offset + paginatedMessages.length < total,
      };
    }

    // Count total messages (active + archived) for pagination
    // We need to know how many archived messages exist to calculate offsets correctly
    let totalArchivedMessages = 0;
    const archivedShardInfo: Array<{ shardId: string; messageCount: number; firstMessageId?: string; lastMessageId?: string }> = [];

    // Get metadata from archived shards (lightweight query - just get message counts)
    // Try cache first for archived shard metadata
    const cacheKey = `${CACHE_PREFIX}${tenantId}:${conversationId}:archived:meta`;
    let cachedMeta: Array<{ shardId: string; messageCount: number; firstMessageId?: string; lastMessageId?: string }> | null = null;
    
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          cachedMeta = JSON.parse(cached);
        }
      } catch (error) {
        // Cache read failed, continue without cache
      }
    }

    if (cachedMeta && cachedMeta.length === archivedRelations.length) {
      // Use cached metadata
      archivedShardInfo.push(...cachedMeta);
      totalArchivedMessages = cachedMeta.reduce((sum, info) => sum + info.messageCount, 0);
    } else {
      // Load metadata from archived shards
      for (const rel of archivedRelations) {
        try {
          const archivedShard = await this.shardRepository.findById(rel.shardId, tenantId);
          if (archivedShard && archivedShard.structuredData) {
            const archivedData = archivedShard.structuredData as { 
              messageCount?: number; 
              messages?: ConversationMessage[];
              firstMessageId?: string; 
              lastMessageId?: string;
            };
            
            // Get message count - either from metadata or count messages array
            const count = archivedData.messageCount || 
              (archivedData.messages ? archivedData.messages.length : 0);
            
            totalArchivedMessages += count;
            archivedShardInfo.push({
              shardId: rel.shardId,
              messageCount: count,
              firstMessageId: archivedData.firstMessageId || archivedData.messages?.[0]?.id,
              lastMessageId: archivedData.lastMessageId || archivedData.messages?.[archivedData.messages.length - 1]?.id,
            });
          }
        } catch (error) {
          this.monitoring.trackException(error as Error, {
            operation: 'conversation.getMessages.countArchived',
            conversationId,
            archivedShardId: rel.shardId,
            tenantId,
          });
          // Continue if archived message load fails
        }
      }

      // Cache metadata for future requests
      if (this.redis && archivedShardInfo.length > 0) {
        try {
          await this.redis.setex(cacheKey, ARCHIVED_MESSAGES_CACHE_TTL, JSON.stringify(archivedShardInfo));
        } catch (error) {
          // Cache write failed, continue without cache
        }
      }
    }

    const totalMessages = totalArchivedMessages + activeMessages.length;

    // Determine which messages we need to load
    // Archived messages come first (they're older), then active messages
    const allMessages: ConversationMessage[] = [];
    let loadedArchivedCount = 0;

    // If offset is within archived range, load archived messages
    if (offset < totalArchivedMessages) {
      // Calculate which archived shards we need
      let currentOffset = offset;
      let remainingLimit = limit;

      // Load archived messages from oldest to newest (reverse order of archivedRelations)
      // Archived shards are typically ordered by creation time (oldest first)
      for (let i = archivedRelations.length - 1; i >= 0 && remainingLimit > 0; i--) {
        const rel = archivedRelations[i];
        const shardInfo = archivedShardInfo.find(info => info.shardId === rel.shardId);
        
        if (!shardInfo || shardInfo.messageCount === 0) {continue;}

        // Check if we need messages from this shard
        const shardStartOffset = loadedArchivedCount;
        const shardEndOffset = loadedArchivedCount + shardInfo.messageCount;

        if (currentOffset < shardEndOffset && remainingLimit > 0) {
          // We need at least some messages from this shard
          try {
            const archivedShard = await this.shardRepository.findById(rel.shardId, tenantId);
            if (archivedShard && archivedShard.structuredData) {
              const archivedData = archivedShard.structuredData as { messages: ConversationMessage[] };
              if (archivedData.messages && archivedData.messages.length > 0) {
                // Calculate slice within this shard
                const shardOffset = Math.max(0, currentOffset - shardStartOffset);
                const shardLimit = Math.min(
                  remainingLimit,
                  shardInfo.messageCount - shardOffset
                );

                const shardMessages = archivedData.messages.slice(shardOffset, shardOffset + shardLimit);
                
                // Filter by branch if needed
                const filteredShardMessages = options.branchIndex !== undefined
                  ? shardMessages.filter(m => m.branchIndex === options.branchIndex)
                  : shardMessages;

                allMessages.push(...filteredShardMessages);
                remainingLimit -= filteredShardMessages.length;
                currentOffset = shardEndOffset; // Move past this shard
              }
            }
          } catch (error) {
            this.monitoring.trackException(error as Error, {
              operation: 'conversation.getMessages.loadArchived',
              conversationId,
              archivedShardId: rel.shardId,
              tenantId,
            });
            // Continue if archived message load fails
          }
        }

        loadedArchivedCount += shardInfo.messageCount;
      }
    }

    // If we still need more messages, add active messages
    const activeOffset = Math.max(0, offset - totalArchivedMessages);
    const activeLimit = limit - allMessages.length;

    if (activeLimit > 0 && activeOffset < activeMessages.length) {
      const activeSlice = activeMessages.slice(activeOffset, activeOffset + activeLimit);
      allMessages.push(...activeSlice);
    }

    // Apply field selection if specified
    const selectedMessages = this.selectFields(allMessages, options.fields);

    return {
      messages: selectedMessages,
      total: totalMessages,
      hasMore: offset + selectedMessages.length < totalMessages,
    };
  }

  /**
   * Select only specified fields from messages (for performance optimization)
   */
  private selectFields(
    messages: ConversationMessage[],
    fields?: string[]
  ): ConversationMessage[] {
    if (!fields || fields.length === 0) {
      return messages;
    }

    // If 'content' is not in fields, we can exclude large content fields
    const includeContent = fields.includes('content');
    const includeContextSources = fields.includes('contextSources');
    const includeAttachments = fields.includes('attachments');
    const includeEditHistory = fields.includes('editHistory');
    const includeComments = fields.includes('comments');

    return messages.map(msg => {
      const selected: Partial<ConversationMessage> = {
        id: msg.id,
        role: msg.role,
        createdAt: msg.createdAt,
      };

      // Add fields as requested
      if (fields.includes('parentId')) {selected.parentId = msg.parentId;}
      if (fields.includes('branchIndex')) {selected.branchIndex = msg.branchIndex;}
      if (fields.includes('userId')) {selected.userId = msg.userId;}
      if (fields.includes('modelId')) {selected.modelId = msg.modelId;}
      if (fields.includes('contentType')) {selected.contentType = msg.contentType;}
      if (fields.includes('status')) {selected.status = msg.status;}
      if (fields.includes('updatedAt')) {selected.updatedAt = msg.updatedAt;}
      if (fields.includes('editedAt')) {selected.editedAt = msg.editedAt;}
      if (fields.includes('editedBy')) {selected.editedBy = msg.editedBy;}

      // Large fields - only include if explicitly requested
      if (includeContent) {selected.content = msg.content;}
      if (includeContextSources) {selected.contextSources = msg.contextSources;}
      if (includeAttachments) {selected.attachments = msg.attachments;}
      if (includeEditHistory) {selected.editHistory = msg.editHistory;}
      if (includeComments) {selected.comments = msg.comments;}

      // Metadata fields
      if (fields.includes('tokens')) {selected.tokens = msg.tokens;}
      if (fields.includes('cost')) {selected.cost = msg.cost;}
      if (fields.includes('latencyMs')) {selected.latencyMs = msg.latencyMs;}
      if (fields.includes('feedback')) {selected.feedback = msg.feedback;}

      return selected as ConversationMessage;
    });
  }

  // ============================================
  // Participants
  // ============================================

  /**
   * Add a participant to the conversation
   */
  async addParticipant(
    conversationId: string,
    tenantId: string,
    userId: string,
    participantUserId: string,
    role: ParticipantRole = 'participant'
  ): Promise<void> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;

    // Check if already a participant
    const existing = data.participants.find(p => p.userId === participantUserId);
    if (existing) {
      // Reactivate if inactive
      if (!existing.isActive) {
        existing.isActive = true;
        existing.leftAt = undefined;
      }
      return;
    }

    // Add participant
    data.participants.push({
      userId: participantUserId,
      role,
      joinedAt: new Date(),
      isActive: true,
    });

    data.participantCount = data.participants.filter(p => p.isActive).length;
    if (data.stats) {
      data.stats.participantCount = data.participantCount;
    }

    // Save
    await this.shardRepository.update(conversationId, tenantId, {
      structuredData: data,
    });

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);

    this.monitoring.trackEvent('conversation.participant.added', {
      conversationId,
      tenantId,
      userId: participantUserId,
      role,
    });

    // Broadcast real-time event
    if (this.conversationRealtimeService) {
      try {
        await this.conversationRealtimeService.broadcastConversationUpdated(
          conversationId,
          tenantId,
          userId
        );
      } catch (error) {
        // Don't fail the request if broadcasting fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.broadcastConversationUpdated',
          conversationId,
          tenantId,
        });
      }
    }
  }

  /**
   * Remove a participant from the conversation
   */
  async removeParticipant(
    conversationId: string,
    tenantId: string,
    userId: string,
    participantUserId: string
  ): Promise<void> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;
    const participant = data.participants.find(p => p.userId === participantUserId);

    if (!participant) {
      throw new Error('Participant not found');
    }

    // Don't allow removing the owner
    if (participant.role === 'owner') {
      throw new Error('Cannot remove conversation owner');
    }

    // Mark as inactive
    participant.isActive = false;
    participant.leftAt = new Date();

    data.participantCount = data.participants.filter(p => p.isActive).length;
    if (data.stats) {
      data.stats.participantCount = data.participantCount;
    }

    // Save
    await this.shardRepository.update(conversationId, tenantId, {
      structuredData: data,
    });

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);

    this.monitoring.trackEvent('conversation.participant.removed', {
      conversationId,
      tenantId,
      userId: participantUserId,
    });

    // Broadcast real-time event
    if (this.conversationRealtimeService) {
      try {
        await this.conversationRealtimeService.broadcastConversationUpdated(
          conversationId,
          tenantId,
          userId
        );
      } catch (error) {
        // Don't fail the request if broadcasting fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.broadcastConversationUpdated',
          conversationId,
          tenantId,
        });
      }
    }
  }

  // ============================================
  // Feedback
  // ============================================

  /**
   * Add feedback to a message
   */
  async addFeedback(
    conversationId: string,
    tenantId: string,
    messageId: string,
    userId: string,
    input: AddFeedbackInput
  ): Promise<MessageFeedback> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;
    const message = data.messages.find(m => m.id === messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    // Create or update feedback
    const feedback: MessageFeedback = {
      id: message.feedback?.id || uuidv4(),
      userId,
      rating: input.rating,
      thumbs: input.thumbs,
      categories: input.categories,
      comment: input.comment,
      regenerateRequested: input.regenerateRequested || false,
      reportedAsHarmful: input.reportedAsHarmful || false,
      createdAt: message.feedback?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    message.feedback = feedback;

    // Update stats
    if (data.stats) {
      data.stats.feedbackCount = data.messages.filter(m => m.feedback).length;

      // Calculate average rating
      const ratings = data.messages
        .filter(m => m.feedback?.rating !== undefined)
        .map(m => m.feedback!.rating!);
      if (ratings.length > 0) {
        data.stats.averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      }
    }

    // Save
    await this.shardRepository.update(conversationId, tenantId, {
      structuredData: data,
    });

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);

    this.monitoring.trackEvent('conversation.feedback.added', {
      conversationId,
      messageId,
      tenantId,
      userId,
      rating: input.rating,
      thumbs: input.thumbs,
    });

    // Phase 6.2: Record feedback in learning system for analysis and improvement
    if (this.userFeedbackService && message.role === 'assistant') {
      try {
        // Convert MessageFeedback to FeedbackEntry format
        const rating = input.rating 
          ? (input.rating >= 4 ? 'positive' : input.rating <= 2 ? 'negative' : 'neutral')
          : (input.thumbs === 'up' ? 'positive' : input.thumbs === 'down' ? 'negative' : 'neutral');

        await this.userFeedbackService.recordFeedback({
          tenantId,
          userId,
          conversationId,
          messageId,
          query: data.messages.find(m => m.role === 'user' && m.id === message.parentId)?.content || '',
          response: message.content,
          modelId: message.modelId || 'unknown',
          insightType: undefined, // metadata not available in ConversationStructuredData
          contextTemplateId: data.templateId,
          rating,
          thumbs: input.thumbs,
          score: input.rating,
          categories: input.categories,
          comment: input.comment,
          wasRegenerated: message.isRegenerated || false,
          latencyMs: message.latencyMs,
          tokensUsed: message.tokens?.total,
        });
      } catch (error) {
        // Non-blocking: if feedback learning fails, don't fail the feedback submission
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.feedback.record-learning',
          conversationId,
          messageId,
          tenantId,
        });
      }
    }

    return feedback;
  }

  // ============================================
  // Phase 5.1: Message Pinning
  // ============================================

  /**
   * Pin a message (always keep in context)
   */
  async pinMessage(
    conversationId: string,
    tenantId: string,
    messageId: string,
    userId: string
  ): Promise<ConversationMessage> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;
    const messageIndex = data.messages.findIndex(m => m.id === messageId);

    if (messageIndex === -1) {
      throw new Error('Message not found');
    }

    // Check access - all participants can pin messages
    const participant = data.participants.find(p => p.userId === userId && p.isActive);
    if (!participant) {
      throw new Error('User is not a participant in this conversation');
    }

    const message = data.messages[messageIndex];
    const now = new Date();

    // Pin the message
    message.pinned = true;
    message.pinnedAt = now;
    message.pinnedBy = userId;
    message.updatedAt = now;

    // Save
    await this.shardRepository.update(conversationId, tenantId, {
      structuredData: data,
    });

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);

    this.monitoring.trackEvent('conversation.message.pinned', {
      conversationId,
      messageId,
      tenantId,
      userId,
    });

    // Broadcast real-time event
    if (this.conversationRealtimeService) {
      try {
        await this.conversationRealtimeService.broadcastMessageEdited(
          conversationId,
          tenantId,
          userId,
          message
        );
      } catch (error) {
        // Don't fail the request if broadcasting fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.broadcastMessagePinned',
          conversationId,
          tenantId,
          messageId,
        });
      }
    }

    return message;
  }

  /**
   * Unpin a message
   */
  async unpinMessage(
    conversationId: string,
    tenantId: string,
    messageId: string,
    userId: string
  ): Promise<ConversationMessage> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;
    const messageIndex = data.messages.findIndex(m => m.id === messageId);

    if (messageIndex === -1) {
      throw new Error('Message not found');
    }

    // Check access - all participants can unpin messages
    const participant = data.participants.find(p => p.userId === userId && p.isActive);
    if (!participant) {
      throw new Error('User is not a participant in this conversation');
    }

    const message = data.messages[messageIndex];

    // Unpin the message
    message.pinned = false;
    message.pinnedAt = undefined;
    message.pinnedBy = undefined;
    message.updatedAt = new Date();

    // Save
    await this.shardRepository.update(conversationId, tenantId, {
      structuredData: data,
    });

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);

    this.monitoring.trackEvent('conversation.message.unpinned', {
      conversationId,
      messageId,
      tenantId,
      userId,
    });

    // Broadcast real-time event
    if (this.conversationRealtimeService) {
      try {
        await this.conversationRealtimeService.broadcastMessageEdited(
          conversationId,
          tenantId,
          userId,
          message
        );
      } catch (error) {
        // Don't fail the request if broadcasting fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.broadcastMessageUnpinned',
          conversationId,
          tenantId,
          messageId,
        });
      }
    }

    return message;
  }

  /**
   * Get all pinned messages in a conversation
   */
  async getPinnedMessages(
    conversationId: string,
    tenantId: string
  ): Promise<ConversationMessage[]> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;
    return data.messages.filter(m => m.pinned === true);
  }

  /**
   * Phase 5.1: Get AI suggestions for which messages should be pinned
   * Analyzes conversation messages and suggests important ones to pin
   */
  async suggestImportantMessages(
    conversationId: string,
    tenantId: string,
    options: {
      maxSuggestions?: number; // Maximum number of suggestions (default: 5)
      minImportanceScore?: number; // Minimum importance score (0-1, default: 0.7)
      analyzeUnpinnedOnly?: boolean; // Only analyze unpinned messages (default: true)
    } = {}
  ): Promise<Array<{
    messageId: string;
    importanceScore: number;
    reasoning: string;
    suggestedAction: 'pin' | 'consider';
  }>> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;
    const maxSuggestions = options.maxSuggestions ?? 5;
    const minImportanceScore = options.minImportanceScore ?? 0.7;
    const analyzeUnpinnedOnly = options.analyzeUnpinnedOnly !== false;

    // Filter messages to analyze
    let messagesToAnalyze = data.messages;
    if (analyzeUnpinnedOnly) {
      messagesToAnalyze = messagesToAnalyze.filter(m => !m.pinned);
    }

    if (messagesToAnalyze.length === 0) {
      return [];
    }

    // Use AI to analyze message importance if available
    if (this.unifiedAIClient && this.aiConnectionService) {
      try {
        return await this.analyzeMessageImportanceWithAI(
          tenantId,
          messagesToAnalyze,
          maxSuggestions,
          minImportanceScore
        );
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.suggestImportantMessages.ai',
          conversationId,
          tenantId,
        });
        // Fall through to rule-based analysis
      }
    }

    // Fallback to rule-based importance analysis
    return this.analyzeMessageImportanceRuleBased(
      messagesToAnalyze,
      maxSuggestions,
      minImportanceScore
    );
  }

  /**
   * Phase 5.1: Analyze message importance using AI
   */
  private async analyzeMessageImportanceWithAI(
    tenantId: string,
    messages: ConversationMessage[],
    maxSuggestions: number,
    minImportanceScore: number
  ): Promise<Array<{
    messageId: string;
    importanceScore: number;
    reasoning: string;
    suggestedAction: 'pin' | 'consider';
  }>> {
    if (!this.unifiedAIClient || !this.aiConnectionService) {
      throw new Error('AI services not available');
    }

    // Build prompt for AI analysis
    const messagesText = messages
      .map((m, idx) => {
        const role = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System';
        const content = m.content.substring(0, 500); // Limit content length
        return `[${idx + 1}] ${role} (ID: ${m.id}): ${content}`;
      })
      .join('\n\n');

    const prompt = `Analyze the following conversation messages and identify which ones are important and should be pinned for future reference.

Consider:
- Key decisions or conclusions
- Important facts or information
- Action items or commitments
- Critical context that should be preserved
- Questions that need follow-up

For each important message, provide:
- messageId: The message ID
- importanceScore: A score from 0.0 to 1.0 indicating importance
- reasoning: Brief explanation of why it's important
- suggestedAction: "pin" for highly important (score >= 0.8), "consider" for moderately important (score >= 0.7)

Return a JSON array of suggestions, sorted by importance score (highest first).

Messages:
${messagesText}

Provide JSON response:`;

    try {
      const defaultConnection = await this.aiConnectionService.getDefaultConnection(tenantId, 'LLM');
      if (!defaultConnection) {
        throw new Error('No AI connection available');
      }

      const response = await this.unifiedAIClient.chat(
        defaultConnection.connection,
        defaultConnection.apiKey,
        {
          messages: [
            {
              role: 'system',
              content: 'You are an expert at analyzing conversation importance. Identify messages that contain key decisions, facts, or context that should be preserved.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent analysis
          maxTokens: 1000,
        }
      );

      // Parse JSON response
      let parsed: any[];
      try {
        const content = response.content.trim();
        const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          parsed = JSON.parse(content);
        }
      } catch (parseError) {
        this.monitoring.trackException(parseError as Error, {
          operation: 'conversation.analyzeMessageImportance.parse',
        });
        // Fall through to rule-based
        return this.analyzeMessageImportanceRuleBased(messages, maxSuggestions, minImportanceScore);
      }

      // Validate and filter results
      const suggestions = parsed
        .filter((s: any) => {
          return (
            s.messageId &&
            typeof s.importanceScore === 'number' &&
            s.importanceScore >= minImportanceScore &&
            s.reasoning &&
            (s.suggestedAction === 'pin' || s.suggestedAction === 'consider')
          );
        })
        .map((s: any) => ({
          messageId: String(s.messageId || ''),
          importanceScore: Math.min(1, Math.max(0, s.importanceScore)),
          reasoning: String(s.reasoning || 'AI-identified as important'),
          suggestedAction: (s.importanceScore >= 0.8 ? 'pin' : 'consider') as 'pin' | 'consider',
        }))
        .sort((a, b) => b.importanceScore - a.importanceScore)
        .slice(0, maxSuggestions);

      this.monitoring.trackEvent('conversation.message-importance.analyzed-ai', {
        messagesAnalyzed: messages.length,
        suggestionsFound: suggestions.length,
      });

      return suggestions;
    } catch (error: unknown) {
      this.monitoring.trackException(error as Error, {
        operation: 'conversation.analyzeMessageImportance.ai',
      });
      throw error;
    }
  }

  /**
   * Phase 5.1: Rule-based message importance analysis (fallback)
   */
  private analyzeMessageImportanceRuleBased(
    messages: ConversationMessage[],
    maxSuggestions: number,
    minImportanceScore: number
  ): Array<{
    messageId: string;
    importanceScore: number;
    reasoning: string;
    suggestedAction: 'pin' | 'consider';
  }> {
    const suggestions: Array<{
      messageId: string;
      importanceScore: number;
      reasoning: string;
      suggestedAction: 'pin' | 'consider';
    }> = [];

    // Rule-based heuristics for importance
    for (const message of messages) {
      let score = 0;
      const reasons: string[] = [];

      // Check for decision keywords
      const decisionKeywords = ['decided', 'decision', 'conclusion', 'agreed', 'chose', 'selected', 'approved'];
      const hasDecisionKeywords = decisionKeywords.some(kw => 
        message.content.toLowerCase().includes(kw)
      );
      if (hasDecisionKeywords) {
        score += 0.3;
        reasons.push('Contains decision keywords');
      }

      // Check for action items
      const actionKeywords = ['action', 'todo', 'task', 'need to', 'will', 'should', 'must'];
      const hasActionKeywords = actionKeywords.some(kw => 
        message.content.toLowerCase().includes(kw)
      );
      if (hasActionKeywords) {
        score += 0.2;
        reasons.push('Contains action items');
      }

      // Check for important facts (numbers, dates, names)
      const hasNumbers = /\d+/.test(message.content);
      const hasDates = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(message.content);
      const hasNames = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(message.content);
      if (hasNumbers || hasDates || hasNames) {
        score += 0.15;
        reasons.push('Contains factual information');
      }

      // Check message length (longer messages often contain more context)
      if (message.content.length > 200) {
        score += 0.1;
        reasons.push('Contains substantial content');
      }

      // Check for questions (may need follow-up)
      if (message.content.includes('?') && message.role === 'user') {
        score += 0.1;
        reasons.push('Contains important question');
      }

      // Check for assistant messages with citations (often contain important information)
      if (message.role === 'assistant' && message.contextSources && message.contextSources.length > 0) {
        score += 0.15;
        reasons.push('Contains cited information');
      }

      // Check for positive feedback (indicates important/helpful message)
      if (message.feedback?.rating && message.feedback.rating >= 4) {
        score += 0.2;
        reasons.push('Received positive feedback');
      }

      // Normalize score to 0-1 range
      score = Math.min(1, score);

      if (score >= minImportanceScore) {
        suggestions.push({
          messageId: message.id,
          importanceScore: score,
          reasoning: reasons.join('; ') || 'Rule-based analysis indicates importance',
          suggestedAction: score >= 0.8 ? 'pin' : 'consider',
        });
      }
    }

    // Sort by score and limit
    return suggestions
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, maxSuggestions);
  }

  // ============================================
  // Branching
  // ============================================

  /**
   * Get the next branch index for a parent message
   */
  private getNextBranchIndex(messages: ConversationMessage[], parentId: string): number {
    const children = messages.filter(m => m.parentId === parentId);
    if (children.length === 0) {return 1;}
    return Math.max(...children.map(c => c.branchIndex)) + 1;
  }

  /**
   * Get all branches for a conversation
   */
  async getBranches(
    conversationId: string,
    tenantId: string
  ): Promise<
    {
      branchIndex: number;
      parentMessageId?: string;
      messageCount: number;
      createdAt: Date;
    }[]
  > {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;

    // Group messages by branch
    const branches = new Map<
      number,
      { parentMessageId?: string; messages: ConversationMessage[] }
    >();

    for (const message of data.messages) {
      if (!branches.has(message.branchIndex)) {
        branches.set(message.branchIndex, {
          parentMessageId: message.parentId,
          messages: [],
        });
      }
      branches.get(message.branchIndex)!.messages.push(message);
    }

    return Array.from(branches.entries()).map(([branchIndex, branch]) => ({
      branchIndex,
      parentMessageId: branch.parentMessageId,
      messageCount: branch.messages.length,
      createdAt: branch.messages[0]?.createdAt || new Date(),
    }));
  }

  // ============================================
  // Stats & Summary
  // ============================================

  /**
   * Recalculate conversation statistics
   */
  private recalculateStats(data: ConversationStructuredData): void {
    const messages = data.messages;

    const stats: ConversationStats = {
      messageCount: messages.length,
      userMessageCount: messages.filter(m => m.role === 'user').length,
      assistantMessageCount: messages.filter(m => m.role === 'assistant').length,
      toolCallCount: messages.reduce((sum, m) => sum + (m.toolCalls?.length || 0), 0),
      totalTokens: messages.reduce((sum, m) => sum + (m.tokens?.total || 0), 0),
      totalCost: messages.reduce((sum, m) => sum + (m.cost || 0), 0),
      averageLatencyMs:
        messages.filter(m => m.latencyMs).length > 0
          ? messages.reduce((sum, m) => sum + (m.latencyMs || 0), 0) /
            messages.filter(m => m.latencyMs).length
          : 0,
      participantCount: data.participants.filter(p => p.isActive).length,
      branchCount: new Set(messages.map(m => m.branchIndex)).size,
      feedbackCount: messages.filter(m => m.feedback).length,
      averageRating: undefined,
      lastActivityAt:
        messages.length > 0
          ? messages.reduce((latest, m) => {
              const mDate = new Date(m.createdAt);
              return mDate > latest ? mDate : latest;
            }, new Date(0))
          : new Date(),
    };

    // Calculate average rating
    const ratings = messages
      .filter(m => m.feedback?.rating !== undefined)
      .map(m => m.feedback!.rating!);
    if (ratings.length > 0) {
      stats.averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    }

    data.stats = stats;

    // Update denormalized fields
    data.messageCount = stats.messageCount;
    data.participantCount = stats.participantCount;
    data.totalTokens = stats.totalTokens;
    data.totalCost = stats.totalCost;
    data.lastActivityAt = stats.lastActivityAt;
  }

  /**
   * Generate a summary for the conversation (AI-powered if available, otherwise simple)
   */
  async generateSummary(
    conversationId: string,
    tenantId: string,
    options?: {
      forceAI?: boolean; // Force AI generation even if simple summary exists
      maxMessages?: number; // Limit messages included in summary context
    }
  ): Promise<string> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;

    // If AI services are available, use AI to generate summary
    if (this.unifiedAIClient && this.aiConnectionService && (options?.forceAI || !data.summary)) {
      try {
        return await this.generateAISummary(conversationId, tenantId, data, options?.maxMessages);
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.generateAISummary',
          conversationId,
          tenantId,
        });
        // Fall through to simple summary on error
      }
    }

    // Simple summary based on first few messages (fallback)
    const userMessages = data.messages
      .filter(m => m.role === 'user')
      .slice(0, 3)
      .map(m => m.content.substring(0, 100));

    if (userMessages.length === 0) {
      return 'Empty conversation';
    }

    return `Conversation about: ${userMessages.join(', ')}...`;
  }

  /**
   * Auto-generate summary when message count reaches trigger interval
   */
  /**
   * Phase 5.1: Enhanced auto-generate summary using ConversationSummarizationService
   */
  private async autoGenerateSummary(
    conversationId: string,
    tenantId: string,
    data: ConversationStructuredData
  ): Promise<void> {
    // Use enhanced summarization service if available
    if (this.summarizationService) {
      try {
        const config = await this.getConversationConfig(tenantId);
        const preserveRecent = config.preserveRecentMessages || 10;
        
        const result = await this.summarizationService.summarizeConversation(
          data.messages,
          {
            preserveRecentMessages: preserveRecent,
            preservePinnedMessages: true,
            includeDecisions: true,
            includeFacts: true,
            includeActionItems: true,
          }
        );

        // Update conversation with enhanced summary
        // Store both the text summary and structured data
        const enhancedSummary = `Summary: ${result.summary.summary}\n\n` +
          (result.summary.keyDecisions.length > 0 
            ? `Key Decisions: ${result.summary.keyDecisions.join('; ')}\n\n` 
            : '') +
          (result.summary.keyFacts.length > 0 
            ? `Key Facts: ${result.summary.keyFacts.join('; ')}\n\n` 
            : '') +
          (result.summary.actionItems.length > 0 
            ? `Action Items: ${result.summary.actionItems.join('; ')}` 
            : '');

        data.summary = enhancedSummary;
        
        // Store structured summary data in metadata if available
        (data as any).summaryData = {
          keyDecisions: result.summary.keyDecisions,
          keyFacts: result.summary.keyFacts,
          topics: result.summary.topics,
          entities: result.summary.entities,
          actionItems: result.summary.actionItems,
          sentiment: result.summary.sentiment,
          tokensSaved: result.totalTokensSaved,
        };
        
        await this.shardRepository.update(conversationId, tenantId, {
          structuredData: data,
        });

        this.monitoring.trackEvent('conversation.summary.autoGenerated', {
          conversationId,
          tenantId,
          messageCount: data.messages.length,
          tokensSaved: result.totalTokensSaved,
          method: 'enhanced',
        });
      } catch (error) {
        // Fallback to legacy method if enhanced summarization fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.autoGenerateSummary.enhanced',
          conversationId,
          tenantId,
        });
        // Fall through to legacy method
      }
    }

    // Legacy summarization method (fallback)
    if (!this.summarizationService && this.unifiedAIClient && this.aiConnectionService) {
      const summary = await this.generateAISummary(conversationId, tenantId, data, SUMMARY_MAX_MESSAGES);
      
      // Update conversation with new summary
      data.summary = summary;
      
      await this.shardRepository.update(conversationId, tenantId, {
        structuredData: data,
      });

      this.monitoring.trackEvent('conversation.summary.autoGenerated', {
        conversationId,
        tenantId,
        messageCount: data.messages.length,
        method: 'legacy',
      });
    }
  }

  /**
   * Generate AI-powered summary using LLM
   */
  private async generateAISummary(
    conversationId: string,
    tenantId: string,
    data: ConversationStructuredData,
    maxMessages?: number
  ): Promise<string> {
    if (!this.unifiedAIClient || !this.aiConnectionService) {
      throw new Error('AI services not available for summary generation');
    }

    // Get recent messages for summary context
    const messagesToSummarize = maxMessages 
      ? data.messages.slice(-maxMessages)
      : data.messages;

    if (messagesToSummarize.length === 0) {
      return 'Empty conversation';
    }

    // Build conversation text for summarization
    const conversationText = messagesToSummarize
      .map(msg => {
        const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    // Get default AI connection for summarization
    const defaultConnection = await this.aiConnectionService.getDefaultConnection(tenantId, 'LLM');
    if (!defaultConnection) {
      throw new Error('No AI connection available for summary generation');
    }

    const systemPrompt = `You are a conversation summarization assistant. Generate a concise, informative summary (2-3 sentences) of the following conversation. Focus on:
- Main topics discussed
- Key decisions or conclusions
- Important questions or requests

Keep the summary professional and factual.`;

    const userPrompt = `Please summarize this conversation:\n\n${conversationText}`;

    try {
      const response = await this.unifiedAIClient.chat(
        defaultConnection.connection,
        defaultConnection.apiKey,
        {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3, // Lower temperature for more factual summaries
          maxTokens: 200, // Keep summaries concise
        }
      );

      this.monitoring.trackEvent('conversation.summary.aiGenerated', {
        conversationId,
        tenantId,
        messageCount: messagesToSummarize.length,
        tokensUsed: response.usage.totalTokens,
      });

      return response.content.trim();
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'conversation.generateAISummary',
        conversationId,
        tenantId,
      });
      throw error;
    }
  }

  // ============================================
  // Cache Management
  // ============================================

  /**
   * Invalidate conversation cache
   */
  private async invalidateCache(conversationId: string, tenantId: string): Promise<void> {
    if (!this.redis) {return;}

    const key = `${CACHE_PREFIX}${tenantId}:${conversationId}`;
    await this.redis.del(key);
  }

  // ============================================
  // Helpers
  // ============================================

  /**
   * Get the conversation ShardType ID for a tenant
   */
  private async getConversationShardTypeId(tenantId: string): Promise<string> {
    // Query for the conversation ShardType
    const result = await this.shardTypeRepository.list({ filter: { tenantId }, limit: 100 });
    const conversationType = result.shardTypes.find(st => st.name === CONVERSATION_TYPE_NAME);

    if (!conversationType) {
      throw new Error('Conversation ShardType not found. Please seed core types.');
    }

    return conversationType.id;
  }

  /**
   * Check if a user can access a conversation
   */
  async canAccess(
    conversationId: string,
    tenantId: string,
    userId: string
  ): Promise<{ canRead: boolean; canWrite: boolean; role?: ParticipantRole }> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      return { canRead: false, canWrite: false };
    }

    const data = shard.structuredData as ConversationStructuredData;

    // Check visibility
    if (data.visibility === 'public') {
      // Public - anyone in tenant can read
      const participant = data.participants.find(p => p.userId === userId && p.isActive);
      return {
        canRead: true,
        canWrite: !!participant,
        role: participant?.role,
      };
    }

    if (data.visibility === 'shared') {
      // Shared - participants can read/write
      const participant = data.participants.find(p => p.userId === userId && p.isActive);
      return {
        canRead: !!participant,
        canWrite: !!participant && participant.role !== 'viewer',
        role: participant?.role,
      };
    }

    // Private - only owner
    const participant = data.participants.find(p => p.userId === userId && p.isActive);
    const isOwner = participant?.role === 'owner';
    return {
      canRead: isOwner,
      canWrite: isOwner,
      role: participant?.role,
    };
  }

  // ============================================
  // Message Archiving
  // ============================================

  /**
   * Archive old messages when conversation exceeds limit or size threshold
   * Keeps last KEEP_RECENT_MESSAGES messages in main shard, archives the rest
   * Can also archive based on shard size (when sizeBased is true)
   */
  private async archiveOldMessages(
    conversationId: string,
    tenantId: string,
    userId: string,
    data: ConversationStructuredData,
    sizeBased = false
  ): Promise<void> {
    const messageLimit = (data as any).messageLimit || DEFAULT_MESSAGE_LIMIT;
    
    // Calculate how many messages to archive
    let messagesToKeep = KEEP_RECENT_MESSAGES;
    let messagesToArchive = 0;
    
    if (sizeBased) {
      // Size-based archiving: archive more aggressively to get well below threshold
      // Keep fewer messages to ensure we're well under the limit
      messagesToKeep = Math.max(50, Math.floor(KEEP_RECENT_MESSAGES * 0.5)); // Keep at least 50, or half of normal
      messagesToArchive = data.messages.length - messagesToKeep;
      
      // If still too large after this, archive more
      if (messagesToArchive > 0) {
        const testData = { ...data, messages: data.messages.slice(messagesToArchive) };
        const testShard = await this.get(conversationId, tenantId);
        if (testShard) {
          const testSize = this.estimateShardSize(testShard, testData);
          // If still above threshold, archive more (keep only last 50)
          if (testSize >= MAX_SHARD_SIZE_BYTES) {
            messagesToKeep = 50;
            messagesToArchive = data.messages.length - messagesToKeep;
          }
        }
      }
    } else {
      // Count-based archiving: only archive if we exceed the limit
      if (data.messages.length <= messageLimit) {
        return;
      }
      messagesToArchive = data.messages.length - messagesToKeep;
    }

    if (messagesToArchive <= 0) {
      return;
    }

    if (messagesToArchive <= 0) {
      return;
    }

    // Get messages to archive (oldest first)
    const messagesToArchiveList = data.messages.slice(0, messagesToArchive);
    const messagesToKeepList = data.messages.slice(messagesToArchive);

    // Create archived message shards in batches
    const archiveBatches: ConversationMessage[][] = [];
    for (let i = 0; i < messagesToArchiveList.length; i += ARCHIVE_BATCH_SIZE) {
      archiveBatches.push(messagesToArchiveList.slice(i, i + ARCHIVE_BATCH_SIZE));
    }

    const archivedShardIds: string[] = [];
    const now = new Date();

    // Create a shard for each batch of archived messages
    for (const batch of archiveBatches) {
      // Create archived message shard
      const archivedShardInput: CreateShardInput = {
        tenantId,
        shardTypeId: ARCHIVED_MESSAGE_TYPE_NAME,
        structuredData: {
          name: `Archived Messages ${batch[0]?.id} - ${batch[batch.length - 1]?.id}`,
          conversationId,
          messages: batch,
          archivedAt: now.toISOString(),
          archivedBy: userId,
          messageCount: batch.length,
          firstMessageId: batch[0]?.id,
          lastMessageId: batch[batch.length - 1]?.id,
        },
        userId,
        status: ShardStatus.ACTIVE,
        source: ShardSource.SYSTEM,
      };

      try {
        const createdShard = await this.shardRepository.create(archivedShardInput);
        archivedShardIds.push(createdShard.id);

        this.monitoring.trackEvent('conversation.messages.archived', {
          conversationId,
          tenantId,
          archivedShardId: createdShard.id,
          messageCount: batch.length,
        });
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.archiveOldMessages',
          conversationId,
          tenantId,
          batchSize: batch.length,
        });
        // Continue with other batches even if one fails
      }
    }

    // Update conversation shard: keep only recent messages
    data.messages = messagesToKeepList;
    data.messageCount = messagesToKeepList.length;

    // Update conversation shard with relationships
    const conversationShard = await this.get(conversationId, tenantId);
    if (conversationShard) {
      const relationships = conversationShard.internal_relationships || [];
      
      // Add relationships to archived message shards
      for (const archivedShardId of archivedShardIds) {
        relationships.push({
          shardId: archivedShardId,
          shardTypeId: ARCHIVED_MESSAGE_TYPE_NAME,
          shardName: `Archived Messages`,
          createdAt: now,
        });
      }

      // Update shard with new messages and relationships
      await this.shardRepository.update(conversationId, tenantId, {
        structuredData: data,
        internal_relationships: relationships,
      });
    }

    // Update stats
    if (data.stats) {
      data.stats.messageCount = data.messageCount;
    }

    // Invalidate archived messages cache
    if (this.redis) {
      const cacheKey = `${CACHE_PREFIX}${tenantId}:${conversationId}:archived:meta`;
      await this.redis.del(cacheKey);
    }

    this.monitoring.trackEvent('conversation.archiving.completed', {
      conversationId,
      tenantId,
      archivedCount: messagesToArchiveList.length,
      keptCount: messagesToKeepList.length,
      archivedShardCount: archivedShardIds.length,
      sizeBased,
    });
  }

  // ============================================
  // Shard Size Monitoring
  // ============================================

  /**
   * Estimate the size of a shard in bytes (as it would be stored in Cosmos DB)
   * This is an approximation based on JSON stringification
   */
  private estimateShardSize(shard: Shard, data: ConversationStructuredData): number {
    try {
      // Create a representative shard object for size estimation
      const shardForSize: Partial<Shard> = {
        id: shard.id,
        tenantId: shard.tenantId,
        userId: shard.userId,
        shardTypeId: shard.shardTypeId,
        structuredData: data,
        acl: shard.acl || [],
        internal_relationships: shard.internal_relationships || [],
        external_relationships: shard.external_relationships || [],
        status: shard.status,
        createdAt: shard.createdAt,
        updatedAt: shard.updatedAt,
        revisionId: shard.revisionId,
        revisionNumber: shard.revisionNumber,
        source: shard.source,
      };

      // Convert to JSON and measure size
      const jsonString = JSON.stringify(shardForSize);
      return Buffer.byteLength(jsonString, 'utf8');
    } catch (error) {
      // If estimation fails, return a safe default (assume large)
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'conversation.estimateShardSize',
        conversationId: shard.id,
      });
      return MAX_SHARD_SIZE_BYTES; // Assume at limit to trigger archiving
    }
  }

  /**
   * Check shard size and archive if needed
   * Called before operations that might increase shard size
   */
  async checkAndArchiveIfNeeded(
    conversationId: string,
    tenantId: string,
    userId: string
  ): Promise<{ archived: boolean; sizeBytes?: number; messageCount?: number }> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;
    const estimatedSize = this.estimateShardSize(shard, data);

    if (estimatedSize >= MAX_SHARD_SIZE_BYTES) {
      // Archive old messages
      await this.archiveOldMessages(conversationId, tenantId, userId, data, true);

      // Re-fetch to get updated data
      const updatedShard = await this.get(conversationId, tenantId);
      if (updatedShard) {
        const updatedData = updatedShard.structuredData as ConversationStructuredData;
        const newSize = this.estimateShardSize(updatedShard, updatedData);

        this.monitoring.trackEvent('conversation.shard.size.archived', {
          conversationId,
          tenantId,
          sizeBeforeBytes: estimatedSize,
          sizeAfterBytes: newSize,
          messageCountBefore: data.messages.length,
          messageCountAfter: updatedData.messages.length,
        });

        return {
          archived: true,
          sizeBytes: newSize,
          messageCount: updatedData.messages.length,
        };
      }
    } else if (estimatedSize >= SHARD_SIZE_WARNING_THRESHOLD) {
      // Warn but don't archive yet
      this.monitoring.trackEvent('conversation.shard.size.warning', {
        conversationId,
        tenantId,
        sizeBytes: estimatedSize,
        messageCount: data.messages.length,
      });
    }

    return {
      archived: false,
      sizeBytes: estimatedSize,
      messageCount: data.messages.length,
    };
  }

  /**
   * Get archived message shards for a conversation
   */
  async getArchivedMessageShards(
    conversationId: string,
    tenantId: string
  ): Promise<Shard[]> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard || !shard.internal_relationships) {
      return [];
    }

    const archivedRelations = shard.internal_relationships.filter(
      rel => rel.shardTypeId === ARCHIVED_MESSAGE_TYPE_NAME
    );

    const archivedShards: Shard[] = [];
    for (const rel of archivedRelations) {
      try {
        const archivedShard = await this.shardRepository.findById(rel.shardId, tenantId);
        if (archivedShard) {
          archivedShards.push(archivedShard);
        }
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.getArchivedMessageShards',
          conversationId,
          archivedShardId: rel.shardId,
          tenantId,
        });
      }
    }

    // Sort by archived date (oldest first)
    archivedShards.sort((a, b) => {
      const aDate = (a.structuredData as any)?.archivedAt;
      const bDate = (b.structuredData as any)?.archivedAt;
      if (!aDate || !bDate) {return 0;}
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });

    return archivedShards;
  }

  // ============================================
  // Conversation Threading
  // ============================================

  /**
   * Create a new thread (root conversation)
   * A thread is a conversation that can have child conversations
   */
  async createThread(
    tenantId: string,
    userId: string,
    input: CreateConversationInput & { threadTopic: string }
  ): Promise<Shard> {
    // Create root conversation with threadId = conversationId
    const conversation = await this.create(tenantId, userId, {
      ...input,
      threadId: undefined, // Will be set after creation
    });

    // Set threadId to conversation ID (root conversation is the thread)
    const data = conversation.structuredData as ConversationStructuredData;
    data.threadId = conversation.id;
    data.threadTopic = input.threadTopic;
    data.threadOrder = 0; // Root is order 0

    // Update conversation with thread info
    const updated = await this.shardRepository.update(conversation.id, tenantId, {
      structuredData: data,
    });

    this.monitoring.trackEvent('conversation.thread.created', {
      threadId: conversation.id,
      tenantId,
      userId,
      topic: input.threadTopic,
    });

    if (!updated) {
      throw new Error('Failed to update conversation thread');
    }
    return updated;
  }

  /**
   * Add a conversation to an existing thread
   */
  async addToThread(
    tenantId: string,
    userId: string,
    conversationId: string,
    threadId: string
  ): Promise<Shard> {
    // Verify thread exists
    const thread = await this.get(threadId, tenantId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    const threadData = thread.structuredData as ConversationStructuredData;
    if (!threadData.threadId || threadData.threadId !== threadId) {
      throw new Error('Invalid thread: conversation is not a thread root');
    }

    // Get conversation to add
    const conversation = await this.get(conversationId, tenantId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const data = conversation.structuredData as ConversationStructuredData;

    // Check if already in a thread
    if (data.threadId && data.threadId !== threadId) {
      throw new Error('Conversation is already part of another thread');
    }

    // Get next order number in thread
    const threadMembers = await this.getThreadMembers(threadId, tenantId);
    const nextOrder = Math.max(...threadMembers.map(c => (c.structuredData as ConversationStructuredData).threadOrder || 0), 0) + 1;

    // Update conversation with thread info
    data.threadId = threadId;
    data.parentConversationId = threadId; // Parent is thread root
    data.threadTopic = threadData.threadTopic;
    data.threadOrder = nextOrder;

    const updated = await this.shardRepository.update(conversationId, tenantId, {
      structuredData: data,
    });

    this.monitoring.trackEvent('conversation.thread.added', {
      threadId,
      conversationId,
      tenantId,
      userId,
    });

    if (!updated) {
      throw new Error('Failed to add conversation to thread');
    }
    return updated;
  }

  /**
   * Remove a conversation from a thread
   */
  async removeFromThread(
    tenantId: string,
    userId: string,
    conversationId: string
  ): Promise<Shard> {
    const conversation = await this.get(conversationId, tenantId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const data = conversation.structuredData as ConversationStructuredData;

    // Cannot remove thread root
    if (data.threadId === conversationId) {
      throw new Error('Cannot remove thread root from thread');
    }

    // Clear thread info
    const threadId = data.threadId;
    data.threadId = undefined;
    data.parentConversationId = undefined;
    data.threadTopic = undefined;
    data.threadOrder = undefined;

    const updated = await this.shardRepository.update(conversationId, tenantId, {
      structuredData: data,
    });

    this.monitoring.trackEvent('conversation.thread.removed', {
      threadId,
      conversationId,
      tenantId,
      userId,
    });

    if (!updated) {
      throw new Error('Failed to remove conversation from thread');
    }
    return updated;
  }

  /**
   * Get all conversations in a thread
   */
  async getThreadMembers(
    threadId: string,
    tenantId: string,
    options?: { includeArchived?: boolean }
  ): Promise<Shard[]> {
    // Verify thread exists
    const thread = await this.get(threadId, tenantId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    const threadData = thread.structuredData as ConversationStructuredData;
    if (!threadData.threadId || threadData.threadId !== threadId) {
      throw new Error('Invalid thread: conversation is not a thread root');
    }

    // Get all conversations with this threadId
    const shardTypeId = await this.getConversationShardTypeId(tenantId);
    
    // Query for conversations in thread
    const result = await this.shardRepository.list({
      filter: {
        tenantId,
        shardTypeId,
      },
      limit: 1000, // Get all thread members (max 1000 for performance)
    });

    // Filter by threadId and status
    const members = result.shards.filter(shard => {
      const data = shard.structuredData as ConversationStructuredData;
      return data.threadId === threadId && 
             (options?.includeArchived || data.status !== 'archived');
    });

    // Sort by threadOrder
    members.sort((a, b) => {
      const aOrder = (a.structuredData as ConversationStructuredData).threadOrder || 0;
      const bOrder = (b.structuredData as ConversationStructuredData).threadOrder || 0;
      return aOrder - bOrder;
    });

    return members;
  }

  /**
   * Get thread summary (root conversation + member count)
   */
  async getThreadSummary(
    threadId: string,
    tenantId: string
  ): Promise<{
    thread: Shard;
    memberCount: number;
    totalMessages: number;
    lastActivityAt: Date;
  }> {
    const thread = await this.get(threadId, tenantId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    const members = await this.getThreadMembers(threadId, tenantId);
    const threadData = thread.structuredData as ConversationStructuredData;

    // Calculate totals
    let totalMessages = 0;
    let lastActivityAt = thread.createdAt;

    for (const member of members) {
      const data = member.structuredData as ConversationStructuredData;
      totalMessages += data.messageCount || 0;
      if (data.lastActivityAt && data.lastActivityAt > lastActivityAt) {
        lastActivityAt = data.lastActivityAt;
      }
    }

    return {
      thread,
      memberCount: members.length,
      totalMessages,
      lastActivityAt,
    };
  }

  /**
   * List threads (conversations that are thread roots)
   */
  async listThreads(
    tenantId: string,
    userId: string,
    options?: {
      projectId?: string;
      topic?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ threads: Shard[]; total: number; hasMore: boolean }> {
    const shardTypeId = await this.getConversationShardTypeId(tenantId);

    // Get all conversations
    const result = await this.shardRepository.list({
      filter: {
        tenantId,
        shardTypeId,
      },
      limit: options?.limit || 100,
    });

    // Filter to only thread roots (where threadId === conversationId)
    let threads = result.shards.filter(shard => {
      const data = shard.structuredData as ConversationStructuredData;
      return data.threadId === shard.id; // Thread root
    });

    // Filter by project if specified
    if (options?.projectId) {
      threads = threads.filter(shard => {
        const structuredData = shard.structuredData as ConversationStructuredData;
        const tags = structuredData.tags || [];
        return tags.includes(`project:${options.projectId}`);
      });
    }

    // Filter by topic if specified
    if (options?.topic) {
      threads = threads.filter(shard => {
        const data = shard.structuredData as ConversationStructuredData;
        return data.threadTopic?.toLowerCase().includes(options.topic!.toLowerCase());
      });
    }

    // Sort by last activity
    threads.sort((a, b) => {
      const aData = a.structuredData as ConversationStructuredData;
      const bData = b.structuredData as ConversationStructuredData;
      const aTime = aData.lastActivityAt || a.createdAt;
      const bTime = bData.lastActivityAt || b.createdAt;
      return bTime.getTime() - aTime.getTime();
    });

    return {
      threads,
      total: threads.length,
      hasMore: false, // Simplified - would need proper pagination
    };
  }

  // ============================================
  // Conversation Collaboration
  // ============================================

  /**
   * Extract @mentions from message content
   * Supports formats: @username, @[Display Name](user:userId)
   */
  private extractMentions(content: string): string[] {
    const mentions: string[] = [];
    
    // Pattern 1: @[Display Name](user:userId)
    const markdownPattern = /@\[([^\]]+)\]\(user:([^)]+)\)/g;
    let match;
    while ((match = markdownPattern.exec(content)) !== null) {
      const userId = match[2];
      if (userId && !mentions.includes(userId)) {
        mentions.push(userId);
      }
    }

    // Pattern 2: @username (simple format - would need user lookup)
    // For now, we'll only support the markdown format
    // Simple @username format would require user service to resolve usernames to userIds

    return mentions;
  }

  /**
   * Add a comment to a message
   */
  async addComment(
    conversationId: string,
    tenantId: string,
    messageId: string,
    userId: string,
    input: AddCommentInput
  ): Promise<MessageComment> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    // Check access
    const access = await this.canAccess(conversationId, tenantId, userId);
    if (!access.canRead) {
      throw new Error('Access denied');
    }

    const data = shard.structuredData as ConversationStructuredData;
    const message = data.messages.find(m => m.id === messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Initialize comments array if needed
    if (!message.comments) {
      message.comments = [];
    }

    // Extract mentions from comment
    const mentions = this.extractMentions(input.content);

    // Create comment
    const comment: MessageComment = {
      id: uuidv4(),
      userId,
      content: input.content,
      createdAt: new Date(),
      edited: false,
      parentCommentId: input.parentCommentId,
      mentions,
    };

    message.comments.push(comment);

    // Update conversation
    data.lastActivityAt = new Date();
    if (data.stats) {
      data.stats.lastActivityAt = new Date();
    }

    // Save
    await this.shardRepository.update(conversationId, tenantId, {
      structuredData: data,
    });

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);

    this.monitoring.trackEvent('conversation.message.comment.added', {
      conversationId,
      messageId,
      commentId: comment.id,
      tenantId,
      userId,
      hasMentions: mentions.length > 0,
    });

    // Send notifications to mentioned users
    if (this.notificationService && mentions.length > 0) {
      try {
        // Get commenter info for notification
        const commenter = this.userService ? await this.userService.findById(userId, tenantId).catch((error: unknown) => {
          this.monitoring.trackException(error as Error, { operation: 'conversation.findById', userId, tenantId });
          return null;
        }) : null;
        const commenterName = commenter?.name || commenter?.email || 'Someone';

        // Send notification to each mentioned user
        for (const mentionedUserId of mentions) {
          // Don't notify if user mentioned themselves
          if (mentionedUserId === userId) {continue;}

          try {
            await this.notificationService.createSystemNotification({
              tenantId,
              userId: mentionedUserId,
              type: 'information',
              name: 'You were mentioned in a conversation',
              content: `${commenterName} mentioned you in a comment on a conversation message.`,
              link: `/chat/${conversationId}?messageId=${messageId}`,
              priority: 'high',
              metadata: {
                source: 'conversation_mention',
                conversationId,
                messageId,
                commentId: comment.id,
                mentionedBy: userId,
              },
            });
          } catch (error) {
            // Log but don't fail the comment creation if notification fails
            this.monitoring.trackException(error as Error, {
              operation: 'conversation.sendMentionNotification',
              conversationId,
              messageId,
              mentionedUserId,
            });
          }
        }
      } catch (error) {
        // Log but don't fail the comment creation if notification setup fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.setupMentionNotifications',
          conversationId,
          messageId,
        });
      }
    }

    // Send notification to message author if different from commenter
    if (this.notificationService && message.userId && message.userId !== userId) {
      try {
        const commenter = this.userService ? await this.userService.findById(userId, tenantId).catch((error: unknown) => {
          this.monitoring?.trackException(error as Error, { operation: 'conversation.commenterLookup', userId, tenantId });
          return null;
        }) : null;
        const commenterName = commenter?.name || commenter?.email || 'Someone';

        await this.notificationService.createSystemNotification({
          tenantId,
          userId: message.userId,
          type: 'information',
          name: 'New comment on your message',
          content: `${commenterName} commented on your message in a conversation.`,
          link: `/chat/${conversationId}?messageId=${messageId}`,
          priority: 'medium',
          metadata: {
            source: 'conversation_comment',
            conversationId,
            messageId,
            commentId: comment.id,
            commentedBy: userId,
          },
        });
      } catch (error) {
        // Log but don't fail the comment creation if notification fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.sendAuthorNotification',
          conversationId,
          messageId,
          messageAuthorId: message.userId,
        });
      }
    }

    // Broadcast real-time event
    if (this.conversationRealtimeService) {
      try {
        await this.conversationRealtimeService.broadcastConversationUpdated(
          conversationId,
          tenantId,
          userId
        );
      } catch (error) {
        // Don't fail the request if broadcasting fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.broadcastConversationUpdated',
          conversationId,
          tenantId,
          messageId,
        });
      }
    }

    return comment;
  }

  /**
   * Update a comment
   */
  async updateComment(
    conversationId: string,
    tenantId: string,
    messageId: string,
    commentId: string,
    userId: string,
    input: UpdateCommentInput
  ): Promise<MessageComment> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;
    const message = data.messages.find(m => m.id === messageId);
    if (!message || !message.comments) {
      throw new Error('Message or comment not found');
    }

    const comment = message.comments.find(c => c.id === commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Only comment author can edit
    if (comment.userId !== userId) {
      throw new Error('Only comment author can edit');
    }

    // Update comment
    comment.content = input.content;
    comment.updatedAt = new Date();
    comment.edited = true;
    comment.mentions = this.extractMentions(input.content);

    // Save
    await this.shardRepository.update(conversationId, tenantId, {
      structuredData: data,
    });

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);

    this.monitoring.trackEvent('conversation.message.comment.updated', {
      conversationId,
      messageId,
      commentId,
      tenantId,
      userId,
    });

    // Broadcast real-time event
    if (this.conversationRealtimeService) {
      try {
        await this.conversationRealtimeService.broadcastConversationUpdated(
          conversationId,
          tenantId,
          userId
        );
      } catch (error) {
        // Don't fail the request if broadcasting fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.broadcastConversationUpdated',
          conversationId,
          tenantId,
          messageId,
        });
      }
    }

    return comment;
  }

  /**
   * Delete a comment
   */
  async deleteComment(
    conversationId: string,
    tenantId: string,
    messageId: string,
    commentId: string,
    userId: string
  ): Promise<void> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;
    const message = data.messages.find(m => m.id === messageId);
    if (!message || !message.comments) {
      throw new Error('Message or comment not found');
    }

    const comment = message.comments.find(c => c.id === commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check access - comment author or conversation owner/participant with write access
    const access = await this.canAccess(conversationId, tenantId, userId);
    if (comment.userId !== userId && !access.canWrite) {
      throw new Error('Access denied');
    }

    // Remove comment
    message.comments = message.comments.filter(c => c.id !== commentId);

    // Save
    await this.shardRepository.update(conversationId, tenantId, {
      structuredData: data,
    });

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);

    this.monitoring.trackEvent('conversation.message.comment.deleted', {
      conversationId,
      messageId,
      commentId,
      tenantId,
      userId,
    });

    // Broadcast real-time event
    if (this.conversationRealtimeService) {
      try {
        await this.conversationRealtimeService.broadcastConversationUpdated(
          conversationId,
          tenantId,
          userId
        );
      } catch (error) {
        // Don't fail the request if broadcasting fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.broadcastConversationUpdated',
          conversationId,
          tenantId,
          messageId,
        });
      }
    }
  }

  /**
   * Get comments for a message
   */
  async getComments(
    conversationId: string,
    tenantId: string,
    messageId: string
  ): Promise<MessageComment[]> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;
    const message = data.messages.find(m => m.id === messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    return message.comments || [];
  }

  /**
   * Invite users to conversation (add participants with notification)
   */
  async inviteUsers(
    conversationId: string,
    tenantId: string,
    userId: string,
    input: {
      userIds: string[];
      role?: ParticipantRole;
      notify?: boolean;
    }
  ): Promise<void> {
    // Check access
    const access = await this.canAccess(conversationId, tenantId, userId);
    if (!access.canWrite) {
      throw new Error('Access denied');
    }

    // Add each user as participant
    for (const participantUserId of input.userIds) {
      await this.addParticipant(
        conversationId,
        tenantId,
        userId,
        participantUserId,
        input.role || 'participant'
      );
    }

    this.monitoring.trackEvent('conversation.users.invited', {
      conversationId,
      tenantId,
      invitedBy: userId,
      invitedCount: input.userIds.length,
      role: input.role || 'participant',
    });

    // Send notifications if notify is true
    if (input.notify && this.notificationService) {
      try {
        // Get conversation for title
        const conversation = await this.get(conversationId, tenantId);
        const conversationTitle = (conversation?.structuredData as ConversationStructuredData)?.title || 'a conversation';

        // Get inviter info for notification
        const inviter = this.userService ? await this.userService.findById(userId, tenantId).catch((error: unknown) => {
          this.monitoring?.trackException(error as Error, { operation: 'conversation.inviterLookup', userId, tenantId });
          return null;
        }) : null;
        const inviterName = inviter?.name || inviter?.email || 'Someone';

        // Send notification to each invited user
        for (const invitedUserId of input.userIds) {
          // Don't notify if user invited themselves
          if (invitedUserId === userId) {continue;}

          try {
            await this.notificationService.createSystemNotification({
              tenantId,
              userId: invitedUserId,
              type: 'information',
              name: 'You were invited to a conversation',
              content: `${inviterName} invited you to join "${conversationTitle}".`,
              link: `/chat/${conversationId}`,
              priority: 'medium',
              metadata: {
                source: 'conversation_invitation',
                conversationId,
                invitedBy: userId,
                role: input.role || 'participant',
              },
            });
          } catch (error) {
            // Log but don't fail the invitation if notification fails
            this.monitoring.trackException(error as Error, {
              operation: 'conversation.sendInvitationNotification',
              conversationId,
              invitedUserId,
            });
          }
        }
      } catch (error) {
        // Log but don't fail the invitation if notification setup fails
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.setupInvitationNotifications',
          conversationId,
        });
      }
    }
  }

  // ============================================
  // Conversation Analytics
  // ============================================

  /**
   * Generate analytics for a conversation
   * Extracts topics, entities, quality metrics, and cost breakdown
   */
  async generateAnalytics(
    conversationId: string,
    tenantId: string,
    options?: {
      includeArchived?: boolean;
      forceRegenerate?: boolean;
    }
  ): Promise<ConversationAnalytics> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;

    // Get all messages (including archived if requested)
    // Limit to 10000 for performance - consider pagination for very large conversations
    const MAX_MESSAGES_FOR_EXPORT = 10000;
    const messagesResult = await this.getMessages(conversationId, tenantId, {
      limit: MAX_MESSAGES_FOR_EXPORT,
      includeArchived: options?.includeArchived ?? false,
    });
    
    if (messagesResult.messages.length >= MAX_MESSAGES_FOR_EXPORT) {
      this.monitoring.trackEvent('conversation.export.large_conversation', {
        conversationId,
        tenantId,
        messageCount: messagesResult.messages.length,
        warning: 'Conversation may be truncated',
      });
    }

    const messages = messagesResult.messages;

    // Extract topics
    const topics = await this.extractTopics(messages);

    // Extract entities
    const entities = await this.extractEntities(messages, tenantId);

    // Calculate quality metrics
    const quality = this.calculateQualityMetrics(messages, data);

    // Calculate cost breakdown
    const costBreakdown = this.calculateCostBreakdown(messages);

    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(messages);

    // Calculate usage metrics
    const usage = this.calculateUsageMetrics(messages);

    const analytics: ConversationAnalytics = {
      conversationId,
      tenantId,
      topics,
      topTopics: topics.slice(0, 10).sort((a, b) => b.relevanceScore - a.relevanceScore),
      entities,
      topEntities: entities.slice(0, 10).sort((a, b) => b.frequency - a.frequency),
      quality,
      costBreakdown,
      performance,
      usage,
      analyzedAt: new Date(),
      conversationStartDate: shard.createdAt,
      conversationEndDate: data.status === 'archived' ? shard.updatedAt : undefined,
      lastUpdatedAt: shard.updatedAt || shard.createdAt,
    };

    this.monitoring.trackEvent('conversation.analytics.generated', {
      conversationId,
      tenantId,
      messageCount: messages.length,
      topicCount: topics.length,
      entityCount: entities.length,
    });

    return analytics;
  }

  /**
   * Extract topics from conversation messages
   */
  private async extractTopics(messages: ConversationMessage[]): Promise<ConversationTopic[]> {
    // Combine all message content
    const allContent = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => m.content)
      .join(' ');

    if (!allContent || allContent.trim().length === 0) {
      return [];
    }

    // Simple keyword extraction (can be enhanced with AI/NLP)
    const words = allContent.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3); // Filter short words

    // Count word frequencies
    const wordFreq: Record<string, number> = {};
    for (const word of words) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }

    // Get top keywords
    const topKeywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, freq]) => ({ word, freq }));

    // Create topics
    const topics: ConversationTopic[] = topKeywords.map(({ word, freq }, index) => {
      // Find first and last mention
      const firstMention = messages.find(m => 
        m.content && typeof m.content === 'string' && m.content.toLowerCase().includes(word)
      )?.createdAt || new Date();
      
      const lastMention = messages
        .slice()
        .reverse()
        .find(m => m.content && typeof m.content === 'string' && m.content.toLowerCase().includes(word))?.createdAt || new Date();

      return {
        id: uuidv4(),
        name: word,
        relevanceScore: 1.0 - (index * 0.05), // Decreasing relevance
        frequency: freq,
        firstMentionedAt: firstMention,
        lastMentionedAt: lastMention,
      };
    });

    return topics.filter(t => t.relevanceScore >= 0.3);
  }

  /**
   * Extract entities from conversation messages
   */
  private async extractEntities(
    messages: ConversationMessage[],
    tenantId: string
  ): Promise<ConversationEntity[]> {
    const entities: ConversationEntity[] = [];
    const entityMap: Record<string, ConversationEntity> = {};

    // Extract from message content
    for (const message of messages) {
      if (!message.content) {continue;}

      // Extract shard references from context sources
      if (message.contextSources) {
        for (const source of message.contextSources) {
          if (source.chunks) {
            for (const chunk of source.chunks) {
              if (chunk.shardId && chunk.shardName) {
                const key = `shard:${chunk.shardId}`;
                if (!entityMap[key]) {
                  // Determine entity type from shard type
                  const shardType = chunk.shardTypeId || 'other';
                  let entityType: ConversationEntity['type'] = 'other';
                  if (shardType.includes('project')) {entityType = 'project';}
                  else if (shardType.includes('document')) {entityType = 'document';}
                  else if (shardType.includes('company') || shardType.includes('organization')) {entityType = 'organization';}
                  else if (shardType.includes('contact') || shardType.includes('person')) {entityType = 'person';}

                  entityMap[key] = {
                    id: uuidv4(),
                    name: chunk.shardName,
                    type: entityType,
                    shardId: chunk.shardId,
                    frequency: 0,
                    firstMentionedAt: message.createdAt,
                    lastMentionedAt: message.createdAt,
                    context: message.content.substring(0, 100),
                  };
                }

                entityMap[key].frequency++;
                if (message.createdAt < entityMap[key].firstMentionedAt) {
                  entityMap[key].firstMentionedAt = message.createdAt;
                }
                if (message.createdAt > entityMap[key].lastMentionedAt) {
                  entityMap[key].lastMentionedAt = message.createdAt;
                }
              }
            }
          }
        }
      }

      // Extract mentions (user IDs)
      if (message.mentions) {
        for (const userId of message.mentions) {
          const key = `user:${userId}`;
          if (!entityMap[key]) {
            entityMap[key] = {
              id: uuidv4(),
              name: `User ${userId.substring(0, 8)}`, // Placeholder - would need user service
              type: 'person',
              frequency: 0,
              firstMentionedAt: message.createdAt,
              lastMentionedAt: message.createdAt,
              context: message.content.substring(0, 100),
            };
          }

          entityMap[key].frequency++;
          if (message.createdAt < entityMap[key].firstMentionedAt) {
            entityMap[key].firstMentionedAt = message.createdAt;
          }
          if (message.createdAt > entityMap[key].lastMentionedAt) {
            entityMap[key].lastMentionedAt = message.createdAt;
          }
        }
      }
    }

    return Object.values(entityMap);
  }

  /**
   * Calculate quality metrics from messages and conversation data
   */
  private calculateQualityMetrics(
    messages: ConversationMessage[],
    data: ConversationStructuredData
  ): ConversationQualityMetrics {
    // Feedback metrics
    const feedbacks = messages
      .filter(m => m.feedback)
      .map(m => m.feedback!);

    const positiveFeedback = feedbacks.filter(f => 
      f.thumbs === 'up' || (f.rating && f.rating >= 4)
    ).length;

    const negativeFeedback = feedbacks.filter(f => 
      f.thumbs === 'down' || (f.rating && f.rating <= 2)
    ).length;

    const ratings = feedbacks
      .filter(f => f.rating !== undefined)
      .map(f => f.rating!);

    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : undefined;

    const ratingDistribution: Record<number, number> = {};
    for (const rating of ratings) {
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    }

    // Regeneration metrics
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const regenerations = messages.filter(m => m.isRegenerated).length;
    const regenerationRate = assistantMessages.length > 0
      ? regenerations / assistantMessages.length
      : 0;

    // Response quality
    const assistantMessagesWithContent = assistantMessages.filter(m => m.content);
    const averageResponseLength = assistantMessagesWithContent.length > 0
      ? assistantMessagesWithContent.reduce((sum, m) => sum + m.content.length, 0) / assistantMessagesWithContent.length
      : 0;

    const messagesWithCitations = assistantMessages.filter(m => 
      m.contextSources && m.contextSources.length > 0
    ).length;

    const totalCitations = assistantMessages.reduce((sum, m) => 
      sum + (m.contextSources?.reduce((s, cs) => s + (cs.chunks?.length || 0), 0) || 0), 0
    );

    const averageCitationsPerMessage = assistantMessages.length > 0
      ? totalCitations / assistantMessages.length
      : 0;

    const citationRate = assistantMessages.length > 0
      ? messagesWithCitations / assistantMessages.length
      : 0;

    // Error metrics
    const errorMessages = messages.filter(m => m.status === 'error');
    const errorCount = errorMessages.length;
    const errorRate = messages.length > 0 ? errorCount / messages.length : 0;

    const errorsByType: Record<string, number> = {};
    for (const msg of errorMessages) {
      const errorType = msg.errorMessage?.split(':')[0] || 'unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    }

    // Engagement metrics
    const commentCount = messages.reduce((sum, m) => 
      sum + (m.comments?.length || 0), 0
    );

    const averageCommentsPerMessage = messages.length > 0
      ? commentCount / messages.length
      : 0;

    const mentionCount = messages.reduce((sum, m) => 
      sum + (m.mentions?.length || 0), 0
    );

    const averageMentionsPerMessage = messages.length > 0
      ? mentionCount / messages.length
      : 0;

    return {
      totalFeedback: feedbacks.length,
      positiveFeedback,
      negativeFeedback,
      averageRating,
      ratingDistribution,
      totalRegenerations: regenerations,
      regenerationRate,
      averageResponseLength,
      averageCitationsPerMessage,
      messagesWithCitations,
      citationRate,
      errorCount,
      errorRate,
      errorsByType,
      commentCount,
      averageCommentsPerMessage,
      mentionCount,
      averageMentionsPerMessage,
    };
  }

  /**
   * Calculate cost breakdown
   */
  private calculateCostBreakdown(messages: ConversationMessage[]): ConversationAnalytics['costBreakdown'] {
    const totalCost = messages.reduce((sum, m) => sum + (m.cost || 0), 0);
    const costPerMessage = messages.length > 0 ? totalCost / messages.length : 0;

    // Cost by model
    const costByModel: Record<string, number> = {};
    for (const msg of messages) {
      if (msg.modelId && msg.cost) {
        costByModel[msg.modelId] = (costByModel[msg.modelId] || 0) + msg.cost;
      }
    }

    // Cost by date
    const costByDateMap: Record<string, number> = {};
    for (const msg of messages) {
      if (msg.cost) {
        const date = new Date(msg.createdAt).toISOString().split('T')[0];
        costByDateMap[date] = (costByDateMap[date] || 0) + msg.cost;
      }
    }

    const costByDate = Object.entries(costByDateMap)
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalCost,
      costPerMessage,
      costByModel,
      costByDate,
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(messages: ConversationMessage[]): ConversationAnalytics['performance'] {
    const latencies = messages
      .filter(m => m.latencyMs !== undefined)
      .map(m => m.latencyMs!)
      .sort((a, b) => a - b);

    const totalLatencyMs = latencies.reduce((sum, l) => sum + l, 0);
    const averageLatencyMs = latencies.length > 0 ? totalLatencyMs / latencies.length : 0;

    const p50Index = Math.floor(latencies.length * 0.5);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);

    return {
      averageLatencyMs,
      p50LatencyMs: latencies[p50Index] || 0,
      p95LatencyMs: latencies[p95Index] || 0,
      p99LatencyMs: latencies[p99Index] || 0,
      totalLatencyMs,
    };
  }

  /**
   * Calculate usage metrics
   */
  private calculateUsageMetrics(messages: ConversationMessage[]): ConversationAnalytics['usage'] {
    const totalMessages = messages.length;
    const totalTokens = messages.reduce((sum, m) => 
      sum + (m.tokens?.total || 0), 0
    );
    const averageTokensPerMessage = totalMessages > 0 ? totalTokens / totalMessages : 0;

    // Messages by role
    const messagesByRole: Record<MessageRole, number> = {
      user: 0,
      assistant: 0,
      system: 0,
      tool: 0,
    };

    for (const msg of messages) {
      messagesByRole[msg.role] = (messagesByRole[msg.role] || 0) + 1;
    }

    // Messages by date
    const messagesByDateMap: Record<string, number> = {};
    for (const msg of messages) {
      const date = new Date(msg.createdAt).toISOString().split('T')[0];
      messagesByDateMap[date] = (messagesByDateMap[date] || 0) + 1;
    }

    const messagesByDate = Object.entries(messagesByDateMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalMessages,
      totalTokens,
      averageTokensPerMessage,
      messagesByRole,
      messagesByDate,
    };
  }

  /**
   * Get analytics summary (lightweight version)
   */
  async getAnalyticsSummary(
    conversationId: string,
    tenantId: string
  ): Promise<{
    topics: ConversationTopic[];
    entities: ConversationEntity[];
    quality: ConversationQualityMetrics;
    totalCost: number;
    totalMessages: number;
  }> {
    const analytics = await this.generateAnalytics(conversationId, tenantId);

    return {
      topics: analytics.topTopics,
      entities: analytics.topEntities,
      quality: analytics.quality,
      totalCost: analytics.costBreakdown.totalCost,
      totalMessages: analytics.usage.totalMessages,
    };
  }

  // ============================================
  // Conversation Configuration
  // ============================================

  /**
   * Get conversation configuration for a tenant
   */
  async getConversationConfig(tenantId: string): Promise<ConversationConfig> {
    // Try cache first
    const cacheKey = `conversation-config:${tenantId}`;
    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Try to load from database (would need CosmosDB service)
    // For now, return default config
    const config = this.getDefaultConversationConfig(tenantId);

    // Cache it
    if (this.redis) {
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(config));
    }

    return config;
  }

  /**
   * Update conversation configuration for a tenant
   */
  async updateConversationConfig(
    tenantId: string,
    userId: string,
    input: UpdateConversationConfigInput
  ): Promise<ConversationConfig> {
    const current = await this.getConversationConfig(tenantId);

    // Validate input
    if (input.maxEditHistory !== undefined && (input.maxEditHistory < 1 || input.maxEditHistory > 100)) {
      throw new Error('maxEditHistory must be between 1 and 100');
    }
    if (input.maxMessageLimit !== undefined && (input.maxMessageLimit < 100 || input.maxMessageLimit > 10000)) {
      throw new Error('maxMessageLimit must be between 100 and 10000');
    }
    if (input.autoSummarizeThreshold !== undefined && (input.autoSummarizeThreshold < 10 || input.autoSummarizeThreshold > 500)) {
      throw new Error('autoSummarizeThreshold must be between 10 and 500');
    }
    if (input.autoArchiveThreshold !== undefined && (input.autoArchiveThreshold < 100 || input.autoArchiveThreshold > 10000)) {
      throw new Error('autoArchiveThreshold must be between 100 and 10000');
    }

    // Merge with existing
    const updated: ConversationConfig = {
      ...current,
      ...input,
      updatedAt: new Date(),
    };

    // Store in database (would need CosmosDB service)
    // For now, just cache it
    const cacheKey = `conversation-config:${tenantId}`;
    if (this.redis) {
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(updated));
    }

    this.monitoring.trackEvent('conversation.config.updated', {
      tenantId,
      userId,
      changes: Object.keys(input).join(','),
    });

    return updated;
  }

  /**
   * Get edit history retention limit for a tenant
   */
  private async getEditHistoryRetention(tenantId: string): Promise<number> {
    const config = await this.getConversationConfig(tenantId);
    return config.maxEditHistory;
  }

  /**
   * Get default conversation configuration
   */
  private getDefaultConversationConfig(tenantId: string): ConversationConfig {
    return {
      tenantId,
      maxEditHistory: 10,                    // Default: last 10 edits per message
      maxMessageLimit: 1000,                // Default: 1000 messages before archiving
      autoSummarizeEnabled: true,           // Default: enabled
      autoSummarizeThreshold: 50,           // Default: summarize after 50 messages
      preserveRecentMessages: 10,           // Phase 5.1: Default: keep last 10 messages in full
      autoArchiveEnabled: true,             // Default: enabled
      autoArchiveThreshold: 1000,           // Default: archive after 1000 messages
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      updatedBy: 'system',
    };
  }

  // ============================================
  // Conversation Export
  // ============================================

  /**
   * Export conversation to PDF, Markdown, or JSON
   */
  async exportConversation(
    conversationId: string,
    tenantId: string,
    options: ConversationExportOptions
  ): Promise<ConversationExportResult> {
    const shard = await this.get(conversationId, tenantId);
    if (!shard) {
      throw new Error('Conversation not found');
    }

    const data = shard.structuredData as ConversationStructuredData;

    // Get messages (including archived if requested)
    const messagesResult = await this.getMessages(conversationId, tenantId, {
      limit: 10000,
      includeArchived: options.includeArchived ?? false,
    });

    let messages = messagesResult.messages;

    // Filter by date range if specified
    if (options.fromDate) {
      messages = messages.filter(m => new Date(m.createdAt) >= options.fromDate!);
    }
    if (options.toDate) {
      messages = messages.filter(m => new Date(m.createdAt) <= options.toDate!);
    }

    // Generate export based on format
    switch (options.format) {
      case 'pdf':
        return this.exportToPDF(shard, data, messages, options);
      case 'markdown':
        return this.exportToMarkdown(shard, data, messages, options);
      case 'json':
        return this.exportToJSON(shard, data, messages, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export conversation to PDF
   */
  private async exportToPDF(
    shard: Shard,
    data: ConversationStructuredData,
    messages: ConversationMessage[],
    options: ConversationExportOptions
  ): Promise<ConversationExportResult> {
    if (!this.conversionService) {
      throw new Error('ConversionService is not available. PDF export requires ConversionService to be configured.');
    }

    // Generate HTML content
    const html = this.generateExportHTML(shard, data, messages, options);

    // Convert to PDF
    const pdfBuffer = await this.conversionService.convertToPdf(html);

    const filename = `conversation-${shard.id}-${new Date().toISOString().split('T')[0]}.pdf`;

    return {
      format: 'pdf',
      content: pdfBuffer,
      mimeType: 'application/pdf',
      filename,
      size: pdfBuffer.length,
    };
  }

  /**
   * Export conversation to Markdown
   */
  private exportToMarkdown(
    shard: Shard,
    data: ConversationStructuredData,
    messages: ConversationMessage[],
    options: ConversationExportOptions
  ): ConversationExportResult {
    const lines: string[] = [];

    // Header
    lines.push(`# ${data.title || 'Untitled Conversation'}\n`);
    lines.push(`**Created:** ${new Date(shard.createdAt).toLocaleString()}`);
    if (data.summary) {
      lines.push(`**Summary:** ${data.summary}`);
    }
    lines.push(`**Messages:** ${messages.length}`);
    lines.push(`**Participants:** ${data.participants.length}`);
    lines.push('');

    // Messages
    lines.push('## Messages\n');
    for (const message of messages) {
      const timestamp = new Date(message.createdAt).toLocaleString();
      const role = message.role === 'user' ? 'User' : 'Assistant';
      
      lines.push(`### ${role} - ${timestamp}\n`);
      
      // Content
      lines.push(message.content);
      lines.push('');

      // Edit history
      if (options.includeEditHistory && message.editHistory && message.editHistory.length > 0) {
        lines.push('#### Edit History\n');
        for (const edit of message.editHistory) {
          lines.push(`- **Edited at:** ${new Date(edit.editedAt).toLocaleString()}`);
          lines.push(`  **Previous:** ${edit.previousContent.substring(0, 100)}...`);
          if (edit.reason) {
            lines.push(`  **Reason:** ${edit.reason}`);
          }
        }
        lines.push('');
      }

      // Context sources
      if (options.includeContextSources && message.contextSources && message.contextSources.length > 0) {
        lines.push('#### Context Sources\n');
        for (const source of message.contextSources) {
          if (source.chunks) {
            for (const chunk of source.chunks) {
              lines.push(`- **${chunk.shardName}** (${chunk.shardTypeId})`);
              lines.push(`  Score: ${(chunk.score * 100).toFixed(1)}%`);
              if (chunk.content) {
                lines.push(`  Content: ${chunk.content.substring(0, 200)}...`);
              }
            }
          }
        }
        lines.push('');
      }

      // Citations
      if (message.contextSources && message.contextSources.length > 0) {
        lines.push('#### Citations\n');
        for (const source of message.contextSources) {
          for (const chunk of source.chunks) {
            lines.push(`- ${chunk.content.substring(0, 100)}... (from ${chunk.shardName})`);
          }
        }
        lines.push('');
      }

      // Metrics
      if (message.tokens || message.cost || message.latencyMs) {
        lines.push('#### Metrics\n');
        if (message.tokens) {
          lines.push(`- Tokens: ${message.tokens.total} (prompt: ${message.tokens.prompt}, completion: ${message.tokens.completion})`);
        }
        if (message.cost) {
          lines.push(`- Cost: $${message.cost.toFixed(4)}`);
        }
        if (message.latencyMs) {
          lines.push(`- Latency: ${message.latencyMs}ms`);
        }
        lines.push('');
      }

      lines.push('---\n');
    }

    const markdown = lines.join('\n');
    const filename = `conversation-${shard.id}-${new Date().toISOString().split('T')[0]}.md`;

    return {
      format: 'markdown',
      content: markdown,
      mimeType: 'text/markdown',
      filename,
      size: Buffer.byteLength(markdown, 'utf8'),
    };
  }

  /**
   * Export conversation to JSON
   */
  private exportToJSON(
    shard: Shard,
    data: ConversationStructuredData,
    messages: ConversationMessage[],
    options: ConversationExportOptions
  ): ConversationExportResult {
    const exportData: any = {
      id: shard.id,
      title: data.title,
      summary: data.summary,
      status: data.status,
      visibility: data.visibility,
      createdAt: shard.createdAt,
      updatedAt: shard.updatedAt,
      participants: data.participants,
      tags: data.tags || [],
      messages: messages.map(msg => {
        const msgData: any = {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          contentType: msg.contentType,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt,
        };

        if (options.includeEditHistory && msg.editHistory) {
          msgData.editHistory = msg.editHistory;
        }

        if (options.includeContextSources && msg.contextSources) {
          msgData.contextSources = msg.contextSources;
        }

        if (msg.contextSources) {
          msgData.contextSources = msg.contextSources;
        }

        if (msg.tokens) {
          msgData.tokens = msg.tokens;
        }

        if (msg.cost !== undefined) {
          msgData.cost = msg.cost;
        }

        if (msg.latencyMs !== undefined) {
          msgData.latencyMs = msg.latencyMs;
        }

        return msgData;
      }),
    };

    const json = JSON.stringify(exportData, null, 2);
    const filename = `conversation-${shard.id}-${new Date().toISOString().split('T')[0]}.json`;

    return {
      format: 'json',
      content: json,
      mimeType: 'application/json',
      filename,
      size: Buffer.byteLength(json, 'utf8'),
    };
  }

  /**
   * Generate HTML for PDF export
   */
  private generateExportHTML(
    shard: Shard,
    data: ConversationStructuredData,
    messages: ConversationMessage[],
    options: ConversationExportOptions
  ): string {
    const lines: string[] = [];

    lines.push('<!DOCTYPE html>');
    lines.push('<html><head>');
    lines.push('<meta charset="UTF-8">');
    lines.push('<style>');
    lines.push(`
      body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
      h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
      h2 { color: #666; margin-top: 30px; }
      h3 { color: #888; margin-top: 20px; }
      .message { margin: 20px 0; padding: 15px; border-left: 3px solid #ddd; }
      .user { border-left-color: #4CAF50; }
      .assistant { border-left-color: #2196F3; }
      .metadata { font-size: 0.9em; color: #666; margin-top: 10px; }
      .context-source { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; }
      .citation { margin: 5px 0; padding: 5px; background: #e3f2fd; border-radius: 4px; }
      .edit-history { margin: 10px 0; padding: 10px; background: #fff3cd; border-radius: 4px; font-size: 0.9em; }
    `);
    lines.push('</style>');
    lines.push('</head><body>');

    // Header
    lines.push(`<h1>${data.title || 'Untitled Conversation'}</h1>`);
    lines.push(`<p><strong>Created:</strong> ${new Date(shard.createdAt).toLocaleString()}</p>`);
    if (data.summary) {
      lines.push(`<p><strong>Summary:</strong> ${data.summary}</p>`);
    }
    lines.push(`<p><strong>Messages:</strong> ${messages.length}</p>`);
    lines.push(`<p><strong>Participants:</strong> ${data.participants.length}</p>`);
    lines.push('<hr>');

    // Messages
    lines.push('<h2>Messages</h2>');
    for (const message of messages) {
      const timestamp = new Date(message.createdAt).toLocaleString();
      const role = message.role === 'user' ? 'user' : 'assistant';
      
      lines.push(`<div class="message ${role}">`);
      lines.push(`<h3>${role === 'user' ? 'User' : 'Assistant'} - ${timestamp}</h3>`);
      
      // Content (convert markdown to HTML for display)
      const content = message.contentType === 'markdown' 
        ? message.content.replace(/\n/g, '<br>')
        : message.content.replace(/\n/g, '<br>');
      lines.push(`<div>${content}</div>`);

      // Edit history
      if (options.includeEditHistory && message.editHistory && message.editHistory.length > 0) {
        lines.push('<div class="edit-history">');
        lines.push('<strong>Edit History:</strong>');
        for (const edit of message.editHistory) {
          lines.push(`<div>Edited at ${new Date(edit.editedAt).toLocaleString()}: ${edit.previousContent.substring(0, 100)}...</div>`);
        }
        lines.push('</div>');
      }

      // Context sources
      if (options.includeContextSources && message.contextSources && message.contextSources.length > 0) {
        lines.push('<div class="context-source">');
        lines.push('<strong>Context Sources:</strong>');
        for (const source of message.contextSources) {
          if (source.chunks) {
            for (const chunk of source.chunks) {
              lines.push(`<div>${chunk.shardName} (${chunk.shardTypeId}) - Score: ${(chunk.score * 100).toFixed(1)}%</div>`);
            }
          }
        }
        lines.push('</div>');
      }

      // Citations
      if (message.contextSources && message.contextSources.length > 0) {
        lines.push('<div class="citation">');
        lines.push('<strong>Citations:</strong>');
        for (const source of message.contextSources) {
          for (const chunk of source.chunks) {
            lines.push(`<div>${chunk.content.substring(0, 100)}... (from ${chunk.shardName})</div>`);
          }
        }
        lines.push('</div>');
      }

      // Metrics
      if (message.tokens || message.cost || message.latencyMs) {
        lines.push('<div class="metadata">');
        if (message.tokens) {
          lines.push(`Tokens: ${message.tokens.total} | `);
        }
        if (message.cost) {
          lines.push(`Cost: $${message.cost.toFixed(4)} | `);
        }
        if (message.latencyMs) {
          lines.push(`Latency: ${message.latencyMs}ms`);
        }
        lines.push('</div>');
      }

      lines.push('</div>');
    }

    lines.push('</body></html>');

    return lines.join('\n');
  }

  // ============================================
  // System-Wide Statistics (Admin Only)
  // ============================================

  /**
   * Get system-wide conversation statistics (Super Admin only)
   * Aggregates statistics across all tenants
   */
  async getSystemStats(options?: {
    fromDate?: Date;
    toDate?: Date;
  }): Promise<{
    totalConversations: number;
    activeConversations: number;
    archivedConversations: number;
    totalMessages: number;
    totalUsers: number;
    totalTenants: number;
    averageMessagesPerConversation: number;
    averageCostPerConversation: number;
    totalCost: number;
    totalTokens: number;
    conversationsByStatus: Record<string, number>;
    conversationsByVisibility: Record<string, number>;
    topTenants: Array<{
      tenantId: string;
      conversationCount: number;
      messageCount: number;
      totalCost: number;
    }>;
    growthTrend: Array<{
      date: string;
      conversations: number;
      messages: number;
    }>;
  }> {
    try {
      // Use Redis-based metrics aggregation for better performance
      if (!this.redis) {
        // Fallback to empty stats if Redis is not available
        return this.getEmptySystemStats();
      }

      // Aggregate from Redis daily metrics (last 30 days)
      const today = new Date();
      const dailyStats: Array<{ date: string; conversations: number; messages: number }> = [];
      let totalConversations = 0;
      let activeConversations = 0;
      let archivedConversations = 0;
      let totalMessages = 0;
      let totalCost = 0;
      let totalTokens = 0;
      const statusCounts: Record<string, number> = {};
      const visibilityCounts: Record<string, number> = {};
      const tenantMap = new Map<string, {
        conversationCount: number;
        messageCount: number;
        totalCost: number;
      }>();

      // Get system-wide cumulative totals (single key)
      const systemKey = `${this.SYSTEM_METRICS_PREFIX}all`;
      const systemData = await this.redis.hgetall(systemKey);
      
      totalConversations = parseInt(systemData.totalConversations || '0', 10);
      activeConversations = parseInt(systemData.activeConversations || '0', 10);
      archivedConversations = parseInt(systemData.archivedConversations || '0', 10);
      totalMessages = parseInt(systemData.totalMessages || '0', 10);
      totalCost = parseFloat(systemData.totalCost || '0');
      totalTokens = parseInt(systemData.totalTokens || '0', 10);

      // Parse status and visibility counts
      for (const [key, value] of Object.entries(systemData)) {
        if (key.startsWith('status:')) {
          const status = key.replace('status:', '');
          statusCounts[status] = parseInt(value, 10);
        } else if (key.startsWith('visibility:')) {
          const visibility = key.replace('visibility:', '');
          visibilityCounts[visibility] = parseInt(value, 10);
        }
      }

      // Aggregate daily metrics for growth trend (last 30 days)
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = this.getDateKeyForMetrics(date);
        const dailyKey = `${this.DAILY_PREFIX}${dateKey}`;
        
        // Get daily metrics (daily increments)
        const dailyData = await this.redis.hgetall(dailyKey);
        const dayConversations = parseInt(dailyData.conversations || '0', 10);
        const dayMessages = parseInt(dailyData.messages || '0', 10);

        // Growth trend uses daily increments
        dailyStats.push({
          date: dateKey,
          conversations: dayConversations,
          messages: dayMessages,
        });
      }

      // Get unique users and tenants count from Redis sets
      const totalUsers = await this.redis.scard(this.USERS_SET_KEY);
      const totalTenants = await this.redis.scard(this.TENANTS_SET_KEY);

      // Get tenant-specific metrics for top tenants using sorted sets
      const topTenants: Array<{
        tenantId: string;
        conversationCount: number;
        messageCount: number;
        totalCost: number;
      }> = [];
      
      try {
        // Get top 10 tenants by conversation count from sorted set
        const topTenantIds = await this.redis.zrevrange(this.TOP_TENANTS_SORTED_SET, 0, 9, 'WITHSCORES');
        const topTenantIdsByMessages = await this.redis.zrevrange(`${this.TOP_TENANTS_SORTED_SET}:messages`, 0, 9, 'WITHSCORES');
        const topTenantIdsByCost = await this.redis.zrevrange(`${this.TOP_TENANTS_SORTED_SET}:cost`, 0, 9, 'WITHSCORES');

        // Build maps for quick lookup
        const conversationCounts = new Map<string, number>();
        const messageCounts = new Map<string, number>();
        const costs = new Map<string, number>();

        // Parse conversation counts (every other element is tenantId, then score)
        for (let i = 0; i < topTenantIds.length; i += 2) {
          const tenantId = topTenantIds[i];
          const count = parseFloat(topTenantIds[i + 1]);
          conversationCounts.set(tenantId, count);
        }

        // Parse message counts
        for (let i = 0; i < topTenantIdsByMessages.length; i += 2) {
          const tenantId = topTenantIdsByMessages[i];
          const count = parseFloat(topTenantIdsByMessages[i + 1]);
          messageCounts.set(tenantId, count);
        }

        // Parse costs
        for (let i = 0; i < topTenantIdsByCost.length; i += 2) {
          const tenantId = topTenantIdsByCost[i];
          const cost = parseFloat(topTenantIdsByCost[i + 1]);
          costs.set(tenantId, cost);
        }

        // Get all unique tenant IDs from all three sorted sets
        const allTenantIds = new Set([
          ...Array.from(conversationCounts.keys()),
          ...Array.from(messageCounts.keys()),
          ...Array.from(costs.keys()),
        ]);

        // Build top tenants array
        for (const tenantId of allTenantIds) {
          topTenants.push({
            tenantId,
            conversationCount: Math.round(conversationCounts.get(tenantId) || 0),
            messageCount: Math.round(messageCounts.get(tenantId) || 0),
            totalCost: costs.get(tenantId) || 0,
          });
        }

        // Sort by conversation count and take top 10
        topTenants.sort((a, b) => b.conversationCount - a.conversationCount);
        topTenants.splice(10); // Keep only top 10
      } catch (error) {
        // Non-blocking: if tenant ranking fails, return empty array
        this.monitoring.trackException(error as Error, {
          operation: 'conversation.getSystemStats.topTenants',
        });
      }

      // Build growth trend from daily stats (already collected above)
      const growthTrend = dailyStats;

      return {
        totalConversations,
        activeConversations,
        archivedConversations,
        totalMessages,
        totalUsers,
        totalTenants,
        averageMessagesPerConversation: totalConversations > 0 ? totalMessages / totalConversations : 0,
        averageCostPerConversation: totalConversations > 0 ? totalCost / totalConversations : 0,
        totalCost,
        totalTokens,
        conversationsByStatus: statusCounts,
        conversationsByVisibility: visibilityCounts,
        topTenants,
        growthTrend,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'conversation.getSystemStats',
      });
      // Return empty stats on error
      return this.getEmptySystemStats();
    }
  }

  /**
   * Get empty system stats structure
   */
  private getEmptySystemStats(): {
    totalConversations: number;
    activeConversations: number;
    archivedConversations: number;
    totalMessages: number;
    totalUsers: number;
    totalTenants: number;
    averageMessagesPerConversation: number;
    averageCostPerConversation: number;
    totalCost: number;
    totalTokens: number;
    conversationsByStatus: Record<string, number>;
    conversationsByVisibility: Record<string, number>;
    topTenants: Array<{
      tenantId: string;
      conversationCount: number;
      messageCount: number;
      totalCost: number;
    }>;
    growthTrend: Array<{
      date: string;
      conversations: number;
      messages: number;
    }>;
  } {
    return {
      totalConversations: 0,
      activeConversations: 0,
      archivedConversations: 0,
      totalMessages: 0,
      totalUsers: 0,
      totalTenants: 0,
      averageMessagesPerConversation: 0,
      averageCostPerConversation: 0,
      totalCost: 0,
      totalTokens: 0,
      conversationsByStatus: {},
      conversationsByVisibility: {},
      topTenants: [],
      growthTrend: [],
    };
  }

  // ============================================
  // Conversation Metrics Tracking (Redis-based)
  // ============================================

  private readonly METRICS_PREFIX = 'conversation:metrics:';
  private readonly SYSTEM_METRICS_PREFIX = 'conversation:system:';
  private readonly DAILY_PREFIX = 'conversation:daily:';
  private readonly USERS_SET_KEY = 'conversation:users:all';
  private readonly TENANTS_SET_KEY = 'conversation:tenants:all';
  private readonly TOP_TENANTS_SORTED_SET = 'conversation:topTenants:byConversations';

  /**
   * Record a conversation event for metrics tracking
   */
  private async recordConversationEvent(event: {
    type: 'created' | 'updated' | 'archived' | 'message_added';
    conversationId: string;
    tenantId: string;
    userId: string;
    status?: string;
    visibility?: string;
    messageCount?: number;
    cost?: number;
    tokens?: number;
    timestamp: Date;
  }): Promise<void> {
    if (!this.redis) {return;}

    try {
      const dateKey = this.getDateKeyForMetrics(event.timestamp);
      
      // Update system-wide metrics (single key for cumulative totals)
      const systemKey = `${this.SYSTEM_METRICS_PREFIX}all`;
      
      // Track unique users and tenants using Redis sets
      await this.redis.sadd(this.USERS_SET_KEY, event.userId);
      await this.redis.sadd(this.TENANTS_SET_KEY, event.tenantId);
      
      if (event.type === 'created') {
        await this.redis.hincrby(systemKey, 'totalConversations', 1);
        if (event.status === 'active') {
          await this.redis.hincrby(systemKey, 'activeConversations', 1);
        }
        if (event.visibility) {
          await this.redis.hincrby(systemKey, `visibility:${event.visibility}`, 1);
        }
        if (event.status) {
          await this.redis.hincrby(systemKey, `status:${event.status}`, 1);
        }
        
        // Update top tenants sorted set (increment conversation count for this tenant)
        await this.redis.zincrby(this.TOP_TENANTS_SORTED_SET, 1, event.tenantId);
      } else if (event.type === 'archived') {
        await this.redis.hincrby(systemKey, 'activeConversations', -1);
        await this.redis.hincrby(systemKey, 'archivedConversations', 1);
        if (event.status) {
          await this.redis.hincrby(systemKey, `status:${event.status}`, 1);
          await this.redis.hincrby(systemKey, 'status:active', -1);
        }
      } else if (event.type === 'message_added') {
        await this.redis.hincrby(systemKey, 'totalMessages', 1);
        if (event.cost) {
          await this.redis.hincrbyfloat(systemKey, 'totalCost', event.cost);
        }
        if (event.tokens) {
          await this.redis.hincrby(systemKey, 'totalTokens', event.tokens);
        }
      }

      // Update tenant-specific metrics
      const tenantKey = `${this.METRICS_PREFIX}${event.tenantId}:${dateKey}`;
      if (event.type === 'created') {
        await this.redis.hincrby(tenantKey, 'conversations', 1);
      }
      if (event.type === 'message_added') {
        await this.redis.hincrby(tenantKey, 'messages', 1);
        // Update top tenants sorted set (increment message count for this tenant)
        await this.redis.zincrby(`${this.TOP_TENANTS_SORTED_SET}:messages`, 1, event.tenantId);
      }
      if (event.cost) {
        await this.redis.hincrbyfloat(tenantKey, 'cost', event.cost);
        // Update top tenants sorted set (increment cost for this tenant)
        await this.redis.zincrby(`${this.TOP_TENANTS_SORTED_SET}:cost`, event.cost, event.tenantId);
      }

      // Set TTL (no expiration for system metrics - they're cumulative, 90 days for tenant metrics)
      // System metrics don't expire as they represent cumulative totals
      await this.redis.expire(tenantKey, 90 * 24 * 60 * 60);

      // Update daily aggregates
      const dailyKey = `${this.DAILY_PREFIX}${dateKey}`;
      await this.redis.hincrby(dailyKey, 'conversations', event.type === 'created' ? 1 : 0);
      await this.redis.hincrby(dailyKey, 'messages', event.type === 'message_added' ? 1 : 0);
      if (event.cost) {
        await this.redis.hincrbyfloat(dailyKey, 'cost', event.cost);
      }
      await this.redis.expire(dailyKey, 90 * 24 * 60 * 60);
    } catch (error) {
      // Non-blocking: don't fail conversation operations if metrics recording fails
      this.monitoring.trackException(error as Error, {
        operation: 'conversation.recordMetrics',
        conversationId: event.conversationId,
        tenantId: event.tenantId,
      });
    }
  }

  /**
   * Get date key for Redis metrics (YYYY-MM-DD format)
   */
  private getDateKeyForMetrics(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}







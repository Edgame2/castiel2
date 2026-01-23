/**
 * Conversation Service
 * Manages AI conversations (c_conversation shards)
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { Shard } from '../types/shard.types.js';
import { ConversationMessage, MessageContentType, ParticipantRole, CreateConversationInput, UpdateConversationInput, SendMessageInput, EditMessageInput, AddFeedbackInput, ConversationQueryOptions, MessageFeedback, TokenUsage, MessageComment, AddCommentInput, UpdateCommentInput, ConversationAnalytics, ConversationTopic, ConversationEntity, ConversationQualityMetrics, ConversationConfig, UpdateConversationConfigInput } from '../types/conversation.types.js';
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
export declare class ConversationService {
    private monitoring;
    private shardRepository;
    private shardTypeRepository;
    private redis?;
    private unifiedAIClient?;
    private aiConnectionService?;
    private conversionService?;
    private shardRelationshipService?;
    private conversationRealtimeService?;
    private notificationService?;
    private userService?;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, redis?: Redis | undefined, unifiedAIClient?: any | undefined, // UnifiedAIClient - optional for AI summarization
    aiConnectionService?: any | undefined, // AIConnectionService - optional for AI summarization
    conversionService?: any | undefined, // ConversionService - optional for PDF export
    shardRelationshipService?: any | undefined, // ShardRelationshipService - optional for threading
    conversationRealtimeService?: any, // ConversationRealtimeService - optional for real-time updates
    notificationService?: any, // NotificationService - optional for notifications
    userService?: any);
    /**
     * Create a new conversation from a template
     */
    createFromTemplate(tenantId: string, userId: string, templateId: string, variables?: Record<string, string>, projectId?: string, linkedShards?: string[]): Promise<Shard>;
    /**
     * Create a new conversation
     */
    create(tenantId: string, userId: string, input: CreateConversationInput): Promise<Shard>;
    /**
     * Get a conversation by ID
     */
    get(conversationId: string, tenantId: string, options?: {
        includeMessages?: boolean;
        messageLimit?: number;
        messageOffset?: number;
        includeLinkedShards?: boolean;
    }): Promise<Shard | null>;
    /**
     * Get linked shards for a conversation
     */
    getLinkedShards(conversationId: string, tenantId: string): Promise<Array<{
        edge: {
            id: string;
            relationshipType: string;
            label?: string;
            sourceShardId: string;
            targetShardId: string;
            createdAt: Date;
        };
        shard: Shard;
    }>>;
    /**
     * Get linked shards count for a conversation
     */
    getLinkedShardsCount(conversationId: string, tenantId: string): Promise<number>;
    /**
     * Update a conversation
     */
    update(conversationId: string, tenantId: string, userId: string, input: UpdateConversationInput): Promise<Shard>;
    /**
     * Delete (or archive) a conversation
     */
    delete(conversationId: string, tenantId: string, userId: string, permanent?: boolean): Promise<void>;
    /**
     * List conversations for a user
     */
    list(tenantId: string, userId: string, options?: ConversationQueryOptions): Promise<{
        conversations: Shard[];
        total: number;
        hasMore: boolean;
    }>;
    /**
     * Add a message to the conversation
     */
    addMessage(conversationId: string, tenantId: string, userId: string, input: SendMessageInput, messageOverrides?: Partial<ConversationMessage>): Promise<ConversationMessage>;
    /**
     * Add an assistant message (usually from AI generation)
     */
    addAssistantMessage(conversationId: string, tenantId: string, input: {
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
    }): Promise<ConversationMessage>;
    /**
     * Update a message (e.g., status, content during streaming)
     */
    updateMessage(conversationId: string, tenantId: string, messageId: string, updates: Partial<ConversationMessage>): Promise<ConversationMessage>;
    /**
     * Edit a user message (with edit history tracking)
     * Includes conflict resolution for edits during streaming
     */
    editMessage(conversationId: string, tenantId: string, messageId: string, userId: string, input: EditMessageInput): Promise<ConversationMessage>;
    /**
     * Regenerate the immediate next assistant response after a message edit
     * According to plan: only regenerate the immediate next response, not all subsequent
     */
    regenerateResponseAfterEdit(conversationId: string, tenantId: string, editedMessageId: string, userId: string): Promise<{
        editedMessage: ConversationMessage;
        nextMessage?: ConversationMessage;
    }>;
    /**
     * Get messages with pagination (includes archived messages with lazy-loading)
     * Optimized for performance: only loads archived messages needed for the requested page
     */
    getMessages(conversationId: string, tenantId: string, options?: {
        limit?: number;
        offset?: number;
        branchIndex?: number;
        afterMessageId?: string;
        includeArchived?: boolean;
        fields?: string[];
    }): Promise<{
        messages: ConversationMessage[];
        total: number;
        hasMore: boolean;
    }>;
    /**
     * Select only specified fields from messages (for performance optimization)
     */
    private selectFields;
    /**
     * Add a participant to the conversation
     */
    addParticipant(conversationId: string, tenantId: string, userId: string, participantUserId: string, role?: ParticipantRole): Promise<void>;
    /**
     * Remove a participant from the conversation
     */
    removeParticipant(conversationId: string, tenantId: string, userId: string, participantUserId: string): Promise<void>;
    /**
     * Add feedback to a message
     */
    addFeedback(conversationId: string, tenantId: string, messageId: string, userId: string, input: AddFeedbackInput): Promise<MessageFeedback>;
    /**
     * Get the next branch index for a parent message
     */
    private getNextBranchIndex;
    /**
     * Get all branches for a conversation
     */
    getBranches(conversationId: string, tenantId: string): Promise<{
        branchIndex: number;
        parentMessageId?: string;
        messageCount: number;
        createdAt: Date;
    }[]>;
    /**
     * Recalculate conversation statistics
     */
    private recalculateStats;
    /**
     * Generate a summary for the conversation (AI-powered if available, otherwise simple)
     */
    generateSummary(conversationId: string, tenantId: string, options?: {
        forceAI?: boolean;
        maxMessages?: number;
    }): Promise<string>;
    /**
     * Auto-generate summary when message count reaches trigger interval
     */
    private autoGenerateSummary;
    /**
     * Generate AI-powered summary using LLM
     */
    private generateAISummary;
    /**
     * Invalidate conversation cache
     */
    private invalidateCache;
    /**
     * Get the conversation ShardType ID for a tenant
     */
    private getConversationShardTypeId;
    /**
     * Check if a user can access a conversation
     */
    canAccess(conversationId: string, tenantId: string, userId: string): Promise<{
        canRead: boolean;
        canWrite: boolean;
        role?: ParticipantRole;
    }>;
    /**
     * Archive old messages when conversation exceeds limit or size threshold
     * Keeps last KEEP_RECENT_MESSAGES messages in main shard, archives the rest
     * Can also archive based on shard size (when sizeBased is true)
     */
    private archiveOldMessages;
    /**
     * Estimate the size of a shard in bytes (as it would be stored in Cosmos DB)
     * This is an approximation based on JSON stringification
     */
    private estimateShardSize;
    /**
     * Check shard size and archive if needed
     * Called before operations that might increase shard size
     */
    checkAndArchiveIfNeeded(conversationId: string, tenantId: string, userId: string): Promise<{
        archived: boolean;
        sizeBytes?: number;
        messageCount?: number;
    }>;
    /**
     * Get archived message shards for a conversation
     */
    getArchivedMessageShards(conversationId: string, tenantId: string): Promise<Shard[]>;
    /**
     * Create a new thread (root conversation)
     * A thread is a conversation that can have child conversations
     */
    createThread(tenantId: string, userId: string, input: CreateConversationInput & {
        threadTopic: string;
    }): Promise<Shard>;
    /**
     * Add a conversation to an existing thread
     */
    addToThread(tenantId: string, userId: string, conversationId: string, threadId: string): Promise<Shard>;
    /**
     * Remove a conversation from a thread
     */
    removeFromThread(tenantId: string, userId: string, conversationId: string): Promise<Shard>;
    /**
     * Get all conversations in a thread
     */
    getThreadMembers(threadId: string, tenantId: string, options?: {
        includeArchived?: boolean;
    }): Promise<Shard[]>;
    /**
     * Get thread summary (root conversation + member count)
     */
    getThreadSummary(threadId: string, tenantId: string): Promise<{
        thread: Shard;
        memberCount: number;
        totalMessages: number;
        lastActivityAt: Date;
    }>;
    /**
     * List threads (conversations that are thread roots)
     */
    listThreads(tenantId: string, userId: string, options?: {
        projectId?: string;
        topic?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        threads: Shard[];
        total: number;
        hasMore: boolean;
    }>;
    /**
     * Extract @mentions from message content
     * Supports formats: @username, @[Display Name](user:userId)
     */
    private extractMentions;
    /**
     * Add a comment to a message
     */
    addComment(conversationId: string, tenantId: string, messageId: string, userId: string, input: AddCommentInput): Promise<MessageComment>;
    /**
     * Update a comment
     */
    updateComment(conversationId: string, tenantId: string, messageId: string, commentId: string, userId: string, input: UpdateCommentInput): Promise<MessageComment>;
    /**
     * Delete a comment
     */
    deleteComment(conversationId: string, tenantId: string, messageId: string, commentId: string, userId: string): Promise<void>;
    /**
     * Get comments for a message
     */
    getComments(conversationId: string, tenantId: string, messageId: string): Promise<MessageComment[]>;
    /**
     * Invite users to conversation (add participants with notification)
     */
    inviteUsers(conversationId: string, tenantId: string, userId: string, input: {
        userIds: string[];
        role?: ParticipantRole;
        notify?: boolean;
    }): Promise<void>;
    /**
     * Generate analytics for a conversation
     * Extracts topics, entities, quality metrics, and cost breakdown
     */
    generateAnalytics(conversationId: string, tenantId: string, options?: {
        includeArchived?: boolean;
        forceRegenerate?: boolean;
    }): Promise<ConversationAnalytics>;
    /**
     * Extract topics from conversation messages
     */
    private extractTopics;
    /**
     * Extract entities from conversation messages
     */
    private extractEntities;
    /**
     * Calculate quality metrics from messages and conversation data
     */
    private calculateQualityMetrics;
    /**
     * Calculate cost breakdown
     */
    private calculateCostBreakdown;
    /**
     * Calculate performance metrics
     */
    private calculatePerformanceMetrics;
    /**
     * Calculate usage metrics
     */
    private calculateUsageMetrics;
    /**
     * Get analytics summary (lightweight version)
     */
    getAnalyticsSummary(conversationId: string, tenantId: string): Promise<{
        topics: ConversationTopic[];
        entities: ConversationEntity[];
        quality: ConversationQualityMetrics;
        totalCost: number;
        totalMessages: number;
    }>;
    /**
     * Get conversation configuration for a tenant
     */
    getConversationConfig(tenantId: string): Promise<ConversationConfig>;
    /**
     * Update conversation configuration for a tenant
     */
    updateConversationConfig(tenantId: string, userId: string, input: UpdateConversationConfigInput): Promise<ConversationConfig>;
    /**
     * Get edit history retention limit for a tenant
     */
    private getEditHistoryRetention;
    /**
     * Get default conversation configuration
     */
    private getDefaultConversationConfig;
    /**
     * Export conversation to PDF, Markdown, or JSON
     */
    exportConversation(conversationId: string, tenantId: string, options: ConversationExportOptions): Promise<ConversationExportResult>;
    /**
     * Export conversation to PDF
     */
    private exportToPDF;
    /**
     * Export conversation to Markdown
     */
    private exportToMarkdown;
    /**
     * Export conversation to JSON
     */
    private exportToJSON;
    /**
     * Generate HTML for PDF export
     */
    private generateExportHTML;
    /**
     * Get system-wide conversation statistics (Super Admin only)
     * Aggregates statistics across all tenants
     */
    getSystemStats(options?: {
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
    }>;
    /**
     * Get empty system stats structure
     */
    private getEmptySystemStats;
    private readonly METRICS_PREFIX;
    private readonly SYSTEM_METRICS_PREFIX;
    private readonly DAILY_PREFIX;
    private readonly USERS_SET_KEY;
    private readonly TENANTS_SET_KEY;
    private readonly TOP_TENANTS_SORTED_SET;
    /**
     * Record a conversation event for metrics tracking
     */
    private recordConversationEvent;
    /**
     * Get date key for Redis metrics (YYYY-MM-DD format)
     */
    private getDateKeyForMetrics;
}
//# sourceMappingURL=conversation.service.d.ts.map
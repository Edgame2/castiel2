/**
 * Conversation Types
 * Types for AI conversations with users
 */
export type ParticipantRole = 'owner' | 'participant' | 'viewer';
export interface ConversationParticipant {
    userId: string;
    role: ParticipantRole;
    joinedAt: Date;
    leftAt?: Date;
    isActive: boolean;
}
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type MessageContentType = 'text' | 'markdown' | 'code' | 'error';
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error' | 'cancelled';
export interface ConversationMessage {
    id: string;
    parentId?: string;
    branchIndex: number;
    role: MessageRole;
    userId?: string;
    modelId?: string;
    connectionName?: string;
    content: string;
    contentType: MessageContentType;
    attachments?: MessageAttachment[];
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
    contextSources?: ContextSource[];
    tokens?: TokenUsage;
    cost?: number;
    latencyMs?: number;
    feedback?: MessageFeedback;
    status: MessageStatus;
    errorMessage?: string;
    createdAt: Date;
    updatedAt?: Date;
    isRegenerated: boolean;
    regeneratedFrom?: string;
    regenerationCount: number;
    editHistory?: MessageEdit[];
    editedAt?: Date;
    editedBy?: string;
    originalContent?: string;
    comments?: MessageComment[];
    mentions?: string[];
}
export interface MessageEdit {
    id: string;
    editedAt: Date;
    editedBy: string;
    previousContent: string;
    newContent: string;
    reason?: string;
}
export interface MessageComment {
    id: string;
    userId: string;
    content: string;
    createdAt: Date;
    updatedAt?: Date;
    edited: boolean;
    parentCommentId?: string;
    mentions?: string[];
}
export type AttachmentType = 'file' | 'image' | 'audio' | 'video' | 'document';
export interface MessageAttachment {
    id: string;
    type: AttachmentType;
    name: string;
    url: string;
    mimeType: string;
    size: number;
    shardId?: string;
}
export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error';
export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
    status: ToolCallStatus;
}
export interface ToolResult {
    toolCallId: string;
    result: string;
    error?: string;
    durationMs?: number;
}
export interface ContextSource {
    id: string;
    query: string;
    chunks: RetrievedChunk[];
    retrievedAt: Date;
    totalChunks: number;
    totalTokens: number;
}
export interface RetrievedChunk {
    shardId: string;
    shardTypeId: string;
    shardName: string;
    chunkIndex: number;
    content: string;
    score: number;
    fieldPath?: string;
    highlight?: string;
}
export type FeedbackCategory = 'accurate' | 'helpful' | 'creative' | 'clear' | 'detailed' | 'concise' | 'inaccurate' | 'unhelpful' | 'confusing' | 'incomplete' | 'off_topic' | 'harmful';
export interface MessageFeedback {
    id: string;
    userId: string;
    rating?: number;
    thumbs?: 'up' | 'down';
    categories?: FeedbackCategory[];
    comment?: string;
    regenerateRequested: boolean;
    reportedAsHarmful: boolean;
    createdAt: Date;
    updatedAt?: Date;
}
export interface ConversationBranch {
    id: string;
    name?: string;
    parentMessageId: string;
    branchIndex: number;
    createdAt: Date;
    createdBy: string;
    messageCount: number;
}
export interface TokenUsage {
    prompt: number;
    completion: number;
    total: number;
}
export interface ConversationStats {
    messageCount: number;
    userMessageCount: number;
    assistantMessageCount: number;
    toolCallCount: number;
    totalTokens: number;
    totalCost: number;
    averageLatencyMs: number;
    participantCount: number;
    branchCount: number;
    feedbackCount: number;
    averageRating?: number;
    lastActivityAt: Date;
}
export interface ConversationTopic {
    id: string;
    name: string;
    category?: string;
    relevanceScore: number;
    frequency: number;
    firstMentionedAt: Date;
    lastMentionedAt: Date;
}
export interface ConversationEntity {
    id: string;
    name: string;
    type: 'person' | 'organization' | 'location' | 'product' | 'project' | 'document' | 'other';
    shardId?: string;
    frequency: number;
    firstMentionedAt: Date;
    lastMentionedAt: Date;
    context?: string;
}
export interface ConversationQualityMetrics {
    totalFeedback: number;
    positiveFeedback: number;
    negativeFeedback: number;
    averageRating?: number;
    ratingDistribution: Record<number, number>;
    totalRegenerations: number;
    regenerationRate: number;
    averageResponseLength: number;
    averageCitationsPerMessage: number;
    messagesWithCitations: number;
    citationRate: number;
    errorCount: number;
    errorRate: number;
    errorsByType: Record<string, number>;
    commentCount: number;
    averageCommentsPerMessage: number;
    mentionCount: number;
    averageMentionsPerMessage: number;
}
export interface ConversationAnalytics {
    conversationId: string;
    tenantId: string;
    topics: ConversationTopic[];
    topTopics: ConversationTopic[];
    entities: ConversationEntity[];
    topEntities: ConversationEntity[];
    quality: ConversationQualityMetrics;
    costBreakdown: {
        totalCost: number;
        costPerMessage: number;
        costByModel: Record<string, number>;
        costByDate: Array<{
            date: string;
            cost: number;
        }>;
    };
    performance: {
        averageLatencyMs: number;
        p50LatencyMs: number;
        p95LatencyMs: number;
        p99LatencyMs: number;
        totalLatencyMs: number;
    };
    usage: {
        totalMessages: number;
        totalTokens: number;
        averageTokensPerMessage: number;
        messagesByRole: Record<MessageRole, number>;
        messagesByDate: Array<{
            date: string;
            count: number;
        }>;
    };
    analyzedAt: Date;
    conversationStartDate: Date;
    conversationEndDate?: Date;
    lastUpdatedAt: Date;
}
export interface ConversationConfig {
    tenantId: string;
    maxEditHistory: number;
    maxMessageLimit: number;
    autoSummarizeEnabled: boolean;
    autoSummarizeThreshold: number;
    autoArchiveEnabled: boolean;
    autoArchiveThreshold: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
}
export interface UpdateConversationConfigInput {
    maxEditHistory?: number;
    maxMessageLimit?: number;
    autoSummarizeEnabled?: boolean;
    autoSummarizeThreshold?: number;
    autoArchiveEnabled?: boolean;
    autoArchiveThreshold?: number;
}
export type ConversationStatus = 'active' | 'archived' | 'deleted';
export type ConversationVisibility = 'private' | 'shared' | 'public';
export interface ConversationStructuredData {
    title?: string;
    summary?: string;
    status: ConversationStatus;
    visibility: ConversationVisibility;
    assistantId?: string;
    templateId?: string;
    defaultModelId?: string;
    threadId?: string;
    parentConversationId?: string;
    threadTopic?: string;
    threadOrder?: number;
    participants: ConversationParticipant[];
    messages: ConversationMessage[];
    branches?: ConversationBranch[];
    stats?: ConversationStats;
    participantCount?: number;
    messageCount?: number;
    totalTokens?: number;
    totalCost?: number;
    lastActivityAt?: Date;
    tags?: string[];
}
export interface CreateConversationInput {
    title?: string;
    visibility?: ConversationVisibility;
    assistantId?: string;
    templateId?: string;
    defaultModelId?: string;
    linkedShards?: string[];
    tags?: string[];
    threadId?: string;
    parentConversationId?: string;
    threadTopic?: string;
    threadOrder?: number;
    initialMessage?: {
        content: string;
        contentType?: 'text' | 'markdown';
        attachments?: Array<{
            type: string;
            url: string;
            name: string;
            mimeType: string;
        }>;
    };
}
export interface SendMessageInput {
    content: string;
    contentType?: MessageContentType;
    attachments?: Omit<MessageAttachment, 'id'>[];
    parentId?: string;
    modelId?: string;
}
export interface EditMessageInput {
    content: string;
    reason?: string;
    expectedUpdatedAt?: string;
}
export interface RegenerateMessageInput {
    modelId?: string;
    createBranch?: boolean;
    temperature?: number;
}
export interface AddFeedbackInput {
    rating?: number;
    thumbs?: 'up' | 'down';
    categories?: FeedbackCategory[];
    comment?: string;
    regenerateRequested?: boolean;
    reportedAsHarmful?: boolean;
}
export interface AddParticipantInput {
    userId: string;
    role: ParticipantRole;
    notify?: boolean;
}
export interface AddCommentInput {
    content: string;
    parentCommentId?: string;
}
export interface UpdateCommentInput {
    content: string;
}
export interface UpdateConversationInput {
    title?: string;
    summary?: string;
    visibility?: ConversationVisibility;
    status?: ConversationStatus;
    assistantId?: string;
    templateId?: string;
    defaultModelId?: string;
    tags?: string[];
    addLinkedShards?: string[];
    removeLinkedShards?: string[];
}
export interface ConversationQueryOptions {
    status?: ConversationStatus[];
    visibility?: ConversationVisibility[];
    participantId?: string;
    assistantId?: string;
    search?: string;
    tags?: string[];
    linkedShardId?: string;
    includeLinkedShardsCount?: boolean;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
    orderBy?: 'createdAt' | 'updatedAt' | 'lastActivityAt' | 'messageCount';
    orderDirection?: 'asc' | 'desc';
}
export interface ConversationWithMessagesOptions {
    includeBranches?: boolean;
    messageLimit?: number;
    messageOffset?: number;
    branchIndex?: number;
}
export type ConversationEventType = 'conversation.created' | 'conversation.updated' | 'conversation.archived' | 'conversation.deleted' | 'message.sent' | 'message.streaming' | 'message.complete' | 'message.error' | 'message.regenerated' | 'participant.added' | 'participant.removed' | 'feedback.added';
export interface ConversationEvent {
    type: ConversationEventType;
    conversationId: string;
    tenantId: string;
    userId: string;
    timestamp: Date;
    data: Record<string, any>;
}
//# sourceMappingURL=conversation.types.d.ts.map
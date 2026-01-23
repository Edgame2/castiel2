/**
 * Conversation Types
 * Types for AI conversations with users
 */

// ============================================
// Participant Types
// ============================================

export type ParticipantRole = 'owner' | 'participant' | 'viewer';

export interface ConversationParticipant {
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
}

// ============================================
// Message Types
// ============================================

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type MessageContentType = 'text' | 'markdown' | 'code' | 'error';
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error' | 'cancelled';

export interface ConversationMessage {
  id: string;
  parentId?: string;                    // For branching
  branchIndex: number;                  // 0 = original, 1+ = branches

  // Role & Author
  role: MessageRole;
  userId?: string;                      // Who sent (for user messages)
  modelId?: string;                     // c_aimodel reference (for assistant)
  connectionName?: string;               // AI connection name (for display in chat)

  // Content
  content: string;
  contentType: MessageContentType;

  // Attachments
  attachments?: MessageAttachment[];

  // Tool/Function Calls
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];

  // Context Sources (RAG)
  contextSources?: ContextSource[];

  // Metrics
  tokens?: TokenUsage;
  cost?: number;                        // Estimated cost in USD
  latencyMs?: number;                   // Response time

  // Feedback
  feedback?: MessageFeedback;

  // Status
  status: MessageStatus;
  errorMessage?: string;

  // Timestamps
  createdAt: Date;
  updatedAt?: Date;

  // Regeneration
  isRegenerated: boolean;
  regeneratedFrom?: string;             // Original message ID
  regenerationCount: number;

  // Edit History (for user messages)
  editHistory?: MessageEdit[];
  editedAt?: Date;
  editedBy?: string;
  originalContent?: string;             // Snapshot of original before first edit

  // Collaboration
  comments?: MessageComment[];          // Comments on this message
  mentions?: string[];                  // User IDs mentioned in this message (@mentions)

  // Phase 5.1: Conversation Context Management
  pinned?: boolean;                     // Whether this message is pinned (always kept in context)
  pinnedAt?: Date;                     // When the message was pinned
  pinnedBy?: string;                    // User ID who pinned the message
  importanceScore?: number;              // AI-calculated importance score (0-1)
}

// ============================================
// Message Edit Types
// ============================================

export interface MessageEdit {
  id: string;
  editedAt: Date;
  editedBy: string;
  previousContent: string;
  newContent: string;
  reason?: string;                      // User-provided reason for edit
}

// ============================================
// Message Comment Types
// ============================================

export interface MessageComment {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  edited: boolean;
  parentCommentId?: string;             // For threaded replies
  mentions?: string[];                  // User IDs mentioned in comment
}

// ============================================
// Attachment Types
// ============================================

export type AttachmentType = 'file' | 'image' | 'audio' | 'video' | 'document';

export interface MessageAttachment {
  id: string;
  type: AttachmentType;
  name: string;
  url: string;
  mimeType: string;
  size: number;                         // Bytes
  shardId?: string;                     // Link to c_document if stored
}

// ============================================
// Tool/Function Call Types
// ============================================

export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error';

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;                  // JSON string
  };
  status: ToolCallStatus;
}

export interface ToolResult {
  toolCallId: string;
  result: string;                       // JSON string or text
  error?: string;
  durationMs?: number;
}

// ============================================
// Context Source Types (RAG)
// ============================================

export interface ContextSource {
  id: string;
  query: string;                        // User query that triggered retrieval

  // Retrieved chunks
  chunks: RetrievedChunk[];

  // Metadata
  retrievedAt: Date;
  totalChunks: number;
  totalTokens: number;
}

export interface RetrievedChunk {
  shardId: string;                      // Source shard
  shardTypeId: string;
  shardName: string;                    // For display

  chunkIndex: number;
  content: string;                      // Chunk content (snapshot)

  // Similarity
  score: number;                        // 0-1 similarity score

  // Metadata
  fieldPath?: string;                   // Which field was matched
  highlight?: string;                   // Highlighted match
}

// ============================================
// Feedback Types
// ============================================

export type FeedbackCategory =
  | 'accurate'
  | 'helpful'
  | 'creative'
  | 'clear'
  | 'detailed'
  | 'concise'
  | 'inaccurate'
  | 'unhelpful'
  | 'confusing'
  | 'incomplete'
  | 'off_topic'
  | 'harmful';

export interface MessageFeedback {
  id: string;
  userId: string;

  // Rating
  rating?: number;                      // 1-5 stars
  thumbs?: 'up' | 'down';

  // Categories
  categories?: FeedbackCategory[];

  // Comments
  comment?: string;

  // Actions
  regenerateRequested: boolean;
  reportedAsHarmful: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
}

// ============================================
// Branching Types
// ============================================

export interface ConversationBranch {
  id: string;
  name?: string;
  parentMessageId: string;              // Where branch started
  branchIndex: number;                  // 0 = original, 1+ = branches
  createdAt: Date;
  createdBy: string;
  messageCount: number;
}

// ============================================
// Statistics Types
// ============================================

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

// ============================================
// Analytics Types
// ============================================

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
  shardId?: string;                      // If resolved to a shard
  frequency: number;
  firstMentionedAt: Date;
  lastMentionedAt: Date;
  context?: string;                      // Context where entity was mentioned
}

export interface ConversationQualityMetrics {
  // Feedback metrics
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  averageRating?: number;
  ratingDistribution: Record<number, number>; // Rating value -> count

  // Regeneration metrics
  totalRegenerations: number;
  regenerationRate: number;              // Regenerations / total assistant messages

  // Response quality
  averageResponseLength: number;
  averageCitationsPerMessage: number;
  messagesWithCitations: number;
  citationRate: number;                  // Messages with citations / total assistant messages

  // Error metrics
  errorCount: number;
  errorRate: number;                     // Errors / total messages
  errorsByType: Record<string, number>;

  // Engagement metrics
  commentCount: number;
  averageCommentsPerMessage: number;
  mentionCount: number;
  averageMentionsPerMessage: number;
}

export interface ConversationAnalytics {
  conversationId: string;
  tenantId: string;

  // Topics
  topics: ConversationTopic[];
  topTopics: ConversationTopic[];       // Top N topics by relevance

  // Entities
  entities: ConversationEntity[];
  topEntities: ConversationEntity[];     // Top N entities by frequency

  // Quality
  quality: ConversationQualityMetrics;

  // Cost
  costBreakdown: {
    totalCost: number;
    costPerMessage: number;
    costByModel: Record<string, number>;
    costByDate: Array<{ date: string; cost: number }>;
  };

  // Performance
  performance: {
    averageLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    totalLatencyMs: number;
  };

  // Usage
  usage: {
    totalMessages: number;
    totalTokens: number;
    averageTokensPerMessage: number;
    messagesByRole: Record<MessageRole, number>;
    messagesByDate: Array<{ date: string; count: number }>;
  };

  // Timestamps
  analyzedAt: Date;
  conversationStartDate: Date;
  conversationEndDate?: Date;
  lastUpdatedAt: Date;
}

// ============================================
// Conversation Configuration Types
// ============================================

export interface ConversationConfig {
  tenantId: string;
  
  // Edit History Retention
  maxEditHistory: number;              // Maximum number of edit history entries to keep per message (default: 10)
  
  // Message Limits
  maxMessageLimit: number;             // Maximum messages before auto-archiving (default: 1000)
  
  // Auto-summarization
  autoSummarizeEnabled: boolean;       // Enable automatic summarization (default: true)
  autoSummarizeThreshold: number;      // Number of messages before auto-summarizing (default: 50)
  preserveRecentMessages?: number;     // Phase 5.1: Number of recent messages to keep in full (default: 10)
  
  // Auto-archiving
  autoArchiveEnabled: boolean;         // Enable automatic message archiving (default: true)
  autoArchiveThreshold: number;        // Number of messages before auto-archiving (default: 1000)
  
  // Metadata
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
  preserveRecentMessages?: number;     // Phase 5.1: Number of recent messages to keep in full
  autoArchiveEnabled?: boolean;
  autoArchiveThreshold?: number;
}

// ============================================
// Conversation Structured Data
// ============================================

export type ConversationStatus = 'active' | 'archived' | 'deleted';
export type ConversationVisibility = 'private' | 'shared' | 'public';

export interface ConversationStructuredData {
  // Metadata
  title?: string;
  summary?: string;
  status: ConversationStatus;
  visibility: ConversationVisibility;

  // AI Configuration
  assistantId?: string;                 // c_assistant reference
  templateId?: string;                  // c_contextTemplate reference
  defaultModelId?: string;              // c_aimodel reference

  // Threading
  threadId?: string;                    // Thread ID (same as conversation ID for thread root)
  parentConversationId?: string;        // Parent conversation in thread (null for thread root)
  threadTopic?: string;                  // Topic/theme of the thread
  threadOrder?: number;                 // Order within thread (0 = root)

  // Participants
  participants: ConversationParticipant[];

  // Messages
  messages: ConversationMessage[];

  // Branches
  branches?: ConversationBranch[];

  // Statistics (denormalized for quick access)
  stats?: ConversationStats;

  // Denormalized stats for form display
  participantCount?: number;
  messageCount?: number;
  totalTokens?: number;
  totalCost?: number;
  lastActivityAt?: Date;

  // Tags
  tags?: string[];
}

// ============================================
// API Input Types
// ============================================

export interface CreateConversationInput {
  title?: string;
  visibility?: ConversationVisibility;
  assistantId?: string;
  templateId?: string;
  defaultModelId?: string;
  linkedShards?: string[];              // Projects, companies, etc.
  tags?: string[];
  // Threading properties
  threadId?: string;
  parentConversationId?: string;
  threadTopic?: string;
  threadOrder?: number;
  // Optional first message
  initialMessage?: {
    content: string;
    contentType?: 'text' | 'markdown';
    attachments?: Array<{ type: string; url: string; name: string; mimeType: string }>;
  };
}

export interface SendMessageInput {
  content: string;
  contentType?: MessageContentType;
  attachments?: Omit<MessageAttachment, 'id'>[];
  parentId?: string;                    // For branching
  modelId?: string;                     // Override model
}

export interface EditMessageInput {
  content: string;
  reason?: string;                      // Optional reason for edit
  expectedUpdatedAt?: string;          // For optimistic locking (ISO date string)
}

export interface RegenerateMessageInput {
  modelId?: string;                     // Use different model
  createBranch?: boolean;               // Create new branch
  temperature?: number;                 // Override temperature
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
  notify?: boolean;                     // Send notification to user
}

export interface AddCommentInput {
  content: string;
  parentCommentId?: string;             // For threaded replies
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
  addLinkedShards?: string[];              // Shard IDs to link (creates relationships)
  removeLinkedShards?: string[];           // Shard IDs to unlink (removes relationships)
}

// ============================================
// API Query Types
// ============================================

export interface ConversationQueryOptions {
  status?: ConversationStatus[];
  visibility?: ConversationVisibility[];
  participantId?: string;
  assistantId?: string;
  search?: string;
  tags?: string[];
  linkedShardId?: string;                  // Filter conversations linked to a specific shard
  includeLinkedShardsCount?: boolean;      // Include linked shards count in list response
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
  branchIndex?: number;                 // Filter by branch
}

// ============================================
// Event Types
// ============================================

export type ConversationEventType =
  | 'conversation.created'
  | 'conversation.updated'
  | 'conversation.archived'
  | 'conversation.deleted'
  | 'message.sent'
  | 'message.streaming'
  | 'message.complete'
  | 'message.error'
  | 'message.regenerated'
  | 'participant.added'
  | 'participant.removed'
  | 'feedback.added';

export interface ConversationEvent {
  type: ConversationEventType;
  conversationId: string;
  tenantId: string;
  userId: string;
  timestamp: Date;
  data: Record<string, any>;
}







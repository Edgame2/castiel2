/**
 * Collaboration Service types
 * Core data model for real-time collaboration features
 */

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum ConversationVisibility {
  PRIVATE = 'private',
  SHARED = 'shared',
  PUBLIC = 'public',
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum MessageStatus {
  PENDING = 'pending',
  STREAMING = 'streaming',
  COMPLETE = 'complete',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

export enum ParticipantRole {
  OWNER = 'owner',
  PARTICIPANT = 'participant',
  VIEWER = 'viewer',
}

/**
 * Conversation
 */
export interface Conversation {
  id: string;
  tenantId: string; // Partition key
  title?: string;
  summary?: string;
  status: ConversationStatus;
  visibility: ConversationVisibility;
  assistantId?: string;
  templateId?: string;
  defaultModelId?: string;
  participants: Participant[];
  messageCount: number;
  participantCount: number;
  totalTokens?: number;
  totalCost?: number;
  tags?: string[];
  threadId?: string;
  threadTopic?: string;
  threadOrder?: number;
  parentConversationId?: string;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Participant
 */
export interface Participant {
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
}

/**
 * Conversation Message
 */
export interface ConversationMessage {
  id: string;
  tenantId: string; // Partition key
  conversationId: string;
  parentId?: string; // For branching
  branchIndex: number; // 0 = original, 1+ = branches
  role: MessageRole;
  userId?: string; // Who sent (for user messages)
  modelId?: string; // AI model reference (for assistant)
  connectionName?: string;
  content: string;
  contentType: 'text' | 'markdown' | 'code' | 'json';
  attachments?: MessageAttachment[];
  toolCalls?: any[];
  toolResults?: any[];
  contextSources?: ContextSource[];
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  latencyMs?: number;
  feedback?: MessageFeedback;
  status: MessageStatus;
  errorMessage?: string;
  isRegenerated: boolean;
  regeneratedFrom?: string;
  regenerationCount: number;
  comments?: MessageComment[];
  reactions?: MessageReaction[]; // Message-level reactions
  mentions?: string[]; // User IDs mentioned
  pinned?: boolean;
  pinnedAt?: Date;
  pinnedBy?: string;
  importanceScore?: number;
  createdAt: Date;
  updatedAt?: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Message Attachment
 */
export interface MessageAttachment {
  id: string;
  type: 'file' | 'image' | 'document' | 'link';
  name: string;
  url?: string;
  size?: number;
  mimeType?: string;
  metadata?: Record<string, any>;
}

/**
 * Context Source
 */
export interface ContextSource {
  shardId: string;
  shardTypeId: string;
  shardName: string;
  relevanceScore?: number;
  excerpt?: string;
}

/**
 * Message Feedback
 */
export interface MessageFeedback {
  rating?: 'positive' | 'negative' | 'neutral';
  comment?: string;
  submittedAt?: Date;
  submittedBy?: string;
}

/**
 * Message Comment
 */
export interface MessageComment {
  id: string;
  userId: string;
  userName?: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  edited?: boolean;
  reactions?: MessageReaction[];
}

/**
 * Message Reaction
 */
export interface MessageReaction {
  id: string;
  userId: string;
  userName?: string;
  emoji: string; // e.g., '👍', '❤️', '🎉'
  createdAt: Date;
}

/**
 * Create conversation input
 */
export interface CreateConversationInput {
  tenantId: string;
  userId: string;
  title?: string;
  visibility?: ConversationVisibility;
  assistantId?: string;
  templateId?: string;
  defaultModelId?: string;
  tags?: string[];
  participants?: string[]; // User IDs
}

/**
 * Update conversation input
 */
export interface UpdateConversationInput {
  title?: string;
  summary?: string;
  status?: ConversationStatus;
  visibility?: ConversationVisibility;
  tags?: string[];
}

/**
 * Create message input
 */
export interface CreateMessageInput {
  tenantId: string;
  userId: string;
  conversationId: string;
  content: string;
  contentType?: ConversationMessage['contentType'];
  parentId?: string;
  attachments?: MessageAttachment[];
  mentions?: string[];
}

/**
 * Create comment input
 */
export interface CreateCommentInput {
  tenantId: string;
  userId: string;
  conversationId: string;
  messageId: string;
  content: string;
}

/**
 * Create reaction input
 */
export interface CreateReactionInput {
  tenantId: string;
  userId: string;
  conversationId: string;
  messageId: string;
  emoji: string;
}

/**
 * Share conversation input
 */
export interface ShareConversationInput {
  tenantId: string;
  userId: string;
  conversationId: string;
  userIds: string[]; // Users to share with
  role?: ParticipantRole;
}


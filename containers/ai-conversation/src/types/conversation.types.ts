/**
 * Conversation Types
 * Type definitions for AI conversations
 */

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type MessageContentType = 'text' | 'markdown' | 'code' | 'error';
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error' | 'cancelled';
export type ConversationStatus = 'active' | 'archived' | 'deleted';
export type ConversationVisibility = 'private' | 'shared' | 'public';
export type ParticipantRole = 'owner' | 'participant' | 'viewer';

export interface ConversationParticipant {
  userId: string;
  role: ParticipantRole;
  joinedAt: Date | string;
  leftAt?: Date | string;
  isActive: boolean;
}

export interface ConversationMessage {
  id: string;
  parentId?: string;
  role: MessageRole;
  userId?: string;
  modelId?: string;
  content: string;
  contentType: MessageContentType;
  status: MessageStatus;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  latencyMs?: number;
  contextSources?: ContextSource[];
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface ContextSource {
  id: string;
  shardId: string;
  shardTypeId: string;
  shardName: string;
  chunks: RetrievedChunk[];
  retrievedAt: Date | string;
}

export interface RetrievedChunk {
  shardId: string;
  shardTypeId: string;
  shardName: string;
  chunkIndex: number;
  content: string;
  score: number;
}

export interface ConversationStructuredData {
  title: string;
  summary?: string;
  status: ConversationStatus;
  visibility: ConversationVisibility;
  assistantId?: string;
  templateId?: string;
  defaultModelId?: string;
  participants: ConversationParticipant[];
  messages: ConversationMessage[];
  stats: ConversationStats;
  participantCount: number;
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  lastActivityAt: Date | string;
  tags?: string[];
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
  lastActivityAt: Date | string;
}

export interface CreateConversationInput {
  title?: string;
  visibility?: ConversationVisibility;
  assistantId?: string;
  templateId?: string;
  defaultModelId?: string;
  linkedShards?: string[];
  initialMessage?: {
    content: string;
    contentType?: MessageContentType;
  };
  tags?: string[];
}

export interface SendMessageInput {
  content: string;
  contentType?: MessageContentType;
  parentId?: string;
  modelId?: string;
  includeContext?: boolean;
}

export interface Conversation {
  id: string;
  tenantId: string;
  structuredData: ConversationStructuredData;
  createdAt: Date | string;
  updatedAt: Date | string;
}

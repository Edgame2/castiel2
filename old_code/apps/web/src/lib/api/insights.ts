/**
 * AI Insights API Client
 * Handles communication with the AI Insights backend
 */

import { apiClient, getAuthToken } from './client'

// ============================================
// Conversation Analytics Types
// ============================================

export interface ConversationTopic {
  id: string
  name: string
  relevanceScore: number
  messageIds: string[]
  firstMentionedAt: string
  lastMentionedAt: string
}

export interface ConversationEntity {
  shardId: string
  shardName: string
  shardTypeId: string
  frequency: number
  relevanceScore: number
  messageIds: string[]
  firstMentionedAt: string
  lastMentionedAt: string
}

export interface ConversationQualityMetrics {
  averageCitations: number
  citationAccuracy: number
  supportScore: number
  userSatisfaction: {
    thumbsUp: number
    thumbsDown: number
    averageRating: number
  }
  errorRate: number
  regenerationRate: number
}

export interface ConversationAnalytics {
  conversationId: string
  tenantId: string
  topics: ConversationTopic[]
  topTopics: ConversationTopic[]
  entities: ConversationEntity[]
  topEntities: ConversationEntity[]
  quality: ConversationQualityMetrics
  costBreakdown: {
    totalCost: number
    costPerMessage: number
    costByModel: Record<string, number>
    costByDate: Array<{ date: string; cost: number }>
  }
  performance: {
    averageLatencyMs: number
    p50LatencyMs: number
    p95LatencyMs: number
    p99LatencyMs: number
    totalLatencyMs: number
  }
  usage: {
    totalMessages: number
    totalTokens: number
    averageTokensPerMessage: number
    messagesByRole: Record<string, number>
    messagesByDate: Array<{ date: string; count: number }>
  }
  analyzedAt: string
  conversationStartDate: string
  conversationEndDate?: string
  lastUpdatedAt: string
}

// ============================================
// Types
// ============================================

export interface ContextScope {
  shardId?: string
  shardTypeId?: string
  projectId?: string
  companyId?: string
  timeRange?: {
    from: string
    to: string
  }
  tags?: string[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  contentType: 'text' | 'markdown' | 'code' | 'error'
  modelId?: string
  modelName?: string
  connectionName?: string
  userId?: string
  attachments?: {
    id: string
    type: string
    name: string
    url: string
    size: number
  }[]
  contextSources?: {
    shardId: string
    shardName: string
    shardTypeId: string
    score: number
    highlight?: string
  }[]
  citations?: {
    id: string
    text: string
    sourceShardId: string
    sourceShardName: string
    confidence: number
  }[]
  feedback?: {
    rating?: number
    thumbs?: 'up' | 'down'
    categories?: string[]
    comment?: string
  }
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost?: number
  latencyMs?: number
  status: 'pending' | 'streaming' | 'complete' | 'error' | 'cancelled'
  createdAt: string
  updatedAt?: string
  // Edit History
  editHistory?: MessageEdit[]
  editedAt?: string
  editedBy?: string
  originalContent?: string
  // Regeneration
  isRegenerated?: boolean
  regeneratedFrom?: string
  regenerationCount?: number
  // Warnings (e.g., ungrounded response, context quality issues)
  warnings?: Array<{
    type: string
    message: string
    severity: 'low' | 'medium' | 'high'
    impact?: string
  }>
  // Extended metadata
  metadata?: {
    contextQuality?: ContextQuality
    provider?: string
    connectionId?: string
    modelVersion?: string
    [key: string]: unknown
  }
}

export interface MessageEdit {
  id: string
  editedAt: string
  editedBy: string
  previousContent: string
  newContent: string
  reason?: string
}

export interface Conversation {
  id: string
  title?: string
  summary?: string
  status: 'active' | 'archived' | 'deleted'
  visibility: 'private' | 'shared' | 'public'
  assistantId?: string
  assistantName?: string
  templateId?: string
  defaultModelId?: string
  participants: {
    userId: string
    displayName?: string
    role: 'owner' | 'participant' | 'viewer'
    isActive: boolean
  }[]
  messages: ChatMessage[]
  messageCount: number
  participantCount: number
  totalTokens: number
  totalCost: number
  tags?: string[]
  // Threading fields
  threadId?: string
  threadTopic?: string
  threadOrder?: number
  parentConversationId?: string
  // Linked shards
  linkedShards?: Array<{
    id: string
    shardTypeId: string
    name: string
    structuredData?: any
    relationship: {
      edgeId: string
      type: string
      label?: string
      direction: 'outgoing' | 'incoming'
      createdAt: string
    }
  }>
  linkedShardsCount?: number
  lastActivityAt: string
  createdAt: string
  updatedAt: string
}

export interface ConversationSummary {
  id: string
  title?: string
  summary?: string
  status: 'active' | 'archived' | 'deleted'
  visibility: 'private' | 'shared' | 'public'
  messageCount: number
  participantCount: number
  lastMessage?: {
    content: string
    role: 'user' | 'assistant'
    createdAt: string
  }
  tags?: string[]
  linkedShardsCount?: number
  createdAt: string
  updatedAt: string
  lastActivityAt: string
}

// ============================================
// Context Quality Types
// ============================================

export interface ContextQuality {
  totalTokens: number
  tokenLimit: number
  truncated: boolean
  truncatedSections?: string[]
  sourceCount: number
  sourceTypes: string[]
  averageRelevance: number
  relevanceDistribution: Array<{ range: string; count: number }>
  missingExpectedSources: string[]
  completeness: number // 0-1
  warnings: Array<{
    type: string
    message: string
    severity: 'low' | 'medium' | 'high'
    impact?: string
  }>
  qualityScore: number // 0-1 overall
}

export interface InsightResponse {
  content: string
  format: string
  citations: {
    id: string
    text: string
    source: {
      shardId: string
      shardName: string
      shardTypeId: string
    }
    confidence: number
  }[]
  confidence: number
  groundingScore: number
  sources: {
    shardId: string
    shardName: string
    shardTypeId: string
    relevance: number
  }[]
  suggestedQuestions: string[]
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost: number
  latencyMs: number
  insightType: string
  model: string
  templateId?: string
  createdAt?: string
  conversationId?: string
  // Warnings (e.g., ungrounded response, context quality issues)
  warnings?: Array<{
    type: string
    message: string
    severity: 'low' | 'medium' | 'high'
    impact?: string
  }>
  // Extended metadata
  metadata?: {
    contextQuality?: ContextQuality
    provider?: string
    connectionId?: string
    modelVersion?: string
    [key: string]: unknown
  }
}

export interface QuickInsightResponse {
  id: string
  shardId: string
  type: string
  content: string
  format: string
  sources: {
    shardId: string
    shardName: string
    relevance: number
  }[]
  confidence: number
  suggestedQuestions: string[]
  createdAt: string
}

export interface Suggestion {
  question: string
  category: string
  priority: number
}

export interface AIModel {
  id: string
  name: string
  provider: string
  capabilities: {
    supportsStreaming: boolean
    supportsVision: boolean
    supportsFunctionCalling: boolean
    supportsJSON: boolean
  }
  limits: {
    contextWindow: number
    maxOutputTokens: number
  }
  pricing: {
    inputPricePerMillion: number
    outputPricePerMillion: number
  }
}

export type ContentCapability = 'text' | 'image' | 'audio' | 'video' | 'embedding'

export type TaskComplexity = 'simple' | 'moderate' | 'complex'

export interface ModelUnavailableResponse {
  error: 'MODEL_UNAVAILABLE' | 'NO_CONNECTIONS' | 'CONTENT_TYPE_UNSUPPORTED'
  message: string
  availableAlternatives?: Array<{
    modelId: string
    modelName: string
    provider: string
    capabilities: ContentCapability[]
    reason: string
  }>
  suggestedAction: string
  availableContentTypes?: ContentCapability[]
}

// ============================================
// Streaming Event Types
// ============================================

export type StreamEvent =
  | { type: 'start'; messageId: string; conversationId: string; model: string }
  | { type: 'context'; sources: { shardId: string; shardName: string }[] }
  | { type: 'delta'; content: string; index: number }
  | { type: 'citation'; citations: { id: string; text: string; sourceShardId: string }[] }
  | { type: 'complete'; response: InsightResponse }
  | { type: 'error'; code: string; message: string }
  | { type: 'model_unavailable'; error: ModelUnavailableResponse }
  | { type: 'done' }

// ============================================
// API Client
// ============================================

export const insightsApi = {
  // ============================================
  // Chat API
  // ============================================

  /**
   * Send a message (non-streaming)
   */
  async sendMessage(data: {
    conversationId?: string
    content: string
    contentType?: 'text' | 'markdown'
    scope?: ContextScope
    assistantId?: string
    modelId?: string
    templateId?: string
    requiredContentType?: ContentCapability
    allowContentFallback?: boolean
    taskComplexity?: TaskComplexity
    budget?: {
      maxCostUSD?: number
      preferEconomy?: boolean
    }
    options?: {
      temperature?: number
      maxTokens?: number
      includeReasoningSteps?: boolean
    }
  }): Promise<InsightResponse | ModelUnavailableResponse> {
    const response = await apiClient.post('/api/v1/insights/chat', data)
    return response.data
  },

  /**
   * Send a message with streaming
   */
  streamMessage(
    data: {
      conversationId?: string
      content: string
      contentType?: 'text' | 'markdown'
      scope?: ContextScope
      assistantId?: string
      modelId?: string
      templateId?: string
      requiredContentType?: ContentCapability
      allowContentFallback?: boolean
      taskComplexity?: TaskComplexity
      budget?: {
        maxCostUSD?: number
        preferEconomy?: boolean
      }
      linkedShards?: string[] // Shard IDs to link when creating a new conversation
      assetIds?: string[] // Asset IDs to link to the message after creation
      options?: {
        temperature?: number
        maxTokens?: number
      }
    },
    onEvent: (event: StreamEvent) => void,
    onError?: (error: Error) => void
  ): AbortController {
    const controller = new AbortController()

    // Get the base URL from the API client
    const baseURL = apiClient.defaults.baseURL || ''
    const url = `${baseURL}/api/v1/insights/chat`

    getAuthToken().then(token => {
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('No response body')
          }

          const decoder = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })

            // Parse SSE events
            const lines = buffer.split('\n' as any)
            buffer = lines.pop() || ''

            let eventType = ''
            let eventData = ''

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7)
              } else if (line.startsWith('data: ')) {
                eventData = line.slice(6)

                if (eventType && eventData) {
                  try {
                    const parsed = JSON.parse(eventData)
                    onEvent({ type: eventType, ...parsed } as StreamEvent)
                  } catch {
                    // Ignore parse errors
                  }
                }

                eventType = ''
                eventData = ''
              }
            }
          }

          onEvent({ type: 'done' })
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            onError?.(error)
          }
        })
    })

    return controller
  },

  // ============================================
  // Quick Insights API
  // ============================================

  /**
   * Get quick insight for a shard
   */
  async getQuickInsight(data: {
    shardId: string
    type: 'summary' | 'key_points' | 'risks' | 'opportunities' | 'next_steps' | 'comparison' | 'trends' | 'custom'
    customPrompt?: string
    options?: {
      format?: 'brief' | 'detailed' | 'bullets' | 'table'
      maxLength?: number
      modelId?: string
    }
  }): Promise<QuickInsightResponse> {
    const response = await apiClient.post('/api/v1/insights/quick', data)
    return response.data
  },

  /**
   * Get suggested questions for a shard
   */
  async getSuggestions(
    shardId: string,
    options?: { limit?: number; context?: string }
  ): Promise<{ shardId: string; suggestions: Suggestion[]; generatedAt: string }> {
    const response = await apiClient.get(`/api/v1/insights/suggestions/${shardId}`, {
      params: options,
    })
    return response.data
  },

  // ============================================
  // Conversations API
  // ============================================

  /**
   * List conversations
   */
  async listConversations(params?: {
    status?: ('active' | 'archived' | 'deleted')[]
    visibility?: ('private' | 'shared' | 'public')[]
    assistantId?: string
    search?: string
    tags?: string[]
    linkedShardId?: string
    includeLinkedShardsCount?: boolean
    limit?: number
    offset?: number
    orderBy?: 'createdAt' | 'updatedAt' | 'lastActivityAt' | 'messageCount'
    orderDirection?: 'asc' | 'desc'
  }): Promise<{
    conversations: ConversationSummary[]
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }> {
    const response = await apiClient.get('/api/v1/insights/conversations', { params })
    return response.data
  },

  /**
   * Get a conversation
   */
  async getConversation(
    id: string,
    options?: {
      includeMessages?: boolean
      messageLimit?: number
      messageOffset?: number
      includeLinkedShards?: boolean
    }
  ): Promise<Conversation> {
    const response = await apiClient.get(`/api/v1/insights/conversations/${id}`, {
      params: options,
    })
    return response.data
  },

  /**
   * Create a conversation
   */
  async createConversation(data: {
    title?: string
    visibility?: 'private' | 'shared' | 'public'
    assistantId?: string
    templateId?: string
    defaultModelId?: string
    linkedShards?: string[]
    tags?: string[]
  }): Promise<Conversation> {
    const response = await apiClient.post('/api/v1/insights/conversations', data)
    return response.data
  },

  /**
   * Update a conversation
   */
  async updateConversation(
    id: string,
    data: {
      title?: string
      visibility?: 'private' | 'shared' | 'public'
      status?: 'active' | 'archived'
      assistantId?: string
      templateId?: string
      defaultModelId?: string
      tags?: string[]
      addLinkedShards?: string[]
      removeLinkedShards?: string[]
    }
  ): Promise<Conversation> {
    const response = await apiClient.patch(`/api/v1/insights/conversations/${id}`, data)
    return response.data
  },

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string, permanent = false): Promise<void> {
    await apiClient.delete(`/api/v1/insights/conversations/${id}`, {
      params: { permanent },
    })
  },

  /**
   * Archive a conversation (makes it read-only)
   */
  async archiveConversation(id: string): Promise<Conversation> {
    const response = await apiClient.post(`/api/v1/insights/conversations/${id}/archive`)
    return response.data
  },

  /**
   * Unarchive a conversation (restores it to active)
   */
  async unarchiveConversation(id: string): Promise<Conversation> {
    const response = await apiClient.post(`/api/v1/insights/conversations/${id}/unarchive`)
    return response.data
  },

  /**
   * Get conversation messages with pagination
   */
  async getConversationMessages(
    conversationId: string,
    options?: {
      limit?: number
      offset?: number
      branchIndex?: number
      afterMessageId?: string
    }
  ): Promise<{
    messages: ChatMessage[]
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }> {
    const response = await apiClient.get(`/api/v1/insights/conversations/${conversationId}/messages`, {
      params: options,
    })
    return response.data
  },

  /**
   * Search conversations (full-text search with filters)
   */
  async searchConversations(params: {
    q: string
    limit?: number
    offset?: number
    fromDate?: string
    toDate?: string
    participantId?: string
    tags?: string[]
    linkedShardId?: string
    includeLinkedShardsCount?: boolean
  }): Promise<{
    conversations: ConversationSummary[]
    total: number
    limit: number
    offset: number
    hasMore: boolean
    query: string
  }> {
    const queryParams: Record<string, any> = {
      q: params.q,
      limit: params.limit,
      offset: params.offset,
    }
    
    if (params.fromDate) queryParams.fromDate = params.fromDate
    if (params.toDate) queryParams.toDate = params.toDate
    if (params.participantId) queryParams.participantId = params.participantId
    if (params.linkedShardId) queryParams.linkedShardId = params.linkedShardId
    if (params.includeLinkedShardsCount !== undefined) queryParams.includeLinkedShardsCount = params.includeLinkedShardsCount
    if (params.tags && params.tags.length > 0) queryParams.tags = params.tags.join(',')

    const response = await apiClient.get('/api/v1/insights/conversations/search', { params: queryParams })
    return response.data
  },

  /**
   * Edit a message
   */
  async editMessage(
    conversationId: string,
    messageId: string,
    data: {
      content: string
      reason?: string
    }
  ): Promise<ChatMessage> {
    const response = await apiClient.patch(
      `/api/v1/insights/conversations/${conversationId}/messages/${messageId}`,
      data
    )
    return response.data
  },

  /**
   * Regenerate response after message edit
   */
  async regenerateAfterEdit(
    conversationId: string,
    messageId: string
  ): Promise<{
    editedMessage: ChatMessage
    nextMessage?: ChatMessage
    needsRegeneration: boolean
  }> {
    const response = await apiClient.post(
      `/api/v1/insights/conversations/${conversationId}/messages/${messageId}/regenerate`
    )
    return response.data
  },

  /**
   * Regenerate a message with optional parameters
   */
  async regenerateMessage(
    messageId: string,
    options?: {
      conversationId: string
      modelId?: string
      temperature?: number
    }
  ): Promise<{
    message: ChatMessage
    response: {
      content: string
      usage?: { prompt: number; completion: number; total: number }
      cost?: number
      latencyMs?: number
    }
  }> {
    if (!options?.conversationId) {
      throw new Error('conversationId is required')
    }
    const response = await apiClient.post(
      `/api/v1/insights/chat/messages/${messageId}/regenerate`,
      {
        conversationId: options.conversationId,
        modelId: options.modelId,
        temperature: options.temperature,
      }
    )
    return response.data
  },

  /**
   * Stop generation for a message
   */
  async stopMessageGeneration(messageId: string): Promise<{
    success: boolean
    message: string
    messageId: string
    status: string
  }> {
    const response = await apiClient.post(`/api/v1/insights/chat/messages/${messageId}/stop`)
    return response.data
  },

  /**
   * Get message edit history
   */
  async getMessageEditHistory(
    conversationId: string,
    messageId: string
  ): Promise<{
    messageId: string
    editHistory: MessageEdit[]
    editedAt?: string
    editedBy?: string
    originalContent?: string
  }> {
    const response = await apiClient.get(
      `/api/v1/insights/conversations/${conversationId}/messages/${messageId}/history`
    )
    return response.data
  },

  // ============================================
  // Feedback API
  // ============================================

  /**
   * Submit feedback for a message
   */
  async submitFeedback(
    messageId: string,
    data: {
      rating?: number
      thumbs?: 'up' | 'down'
      categories?: string[]
      comment?: string
      regenerateRequested?: boolean
      reportAsHarmful?: boolean
    }
  ): Promise<{ id: string; messageId: string; status: string; createdAt: string }> {
    const response = await apiClient.post(`/api/v1/insights/messages/${messageId}/feedback`, data)
    return response.data
  },

  // ============================================
  // Models API
  // ============================================

  /**
   * List available models
   */
  async listModels(): Promise<{ models: AIModel[] }> {
    const response = await apiClient.get('/api/v1/insights/models' as any)
    return response.data
  },

  // ============================================
  // Templates API
  // ============================================

  /**
   * Get conversation configuration
   */
  async getConversationConfig(): Promise<{
    tenantId: string
    maxEditHistory: number
    maxMessageLimit: number
    autoSummarizeEnabled: boolean
    autoSummarizeThreshold: number
    autoArchiveEnabled: boolean
    autoArchiveThreshold: number
    createdAt: string
    updatedAt: string
    createdBy: string
    updatedBy: string
  }> {
    const response = await apiClient.get('/api/v1/insights/conversations/config' as any)
    return response.data
  },

  /**
   * Update conversation configuration
   */
  async updateConversationConfig(data: {
    maxEditHistory?: number
    maxMessageLimit?: number
    autoSummarizeEnabled?: boolean
    autoSummarizeThreshold?: number
    autoArchiveEnabled?: boolean
    autoArchiveThreshold?: number
  }): Promise<{
    tenantId: string
    maxEditHistory: number
    maxMessageLimit: number
    autoSummarizeEnabled: boolean
    autoSummarizeThreshold: number
    autoArchiveEnabled: boolean
    autoArchiveThreshold: number
    createdAt: string
    updatedAt: string
    createdBy: string
    updatedBy: string
  }> {
    const response = await apiClient.patch('/api/v1/insights/conversations/config', data)
    return response.data
  },

  // ============================================
  // Templates API
  // ============================================

  /**
   * List context templates
   */
  async listTemplates(params?: {
    category?: string
    scope?: 'system' | 'tenant' | 'user'
    search?: string
    applicableShardType?: string
    includeSystem?: boolean
  }): Promise<{
    templates: Array<{
      id: string
      name: string
      description?: string
      category: string
      scope: string
      isDefault: boolean
      isActive?: boolean
      applicableShardTypes?: string[]
    }>
    count: number
  }> {
    const response = await apiClient.get('/api/v1/ai/templates', { params })
    return response.data
  },

  /**
   * Get a specific context template by ID
   */
  async getTemplate(templateId: string): Promise<{
    id: string
    name: string
    description?: string
    category: string
    scope: string
    isDefault: boolean
    isActive?: boolean
    applicableShardTypes?: string[]
    [key: string]: unknown
  }> {
    const response = await apiClient.get(`/api/v1/ai/templates/${templateId}`)
    return response.data
  },

  // ============================================
  // Entity Resolution API
  // ============================================

  /**
   * Resolve entity name to shardId
   */
  async resolveEntity(data: {
    entityName: string
    projectId?: string
    shardTypes?: string[]
    limit?: number
  }): Promise<{
    entityName: string
    results: Array<{
      shardId: string
      shardType: string
      name: string
      projectId?: string
      score: number
      lastModified?: string
    }>
    count: number
  }> {
    const response = await apiClient.post('/api/v1/insights/entities/resolve', data)
    return response.data
  },

  /**
   * Get entity autocomplete suggestions
   */
  async autocompleteEntities(params: {
    q: string
    projectId?: string
  }): Promise<{
    query: string
    suggestions: Array<{
      shardId: string
      shardType: string
      name: string
      projectId?: string
      preview?: string
    }>
    count: number
  }> {
    const response = await apiClient.get('/api/v1/insights/entities/autocomplete', { params })
    return response.data
  },

  /**
   * List project entities
   */
  async listProjectEntities(
    projectId: string,
    params?: {
      shardTypes?: string[]
      limit?: number
      offset?: number
    }
  ): Promise<{
    projectId: string
    entities: Array<{
      id: string
      shardType: string
      name: string
      description?: string
      createdAt: string
      updatedAt: string
    }>
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }> {
    const response = await apiClient.get(`/api/v1/insights/projects/${projectId}/entities`, { params })
    return response.data
  },

  // ============================================
  // Real-time / Typing Indicators
  // ============================================

  async startTyping(conversationId: string): Promise<{ success: boolean }> {
    const response = await apiClient.post(`/api/v1/insights/conversations/${conversationId}/typing/start`)
    return response.data
  },

  async stopTyping(conversationId: string): Promise<{ success: boolean }> {
    const response = await apiClient.post(`/api/v1/insights/conversations/${conversationId}/typing/stop`)
    return response.data
  },

  async getTypingIndicators(conversationId: string): Promise<{ typing: Array<{ userId: string; userName: string; timestamp: number }> }> {
    const response = await apiClient.get(`/api/v1/insights/conversations/${conversationId}/typing`)
    return response.data
  },

  // ============================================
  // Conversation Analytics API
  // ============================================

  /**
   * Get conversation analytics
   */
  async getConversationAnalytics(
    conversationId: string,
    params?: {
      includeArchived?: boolean
      forceRegenerate?: boolean
    }
  ): Promise<ConversationAnalytics> {
    const response = await apiClient.get(`/api/v1/insights/conversations/${conversationId}/analytics`, { params })
    return response.data
  },

  /**
   * Generate or regenerate conversation summary
   */
  async generateConversationSummary(
    conversationId: string,
    options?: {
      forceAI?: boolean
      maxMessages?: number
    }
  ): Promise<{
    conversationId: string
    summary: string
    generatedAt: string
  }> {
    const response = await apiClient.post(
      `/api/v1/insights/conversations/${conversationId}/summary`,
      options
    )
    return response.data
  },

  /**
   * Get conversation analytics summary (lightweight)
   */
  async getConversationAnalyticsSummary(conversationId: string): Promise<{
    totalMessages: number
    totalCost: number
    averageLatencyMs: number
    topTopics: ConversationTopic[]
    topEntities: ConversationEntity[]
    qualityScore: number
  }> {
    const response = await apiClient.get(`/api/v1/insights/conversations/${conversationId}/analytics/summary`)
    return response.data
  },

  // ============================================
  // Conversation Export API
  // ============================================

  /**
   * Export conversation to PDF, Markdown, or JSON
   */
  async exportConversation(
    conversationId: string,
    format: 'pdf' | 'markdown' | 'json',
    options?: {
      includeArchived?: boolean
      includeEditHistory?: boolean
      includeContextSources?: boolean
      fromDate?: string
      toDate?: string
    }
  ): Promise<Blob> {
    const params: Record<string, any> = { format }
    if (options?.includeArchived !== undefined) params.includeArchived = options.includeArchived
    if (options?.includeEditHistory !== undefined) params.includeEditHistory = options.includeEditHistory
    if (options?.includeContextSources !== undefined) params.includeContextSources = options.includeContextSources
    if (options?.fromDate) params.fromDate = options.fromDate
    if (options?.toDate) params.toDate = options.toDate

    // Build query string
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value)
        }
        return acc
      }, {} as Record<string, string>)
    ).toString()

    const token = await getAuthToken()
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
    const url = `${apiUrl}/api/v1/insights/conversations/${conversationId}/export${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Export failed' }))
      throw new Error(error.error || 'Export failed')
    }

    return await response.blob()
  },

  // ============================================
  // Intent Pattern Management (Super Admin)
  // ============================================

  /**
   * List intent patterns
   */
  async listIntentPatterns(params?: {
    intentType?: string
    isActive?: boolean
    minAccuracy?: number
    sortBy?: 'accuracy' | 'coverage' | 'createdAt' | 'priority'
    limit?: number
    offset?: number
  }) {
    const queryParams = new URLSearchParams()
    if (params?.intentType) queryParams.append('intentType', params.intentType)
    if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive))
    if (params?.minAccuracy !== undefined) queryParams.append('minAccuracy', String(params.minAccuracy))
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params?.limit) queryParams.append('limit', String(params.limit))
    if (params?.offset) queryParams.append('offset', String(params.offset))

    const { data } = await apiClient.get(
      `/api/v1/insights/admin/intent-patterns${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    )
    return data
  },

  /**
   * Get intent pattern by ID
   */
  async getIntentPattern(id: string) {
    const { data } = await apiClient.get(`/api/v1/insights/admin/intent-patterns/${id}`)
    return data
  },

  /**
   * Create intent pattern
   */
  async createIntentPattern(input: {
    name: string
    description: string
    intentType: string
    subtype?: string
    patterns: string[]
    keywords?: string[]
    phrases?: string[]
    priority?: number
    confidenceWeight?: number
    requiresContext?: {
      shardTypes?: string[]
      userRoles?: string[]
    }
    excludePatterns?: string[]
    isActive?: boolean
  }) {
    const { data } = await apiClient.post('/api/v1/insights/admin/intent-patterns', input)
    return data
  },

  /**
   * Update intent pattern
   */
  async updateIntentPattern(
    id: string,
    input: {
      name?: string
      description?: string
      intentType?: string
      subtype?: string
      patterns?: string[]
      keywords?: string[]
      phrases?: string[]
      priority?: number
      confidenceWeight?: number
      requiresContext?: {
        shardTypes?: string[]
        userRoles?: string[]
      }
      excludePatterns?: string[]
      isActive?: boolean
    }
  ) {
    const { data } = await apiClient.patch(`/api/v1/insights/admin/intent-patterns/${id}`, input)
    return data
  },

  /**
   * Delete intent pattern
   */
  async deleteIntentPattern(id: string) {
    await apiClient.delete(`/api/v1/insights/admin/intent-patterns/${id}`)
  },

  /**
   * Test intent pattern
   */
  async testIntentPattern(input: {
    pattern: {
      intentType: string
      patterns: string[]
      keywords?: string[]
      phrases?: string[]
      excludePatterns?: string[]
      confidenceWeight?: number
    }
    testQueries: string[]
  }) {
    const { data } = await apiClient.post('/api/v1/insights/admin/intent-patterns/test', input)
    return data
  },

  /**
   * Suggest patterns from samples using LLM
   */
  async suggestPatternsFromSamples(input: {
    samples: string[]
    targetIntent: string
    targetSubtype?: string
  }) {
    const { data } = await apiClient.post(
      '/api/v1/insights/admin/intent-patterns/suggest-from-samples',
      input
    )
    return data
  },

  // ============================================
  // Global Vector Search (Super Admin)
  // ============================================

  /**
   * Perform global vector search across all tenants
   */
  async globalVectorSearch(params: {
    query: string
    topK?: number
    minScore?: number
    shardTypeId?: string
    similarityMetric?: 'cosine' | 'dotProduct' | 'euclidean'
    includeEmbedding?: boolean
  }) {
    const { data } = await apiClient.post('/api/v1/search/vector/global', {
      query: params.query,
      topK: params.topK || 50,
      minScore: params.minScore,
      filter: {
        shardTypeId: params.shardTypeId,
      },
      similarityMetric: params.similarityMetric,
      includeEmbedding: params.includeEmbedding,
    })
    return data
  },

  // ============================================
  // Vector Search Statistics
  // ============================================

  /**
   * Get vector search statistics (admin only)
   */
  async getVectorSearchStats() {
    const { data } = await apiClient.get('/api/v1/search/stats' as any)
    return data
  },

  // ============================================
  // Conversation Threading
  // ============================================

  /**
   * Create a new conversation thread
   */
  async createThread(input: {
    title?: string
    threadTopic: string
    visibility?: 'private' | 'shared' | 'public'
    assistantId?: string
    templateId?: string
    defaultModelId?: string
    tags?: string[]
  }) {
    const { data } = await apiClient.post('/api/v1/insights/conversations/threads', input)
    return data
  },

  /**
   * Add a conversation to a thread
   */
  async addConversationToThread(conversationId: string, threadId: string) {
    const { data } = await apiClient.post(
      `/api/v1/insights/conversations/${conversationId}/threads/${threadId}`
    )
    return data
  },

  /**
   * Remove a conversation from its thread
   */
  async removeConversationFromThread(conversationId: string) {
    const { data } = await apiClient.delete(
      `/api/v1/insights/conversations/${conversationId}/threads`
    )
    return data
  },

  /**
   * Get thread members (all conversations in a thread)
   */
  async getThreadMembers(threadId: string, options?: { includeArchived?: boolean }) {
    const { data } = await apiClient.get(
      `/api/v1/insights/conversations/threads/${threadId}/members`,
      { params: options }
    )
    return data
  },

  /**
   * Get thread summary
   */
  async getThreadSummary(threadId: string) {
    const { data } = await apiClient.get(
      `/api/v1/insights/conversations/threads/${threadId}/summary`
    )
    return data
  },

  /**
   * List conversation threads
   */
  async listThreads(params?: {
    projectId?: string
    topic?: string
    limit?: number
    offset?: number
  }) {
    const { data } = await apiClient.get('/api/v1/insights/conversations/threads', { params })
    return data
  },

  // ============================================
  // Conversation Templates
  // ============================================

  /**
   * List conversation templates
   */
  async listConversationTemplates(params?: {
    category?: string
    projectId?: string
    includeSystem?: boolean
  }) {
    const { data } = await apiClient.get('/api/v1/insights/conversation-templates', { params })
    return data
  },

  /**
   * Create a conversation from a template
   */
  async createConversationFromTemplate(
    templateId: string,
    options?: {
      variables?: Record<string, string>
      projectId?: string
      linkedShards?: string[]
    }
  ) {
    const { data } = await apiClient.post(
      `/api/v1/insights/conversation-templates/${templateId}/create`,
      options
    )
    return data
  },

  // ============================================
  // Conversation Collaboration
  // ============================================

  /**
   * Add a comment to a message
   */
  async addMessageComment(
    conversationId: string,
    messageId: string,
    content: string,
    parentCommentId?: string
  ) {
    const { data } = await apiClient.post(
      `/api/v1/insights/conversations/${conversationId}/messages/${messageId}/comments`,
      { content, parentCommentId }
    )
    return data
  },

  /**
   * Update a comment
   */
  async updateMessageComment(
    conversationId: string,
    messageId: string,
    commentId: string,
    content: string
  ) {
    const { data } = await apiClient.patch(
      `/api/v1/insights/conversations/${conversationId}/messages/${messageId}/comments/${commentId}`,
      { content }
    )
    return data
  },

  /**
   * Delete a comment
   */
  async deleteMessageComment(
    conversationId: string,
    messageId: string,
    commentId: string
  ) {
    const { data } = await apiClient.delete(
      `/api/v1/insights/conversations/${conversationId}/messages/${messageId}/comments/${commentId}`
    )
    return data
  },

  /**
   * Get comments for a message
   */
  async getMessageComments(conversationId: string, messageId: string) {
    const { data } = await apiClient.get(
      `/api/v1/insights/conversations/${conversationId}/messages/${messageId}/comments`
    )
    return data
  },

  /**
   * Invite users to a conversation
   */
  async inviteUsersToConversation(
    conversationId: string,
    userIds: string[],
    options?: {
      role?: 'owner' | 'participant' | 'viewer'
      notify?: boolean
    }
  ) {
    const { data } = await apiClient.post(
      `/api/v1/insights/conversations/${conversationId}/invite`,
      {
        userIds,
        role: options?.role,
        notify: options?.notify ?? true,
      }
    )
    return data
  },

  /**
   * Add a participant to a conversation
   */
  async addParticipant(
    conversationId: string,
    userId: string,
    role?: 'owner' | 'participant' | 'viewer'
  ) {
    const { data } = await apiClient.post(
      `/api/v1/insights/conversations/${conversationId}/participants`,
      {
        userId,
        role: role || 'participant',
      }
    )
    return data
  },

  /**
   * Remove a participant from a conversation
   */
  async removeParticipant(conversationId: string, participantId: string) {
    await apiClient.delete(
      `/api/v1/insights/conversations/${conversationId}/participants/${participantId}`
    )
  },
}


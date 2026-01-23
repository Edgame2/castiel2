/**
 * AI Insights React Hooks
 * React Query hooks for AI Insights functionality
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'
import { useRealtime } from '@/components/providers/realtime-provider'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'
import {
  insightsApi,
  Conversation,
  ConversationSummary,
  InsightResponse,
  QuickInsightResponse,
  Suggestion,
  StreamEvent,
  ContextScope,
  ChatMessage,
  AIModel,
} from '@/lib/api/insights'

// ============================================
// Query Keys
// ============================================

export const insightKeys = {
  all: ['insights'] as const,
  conversations: () => [...insightKeys.all, 'conversations'] as const,
  conversationList: (params?: Record<string, unknown>) =>
    [...insightKeys.conversations(), 'list', params] as const,
  conversationDetail: (id: string) => [...insightKeys.conversations(), 'detail', id] as const,
  suggestions: (shardId: string) => [...insightKeys.all, 'suggestions', shardId] as const,
  models: () => [...insightKeys.all, 'models'] as const,
  templates: () => [...insightKeys.all, 'templates'] as const,
  intentPatterns: () => [...insightKeys.all, 'intent-patterns'] as const,
  intentPatternList: (params?: Record<string, unknown>) =>
    [...insightKeys.intentPatterns(), 'list', params] as const,
  intentPatternDetail: (id: string) => [...insightKeys.intentPatterns(), 'detail', id] as const,
}

// ============================================
// Conversation Hooks
// ============================================

/**
 * Hook to list conversations
 */
export function useConversations(params?: {
  status?: ('active' | 'archived' | 'deleted')[]
  visibility?: ('private' | 'shared' | 'public')[]
  search?: string
  linkedShardId?: string
  includeLinkedShardsCount?: boolean
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: insightKeys.conversationList(params),
    queryFn: () => insightsApi.listConversations(params),
  })
}

/**
 * Hook to get a single conversation
 */
export function useConversation(
  id: string,
  options?: { 
    includeMessages?: boolean
    messageLimit?: number
    includeLinkedShards?: boolean
  }
) {
  return useQuery({
    queryKey: insightKeys.conversationDetail(id),
    queryFn: () => insightsApi.getConversation(id, options),
    enabled: !!id,
  })
}

/**
 * Hook to create a conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: insightsApi.createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.conversations() })
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to update a conversation
 */
export function useUpdateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof insightsApi.updateConversation>[1] }) =>
      insightsApi.updateConversation(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: insightKeys.conversations() })
      queryClient.setQueryData(insightKeys.conversationDetail(data.id), data)
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to delete a conversation
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, permanent }: { id: string; permanent?: boolean }) =>
      insightsApi.deleteConversation(id, permanent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.conversations() })
      toast.success('Conversation deleted')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to archive a conversation
 */
export function useArchiveConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string }) => insightsApi.archiveConversation(id),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: insightKeys.conversations() })
      queryClient.setQueryData(insightKeys.conversationDetail(variables.id), data)
      toast.success('Conversation archived')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to unarchive a conversation
 */
export function useUnarchiveConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string }) => insightsApi.unarchiveConversation(id),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: insightKeys.conversations() })
      queryClient.setQueryData(insightKeys.conversationDetail(variables.id), data)
      toast.success('Conversation unarchived')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook for real-time conversation updates
 */
export function useConversationRealtime(conversationId: string | null | undefined) {
  const queryClient = useQueryClient()
  const { subscribe, unsubscribe, isConnected } = useRealtime()

  useEffect(() => {
    if (!conversationId || !isConnected) return

    // Subscribe to conversation events
    // Note: The payload structure from backend is: { type, conversationId, tenantId, userId, timestamp, data }
    const handleMessageAdded = (payload: any) => {
      // Payload is the full ConversationEventPayload from backend
      if (payload.conversationId === conversationId) {
        // Invalidate messages query to refetch
        queryClient.invalidateQueries({
          queryKey: [...insightKeys.conversationDetail(conversationId), 'messages'],
        })
      }
    }

    const handleMessageEdited = (payload: any) => {
      if (payload.conversationId === conversationId) {
        // Invalidate messages query to refetch
        queryClient.invalidateQueries({
          queryKey: [...insightKeys.conversationDetail(conversationId), 'messages'],
        })
      }
    }

    const handleTypingStart = (payload: any) => {
      if (payload.conversationId === conversationId) {
        // Update typing indicators in cache
        queryClient.setQueryData(
          [...insightKeys.conversationDetail(conversationId), 'typing'],
          (old: any) => {
            const existing = old?.typing || []
            const typingUserId = payload.data?.typingUserId || payload.userId
            const typingUserName = payload.data?.typingUserName || 'User'
            const isAlreadyTyping = existing.some((t: any) => t.userId === typingUserId)
            if (!isAlreadyTyping && typingUserId) {
              return {
                typing: [
                  ...existing,
                  {
                    userId: typingUserId,
                    userName: typingUserName,
                    timestamp: Date.now(),
                  },
                ],
              }
            }
            return old
          }
        )
      }
    }

    const handleTypingStop = (payload: any) => {
      if (payload.conversationId === conversationId) {
        // Remove typing indicator from cache
        queryClient.setQueryData(
          [...insightKeys.conversationDetail(conversationId), 'typing'],
          (old: any) => {
            const existing = old?.typing || []
            const typingUserId = payload.data?.typingUserId || payload.userId
            return {
              typing: existing.filter((t: any) => t.userId !== typingUserId),
            }
          }
        )
      }
    }

    subscribe('conversation.message.added', handleMessageAdded)
    subscribe('conversation.message.edited', handleMessageEdited)
    subscribe('conversation.typing.start', handleTypingStart)
    subscribe('conversation.typing.stop', handleTypingStop)

    return () => {
      unsubscribe('conversation.message.added', handleMessageAdded)
      unsubscribe('conversation.message.edited', handleMessageEdited)
      unsubscribe('conversation.typing.start', handleTypingStart)
      unsubscribe('conversation.typing.stop', handleTypingStop)
    }
  }, [conversationId, isConnected, subscribe, unsubscribe, queryClient])
}

/**
 * Hook to manage typing indicators
 */
export function useTypingIndicator(conversationId: string | null | undefined) {
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([])
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const stopTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check if real-time is connected
  const { isConnected } = useRealtime()

  // Subscribe to typing events
  useConversationRealtime(conversationId)

  // Poll for typing indicators (fallback if real-time not available)
  // When real-time is connected, only fetch once initially, then rely on real-time events
  // When real-time is not connected, poll every 2 seconds as fallback
  const { data: typingData } = useQuery({
    queryKey: [...insightKeys.conversationDetail(conversationId || ''), 'typing'],
    queryFn: () => (conversationId ? insightsApi.getTypingIndicators(conversationId) : null),
    enabled: !!conversationId,
    refetchInterval: isConnected ? false : 2000, // Only poll when real-time is not connected
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce requests
  })

  useEffect(() => {
    if (typingData?.typing) {
      setTypingUsers(typingData.typing)
    }
  }, [typingData])

  const startTyping = useCallback(async () => {
    if (!conversationId) return

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current)
    }

    try {
      await insightsApi.startTyping(conversationId)
    } catch (error) {
      // Silently fail - typing indicators are not critical
    }

    // Auto-stop after 5 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, 5000)
  }, [conversationId])

  const stopTyping = useCallback(async () => {
    if (!conversationId) return

    // Clear timeouts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current)
    }

    try {
      await insightsApi.stopTyping(conversationId)
    } catch (error) {
      // Silently fail
    }
  }, [conversationId])

  // Debounced stop typing (wait 2 seconds after last input)
  const debouncedStopTyping = useCallback(() => {
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current)
    }

    stopTypingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, 2000)
  }, [stopTyping])

  return {
    typingUsers,
    startTyping,
    stopTyping,
    debouncedStopTyping,
  }
}

/**
 * Hook to get conversation messages with pagination
 */
export function useConversationMessages(
  conversationId: string,
  options?: {
    limit?: number
    offset?: number
    branchIndex?: number
    afterMessageId?: string
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: [...insightKeys.conversationDetail(conversationId), 'messages', options],
    queryFn: () => insightsApi.getConversationMessages(conversationId, options),
    enabled: (options?.enabled !== false && !!conversationId) || false,
  })
}

/**
 * Hook to search conversations (full-text search with filters)
 */
export function useSearchConversations(params: {
  q: string
  limit?: number
  offset?: number
  fromDate?: string
  toDate?: string
  participantId?: string
  tags?: string[]
  linkedShardId?: string
  includeLinkedShardsCount?: boolean
  enabled?: boolean
}) {
  return useQuery({
    queryKey: [...insightKeys.conversations(), 'search', params],
    queryFn: () => insightsApi.searchConversations(params),
    enabled: (params.enabled !== false) && !!params.q && params.q.length >= 2,
    staleTime: 1000 * 30, // 30 seconds
  })
}

/**
 * Hook to edit a message
 */
export function useEditMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
      data,
    }: {
      conversationId: string
      messageId: string
      data: { content: string; reason?: string }
    }) => insightsApi.editMessage(conversationId, messageId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: insightKeys.conversationDetail(variables.conversationId),
      })
      toast.success('Message edited')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to regenerate response after edit
 */
export function useRegenerateAfterEdit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
    }: {
      conversationId: string
      messageId: string
    }) => insightsApi.regenerateAfterEdit(conversationId, messageId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: insightKeys.conversationDetail(variables.conversationId),
      })
      if (data.needsRegeneration) {
        toast.success('Response will be regenerated')
      }
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to regenerate a message
 */
export function useRegenerateMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      messageId,
      conversationId,
      modelId,
      temperature,
    }: {
      messageId: string
      conversationId: string
      modelId?: string
      temperature?: number
    }) =>
      insightsApi.regenerateMessage(messageId, {
        conversationId,
        modelId,
        temperature,
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: insightKeys.conversationDetail(variables.conversationId),
      })
      toast.success('Message regenerated')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to stop message generation
 */
export function useStopMessageGeneration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messageId: string) => insightsApi.stopMessageGeneration(messageId),
    onSuccess: () => {
      toast.success('Generation stopped')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to get message edit history
 */
export function useMessageEditHistory(conversationId: string, messageId: string, enabled = true) {
  return useQuery({
    queryKey: [
      ...insightKeys.conversationDetail(conversationId),
      'messages',
      messageId,
      'editHistory',
    ],
    queryFn: () => insightsApi.getMessageEditHistory(conversationId, messageId),
    enabled: enabled && !!conversationId && !!messageId,
  })
}

/**
 * Hook to get conversation configuration
 */
export function useConversationConfig() {
  return useQuery({
    queryKey: [...insightKeys.all, 'conversation-config'],
    queryFn: () => insightsApi.getConversationConfig(),
  })
}

/**
 * Hook to update conversation configuration
 */
export function useUpdateConversationConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof insightsApi.updateConversationConfig>[0]) =>
      insightsApi.updateConversationConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...insightKeys.all, 'conversation-config'],
      })
      toast.success('Conversation configuration updated')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

// ============================================
// Chat Hook (Streaming)
// ============================================

export interface UseChatOptions {
  conversationId?: string
  assistantId?: string
  modelId?: string
  templateId?: string
  scope?: ContextScope
  onMessageStart?: (messageId: string) => void
  onMessageComplete?: (response: InsightResponse) => void
  onError?: (error: Error) => void
}

export interface UseChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  isStreaming: boolean
  streamingContent: string
  sendMessage: (content: string, assetIds?: string[]) => void
  stopGeneration: () => void
  clearMessages: () => void
  conversationId: string | null
}

/**
 * Hook for chat with streaming support
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(options.conversationId || null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load existing conversation messages
  useEffect(() => {
    if (options.conversationId) {
      // Load conversation with messages
      insightsApi.getConversation(options.conversationId, {
        includeMessages: true,
        messageLimit: 100, // Load last 100 messages initially
      }).then((conv) => {
        setMessages(conv.messages || [])
        setConversationId(conv.id)
      }).catch((error) => {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace('Failed to load conversation messages', 3, {
          errorMessage: errorObj.message,
          conversationId: options.conversationId,
        })
      })
    }
  }, [options.conversationId])

  const sendMessage = useCallback(
    (content: string, assetIds?: string[]) => {
      if (!content.trim() || isLoading) return

      setIsLoading(true)
      setStreamingContent('')

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        contentType: 'text',
        status: 'complete',
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])

      // Create placeholder for assistant message
      const assistantMessage: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        contentType: 'markdown',
        status: 'streaming',
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsStreaming(true)

      // Start streaming
      abortControllerRef.current = insightsApi.streamMessage(
        {
          conversationId: conversationId || undefined,
          content,
          scope: options.scope,
          assistantId: options.assistantId,
          modelId: options.modelId,
          templateId: options.templateId,
          assetIds, // Include asset IDs to link to message
        },
        (event) => {
          switch (event.type) {
            case 'start':
              setConversationId(event.conversationId)
              options.onMessageStart?.(event.messageId)
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessage.id ? { ...m, id: event.messageId, modelId: event.model } : m
                )
              )
              break

            case 'delta':
              setStreamingContent((prev) => prev + event.content)
              setMessages((prev) =>
                prev.map((m) =>
                  m.status === 'streaming' ? { ...m, content: m.content + event.content } : m
                )
              )
              break

            case 'citation':
              setMessages((prev) =>
                prev.map((m) =>
                  m.status === 'streaming'
                    ? {
                        ...m,
                        citations: [
                          ...(m.citations || []),
                          ...event.citations.map((c) => ({
                            ...c,
                            sourceShardName: c.sourceShardId,
                            confidence: 1,
                          })),
                        ],
                      }
                    : m
                )
              )
              break

            case 'complete':
              setMessages((prev) =>
                prev.map((m) =>
                  m.status === 'streaming'
                    ? {
                        ...m,
                        content: event.response.content,
                        status: 'complete' as const,
                        citations: event.response.citations?.map((c) => ({
                          id: c.id,
                          text: c.text,
                          sourceShardId: c.source.shardId,
                          sourceShardName: c.source.shardName,
                          confidence: c.confidence,
                        })),
                        usage: event.response.usage,
                        cost: event.response.cost,
                        latencyMs: event.response.latencyMs,
                        warnings: event.response.warnings,
                        metadata: event.response.metadata,
                      }
                    : m
                )
              )
              setIsStreaming(false)
              setIsLoading(false)
              options.onMessageComplete?.(event.response)

              // Invalidate conversation queries
              if (conversationId) {
                queryClient.invalidateQueries({ queryKey: insightKeys.conversationDetail(conversationId) })
              }
              break

            case 'error':
              setMessages((prev) =>
                prev.map((m) =>
                  m.status === 'streaming'
                    ? { ...m, status: 'error' as const, content: event.message, contentType: 'error' as const }
                    : m
                )
              )
              setIsStreaming(false)
              setIsLoading(false)
              options.onError?.(new Error(event.message))
              break

            case 'model_unavailable':
              setMessages((prev) =>
                prev.map((m) =>
                  m.status === 'streaming'
                    ? {
                        ...m,
                        status: 'error' as const,
                        contentType: 'error' as const,
                        content: JSON.stringify(event.error),
                      }
                    : m
                )
              )
              setIsStreaming(false)
              setIsLoading(false)
              const errorMsg = event.error?.message || (event.error as any)?.reason || 'Model unavailable'
              toast.error(errorMsg)
              options.onError?.(new Error(errorMsg))
              break

            case 'done':
              setIsStreaming(false)
              setIsLoading(false)
              break
          }
        },
        (error) => {
          setIsStreaming(false)
          setIsLoading(false)
          toast.error(error.message)
          options.onError?.(error)
        }
      )
    },
    [conversationId, isLoading, options, queryClient]
  )

  const stopGeneration = useCallback(async () => {
    // Abort the client-side stream
    abortControllerRef.current?.abort()
    setIsStreaming(false)
    setIsLoading(false)

    // Find the currently streaming message and stop it on the backend
    const streamingMessage = messages.find((m) => m.status === 'streaming')
    if (streamingMessage?.id && !streamingMessage.id.startsWith('temp-')) {
      try {
        await insightsApi.stopMessageGeneration(streamingMessage.id)
      } catch (error) {
        // Silently fail - client-side abort is sufficient
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackTrace('Failed to stop generation on backend', 2, {
          errorMessage: errorObj.message,
          messageId: streamingMessage.id,
        })
      }
    }

    // Update the last streaming message to show it was stopped
    setMessages((prev) =>
      prev.map((m) => (m.status === 'streaming' ? { ...m, status: 'cancelled' as const } : m))
    )
  }, [messages])

  const clearMessages = useCallback(() => {
    setMessages([])
    setStreamingContent('')
    setConversationId(null)
  }, [])

  return {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    sendMessage,
    stopGeneration,
    clearMessages,
    conversationId,
  }
}

// ============================================
// Quick Insight Hook
// ============================================

/**
 * Hook to get quick insights for a shard
 */
export function useQuickInsight() {
  return useMutation({
    mutationFn: insightsApi.getQuickInsight,
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

// ============================================
// Suggestions Hook
// ============================================

/**
 * Hook to get suggestions for a shard
 */
export function useSuggestions(shardId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: insightKeys.suggestions(shardId),
    queryFn: () => insightsApi.getSuggestions(shardId),
    enabled: options?.enabled !== false && !!shardId,
  })
}

// ============================================
// Feedback Hook
// ============================================

/**
 * Hook to submit feedback
 */
export function useSubmitFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      messageId,
      data,
    }: {
      messageId: string
      data: Parameters<typeof insightsApi.submitFeedback>[1]
    }) => insightsApi.submitFeedback(messageId, data),
    onSuccess: () => {
      toast.success('Feedback submitted')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

// ============================================
// Models Hook
// ============================================

/**
 * Hook to list available AI models
 */
export function useAIModels() {
  return useQuery({
    queryKey: insightKeys.models(),
    queryFn: insightsApi.listModels,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// ============================================
// Templates Hook
// ============================================

/**
 * Hook to list context templates
 */
export function useContextTemplates(params?: {
  category?: string
  scope?: 'system' | 'tenant' | 'user'
  applicableShardType?: string
  includeSystem?: boolean
}) {
  return useQuery({
    queryKey: [...insightKeys.templates(), params],
    queryFn: () => insightsApi.listTemplates(params),
  })
}

/**
 * Hook to get a specific context template by ID
 */
export function useContextTemplate(templateId: string | null) {
  return useQuery({
    queryKey: [...insightKeys.templates(), 'detail', templateId],
    queryFn: () => insightsApi.getTemplate(templateId!),
    enabled: !!templateId,
  })
}

// ============================================
// Non-Streaming Chat Hook
// ============================================

/**
 * Hook for non-streaming chat (simpler use case)
 */
export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: insightsApi.sendMessage,
    onSuccess: (_, variables) => {
      if (variables.conversationId) {
        queryClient.invalidateQueries({
          queryKey: insightKeys.conversationDetail(variables.conversationId),
        })
      }
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

// ============================================
// Entity Resolution Hooks
// ============================================

/**
 * Hook to resolve entity name to shardId
 */
export function useResolveEntity() {
  return useMutation({
    mutationFn: insightsApi.resolveEntity,
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to get entity autocomplete suggestions
 */
export function useEntityAutocomplete(query: string, projectId?: string, enabled = true) {
  return useQuery({
    queryKey: ['entities', 'autocomplete', query, projectId],
    queryFn: () => insightsApi.autocompleteEntities({ q: query, projectId }),
    enabled: enabled && query.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to list project entities
 */
export function useProjectEntities(
  projectId: string,
  params?: {
    shardTypes?: string[]
    limit?: number
    offset?: number
  },
  enabled = true
) {
  return useQuery({
    queryKey: ['entities', 'project', projectId, params],
    queryFn: () => insightsApi.listProjectEntities(projectId, params),
    enabled: enabled && !!projectId,
  })
}

// ============================================
// Conversation Analytics Hooks
// ============================================

/**
 * Hook to get conversation analytics
 */
export function useConversationAnalytics(
  conversationId: string | null | undefined,
  options?: {
    includeArchived?: boolean
    forceRegenerate?: boolean
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: [...insightKeys.conversationDetail(conversationId || ''), 'analytics', options],
    queryFn: () => {
      if (!conversationId) throw new Error('Conversation ID is required')
      return insightsApi.getConversationAnalytics(conversationId, {
        includeArchived: options?.includeArchived,
        forceRegenerate: options?.forceRegenerate,
      })
    },
    enabled: (options?.enabled !== false) && !!conversationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to get conversation analytics summary (lightweight)
 */
export function useConversationAnalyticsSummary(
  conversationId: string | null | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: [...insightKeys.conversationDetail(conversationId || ''), 'analytics', 'summary'],
    queryFn: () => {
      if (!conversationId) throw new Error('Conversation ID is required')
      return insightsApi.getConversationAnalyticsSummary(conversationId)
    },
    enabled: enabled && !!conversationId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook to generate conversation summary
 */
export function useGenerateConversationSummary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      conversationId,
      options,
    }: {
      conversationId: string
      options?: { forceAI?: boolean; maxMessages?: number }
    }) => insightsApi.generateConversationSummary(conversationId, options),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...insightKeys.all, 'conversations', variables.conversationId],
      })
      toast.success('Conversation summary generated')
    },
    onError: (error) => {
      const message = handleApiError(error)
      const errorMsg = typeof message === 'string' ? message : (message as any).message || 'Failed to generate summary'
      toast.error(errorMsg)
    },
  })
}

// ============================================
// Conversation Export Hooks
// ============================================

/**
 * Hook to export conversation
 */
export function useExportConversation() {
  return useMutation({
    mutationFn: async ({
      conversationId,
      format,
      options,
    }: {
      conversationId: string
      format: 'pdf' | 'markdown' | 'json'
      options?: {
        includeArchived?: boolean
        includeEditHistory?: boolean
        includeContextSources?: boolean
        fromDate?: string
        toDate?: string
      }
    }) => {
      const blob = await insightsApi.exportConversation(conversationId, format, options)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a' as any)
      link.href = url
      
      // Determine filename from blob or generate one
      const timestamp = new Date().toISOString().split('T' as any)[0]
      const extension = format === 'pdf' ? 'pdf' : format === 'markdown' ? 'md' : 'json'
      link.download = `conversation-${conversationId}-${timestamp}.${extension}`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      return { success: true }
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Export failed: ${message}`)
    },
  })
}

// ============================================
// Intent Pattern Hooks (Super Admin)
// ============================================

/**
 * Hook to list intent patterns
 */
export function useIntentPatterns(params?: {
  intentType?: string
  isActive?: boolean
  minAccuracy?: number
  sortBy?: 'accuracy' | 'coverage' | 'createdAt' | 'priority'
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: insightKeys.intentPatternList(params),
    queryFn: () => insightsApi.listIntentPatterns(params),
  })
}

/**
 * Hook to get intent pattern by ID
 */
export function useIntentPattern(id: string) {
  return useQuery({
    queryKey: insightKeys.intentPatternDetail(id),
    queryFn: () => insightsApi.getIntentPattern(id),
    enabled: !!id,
  })
}

/**
 * Hook to create intent pattern
 */
export function useCreateIntentPattern() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof insightsApi.createIntentPattern>[0]) =>
      insightsApi.createIntentPattern(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.intentPatterns() })
      toast.success('Intent pattern created successfully')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create intent pattern')
    },
  })
}

/**
 * Hook to update intent pattern
 */
export function useUpdateIntentPattern() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof insightsApi.updateIntentPattern>[1] }) =>
      insightsApi.updateIntentPattern(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: insightKeys.intentPatterns() })
      queryClient.invalidateQueries({ queryKey: insightKeys.intentPatternDetail(variables.id) })
      toast.success('Intent pattern updated successfully')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update intent pattern')
    },
  })
}

/**
 * Hook to delete intent pattern
 */
export function useDeleteIntentPattern() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => insightsApi.deleteIntentPattern(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.intentPatterns() })
      toast.success('Intent pattern deleted successfully')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete intent pattern')
    },
  })
}

/**
 * Hook to test intent pattern
 */
export function useTestIntentPattern() {
  return useMutation({
    mutationFn: (input: Parameters<typeof insightsApi.testIntentPattern>[0]) =>
      insightsApi.testIntentPattern(input),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to test intent pattern')
    },
  })
}

/**
 * Hook to suggest patterns from samples using LLM
 */
export function useSuggestPatternsFromSamples() {
  return useMutation({
    mutationFn: (input: Parameters<typeof insightsApi.suggestPatternsFromSamples>[0]) =>
      insightsApi.suggestPatternsFromSamples(input),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to suggest patterns')
    },
  })
}

// ============================================
// Global Vector Search Hooks (Super Admin)
// ============================================

/**
 * Hook to perform global vector search
 */
export function useGlobalVectorSearch(params: {
  query: string
  topK?: number
  minScore?: number
  shardTypeId?: string
  similarityMetric?: 'cosine' | 'dotProduct' | 'euclidean'
  enabled?: boolean
}) {
  return useQuery({
    queryKey: [...insightKeys.all, 'global-vector-search', params],
    queryFn: () => insightsApi.globalVectorSearch(params),
    enabled: params.enabled !== false && params.query.length > 0,
  })
}

/**
 * Hook to get vector search statistics
 */
export function useVectorSearchStats() {
  return useQuery({
    queryKey: [...insightKeys.all, 'vector-search-stats'],
    queryFn: () => insightsApi.getVectorSearchStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

// ============================================
// Conversation Threading Hooks
// ============================================

/**
 * Hook to create a new conversation thread
 */
export function useCreateThread() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      title?: string
      threadTopic: string
      visibility?: 'private' | 'shared' | 'public'
      assistantId?: string
      templateId?: string
      defaultModelId?: string
      tags?: string[]
    }) => insightsApi.createThread(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...insightKeys.all, 'threads'] })
      queryClient.invalidateQueries({ queryKey: [...insightKeys.all, 'conversations'] })
    },
  })
}

/**
 * Hook to add a conversation to a thread
 */
export function useAddConversationToThread() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, threadId }: { conversationId: string; threadId: string }) =>
      insightsApi.addConversationToThread(conversationId, threadId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...insightKeys.all, 'threads'] })
      queryClient.invalidateQueries({
        queryKey: [...insightKeys.all, 'conversations', variables.conversationId],
      })
      queryClient.invalidateQueries({
        queryKey: [...insightKeys.all, 'threads', variables.threadId, 'members'],
      })
    },
  })
}

/**
 * Hook to remove a conversation from its thread
 */
export function useRemoveConversationFromThread() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) =>
      insightsApi.removeConversationFromThread(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: [...insightKeys.all, 'threads'] })
      queryClient.invalidateQueries({
        queryKey: [...insightKeys.all, 'conversations', conversationId],
      })
    },
  })
}

/**
 * Hook to get thread members
 */
export function useThreadMembers(threadId: string, options?: { includeArchived?: boolean }) {
  return useQuery({
    queryKey: [...insightKeys.all, 'threads', threadId, 'members', options],
    queryFn: () => insightsApi.getThreadMembers(threadId, options),
    enabled: !!threadId,
  })
}

/**
 * Hook to get thread summary
 */
export function useThreadSummary(threadId: string) {
  return useQuery({
    queryKey: [...insightKeys.all, 'threads', threadId, 'summary'],
    queryFn: () => insightsApi.getThreadSummary(threadId),
    enabled: !!threadId,
  })
}

/**
 * Hook to list conversation threads
 */
export function useListThreads(params?: {
  projectId?: string
  topic?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: [...insightKeys.all, 'threads', params],
    queryFn: () => insightsApi.listThreads(params),
  })
}

// ============================================
// Conversation Templates Hooks
// ============================================

/**
 * Hook to list conversation templates
 */
export function useConversationTemplates(params?: {
  category?: string
  projectId?: string
  includeSystem?: boolean
}) {
  return useQuery({
    queryKey: [...insightKeys.all, 'conversation-templates', params],
    queryFn: () => insightsApi.listConversationTemplates(params),
  })
}

/**
 * Hook to create a conversation from a template
 */
export function useCreateConversationFromTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      templateId,
      options,
    }: {
      templateId: string
      options?: { variables?: Record<string, string>; projectId?: string; linkedShards?: string[] }
    }) => insightsApi.createConversationFromTemplate(templateId, options),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...insightKeys.all, 'conversations'] })
      queryClient.invalidateQueries({ queryKey: [...insightKeys.all, 'conversation-templates'] })
      toast.success('Conversation created from template')
    },
    onError: (error) => {
      const message = handleApiError(error)
      const errorMsg = typeof message === 'string' ? message : (message as any).message || 'Failed to create conversation from template'
      toast.error(errorMsg)
    },
  })
}

/**
 * Hook for inviting users to a conversation
 */
export function useInviteUsersToConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      conversationId,
      userIds,
      options,
    }: {
      conversationId: string
      userIds: string[]
      options?: {
        role?: 'owner' | 'participant' | 'viewer'
        notify?: boolean
      }
    }) => insightsApi.inviteUsersToConversation(conversationId, userIds, options),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: insightKeys.conversationDetail(variables.conversationId) })
      queryClient.invalidateQueries({ queryKey: [...insightKeys.all, 'conversations'] })
      toast.success(`Invited ${variables.userIds.length} user(s) to conversation`)
    },
    onError: (error) => {
      const message = handleApiError(error)
      const errorMsg = typeof message === 'string' ? message : (message as any).message || 'Failed to invite users to conversation'
      toast.error(errorMsg)
    },
  })
}

/**
 * Hook for adding a participant to a conversation
 */
export function useAddParticipant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      conversationId,
      userId,
      role,
    }: {
      conversationId: string
      userId: string
      role?: 'owner' | 'participant' | 'viewer'
    }) => insightsApi.addParticipant(conversationId, userId, role),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: insightKeys.conversationDetail(variables.conversationId) })
      toast.success('Participant added successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      const errorMsg = typeof message === 'string' ? message : (message as any).message || 'Failed to add participant'
      toast.error(errorMsg)
    },
  })
}

/**
 * Hook for removing a participant from a conversation
 */
export function useRemoveParticipant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      conversationId,
      participantId,
    }: {
      conversationId: string
      participantId: string
    }) => insightsApi.removeParticipant(conversationId, participantId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: insightKeys.conversationDetail(variables.conversationId) })
      toast.success('Participant removed successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      const errorMsg = typeof message === 'string' ? message : (message as any).message || 'Failed to remove participant'
      toast.error(errorMsg)
    },
  })
}

// ============================================
// Message Comments Hooks
// ============================================

/**
 * Hook to get comments for a message
 */
export function useMessageComments(conversationId: string, messageId: string, enabled = true) {
  return useQuery({
    queryKey: [
      ...insightKeys.conversationDetail(conversationId),
      'messages',
      messageId,
      'comments',
    ],
    queryFn: () => insightsApi.getMessageComments(conversationId, messageId),
    enabled: enabled && !!conversationId && !!messageId,
  })
}

/**
 * Hook to add a comment to a message
 */
export function useAddMessageComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
      content,
      parentCommentId,
    }: {
      conversationId: string
      messageId: string
      content: string
      parentCommentId?: string
    }) => insightsApi.addMessageComment(conversationId, messageId, content, parentCommentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...insightKeys.conversationDetail(variables.conversationId),
          'messages',
          variables.messageId,
          'comments',
        ],
      })
      toast.success('Comment added')
    },
    onError: (error) => {
      const message = handleApiError(error)
      const errorMsg = typeof message === 'string' ? message : (message as any).message || 'Failed to add comment'
      toast.error(errorMsg)
    },
  })
}

/**
 * Hook to update a message comment
 */
export function useUpdateMessageComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
      commentId,
      content,
    }: {
      conversationId: string
      messageId: string
      commentId: string
      content: string
    }) => insightsApi.updateMessageComment(conversationId, messageId, commentId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...insightKeys.conversationDetail(variables.conversationId),
          'messages',
          variables.messageId,
          'comments',
        ],
      })
      toast.success('Comment updated')
    },
    onError: (error) => {
      const message = handleApiError(error)
      const errorMsg = typeof message === 'string' ? message : (message as any).message || 'Failed to update comment'
      toast.error(errorMsg)
    },
  })
}

/**
 * Hook to delete a message comment
 */
export function useDeleteMessageComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
      commentId,
    }: {
      conversationId: string
      messageId: string
      commentId: string
    }) => insightsApi.deleteMessageComment(conversationId, messageId, commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...insightKeys.conversationDetail(variables.conversationId),
          'messages',
          variables.messageId,
          'comments',
        ],
      })
      toast.success('Comment deleted')
    },
    onError: (error) => {
      const message = handleApiError(error)
      const errorMsg = typeof message === 'string' ? message : (message as any).message || 'Failed to delete comment'
      toast.error(errorMsg)
    },
  })
}


